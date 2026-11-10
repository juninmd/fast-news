import { useEffect, useState } from "react";

export interface TrendTerm {
	term: string;
	count: number;
	sources: number;
	previous: number;
	growth: number;
	score: number;
	hourly: number[];
	articleIds: string[];
}

export interface TrendTheme {
	theme: string;
	count: number;
	previous: number;
	growth: number;
	share: number;
}

export interface TrendReport {
	windowHours: number;
	totalArticles: number;
	terms: TrendTerm[];
	themes: TrendTheme[];
}

export function useTrends(hours: number) {
	const [report, setReport] = useState<TrendReport | null>(null);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		const ac = new AbortController();
		setLoading(true);
		fetch(`/api/news/trends?hours=${hours}`, { signal: ac.signal })
			.then((r) => (r.ok ? r.json() : null))
			.then((d: TrendReport | null) => setReport(d))
			.catch(() => {
				// trends are optional; keep the previous report on failure
			})
			.finally(() => {
				if (!ac.signal.aborted) setLoading(false);
			});
		return () => ac.abort();
	}, [hours]);

	return { report, loading };
}
