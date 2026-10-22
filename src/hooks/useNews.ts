import { useCallback, useEffect, useRef, useState } from "react";

interface NewsArticle {
	id: string;
	title: string;
	excerpt?: string;
	url: string;
	source: string;
	category: string;
	company?: string;
	publishedAt: Date;
	imageUrl?: string;
	/** Distinct outlets reporting the same story (1 = only this one). */
	sourceCount: number;
	/** Other outlets on the same story, newest first. */
	alsoIn: CoverageLink[];
}

export interface CoverageLink {
	id: string;
	source: string;
	title: string;
	url: string;
	publishedAt: string;
}

type ApiArticle = {
	id: string;
	title: string;
	summary?: string;
	excerpt?: string;
	content?: string;
	url: string;
	source: string;
	category: string;
	company?: string | null;
	published_at?: string;
	publishedAt?: string;
	image_url?: string | null;
	imageUrl?: string | null;
	source_count?: number;
	also_in?: CoverageLink[];
};

interface UseNewsOptions {
	category?: string;
	company?: string;
	limit?: number;
	minCredibility?: number;
	politicalBias?: string;
	excludeMilitant?: boolean;
	/** Fold the same story from several outlets into one entry. Default true. */
	group?: boolean;
}

interface UseNewsReturn {
	articles: NewsArticle[];
	loading: boolean;
	error: Error | null;
	refetch: () => Promise<void>;
	loadMore: () => Promise<void>;
	hasMore: boolean;
}

export function useNews(options: UseNewsOptions = {}): UseNewsReturn {
	const [articles, setArticles] = useState<NewsArticle[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<Error | null>(null);
	const [page, setPage] = useState(1);
	const [hasMore, setHasMore] = useState(true);
	// Newest request wins: a slow answer for an old filter must not overwrite
	// the list the reader is looking at.
	const requestId = useRef(0);
	const loadingMore = useRef(false);

	const fetchArticles = useCallback(
		async (pageNum: number, append = false) => {
			const mine = ++requestId.current;
			try {
				setLoading(!append);
				setError(null);

				const params = new URLSearchParams({
					page: pageNum.toString(),
					limit: (options.limit || 20).toString(),
				});
				if (options.category && options.category !== "Todas") {
					params.set("category", options.category);
				}
				if (options.company && options.company !== "Todas") {
					params.set("company", options.company);
				}
				if (options.minCredibility) {
					params.set("minCredibility", options.minCredibility.toString());
				}
				if (options.politicalBias && options.politicalBias !== "all") {
					params.set("politicalBias", options.politicalBias);
				}
				if (options.excludeMilitant) {
					params.set("excludeMilitant", "true");
				}
				if (options.group ?? true) {
					params.set("group", "true");
				}

				const response = await fetch(`/api/news?${params}`);
				if (!response.ok) throw new Error("Failed to fetch articles");

				const data = await response.json();
				if (mine !== requestId.current) return;
				const newArticles: NewsArticle[] = (
					data.articles ||
					data.data ||
					[]
				).map(toNewsArticle);

				// New articles shift the offsets, so a later page can repeat
				// entries already on screen.
				setArticles((prev) => {
					if (!append) return newArticles;
					const have = new Set(prev.map((a) => a.id));
					return [...prev, ...newArticles.filter((a) => !have.has(a.id))];
				});
				setHasMore(data.hasMore ?? newArticles.length > 0);
			} catch (err) {
				if (mine !== requestId.current) return;
				setError(err instanceof Error ? err : new Error("Unknown error"));
			} finally {
				if (mine === requestId.current) setLoading(false);
			}
		},
		[
			options.category,
			options.company,
			options.limit,
			options.minCredibility,
			options.politicalBias,
			options.excludeMilitant,
			options.group,
		],
	);

	useEffect(() => {
		setPage(1);
		fetchArticles(1, false);
	}, [fetchArticles]);

	const refetch = useCallback(async () => {
		setPage(1);
		await fetchArticles(1, false);
	}, [fetchArticles]);

	const loadMore = useCallback(async () => {
		if (!hasMore || loading || loadingMore.current) return;
		loadingMore.current = true;
		try {
			const nextPage = page + 1;
			setPage(nextPage);
			await fetchArticles(nextPage, true);
		} finally {
			loadingMore.current = false;
		}
	}, [page, hasMore, loading, fetchArticles]);

	return { articles, loading, error, refetch, loadMore, hasMore };
}

function toNewsArticle(article: ApiArticle): NewsArticle {
	return {
		id: article.id,
		title: article.title,
		excerpt:
			article.excerpt ?? article.summary ?? article.content?.slice(0, 220),
		url: article.url,
		source: article.source,
		category: article.category,
		company: article.company ?? undefined,
		publishedAt: new Date(
			article.published_at ?? article.publishedAt ?? Date.now(),
		),
		imageUrl: article.image_url ?? article.imageUrl ?? undefined,
		sourceCount: article.source_count ?? 1,
		alsoIn: article.also_in ?? [],
	};
}
