import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { fetchNews, FEED_SOURCES } from '../services/newsService';
import NewsCard from './NewsCard';
import HeroSection from './HeroSection';
import SkeletonCard from './SkeletonCard';
import RelatedArticles from './RelatedArticles';
import { RefreshCw, PlusCircle, AlertCircle, RefreshCw as RefreshIcon } from 'lucide-react';
import { withRetry } from '../utils/retry';

const DEFAULT_FEEDS = [];
const MAX_RETRIES = 2;
const RETRY_DELAY = 1000;

const Feed = ({
    apiKey,
    aiProvider,
    customFeeds = DEFAULT_FEEDS,
    rss2jsonApiKey,
    autoSummarize,
    selectedCategory = 'Todas',
    searchQuery = '',
    ollamaUrl,
    ollamaModel,
    telegramBotToken,
    telegramChatId,
    onError
}) => {
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [shuffledSources, setShuffledSources] = useState([]);
  const [nextBatchIndex, setNextBatchIndex] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [init, setInit] = useState(false);
  const [error, setError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);

  const shuffledSourcesMemo = useMemo(() => {
    let sources = [...FEED_SOURCES, ...customFeeds];

    if (selectedCategory !== 'Todas') {
        sources = sources.filter(s => s.category === selectedCategory);
    }

    // Fisher-Yates shuffle
    for (let i = sources.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [sources[i], sources[j]] = [sources[j], sources[i]];
    }

    return sources;
  }, [customFeeds, selectedCategory]);

  useEffect(() => {
    setShuffledSources(shuffledSourcesMemo);
    setNews([]);
    setNextBatchIndex(0);
    setHasMore(shuffledSourcesMemo.length > 0);
    setError(null);
    setInit(true);
  }, [shuffledSourcesMemo]);

  const loadMoreNews = useCallback(async (isRetry = false) => {
    if (loading || !hasMore || !init) return;

    if (!isRetry) {
        setLoading(true);
    }

    const batchSize = rss2jsonApiKey ? 12 : 9;

    try {
        const nextSources = shuffledSources.slice(nextBatchIndex, nextBatchIndex + batchSize);
        if (nextSources.length === 0) {
            setHasMore(false);
            setLoading(false);
            return;
        }

        const newNews = await withRetry(
            () => fetchNews(nextSources, rss2jsonApiKey),
            {
                maxAttempts: MAX_RETRIES,
                delayMs: RETRY_DELAY,
                onRetry: (attempt, err) => {
                    console.warn(`[Feed] Retry attempt ${attempt} after error:`, err.message);
                    setError(`Tentando novamente... (${attempt}/${MAX_RETRIES})`);
                }
            }
        );

        setNews(prev => {
            const combined = [...prev, ...newNews];
            const unique = combined.filter((item, index, self) =>
                index === self.findIndex((t) => (t.id === item.id))
            );
            unique.sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));
            return unique;
        });

        setNextBatchIndex(prev => prev + batchSize);
        setHasMore(nextBatchIndex + batchSize < shuffledSources.length);
        setError(null);
        setLastUpdate(new Date());

    } catch (err) {
        console.error("[Feed] Failed to load news after retries:", err);
        const errorMsg = 'Falha ao carregar notícias. Tente novamente.';
        setError(errorMsg);
        onError?.(errorMsg);
    } finally {
        setLoading(false);
    }
  }, [loading, hasMore, init, shuffledSources, nextBatchIndex, rss2jsonApiKey, onError]);

  const refreshNews = useCallback(async () => {
    if (isRefreshing || loading) return;

    setIsRefreshing(true);
    setError(null);

    try {
        setNews([]);
        setNextBatchIndex(0);
        setHasMore(shuffledSources.length > 0);

        const batchSize = rss2jsonApiKey ? 12 : 9;
        const nextSources = shuffledSources.slice(0, batchSize);

        const newNews = await withRetry(
            () => fetchNews(nextSources, rss2jsonApiKey),
            {
                maxAttempts: MAX_RETRIES,
                delayMs: RETRY_DELAY,
            }
        );

        setNews(prev => {
            const combined = [...prev, ...newNews];
            const unique = combined.filter((item, index, self) =>
                index === self.findIndex((t) => (t.id === item.id))
            );
            unique.sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));
            return unique;
        });

        setNextBatchIndex(batchSize);
        setHasMore(batchSize < shuffledSources.length);
        setLastUpdate(new Date());

    } catch (err) {
        console.error("[Feed] Refresh failed:", err);
        const errorMsg = 'Falha ao atualizar. Tente novamente.';
        setError(errorMsg);
        onError?.(errorMsg);
    } finally {
        setIsRefreshing(false);
    }
  }, [isRefreshing, loading, shuffledSources, rss2jsonApiKey, onError]);

  useEffect(() => {
    if (init && shuffledSources.length > 0 && news.length === 0 && !loading) {
        loadMoreNews();
    }
  }, [shuffledSources, init]);

  const filteredNews = useMemo(() => {
      let filtered = news;
      if (selectedCategory !== 'Todas') {
          filtered = filtered.filter(item => item.category === selectedCategory);
      }
      if (searchQuery) {
          const query = searchQuery.toLowerCase();
          filtered = filtered.filter(item =>
              item.title.toLowerCase().includes(query) ||
              (item.description && item.description.toLowerCase().includes(query))
          );
      }
      return filtered;
  }, [news, selectedCategory, searchQuery]);

  const isLoadingInitial = loading && news.length === 0;
  const showHero = !searchQuery && filteredNews.length > 0;
  const heroItem = showHero ? filteredNews[0] : null;
  const gridItems = showHero ? filteredNews.slice(1) : filteredNews;

  return (
    <div>
      {/* Refresh indicator */}
      {lastUpdate && (
        <div className="flex items-center justify-between mb-4 text-xs text-gray-500 dark:text-gray-400">
          <span>Última atualização: {lastUpdate.toLocaleTimeString('pt-BR')}</span>
          <button
            onClick={refreshNews}
            disabled={isRefreshing}
            className="flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
          >
            <RefreshIcon className={`w-3 h-3 ${isRefreshing ? 'animate-spin' : ''}`} />
            Atualizar
          </button>
        </div>
      )}

      {/* Error banner */}
      {error && (
        <div className="mb-4 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
          <button
            onClick={() => loadMoreNews()}
            className="ml-auto text-red-600 dark:text-red-400 underline hover:no-underline"
          >
            Tentar novamente
          </button>
        </div>
      )}

      {showHero && (
          <HeroSection
             item={heroItem}
             aiProvider={aiProvider}
             apiKey={apiKey}
             ollamaUrl={ollamaUrl}
             ollamaModel={ollamaModel}
          />
      )}

      {/* Masonry Grid */}
      {isLoadingInitial ? (
          <div className="columns-1 md:columns-2 lg:columns-3 gap-6">
             {Array.from({ length: 6 }).map((_, i) => (
                 <div key={i} className="break-inside-avoid mb-6">
                     <SkeletonCard />
                 </div>
             ))}
          </div>
      ) : (
          <div className="columns-1 md:columns-2 lg:columns-3 gap-6">
             {gridItems.map((item) => (
               <div key={item.id} className="break-inside-avoid mb-6">
                   <NewsCard
                     item={item}
                     aiProvider={aiProvider}
                     apiKey={apiKey}
                     autoSummarize={autoSummarize}
                     ollamaUrl={ollamaUrl}
                     ollamaModel={ollamaModel}
                     telegramBotToken={telegramBotToken}
                     telegramChatId={telegramChatId}
                     allArticles={filteredNews}
                   />
                   {item === gridItems[gridItems.length - 1] && filteredNews.length > 3 && (
                     <RelatedArticles currentArticle={item} allArticles={filteredNews} />
                   )}
               </div>
             ))}
          </div>
       )}

      {/* Empty State */}
      {!loading && !isLoadingInitial && filteredNews.length === 0 && (
        <div className="text-center py-20 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 animate-in fade-in zoom-in duration-300">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-700 mb-4">
                <AlertCircle className="text-gray-400 dark:text-gray-500" size={32} />
            </div>
            <p className="text-gray-500 dark:text-gray-400 text-lg font-medium">Nenhuma notícia encontrada.</p>
            <p className="text-gray-400 dark:text-gray-500 text-sm mt-2 max-w-md mx-auto">
                {hasMore
                    ? "Estamos buscando mais fontes..."
                    : "Não encontramos notícias para esta categoria ou termo de busca no momento."}
            </p>
            {error && (
                <button
                    onClick={refreshNews}
                    className="mt-4 px-4 py-2 text-sm text-blue-600 dark:text-blue-400 hover:underline"
                >
                    Tentar novamente
                </button>
            )}
        </div>
      )}

      {/* Load More */}
      <div className="mt-12 text-center pb-8">
        {loading && !isLoadingInitial ? (
             <div className="flex flex-col items-center justify-center">
                <RefreshCw className="animate-spin text-blue-600 mb-2" size={32} />
                <p className="text-gray-500 dark:text-gray-400 text-sm">Carregando mais notícias...</p>
             </div>
        ) : hasMore ? (
            <button
                onClick={() => loadMoreNews()}
                className="group relative inline-flex items-center justify-center px-8 py-3 text-base font-medium text-white bg-blue-600 rounded-full hover:bg-blue-700 transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5"
            >
                <PlusCircle className="mr-2 group-hover:rotate-90 transition-transform" size={20} />
                Carregar mais fontes
            </button>
        ) : (
            filteredNews.length > 0 && (
                <p className="text-gray-400 dark:text-gray-500 text-sm">Todas as fontes disponíveis foram carregadas.</p>
            )
        )}
      </div>
    </div>
  );
};

export default Feed;
