import { query } from "../database/client.js";
import type { EditionWindow, Headline } from "./types.js";

// Hard cap keeps a runaway feed from blowing the job's memory; a normal
// 12h window holds ~1-2k rows.
const MAX_ROWS = 5000;

interface Row {
	title: string;
	source: string | null;
	category: string | null;
	url: string;
	snippet: string | null;
	created_at: Date;
}

export async function collectHeadlines(
	window: EditionWindow,
): Promise<Headline[]> {
	const res = await query<Row>(
		`SELECT title, source, category, url, created_at,
		        left(regexp_replace(coalesce(nullif(summary, ''), content, ''), '\\s+', ' ', 'g'), 220) AS snippet
		   FROM news_articles
		  WHERE created_at >= $1 AND created_at < $2
		    AND coalesce(title, '') <> ''
		  ORDER BY created_at
		  LIMIT $3`,
		[window.start, window.end, MAX_ROWS],
	);
	return res.rows.map((r, i) => ({
		id: i + 1,
		title: r.title.replace(/\s+/g, " ").trim(),
		source: (r.source ?? "Fonte desconhecida").trim(),
		category: r.category ?? "",
		url: r.url.trim(),
		snippet: (r.snippet ?? "").trim(),
		createdAt: new Date(r.created_at),
	}));
}
