
from playwright.sync_api import sync_playwright

def verify_news_card(page):
    page.goto("http://localhost:5173")

    # Wait for news cards to load
    page.wait_for_selector("text=Carregar mais fontes", timeout=10000)

    # Check for enhanced font size (text-xl or text-2xl)
    # This is a bit indirect, but we can visually inspect the screenshot

    # Take a screenshot
    page.screenshot(path="verification_screenshot.png", full_page=True)

with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page()
    verify_news_card(page)
    browser.close()
