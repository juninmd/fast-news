import express, { Request, Response, Router } from "express";
import { query } from "../../database/client.js";
import { buildOpml, importFeeds, parseOpml } from "../../services/opml.js";
import { getSourceHealth } from "../../services/sourceHealth.js";
import { requireAdmin } from "../adminAuth.js";

export const sourcesRouter: Router = Router();

// GET /api/sources — every feed with its health; ?status=quarantined filters.
sourcesRouter.get("/", async (req: Request, res: Response) => {
	const status = req.query["status"] as string | undefined;
	const rows = await getSourceHealth();
	const data = status ? rows.filter((r) => r.status === status) : rows;
	const summary = rows.reduce<Record<string, number>>((acc, r) => {
		acc[r.status] = (acc[r.status] ?? 0) + 1;
		return acc;
	}, {});
	return res.json({ data, summary, total: rows.length });
});

// GET /api/sources/opml — subscription list any feed reader can import.
sourcesRouter.get("/opml", async (req: Request, res: Response) => {
	const onlyActive = req.query["all"] !== "true";
	const result = await query<{
		name: string;
		url: string;
		category: string | null;
	}>(
		`SELECT name, url, category FROM source_feeds
		 ${onlyActive ? "WHERE is_active = true" : ""}
		 ORDER BY category, name`,
	);
	const xml = buildOpml(
		result.rows.map((r) => ({
			title: r.name,
			url: r.url,
			...(r.category ? { category: r.category } : {}),
		})),
	);
	res
		.type("text/x-opml; charset=utf-8")
		.set("Content-Disposition", 'attachment; filename="fast-news.opml"')
		.send(xml);
});

// POST /api/sources/opml — import feeds from an OPML body (admin only).
sourcesRouter.post(
	"/opml",
	requireAdmin,
	express.text({
		type: ["text/xml", "application/xml", "text/x-opml", "text/plain"],
		limit: "1mb",
	}),
	async (req: Request, res: Response) => {
		if (typeof req.body !== "string" || !req.body.includes("<opml"))
			return res.status(400).json({ error: "Body must be an OPML document" });
		const feeds = parseOpml(req.body);
		if (!feeds.length)
			return res.status(400).json({ error: "No valid feeds found in OPML" });
		const result = await importFeeds(feeds);
		return res.json({ found: feeds.length, ...result });
	},
);

// PATCH /api/sources/:id — enable/disable, reset health, set the per-source prompt hint (admin only).
sourcesRouter.patch(
	"/:id",
	requireAdmin,
	async (req: Request, res: Response) => {
		const { isActive, promptHint, resetHealth } = req.body as {
			isActive?: boolean;
			promptHint?: string | null;
			resetHealth?: boolean;
		};
		const sets: string[] = [];
		const params: unknown[] = [req.params["id"]];
		if (typeof isActive === "boolean") {
			params.push(isActive);
			sets.push(`is_active = $${params.length}`);
		}
		if (promptHint !== undefined) {
			params.push(promptHint ? String(promptHint).slice(0, 500) : null);
			sets.push(`prompt_hint = $${params.length}`);
		}
		if (resetHealth)
			sets.push(
				"consecutive_failures = 0, quarantined_until = NULL, last_error = NULL",
			);
		if (!sets.length)
			return res.status(400).json({ error: "Nothing to update" });
		try {
			const r = await query(
				`UPDATE source_feeds SET ${sets.join(", ")} WHERE id = $1`,
				params,
			);
			if (!r.rowCount)
				return res.status(404).json({ error: "Source not found" });
			return res.json({ ok: true });
		} catch {
			return res.status(400).json({ error: "Invalid source id" });
		}
	},
);
