"""Gemini AI summarization service."""

import json
import re
from pathlib import Path
import google.generativeai as genai
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)

# Configure the Gemini API key
genai.configure(api_key=settings.gemini_api_key)

# Path to the system prompt file
PROMPT_FILE = Path(__file__).parent.parent.parent / "prompts" / "summarize.txt"

def preprocess_transcript(raw_text: str) -> str:
    ui_junk_pattern = r"language \(\d{2}:\d{2}\): English format_size Font size circle Font color settings Open caption settings"
    cleaned_text = re.sub(ui_junk_pattern, "", raw_text)
    
    cleaned_text = " ".join(cleaned_text.split())
    
    return cleaned_text


async def summarize_transcript(transcript: str) -> dict:
    prompt_text = PROMPT_FILE.read_text(encoding="utf-8")

    model = genai.GenerativeModel("gemini-3-flash-preview")

    try:
        cleaned_transcript = preprocess_transcript(transcript)

        response = model.generate_content(
            f"{prompt_text}\n\nTRANSCRIPT:\n{cleaned_transcript}",
            generation_config=genai.GenerationConfig(
                response_mime_type="application/json",
            ),
        )

        # Parse the JSON response
        result = json.loads(response.text)

        # Validate expected keys
        if not isinstance(result.get("overview"), str):
            result["overview"] = ""
        if not isinstance(result.get("key_points"), list):
            result["key_points"] = []
        if not isinstance(result.get("action_items"), list):
            result["action_items"] = []

        logger.info(
            "Gemini summary generated: %d key points, %d action items",
            len(result["key_points"]),
            len(result["action_items"]),
        )
        return result

    except json.JSONDecodeError as e:
        logger.error("Failed to parse Gemini response as JSON: %s", e)
        raise ValueError(f"Gemini returned invalid JSON: {e}")
    except Exception as e:
        logger.error("Gemini API call failed: %s", e)
        raise
