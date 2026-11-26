import { safeFetch } from "./safeFetch.js";

/** Community signal of a post: votes and comments where the feed or site exposes them. */
export interface Engagement {
	score: number;
	comments: number;
}

const HN_HOST = /(^|\.)news\.ycombinator\.com$/i;

function hostOf(raw: string | undefined): string {
	try {
		return raw ? new URL(raw).hostname : "";
	} catch {
		return "";
	}
}

function toCount(raw: string | undefined): number {
	const n = Number.parseInt(raw ?? "", 10);
	return Number.isFinite(n) && n >= 0 ? n : 0;
}

/**
 * hnrss.org puts "Points: 123" and "# Comments: 45" in each item's description.
 * Returns null for anything that is not a Hacker News item or carries no counts.
 */
export function hnEngagement(
	description: string,
	url: string,
	commentsUrl?: string,
): Engagement | null {
	if (!HN_HOST.test(hostOf(commentsUrl)) && !HN_HOST.test(hostOf(url)))
		return null;
	const text = description.replace(/<[^>]+>/g, " ");
	const points = text.match(/\bPoints:\s*(\d+)/i)?.[1];
	const comments = text.match(/#\s*Comments:\s*(\d+)/i)?.[1];
	if (points === undefined && comments === undefined) return null;
	return { score: toCount(points), comments: toCount(comments) };
}

/** Base-36 id of a Reddit post from its permalink ("/comments/abc123/..."), or null. */
export function redditPostId(url: string): string | null {
	if (!/(^|\.)reddit\.com$/i.test(hostOf(url))) return null;
	return url.match(/\/comments\/([a-z0-9]+)/i)?.[1]?.toLowerCase() ?? null;
}

/** Reddit's /by_id endpoint takes at most 100 fullnames per request. */
const REDDIT_BATCH = 100;

interface RedditListing {
	data?: {
		children?: {
			data?: { id?: string; score?: number; num_comments?: number };
		}[];
	};
}

/**
 * Votes and comment counts for Reddit posts, 100 per request through the
 * public JSON listing (Reddit's RSS has neither). Best effort: a blocked or
 * failed request just leaves those posts without engagement.
 */
export async function fetchRedditEngagement(
	ids: string[],
	fetcher: typeof safeFetch = safeFetch,
): Promise<Map<string, Engagement>> {
	const out = new Map<string, Engagement>();
	const unique = [...new Set(ids)];
	for (let i = 0; i < unique.length; i += REDDIT_BATCH) {
		const chunk = unique.slice(i, i + REDDIT_BATCH);
		const names = chunk.map((id) => `t3_${id}`).join(",");
		try {
			const res = await fetcher(
				`https://www.reddit.com/by_id/${names}.json?raw_json=1`,
				{
					headers: { "User-Agent": "fast-news/1.0 (news aggregator)" },
					signal: AbortSignal.timeout(10_000),
				},
			);
			if (!res.ok) {
				console.warn(`[engagement] reddit by_id returned ${res.status}`);
				continue;
			}
			const body = (await res.json()) as RedditListing;
			for (const child of body.data?.children ?? []) {
				const d = child.data;
				if (!d?.id) continue;
				out.set(d.id.toLowerCase(), {
					score: Math.max(0, d.score ?? 0),
					comments: Math.max(0, d.num_comments ?? 0),
				});
			}
		} catch (err) {
			console.warn("[engagement] reddit by_id failed:", (err as Error).message);
		}
	}
	return out;
}

/**
 * One comparable number from votes and comments, on a log scale so a viral
 * post does not dwarf everything else. 0 when there is no signal.
 */
export function engagementWeight(
	e: Partial<Engagement> | null | undefined,
): number {
	if (!e) return 0;
	return Math.log1p(e.score ?? 0) + 0.5 * Math.log1p(e.comments ?? 0);
}
