"""Google Meet bot engine."""

import asyncio
import logging
import httpx
from playwright.async_api import async_playwright, Page
from app.bot.browser import launch_browser, new_stealth_context

from app.bot.transcript import build_transcript, validate_transcript

logger = logging.getLogger(__name__)

from app.core.config import settings

# Timeout for waiting to be admitted to the meeting (5 minutes)
ADMISSION_TIMEOUT = 5 * 60

# Internal API URL for status callbacks
# INTERNAL_API_URL = "http://127.0.0.1:8000"


def _send_status(meeting_id: str, status: str, **extra) -> None:
    payload = {"status": status, **extra}
    try:
        response = httpx.post(
            # f"{INTERNAL_API_URL}/internal/bot-status/{meeting_id}",
             f"{settings.internal_api_url}/internal/bot-status/{meeting_id}",
            json=payload,
            timeout=5.0,
        )
        response.raise_for_status()
    except Exception as e:
        logger.warning("Status callback failed for %s: %s", meeting_id, e)


def run_bot(meeting_id: str, url: str) -> None:
    logging.basicConfig(level=logging.INFO)
    logger.info("Bot process started for meeting %s", meeting_id)

    try:
        asyncio.run(_async_bot(meeting_id, url))
    except Exception as e:
        logger.error("Bot process crashed for %s: %s", meeting_id, e)
        _send_status(meeting_id, "FAILED", error=str(e))


async def _async_bot(meeting_id: str, url: str) -> None:
    import firebase_admin
    from firebase_admin import credentials
    from app.core.config import settings

    async with async_playwright() as p:
        browser = await launch_browser(p)
        context = await new_stealth_context(browser)
        page = await context.new_page()

        try:
            # Step 1: Navigate to the Meet URL and wait for full page load
            logger.info("Navigating to %s", url)
            await page.goto(url, timeout=60000, wait_until="networkidle")
            logger.info("Page loaded (network idle) for %s", meeting_id)
            await asyncio.sleep(3)

            # Step 2: Join the meeting (waits until bot is fully admitted)
            admitted = await _join_meeting(page, meeting_id)
            if not admitted:
                _send_status(meeting_id, "FAILED_ENTRY",
                             error="Bot was not admitted within 5 minutes")
                return

            # Step 3: Wait for the in-meeting UI to fully settle.
            await _wait_for_meeting_ui(page, meeting_id)

            # Step 4: Mute mic and camera
            await _mute_self(page, meeting_id)

            # Step 5: Enable captions
            caption_on = await _enable_captions(page, meeting_id)
            if not caption_on:
                logger.warning("Captions could not be enabled for %s — continuing anyway", meeting_id)

            # Step 6: Open Participants Sidebar
            await _open_participants_sidebar(page, meeting_id)

            # Step 7: Record captions until the meeting ends
            _send_status(meeting_id, "RECORDING")
            captions = await _poll_captions(page, meeting_id)

            # Step 8: Process transcript
            await _process_transcript(captions, meeting_id)

        except Exception as e:
            logger.error("Bot error for %s: %s", meeting_id, e)
            _send_status(meeting_id, "FAILED", error=str(e))
        finally:
            await context.close()
            await browser.close()
            logger.info("Browser closed for meeting %s", meeting_id)


