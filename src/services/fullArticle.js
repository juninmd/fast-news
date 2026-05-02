const STOP_SECTIONS = [
  'leia tambem', 'leia também', 'mais lidas', 'mais noticias', 'mais notícias',
  'relacionadas', 'related stories', 'related articles', 'recommended',
  'newsletter', 'publicidade', 'advertisement', 'comments', 'comentarios',
  'compartilhe', 'share this', 'siga-nos', 'follow us',
];

const NOISE_PATTERNS = [
  /^(menu|buscar|search|login|assine|subscribe|entrar|cadastre-se)$/i,
  /^(facebook|twitter|x|whatsapp|telegram|linkedin|instagram)$/i,
  /cookie|privacy policy|politica de privacidade|termos de uso/i,
  /all rights reserved|todos os direitos reservados/i,
  /clique aqui|click here|voltar ao topo/i,
];

const stripReaderChrome = (text) => text
  .replace(/^Title:.*$/gim, '')
  .replace(/^URL Source:.*$/gim, '')
  .replace(/^Markdown Content:\s*/gim, '')
  .replace(/\r/g, '')
  .trim();

const plain = (value = '') => value
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/!\[[^\]]*]\([^)]*\)/g, '')
  .replace(/\[[^\]]+]\([^)]*\)/g, '$1')
  .replace(/[#*_`>[\]()|:.,;!?'"-]/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()
  .toLowerCase();

const titleWords = (title) => plain(title).split(' ').filter((word) => word.length > 3);

const resemblesTitle = (line, articleTitle) => {
  const words = titleWords(articleTitle);
  if (words.length < 3) return false;
  const normalized = plain(line);
  const hits = words.filter((word) => normalized.includes(word)).length;
  return hits >= Math.min(5, Math.ceil(words.length * 0.55));
};

const cleanLine = (line) => line
  .replace(/!\[[^\]]*]\([^)]*\)/g, '')
  .replace(/\[([^\]]+)]\([^)]*\)/g, '$1')
  .replace(/^\s{0,3}#{1,6}\s*/, '')
  .replace(/^\s*[-*]\s+/, '')
  .replace(/\s+/g, ' ')
  .trim();

const isNoise = (line) => {
  const normalized = plain(line);
  if (!normalized) return true;
  if (/^https?:\/\//i.test(line)) return true;
  if (line.length < 28 && !/[.!?]$/.test(line)) return true;
  return NOISE_PATTERNS.some((pattern) => pattern.test(line));
};

const isStopSection = (line) => {
  const normalized = plain(line);
  return STOP_SECTIONS.some((section) => normalized === section || normalized.startsWith(`${section} `));
};

export function extractArticleText(markdown, article) {
  const lines = stripReaderChrome(markdown).split('\n').map(cleanLine);
  const titleIndex = lines.findIndex((line) => resemblesTitle(line, article?.title));
  const start = titleIndex >= 0 ? titleIndex + 1 : 0;
  const picked = [];

  for (const line of lines.slice(start)) {
    if (picked.join('\n\n').length > 700 && isStopSection(line)) break;
    if (isNoise(line) || isStopSection(line)) continue;
    if (picked[picked.length - 1] === line) continue;
    picked.push(line);
    if (picked.join('\n\n').length > 12000) break;
  }

  return picked.join('\n\n').replace(/\n{3,}/g, '\n\n').trim();
}

const hasEnoughTitleContext = (text, article) => {
  const words = titleWords(article?.title);
  if (!words.length) return true;
  const normalized = plain(text);
  const hits = words.filter((word) => normalized.includes(word)).length;
  return hits >= Math.min(4, Math.ceil(words.length * 0.35));
};

export async function fetchFullArticle(article) {
  const fallback = article?.body || article?.excerpt || '';
  if (!article?.url) return fallback;

  const response = await fetch(`https://r.jina.ai/${article.url}`, {
    headers: { Accept: 'text/plain' },
  });
  if (!response.ok) throw new Error(`Reader HTTP ${response.status}`);

  const text = extractArticleText(await response.text(), article);
  const usefulLength = text.length > Math.max(600, fallback.length + 250);
  return usefulLength && hasEnoughTitleContext(text, article) ? text : fallback;
}
