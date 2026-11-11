import { useEffect, useState } from "react";

export type DigestPeriod = "4h" | "daily" | "weekly" | "monthly";

export interface DigestItem {
	id: string;
	rank: number;
	title: string;
	url: string;
	source: string;
	category: string | null;
	summary: string | null;
	publishedAt: string | null;
	sourceCount: number;
}

/** Ranked digest from GET /api/digests/:period (built from stored scores, no model call). */
export function useDigest(period: DigestPeriod, scope: "all" | "ai") {
	const [items, setItems] = useState<DigestItem[]>([]);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		let cancelled = false;
		setLoading(true);
		fetch(`/api/digests/${period}${scope === "ai" ? "?scope=ai" : ""}`)
			.then((r) => (r.ok ? r.json() : { data: [] }))
			.then((d) => {
				if (!cancelled) setItems(Array.isArray(d?.data) ? d.data : []);
			})
			.catch(() => {
				if (!cancelled) setItems([]);
			})
			.finally(() => {
				if (!cancelled) setLoading(false);
			});
		return () => {
			cancelled = true;
		};
	}, [period, scope]);

	return { items, loading };
}
