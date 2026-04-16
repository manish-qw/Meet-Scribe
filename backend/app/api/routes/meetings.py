"""Meeting API routes."""

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, HttpUrl
from app.core.dependencies import get_current_user
from app.core import process_pool
from app.services import firebase_service

router = APIRouter()


class JoinRequest(BaseModel):
    url: str
    meeting_id: str


class JoinResponse(BaseModel):
    meeting_id: str
    status: str


@router.post("/join", response_model=JoinResponse)
async def join_meeting(
    body: JoinRequest,
    user: dict = Depends(get_current_user),
):
    if "meet.google.com" not in body.url:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid Google Meet URL",
        )

    if not body.url.startswith("http"):
        body.url = f"https://{body.url}"

    firebase_service.create_meeting(body.meeting_id, {
        "user_id": user["uid"],
        "meet_url": body.url,
    })

    try:
        process_pool.submit_bot(body.meeting_id, body.url)
    except RuntimeError as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(e),
        )

    return JoinResponse(meeting_id=body.meeting_id, status="PENDING")


@router.delete("/{meeting_id}/stop")
async def stop_meeting(
    meeting_id: str,
    user: dict = Depends(get_current_user),
):
    meeting = firebase_service.get_meeting(meeting_id)
    if meeting is None:
        raise HTTPException(status_code=404, detail="Meeting not found")
    if meeting.get("user_id") != user["uid"]:
        raise HTTPException(status_code=403, detail="Not authorized")

    cancelled = process_pool.cancel_bot(meeting_id)
    firebase_service.update_meeting_status(meeting_id, "STOPPED")

    return {"meeting_id": meeting_id, "status": "STOPPED", "cancelled": cancelled}


@router.get("/{meeting_id}")
async def get_meeting(
    meeting_id: str,
    user: dict = Depends(get_current_user),
):
    meeting = firebase_service.get_meeting(meeting_id)
    if meeting is None:
        raise HTTPException(status_code=404, detail="Meeting not found")
    if meeting.get("user_id") != user["uid"]:
        raise HTTPException(status_code=403, detail="Not authorized")


    return meeting


@router.get("")
async def list_meetings(
    user: dict = Depends(get_current_user),
):
    meetings = firebase_service.get_user_meetings(user["uid"])

    return {"meetings": meetings}
