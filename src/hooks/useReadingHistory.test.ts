import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { useReadingHistory } from "./useReadingHistory";

describe("useReadingHistory", () => {
	beforeEach(() => {
		localStorage.clear();
	});

	it("shows an article as read on every card once any instance marks it", () => {
		// AppNeo/ArticleModal mark reads; NewsCard asks wasRead() from its own
		// hook call. Per-instance state left cards stale until remount.
		const modal = renderHook(() => useReadingHistory());
		const card = renderHook(() => useReadingHistory());

		act(() => modal.result.current.markRead("a1", "Título 1"));

		expect(card.result.current.wasRead("a1")).toBe(true);
	});

	it("does not erase entries written by another instance", () => {
		const app = renderHook(() => useReadingHistory());
		const modal = renderHook(() => useReadingHistory());

		act(() => app.result.current.markRead("a1", "Título 1"));
		act(() => modal.result.current.markRead("a2", "Título 2"));

		const saved = JSON.parse(localStorage.getItem("fn_history") ?? "[]");
		expect(saved.map((h: { id: string }) => h.id)).toEqual(["a2", "a1"]);
		expect(app.result.current.history).toHaveLength(2);
	});
});
