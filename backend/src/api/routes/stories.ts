import { Request, Response, Router } from "express";
import {
	getGlobalGraph,
	getStoryGraph,
	getStoryTimeline,
	listActiveStories,
} from "../../services/correlation.js";

export const storiesRouter: Router = Router();

// GET /api/stories — list active stories
storiesRouter.get("/", async (req: Request, res: Response) => {
	const limit = Math.min(
		parseInt((req.query["limit"] as string) ?? "20", 10),
		50,
	);
	const category = Array.isArray(req.query["category"])
		? (req.query["category"] as string[])[0]
		: (req.query["category"] as string | undefined);
	try {
		const stories = await listActiveStories(limit, category);
		return res.json({ data: stories, total: stories.length });
	} catch (err) {
		console.error("[stories]", err);
		return res.status(500).json({ error: "Failed to fetch stories" });
	}
});

// GET /api/stories/graph — global article correlation graph
storiesRouter.get("/graph", async (req: Request, res: Response) => {
	const category = Array.isArray(req.query["category"])
		? (req.query["category"] as string[])[0]
		: (req.query["category"] as string | undefined);
	try {
		const graph = await getGlobalGraph(category as string | undefined);
		return res.json(graph);
	} catch (err) {
		console.error("[stories/graph]", err);
		return res.status(500).json({ error: "Failed to build graph" });
	}
});

// GET /api/stories/:id — story detail with graph and timeline
storiesRouter.get("/:id", async (req: Request, res: Response) => {
	const id = req.params["id"] as string;
	try {
		const graph = await getStoryGraph(id);
		if (!graph) return res.status(404).json({ error: "Story not found" });
		return res.json(graph);
	} catch (err) {
		console.error("[stories/:id]", err);
		return res.status(500).json({ error: "Failed to fetch story" });
	}
});

// GET /api/stories/:id/timeline
storiesRouter.get("/:id/timeline", async (req: Request, res: Response) => {
	const id = req.params["id"] as string;
	try {
		const timeline = await getStoryTimeline(id);
		return res.json({ data: timeline });
	} catch (err) {
		console.error("[stories/:id/timeline]", err);
		return res.status(500).json({ error: "Failed to fetch timeline" });
	}
});
