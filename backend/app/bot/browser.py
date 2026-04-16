
from playwright.async_api import Playwright, Browser, BrowserContext

# Realistic Chrome 124 user agent — mimics a real Windows desktop browser
_USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/124.0.0.0 Safari/537.36"
)


async def launch_browser(p: Playwright) -> Browser:
    """Launch a headless Chromium browser with stealth and bot-optimized flags."""
    browser = await p.chromium.launch(
        headless=True,
        args=[
            "--disable-gpu",
            "--no-sandbox",
            "--disable-setuid-sandbox",
            "--use-fake-device-for-media-stream",
            "--use-fake-ui-for-media-stream",
            "--disable-features=WebRtcHideLocalIpsWithMdns",
            "--disable-blink-features=AutomationControlled",
            "--disable-infobars",
            "--disable-extensions",
            "--disable-background-networking",
            "--disable-default-apps",
            "--disable-translate",
            "--disable-sync",
            "--no-first-run",
            "--disable-dev-shm-usage",
        ],
    )
    return browser


async def new_stealth_context(browser: Browser) -> BrowserContext:
    """Create a browser context that closely mimics a real Chrome user."""
    context = await browser.new_context(
        user_agent=_USER_AGENT,
        viewport={"width": 1280, "height": 800},
        locale="en-US",
        timezone_id="America/New_York",
        permissions=["microphone", "camera"],
        java_script_enabled=True,
    )

    await context.add_init_script(
        "Object.defineProperty(navigator, 'webdriver', {get: () => undefined})"
    )
    return context
