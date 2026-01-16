import React, { useState, useEffect, useMemo } from 'react';
import { fetchNews } from '../services/newsService';
import NewsCard from './NewsCard';
import { RefreshCw } from 'lucide-react';

const Feed = ({ apiKey }) => {
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('Todas');

  useEffect(() => {
    const loadNews = async () => {
        setLoading(true);
        const data = await fetchNews();
        setNews(data);
        setLoading(false);
    };
    loadNews();
  }, []);

  const categories = useMemo(() => {
    const cats = ['Todas', ...new Set(news.map(item => item.category).filter(Boolean))];
    return cats;
  }, [news]);

  const filteredNews = selectedCategory === 'Todas'
    ? news
    : news.filter(item => item.category === selectedCategory);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
         <RefreshCw className="animate-spin text-blue-600 mb-4" size={40} />
         <p className="text-gray-500">Buscando as últimas notícias...</p>
      </div>
    );
  }

  return (
    <div>
      {/* Category Filter */}
      <div className="flex overflow-x-auto pb-4 mb-6 gap-2 no-scrollbar px-1">
        {categories.map(cat => (
            <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                    selectedCategory === cat
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                }`}
            >
                {cat}
            </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredNews.map((item, index) => (
            <NewsCard key={`${item.id}-${index}`} item={item} apiKey={apiKey} />
        ))}
      </div>

      {filteredNews.length === 0 && (
        <div className="text-center py-20 text-gray-500">
            Nenhuma notícia encontrada nesta categoria.
        </div>
      )}
    </div>
  );
};

export default Feed;
