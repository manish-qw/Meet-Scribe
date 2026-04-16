
from concurrent.futures import ProcessPoolExecutor, Future
import time
from typing import Any

_executor: ProcessPoolExecutor | None = None
_active: dict[str, dict[str, Any]] = {}  # meeting_id -> {future, start_time}


def init_pool(max_workers: int = 10) -> None:
    global _executor
    _executor = ProcessPoolExecutor(max_workers=max_workers)


def shutdown_pool() -> None:
    global _executor
    if _executor:
        _executor.shutdown(wait=False, cancel_futures=True)
        _executor = None


def submit_bot(meeting_id: str, url: str) -> Future:
    if _executor is None:
        raise RuntimeError("Process pool not initialized. Call init_pool() first.")

    from app.bot.meet_bot import run_bot

    future = _executor.submit(run_bot, meeting_id, url)
    _active[meeting_id] = {
        "future": future,
        "start_time": time.time(),
    }
    return future


def cancel_bot(meeting_id: str) -> bool:
    info = _active.pop(meeting_id, None)
    if info is None:
        return False
    info["future"].cancel()
    return True


def get_active() -> dict[str, dict[str, Any]]:
    return _active


def remove_active(meeting_id: str) -> None:
    _active.pop(meeting_id, None)
