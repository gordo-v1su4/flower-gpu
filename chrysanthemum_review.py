from pathlib import Path
from playwright.sync_api import sync_playwright

out = Path("artifacts/chrysanthemum")
out.mkdir(parents=True, exist_ok=True)
with sync_playwright() as p:
    browser = p.chromium.launch(headless=True, args=["--enable-unsafe-webgpu"])
    page = browser.new_page(viewport={"width": 1440, "height": 1000})
    errors = []
    failed = []
    page.on("pageerror", lambda error: errors.append(str(error)))
    page.on("console", lambda message: errors.append(message.text) if message.type == "error" else None)
    page.on("requestfailed", lambda request: failed.append(request.url))
    page.goto("http://127.0.0.1:4173", wait_until="networkidle")
    page.wait_for_selector("body.is-ready", timeout=90000)
    page.locator("[data-motion='off']").click()
    page.locator(".preset-choice").nth(3).locator("button").click()
    page.wait_for_timeout(1800)
    page.locator(".lil-title").filter(has_text="Petal").click()
    page.wait_for_timeout(250)
    page.screenshot(path=str(out / "interface.png"))
    slider = page.locator(".lil-controller.lil-number").filter(has_text="Length").first
    slider.locator("input").fill("8")
    slider.locator("input").press("Tab")
    page.wait_for_timeout(250)
    gradient = slider.locator(".lil-fill").evaluate("el => getComputedStyle(el).backgroundImage")
    page.screenshot(path=str(out / "slider-hot-pink.png"))
    slider.locator("input").fill("1.95")
    slider.locator("input").press("Tab")
    page.locator(".lil-title").filter(has_text="Petal").click()
    page.add_style_tag(content="header, main, footer, #studio-panel, .vignette { display: none !important; }")
    for view in ["front", "threeQuarter"]:
        page.evaluate("view => window.snapFlowerView(view)", arg=view)
        page.wait_for_timeout(400)
        page.screenshot(path=str(out / f"{view}.png"), timeout=30000)
    print(f"Gradient: {gradient}")
    print(f"Errors: {errors}")
    print(f"Failed requests: {failed}")
    browser.close()
