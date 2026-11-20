import { useCallback, useSyncExternalStore } from "react";

const KEY = "fn_history";

interface HistoryEntry {
	id: string;
	title: string;
	readAt: number;
}

function load(): HistoryEntry[] {
	try {
		const saved = JSON.parse(localStorage.getItem(KEY) ?? "[]");
		return Array.isArray(saved) ? saved : [];
	} catch {
		return [];
	}
}

let history: HistoryEntry[] = load();
const listeners = new Set<() => void>();

function subscribe(listener: () => void): () => void {
	listeners.add(listener);
	return () => listeners.delete(listener);
}

function getSnapshot(): HistoryEntry[] {
	return history;
}

// Shared across hook instances so a read marked in AppNeo/ArticleModal shows
// on every NewsCard and no instance overwrites storage with a stale list.
function setHistory(next: HistoryEntry[]) {
	history = next;
	try {
		localStorage.setItem(KEY, JSON.stringify(next));
	} catch {
		// storage blocked or full: history lasts until the tab closes
	}
	for (const listener of listeners) listener();
}

export function useReadingHistory() {
	const history = useSyncExternalStore(subscribe, getSnapshot);

	const markRead = useCallback((id: string, title: string) => {
		setHistory(
			[
				{ id, title, readAt: Date.now() },
				...getSnapshot().filter((h) => h.id !== id),
			].slice(0, 50),
		);
	}, []);

	const wasRead = useCallback(
		(id: string) => history.some((h) => h.id === id),
		[history],
	);

	return { history, markRead, wasRead };
}
