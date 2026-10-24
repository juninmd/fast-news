import { generateText } from "ai";
import { config } from "../config/env.js";
import { query } from "../database/client.js";
import { upsertVector } from "../database/vectorStore.js";
import { getFastModel } from "./aiProvider.js";
import { isAiRelated } from "./aiScope.js";
import {
	type ArticleMedia,
	fetchPageMedia,
	type PageMedia,
} from "./articleMedia.js";
import { assignArticleToStory, buildArticleRelations } from "./correlation.js";
import { embedBatch, vectorToSQL } from "./embeddings.js";
import { normalizeFeedItems, type RawArticle } from "./feedItem.js";
import { fetchFeedXml, parseFeed } from "./feedParser.js";
import { scoreRelevance } from "./relevance.js";
import { recordFeedResult, sanitizeError } from "./sourceHealth.js";
import {
	getActiveFeeds,
	isLlmFreeCategory,
	LLM_FREE_MAX_ITEMS,
} from "./sources.js";
import { canonicalUrl } from "./textSimilarity.js";
import { classifyTheme } from "./themeClassification.js";
import { pingWebSubHub, publicFeedUrls } from "./websub.js";

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

function runBackground(label: string, task: () => Promise<unknown>): void {
	task().catch((err: Error) => {
		console.error(`[ingestion] ${label} failed:`, err.message);
	});
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

export type { RawArticle };

async function fetchFeed(source: {
	url: string;
	category: string;
	company?: string;
	promptHint?: string;
}): Promise<RawArticle[]> {
	try {
		const host = new URL(source.url).hostname;
		const xml = await hostGate.run(host, () =>
			withRetry(() =>
				fetchFeedXml(source.url, config.ingestion.feedFetchTimeoutMs),
			),
		);
		const feed = await parseFeed(xml);
		await recordFeedResult(source.url, true);
		const limit = isLlmFreeCategory(source.category)
			? Math.min(LLM_FREE_MAX_ITEMS, config.ingestion.maxArticlesPerFeed)
			: config.ingestion.maxArticlesPerFeed;
		return normalizeFeedItems(
			feed.items.slice(0, limit),
			source,
			feed,
			new Date(),
		);
	} catch (err) {
		console.warn(
			"[ingestion] feed failed:",
			source.url,
			(err as Error).message,
		);
		await recordFeedResult(
			source.url,
			false,
			sanitizeError((err as Error).message),
		);
		return [];
	}
}

async function summarizeForEmbedding(
	title: string,
	content: string,
): Promise<string> {
	try {
		const model = await getFastModel();
		const cleanContent = content
			.replace(/<\/?[^>]+(>|$)/g, " ")
			.replace(/https?:\/\/\S+/g, " ")
			.replace(/\s+/g, " ")
			.trim();
		const prompt = `Extraia as entidades principais, palavras-chave e o contexto central desta notícia para criar um resumo hiper-denso voltado para busca vetorial. Não inclua jargões genéricos, tags HTML ou introduções. Apenas dados puros (nomes, empresas, locais, eventos) e o fato principal. Limite a 50 palavras.

Título: ${title}

Conteúdo: ${cleanContent.slice(0, 4000)}`;
		const { text } = await generateText({
			model,
			prompt,
			maxTokens: 150,
		});
		return text.trim();
	} catch (e) {
		console.warn(
			"[ingestion] summarizeForEmbedding failed, falling back to raw content:",
			(e as Error).message.slice(0, 80),
		);
		const cleanContentFallback = content
			.replace(/<\/?[^>]+(>|$)/g, " ")
			.replace(/https?:\/\/\S+/g, " ")
			.replace(/\s+/g, " ")
			.trim();
		return `${title}. ${cleanContentFallback}`.slice(0, 1000);
	}
}

type PreparedArticle = {
	article: RawArticle;
	textToEmbed: string;
	themeCategory: string | null;
};

/** Exact-duplicate check, vector summary and editorial theme — all done before any embed call. */
async function prepareArticle(
	article: RawArticle,
	ollamaUp: boolean,
): Promise<PreparedArticle | null> {
	if (!article.guid || !article.title || !article.url) return null;

	const existing = await query<{ id: string }>(
		"SELECT id FROM news_articles WHERE guid = $1 OR url = $2 OR canonical_url = $3",
		[article.guid, article.url, canonicalUrl(article.url)],
	);
	if (existing.rowCount && existing.rowCount > 0) return null;

	// Budget categories keep a plain-text embedding input and no theme/relevance
	// calls: see LLM_FREE_CATEGORIES.
	const llmFree = isLlmFreeCategory(article.category);
	const textToEmbed = ollamaUp
		? llmFree
			? `${article.title}. ${(article.content || "").replace(/<\/?[^>]+(>|$)/g, " ").replace(/\s+/g, " ")}`.slice(
					0,
					1000,
				)
			: await summarizeForEmbedding(article.title, article.content || "")
		: "";

	// Per-article editorial theme, separate from the static feed `category`.
	// fact_check articles keep no theme — they are a sentinel, not editorial
	// content (see editions/select.ts isFactCheck).
	const themeCategory =
		article.category === "fact_check" || llmFree
			? null
			: await classifyTheme(
					article.title,
					article.content || "",
					article.category,
				);

	return { article, textToEmbed, themeCategory };
}

/**
 * One embed call per chunk instead of one per article. The Gemini free tier
 * allows 1000 embedding requests/day and ingestion stores ~1400 articles/day,
 * so per-article calls exhausted the quota and put the only deployment in
 * cooldown. A failed chunk loses its vectors, not the whole run.
 */
async function embedInBatches(texts: string[]): Promise<(number[] | null)[]> {
	const out: (number[] | null)[] = [];
	const size = Math.max(1, config.ingestion.embedBatchSize);
	for (let i = 0; i < texts.length; i += size) {
		const chunk = texts.slice(i, i + size);
		try {
			const vectors = await embedBatch(chunk, chunk.length);
			for (const vector of vectors) out.push(vector ?? null);
		} catch (e) {
			console.warn(
				"[ingestion] batch embed failed, storing without vectors:",
				(e as Error).message.slice(0, 80),
			);
			for (let k = 0; k < chunk.length; k++) out.push(null);
		}
	}
	return out;
}

async function storeArticle(
	prepared: PreparedArticle,
	embedding: number[] | null,
): Promise<string | null> {
	const { article, themeCategory } = prepared;

	// Near-duplicates from other outlets are stored, not skipped: the same story
	// reported by several portals is a signal (assignArticleToStory groups them),
	// and dropping by similarity used to lose articles whose angle differed.
	const result = await query<{ id: string }>(
		`INSERT INTO news_articles (guid, title, content, url, source, category, company, published_at, embedding, image_url, theme_category, canonical_url, is_ai, video_url, media, author, tags, comments_url, language, word_count)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15::jsonb, $16, $17::jsonb, $18, $19, $20)
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
			themeCategory,
			canonicalUrl(article.url),
			isAiRelated(article.title, article.content, article.category),
			article.videoUrl ?? null,
			article.media?.length ? JSON.stringify(article.media) : null,
			article.author ?? null,
			article.tags?.length ? JSON.stringify(article.tags) : null,
			article.commentsUrl ?? null,
			article.language ?? null,
			article.wordCount ?? null,
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
		videoUrl?: string;
		publishedAt?: Date | null;
	}>;
}

async function isOllamaAvailable(): Promise<boolean> {
	const base = config.ollama.baseUrl;
	const embeddingBase = config.ollama.embeddingBaseUrl;
	if (base.includes("/v1") && !embeddingBase) {
		console.warn(
			"[ingestion] OLLAMA_EMBEDDING_BASE_URL is not configured; embeddings will be skipped",
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

/** og:image / og:video of a page as the `media` entries stored with an article. */
function pageMediaEntries(page: PageMedia): ArticleMedia[] {
	return [
		...(page.imageUrl
			? [{ type: "image", url: page.imageUrl } satisfies ArticleMedia]
			: []),
		...(page.video ? [page.video] : []),
	];
}

/**
 * One page lookup per article the feed left without a picture or a teaser,
 * bounded per run and per host: og:image/og:video plus the page's description,
 * author and tags for whatever the feed did not provide.
 */
async function fillMissingDetails(
	articles: RawArticle[],
	budget: { left: number },
): Promise<void> {
	const missing = articles.filter((a) => (!a.imageUrl || !a.content) && a.url);
	await Promise.all(
		missing.map(async (article) => {
			if (budget.left <= 0) return;
			budget.left--;
			try {
				const host = new URL(article.url).hostname;
				const page = await hostGate.run(host, () =>
					fetchPageMedia(article.url),
				);
				const hadImage = !!article.imageUrl;
				const hadVideo = !!article.videoUrl;
				if (!hadImage)
					article.imageUrl = page.imageUrl ?? page.video?.thumbnail;
				if (page.video && !hadVideo) article.videoUrl = page.video.url;
				const entries = pageMediaEntries({
					imageUrl: hadImage ? undefined : page.imageUrl,
					video: hadVideo ? undefined : page.video,
				});
				if (entries.length)
					article.media = [...(article.media ?? []), ...entries];
				if (!article.content && page.meta?.description)
					article.content = page.meta.description;
				if (!article.author && page.meta?.author)
					article.author = page.meta.author;
				if (!article.tags?.length && page.meta?.tags)
					article.tags = page.meta.tags;
			} catch {
				// invalid url: the article is kept as the feed delivered it
			}
		}),
	);
}

/**
 * Articles stored while the embedding service was down (or whose feed had no
 * image) get a second chance, so a provider outage delays grouping instead of
 * losing it.
 */
async function backfillMissing(ollamaUp: boolean): Promise<void> {
	const limit = config.ingestion.backfillBatch;

	if (ollamaUp) {
		const rows = await query<{
			id: string;
			title: string;
			content: string | null;
		}>(
			`SELECT id, title, content FROM news_articles
       WHERE embedding IS NULL AND created_at > NOW() - INTERVAL '3 days'
       ORDER BY created_at DESC LIMIT $1`,
			[limit],
		);
		if (rows.rows.length > 0) {
			const texts = rows.rows.map((r) =>
				`${r.title}. ${(r.content ?? "").replace(/<\/?[^>]+(>|$)/g, " ")}`
					.replace(/\s+/g, " ")
					.slice(0, 1000),
			);
			const vectors = await embedInBatches(texts);
			let done = 0;
			for (let i = 0; i < rows.rows.length; i++) {
				const vector = vectors[i];
				const row = rows.rows[i];
				if (!vector || !row) continue;
				await query("UPDATE news_articles SET embedding = $1 WHERE id = $2", [
					vectorToSQL(vector),
					row.id,
				]);
				// Re-link only articles still outside a story, so no story is built twice.
				await assignArticleToStory(row.id).catch(() => undefined);
				runBackground("buildArticleRelations", () =>
					buildArticleRelations(row.id),
				);
				done++;
			}
			console.log(
				`[ingestion] backfilled ${done}/${rows.rows.length} embeddings`,
			);
		}
	}

	// Keyword classification only: cheap, no model, safe to run on every pass.
	const unclassified = await query<{
		id: string;
		title: string;
		content: string | null;
		category: string;
	}>(
		`SELECT id, title, LEFT(content, 1500) AS content, category FROM news_articles
     WHERE is_ai IS NULL AND created_at > NOW() - INTERVAL '7 days'
     ORDER BY created_at DESC LIMIT 500`,
	);
	for (const row of unclassified.rows) {
		await query("UPDATE news_articles SET is_ai = $1 WHERE id = $2", [
			isAiRelated(row.title, row.content ?? "", row.category),
			row.id,
		]);
	}

	const noImage = await query<{ id: string; url: string }>(
		`SELECT id, url FROM news_articles
     WHERE image_url IS NULL AND created_at > NOW() - INTERVAL '2 days'
     ORDER BY created_at DESC LIMIT $1`,
		[Math.min(limit, 60)],
	);
	let found = 0;
	await Promise.all(
		noImage.rows.map(async (row) => {
			let host: string;
			try {
				host = new URL(row.url).hostname;
			} catch {
				return;
			}
			const page = await hostGate.run(host, () => fetchPageMedia(row.url));
			const image = page.imageUrl ?? page.video?.thumbnail;
			if (!image) return;
			found++;
			await query(
				`UPDATE news_articles
         SET image_url = $1,
             video_url = COALESCE(video_url, $2),
             media = COALESCE(media, '[]'::jsonb) || $3::jsonb
         WHERE id = $4`,
				[
					image,
					page.video?.url ?? null,
					JSON.stringify(pageMediaEntries(page)),
					row.id,
				],
			);
		}),
	);
	if (noImage.rows.length > 0)
		console.log(
			`[ingestion] backfilled ${found}/${noImage.rows.length} images`,
		);
}

export async function runIngestion(): Promise<IngestionResult> {
	console.log("[ingestion] Starting news ingestion...");
	const feeds = await getActiveFeeds();
	const ollamaUp = await isOllamaAvailable();
	if (!ollamaUp)
		console.warn("[ingestion] Ollama unavailable — embeddings will be skipped");
	let fetched = 0;
	const newArticles: IngestionResult["newArticles"] = [];
	const seenThisRun = new Set<string>();
	const ogBudget = { left: config.ingestion.ogImageMaxPerRun };

	await backfillMissing(ollamaUp).catch((err: Error) =>
		console.error("[ingestion] backfill failed:", err.message),
	);

	for (let i = 0; i < feeds.length; i += config.ingestion.batchSize) {
		const batch = feeds.slice(i, i + config.ingestion.batchSize);
		const results = await Promise.allSettled(batch.map(fetchFeed));

		const candidates: RawArticle[] = [];
		for (const result of results) {
			if (result.status !== "fulfilled") continue;
			fetched += result.value.length;
			candidates.push(...result.value);
		}

		// Prepare (exact-dedup, summary, theme) first, then embed the whole feed
		// batch in a few requests: see embedInBatches for why per-article calls
		// exhausted the embedding quota.
		const prepared: PreparedArticle[] = [];
		for (const article of candidates) {
			// The same link can come from two feeds in one run, before either is stored.
			const key = canonicalUrl(article.url);
			if (seenThisRun.has(key)) continue;
			seenThisRun.add(key);
			try {
				const item = await prepareArticle(article, ollamaUp);
				if (item) prepared.push(item);
			} catch (err) {
				// One failed lookup must not discard the rest of the batch.
				console.error("[ingestion] prepare failed:", (err as Error).message, {
					url: article.url,
				});
			}
		}
		await fillMissingDetails(
			prepared.map((item) => item.article),
			ogBudget,
		);

		const embeddings = ollamaUp
			? await embedInBatches(prepared.map((item) => item.textToEmbed))
			: prepared.map(() => null);

		for (let j = 0; j < prepared.length; j++) {
			const { article } = prepared[j];
			try {
				const id = await storeArticle(prepared[j], embeddings[j] ?? null);
				if (!id) continue;
				const newArticle = {
					id,
					title: article.title,
					url: article.url,
					source: article.source,
					category: article.category,
					company: article.company,
					content: article.content,
					imageUrl: article.imageUrl,
					...(article.videoUrl ? { videoUrl: article.videoUrl } : {}),
					publishedAt: article.publishedAt,
				};
				newArticles.push(newArticle);
				// Grouping is awaited (and ordered) so two outlets' copies of one story
				// from the same run see each other instead of opening two stories.
				await assignArticleToStory(id).catch((err: Error) =>
					console.error(
						"[ingestion] assignArticleToStory failed:",
						err.message,
					),
				);
				runBackground("buildArticleRelations", () => buildArticleRelations(id));
				if (!isLlmFreeCategory(article.category))
					runBackground("scoreRelevance", () =>
						scoreRelevance(
							id,
							article.title,
							article.content ?? "",
							article.category,
							article.promptHint,
						),
					);
			} catch (err) {
				console.error("[ingestion] article failed:", (err as Error).message, {
					url: article.url,
				});
			}
		}
	}

	console.log(
		`[ingestion] Done. Fetched: ${fetched}, Stored: ${newArticles.length}`,
	);
	if (newArticles.length > 0)
		runBackground("websub", () => pingWebSubHub(publicFeedUrls()));
	return { fetched, stored: newArticles.length, newArticles };
}
