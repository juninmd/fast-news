import { useCallback, useSyncExternalStore } from "react";

const KEY = "fn_bookmarks";

function load(): string[] {
	try {
		return JSON.parse(localStorage.getItem(KEY) ?? "[]");
	} catch {
		return [];
	}
}

let bookmarks: string[] = load();
const listeners = new Set<() => void>();

function subscribe(listener: () => void): () => void {
	listeners.add(listener);
	return () => listeners.delete(listener);
}

function getSnapshot(): string[] {
	return bookmarks;
}

function setBookmarks(next: string[]) {
	bookmarks = next;
	localStorage.setItem(KEY, JSON.stringify(next));
	for (const listener of listeners) listener();
}

/**
 * Backed by a module-level store (not per-instance state) so every
 * useBookmarks() caller — NewsCard, AppNeo's tab counter, etc. — observes
 * the same bookmark list and re-renders when any of them toggles one.
 */
export function useBookmarks() {
	const bookmarks = useSyncExternalStore(subscribe, getSnapshot);

	const toggle = useCallback((id: string) => {
		const current = getSnapshot();
		const next = current.includes(id)
			? current.filter((b) => b !== id)
			: [id, ...current];
		setBookmarks(next);
	}, []);

	const isBookmarked = useCallback(
		(id: string) => bookmarks.includes(id),
		[bookmarks],
	);

	return { bookmarks, toggle, isBookmarked };
}
