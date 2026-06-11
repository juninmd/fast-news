import { config } from "../config/env.js";

export interface TrendingVideo {
	id: string;
	title: string;
	channel: string;
	url: string;
	views: number;
	description: string;
	region: "BR" | "US";
	rank: number;
}

interface YouTubeVideoItem {
	id: string;
	snippet?: {
		title?: string;
		channelTitle?: string;
		description?: string;
	};
	statistics?: { viewCount?: string };
}

export async function fetchTrendingVideos(
	region: "BR" | "US",
): Promise<TrendingVideo[]> {
	if (!config.youtube.apiKey) return [];
	const params = new URLSearchParams({
		part: "snippet,statistics",
		chart: "mostPopular",
		regionCode: region,
		maxResults: String(config.youtube.trendingLimit),
		key: config.youtube.apiKey,
	});
	const resp = await fetch(
		`https://www.googleapis.com/youtube/v3/videos?${params}`,
		{ signal: AbortSignal.timeout(10_000) },
	);
	if (!resp.ok) throw new Error(`YouTube API HTTP ${resp.status}`);
	const data = (await resp.json()) as { items?: YouTubeVideoItem[] };
	return (data.items ?? [])
		.filter((item) => item.id && item.snippet?.title)
		.map((item, i) => ({
			id: item.id,
			title: item.snippet?.title ?? "",
			channel: item.snippet?.channelTitle ?? "",
			url: `https://www.youtube.com/watch?v=${item.id}`,
			views: parseInt(item.statistics?.viewCount ?? "0", 10),
			description: (item.snippet?.description ?? "").trim(),
			region,
			rank: i + 1,
		}));
}

/** Em alta BR + Mundo (US como proxy global), sem duplicar vídeo presente nos dois. */
export async function getTrendingVideos(): Promise<TrendingVideo[]> {
	if (!config.youtube.apiKey) return [];
	const [brasil, mundo] = await Promise.all([
		fetchTrendingVideos("BR").catch((err: Error) => {
			console.warn("[youtube] Trending BR failed:", err.message);
			return [] as TrendingVideo[];
		}),
		fetchTrendingVideos("US").catch((err: Error) => {
			console.warn("[youtube] Trending US failed:", err.message);
			return [] as TrendingVideo[];
		}),
	]);
	const seen = new Set(brasil.map((v) => v.id));
	return [...brasil, ...mundo.filter((v) => !seen.has(v.id))];
}