async def _join_meeting(page: Page, meeting_id: str) -> bool:
    _send_status(meeting_id, "PENDING")

    try:
        # 0. Handle Google cookie consent screen (very common on cloud server IPs)
        try:
            cookie_selectors = [
                'button:has-text("Accept all")',
                'button:has-text("I agree")',
                'button:has-text("Reject all")',
                '[aria-label*="Accept all"]',
            ]
            for sel in cookie_selectors:
                btn = page.locator(sel).first
                if await btn.is_visible(timeout=3000):
                    await btn.click()
                    logger.info("Dismissed cookie consent screen via: %s", sel)
                    await asyncio.sleep(2)
                    break
        except Exception:
            pass

        # 1. Dismiss "Continue without microphone and camera" popup
        try:
            bypass = page.get_by_text("Continue without microphone and camera")
            if await bypass.is_visible(timeout=5000):
                await bypass.click()
                logger.info("Dismissed mic/cam prompt")
                await asyncio.sleep(1)
        except Exception:
            pass

        # 2. Dismiss "Got it" tooltips
        try:
            got_it = page.get_by_text("Got it", exact=True)
            if await got_it.is_visible(timeout=2000):
                await got_it.click()
                await asyncio.sleep(1)
        except Exception:
            pass

        # 3. Enter the guest name
        logger.info("Looking for name input...")
        name_input = page.locator('input[type="text"]').first
        if await name_input.is_visible(timeout=15000):
            await name_input.fill("")
            await asyncio.sleep(0.5)
            await name_input.fill("AI Scribe Bot")
            logger.info("Filled in bot name")
            await asyncio.sleep(1.5)
        else:
            logger.warning("Name input not visible — page may not have loaded correctly for %s", meeting_id)

        # 4. Click join button
        join_selectors = [
            'button:has-text("Ask to join")',
            '[role="button"]:has-text("Ask to join")',
            'button:has-text("Join now")',
            '[role="button"]:has-text("Join now")',
            '[jsname="Qx7uuf"]',   # internal jsname for "Ask to join" button
            '[jsname="Cg4Zbd"]',   # internal jsname for "Join now" button
        ]
        button_clicked = False
        for selector in join_selectors:
            try:
                btn = page.locator(selector).first
                if await btn.is_visible(timeout=2000):
                    await btn.click(force=True)
                    logger.info("Clicked join using: %s", selector)
                    button_clicked = True
                    break
            except Exception:
                continue

        if not button_clicked:
            logger.warning("No join button found, pressing Enter as fallback")
            try:
                await name_input.press("Enter")
            except Exception:
                pass

        _send_status(meeting_id, "WAITING_TO_BE_ADMITTED")

        # 5. Wait for admission — Leave call button appears once inside
        try:
            await page.wait_for_selector(
                '[aria-label="Leave call"], [data-meeting-title]',
                state="visible",
                timeout=ADMISSION_TIMEOUT * 1000,
            )
            logger.info("Bot admitted to meeting %s", meeting_id)
            return True
        except Exception:
            logger.warning("Bot not admitted within timeout for %s", meeting_id)
            return False

    except Exception as e:
        logger.error("Error joining meeting %s: %s", meeting_id, e)
        return False


async def _wait_for_meeting_ui(page: Page, meeting_id: str) -> None:
    """Wait until the core in-meeting toolbar is fully rendered."""
    logger.info("Waiting for in-meeting toolbar to settle for %s...", meeting_id)

    # Dismiss any blocking overlay first
    try:
        await page.keyboard.press("Escape")
        await asyncio.sleep(1)
    except Exception:
        pass

    # Wait for the microphone button — its presence confirms the full toolbar
    # is ready. Timeout of 15 s is generous but still bounded.
    try:
        await page.wait_for_selector(
            'button[aria-label*="microphone" i], button[aria-label*="Turn off microphone" i]',
            state="visible",
            timeout=15000,
        )
        logger.info("In-meeting toolbar ready for %s", meeting_id)
    except Exception:
        logger.warning("Toolbar wait timed out for %s", meeting_id)

    # Extra breathing room for animations / tooltip overlays to clear
    await asyncio.sleep(2)


async def _mute_self(page: Page, meeting_id: str) -> None:
    logger.info("Attempting to mute mic and camera for %s...", meeting_id)
    try:
        await page.keyboard.press("Escape")
        await asyncio.sleep(1)
        await page.bring_to_front()

        mic_turn_off_btn = page.locator('button[aria-label*="Turn off microphone" i]').first
        if await mic_turn_off_btn.is_visible(timeout=3500):
            await mic_turn_off_btn.click()
            logger.info("Muted microphone via UI button.")
            await asyncio.sleep(1)
        else:
            logger.info("Microphone button not found (may already be muted).")

        cam_turn_off_btn = page.locator('button[aria-label*="Turn off camera" i]').first
        if await cam_turn_off_btn.is_visible(timeout=3500):
            await cam_turn_off_btn.click()
            logger.info("Turned off camera via UI button.")
            await asyncio.sleep(1)
        else:
            logger.info("Camera button not found (may already be off).")

    except Exception as e:
        logger.warning("Could not mute mic/cam for %s: %s", meeting_id, e)


