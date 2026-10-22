import { z } from "zod";

export const searchNewsTool = {
	name: "search_news",
	description:
		"Search news articles using semantic vector search. Supports filtering by category, company, and date range.",
	inputSchema: {
		type: "object",
		properties: {
			query: { type: "string", description: "Search query text" },
			filters: {
				type: "object",
				properties: {
					category: { type: "string" },
					company: { type: "string" },
					dateFrom: { type: "string" },
					dateTo: { type: "string" },
					limit: { type: "number", default: 10 },
				},
			},
		},
		required: ["query"],
	},
};

export const getArticleTool = {
	name: "get_article",
	description: "Get a single article by ID with full content.",
	inputSchema: {
		type: "object",
		properties: {
			id: { type: "string", description: "Article UUID" },
		},
		required: ["id"],
	},
};

export const summarizeArticleTool = {
	name: "summarize_article",
	description: "Generate an AI-powered summary of an article.",
	inputSchema: {
		type: "object",
		properties: {
			id: { type: "string", description: "Article UUID" },
			maxLength: { type: "number", default: 200 },
		},
		required: ["id"],
	},
};

export const getTrendingTool = {
	name: "get_trending",
	description: "Get trending topics and articles by category.",
	inputSchema: {
		type: "object",
		properties: {
			category: {
				type: "string",
				description: "Filter by category (optional)",
			},
			limit: { type: "number", default: 10 },
		},
	},
};

export const getSourcesTool = {
	name: "get_sources",
	description:
		"List all available news sources with their categories and companies.",
	inputSchema: {
		type: "object",
		properties: {
			category: { type: "string" },
			company: { type: "string" },
		},
	},
};

export const getDigestTool = {
	name: "get_digest",
	description:
		"Get a ranked news digest for a period (4h, daily, weekly, monthly). Built from stored relevance scores and multi-outlet coverage, no LLM call. scope=ai keeps only AI news.",
	inputSchema: {
		type: "object",
		properties: {
			period: {
				type: "string",
				enum: ["4h", "daily", "weekly", "monthly"],
				default: "daily",
			},
			scope: { type: "string", enum: ["all", "ai"], default: "all" },
		},
	},
};

export const getSourceHealthTool = {
	name: "get_source_health",
	description:
		"Report feed health: healthy, degraded, quarantined (auto-paused after repeated failures) or disabled, with the last error.",
	inputSchema: {
		type: "object",
		properties: {
			status: {
				type: "string",
				enum: ["healthy", "degraded", "quarantined", "disabled", "unknown"],
				description: "Only list sources in this state (optional)",
			},
		},
	},
};

const API_URL = (
	process.env["FAST_NEWS_API_URL"] ?? "http://localhost:3001"
).replace(/\/+$/, "");

async function getJson(path: string): Promise<unknown> {
	const res = await fetch(`${API_URL}${path}`, {
		signal: AbortSignal.timeout(15_000),
	});
	if (!res.ok) throw new Error(`API ${path} answered HTTP ${res.status}`);
	return res.json();
}

export async function runGetDigest(args: {
	period?: string;
	scope?: string;
}): Promise<unknown> {
	const period = z
		.enum(["4h", "daily", "weekly", "monthly"])
		.default("daily")
		.parse(args.period);
	const scope = args.scope === "ai" ? "?scope=ai" : "";
	return getJson(`/api/digests/${period}${scope}`);
}

export async function runGetSourceHealth(args: {
	status?: string;
}): Promise<unknown> {
	const status = args.status
		? `?status=${encodeURIComponent(args.status)}`
		: "";
	return getJson(`/api/sources${status}`);
}
