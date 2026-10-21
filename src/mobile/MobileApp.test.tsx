import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import MobileApp from "./MobileApp";

const article = {
	id: "a1",
	title: "Matéria de teste sobre tecnologia",
	url: "https://example.com/a1",
	source: "Exemplo",
	category: "Tecnologia",
	published_at: new Date().toISOString(),
	image_url: null,
	source_count: 1,
	also_in: [],
};

const report = {
	windowHours: 24,
	totalArticles: 10,
	terms: [
		{
			term: "tesla",
			count: 5,
			sources: 4,
			previous: 0,
			growth: 5,
			score: 9,
			hourly: [0, 2, 3],
			articleIds: [],
		},
	],
	themes: [{ theme: "Negócios", count: 5, previous: 1, growth: 5, share: 0.5 }],
};

function route(url: string): unknown {
	if (url.startsWith("/api/news/top")) return { data: [] };
	if (url.startsWith("/api/news/trends")) return report;
	if (url.startsWith("/api/news/search"))
		return { data: [{ ...article, id: "s1", title: "Resultado da busca" }] };
	if (url.startsWith("/api/news/a1/related")) return { data: [] };
	if (url.startsWith("/api/news/a1"))
		return { ...article, summary: "Resumo gerado.", content: "" };
	if (url.startsWith("/api/news?")) return { data: [article], hasMore: false };
	return {};
}

beforeEach(() => {
	localStorage.clear();
	vi.spyOn(globalThis, "fetch").mockImplementation(
		async (input) => new Response(JSON.stringify(route(String(input)))),
	);
});
afterEach(() => vi.restoreAllMocks());

describe("MobileApp", () => {
	it("shows the feed and opens a story in the reader", async () => {
		render(<MobileApp />);
		const row = await screen.findByRole("button", { name: /Matéria de teste/ });
		await userEvent.click(row);

		const reader = await screen.findByRole("dialog", {
			name: /Matéria de teste/,
		});
		expect(await within(reader).findByText("Resumo gerado.")).toBeVisible();
		expect(
			within(reader).getByRole("button", { name: /Ler reportagem original/ }),
		).toBeEnabled();

		await userEvent.click(
			within(reader).getByRole("button", { name: "Voltar" }),
		);
		await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
	});

	it("saves a story from the reader and lists it under Salvos", async () => {
		render(<MobileApp />);
		await userEvent.click(
			await screen.findByRole("button", { name: /Matéria de teste/ }),
		);
		const reader = await screen.findByRole("dialog");
		await userEvent.click(
			within(reader).getByRole("button", { name: "Salvar" }),
		);
		await userEvent.click(
			within(reader).getByRole("button", { name: "Voltar" }),
		);

		await userEvent.click(screen.getByRole("button", { name: "Salvos" }));
		expect(
			await screen.findByRole("button", {
				name: /Matéria de teste/,
				hidden: false,
			}),
		).toBeInTheDocument();
		expect(JSON.parse(localStorage.getItem("fn_bookmarks") ?? "[]")).toEqual([
			"a1",
		]);
	});

	it("searches for a trending term picked on Em alta", async () => {
		render(<MobileApp />);
		await userEvent.click(screen.getByRole("button", { name: "Em alta" }));
		await userEvent.click(await screen.findByRole("button", { name: /Tesla/ }));

		expect(await screen.findByText(/1 resultados para “tesla”/)).toBeVisible();
		expect(screen.getByText("Resultado da busca")).toBeVisible();
		expect(screen.getByRole("button", { name: "Buscar" })).toHaveAttribute(
			"aria-current",
			"page",
		);
	});
});
