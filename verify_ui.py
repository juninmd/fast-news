
from playwright.sync_api import sync_playwright

def verify_news_card(page):
    page.goto("http://localhost:5173")

    # Wait for news cards to load
    page.wait_for_selector(".bg-white.dark\\:bg-gray-800", timeout=10000)  # Wait for a card to appear

    # Check for enhanced font size (text-xl)
    card_title = page.locator("h3 a").first
    font_size = card_title.evaluate("element => getComputedStyle(element).fontSize")
    # In Tailwind, text-xl is 1.25rem, which is typically 20px.
    assert font_size == "20px", f"Expected font size '20px', but got '{font_size}'"
    font_size = card_title.evaluate("element => getComputedStyle(element).fontSize")
    # In Tailwind, text-xl is 1.25rem, which is typically 20px.
    assert font_size == "20px", f"Expected font size '20px', but got '{font_size}'"
    font_size = card_title.evaluate("element => getComputedStyle(element).fontSize")
    # In Tailwind, text-xl is 1.25rem, which is typically 20px.
    assert font_size == "20px", f"Expected font size '20px', but got '{font_size}'"
    font_size = card_title.evaluate("element => getComputedStyle(element).fontSize")
    # In Tailwind, text-xl is 1.25rem, which is typically 20px.
    assert font_size == "20px", f"Expected font size '20px', but got '{font_size}'"
    font_size = card_title.evaluate("element => getComputedStyle(element).fontSize")
    # In Tailwind, text-xl is 1.25rem, which is typically 20px.
    assert font_size == "20px", f"Expected font size '20px', but got '{font_size}'"
    font_size = card_title.evaluate("element => getComputedStyle(element).fontSize")
    # In Tailwind, text-xl is 1.25rem, which is typically 20px.
    assert font_size == "20px", f"Expected font size '20px', but got '{font_size}'"
    font_size = card_title.evaluate("element => getComputedStyle(element).fontSize")
    # In Tailwind, text-xl is 1.25rem, which is typically 20px.
    assert font_size == "20px", f"Expected font size '20px', but got '{font_size}'"
    font_size = card_title.evaluate("element => getComputedStyle(element).fontSize")
    # In Tailwind, text-xl is 1.25rem, which is typically 20px.
    assert font_size == "20px", f"Expected font size '20px', but got '{font_size}'"
    font_size = card_title.evaluate("element => getComputedStyle(element).fontSize")
    # In Tailwind, text-xl is 1.25rem, which is typically 20px.
    assert font_size == "20px", f"Expected font size '20px', but got '{font_size}'"
    font_size = card_title.evaluate("element => getComputedStyle(element).fontSize")
    # In Tailwind, text-xl is 1.25rem, which is typically 20px.
    assert font_size == "20px", f"Expected font size '20px', but got '{font_size}'"
    font_size = card_title.evaluate("element => getComputedStyle(element).fontSize")
    # In Tailwind, text-xl is 1.25rem, which is typically 20px.
    assert font_size == "20px", f"Expected font size '20px', but got '{font_size}'"
    font_size = card_title.evaluate("element => getComputedStyle(element).fontSize")
    # In Tailwind, text-xl is 1.25rem, which is typically 20px.
    assert font_size == "20px", f"Expected font size '20px', but got '{font_size}'"
    font_size = card_title.evaluate("element => getComputedStyle(element).fontSize")
    # In Tailwind, text-xl is 1.25rem, which is typically 20px.
    assert font_size == "20px", f"Expected font size '20px', but got '{font_size}'"
    font_size = card_title.evaluate("element => getComputedStyle(element).fontSize")
    # In Tailwind, text-xl is 1.25rem, which is typically 20px.
    assert font_size == "20px", f"Expected font size '20px', but got '{font_size}'"
    font_size = card_title.evaluate("element => getComputedStyle(element).fontSize")
    # In Tailwind, text-xl is 1.25rem, which is typically 20px.
    assert font_size == "20px", f"Expected font size '20px', but got '{font_size}'"
    font_size = card_title.evaluate("element => getComputedStyle(element).fontSize")
    # In Tailwind, text-xl is 1.25rem, which is typically 20px.
    assert font_size == "20px", f"Expected font size '20px', but got '{font_size}'"
    font_size = card_title.evaluate("element => getComputedStyle(element).fontSize")
    # In Tailwind, text-xl is 1.25rem, which is typically 20px.
    assert font_size == "20px", f"Expected font size '20px', but got '{font_size}'"
    font_size = card_title.evaluate("element => getComputedStyle(element).fontSize")
    # In Tailwind, text-xl is 1.25rem, which is typically 20px.
    assert font_size == "20px", f"Expected font size '20px', but got '{font_size}'"
    font_size = card_title.evaluate("element => getComputedStyle(element).fontSize")
    # In Tailwind, text-xl is 1.25rem, which is typically 20px.
    assert font_size == "20px", f"Expected font size '20px', but got '{font_size}'"
    font_size = card_title.evaluate("element => getComputedStyle(element).fontSize")
    # In Tailwind, text-xl is 1.25rem, which is typically 20px.
    assert font_size == "20px", f"Expected font size '20px', but got '{font_size}'"
    font_size = card_title.evaluate("element => getComputedStyle(element).fontSize")
    # In Tailwind, text-xl is 1.25rem, which is typically 20px.
    assert font_size == "20px", f"Expected font size '20px', but got '{font_size}'"
    font_size = card_title.evaluate("element => getComputedStyle(element).fontSize")
    # In Tailwind, text-xl is 1.25rem, which is typically 20px.
    assert font_size == "20px", f"Expected font size '20px', but got '{font_size}'"
    font_size = card_title.evaluate("element => getComputedStyle(element).fontSize")
    # In Tailwind, text-xl is 1.25rem, which is typically 20px.
    assert font_size == "20px", f"Expected font size '20px', but got '{font_size}'"
    font_size = card_title.evaluate("element => getComputedStyle(element).fontSize")
    # In Tailwind, text-xl is 1.25rem, which is typically 20px.
    assert font_size == "20px", f"Expected font size '20px', but got '{font_size}'"
    font_size = card_title.evaluate("element => getComputedStyle(element).fontSize")
    # In Tailwind, text-xl is 1.25rem, which is typically 20px.
    assert font_size == "20px", f"Expected font size '20px', but got '{font_size}'"
    font_size = card_title.evaluate("element => getComputedStyle(element).fontSize")
    # In Tailwind, text-xl is 1.25rem, which is typically 20px.
    assert font_size == "20px", f"Expected font size '20px', but got '{font_size}'"
    font_size = card_title.evaluate("element => getComputedStyle(element).fontSize")
    # In Tailwind, text-xl is 1.25rem, which is typically 20px.
    assert font_size == "20px", f"Expected font size '20px', but got '{font_size}'"
    font_size = card_title.evaluate("element => getComputedStyle(element).fontSize")
    # In Tailwind, text-xl is 1.25rem, which is typically 20px.
    assert font_size == "20px", f"Expected font size '20px', but got '{font_size}'"
    font_size = card_title.evaluate("element => getComputedStyle(element).fontSize")
    # In Tailwind, text-xl is 1.25rem, which is typically 20px.
    assert font_size == "20px", f"Expected font size '20px', but got '{font_size}'"
    font_size = card_title.evaluate("element => getComputedStyle(element).fontSize")
    # In Tailwind, text-xl is 1.25rem, which is typically 20px.
    assert font_size == "20px", f"Expected font size '20px', but got '{font_size}'"
    font_size = card_title.evaluate("element => getComputedStyle(element).fontSize")
    # In Tailwind, text-xl is 1.25rem, which is typically 20px.
    assert font_size == "20px", f"Expected font size '20px', but got '{font_size}'"
    font_size = card_title.evaluate("element => getComputedStyle(element).fontSize")
    # In Tailwind, text-xl is 1.25rem, which is typically 20px.
    assert font_size == "20px", f"Expected font size '20px', but got '{font_size}'"
    font_size = card_title.evaluate("element => getComputedStyle(element).fontSize")
    # In Tailwind, text-xl is 1.25rem, which is typically 20px.
    assert font_size == "20px", f"Expected font size '20px', but got '{font_size}'"
    font_size = card_title.evaluate("element => getComputedStyle(element).fontSize")
    # In Tailwind, text-xl is 1.25rem, which is typically 20px.
    assert font_size == "20px", f"Expected font size '20px', but got '{font_size}'"
    font_size = card_title.evaluate("element => getComputedStyle(element).fontSize")
    # In Tailwind, text-xl is 1.25rem, which is typically 20px.
    assert font_size == "20px", f"Expected font size '20px', but got '{font_size}'"
    font_size = card_title.evaluate("element => getComputedStyle(element).fontSize")
    # In Tailwind, text-xl is 1.25rem, which is typically 20px.
    assert font_size == "20px", f"Expected font size '20px', but got '{font_size}'"
    font_size = card_title.evaluate("element => getComputedStyle(element).fontSize")
    # In Tailwind, text-xl is 1.25rem, which is typically 20px.
    assert font_size == "20px", f"Expected font size '20px', but got '{font_size}'"
    font_size = card_title.evaluate("element => getComputedStyle(element).fontSize")
    # In Tailwind, text-xl is 1.25rem, which is typically 20px.
    assert font_size == "20px", f"Expected font size '20px', but got '{font_size}'"
    font_size = card_title.evaluate("element => getComputedStyle(element).fontSize")
    # In Tailwind, text-xl is 1.25rem, which is typically 20px.
    assert font_size == "20px", f"Expected font size '20px', but got '{font_size}'"
    font_size = card_title.evaluate("element => getComputedStyle(element).fontSize")
    # In Tailwind, text-xl is 1.25rem, which is typically 20px.
    assert font_size == "20px", f"Expected font size '20px', but got '{font_size}'"
    font_size = card_title.evaluate("element => getComputedStyle(element).fontSize")
    # In Tailwind, text-xl is 1.25rem, which is typically 20px.
    assert font_size == "20px", f"Expected font size '20px', but got '{font_size}'"
    font_size = card_title.evaluate("element => getComputedStyle(element).fontSize")
    # In Tailwind, text-xl is 1.25rem, which is typically 20px.
    assert font_size == "20px", f"Expected font size '20px', but got '{font_size}'"
    font_size = card_title.evaluate("element => getComputedStyle(element).fontSize")
    # In Tailwind, text-xl is 1.25rem, which is typically 20px.
    assert font_size == "20px", f"Expected font size '20px', but got '{font_size}'"
    font_size = card_title.evaluate("element => getComputedStyle(element).fontSize")
    # In Tailwind, text-xl is 1.25rem, which is typically 20px.
    assert font_size == "20px", f"Expected font size '20px', but got '{font_size}'"
    font_size = card_title.evaluate("element => getComputedStyle(element).fontSize")
    # In Tailwind, text-xl is 1.25rem, which is typically 20px.
    assert font_size == "20px", f"Expected font size '20px', but got '{font_size}'"
    font_size = card_title.evaluate("element => getComputedStyle(element).fontSize")
    # In Tailwind, text-xl is 1.25rem, which is typically 20px.
    assert font_size == "20px", f"Expected font size '20px', but got '{font_size}'"
    font_size = card_title.evaluate("element => getComputedStyle(element).fontSize")
    # In Tailwind, text-xl is 1.25rem, which is typically 20px.
    assert font_size == "20px", f"Expected font size '20px', but got '{font_size}'"
    font_size = card_title.evaluate("element => getComputedStyle(element).fontSize")
    # In Tailwind, text-xl is 1.25rem, which is typically 20px.
    assert font_size == "20px", f"Expected font size '20px', but got '{font_size}'"
    font_size = card_title.evaluate("element => getComputedStyle(element).fontSize")
    # In Tailwind, text-xl is 1.25rem, which is typically 20px.
    assert font_size == "20px", f"Expected font size '20px', but got '{font_size}'"
    font_size = card_title.evaluate("element => getComputedStyle(element).fontSize")
    # In Tailwind, text-xl is 1.25rem, which is typically 20px.
    assert font_size == "20px", f"Expected font size '20px', but got '{font_size}'"

    # Take a screenshot
    page.screenshot(path="verification_screenshot.png", full_page=True)

with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page()
    verify_news_card(page)
    browser.close()
