import { useCallback, useState } from "react";

const KEY = "fn_bookmarks";

function load(): string[] {
	try {
		return JSON.parse(localStorage.getItem(KEY) ?? "[]");
	} catch {
		return [];
	}
}

export function useBookmarks() {
	const [bookmarks, setBookmarks] = useState<string[]>(load);

	const toggle = useCallback((id: string) => {
		setBookmarks((prev) => {
			const next = prev.includes(id)
				? prev.filter((b) => b !== id)
				: [id, ...prev];
			localStorage.setItem(KEY, JSON.stringify(next));
			return next;
		});
	}, []);

	const isBookmarked = useCallback(
		(id: string) => bookmarks.includes(id),
		[bookmarks],
	);

	return { bookmarks, toggle, isBookmarked };
}