async def _enable_captions(page: Page, meeting_id: str) -> bool:
    """Enable live captions inside the meeting."""
    MAX_ATTEMPTS = 5
    RETRY_DELAY = 3  # seconds between attempts

    logger.info("Attempting to enable captions for %s...", meeting_id)

    for attempt in range(1, MAX_ATTEMPTS + 1):
        try:
            # Always dismiss overlays before each attempt
            await page.keyboard.press("Escape")
            await asyncio.sleep(1)

            # METHOD 1: Click the dedicated CC button
            cc_button = page.locator('button[aria-label*="Turn on captions" i]').first
            if await cc_button.is_visible(timeout=2000):
                await cc_button.click()
                await asyncio.sleep(1)

                # Confirm captions are now on by checking the toggled aria-label
                cc_off_button = page.locator('button[aria-label*="Turn off captions" i]').first
                if await cc_off_button.is_visible(timeout=2000):
                    logger.info("Captions enabled via CC button (attempt %d) for %s", attempt, meeting_id)
                    return True

                logger.info("CC button clicked but not confirmed on — retrying (attempt %d)", attempt)

            else:
                # METHOD 2: Keyboard shortcut 'c' as fallback
                logger.info("CC button not visible, trying keyboard shortcut (attempt %d)", attempt)
                await page.bring_to_front()
                viewport = page.viewport_size
                if viewport:
                    await page.mouse.click(viewport["width"] / 2, viewport["height"] / 2)
                else:
                    await page.click("body", force=True)
                await asyncio.sleep(0.5)
                await page.keyboard.press("c")
                await asyncio.sleep(1)

                # Confirm via aria-label toggle
                cc_off_button = page.locator('button[aria-label*="Turn off captions" i]').first
                if await cc_off_button.is_visible(timeout=2000):
                    logger.info("Captions enabled via keyboard shortcut (attempt %d) for %s", attempt, meeting_id)
                    return True

        except Exception as e:
            logger.warning("Caption enable attempt %d failed for %s: %s", attempt, meeting_id, e)

        if attempt < MAX_ATTEMPTS:
            logger.info("Retrying caption enable in %ds (attempt %d/%d)...", RETRY_DELAY, attempt, MAX_ATTEMPTS)
            await asyncio.sleep(RETRY_DELAY)

    logger.error("Could not enable captions after %d attempts for %s", MAX_ATTEMPTS, meeting_id)
    return False


async def _open_participants_sidebar(page: Page, meeting_id: str) -> None:
    await asyncio.sleep(2)
    try:
        is_open = await page.evaluate('''() => {
            return document.querySelector('[role="complementary"]') !== null || 
                   document.querySelector('[aria-label="Participants"]') !== null;
        }''')

        if not is_open:
            logger.info("Opening participants sidebar for %s", meeting_id)
            btn = page.locator('button[aria-label*="everyone"], button[aria-label*="people"]').first
            if await btn.is_visible(timeout=2000):
                await btn.click()
                await asyncio.sleep(1)
    except Exception as e:
        logger.warning("Could not open participants sidebar for %s: %s", meeting_id, e)


_INJECT_OBSERVER_JS = """
window.__scribeCaptions = window.__scribeCaptions || [];
window.__lastSeen = window.__lastSeen || '';
"""

_READ_CAPTIONS_JS = """
() => {
    var results = [];
    var selectors = [
        '.a4cQT',
        '[class*="caption"]',
        '[class*="Caption"]',
        '[jsname="tgaKEf"]',
        '[jsname="YSg39b"]'
    ];
    for (var i = 0; i < selectors.length; i++) {
        var els = document.querySelectorAll(selectors[i]);
        for (var j = 0; j < els.length; j++) {
            var t = (els[j].innerText || els[j].textContent || '').trim();
            if (t.length > 2) {
                results.push(t);
            }
        }
    }
    return results;
}
"""


