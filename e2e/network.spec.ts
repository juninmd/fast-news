import { expect, test } from "@playwright/test";
import { MOCK_ARTICLES, mockBackend } from "./fixtures";

test.describe("Network error handling", () => {
	test("shows an error with retry when the feed request fails, and recovers", async ({
		page,
	}) => {
		await mockBackend(page);
		await page.route("**/api/news?**", (route) =>
			route.fulfill({ status: 500, body: "Internal Server Error" }),
		);

		await page.goto("/");

		await expect(page.getByText("Failed to fetch articles")).toBeVisible();
		const retryButton = page.getByRole("button", { name: "Retry" });
		await expect(retryButton).toBeVisible();

		await page.route("**/api/news?**", (route) =>
			route.fulfill({
				status: 200,
				contentType: "application/json",
				body: JSON.stringify({ articles: MOCK_ARTICLES, hasMore: false }),
			}),
		);
		await retryButton.click();

		await expect(
			page.locator("article", { hasText: MOCK_ARTICLES[0].title }),
		).toBeVisible();
	});
});
