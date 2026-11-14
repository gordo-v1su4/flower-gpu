from pathlib import Path
from playwright.sync_api import sync_playwright

out = Path("artifacts/side")
out.mkdir(parents=True, exist_ok=True)
with sync_playwright() as p:
    browser = p.chromium.launch(headless=True, args=["--enable-unsafe-webgpu"])
    page = browser.new_page(viewport={"width": 1200, "height": 900})
    errors = []
    page.on("pageerror", lambda error: errors.append(str(error)))
    page.goto("http://127.0.0.1:4173", wait_until="networkidle")
    page.wait_for_selector("body.is-ready", timeout=90000)
    page.locator("[data-motion='off']").click()
    page.locator(".stage-choice").filter(has_text="Medium Gray").locator("button").evaluate("button => button.click()")
    page.add_style_tag(content="header, main, footer, #studio-panel, .vignette { display: none !important; }")
    entries = [(1, "soft-peony"), (3, "garden-chrysanthemum"), (4, "sunburst-dahlia")]
    for index, name in entries:
        page.locator(".preset-choice").nth(index).locator("button").evaluate("button => button.click()")
        page.wait_for_timeout(1600)
        for view in ["front", "threeQuarter"]:
            page.evaluate("view => window.snapFlowerView(view)", arg=view)
            page.wait_for_timeout(350)
            page.locator("#view").screenshot(path=str(out / f"{index + 1:02d}-{name}-rounded-{view}.png"))
    print(f"Errors: {errors}")
    browser.close()
