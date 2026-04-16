"""Firebase Admin SDK and Firestore operations."""

import firebase_admin
from firebase_admin import credentials, firestore, auth
from google.cloud.firestore_v1 import SERVER_TIMESTAMP
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)

import os
import json

try:
    if settings.firebase_credentials:
        logger.info("Initializing Firebase with credentials from environment variable")
        cred_dict = json.loads(settings.firebase_credentials)
        _cred = credentials.Certificate(cred_dict)
    else:
        logger.info("Initializing Firebase with credentials from file: %s", settings.firebase_credentials_path)
        _cred = credentials.Certificate(settings.firebase_credentials_path)
    
    _app = firebase_admin.initialize_app(_cred)
    _db = firestore.client()
except Exception as e:
    logger.error("CRITICAL: Firebase initialization failed: %s", e)
    raise e

MEETINGS_COLLECTION = "meetings"


def verify_id_token(token: str) -> dict:
    """Verify a Firebase ID token."""
    return auth.verify_id_token(token)


def create_meeting(meeting_id: str, data: dict) -> str:
    doc_ref = _db.collection(MEETINGS_COLLECTION).document(meeting_id)
    doc_data = {
        **data,
        "status": "PENDING",
        "transcript_url": None,
        "summary": None,
        "created_at": SERVER_TIMESTAMP,
        "updated_at": SERVER_TIMESTAMP,
    }
    doc_ref.set(doc_data)
    logger.info("Created meeting document: %s", meeting_id)
    return meeting_id


def get_meeting(meeting_id: str) -> dict | None:
    doc = _db.collection(MEETINGS_COLLECTION).document(meeting_id).get()
    if not doc.exists:
        return None
    data = doc.to_dict()
    data["meeting_id"] = doc.id
    return data


def get_user_meetings(user_id: str) -> list[dict]:
    docs = (
        _db.collection(MEETINGS_COLLECTION)
        .where("user_id", "==", user_id)
        .order_by("created_at", direction=firestore.Query.DESCENDING)
        .limit(50)
        .stream()
    )
    results = []
    for doc in docs:
        data = doc.to_dict()
        data["meeting_id"] = doc.id
        results.append(data)
    return results


def update_meeting_status(meeting_id: str, status: str) -> None:
    _db.collection(MEETINGS_COLLECTION).document(meeting_id).update({
        "status": status,
        "updated_at": SERVER_TIMESTAMP,
    })
    logger.info("Meeting %s status → %s", meeting_id, status)


def update_meeting_complete(
    meeting_id: str,
    summary: dict,
    transcript_text: str,
) -> None:
    _db.collection(MEETINGS_COLLECTION).document(meeting_id).update({
        "status": "COMPLETED",
        "summary": summary,
        "transcript_text": transcript_text,
        "transcript_url": None,   # no longer used, kept for schema compat
        "updated_at": SERVER_TIMESTAMP,
    })
    logger.info("Meeting %s completed with summary", meeting_id)


def update_meeting_error(meeting_id: str, status: str, error: str) -> None:
    _db.collection(MEETINGS_COLLECTION).document(meeting_id).update({
        "status": status,
        "error": error,
        "updated_at": SERVER_TIMESTAMP,
    })
    logger.warning("Meeting %s failed: %s — %s", meeting_id, status, error)
