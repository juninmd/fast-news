import { expect, test } from "@playwright/test";
import { MOCK_ARTICLES, mockBackend } from "./fixtures";

test.describe("Feed", () => {
	test.beforeEach(async ({ page }) => {
		await mockBackend(page);
	});

	test("loads and renders news cards from the API", async ({ page }) => {
		await page.goto("/");

		const article = page.locator("article", {
			hasText: MOCK_ARTICLES[0].title,
		});
		await expect(article).toBeVisible();
		await expect(article).toContainText(MOCK_ARTICLES[0].source);

		await expect(
			page.locator("article", { hasText: MOCK_ARTICLES[1].title }),
		).toBeVisible();
	});

	test("shows an empty state when the API returns no articles", async ({
		page,
	}) => {
		await page.route("**/api/news?**", (route) =>
			route.fulfill({
				status: 200,
				contentType: "application/json",
				body: JSON.stringify({ articles: [], hasMore: false }),
			}),
		);

		await page.goto("/");

		await expect(page.locator("article")).toHaveCount(0);
	});
});
