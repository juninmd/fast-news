import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useNews } from "./useNews";

const article = (id: string) => ({
	id,
	title: `Título ${id}`,
	url: `https://example.com/${id}`,
	source: "G1",
	category: "Brasil",
	published_at: "2026-10-20T12:00:00Z",
});

function respond(data: unknown) {
	return Promise.resolve({ ok: true, json: () => Promise.resolve(data) });
}

afterEach(() => vi.unstubAllGlobals());

describe("useNews", () => {
	it("does not repeat articles that shifted onto the next page", async () => {
		const fetchMock = vi
			.fn()
			.mockImplementationOnce(() =>
				respond({ articles: [article("a"), article("b")], hasMore: true }),
			)
			.mockImplementationOnce(() =>
				respond({ articles: [article("b"), article("c")], hasMore: false }),
			);
		vi.stubGlobal("fetch", fetchMock);

		const { result } = renderHook(() => useNews());
		await waitFor(() => expect(result.current.articles).toHaveLength(2));
		await act(() => result.current.loadMore());

		expect(result.current.articles.map((a) => a.id)).toEqual(["a", "b", "c"]);
	});

	it("ignores a double loadMore while a page is already loading", async () => {
		let release: (v: unknown) => void = () => undefined;
		const slow = new Promise((r) => {
			release = r;
		});
		const fetchMock = vi
			.fn()
			.mockImplementationOnce(() =>
				respond({ articles: [article("a")], hasMore: true }),
			)
			.mockImplementationOnce(() => slow);
		vi.stubGlobal("fetch", fetchMock);

		const { result } = renderHook(() => useNews());
		await waitFor(() => expect(result.current.articles).toHaveLength(1));
		await act(async () => {
			const first = result.current.loadMore();
			const second = result.current.loadMore();
			release({
				ok: true,
				json: () => Promise.resolve({ articles: [], hasMore: false }),
			});
			await Promise.all([first, second]);
		});

		expect(fetchMock).toHaveBeenCalledTimes(2);
	});
});
