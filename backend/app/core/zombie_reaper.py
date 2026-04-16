
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from app.core.process_pool import get_active, cancel_bot
import time
import logging

logger = logging.getLogger(__name__)

MAX_RUNTIME_SECONDS = 90 * 60  # 90 minutes


async def _reap_zombies() -> None:
    now = time.time()
    for meeting_id, info in list(get_active().items()):
        elapsed = now - info["start_time"]
        if elapsed > MAX_RUNTIME_SECONDS:
            logger.warning(
                "Reaping zombie bot for meeting %s (ran %.1f min)",
                meeting_id,
                elapsed / 60,
            )
            cancel_bot(meeting_id)

            try:
                from app.services.firebase_service import update_meeting_status
                update_meeting_status(meeting_id, "FAILED_TIMEOUT")
            except Exception as e:
                logger.error("Failed to update Firestore for %s: %s", meeting_id, e)


def start_reaper() -> AsyncIOScheduler:
    scheduler = AsyncIOScheduler()
    scheduler.add_job(_reap_zombies, "interval", minutes=10)
    scheduler.start()
    logger.info("Zombie reaper started (interval=10min, max_runtime=90min)")
    return scheduler
