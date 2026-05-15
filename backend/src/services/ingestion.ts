import Parser from 'rss-parser';
import { query } from '../database/client.js';
import { upsertArticleToSqlite } from '../database/sqliteStore.js';
import { embedDocument, vectorToSQL } from './embeddings.js';
import { config } from '../config/env.js';
import { buildArticleRelations, assignArticleToStory } from './correlation.js';
import { analyzeCredibility } from './credibility.js';

const parser = new Parser({
  timeout: 10_000,
  headers: { 'User-Agent': 'FastNews/1.0' },
  customFields: { item: [['media:content', 'mediaContent'], 'enclosure'] },
});

const IMAGE_EXT_RE = /\.(jpe?g|png|webp|gif)(\?.*)?$/i;

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

export const FEED_SOURCES = [
  // ── Big Techs ───────────────────────────────────────────────────────────────
  { url: 'https://github.blog/feed/', category: 'Big Techs', company: 'GitHub' },
  { url: 'https://github.blog/engineering/feed/', category: 'Big Techs', company: 'GitHub' },
  { url: 'https://deepmind.google/blog/rss.xml', category: 'Big Techs', company: 'Google' },
  { url: 'https://blog.google/technology/ai/rss', category: 'Big Techs', company: 'Google' },
  { url: 'https://developers.googleblog.com/feeds/posts/default', category: 'Big Techs', company: 'Google' },
  { url: 'https://blogs.microsoft.com/feed/', category: 'Big Techs', company: 'Microsoft' },
  { url: 'https://devblogs.microsoft.com/feed/', category: 'Big Techs', company: 'Microsoft' },
  { url: 'https://about.fb.com/news/rss/', category: 'Big Techs', company: 'Meta' },
  { url: 'https://engineering.fb.com/feed/', category: 'Big Techs', company: 'Meta' },
  { url: 'https://press.aboutamazon.com/news/press-releases', category: 'Big Techs', company: 'Amazon' },
  { url: 'https://aws.amazon.com/blogs/aws/feed/', category: 'Big Techs', company: 'AWS' },
  { url: 'https://blogs.nvidia.com/feed/', category: 'Big Techs', company: 'Nvidia' },
  { url: 'https://developer.nvidia.com/blog/feed/', category: 'Big Techs', company: 'Nvidia' },
  { url: 'https://engineering.linkedin.com/blog.rss', category: 'Big Techs', company: 'LinkedIn' },
  { url: 'https://netflixtechblog.com/feed', category: 'Big Techs', company: 'Netflix' },
  { url: 'https://engineering.atspotify.com/feed/', category: 'Big Techs', company: 'Spotify' },
  { url: 'https://dropbox.tech/feed', category: 'Big Techs', company: 'Dropbox' },
  { url: 'https://blog.discord.com/feed', category: 'Big Techs', company: 'Discord' },
  { url: 'https://slack.engineering/feed/', category: 'Big Techs', company: 'Slack' },
  { url: 'https://uber.com/en-US/blog/engineering/rss/', category: 'Big Techs', company: 'Uber' },
  { url: 'https://medium.com/airbnb-engineering/feed', category: 'Big Techs', company: 'Airbnb' },

  // ── AI Frontier ─────────────────────────────────────────────────────────────
  { url: 'https://openai.com/blog/rss.xml', category: 'AI Frontier', company: 'OpenAI' },
  { url: 'https://x.ai/blog/rss', category: 'AI Frontier', company: 'xAI' },
  { url: 'https://mistral.ai/news/rss/', category: 'AI Frontier', company: 'Mistral' },
  { url: 'https://huggingface.co/blog/feed.xml', category: 'AI Frontier', company: 'HuggingFace' },
  { url: 'https://cohere.com/blog/rss.xml', category: 'AI Frontier', company: 'Cohere' },
  { url: 'https://www.perplexity.ai/blog/rss.xml', category: 'AI Frontier', company: 'Perplexity' },
  { url: 'https://www.together.ai/blog/rss.xml', category: 'AI Frontier', company: 'Together AI' },
  { url: 'https://research.google/blog/rss/', category: 'AI Frontier', company: 'Google Research' },
  { url: 'https://ai.meta.com/blog/rss.xml', category: 'AI Frontier', company: 'Meta AI' },
  { url: 'https://bair.berkeley.edu/blog/feed.xml', category: 'AI Frontier', company: 'BAIR' },
  { url: 'https://lilianweng.github.io/index.xml', category: 'AI Frontier', company: 'Lilian Weng' },

  // ── Dev Tools & Plataformas ──────────────────────────────────────────────────
  { url: 'https://blog.cloudflare.com/rss/', category: 'Dev Tools', company: 'Cloudflare' },
  { url: 'https://supabase.com/blog/rss.xml', category: 'Dev Tools', company: 'Supabase' },
  { url: 'https://linear.app/blog/rss.xml', category: 'Dev Tools', company: 'Linear' },
  { url: 'https://stripe.com/blog/rss.xml', category: 'Dev Tools', company: 'Stripe' },
  { url: 'https://fly.io/blog/feed.xml', category: 'Dev Tools', company: 'Fly.io' },
  { url: 'https://render.com/blog/rss.xml', category: 'Dev Tools', company: 'Render' },
  { url: 'https://www.docker.com/blog/feed/', category: 'Dev Tools', company: 'Docker' },
  { url: 'https://kubernetes.io/feed.xml', category: 'Dev Tools', company: 'Kubernetes' },
  { url: 'https://hashicorp.com/blog/feed.xml', category: 'Dev Tools', company: 'HashiCorp' },
  { url: 'https://grafana.com/blog/index.xml', category: 'Dev Tools', company: 'Grafana' },
  { url: 'https://www.datadoghq.com/blog/feed', category: 'Dev Tools', company: 'Datadog' },
  { url: 'https://turso.tech/blog/rss.xml', category: 'Dev Tools', company: 'Turso' },
  { url: 'https://neon.tech/blog/rss.xml', category: 'Dev Tools', company: 'Neon' },
  { url: 'https://planetscale.com/blog/feed.xml', category: 'Dev Tools', company: 'PlanetScale' },
  { url: 'https://blog.railway.app/rss.xml', category: 'Dev Tools', company: 'Railway' },
  { url: 'https://resend.com/blog/rss.xml', category: 'Dev Tools', company: 'Resend' },
  { url: 'https://www.val.town/blog/rss.xml', category: 'Dev Tools', company: 'Val Town' },
  { url: 'https://deno.com/feed', category: 'Dev Tools', company: 'Deno' },
  { url: 'https://bun.sh/blog.rss', category: 'Dev Tools', company: 'Bun' },

  // ── Engenharia de Software ───────────────────────────────────────────────────
  { url: 'https://martinfowler.com/feed.atom', category: 'Engenharia', company: 'Martin Fowler' },
  { url: 'https://www.infoq.com/feed/', category: 'Engenharia', company: 'InfoQ' },
  { url: 'https://stackoverflow.blog/feed/', category: 'Engenharia', company: 'Stack Overflow' },
  { url: 'https://blog.pragmaticengineer.com/rss/', category: 'Engenharia', company: 'Pragmatic Engineer' },
  { url: 'https://highscalability.com/rss/', category: 'Engenharia', company: 'High Scalability' },
  { url: 'https://www.architecture-weekly.com/feed', category: 'Engenharia', company: 'Architecture Weekly' },
  { url: 'https://thenewstack.io/feed/', category: 'Engenharia', company: 'The New Stack' },
  { url: 'https://newsletter.systemdesign.one/feed', category: 'Engenharia', company: 'System Design' },
  { url: 'https://www.bytebytego.com/feed', category: 'Engenharia', company: 'ByteByteGo' },
  { url: 'https://medium.com/feed/better-programming', category: 'Engenharia', company: 'Better Programming' },
  { url: 'https://blog.quastor.org/feed', category: 'Engenharia', company: 'Quastor' },

  // ── Open Source ──────────────────────────────────────────────────────────────
  { url: 'https://www.linux.com/feed/', category: 'Open Source', company: 'Linux' },
  { url: 'https://lwn.net/headlines/rss', category: 'Open Source', company: 'LWN' },
  { url: 'https://news.itsfoss.com/feed/', category: 'Open Source', company: 'It\'s FOSS' },
  { url: 'https://opensource.com/feed', category: 'Open Source', company: 'Opensource.com' },
  { url: 'https://about.gitlab.com/atom.xml', category: 'Open Source', company: 'GitLab' },
  { url: 'https://blog.rust-lang.org/feed.xml', category: 'Open Source', company: 'Rust' },
  { url: 'https://go.dev/blog/feed.atom', category: 'Open Source', company: 'Go' },
  { url: 'https://nodejs.org/en/feed/blog.xml', category: 'Open Source', company: 'Node.js' },
  { url: 'https://devblogs.microsoft.com/typescript/feed/', category: 'Open Source', company: 'TypeScript' },

  // ── Segurança & DevSecOps ────────────────────────────────────────────────────
  { url: 'https://krebsonsecurity.com/feed/', category: 'Segurança', company: 'Krebs on Security' },
  { url: 'https://feeds.feedburner.com/TheHackersNews', category: 'Segurança', company: 'The Hacker News' },
  { url: 'https://www.bleepingcomputer.com/feed/', category: 'Segurança', company: 'BleepingComputer' },
  { url: 'https://portswigger.net/daily-swig/rss', category: 'Segurança', company: 'PortSwigger' },
  { url: 'https://snyk.io/blog/feed/', category: 'Segurança', company: 'Snyk' },
  { url: 'https://googleprojectzero.blogspot.com/feeds/posts/default', category: 'Segurança', company: 'Project Zero' },

  // ── Startups & VC ────────────────────────────────────────────────────────────
  { url: 'https://a16z.com/feed/', category: 'Startups', company: 'a16z' },
  { url: 'https://www.ycombinator.com/blog/rss.xml', category: 'Startups', company: 'Y Combinator' },
  { url: 'https://www.sequoiacap.com/feed/', category: 'Startups', company: 'Sequoia' },
  { url: 'https://medium.com/feed/point-nine-news', category: 'Startups', company: 'Point Nine' },
  { url: 'https://techcrunch.com/category/startups/feed/', category: 'Startups', company: 'TechCrunch' },
  { url: 'https://sifted.eu/feed/', category: 'Startups', company: 'Sifted' },

  // ── Gaming ───────────────────────────────────────────────────────────────────
  { url: 'https://store.steampowered.com/feeds/news/', category: 'Gaming', company: 'Steam' },
  { url: 'https://news.xbox.com/en-us/feed/', category: 'Gaming', company: 'Xbox' },
  { url: 'https://blog.playstation.com/feed/', category: 'Gaming', company: 'PlayStation' },
  { url: 'https://www.nintendolife.com/feed', category: 'Gaming', company: 'Nintendo' },
  { url: 'https://www.eurogamer.net/feed', category: 'Gaming', company: 'Eurogamer' },
  { url: 'https://www.rockpapershotgun.com/feed', category: 'Gaming', company: 'Rock Paper Shotgun' },

  // ── Tecnologia Geral ─────────────────────────────────────────────────────────
  { url: 'https://techcrunch.com/feed/', category: 'Tecnologia', company: 'TechCrunch' },
  { url: 'https://www.theverge.com/rss/index.xml', category: 'Tecnologia', company: 'The Verge' },
  { url: 'https://feeds.arstechnica.com/arstechnica/index', category: 'Tecnologia', company: 'Ars Technica' },
  { url: 'https://www.wired.com/feed/rss', category: 'Tecnologia', company: 'Wired' },
  { url: 'https://www.technologyreview.com/feed/', category: 'Tecnologia', company: 'MIT Tech Review' },
  { url: 'https://spectrum.ieee.org/rss/fulltext', category: 'Tecnologia', company: 'IEEE Spectrum' },
  { url: 'https://www.zdnet.com/news/rss.xml', category: 'Tecnologia', company: 'ZDNet' },
  { url: 'https://www.infoworld.com/feed/', category: 'Tecnologia', company: 'InfoWorld' },
  { url: 'https://simonwillison.net/atom/everything/', category: 'Tecnologia', company: 'Simon Willison' },
  { url: 'https://css-tricks.com/feed/', category: 'Tecnologia', company: 'CSS-Tricks' },
  { url: 'https://web.dev/feed.xml', category: 'Tecnologia', company: 'web.dev' },
  { url: 'https://hacks.mozilla.org/feed/', category: 'Tecnologia', company: 'Mozilla' },

  // ── Mundo ────────────────────────────────────────────────────────────────────
  { url: 'https://rss.nytimes.com/services/xml/rss/nyt/World.xml', category: 'Mundo' },
  { url: 'https://feeds.bbci.co.uk/news/world/rss.xml', category: 'Mundo' },
  { url: 'https://www.aljazeera.com/xml/rss/all.xml', category: 'Mundo' },
  { url: 'https://feeds.reuters.com/reuters/worldNews', category: 'Mundo' },
  { url: 'https://rss.cnn.com/rss/edition.rss', category: 'Mundo' },

  // ── Negocios & Mercados ──────────────────────────────────────────────────────
  { url: 'https://feeds.bloomberg.com/markets/news.rss', category: 'Negocios' },
  { url: 'https://www.cnbc.com/id/10000664/device/rss/rss.html', category: 'Negocios' },
  { url: 'https://www.forbes.com/business/feed/', category: 'Negocios' },
  { url: 'https://fortune.com/feed/', category: 'Negocios', company: 'Fortune' },
  { url: 'https://hbr.org/feed', category: 'Negocios', company: 'Harvard Business Review' },

  // ── Brasil ───────────────────────────────────────────────────────────────────
  { url: 'https://g1.globo.com/rss/g1/politica/', category: 'Brasil' },
  { url: 'https://g1.globo.com/rss/g1/economia/', category: 'Brasil' },
  { url: 'https://www.cnnbrasil.com.br/feed/', category: 'Brasil' },
  { url: 'https://tecnoblog.net/feed/', category: 'Brasil', company: 'Tecnoblog' },
  { url: 'https://www.infomoney.com.br/feed/', category: 'Brasil', company: 'InfoMoney' },
  { url: 'https://olhardigital.com.br/feed/', category: 'Brasil', company: 'Olhar Digital' },
  { url: 'https://canaltech.com.br/rss/', category: 'Brasil', company: 'Canaltech' },

  // ── Ciencia ──────────────────────────────────────────────────────────────────
  { url: 'https://g1.globo.com/rss/g1/ciencia-e-saude/', category: 'Ciencia' },
  { url: 'https://www.sciencedaily.com/rss/top.xml', category: 'Ciencia', company: 'Science Daily' },
  { url: 'https://www.nature.com/nature.rss', category: 'Ciencia', company: 'Nature' },
  { url: 'https://feeds.newscientist.com/science-news', category: 'Ciencia', company: 'New Scientist' },
  { url: 'https://phys.org/rss-feed/', category: 'Ciencia', company: 'Phys.org' },
  { url: 'https://www.quantamagazine.org/feed/', category: 'Ciencia', company: 'Quanta Magazine' },
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
  imageUrl?: string;
}

