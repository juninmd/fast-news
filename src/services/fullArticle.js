const stripReaderChrome = (text) => text
  .replace(/^Title:.*$/gim, '')
  .replace(/^URL Source:.*$/gim, '')
  .replace(/^Markdown Content:\s*/gim, '')
  .replace(/\n{3,}/g, '\n\n')
  .trim();

export async function fetchFullArticle(article) {
  if (!article?.url) return article?.body || article?.excerpt || '';

  const response = await fetch(`https://r.jina.ai/${article.url}`, {
    headers: { Accept: 'text/plain' },
  });
  if (!response.ok) throw new Error(`Reader HTTP ${response.status}`);

  const text = stripReaderChrome(await response.text());
  const fallback = article.body || article.excerpt || '';
  return text.length > fallback.length + 300 ? text : fallback;
}
