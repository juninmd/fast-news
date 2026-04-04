import React, { useState, useEffect, useMemo } from 'react';
import { fetchNews, FEED_SOURCES } from '../services/newsService';
import NewsCard from './NewsCard';
import HeroSection from './HeroSection';
import SkeletonCard from './SkeletonCard';
import { RefreshCw, PlusCircle, AlertCircle } from 'lucide-react';

const DEFAULT_FEEDS = [];

const Feed = ({
    aiProvider,
    geminiApiKey,
    aiSdkProvider,
    aiSdkApiKey,
    customFeeds = DEFAULT_FEEDS,
    rss2jsonApiKey,
    autoSummarize,
    selectedCategory = 'Todas',
    searchQuery = '',
    ollamaUrl,
    ollamaModel,
    telegramBotToken,
    telegramChatId
}) => {
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(false);
  const [shuffledSources, setShuffledSources] = useState([]);
  const [nextBatchIndex, setNextBatchIndex] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [init, setInit] = useState(false);

  // Shuffle and Filter sources when category or custom feeds change
  useEffect(() => {
    let sources = [...FEED_SOURCES, ...customFeeds];

    if (selectedCategory !== 'Todas') {
        sources = sources.filter(s => s.category === selectedCategory);
    }

    // Fisher-Yates shuffle
    for (let i = sources.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [sources[i], sources[j]] = [sources[j], sources[i]];
    }

    setShuffledSources(sources);
    setNews([]);
    setNextBatchIndex(0);
    setHasMore(sources.length > 0);
    setInit(true);
  }, [customFeeds, selectedCategory]);

  const loadMoreNews = async () => {
    if (loading || !hasMore || !init) return;
    setLoading(true);

    const batchSize = rss2jsonApiKey ? 12 : 9;

    try {
        const nextSources = shuffledSources.slice(nextBatchIndex, nextBatchIndex + batchSize);
        if (nextSources.length === 0) {
            setHasMore(false);
            setLoading(false);
            return;
        }

        const newNews = await fetchNews(nextSources, rss2jsonApiKey);

        setNews(prev => {
            const combined = [...prev, ...newNews];
            const unique = combined.filter((item, index, self) =>
                index === self.findIndex((t) => (
                    t.id === item.id
                ))
            );
            unique.sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));
            return unique;
        });

        setNextBatchIndex(prev => prev + batchSize);
        if (nextBatchIndex + batchSize >= shuffledSources.length) {
            setHasMore(false);
        }
    } catch (err) {
        console.error("Error loading news batch", err);
    } finally {
        setLoading(false);
    }
  };

  useEffect(() => {
    if (init && shuffledSources.length > 0 && news.length === 0 && !loading) {
        loadMoreNews();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      {showHero && (
          <HeroSection
             item={heroItem}
             aiProvider={aiProvider}
             geminiApiKey={geminiApiKey}
             aiSdkProvider={aiSdkProvider}
             aiSdkApiKey={aiSdkApiKey}
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
                    geminiApiKey={geminiApiKey}
                    aiSdkProvider={aiSdkProvider}
                    aiSdkApiKey={aiSdkApiKey}
                    autoSummarize={autoSummarize}
                    ollamaUrl={ollamaUrl}
                    ollamaModel={ollamaModel}
                    telegramBotToken={telegramBotToken}
                    telegramChatId={telegramChatId}
                  />
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
                onClick={loadMoreNews}
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

export default React.memo(Feed);