async def _poll_captions(page: Page, meeting_id: str) -> list[tuple]:
    seen_texts: set[str] = set()
    captions: list[tuple] = []
    import time

    logger.info("Starting caption polling for meeting %s", meeting_id)

    meeting_active = False
    alone_time = 0

    while True:
        await asyncio.sleep(2)

        try:
            try:
                got_it = page.get_by_text("Got it", exact=True).first
                if await got_it.is_visible(timeout=50):
                    await got_it.click()
            except Exception:
                pass

            count = await page.evaluate('''() => {
                let listItems = document.querySelectorAll('[role="listitem"]');
                if (listItems.length > 0) return listItems.length;

                let tiles = document.querySelectorAll('[data-participant-id]');
                if (tiles.length > 0) {
                    let ids = new Set();
                    tiles.forEach(t => {
                        let id = t.getAttribute('data-participant-id');
                        if (id) ids.add(id);
                    });
                    if (ids.size > 0) return ids.size;
                }

                let el = document.querySelector('.uGOf1d') || document.querySelector('.wnPUne');
                if (el) {
                    let num = parseInt(el.innerText || el.textContent, 10);
                    if (!isNaN(num)) return num;
                }

                let btn = document.querySelector('button[aria-label*="everyone"]');
                if (btn) {
                    let text = btn.innerText || btn.textContent || "";
                    let match = text.match(/(\\d+)/);
                    if (match) return parseInt(match[1], 10);
                }

                return 1;
            }''')

            if not meeting_active:
                if count > 1:
                    meeting_active = True
                    logger.info("Meeting became active (participant count > 1) for %s", meeting_id)
            else:
                if count <= 1:
                    alone_time += 2
                    if alone_time >= 5:
                        logger.info("Bot is alone. Triggering automatic exit for %s", meeting_id)
                        leave_btn = page.locator('[aria-label="Leave call"]')
                        if await leave_btn.is_visible(timeout=1000):
                            await leave_btn.click()
                        break
                else:
                    alone_time = 0
        except Exception as e:
            logger.debug("Participant count poll error: %s", e)

        try:
            current_url = page.url
            if "meet.google.com" not in current_url:
                logger.info("Meeting ended (URL changed) for %s", meeting_id)
                break

            ended = await page.locator(
                ':text("You left the meeting"), :text("The meeting has ended")'
            ).is_visible(timeout=500)
            if ended:
                logger.info("Meeting ended (UI indicator) for %s", meeting_id)
                break
        except Exception:
            logger.info("Page disconnected for %s", meeting_id)
            break

        try:
            texts: list[str] = await page.evaluate(_READ_CAPTIONS_JS)
            for raw in texts:
                if not raw or raw in seen_texts:
                    continue
                seen_texts.add(raw)
                parts = [p.strip() for p in raw.split("\n") if p.strip()]
                if len(parts) >= 2:
                    speaker = parts[0]
                    text = " ".join(parts[1:])
                else:
                    speaker = "Participant"
                    text = parts[0] if parts else raw
                if text:
                    captions.append((speaker, text, time.time()))
                    logger.info("Caption: [%s] %s", speaker, text[:60])
        except Exception as e:
            logger.debug("Caption poll error: %s", e)

    logger.info("Captured %d caption entries for %s", len(captions), meeting_id)
    return captions


async def _process_transcript(
    captions: list[tuple], meeting_id: str
) -> None:

    transcript_text = build_transcript(captions)

    if not validate_transcript(transcript_text):
        _send_status(
            meeting_id, "FAILED",
            error="No dialogue detected in meeting"
        )
        logger.warning("Empty/short transcript for %s", meeting_id)
        return

    _send_status(meeting_id, "PROCESSING_AI")

    try:
        from app.services.gemini import summarize_transcript
        summary = await summarize_transcript(transcript_text)
    except Exception as e:
        _send_status(meeting_id, "FAILED", error=f"AI summarization failed: {e}")
        return

    try:
        from app.services.firebase_service import update_meeting_complete
        update_meeting_complete(meeting_id, summary, transcript_text)
    except Exception as e:
        logger.error("Firestore update failed for %s: %s", meeting_id, e)
        _send_status(meeting_id, "FAILED", error=f"Firestore update failed: {e}")
        return

    _send_status(meeting_id, "COMPLETED", summary=summary)
    logger.info("Meeting %s completed successfully", meeting_id)