import Parser from 'rss-parser';
import { query } from '../database/client.js';
import { upsertArticleToSqlite } from '../database/sqliteStore.js';
import { embedDocument, vectorToSQL } from './embeddings.js';
import { config } from '../config/env.js';
import { buildArticleRelations, assignArticleToStory } from './correlation.js';
import { enqueueCredibilityAnalysis } from './ollamaQueue.js';
import { FEED_SOURCES } from './sources.js';

const parser = new Parser({
  customFields: { item: [['media:content', 'mediaContent'], 'enclosure'] },
});

/** Fetch feed XML with proper charset decoding (handles ISO-8859-1 / Windows-1252 Brazilian feeds) */
async function fetchXml(url: string): Promise<string> {
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), 12_000);
  try {
    const resp = await fetch(url, { signal: ac.signal, headers: { 'User-Agent': 'FastNews/1.0' } });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const contentType = resp.headers.get('content-type') ?? '';
    const charsetMatch = contentType.match(/charset=([^\s;'"]+)/i);
    let charset = (charsetMatch?.[1] ?? 'utf-8').toLowerCase();
    // Normalize: TextDecoder accepts 'windows-1252' as alias for latin-1 variants
    if (['iso-8859-1', 'latin1', 'latin-1', 'cp1252'].includes(charset)) charset = 'windows-1252';
    const buf = await resp.arrayBuffer();
    try { return new TextDecoder(charset).decode(buf); } catch { return new TextDecoder('utf-8').decode(buf); }
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
    (item['mediaContent'] as Record<string, unknown> | undefined)?.['$'] &&
      ((item['mediaContent'] as Record<string, Record<string, string>>)['$']['url']),
    (item['mediaContent'] as Record<string, string> | undefined)?.['url'],
    (item['enclosure'] as Record<string, string> | undefined)?.['url'],
  ];
  for (const url of candidates) {
    if (typeof url === 'string' && IMAGE_EXT_RE.test(url)) return url;
  }
  return undefined;
}

async function withRetry<T>(fn: () => Promise<T>, retries = 3, delayMs = 1000): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 1; attempt <= retries; attempt++) {
    try { return await fn(); } catch (err) {
      lastErr = err;
      if (attempt < retries) await new Promise(r => setTimeout(r, delayMs * attempt));
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

async function fetchFeed(source: { url: string; category: string; company?: string }): Promise<RawArticle[]> {
  try {
    const xml = await withRetry(() => fetchXml(source.url));
    const feed = await parser.parseString(xml);
    return (feed.items ?? []).slice(0, config.ingestion.maxArticlesPerFeed).map((item) => {
      // Robust date parsing
      const dateStr = item.isoDate ?? item.pubDate;
      const publishedAt = dateStr ? new Date(dateStr) : null;

      return {
        guid: item.guid ?? item.link ?? item.title ?? Math.random().toString(36),
        title: item.title ?? 'Sem título',
        content: item.contentSnippet ?? item.summary ?? item.content ?? '',
        url: item.link ?? '',
        source: feed.title?.trim() || source.company || source.url,
        category: source.category,
        company: source.company,
        publishedAt: publishedAt && !isNaN(publishedAt.getTime()) ? publishedAt : null,
        imageUrl: extractImageUrl(item as unknown as Record<string, unknown>),
      };
    });
  } catch (err) {
    console.warn('[ingestion] feed failed:', source.url, (err as Error).message);
    return [];
  }
}

async function upsertArticle(article: RawArticle, ollamaUp: boolean): Promise<string | null> {
  if (!article.guid || !article.title || !article.url) return null;

  const existing = await query<{ id: string }>(
    'SELECT id FROM news_articles WHERE guid = $1 OR url = $2', [article.guid, article.url]
  );
  if (existing.rowCount && existing.rowCount > 0) return null;

  const textToEmbed = `${article.title}. ${article.content}`.slice(0, 2000);
  // Embedding is best-effort — if Ollama is unavailable, store without vector
  let embedding: number[] | null = null;
  if (ollamaUp) {
    try {
      embedding = await embedDocument(textToEmbed, timeoutSignal(config.ai.embeddingTimeoutMs));
    } catch (e) {
      console.warn('[ingestion] embed failed, storing without vector:', (e as Error).message.slice(0, 80));
    }
  }

  const result = await query<{ id: string }>(
    `INSERT INTO news_articles (guid, title, content, url, source, category, company, published_at, embedding)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     ON CONFLICT (guid) DO NOTHING
     RETURNING id`,
    [article.guid, article.title, article.content, article.url, article.source,
     article.category, article.company ?? null, article.publishedAt,
     embedding ? vectorToSQL(embedding) : null]
  );

  const newId = result.rows[0]?.id ?? null;
  if (newId && embedding) {
    try {
      upsertArticleToSqlite({
        id: newId,
        guid: article.guid,
        title: article.title,
        content: article.content,
        url: article.url,
        source: article.source,
        category: article.category,
        company: article.company,
        publishedAt: article.publishedAt?.toISOString() ?? undefined,
        imageUrl: article.imageUrl,
      }, embedding);
    } catch (e) {
      console.warn('[sqlite] upsert failed:', (e as Error).message);
    }
  }

  return newId;
}

export interface IngestionResult {
  fetched: number;
  stored: number;
  newArticles: Array<{ id: string; title: string; url: string; source: string; category: string; company?: string; content: string; imageUrl?: string; publishedAt?: Date | null }>;
}

async function isOllamaAvailable(): Promise<boolean> {
  const base = config.ollama.baseUrl.replace(/\/v1\/?$/, '');
  try {
    const ac = new AbortController();
    const t = setTimeout(() => ac.abort(), 3_000);
    const res = await fetch(`${base}/api/tags`, { signal: ac.signal });
    clearTimeout(t);
    return res.ok;
  } catch {
    return false;
  }
}

export async function runIngestion(): Promise<IngestionResult> {
  console.log('[ingestion] Starting news ingestion...');
  const ollamaUp = await isOllamaAvailable();
  if (!ollamaUp) console.warn('[ingestion] Ollama unavailable — embeddings will be skipped');
  let fetched = 0;
  const newArticles: IngestionResult['newArticles'] = [];

  for (let i = 0; i < FEED_SOURCES.length; i += config.ingestion.batchSize) {
    const batch = FEED_SOURCES.slice(i, i + config.ingestion.batchSize);
    const results = await Promise.allSettled(batch.map(fetchFeed));

    for (const result of results) {
      if (result.status !== 'fulfilled') continue;
      fetched += result.value.length;
      for (const article of result.value) {
        try {
          const id = await upsertArticle(article, ollamaUp);
          if (id) {
            const newArticle = {
              id, title: article.title, url: article.url,
              source: article.source, category: article.category, company: article.company,
              content: article.content, imageUrl: article.imageUrl, publishedAt: article.publishedAt,
            };
            newArticles.push(newArticle);
            runBackground('buildArticleRelations', () => buildArticleRelations(id));
            runBackground('assignArticleToStory', () => assignArticleToStory(id));
          }
        } catch (err) {
          console.error('[ingestion] article failed:', (err as Error).message, { url: article.url });
        }
      }
    }
  }

  const orderedArticles = [...newArticles].sort((a, b) =>
    (b.publishedAt?.getTime() ?? 0) - (a.publishedAt?.getTime() ?? 0)
  );
  for (const article of orderedArticles) {
    await enqueueCredibilityAnalysis(article);
  }

  console.log(`[ingestion] Done. Fetched: ${fetched}, Stored: ${newArticles.length}`);
  return { fetched, stored: newArticles.length, newArticles };
}
