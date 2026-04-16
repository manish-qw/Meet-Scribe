
from fastapi import WebSocket
import logging
import json

logger = logging.getLogger(__name__)


class ConnectionManager:
    def __init__(self):
        self.active: dict[str, WebSocket] = {}

    async def connect(self, meeting_id: str, ws: WebSocket) -> None:
        await ws.accept()
        self.active[meeting_id] = ws
        logger.info("WebSocket connected for meeting %s", meeting_id)

    def disconnect(self, meeting_id: str) -> None:
        self.active.pop(meeting_id, None)
        logger.info("WebSocket disconnected for meeting %s", meeting_id)

    async def send(self, meeting_id: str, data: dict) -> None:
        ws = self.active.get(meeting_id)
        if ws is None:
            return

        try:
            await ws.send_json(data)
        except Exception as e:
            logger.warning(
                "Failed to send WebSocket message for %s: %s", meeting_id, e
            )
            self.disconnect(meeting_id)

    async def broadcast(self, data: dict) -> None:
        for meeting_id in list(self.active.keys()):
            await self.send(meeting_id, data)

    def is_connected(self, meeting_id: str) -> bool:
        return meeting_id in self.active


manager = ConnectionManager()
