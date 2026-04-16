"""
Firebase Cloud Storage for transcript files.

Uploads raw .txt transcript files to Firebase Storage (free tier)
and generates signed download URLs valid for 1 hour.

The Firebase Admin SDK is already initialized in firebase_service.py,
so we just call firebase_admin.storage here — no double-init.
"""

import datetime
import logging
import firebase_admin
from firebase_admin import storage
from app.core.config import settings

logger = logging.getLogger(__name__)


def _bucket():
    """Return the default Storage bucket client."""
    return storage.bucket(settings.firebase_storage_bucket)


def upload_transcript(meeting_id: str, text: str) -> str:
    """
    Upload transcript text to Firebase Cloud Storage as a UTF-8 .txt file.
    Returns the gs:// URI of the uploaded object.
    """
    blob_name = f"transcripts/{meeting_id}.txt"
    blob = _bucket().blob(blob_name)

    try:
        blob.upload_from_string(
            text.encode("utf-8"),
            content_type="text/plain; charset=utf-8",
        )
        gs_url = f"gs://{settings.firebase_storage_bucket}/{blob_name}"
        logger.info("Uploaded transcript to %s", gs_url)
        return gs_url
    except Exception as e:
        logger.error("Firebase Storage upload failed for meeting %s: %s", meeting_id, e)
        raise


def get_signed_url(meeting_id: str, expiration_seconds: int = 3600) -> str:
    """
    Generate a signed download URL for the transcript.
    Default expiration is 1 hour (3600 seconds).

    Note: Signed URLs require the service account to have the
    'Service Account Token Creator' IAM role, or use the
    'generate_signed_url' method with explicit credentials.
    """
    blob_name = f"transcripts/{meeting_id}.txt"
    blob = _bucket().blob(blob_name)

    try:
        url = blob.generate_signed_url(
            expiration=datetime.timedelta(seconds=expiration_seconds),
            method="GET",
            version="v4",
        )
        return url
    except Exception as e:
        logger.error(
            "Failed to generate signed URL for meeting %s: %s", meeting_id, e
        )
        raise