async function fetchFeed(source: { url: string; category: string; company?: string }): Promise<RawArticle[]> {
  try {
    const feed = await withRetry(() => parser.parseURL(source.url));
    return (feed.items ?? []).slice(0, config.ingestion.maxArticlesPerFeed).map((item) => ({
      guid: item.guid ?? item.link ?? item.title ?? '',
      title: item.title ?? '',
      content: item.contentSnippet ?? item.summary ?? item.content ?? '',
      url: item.link ?? '',
      source: feed.title ?? source.url,
      category: source.category,
      company: source.company,
      publishedAt: item.pubDate ? new Date(item.pubDate) : null,
      imageUrl: extractImageUrl(item as unknown as Record<string, unknown>),
    }));
  } catch (err) {
    console.warn('[ingestion] feed failed:', source.url, (err as Error).message);
    return [];
  }
}

async function upsertArticle(article: RawArticle, ollamaUp: boolean): Promise<string | null> {
  if (!article.guid || !article.title || !article.url) return null;

  const existing = await query<{ id: string }>(
    'SELECT id FROM news_articles WHERE guid = $1', [article.guid]
  );
  if (existing.rowCount && existing.rowCount > 0) return null;

  const textToEmbed = `${article.title}. ${article.content}`.slice(0, 2000);
  // Embedding is best-effort — if Ollama is unavailable, store without vector
  let embedding: number[] | null = null;
  if (ollamaUp) {
    try {
      const timeout = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('embed timeout')), 10_000)
      );
      embedding = await Promise.race([embedDocument(textToEmbed), timeout]);
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
  newArticles: Array<{ id: string; title: string; url: string; source: string; category: string; company?: string; content: string; imageUrl?: string }>;
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
            newArticles.push({
              id, title: article.title, url: article.url,
              source: article.source, category: article.category, company: article.company,
              content: article.content, imageUrl: article.imageUrl,
            });
            buildArticleRelations(id).catch((err: Error) => console.error('[ingestion] buildArticleRelations failed:', err.message));
            assignArticleToStory(id).catch((err: Error) => console.error('[ingestion] assignArticleToStory failed:', err.message));
            analyzeCredibility(id, article.title, article.content, article.source, article.category).catch((err: Error) => console.error('[ingestion] analyzeCredibility failed:', err.message));
          }
        } catch (err) {
          console.error('[ingestion] article failed:', (err as Error).message, { url: article.url });
        }
      }
    }
  }

  console.log(`[ingestion] Done. Fetched: ${fetched}, Stored: ${newArticles.length}`);
  return { fetched, stored: newArticles.length, newArticles };
}
