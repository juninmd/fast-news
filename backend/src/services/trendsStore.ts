import { query } from "../database/client.js";
import { cacheGet, cacheSet } from "./cache.js";
import { computeTrends, type TrendReport } from "./trends.js";

export async function getTrends(windowHours = 24): Promise<TrendReport> {
	const hours = Math.min(72, Math.max(3, Math.round(windowHours)));
	const cacheKey = `news:trends:${hours}`;
	const cached = await cacheGet<TrendReport>(cacheKey);
	if (cached) return cached;

	const res = await query<{
		id: string;
		title: string;
		source: string;
		theme: string;
		published_at: string;
	}>(
		`SELECT id, title, source, COALESCE(theme_category, category) AS theme, published_at
		 FROM news_articles
		 WHERE published_at > NOW() - make_interval(hours => $1)
		   AND published_at <= NOW()
		   AND COALESCE(is_spam_or_promo, FALSE) = FALSE
		   AND category <> 'fact_check'`,
		[hours * 2],
	);
	const report = computeTrends(
		res.rows.map((r) => ({
			id: r.id,
			title: r.title,
			source: r.source,
			theme: r.theme,
			publishedAt: new Date(r.published_at),
		})),
		{ windowHours: hours },
	);
	await cacheSet(cacheKey, report, 600);
	return report;
}
