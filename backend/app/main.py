from contextlib import asynccontextmanager
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Request
from fastapi.middleware.cors import CORSMiddleware
import logging

from app.core.config import settings
from app.core.process_pool import init_pool, shutdown_pool
from app.core.zombie_reaper import start_reaper
from app.api.routes import meetings, auth
from app.api.websocket.manager import manager
from app.api.websocket.events import status_event, summary_event, error_event

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(name)s | %(levelname)s | %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting Meet Scribe backend...")
    init_pool(max_workers=10)
    start_reaper()
    yield
    logger.info("Shutting down Meet Scribe backend...")
    shutdown_pool()


app = FastAPI(
    title="Meet Scribe API",
    description="AI-powered Google Meet bot that captures and summarizes meetings",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(meetings.router, prefix="/api/meetings", tags=["meetings"])
app.include_router(auth.router, prefix="/api/auth", tags=["auth"])


@app.websocket("/ws/{meeting_id}")
async def websocket_endpoint(websocket: WebSocket, meeting_id: str):
    await manager.connect(meeting_id, websocket)
    try:
        while True:
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_json({"type": "pong"})
    except WebSocketDisconnect:
        manager.disconnect(meeting_id)
        logger.info("WebSocket client disconnected for meeting %s", meeting_id)
    except Exception as e:
        manager.disconnect(meeting_id)
        logger.warning("WebSocket error for %s: %s", meeting_id, e)


@app.post("/internal/bot-status/{meeting_id}")
async def bot_status_callback(meeting_id: str, request: Request):
    data = await request.json()
    status = data.get("status", "")

    if "summary" in data:
        await manager.send(meeting_id, summary_event(status, data["summary"]))
    elif "error" in data:
        await manager.send(meeting_id, error_event(status, data["error"]))
    else:
        await manager.send(meeting_id, status_event(status))

    try:
        from app.services.firebase_service import (
            update_meeting_status,
            update_meeting_error,
        )

        if "error" in data:
            update_meeting_error(meeting_id, status, data["error"])
        elif "summary" not in data:
            update_meeting_status(meeting_id, status)
    except Exception as e:
        logger.error("Firestore update failed for %s: %s", meeting_id, e)

    terminal_statuses = {"COMPLETED", "FAILED", "FAILED_ENTRY", "FAILED_TIMEOUT", "STOPPED"}
    if status in terminal_statuses:
        from app.core.process_pool import remove_active
        remove_active(meeting_id)

    return {"ok": True}


@app.get("/health")
async def health_check():
    from app.core.process_pool import get_active
    return {
        "status": "healthy",
        "active_bots": len(get_active()),
    }
