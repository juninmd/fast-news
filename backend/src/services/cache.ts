import { createHash } from "node:crypto";
import { createClient, type RedisClientType } from "redis";
import { config } from "../config/env.js";

let client: RedisClientType | null = null;

/** A cache that answers slower than this is worse than no cache. */
const COMMAND_TIMEOUT_MS = 500;
const CONNECT_TIMEOUT_MS = 3000;
/** Keys removed per UNLINK when invalidating by pattern. */
const DELETE_BATCH = 500;

function newClient(): RedisClientType {
	const redis = createClient({
		url: config.redisUrl,
		// Without this, commands issued while Redis is down wait in memory for the
		// reconnect, and every request that touches the cache hangs with them.
		disableOfflineQueue: true,
		socket: {
			connectTimeout: CONNECT_TIMEOUT_MS,
			reconnectStrategy: (retries: number) => Math.min(retries * 200, 5000),
		},
	}) as RedisClientType;
	redis.on("error", (err) => console.error("[Redis] Error:", err.message));
	redis.on("reconnecting", () => console.log("[Redis] Reconnecting..."));
	redis.on("ready", () => console.log("[Redis] Connected."));
	return redis;
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
	let timer: NodeJS.Timeout | undefined;
	const timeout = new Promise<never>((_, reject) => {
		timer = setTimeout(
			() => reject(new Error(`Redis timeout after ${ms}ms`)),
			ms,
		);
	});
	return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

/**
 * Starts the connection without waiting for it. Returns the client only when it
 * is ready, so callers degrade to "no cache" instead of blocking on a dead Redis.
 */
function readyClient(): RedisClientType | null {
	if (!client) client = newClient();
	if (!client.isOpen) {
		client.connect().catch((err: Error) => {
			console.error("[Redis] Connect failed:", err.message);
		});
	}
	return client.isReady ? client : null;
}

/** Boots the connection at startup; a Redis that is down must not stop the app. */
export async function connectRedis(): Promise<void> {
	try {
		await getRedis();
	} catch (error) {
		console.warn(
			"[Redis] Unavailable at startup, running without cache:",
			(error as Error).message,
		);
	}
}

/** Connected client, or throws when Redis does not answer within a few seconds (health checks, queues). */
export async function getRedis(): Promise<RedisClientType> {
	if (!client) client = newClient();
	if (!client.isOpen) {
		const connecting = client.connect();
		// A failed attempt keeps retrying in the background; the caller just stops waiting.
		connecting.catch(() => undefined);
		await withTimeout(connecting, CONNECT_TIMEOUT_MS + 500);
	}
	if (!client.isReady) throw new Error("Redis is not ready");
	return client;
}

export async function cacheGet<T>(key: string): Promise<T | null> {
	const redis = readyClient();
	if (!redis) return null;
	try {
		const value = await withTimeout(redis.get(key), COMMAND_TIMEOUT_MS);
		if (!value) return null;
		return JSON.parse(value) as T;
	} catch (error) {
		console.error(`[Redis] Failed to read cache key "${key}":`, error);
		return null;
	}
}

export async function cacheSet(
	key: string,
	value: unknown,
	ttlSeconds = 3600,
): Promise<void> {
	const redis = readyClient();
	if (!redis) return;
	try {
		await withTimeout(
			redis.set(key, JSON.stringify(value), { EX: ttlSeconds }),
			COMMAND_TIMEOUT_MS,
		);
	} catch (error) {
		console.error(`[Redis] Failed to set cache key "${key}":`, error);
	}
}

export async function cacheDel(key: string): Promise<void> {
	const redis = readyClient();
	if (!redis) return;
	try {
		await withTimeout(redis.del(key), COMMAND_TIMEOUT_MS);
	} catch (error) {
		console.error(`[Redis] Failed to delete cache key "${key}":`, error);
	}
}

/** Keys matching a glob, found with SCAN (KEYS would block Redis for every other client). */
export async function cacheKeys(pattern: string): Promise<string[]> {
	const redis = readyClient();
	if (!redis) return [];
	try {
		const keys: string[] = [];
		for await (const key of redis.scanIterator({
			MATCH: pattern,
			COUNT: 200,
		})) {
			keys.push(...(Array.isArray(key) ? key : [key]));
		}
		return keys;
	} catch (error) {
		console.error(
			`[Redis] Failed to scan keys with pattern "${pattern}":`,
			error,
		);
		return [];
	}
}

/** Removes every key matching one of the globs; returns how many were deleted. */
export async function cacheDelPattern(...patterns: string[]): Promise<number> {
	const redis = readyClient();
	if (!redis) return 0;
	let removed = 0;
	for (const pattern of patterns) {
		const keys = await cacheKeys(pattern);
		for (let i = 0; i < keys.length; i += DELETE_BATCH) {
			try {
				removed += await redis.unlink(keys.slice(i, i + DELETE_BATCH));
			} catch (error) {
				console.error(`[Redis] Failed to delete "${pattern}":`, error);
			}
		}
	}
	return removed;
}

/** Stable short key for arbitrary parts: `prefix:` + first 32 hex of sha256. */
export function hashKey(prefix: string, ...parts: unknown[]): string {
	return `${prefix}:${createHash("sha256")
		.update(JSON.stringify(parts))
		.digest("hex")
		.slice(0, 32)}`;
}

const inflight = new Map<string, Promise<unknown>>();

/** ±10% so keys written together do not all expire (and refill) at the same instant. */
export function jitterTtl(ttlSeconds: number, random = Math.random): number {
	return Math.max(1, Math.round(ttlSeconds * (0.9 + random() * 0.2)));
}

/**
 * Read-through cache: a hit returns at once; a miss runs `loader` once even when
 * many requests ask for the same key at the same time, then stores the result.
 * `null`/`undefined` results are not cached.
 */
export async function cacheWrap<T>(
	key: string,
	ttlSeconds: number,
	loader: () => Promise<T>,
): Promise<T> {
	const cached = await cacheGet<T>(key);
	if (cached !== null) return cached;
	const pending = inflight.get(key) as Promise<T> | undefined;
	if (pending) return pending;
	const run = (async () => {
		const value = await loader();
		if (value !== null && value !== undefined)
			await cacheSet(key, value, jitterTtl(ttlSeconds));
		return value;
	})().finally(() => inflight.delete(key));
	inflight.set(key, run);
	return run;
}

/** Cached views that show article lists or counts; stale as soon as ingestion stores something. */
const ARTICLE_LIST_PATTERNS = [
	"news:list:*",
	"news:top",
	"news:trends:*",
	"feed:*",
	"stories:active:*",
	"graph:global:*",
	"story:graph:*",
];

/** Drops the cached article lists so new articles show up without waiting for the TTLs. */
export async function invalidateArticleCaches(): Promise<number> {
	const removed = await cacheDelPattern(...ARTICLE_LIST_PATTERNS);
	if (removed > 0)
		console.log(`[Redis] Invalidated ${removed} article cache keys`);
	return removed;
}

export async function closeRedis(): Promise<void> {
	if (client) {
		const closing = client;
		client = null;
		try {
			// quit() waits for the server's reply, which never comes while Redis is down.
			if (closing.isReady) await closing.quit();
			else if (closing.isOpen) await closing.disconnect();
		} catch {
			closing.disconnect().catch(() => undefined);
		}
		console.log("[Redis] Connection closed.");
	}
}

const DEFAULT_TTL = 300;

export const ragCache = {
	key: (query: string) => hashKey("rag", query),

	async get(query: string): Promise<unknown | null> {
		return cacheGet(this.key(query));
	},

	async set(value: unknown, query: string): Promise<void> {
		await cacheSet(this.key(query), value, DEFAULT_TTL);
	},
};
