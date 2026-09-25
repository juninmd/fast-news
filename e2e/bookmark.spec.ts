import { expect, test } from "@playwright/test";
import { MOCK_ARTICLES, mockBackend } from "./fixtures";

test.describe("Bookmarks", () => {
	test.beforeEach(async ({ page }) => {
		await mockBackend(page);
		await page.goto("/");
	});

	test("adds and removes a bookmark, and it persists in the Salvos tab", async ({
		page,
	}) => {
		const card = page.locator("article", { hasText: MOCK_ARTICLES[0].title });
		const bookmarkButton = card.getByTitle("Salvar");

		await bookmarkButton.click();
		await expect(card.getByTitle("Remover dos salvos")).toBeVisible();

		const bookmarksStorage = await page.evaluate(() =>
			localStorage.getItem("fn_bookmarks"),
		);
		expect(JSON.parse(bookmarksStorage ?? "[]")).toContain(MOCK_ARTICLES[0].id);

		await page.getByRole("button", { name: /Salvos \(1\)/ }).click();
		await expect(
			page.locator("article", { hasText: MOCK_ARTICLES[0].title }),
		).toBeVisible();

		await page
			.locator("article", { hasText: MOCK_ARTICLES[0].title })
			.getByTitle("Remover dos salvos")
			.click();

		await expect(page.getByText("Nenhum artigo salvo ainda.")).toBeVisible();

		const afterRemove = await page.evaluate(() =>
			localStorage.getItem("fn_bookmarks"),
		);
		expect(JSON.parse(afterRemove ?? "[]")).not.toContain(MOCK_ARTICLES[0].id);
	});
});
