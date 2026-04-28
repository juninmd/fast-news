import Parser from 'rss-parser';
import { query } from '../database/client.js';
import { embedDocument, vectorToSQL } from './embeddings.js';
import { config } from '../config/env.js';

const parser = new Parser({ timeout: 10_000, headers: { 'User-Agent': 'FastNews/1.0' } });

export const FEED_SOURCES = [
  // Big Techs
  { url: 'https://github.blog/feed/', category: 'Big Techs', company: 'GitHub' },
  { url: 'https://deepmind.google/blog/rss.xml', category: 'Big Techs', company: 'Google' },
  { url: 'https://blog.google/technology/ai/rss', category: 'Big Techs', company: 'Google' },
  { url: 'https://blogs.microsoft.com/feed/', category: 'Big Techs', company: 'Microsoft' },
  { url: 'https://about.fb.com/news/rss/', category: 'Big Techs', company: 'Meta' },
  { url: 'https://www.apple.com/news/rss/rss.xml', category: 'Big Techs', company: 'Apple' },
  { url: 'https://press.aboutamazon.com/news/press-releases', category: 'Big Techs', company: 'Amazon' },
  { url: 'https://blogs.nvidia.com/feed/', category: 'Big Techs', company: 'Nvidia' },

  // AI Frontier
  { url: 'https://openai.com/blog/rss.xml', category: 'AI Frontier', company: 'OpenAI' },
  { url: 'https://www.anthropic.com/news/rss.xml', category: 'AI Frontier', company: 'Anthropic' },
  { url: 'https://x.ai/blog/rss', category: 'AI Frontier', company: 'xAI' },
  { url: 'https://mistral.ai/news/rss/', category: 'AI Frontier', company: 'Mistral' },
  { url: 'https://huggingface.co/blog/feed.xml', category: 'AI Frontier', company: 'HuggingFace' },
  { url: 'https://cohere.com/blog/rss.xml', category: 'AI Frontier', company: 'Cohere' },

  // Dev Tools
  { url: 'https://github.blog/category/ai/feed/', category: 'Dev Tools', company: 'GitHub' },
  { url: 'https://vercel.com/blog/rss.xml', category: 'Dev Tools', company: 'Vercel' },
  { url: 'https://blog.cloudflare.com/rss/', category: 'Dev Tools', company: 'Cloudflare' },
  { url: 'https://supabase.com/blog/rss.xml', category: 'Dev Tools', company: 'Supabase' },
  { url: 'https://linear.app/blog/rss.xml', category: 'Dev Tools', company: 'Linear' },
  { url: 'https://stripe.com/blog/rss.xml', category: 'Dev Tools', company: 'Stripe' },

  // Gaming
  { url: 'https://store.steampowered.com/feeds/news/', category: 'Gaming', company: 'Steam' },
  { url: 'https://news.xbox.com/en-us/feed/', category: 'Gaming', company: 'Xbox' },
  { url: 'https://blog.playstation.com/feed/', category: 'Gaming', company: 'PlayStation' },
  { url: 'https://www.nintendolife.com/feed', category: 'Gaming', company: 'Nintendo' },

  // Tecnologia
  { url: 'https://techcrunch.com/feed/', category: 'Tecnologia', company: 'TechCrunch' },
  { url: 'https://www.theverge.com/rss/index.xml', category: 'Tecnologia', company: 'The Verge' },
  { url: 'https://feeds.arstechnica.com/arstechnica/index', category: 'Tecnologia', company: 'Ars Technica' },
  { url: 'https://www.wired.com/feed/rss', category: 'Tecnologia', company: 'Wired' },

  // Mundo
  { url: 'https://rss.nytimes.com/services/xml/rss/nyt/World.xml', category: 'Mundo' },
  { url: 'https://feeds.bbci.co.uk/news/world/rss.xml', category: 'Mundo' },
  { url: 'https://www.aljazeera.com/xml/rss/all.xml', category: 'Mundo' },
  { url: 'https://feeds.reuters.com/reuters/worldNews', category: 'Mundo' },
  { url: 'https://rss.cnn.com/rss/edition.rss', category: 'Mundo' },

  // Negocios
  { url: 'https://feeds.bloomberg.com/markets/news.rss', category: 'Negocios' },
  { url: 'https://www.cnbc.com/id/10000664/device/rss/rss.html', category: 'Negocios' },
  { url: 'https://www.forbes.com/business/feed/', category: 'Negocios' },

  // Brasil
  { url: 'https://g1.globo.com/rss/g1/politica/', category: 'Brasil' },
  { url: 'https://g1.globo.com/rss/g1/economia/', category: 'Brasil' },
  { url: 'https://www.cnnbrasil.com.br/feed/', category: 'Brasil' },

  // Ciencia
  { url: 'https://g1.globo.com/rss/g1/ciencia-e-saude/', category: 'Ciencia' },
];

export interface RawArticle {
  guid: string;
  title: string;
  content: string;
  url: string;
  source: string;
  category: string;
  company?: string;
  publishedAt: Date | null;
}

async function fetchFeed(source: { url: string; category: string; company?: string }): Promise<RawArticle[]> {
  try {
    const feed = await parser.parseURL(source.url);
    return (feed.items ?? []).slice(0, config.ingestion.maxArticlesPerFeed).map((item) => ({
      guid: item.guid ?? item.link ?? item.title ?? '',
      title: item.title ?? '',
      content: item.contentSnippet ?? item.summary ?? item.content ?? '',
      url: item.link ?? '',
      source: feed.title ?? source.url,
      category: source.category,
      company: source.company,
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
    `INSERT INTO news_articles (guid, title, content, url, source, category, company, published_at, embedding)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     ON CONFLICT (guid) DO NOTHING
     RETURNING id`,
    [article.guid, article.title, article.content, article.url, article.source,
     article.category, article.company ?? null, article.publishedAt, vectorToSQL(embedding)]
  );
  return result.rows[0]?.id ?? null;
}

export interface IngestionResult {
  fetched: number;
  stored: number;
  newArticles: Array<{ id: string; title: string; url: string; source: string; category: string; company?: string }>;
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
          if (id) newArticles.push({
            id, title: article.title, url: article.url,
            source: article.source, category: article.category, company: article.company
          });
        } catch { /* skip individual failures */ }
      }
    }
  }

  console.log(`[ingestion] Done. Fetched: ${fetched}, Stored: ${newArticles.length}`);
  return { fetched, stored: newArticles.length, newArticles };
}
