import { FEED_SOURCES, fetchNews } from './newsService';

const cleanText = (value = '') => value
  .replace(/<[^>]*>/g, ' ')
  .replace(/&nbsp;/g, ' ')
  .replace(/&amp;/g, '&')
  .replace(/\s+/g, ' ')
  .trim();

const getImage = (item) => (
  item.thumbnail ||
  item.enclosure?.link ||
  item.enclosure?.url ||
  item['media:content']?.url ||
  item['media:thumbnail']?.url ||
  ''
);

const scoreArticle = (item) => {
  const text = `${item.title} ${cleanText(item.description || item.content)}`.toLowerCase();
  const useful = ['lança', 'anuncia', 'alerta', 'queda', 'alta', 'investiga', 'aprova'];
  const strategic = ['ia', 'segurança', 'mercado', 'governo', 'startup', 'openai', 'nvidia'];
  const fresh = Date.now() - new Date(item.pubDate).getTime() < 36 * 60 * 60 * 1000;
  return useful.filter((w) => text.includes(w)).length * 12 +
    strategic.filter((w) => text.includes(w)).length * 10 +
    (fresh ? 24 : 0) + Math.min(cleanText(item.description).length / 18, 24);
};

export const normalizeArticle = (item) => {
  const body = cleanText(item.content || item.description || '');
  const score = Math.round(Math.min(scoreArticle(item), 100));
  return {
    id: item.id || item.guid || item.link,
    title: cleanText(item.title),
    source: item.source || 'Fonte RSS',
    category: item.category || 'Geral',
    url: item.link,
    publishedAt: item.pubDate,
    imageUrl: getImage(item),
    excerpt: body.slice(0, 260),
    body,
    usefulScore: score,
    isUseful: score >= 58,
  };
};

const shuffle = (items) => [...items].sort(() => Math.random() - 0.5);

export async function fetchIntelBatch({
  category = 'Todas',
  offset = 0,
  size = 12,
  rssKey,
  customFeeds = [],
}) {
  const pool = [...FEED_SOURCES, ...customFeeds];
  const filtered = category === 'Todas' ? pool : pool.filter((s) => s.category === category);
  const sources = shuffle(filtered).slice(offset, offset + size);
  const raw = await fetchNews(sources, rssKey);
  const unique = new Map(raw.map((item) => [item.guid || item.link, normalizeArticle(item)]));
  return {
    articles: [...unique.values()].sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt)),
    nextOffset: offset + size,
    hasMore: offset + size < filtered.length,
    totalSources: filtered.length,
  };
}
