import { act, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ArticleModal } from "./ArticleModal";

vi.mock("../../hooks/useReadingHistory", () => ({
	useReadingHistory: () => ({ markRead: vi.fn() }),
}));

const article = (id: string, title: string) => ({
	id,
	title,
	summary: "s",
	content: "c",
	url: "https://x.test",
	source: "src",
	category: "Tech",
	published_at: "2026-11-19T10:00:00Z",
});

const noop = vi.fn();

afterEach(() => vi.unstubAllGlobals());

describe("ArticleModal", () => {
	it("is an accessible dialog with labelled icon buttons", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn(async (url: string) => ({
				ok: true,
				json: async () =>
					url.endsWith("/related") ? { data: [] } : article("a", "Título A"),
			})),
		);
		render(<ArticleModal articleId="a" onClose={noop} />);
		expect(
			await screen.findByRole("dialog", { name: "Título A" }),
		).toHaveAttribute("aria-modal", "true");
		expect(screen.getByRole("button", { name: "Fechar" })).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Modo foco" })).toHaveAttribute(
			"aria-pressed",
			"false",
		);
	});

	it("aborts the previous article's requests when the reader switches", async () => {
		const signals: AbortSignal[] = [];
		vi.stubGlobal(
			"fetch",
			vi.fn((_url: string, init?: RequestInit) => {
				if (init?.signal) signals.push(init.signal);
				return new Promise(noop);
			}),
		);
		const { rerender } = render(<ArticleModal articleId="a" onClose={noop} />);
		await act(async () => undefined);
		expect(signals).toHaveLength(2);
		rerender(<ArticleModal articleId="b" onClose={noop} />);
		await waitFor(() =>
			expect(signals.slice(0, 2).every((s) => s.aborted)).toBe(true),
		);
		expect(signals.slice(2).every((s) => !s.aborted)).toBe(true);
	});
});
