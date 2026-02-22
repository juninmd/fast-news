from playwright.sync_api import sync_playwright

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context(viewport={'width': 1280, 'height': 800})
    page = context.new_page()

    try:
        print("Navigating to app...")
        page.goto("http://localhost:5173")
        page.wait_for_load_state('networkidle')

        print("Taking homepage screenshot...")
        page.screenshot(path="verification_home.png")

        print("Opening Settings...")
        page.get_by_title("Configurações").click()

        page.wait_for_selector("text=Configurações", state="visible")
        # Ensure Geral tab is active
        page.wait_for_selector("button:has-text('Geral').border-blue-600")
        page.screenshot(path="verification_settings_geral.png")

        print("Switching to IA tab...")
        ia_btn = page.get_by_role("button", name="Inteligência Artificial")
        ia_btn.click()
        page.wait_for_selector("text=URL do Ollama", state="visible")
        # Wait for tab to become active style
        page.wait_for_selector("button:has-text('Inteligência Artificial').border-blue-600")
        page.screenshot(path="verification_settings_ia.png")

        print("Switching to Telegram tab...")
        tel_btn = page.get_by_role("button", name="Telegram")
        tel_btn.click()
        page.wait_for_selector("text=Bot Token", state="visible")
        page.wait_for_selector("button:has-text('Telegram').border-blue-600")
        page.screenshot(path="verification_settings_telegram.png")

        print("Switching to Feeds tab...")
        feed_btn = page.get_by_role("button", name="Fontes", exact=True)
        feed_btn.click()
        page.wait_for_selector("input[placeholder='https://exemplo.com/rss']", state="visible")
        page.wait_for_selector("button:has-text('Fontes').border-blue-600")
        page.screenshot(path="verification_settings_feeds.png")

        print("Verification complete.")

    except Exception as e:
        print(f"Error: {e}")
        page.screenshot(path="verification_error.png")
    finally:
        browser.close()

with sync_playwright() as playwright:
    run(playwright)
