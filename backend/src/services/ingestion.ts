import Parser from 'rss-parser';
import { query } from '../database/client.js';
import { embedDocument, vectorToSQL } from './embeddings.js';
import { config } from '../config/env.js';

const parser = new Parser({ timeout: 10_000, headers: { 'User-Agent': 'FastNews/1.0' } });

export const FEED_SOURCES = [
  { url: 'https://rss.nytimes.com/services/xml/rss/nyt/World.xml', category: 'Mundo' },
  { url: 'https://feeds.bbci.co.uk/news/world/rss.xml', category: 'Mundo' },
  { url: 'https://www.aljazeera.com/xml/rss/all.xml', category: 'Mundo' },
  { url: 'https://feeds.reuters.com/reuters/worldNews', category: 'Mundo' },
  { url: 'https://rss.cnn.com/rss/edition.rss', category: 'Mundo' },
  { url: 'https://feeds.bloomberg.com/markets/news.rss', category: 'Negócios' },
  { url: 'https://www.cnbc.com/id/10000664/device/rss/rss.html', category: 'Negócios' },
  { url: 'https://www.infomoney.com.br/feed/', category: 'Negócios' },
  { url: 'https://exame.com/feed/', category: 'Negócios' },
  { url: 'https://www.forbes.com/business/feed/', category: 'Negócios' },
  { url: 'https://g1.globo.com/rss/g1/politica/', category: 'Brasil' },
  { url: 'https://g1.globo.com/rss/g1/economia/', category: 'Brasil' },
  { url: 'https://www.cnnbrasil.com.br/feed/', category: 'Brasil' },
  { url: 'https://jovempan.com.br/feed', category: 'Brasil' },
  { url: 'https://www.estadao.com.br/rss/ultimas', category: 'Brasil' },
  { url: 'https://techcrunch.com/feed/', category: 'Tecnologia' },
  { url: 'https://www.theverge.com/rss/index.xml', category: 'Tecnologia' },
  { url: 'https://tecnoblog.net/feed/', category: 'Tecnologia' },
  { url: 'https://rss.nytimes.com/services/xml/rss/nyt/Technology.xml', category: 'Tecnologia' },
  { url: 'https://g1.globo.com/rss/g1/ciencia-e-saude/', category: 'Ciência' },
];

export interface RawArticle {
  guid: string;
  title: string;
  content: string;
  url: string;
  source: string;
  category: string;
  publishedAt: Date | null;
}

async function fetchFeed(source: { url: string; category: string }): Promise<RawArticle[]> {
  try {
    const feed = await parser.parseURL(source.url);
    return (feed.items ?? []).slice(0, config.ingestion.maxArticlesPerFeed).map((item) => ({
      guid: item.guid ?? item.link ?? item.title ?? '',
      title: item.title ?? '',
      content: item.contentSnippet ?? item.summary ?? item.content ?? '',
      url: item.link ?? '',
      source: feed.title ?? source.url,
      category: source.category,
      publishedAt: item.pubDate ? new Date(item.pubDate) : null,
    }));
  } catch {
    return [];
  }
}

async function upsertArticle(article: RawArticle): Promise<string | null> {
  if (!article.guid || !article.title || !article.url) return null;

  const existing = await query<{ id: string }>(
    'SELECT id FROM news_articles WHERE guid = $1', [article.guid]
  );
  if (existing.rowCount && existing.rowCount > 0) return null;

  const textToEmbed = `${article.title}. ${article.content}`.slice(0, 2000);
  const embedding = await embedDocument(textToEmbed);

  const result = await query<{ id: string }>(
    `INSERT INTO news_articles (guid, title, content, url, source, category, published_at, embedding)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     ON CONFLICT (guid) DO NOTHING
     RETURNING id`,
    [article.guid, article.title, article.content, article.url, article.source,
     article.category, article.publishedAt, vectorToSQL(embedding)]
  );
  return result.rows[0]?.id ?? null;
}

export interface IngestionResult {
  fetched: number;
  stored: number;
  newArticles: Array<{ id: string; title: string; url: string; source: string; category: string }>;
}

export async function runIngestion(): Promise<IngestionResult> {
  console.log('[ingestion] Starting news ingestion...');
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
          const id = await upsertArticle(article);
          if (id) newArticles.push({ id, title: article.title, url: article.url,
            source: article.source, category: article.category });
        } catch { /* skip individual failures */ }
      }
    }
  }

  console.log(`[ingestion] Done. Fetched: ${fetched}, Stored: ${newArticles.length}`);
  return { fetched, stored: newArticles.length, newArticles };
}
