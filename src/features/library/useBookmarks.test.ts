import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { useBookmarks } from "./useBookmarks";

describe("useBookmarks", () => {
	beforeEach(() => {
		localStorage.clear();
	});

	it("persists a toggled bookmark to localStorage", () => {
		const { result } = renderHook(() => useBookmarks());

		act(() => result.current.toggle("article-1"));

		expect(result.current.isBookmarked("article-1")).toBe(true);
		expect(JSON.parse(localStorage.getItem("fn_bookmarks") ?? "[]")).toEqual([
			"article-1",
		]);
	});

	it("syncs bookmark state across independent hook instances", () => {
		// Regression test: NewsCard and AppNeo each call useBookmarks()
		// separately. Before the shared external store, toggling a bookmark
		// in one instance did not update the other (e.g. the "Salvos" tab
		// counter never changed when bookmarking from a card).
		const cardInstance = renderHook(() => useBookmarks());
		const tabInstance = renderHook(() => useBookmarks());

		act(() => cardInstance.result.current.toggle("article-2"));

		expect(cardInstance.result.current.bookmarks).toContain("article-2");
		expect(tabInstance.result.current.bookmarks).toContain("article-2");
	});
});
