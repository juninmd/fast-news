import os
from playwright.sync_api import sync_playwright, expect

def verify_ui():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
        page = context.new_page()

        print("Navigating to http://localhost:5173")
        try:
            page.goto("http://localhost:5173")
        except Exception as e:
            print(f"Failed to load page: {e}")
            return

        # Wait for news to load (NewsCard elements)
        print("Waiting for News Cards...")
        try:
            # Wait for at least one card
            # The 'Resumir' button is a good indicator a card is fully rendered
            page.wait_for_selector('button:has-text("Resumir")', timeout=15000)
            print("Found 'Resumir' button, meaning cards are loaded.")
        except Exception as e:
            print("Timeout waiting for cards. Likely no news fetched or error.")
            # Take a screenshot of the failure state
            page.screenshot(path="/home/jules/verification/failure_state.png")
            print("Saved failure_state.png")
            browser.close()
            return

        # Check for Settings button
        print("Checking for Settings button...")
        settings_btn = page.locator('button[title="Configurações"]')
        expect(settings_btn).to_be_visible()

        # Click Settings to open modal
        print("Opening Settings...")
        settings_btn.click()

        # Check for Modal content
        expect(page.locator('text=Token da API Gemini')).to_be_visible()
        print("Settings modal visible.")

        # Close modal
        page.locator('button:has-text("Cancelar")').click()

        # Take screenshot of the main feed
        print("Taking screenshot...")
        page.screenshot(path="/home/jules/verification/ui_verification.png", full_page=True)

        print("Verification complete.")
        browser.close()

if __name__ == "__main__":
    verify_ui()
