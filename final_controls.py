from hashlib import sha256
from pathlib import Path
from playwright.sync_api import sync_playwright

OUT = Path("artifacts/final")
OUT.mkdir(parents=True, exist_ok=True)
checks = []
errors = []
failed_requests = []


def check(condition, label):
    if not condition:
        raise AssertionError(label)
    checks.append(label)
    print(f"PASS: {label}", flush=True)


def digest(data):
    return sha256(data).hexdigest()


with sync_playwright() as p:
    browser = p.chromium.launch(headless=True, args=["--enable-unsafe-webgpu"])
    page = browser.new_page(viewport={"width": 1200, "height": 900}, device_scale_factor=1)
    page.on("pageerror", lambda error: errors.append(str(error)))
    page.on("console", lambda message: errors.append(message.text) if message.type == "error" else None)
    page.on("requestfailed", lambda request: failed_requests.append(f"{request.url}: {request.failure}"))
    page.goto("http://127.0.0.1:4173", wait_until="networkidle")
    page.wait_for_selector("body.is-ready", timeout=90000)
    check(page.locator("#status").is_hidden(), "Renderer starts without an error")
    page.locator("[data-motion='off']").click()
    page.locator(".stage-choice").filter(has_text="Medium Gray").locator("button").evaluate("button => button.click()")

    before_random = digest(page.locator("#view").screenshot())
    page.get_by_text("Randomize Petals", exact=True).evaluate("el => el.parentElement.click()")
    page.wait_for_timeout(500)
    after_random = digest(page.locator("#view").screenshot())
    check(before_random != after_random, "Randomize Petals changes the rendered flower")

    page.get_by_text("Half Bloom", exact=True).evaluate("el => el.parentElement.click()")
    page.wait_for_timeout(250)
    progress = page.get_by_text("Progress", exact=True).locator("..").locator("input")
    check(abs(float(progress.input_value()) - 5) < 0.01, "Half Bloom sets growth to five")
    page.get_by_text("Full Bloom", exact=True).evaluate("el => el.parentElement.click()")
    page.wait_for_timeout(250)
    check(abs(float(progress.input_value()) - 10) < 0.01, "Full Bloom sets growth to ten")
    page.locator("[data-motion='bloom']").click()
    page.wait_for_timeout(900)
    check(page.locator("[data-motion='bloom']").get_attribute("aria-pressed") == "true", "Bloom animation mode activates")
    bloom_before = digest(page.locator("#view").screenshot())
    page.wait_for_timeout(600)
    bloom_after = digest(page.locator("#view").screenshot())
    check(bloom_before != bloom_after, "Bloom animation changes the rendered flower")
    page.locator("[data-motion='off']").click()
    paused_value = progress.input_value()
    page.wait_for_timeout(400)
    check(progress.input_value() == paused_value, "Pause stops bloom progression")

    page.locator("[data-motion='sway']").click()
    page.wait_for_timeout(300)
    sway_before = digest(page.locator("#view").screenshot())
    page.wait_for_timeout(650)
    sway_after = digest(page.locator("#view").screenshot())
    check(sway_before != sway_after, "Sway animation changes the rendered flower")
    page.locator("[data-motion='rotate']").click()
    page.wait_for_timeout(300)
    orbit_before = digest(page.locator("#view").screenshot())
    page.wait_for_timeout(650)
    orbit_after = digest(page.locator("#view").screenshot())
    check(orbit_before != orbit_after, "Orbit animation changes the rendered view")
    page.locator("[data-motion='off']").click()

    page.locator("[data-action='next']").click()
    page.wait_for_timeout(1200)
    check(page.locator("#flower-name").text_content() == "Soft Peony", "Next button navigates presets")
    page.locator("[data-action='previous']").click()
    page.wait_for_timeout(1200)
    check(page.locator("#flower-name").text_content() == "Velvet Dahlia", "Previous button navigates presets")
    page.keyboard.press("ArrowRight")
    page.wait_for_timeout(1200)
    check(page.locator("#flower-name").text_content() == "Soft Peony", "Arrow keys navigate presets")
    page.locator("[data-action='reset-view']").click()
    check(page.locator("#status").is_hidden(), "Reset view leaves renderer healthy")

    mobile = browser.new_page(viewport={"width": 390, "height": 844}, device_scale_factor=1, reduced_motion="reduce")
    mobile.on("pageerror", lambda error: errors.append(str(error)))
    mobile.on("console", lambda message: errors.append(message.text) if message.type == "error" else None)
    mobile.on("requestfailed", lambda request: failed_requests.append(f"{request.url}: {request.failure}"))
    mobile.goto("http://127.0.0.1:4173", wait_until="networkidle")
    mobile.wait_for_selector("body.is-ready", timeout=90000)
    check(mobile.locator("[data-motion='off']").get_attribute("aria-pressed") == "true", "Reduced motion starts paused")
    check(mobile.locator("[data-action='toggle-panel']").get_attribute("aria-expanded") == "false", "Mobile controls start collapsed")
    mobile.locator("[data-action='toggle-panel']").click()
    check(mobile.locator("[data-action='toggle-panel']").get_attribute("aria-expanded") == "true", "Mobile studio controls open")
    mobile.locator(".preset-choice").nth(7).locator("button").evaluate("button => button.click()")
    mobile.wait_for_timeout(1400)
    check(mobile.locator("#flower-name").text_content() == "Passion Flower", "Mobile preset selection works")
    mobile.locator("[data-action='toggle-panel']").click()
    mobile.locator("[data-action='next']").click()
    mobile.wait_for_timeout(1400)
    check(mobile.locator("#flower-name").text_content() == "Copper Rose", "Mobile navigation works")
    check(mobile.evaluate("document.documentElement.scrollWidth <= window.innerWidth + 1"), "Mobile layout has no horizontal overflow")
    mobile.screenshot(path=str(OUT / "mobile.png"), full_page=True)
    check(mobile.locator("#status").is_hidden(), "Mobile renderer starts without an error")

    check(not errors, f"No browser console or page errors ({errors})")
    check(not failed_requests, f"No failed network requests ({failed_requests})")
    print(f"Completed {len(checks)} checks", flush=True)
    browser.close()
