"""Transcript builder and validator."""

from datetime import datetime


def build_transcript(captions: list[tuple[str, str, float]]) -> str:
    if not captions:
        return ""

    lines = []
    for speaker, text, timestamp in captions:
        # Convert unix timestamp to HH:MM format
        try:
            time_str = datetime.fromtimestamp(timestamp).strftime("%H:%M")
        except (ValueError, OSError, TypeError):
            time_str = "??:??"

        # Clean up whitespace
        speaker = speaker.strip() or "Unknown"
        text = text.strip()

        if text:
            lines.append(f"{speaker} ({time_str}): {text}")

    return "\n".join(lines)


def validate_transcript(text: str) -> bool:
    if not text:
        return False

    # Strip whitespace and check minimum length
    cleaned = text.strip()
    return len(cleaned) >= 50
