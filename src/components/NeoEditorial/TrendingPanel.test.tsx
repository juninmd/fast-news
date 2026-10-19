import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TrendingPanel } from "./TrendingPanel";

const report = {
	windowHours: 24,
	totalArticles: 40,
	terms: [
		{
			term: "emendas parlamentares",
			count: 4,
			sources: 4,
			previous: 0,
			growth: 4,
			score: 30,
			hourly: [0, 1, 3],
			articleIds: [],
		},
		{
			term: "selic",
			count: 5,
			sources: 5,
			previous: 3,
			growth: 1.67,
			score: 14,
			hourly: [1, 1, 3],
			articleIds: [],
		},
	],
	themes: [{ theme: "Economia", count: 8, previous: 4, growth: 2, share: 0.2 }],
};

afterEach(() => vi.restoreAllMocks());

describe("TrendingPanel", () => {
	it("lists trending terms and reports the one the reader picks", async () => {
		vi.spyOn(globalThis, "fetch").mockResolvedValue(
			new Response(JSON.stringify(report)),
		);
		const onSelectTerm = vi.fn();
		render(<TrendingPanel onSelectTerm={onSelectTerm} />);

		const first = await screen.findByText("Emendas Parlamentares");
		expect(screen.getByText("novo")).toBeInTheDocument();
		expect(screen.getByText(/↑ 1\.7×/)).toBeInTheDocument();

		await userEvent.click(first);
		expect(onSelectTerm).toHaveBeenCalledWith("emendas parlamentares");
	});

	it("refetches when the time window changes", async () => {
		const fetchMock = vi
			.spyOn(globalThis, "fetch")
			.mockImplementation(async () => new Response(JSON.stringify(report)));
		render(<TrendingPanel onSelectTerm={vi.fn()} />);
		await screen.findByText("Selic");

		await userEvent.click(screen.getByRole("button", { name: "6h" }));
		await waitFor(() =>
			expect(fetchMock).toHaveBeenLastCalledWith(
				"/api/news/trends?hours=6",
				expect.anything(),
			),
		);
	});

	it("says so when nothing is trending", async () => {
		vi.spyOn(globalThis, "fetch").mockResolvedValue(
			new Response(JSON.stringify({ ...report, terms: [], themes: [] })),
		);
		render(<TrendingPanel onSelectTerm={vi.fn()} />);
		expect(await screen.findByText(/Sem temas em alta/)).toBeInTheDocument();
	});
});
