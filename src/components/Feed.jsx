import React, { useState, useEffect, useMemo } from 'react';
import PropTypes from 'prop-types';
import { fetchNews, FEED_SOURCES } from '../services/newsService';
import NewsCard from './NewsCard';
import { RefreshCw, PlusCircle, AlertCircle } from 'lucide-react';

const BATCH_SIZE = 6; // Load 6 sources at a time to be safe with rate limits

const Feed = ({ apiKey, aiConfig }) => {
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(false);
  const [shuffledSources, setShuffledSources] = useState([]);
  const [nextBatchIndex, setNextBatchIndex] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('Todas');
  const [init, setInit] = useState(false);

  // Shuffle sources on mount
  useEffect(() => {
    const sources = [...FEED_SOURCES];
    // Fisher-Yates shuffle
    for (let i = sources.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [sources[i], sources[j]] = [sources[j], sources[i]];
    }
    setShuffledSources(sources);
    setInit(true);
  }, []);

  const loadMoreNews = async () => {
    if (loading || !hasMore || !init) return;
    setLoading(true);

    try {
        const nextSources = shuffledSources.slice(nextBatchIndex, nextBatchIndex + BATCH_SIZE);
        if (nextSources.length === 0) {
            setHasMore(false);
            setLoading(false);
            return;
        }

        const newNews = await fetchNews(nextSources);

        setNews(prev => {
            const combined = [...prev, ...newNews];
            // Unique by ID
            const unique = combined.filter((item, index, self) =>
                index === self.findIndex((t) => (
                    t.id === item.id
                ))
            );
            // Sort by date desc
            unique.sort((a, b) => {
                const dateA = new Date(a.pubDate);
                const dateB = new Date(b.pubDate);
                if (isNaN(dateA)) return 1;
                if (isNaN(dateB)) return -1;
                return dateB - dateA;
            });
            return unique;
        });

        setNextBatchIndex(prev => prev + BATCH_SIZE);
        if (nextBatchIndex + BATCH_SIZE >= shuffledSources.length) {
            setHasMore(false);
        }
    } catch (err) {
        console.error("Error loading news batch", err);
    } finally {
        setLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    if (init && news.length === 0) {
        loadMoreNews();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [init]);

  const categories = useMemo(() => {
    const cats = ['Todas', ...new Set(news.map(item => item.category).filter(Boolean))];
    return cats.sort();
  }, [news]);

  const filteredNews = selectedCategory === 'Todas'
    ? news
    : news.filter(item => item.category === selectedCategory);

  return (
    <div>
      {/* Category Filter */}
      {categories.length > 1 && (
          <div className="flex overflow-x-auto pb-4 mb-6 gap-2 no-scrollbar px-1 sticky top-16 z-30 bg-gray-50/95 dark:bg-gray-900/95 backdrop-blur py-2">
            {categories.map(cat => (
                <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                        selectedCategory === cat
                        ? 'bg-blue-600 text-white shadow-md'
                        : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700'
                    }`}
                >
                    {cat}
                </button>
            ))}
          </div>
      )}

      {/* News Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredNews.map((item, index) => (
            <NewsCard key={`${item.id}-${index}`} item={item} apiKey={apiKey} aiConfig={aiConfig} />
        ))}
      </div>

      {/* Empty State */}
      {!loading && filteredNews.length === 0 && (
        <div className="text-center py-20">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 mb-4">
                <AlertCircle className="text-gray-400 dark:text-gray-500" size={32} />
            </div>
            <p className="text-gray-500 dark:text-gray-400 text-lg">Nenhuma notícia encontrada.</p>
            <p className="text-gray-400 dark:text-gray-500 text-sm mt-2">Tente carregar mais fontes ou verificar sua conexão.</p>
        </div>
      )}

      {/* Load More / Loading State */}
      <div className="mt-12 text-center pb-8">
        {loading ? (
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
            <p className="text-gray-400 dark:text-gray-500 text-sm">Todas as fontes foram carregadas.</p>
        )}
      </div>
    </div>
  );
};

Feed.propTypes = {
  apiKey: PropTypes.string,
  aiConfig: PropTypes.shape({
    provider: PropTypes.string,
    apiKey: PropTypes.string,
    model: PropTypes.string
  })
};

export default Feed;
