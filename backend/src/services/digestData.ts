import { query } from "../database/client.js";
import { isAiRelated } from "./aiScope.js";
import { cacheGet, cacheSet } from "./cache.js";
import {
	DIGEST_PERIODS,
	type DigestCandidate,
	type DigestItem,
	type DigestPeriod,
	selectDigestItems,
} from "./digestBuilder.js";

interface Row {
	id: string;
	title: string;
	url: string;
	source: string;
	category: string | null;
	theme_category: string | null;
	summary: string | null;
	content: string | null;
	published_at: string | null;
	relevance_score: number | null;
	story_id: string | null;
	source_count: number | null;
}

/** Candidate pool for a period: stored scores only, zero model calls. */
export async function loadCandidates(
	period: DigestPeriod,
): Promise<DigestCandidate[]> {
	const { hours, minScore } = DIGEST_PERIODS[period];
	const res = await query<Row>(
		`SELECT na.id, na.title, na.url, na.source, na.category, na.theme_category,
		        na.summary, LEFT(na.content, 300) AS content, na.published_at,
		        na.relevance_score, st.story_id, st.source_count
		 FROM news_articles na
		 LEFT JOIN LATERAL (
		   SELECT sa.story_id, COUNT(DISTINCT nb.source)::int AS source_count
		   FROM story_articles sa0
		   JOIN story_articles sa ON sa.story_id = sa0.story_id
		   JOIN news_articles nb ON nb.id = sa.article_id
		   WHERE sa0.article_id = na.id
		   GROUP BY sa.story_id
		   ORDER BY COUNT(*) DESC
		   LIMIT 1
		 ) st ON TRUE
		 WHERE na.published_at > NOW() - ($1 || ' hours')::interval
		   AND na.published_at <= NOW()
		   AND COALESCE(na.is_spam_or_promo, FALSE) = FALSE
		   AND COALESCE(na.relevance_score, 5) >= $2
		 ORDER BY COALESCE(na.relevance_score, 5) DESC, na.published_at DESC
		 LIMIT 400`,
		[String(hours), minScore],
	);
	return res.rows.map((r) => ({
		id: r.id,
		title: r.title,
		url: r.url,
		source: r.source,
		category: r.category,
		themeCategory: r.theme_category,
		summary:
			r.summary?.trim() || r.content?.replace(/\s+/g, " ").trim() || null,
		publishedAt: r.published_at,
		relevanceScore: r.relevance_score,
		sourceCount: r.source_count ?? 1,
		storyId: r.story_id,
	}));
}

const TTL: Record<DigestPeriod, number> = {
	"4h": 600,
	daily: 1800,
	weekly: 3600,
	monthly: 6 * 3600,
};

export async function getDigest(
	period: DigestPeriod,
	opts: { ai?: boolean } = {},
): Promise<DigestItem[]> {
	const key = `digest:${period}:${opts.ai ? "ai" : "all"}`;
	const cached = await cacheGet<DigestItem[]>(key).catch(() => null);
	if (cached) return cached;
	let candidates = await loadCandidates(period);
	if (opts.ai) {
		candidates = candidates.filter((c) =>
			isAiRelated(c.title, c.summary ?? "", c.category ?? ""),
		);
	}
	const items = selectDigestItems(candidates, period);
	await cacheSet(key, items, TTL[period]).catch(() => undefined);
	return items;
}
