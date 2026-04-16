"""Auth API routes."""

from fastapi import APIRouter, Depends
from app.core.dependencies import get_current_user

router = APIRouter()


@router.get("/verify")
async def verify_token(user: dict = Depends(get_current_user)):
    return {
        "uid": user.get("uid"),
        "email": user.get("email"),
        "name": user.get("name", user.get("email", "")),
    }
