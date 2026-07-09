import { Request, Response } from "express";
import { config } from "../config/env.js";
import { query } from "../database/client.js";
import { getRedis } from "../services/cache.js";
import { getOllamaQueueCounts } from "../services/ollamaQueue.js";
import { getTelegramQueueCounts } from "../services/telegramQueue.js";

interface HealthStatus {
	status: "healthy" | "degraded" | "unhealthy";
	timestamp: string;
	uptime: number;
	version: string;
	dependencies: {
		database: DependencyStatus;
		redis: DependencyStatus;
		ollama: DependencyStatus;
	};
	pipeline: PipelineStatus;
}

interface PipelineStatus {
	ingestedLast24h: number;
	pendingCredibility: number;
	pendingTelegram: number;
	sentLast24h: number;
	queues: {
		credibility: {
			waiting: number;
			active: number;
			delayed: number;
			failed: number;
		};
		telegram: {
			waiting: number;
			active: number;
			delayed: number;
			failed: number;
		};
	};
}

interface DependencyStatus {
	status: "up" | "down" | "degraded";
	latencyMs?: number;
	error?: string;
}

const VERSION = process.env.npm_package_version || "1.0.0";
const startTime = Date.now();

async function checkDatabase(): Promise<DependencyStatus> {
	const start = Date.now();
	try {
		const result = await query("SELECT 1 as health");
		if (result.rowCount && result.rowCount > 0) {
			return { status: "up", latencyMs: Date.now() - start };
		}
		return {
			status: "degraded",
			error: "Query returned no rows",
			latencyMs: Date.now() - start,
		};
	} catch (error) {
		return {
			status: "down",
			error: error instanceof Error ? error.message : "Unknown database error",
			latencyMs: Date.now() - start,
		};
	}
}

async function checkRedis(): Promise<DependencyStatus> {
	const start = Date.now();
	try {
		const redis = await getRedis();
		await redis.ping();
		return { status: "up", latencyMs: Date.now() - start };
	} catch (error) {
		return {
			status: "down",
			error: error instanceof Error ? error.message : "Unknown Redis error",
			latencyMs: Date.now() - start,
		};
	}
}

async function checkOllama(): Promise<DependencyStatus> {
	const start = Date.now();
	try {
		const base = config.ollama.baseUrl;
		const isOpenAiCompat = base.includes("/v1");
		const url = isOpenAiCompat
			? `${base.replace(/\/v1\/?$/, "")}/v1/models`
			: `${base.replace(/\/v1\/?$/, "")}/api/tags`;
		const apiKey =
			process.env["OLLAMA_API_KEY"] || process.env["OPENAI_API_KEY"] || "";
		const res = await fetch(url, {
			headers: apiKey ? { Authorization: `Bearer ${apiKey}` } : {},
			signal: AbortSignal.timeout(3000),
		});
		if (res.ok) return { status: "up", latencyMs: Date.now() - start };
		return {
			status: "degraded",
			latencyMs: Date.now() - start,
			error: `HTTP ${res.status}`,
		};
	} catch (error) {
		return {
			status: "down",
			latencyMs: Date.now() - start,
			error: (error as Error).message,
		};
	}
}

async function getPipelineStatus(): Promise<PipelineStatus> {
	const [counts, credibilityQueue, telegramQueue] = await Promise.all([
		query<{
			ingestedLast24h: string;
			pendingCredibility: string;
			pendingTelegram: string;
			sentLast24h: string;
		}>(
			`SELECT
				COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '24 hours') AS "ingestedLast24h",
				COUNT(*) FILTER (WHERE fake_news_score IS NULL AND telegram_sent_at IS NULL AND telegram_skipped_at IS NULL) AS "pendingCredibility",
				COUNT(*) FILTER (WHERE fake_news_score IS NOT NULL AND telegram_sent_at IS NULL AND telegram_skipped_at IS NULL) AS "pendingTelegram",
				COUNT(*) FILTER (WHERE telegram_sent_at > NOW() - INTERVAL '24 hours') AS "sentLast24h"
			FROM news_articles`,
		).catch(() => ({
			rows: [
				{
					ingestedLast24h: "0",
					pendingCredibility: "0",
					pendingTelegram: "0",
					sentLast24h: "0",
				},
			],
		})),
		getOllamaQueueCounts().catch(() => ({
			waiting: 0,
			active: 0,
			delayed: 0,
			failed: 0,
		})),
		getTelegramQueueCounts().catch(() => ({
			waiting: 0,
			active: 0,
			delayed: 0,
			failed: 0,
		})),
	]);

	const row = counts.rows[0];
	return {
		ingestedLast24h: parseInt(row.ingestedLast24h, 10),
		pendingCredibility: parseInt(row.pendingCredibility, 10),
		pendingTelegram: parseInt(row.pendingTelegram, 10),
		sentLast24h: parseInt(row.sentLast24h, 10),
		queues: {
			credibility: credibilityQueue,
			telegram: telegramQueue,
		},
	};
}

export async function getHealthStatus(): Promise<HealthStatus> {
	const [dbStatus, redisStatus, ollamaStatus, pipeline] = await Promise.all([
		checkDatabase(),
		checkRedis(),
		checkOllama(),
		getPipelineStatus(),
	]);

	const criticalDown =
		dbStatus.status === "down" && redisStatus.status === "down";
	const anyDegraded = dbStatus.status !== "up" || redisStatus.status !== "up";

	let overallStatus: HealthStatus["status"] = "healthy";
	if (criticalDown) overallStatus = "unhealthy";
	else if (anyDegraded) overallStatus = "degraded";

	return {
		status: overallStatus,
		timestamp: new Date().toISOString(),
		uptime: Date.now() - startTime,
		version: VERSION,
		dependencies: {
			database: dbStatus,
			redis: redisStatus,
			ollama: ollamaStatus,
		},
		pipeline,
	};
}

export async function healthHandler(
	_req: Request,
	res: Response,
): Promise<void> {
	try {
		const health = await getHealthStatus();
		const statusCode =
			health.status === "healthy"
				? 200
				: health.status === "degraded"
					? 200
					: 503;
		res.status(statusCode).json(health);
	} catch (error) {
		console.error("[Health] Check failed:", error);
		res.status(503).json({
			status: "unhealthy",
			timestamp: new Date().toISOString(),
			uptime: Date.now() - startTime,
			version: VERSION,
			error: error instanceof Error ? error.message : "Health check failed",
		});
	}
}
