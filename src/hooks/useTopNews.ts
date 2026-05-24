import { useEffect, useState } from "react";

export interface TopNewsArticle {
	id: string;
	title: string;
	summary: string;
	url: string;
	source: string;
	category: string;
	company: string | null;
	published_at: string;
	image_url: string | null;
	importance_score: number;
	fake_news_score: number | null;
	political_bias: string | null;
	is_militant: boolean;
}

export function useTopNews() {
	const [articles, setArticles] = useState<TopNewsArticle[]>([]);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		fetch("/api/news/top")
			.then((r) => r.json())
			.then((d) => setArticles(d.data ?? []))
			.catch(() => {})
			.finally(() => setLoading(false));
	}, []);

	return { articles, loading };
}
