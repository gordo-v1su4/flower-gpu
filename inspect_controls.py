from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True, args=["--enable-unsafe-webgpu"])
    page = browser.new_page()
    page.goto("http://127.0.0.1:4173", wait_until="networkidle")
    page.wait_for_selector("body.is-ready", timeout=90000)
    for label in ["Randomize Petals", "Half Bloom", "Full Bloom", "Progress"]:
        matches = page.get_by_text(label, exact=True)
        print(label, matches.count())
        for index in range(matches.count()):
            print(matches.nth(index).evaluate("el => el.parentElement.outerHTML"))
    browser.close()
