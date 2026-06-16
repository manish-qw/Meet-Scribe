"""WebSocket event payload builders."""


def status_event(status: str) -> dict:
    return {"status": status}


def summary_event(status: str, summary: dict) -> dict:
    return {
        "status": status,
        "summary": summary,
    }


def error_event(status: str, error: str) -> dict:
    return {
        "status": status,
        "error": error,
    }
