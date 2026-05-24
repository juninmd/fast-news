import { useCallback, useState } from "react";

const KEY = "fn_history";

interface HistoryEntry {
	id: string;
	title: string;
	readAt: number;
}

function load(): HistoryEntry[] {
	try {
		return JSON.parse(localStorage.getItem(KEY) ?? "[]");
	} catch {
		return [];
	}
}

export function useReadingHistory() {
	const [history, setHistory] = useState<HistoryEntry[]>(load);

	const markRead = useCallback((id: string, title: string) => {
		setHistory((prev) => {
			const next = [
				{ id, title, readAt: Date.now() },
				...prev.filter((h) => h.id !== id),
			].slice(0, 50);
			localStorage.setItem(KEY, JSON.stringify(next));
			return next;
		});
	}, []);

	const wasRead = useCallback(
		(id: string) => history.some((h) => h.id === id),
		[history],
	);

	return { history, markRead, wasRead };
}
