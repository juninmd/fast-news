import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useGlobalGraph, useStories, useStoryDetail } from "./useStories";

// Each request resolves only when the test says so, to replay responses out of order.
function deferredFetch() {
	const pending = new Map<string, (body: unknown) => void>();
	vi.stubGlobal(
		"fetch",
		vi.fn(
			(url: string) =>
				new Promise((resolve) => {
					pending.set(url, (body) =>
						resolve({ ok: true, json: async () => body } as Response),
					);
				}),
		),
	);
	const respond = async (match: string, body: unknown) => {
		const key = [...pending.keys()].find((u) => u.includes(match));
		if (!key) throw new Error(`no pending request for ${match}`);
		await act(async () => pending.get(key)?.(body));
	};
	return { respond };
}

afterEach(() => vi.unstubAllGlobals());

describe("story hooks ignore responses for a selection the user already left", () => {
	it("useStories keeps the stories of the current category", async () => {
		const { respond } = deferredFetch();
		const { result, rerender } = renderHook(({ c }) => useStories(c), {
			initialProps: { c: "Política" },
		});
		rerender({ c: "Economia" });

		await respond("Economia", { data: [{ id: "eco" }] });
		await respond("Pol", { data: [{ id: "pol" }] });

		await waitFor(() => expect(result.current.loading).toBe(false));
		expect(result.current.stories.map((s) => s.id)).toEqual(["eco"]);
	});

	it("useStoryDetail keeps the detail of the open story", async () => {
		const { respond } = deferredFetch();
		const { result, rerender } = renderHook(({ id }) => useStoryDetail(id), {
			initialProps: { id: "s1" as string | null },
		});
		rerender({ id: "s2" });

		await respond("/s2", { story: { id: "s2" } });
		await respond("/s1", { story: { id: "s1" } });

		expect(result.current.detail?.story.id).toBe("s2");
	});

	it("useGlobalGraph keeps the graph of the current category", async () => {
		const { respond } = deferredFetch();
		const { result, rerender } = renderHook(({ c }) => useGlobalGraph(c), {
			initialProps: { c: "Política" },
		});
		rerender({ c: "Economia" });

		await respond("Economia", {
			nodes: [],
			edges: [],
			stories: [{ id: "eco" }],
		});
		await respond("Pol", { nodes: [], edges: [], stories: [{ id: "pol" }] });

		expect(result.current.graph?.stories.map((s) => s.id)).toEqual(["eco"]);
	});
});
