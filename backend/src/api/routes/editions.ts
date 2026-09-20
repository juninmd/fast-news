import { Request, Response, Router } from "express";
import { query } from "../../database/client.js";

export const editionsRouter: Router = Router();

interface EditionRow {
	edition_key: string;
	kind: string;
	window_start: string;
	sent_at: string | null;
	payload: { links?: Record<string, string> } | null;
}

// GET /api/editions — recent O Fio editions with their Telegram message links.
editionsRouter.get("/", async (_req: Request, res: Response) => {
	const result = await query<EditionRow>(
		`SELECT edition_key, kind, window_start, sent_at, payload
		 FROM news_editions
		 WHERE sent_at IS NOT NULL
		 ORDER BY sent_at DESC
		 LIMIT 20`,
	);
	const data = result.rows.map((r) => ({
		editionKey: r.edition_key,
		kind: r.kind,
		windowStart: r.window_start,
		sentAt: r.sent_at,
		links: Object.values(r.payload?.links ?? {}),
	}));
	return res.json({ data });
});
