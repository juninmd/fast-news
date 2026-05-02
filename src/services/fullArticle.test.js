import { describe, expect, it, vi, beforeEach } from 'vitest';
import { extractArticleText, fetchFullArticle } from './fullArticle';

globalThis.fetch = vi.fn();

const article = {
  title: 'OpenAI launches a new reasoning model for developers',
  url: 'https://example.com/news/model',
  excerpt: 'Short RSS summary about the new model.',
};

describe('fullArticle', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('extracts article copy after the matching title and skips site chrome', () => {
    const markdown = `
Title: Example
URL Source: https://example.com/news/model
Markdown Content:
Menu
Search
# OpenAI launches a new reasoning model for developers
The company said the model improves reliability for complex coding tasks.
Developers can use the release through the API starting this week.
Newsletter
Subscribe now
Related Articles
Another unrelated headline
`;

    const text = extractArticleText(markdown, article);

    expect(text).toContain('improves reliability');
    expect(text).toContain('through the API');
    expect(text).not.toContain('Menu');
    expect(text).not.toContain('Subscribe');
    expect(text).not.toContain('unrelated headline');
  });

  it('falls back when the reader result is mostly unrelated page content', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      text: () => Promise.resolve('Menu\nLogin\nPublicidade\nRelated Articles\nFooter links'),
    });

    await expect(fetchFullArticle(article)).resolves.toBe(article.excerpt);
  });
});
