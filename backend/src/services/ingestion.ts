import { createHash } from "node:crypto";
import Parser from "rss-parser";
import { config } from "../config/env.js";
import { query } from "../database/client.js";
import { upsertVector } from "../database/vectorStore.js";
import { buildArticleRelations } from "./correlation.js";
import { embedDocument, vectorToSQL } from "./embeddings.js";
import { getActiveFeeds } from "./sources.js";

const parser = new Parser({
	customFields: { item: [["media:content", "mediaContent"], "enclosure"] },
});

/** Bounds concurrent work per key (host, or a fixed budget for LLM calls) to avoid rate limits. */
class KeyedSemaphore {
	private active = new Map<string, number>();
	private queues = new Map<string, Array<() => void>>();
	constructor(private limit: number) {}

	async run<T>(key: string, fn: () => Promise<T>): Promise<T> {
		await this.acquire(key);
		try {
			return await fn();
		} finally {
			this.release(key);
		}
	}

	private acquire(key: string): Promise<void> {
		const active = this.active.get(key) ?? 0;
		if (active < this.limit) {
			this.active.set(key, active + 1);
			return Promise.resolve();
		}
		return new Promise((resolve) => {
			const q = this.queues.get(key) ?? [];
			q.push(resolve);
			this.queues.set(key, q);
		});
	}

	private release(key: string): void {
		const q = this.queues.get(key);
		if (q && q.length > 0) {
			q.shift()?.();
			return;
		}
		this.active.set(key, Math.max(0, (this.active.get(key) ?? 1) - 1));
	}
}

// Max 1 concurrent request per news portal host — avoids hammering a single portal's rate limit.
const hostGate = new KeyedSemaphore(1);

