
from playwright.sync_api import sync_playwright
import time

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Navigate to the app
        print("Navigating to http://localhost:5173")
        page.goto("http://localhost:5173")

        # Wait for the app to load (look for the title)
        page.wait_for_selector("text=NewsAI", timeout=10000)

        # Take a screenshot of the main page
        page.screenshot(path="verification_main.png")
        print("Main page screenshot taken.")

        # Open settings
        print("Opening settings...")
        page.get_by_title("Configurações").click()

        # Wait for settings modal
        page.wait_for_selector("text=Configurações", timeout=5000)

        # Check for Auto Summarize toggle
        print("Checking for Auto Summarize toggle...")
        # Look for the text "Resumo Automático"
        if page.get_by_text("Resumo Automático").is_visible():
            print("Found 'Resumo Automático' text.")
        else:
            print("ERROR: 'Resumo Automático' text not found.")

        # Take a screenshot of settings
        page.screenshot(path="verification_settings.png")
        print("Settings page screenshot taken.")

        browser.close()

if __name__ == "__main__":
    run()
