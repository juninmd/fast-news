import { expect, test } from "@playwright/test";
import { MOCK_ARTICLES, mockBackend } from "./fixtures";

test.describe("Article detail", () => {
	test.beforeEach(async ({ page }) => {
		await mockBackend(page);
		await page.route("**/api/news/*/credibility", (route) =>
			route.fulfill({
				status: 200,
				contentType: "application/json",
				body: "{}",
			}),
		);
		await page.route(`**/api/news/${MOCK_ARTICLES[0].id}`, (route) =>
			route.fulfill({
				status: 200,
				contentType: "application/json",
				body: JSON.stringify({
					id: MOCK_ARTICLES[0].id,
					title: MOCK_ARTICLES[0].title,
					summary: MOCK_ARTICLES[0].excerpt,
					content: "Conteudo completo da noticia de teste.",
					url: MOCK_ARTICLES[0].url,
					source: MOCK_ARTICLES[0].source,
					category: MOCK_ARTICLES[0].category,
					company: MOCK_ARTICLES[0].company,
					published_at: MOCK_ARTICLES[0].publishedAt,
					image_url: null,
				}),
			}),
		);
		await page.route(`**/api/news/${MOCK_ARTICLES[0].id}/related`, (route) =>
			route.fulfill({
				status: 200,
				contentType: "application/json",
				body: JSON.stringify({ data: [] }),
			}),
		);
	});

	test("opens the article modal with the full content", async ({ page }) => {
		await page.goto("/");

		const card = page.locator("article", { hasText: MOCK_ARTICLES[0].title });
		await card.getByTitle("Abrir artigo").click();

		const modal = page.getByText("Conteudo completo da noticia de teste.");
		await expect(modal).toBeVisible();
	});
});
