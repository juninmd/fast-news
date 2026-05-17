import Parser from 'rss-parser';
import { query } from '../database/client.js';
import { upsertArticleToSqlite } from '../database/sqliteStore.js';
import { embedDocument, vectorToSQL } from './embeddings.js';
import { config } from '../config/env.js';
import { buildArticleRelations, assignArticleToStory } from './correlation.js';
import { enqueueCredibilityAnalysis } from './ollamaQueue.js';

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
  { url: 'https://aws.amazon.com/blogs/aws/feed/', category: 'Big Techs', company: 'AWS' },
  { url: 'https://aws.amazon.com/blogs/opensource/feed/', category: 'Big Techs', company: 'AWS' },
  { url: 'https://blogs.nvidia.com/feed/', category: 'Big Techs', company: 'Nvidia' },
  { url: 'https://developer.nvidia.com/blog/feed/', category: 'Big Techs', company: 'Nvidia' },
  { url: 'https://engineering.atspotify.com/feed/', category: 'Big Techs', company: 'Spotify' },
  { url: 'https://dropbox.tech/feed', category: 'Big Techs', company: 'Dropbox' },
  { url: 'https://slack.engineering/feed/', category: 'Big Techs', company: 'Slack' },
  { url: 'https://engineeringblog.yelp.com/feed.xml', category: 'Big Techs', company: 'Yelp' },

  // ── AI Frontier ─────────────────────────────────────────────────────────────
  { url: 'https://openai.com/blog/rss.xml', category: 'AI Frontier', company: 'OpenAI' },
  { url: 'https://huggingface.co/blog/feed.xml', category: 'AI Frontier', company: 'HuggingFace' },
  { url: 'https://www.together.ai/blog/rss.xml', category: 'AI Frontier', company: 'Together AI' },
  { url: 'https://research.google/blog/rss/', category: 'AI Frontier', company: 'Google Research' },
  { url: 'https://bair.berkeley.edu/blog/feed.xml', category: 'AI Frontier', company: 'BAIR' },
  { url: 'https://lilianweng.github.io/index.xml', category: 'AI Frontier', company: 'Lilian Weng' },
  { url: 'https://www.fast.ai/index.xml', category: 'AI Frontier', company: 'fast.ai' },
  { url: 'https://eugeneyan.com/rss/', category: 'AI Frontier', company: 'Eugene Yan' },
  { url: 'https://huyenchip.com/feed.xml', category: 'AI Frontier', company: 'Chip Huyen' },
  { url: 'https://www.interconnects.ai/feed', category: 'AI Frontier', company: 'Interconnects AI' },
  { url: 'https://www.semianalysis.com/feed', category: 'AI Frontier', company: 'SemiAnalysis' },
  { url: 'https://arxiv.org/rss/cs.AI', category: 'AI Frontier', company: 'arXiv' },
  { url: 'https://sebastianraschka.com/rss_feed.xml', category: 'AI Frontier', company: 'Sebastian Raschka' },
  { url: 'https://jack-clark.net/feed/', category: 'AI Frontier', company: 'Import AI' },

  // ── Cloud & Infraestrutura ───────────────────────────────────────────────────
  { url: 'https://azure.microsoft.com/en-us/blog/feed/', category: 'Dev Tools', company: 'Azure' },
  { url: 'https://cloudblog.withgoogle.com/rss/', category: 'Dev Tools', company: 'Google Cloud' },
  { url: 'https://www.digitalocean.com/community/tutorials/feed', category: 'Dev Tools', company: 'DigitalOcean' },
  { url: 'https://www.pulumi.com/blog/rss.xml', category: 'Dev Tools', company: 'Pulumi' },
  { url: 'https://www.cncf.io/blog/feed/', category: 'Dev Tools', company: 'CNCF' },

  // ── Dev Tools & Plataformas ──────────────────────────────────────────────────
  { url: 'https://blog.cloudflare.com/rss/', category: 'Dev Tools', company: 'Cloudflare' },
  { url: 'https://fly.io/blog/feed.xml', category: 'Dev Tools', company: 'Fly.io' },
  { url: 'https://www.docker.com/blog/feed/', category: 'Dev Tools', company: 'Docker' },
  { url: 'https://kubernetes.io/feed.xml', category: 'Dev Tools', company: 'Kubernetes' },
  { url: 'https://hashicorp.com/blog/feed.xml', category: 'Dev Tools', company: 'HashiCorp' },
  { url: 'https://grafana.com/blog/index.xml', category: 'Dev Tools', company: 'Grafana' },
  { url: 'https://neon.tech/blog/rss.xml', category: 'Dev Tools', company: 'Neon' },
  { url: 'https://deno.com/feed', category: 'Dev Tools', company: 'Deno' },
  { url: 'https://blog.jetbrains.com/feed/', category: 'Dev Tools', company: 'JetBrains' },
  { url: 'https://octopus.com/blog/feed.xml', category: 'Dev Tools', company: 'Octopus Deploy' },
  { url: 'https://blog.logrocket.com/feed/', category: 'Dev Tools', company: 'LogRocket' },

  // ── Engenharia de Software ───────────────────────────────────────────────────
  { url: 'https://martinfowler.com/feed.atom', category: 'Engenharia', company: 'Martin Fowler' },
  { url: 'https://stackoverflow.blog/feed/', category: 'Engenharia', company: 'Stack Overflow' },
  { url: 'https://blog.pragmaticengineer.com/rss/', category: 'Engenharia', company: 'Pragmatic Engineer' },
  { url: 'https://highscalability.com/rss/', category: 'Engenharia', company: 'High Scalability' },
  { url: 'https://www.architecture-weekly.com/feed', category: 'Engenharia', company: 'Architecture Weekly' },
  { url: 'https://thenewstack.io/feed/', category: 'Engenharia', company: 'The New Stack' },
  { url: 'https://newsletter.systemdesign.one/feed', category: 'Engenharia', company: 'System Design' },
  { url: 'https://medium.com/feed/better-programming', category: 'Engenharia', company: 'Better Programming' },
  { url: 'https://www.smashingmagazine.com/feed/', category: 'Engenharia', company: 'Smashing Magazine' },

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
  { url: 'https://snyk.io/blog/feed/', category: 'Segurança', company: 'Snyk' },
  { url: 'https://googleprojectzero.blogspot.com/feeds/posts/default', category: 'Segurança', company: 'Project Zero' },
  { url: 'https://unit42.paloaltonetworks.com/feed/', category: 'Segurança', company: 'Unit 42' },
  { url: 'https://www.crowdstrike.com/blog/feed/', category: 'Segurança', company: 'CrowdStrike' },
  { url: 'https://www.rapid7.com/blog/rss/', category: 'Segurança', company: 'Rapid7' },
  { url: 'https://blog.malwarebytes.com/feed/', category: 'Segurança', company: 'Malwarebytes' },
  { url: 'https://isc.sans.edu/rssfeed.xml', category: 'Segurança', company: 'SANS ISC' },
  { url: 'https://www.darkreading.com/rss.xml', category: 'Segurança', company: 'Dark Reading' },
  { url: 'https://www.securityweek.com/feed/', category: 'Segurança', company: 'SecurityWeek' },

  // ── Startups & VC ────────────────────────────────────────────────────────────
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
  { url: 'https://www.pcgamer.com/rss/', category: 'Gaming', company: 'PC Gamer' },

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
  { url: 'https://www.theatlantic.com/feed/all/', category: 'Tecnologia', company: 'The Atlantic' },
  { url: 'https://www.vox.com/rss/technology/index.xml', category: 'Tecnologia', company: 'Vox' },

  // ── Mundo ────────────────────────────────────────────────────────────────────
  { url: 'https://rss.nytimes.com/services/xml/rss/nyt/World.xml', category: 'Mundo', company: 'NYT' },
  { url: 'https://feeds.bbci.co.uk/news/world/rss.xml', category: 'Mundo', company: 'BBC' },
  { url: 'https://www.aljazeera.com/xml/rss/all.xml', category: 'Mundo', company: 'Al Jazeera' },
  { url: 'https://www.theguardian.com/world/rss', category: 'Mundo', company: 'The Guardian' },
  { url: 'https://feeds.bbci.co.uk/portuguese/rss.xml', category: 'Mundo', company: 'BBC Brasil' },

  // ── Brasil ───────────────────────────────────────────────────────────────────
  { url: 'https://www.cnnbrasil.com.br/feed/', category: 'Brasil', company: 'CNN Brasil' },
  { url: 'https://www.metropoles.com/feed/', category: 'Brasil', company: 'Metrópoles' },
  { url: 'https://braziljournal.com/feed/', category: 'Brasil', company: 'Brazil Journal' },
  { url: 'https://tecnoblog.net/feed/', category: 'Brasil', company: 'Tecnoblog' },
  { url: 'https://feeds.folha.uol.com.br/poder/rss091.xml', category: 'Brasil', company: 'Folha de S.Paulo' },
  { url: 'https://feeds.folha.uol.com.br/mercado/rss091.xml', category: 'Brasil', company: 'Folha de S.Paulo' },
  { url: 'https://feeds.folha.uol.com.br/mundo/rss091.xml', category: 'Mundo', company: 'Folha de S.Paulo' },
  { url: 'https://www.poder360.com.br/feed/', category: 'Brasil', company: 'Poder360' },
  { url: 'https://agenciabrasil.ebc.com.br/rss/ultimasnoticias/feed.xml', category: 'Brasil', company: 'Agência Brasil' },
  { url: 'https://veja.abril.com.br/feed/', category: 'Brasil', company: 'Veja' },
  { url: 'https://istoe.com.br/feed', category: 'Brasil', company: 'IstoÉ' },
  { url: 'https://www.cartacapital.com.br/feed/', category: 'Brasil', company: 'Carta Capital' },
  { url: 'https://oglobo.globo.com/rss.xml', category: 'Brasil', company: 'O Globo' },
  { url: 'https://exame.com/feed/', category: 'Negócios', company: 'Exame' },
  { url: 'https://www.infomoney.com.br/feed/', category: 'Negócios', company: 'InfoMoney' },

  // ── Games & Entretenimento ────────────────────────────────────────────────────
  { url: 'https://pt.ign.com/feed.xml', category: 'Gaming', company: 'IGN Brasil' },
  { url: 'https://www.gameblast.com.br/feeds/posts/default', category: 'Gaming', company: 'GameBlast' },
  { url: 'https://www.nintendoblast.com.br/feeds/posts/default', category: 'Gaming', company: 'NintendoBlast' },
  { url: 'https://www.adrenaline.com.br/feed/', category: 'Gaming', company: 'Adrenaline' },
  { url: 'https://www.gameinformer.com/rss.xml', category: 'Gaming', company: 'Game Informer' },
  { url: 'https://kotaku.com/rss', category: 'Gaming', company: 'Kotaku' },
  { url: 'https://www.destructoid.com/feed', category: 'Gaming', company: 'Destructoid' },

  // ── Anime ─────────────────────────────────────────────────────────────────────
  { url: 'https://www.animenewsnetwork.com/newsroom/rss.xml', category: 'Anime', company: 'Anime News Network' },
  { url: 'https://www.myanimelist.net/rss/news.xml', category: 'Anime', company: 'MyAnimeList' },
  { url: 'https://saikoanimes.net/feed/', category: 'Anime', company: 'Saiko Animes' },
  { url: 'https://www.animenewsnetwork.com/all/rss.xml?ann-edition=br', category: 'Anime', company: 'ANN Brasil' },
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
    'SELECT id FROM news_articles WHERE guid = $1', [article.guid]
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