/** Fetch feed XML with proper charset decoding (handles ISO-8859-1 / Windows-1252 Brazilian feeds) */
async function fetchXml(url: string): Promise<string> {
	const ac = new AbortController();
	const t = setTimeout(() => ac.abort(), config.ingestion.feedFetchTimeoutMs);
	try {
		const resp = await fetch(url, {
			signal: ac.signal,
			headers: { "User-Agent": "FastNews/1.0" },
		});
		if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
		const buf = await resp.arrayBuffer();
		const contentType = resp.headers.get("content-type") ?? "";
		const headerCharset = contentType.match(/charset=([^\s;'"]+)/i)?.[1];
		// XML prolog encoding wins over a generic/absent HTTP charset — BR feeds
		// often serve ISO-8859-1 bodies while declaring utf-8 (or nothing) in HTTP.
		const prolog = new TextDecoder("ascii").decode(buf.slice(0, 200));
		const prologCharset = prolog.match(/encoding=["']([^"']+)["']/i)?.[1];
		let charset = (prologCharset ?? headerCharset ?? "utf-8").toLowerCase();
		// Normalize: TextDecoder accepts 'windows-1252' as alias for latin-1 variants
		if (["iso-8859-1", "latin1", "latin-1", "cp1252"].includes(charset))
			charset = "windows-1252";
		let decoded: string;
		try {
			decoded = new TextDecoder(charset, { fatal: false }).decode(buf);
		} catch {
			decoded = new TextDecoder("utf-8").decode(buf);
		}
		// Safety net: U+FFFD means the charset guess was wrong (e.g. utf-8 header on a
		// latin-1 body with no prolog). windows-1252 maps every byte, so it never
		// yields U+FFFD — retry there before persisting irrecoverable mojibake.
		if (charset !== "windows-1252" && decoded.includes("�")) {
			decoded = new TextDecoder("windows-1252").decode(buf);
		}
		return decoded;
	} finally {
		clearTimeout(t);
	}
}

const IMAGE_EXT_RE = /\.(jpe?g|png|webp|gif)(\?.*)?$/i;

function timeoutSignal(ms: number): AbortSignal {
	return AbortSignal.timeout(ms);
}

function runBackground(label: string, task: () => Promise<unknown>): void {
	task().catch((err: Error) => {
		console.error(`[ingestion] ${label} failed:`, err.message);
	});
}

function extractImageUrl(item: Record<string, unknown>): string | undefined {
	const candidates = [
		(item["mediaContent"] as Record<string, unknown> | undefined)?.["$"] &&
			(item["mediaContent"] as Record<string, Record<string, string>>)["$"][
				"url"
			],
		(item["mediaContent"] as Record<string, string> | undefined)?.["url"],
		(item["enclosure"] as Record<string, string> | undefined)?.["url"],
	];
	for (const url of candidates) {
		if (typeof url === "string" && IMAGE_EXT_RE.test(url)) return url;
	}
	return undefined;
}

async function withRetry<T>(
	fn: () => Promise<T>,
	retries = 3,
	delayMs = 1000,
): Promise<T> {
	let lastErr: unknown;
	for (let attempt = 1; attempt <= retries; attempt++) {
		try {
			return await fn();
		} catch (err) {
			lastErr = err;
			if (attempt < retries)
				await new Promise((r) => setTimeout(r, delayMs * attempt));
		}
	}
	throw lastErr;
}

export interface RawArticle {
	guid: string;
	title: string;
	content: string;
	url: string;
	source: string;
	category: string;
	company?: string;
	publishedAt: Date | null;
	imageUrl?: string;
}

async function fetchFeed(source: {
	url: string;
	category: string;
	company?: string;
}): Promise<RawArticle[]> {
	try {
		const host = new URL(source.url).hostname;
		const xml = await hostGate.run(host, () =>
			withRetry(() => fetchXml(source.url)),
		);
		const feed = await parser.parseString(xml);
		return (feed.items ?? [])
			.slice(0, config.ingestion.maxArticlesPerFeed)
			.map((item) => {
				// Robust date parsing
				const dateStr = item.isoDate ?? item.pubDate;
				const publishedAt = dateStr ? new Date(dateStr) : null;

				const stableGuid =
					item.guid ??
					item.link ??
					(item.title
						? createHash("sha1")
								.update(`${item.title}|${source.url}|${dateStr ?? ""}`)
								.digest("hex")
						: undefined);

				return {
					guid:
						stableGuid ?? createHash("sha1").update(source.url).digest("hex"),
					title: item.title ?? "Sem título",
					content: item.contentSnippet ?? item.summary ?? item.content ?? "",
					url: item.link ?? "",
					source: feed.title?.trim() || source.company || source.url,
					category: source.category,
					company: source.company,
					publishedAt:
						publishedAt && !isNaN(publishedAt.getTime()) ? publishedAt : null,
					imageUrl: extractImageUrl(item as unknown as Record<string, unknown>),
				};
			});
	} catch (err) {
		console.warn(
			"[ingestion] feed failed:",
			source.url,
			(err as Error).message,
		);
		return [];
	}
}

async function upsertArticle(
	article: RawArticle,
	ollamaUp: boolean,
): Promise<string | null> {
	if (!article.guid || !article.title || !article.url) return null;

	const existing = await query<{ id: string }>(
		"SELECT id FROM news_articles WHERE guid = $1 OR url = $2",
		[article.guid, article.url],
	);
	if (existing.rowCount && existing.rowCount > 0) return null;

	const textToEmbed = `${article.title}. ${article.content}`.slice(
		0,
		config.ingestion.embedTruncateChars,
	);
	// Embedding is best-effort — if Ollama is unavailable, store without vector
	let embedding: number[] | null = null;
	if (ollamaUp) {
		try {
			embedding = await embedDocument(
				textToEmbed,
				timeoutSignal(config.ai.embeddingTimeoutMs),
			);
		} catch (e) {
			console.warn(
				"[ingestion] embed failed, storing without vector:",
				(e as Error).message.slice(0, 80),
			);
		}
	}

	// Skip if similar article already stored (embedding-based dedup)
	if (embedding) {
		const similar = await query<{ id: string; title: string }>(
			`SELECT id, title FROM news_articles
			 WHERE embedding IS NOT NULL
			   AND 1 - (embedding <=> $1::vector) >= $2
			 LIMIT 1`,
			[vectorToSQL(embedding), config.telegram.similarThreshold],
		);
		if (similar.rows.length > 0) {
			console.log(
				`[ingestion] Skipping "${article.title}" — similar to "${similar.rows[0].title}" (threshold: ${config.telegram.similarThreshold})`,
			);
			return null;
		}
	}

	const result = await query<{ id: string }>(
		`INSERT INTO news_articles (guid, title, content, url, source, category, company, published_at, embedding, image_url)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     ON CONFLICT (guid) DO NOTHING
     RETURNING id`,
		[
			article.guid,
			article.title,
			article.content,
			article.url,
			article.source,
			article.category,
			article.company ?? null,
			article.publishedAt,
			embedding ? vectorToSQL(embedding) : null,
			article.imageUrl ?? null,
		],
	);

	const newId = result.rows[0]?.id ?? null;
	if (newId && embedding) {
		try {
			await upsertVector(newId, embedding, {
				id: newId,
				title: article.title,
				content: article.content,
				url: article.url,
				source: article.source,
				category: article.category,
				publishedAt: article.publishedAt,
				imageUrl: article.imageUrl,
			});
		} catch (e) {
			console.warn("[vectorStore] upsert failed:", (e as Error).message);
		}
	}

	return newId;
}

export interface IngestionResult {
	fetched: number;
	stored: number;
	newArticles: Array<{
		id: string;
		title: string;
		url: string;
		source: string;
		category: string;
		company?: string;
		content: string;
		imageUrl?: string;
		publishedAt?: Date | null;
	}>;
}

async function isOllamaAvailable(): Promise<boolean> {
	const base = config.ollama.baseUrl;
	const embeddingBase = config.ollama.embeddingBaseUrl;
	if (
		embeddingBase.includes("/v1") ||
		(base.includes("/v1") && !embeddingBase)
	) {
		console.warn(
			"[ingestion] Native OLLAMA_EMBEDDING_BASE_URL is not configured; embeddings will be skipped",
		);
		return false;
	}
	// LiteLLM / OpenAI-compatible proxy exposes /v1/models; native Ollama exposes /api/tags
	const probeUrl = base.includes("/v1")
		? `${base.replace(/\/v1\/?$/, "")}/v1/models`
		: `${base.replace(/\/v1\/?$/, "")}/api/tags`;
	try {
		const ac = new AbortController();
		const t = setTimeout(
			() => ac.abort(),
			config.ingestion.ollamaProbeTimeoutMs,
		);
		const apiKey =
			process.env["OLLAMA_API_KEY"] || process.env["OPENAI_API_KEY"] || "";
		const res = await fetch(probeUrl, {
			signal: ac.signal,
			headers: apiKey ? { Authorization: `Bearer ${apiKey}` } : {},
		});
		clearTimeout(t);
		return res.ok;
	} catch {
		return false;
	}
}

export async function runIngestion(): Promise<IngestionResult> {
	console.log("[ingestion] Starting news ingestion...");
	const feeds = await getActiveFeeds();
	const ollamaUp = await isOllamaAvailable();
	if (!ollamaUp)
		console.warn("[ingestion] Ollama unavailable — embeddings will be skipped");
	let fetched = 0;
	const newArticles: IngestionResult["newArticles"] = [];

	for (let i = 0; i < feeds.length; i += config.ingestion.batchSize) {
		const batch = feeds.slice(i, i + config.ingestion.batchSize);
		const results = await Promise.allSettled(batch.map(fetchFeed));

		for (const result of results) {
			if (result.status !== "fulfilled") continue;
			fetched += result.value.length;
			for (const article of result.value) {
				try {
					const id = await upsertArticle(article, ollamaUp);
					if (id) {
						const newArticle = {
							id,
							title: article.title,
							url: article.url,
							source: article.source,
							category: article.category,
							company: article.company,
							content: article.content,
							imageUrl: article.imageUrl,
							publishedAt: article.publishedAt,
						};
						newArticles.push(newArticle);
						runBackground("buildArticleRelations", () =>
							buildArticleRelations(id),
						);
					}
				} catch (err) {
					console.error("[ingestion] article failed:", (err as Error).message, {
						url: article.url,
					});
				}
			}
		}
	}

	console.log(
		`[ingestion] Done. Fetched: ${fetched}, Stored: ${newArticles.length}`,
	);
	return { fetched, stored: newArticles.length, newArticles };
}
