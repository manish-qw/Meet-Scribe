"""
AWS S3 storage for transcript files.

Uploads raw .txt transcript files and generates presigned download URLs.
"""

import boto3
from botocore.exceptions import ClientError
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)

_s3_client = boto3.client(
    "s3",
    aws_access_key_id=settings.aws_access_key_id,
    aws_secret_access_key=settings.aws_secret_access_key,
    region_name=settings.aws_region,
)


def upload_transcript(meeting_id: str, text: str) -> str:
    """
    Upload transcript text to S3 as a UTF-8 .txt file.
    Returns the S3 URL of the uploaded object.
    """
    key = f"transcripts/{meeting_id}.txt"

    try:
        _s3_client.put_object(
            Bucket=settings.s3_bucket_name,
            Key=key,
            Body=text.encode("utf-8"),
            ContentType="text/plain; charset=utf-8",
        )
        s3_url = f"s3://{settings.s3_bucket_name}/{key}"
        logger.info("Uploaded transcript to %s", s3_url)
        return s3_url
    except ClientError as e:
        logger.error("S3 upload failed for meeting %s: %s", meeting_id, e)
        raise


def get_presigned_url(meeting_id: str, expiration: int = 3600) -> str:
    """
    Generate a presigned URL for downloading the transcript.
    Default expiration is 1 hour (3600 seconds).
    """
    key = f"transcripts/{meeting_id}.txt"

    try:
        url = _s3_client.generate_presigned_url(
            "get_object",
            Params={
                "Bucket": settings.s3_bucket_name,
                "Key": key,
            },
            ExpiresIn=expiration,
        )
        return url
    except ClientError as e:
        logger.error("Failed to generate presigned URL for %s: %s", meeting_id, e)
        raise
