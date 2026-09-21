import type { Page } from "@playwright/test";

export const MOCK_ARTICLES = [
	{
		id: "11111111-1111-4111-8111-111111111111",
		title: "Primeira noticia de teste",
		excerpt: "Resumo da primeira noticia de teste para o E2E.",
		url: "https://example.com/article-1",
		source: "Fonte Um",
		category: "Big Techs",
		company: "TestCo",
		publishedAt: new Date().toISOString(),
		imageUrl: null,
	},
	{
		id: "22222222-2222-4222-8222-222222222222",
		title: "Segunda noticia de teste",
		excerpt: "Resumo da segunda noticia de teste para o E2E.",
		url: "https://example.com/article-2",
		source: "Fonte Dois",
		category: "AI Frontier",
		company: "TestCo",
		publishedAt: new Date().toISOString(),
		imageUrl: null,
	},
];

/**
 * Mocks the backend endpoints the live app (AppNeo) calls on mount so E2E
 * tests are deterministic and don't depend on a running backend/DB.
 */
export async function mockBackend(page: Page) {
	await page.route("**/api/news?**", (route) =>
		route.fulfill({
			status: 200,
			contentType: "application/json",
			body: JSON.stringify({ articles: MOCK_ARTICLES, hasMore: false }),
		}),
	);
	await page.route("**/api/stories/graph**", (route) =>
		route.fulfill({
			status: 200,
			contentType: "application/json",
			body: JSON.stringify({ data: { nodes: [], edges: [], stories: [] } }),
		}),
	);
	await page.route("**/api/stories?**", (route) =>
		route.fulfill({
			status: 200,
			contentType: "application/json",
			body: JSON.stringify({ data: [] }),
		}),
	);
	await page.route("**/api/topics**", (route) =>
		route.fulfill({
			status: 200,
			contentType: "application/json",
			body: JSON.stringify({ data: [] }),
		}),
	);
	await page.route("**/api/news/top**", (route) =>
		route.fulfill({
			status: 200,
			contentType: "application/json",
			body: JSON.stringify({ data: [] }),
		}),
	);
	await page.route("**/api/health", (route) =>
		route.fulfill({ status: 200, contentType: "text/plain", body: "" }),
	);
	await page.route("**/health", (route) =>
		route.fulfill({
			status: 200,
			contentType: "application/json",
			body: JSON.stringify({
				status: "ok",
				uptime: 1,
				dependencies: {
					database: { status: "ok", latencyMs: 1 },
					redis: { status: "ok", latencyMs: 1 },
					ollama: { status: "ok", latencyMs: 1 },
				},
			}),
		}),
	);
}
