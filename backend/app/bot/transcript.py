
from datetime import datetime


def build_transcript(captions: list[tuple[str, str, float]]) -> str:
    if not captions:
        return ""

    lines = []
    for speaker, text, timestamp in captions:
        try:
            time_str = datetime.fromtimestamp(timestamp).strftime("%H:%M")
        except (ValueError, OSError, TypeError):
            time_str = "??:??"

        speaker = speaker.strip() or "Unknown"
        text = text.strip()

        if text:
            lines.append(f"{speaker} ({time_str}): {text}")

    return "\n".join(lines)


def validate_transcript(text: str) -> bool:
    if not text:
        return False

    cleaned = text.strip()
    return len(cleaned) >= 50
