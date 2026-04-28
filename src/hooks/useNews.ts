import { useState, useEffect, useCallback } from 'react';

interface NewsArticle {
  id: string;
  title: string;
  excerpt?: string;
  url: string;
  source: string;
  category: string;
  company?: string;
  publishedAt: Date;
  imageUrl?: string;
}

interface UseNewsOptions {
  category?: string;
  company?: string;
  limit?: number;
}

interface UseNewsReturn {
  articles: NewsArticle[];
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  loadMore: () => Promise<void>;
  hasMore: boolean;
}

export function useNews(options: UseNewsOptions = {}): UseNewsReturn {
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const fetchArticles = useCallback(async (pageNum: number, append = false) => {
    try {
      setLoading(!append);
      setError(null);

      const params = new URLSearchParams({
        page: pageNum.toString(),
        limit: (options.limit || 20).toString(),
      });
      if (options.category && options.category !== 'Todas') {
        params.set('category', options.category);
      }
      if (options.company && options.company !== 'Todas') {
        params.set('company', options.company);
      }

      const response = await fetch(`/api/news?${params}`);
      if (!response.ok) throw new Error('Failed to fetch articles');

      const data = await response.json();

      setArticles((prev) => append ? [...prev, ...data.articles] : data.articles);
      setHasMore(data.hasMore);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setLoading(false);
    }
  }, [options.category, options.company, options.limit]);

  useEffect(() => {
    setPage(1);
    fetchArticles(1, false);
  }, [fetchArticles]);

  const refetch = useCallback(async () => {
    setPage(1);
    await fetchArticles(1, false);
  }, [fetchArticles]);

  const loadMore = useCallback(async () => {
    if (!hasMore || loading) return;
    const nextPage = page + 1;
    setPage(nextPage);
    await fetchArticles(nextPage, true);
  }, [page, hasMore, loading, fetchArticles]);

  return { articles, loading, error, refetch, loadMore, hasMore };
}
