import { useCallback, useEffect, useRef, useState } from "react";

const API_BASE = import.meta.env.VITE_API_URL ?? "";

export interface StoryNode {
	id: string;
	title: string;
	summary: string | null;
	category: string;
	status: string;
	impactLevel: "low" | "medium" | "high" | "critical";
	worldImpact: string | null;
	financialSignal: "bullish" | "bearish" | "neutral" | null;
	affectedAssets: string[];
	firstSeenAt: string;
	lastUpdatedAt: string;
	articleCount: number;
}

export interface ArticleNode {
	id: string;
	title: string;
	source: string;
	category: string;
	publishedAt: string | null;
	url: string;
	sentiment: number;
}

export interface GraphEdge {
	source: string;
	target: string;
	similarity: number;
	relationType: string;
}

export interface TimelineEvent {
	id: string;
	eventType: string;
	headline: string;
	whatChanged: string | null;
	occurredAt: string;
	articleId: string | null;
}

export interface StoryDetail {
	story: StoryNode;
	articles: ArticleNode[];
	edges: GraphEdge[];
	timeline: TimelineEvent[];
}

export interface GlobalGraph {
	nodes: ArticleNode[];
	edges: GraphEdge[];
	stories: StoryNode[];
}

export function useStories(category?: string) {
	const [stories, setStories] = useState<StoryNode[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<Error | null>(null);
	// Switching categories fast must not let a slower, older response win.
	const latest = useRef(0);

	const fetch = useCallback(async () => {
		const request = ++latest.current;
		try {
			setLoading(true);
			const params = new URLSearchParams({ limit: "30" });
			if (category && category !== "Todas") params.set("category", category);
			const res = await window.fetch(`${API_BASE}/api/stories?${params}`);
			const data = await res.json();
			if (request === latest.current) setStories(data.data ?? []);
		} catch (e) {
			if (request === latest.current) setError(e as Error);
		} finally {
			if (request === latest.current) setLoading(false);
		}
	}, [category]);

	useEffect(() => {
		fetch();
	}, [fetch]);

	return { stories, loading, error, refetch: fetch };
}

export function useStoryDetail(storyId: string | null) {
	const [detail, setDetail] = useState<StoryDetail | null>(null);
	const [loading, setLoading] = useState(false);

	useEffect(() => {
		if (!storyId) return;
		let active = true;
		setLoading(true);
		window
			.fetch(`${API_BASE}/api/stories/${storyId}`)
			.then((r) => r.json())
			.then((d) => {
				if (active) setDetail(d);
			})
			.catch(console.error)
			.finally(() => {
				if (active) setLoading(false);
			});
		return () => {
			active = false;
		};
	}, [storyId]);

	return { detail, loading };
}

export function useGlobalGraph(category?: string) {
	const [graph, setGraph] = useState<GlobalGraph | null>(null);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		const params = new URLSearchParams();
		if (category && category !== "Todas") params.set("category", category);
		let active = true;
		window
			.fetch(`${API_BASE}/api/stories/graph?${params}`)
			.then((r) => r.json())
			.then((g) => {
				if (active) setGraph(g);
			})
			.catch(console.error)
			.finally(() => {
				if (active) setLoading(false);
			});
		return () => {
			active = false;
		};
	}, [category]);

	return { graph, loading };
}
