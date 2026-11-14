from pathlib import Path
from playwright.sync_api import sync_playwright

OUT = Path("artifacts/refinements")
OUT.mkdir(parents=True, exist_ok=True)
PRESETS = [(1, "SoftPeony"), (2, "WildOrchid")]
errors = []
failed_requests = []

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True, args=["--enable-unsafe-webgpu"])
    page = browser.new_page(viewport={"width": 1200, "height": 900}, device_scale_factor=1)
    page.on("pageerror", lambda error: errors.append(str(error)))
    page.on("console", lambda message: errors.append(message.text) if message.type == "error" else None)
    page.on("requestfailed", lambda request: failed_requests.append(f"{request.url}: {request.failure}"))
    page.goto("http://127.0.0.1:4173", wait_until="networkidle")
    page.wait_for_selector("body.is-ready", timeout=90000)
    page.locator("[data-motion='off']").click()
    page.locator(".stage-choice").filter(has_text="Medium Gray").locator("button").evaluate("button => button.click()")
    page.add_style_tag(content="header, main, footer, #studio-panel, .vignette { display: none !important; }")
    for index, name in PRESETS:
        page.locator(".preset-choice").nth(index).locator("button").evaluate("button => button.click()")
        page.wait_for_timeout(2200)
        page.evaluate("window.snapFlowerView('threeQuarter')")
        page.wait_for_timeout(400)
        page.locator("#view").screenshot(path=str(OUT / f"{index + 1:02d}-{name}-three-quarter.png"))
        page.evaluate("window.snapFlowerView('top')")
        page.wait_for_timeout(400)
        page.locator("#view").screenshot(path=str(OUT / f"{index + 1:02d}-{name}-top.png"))
    print(f"Browser errors: {errors}")
    print(f"Failed requests: {failed_requests}")
    browser.close()
