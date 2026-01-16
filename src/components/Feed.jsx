import React, { useState, useEffect } from 'react';
import { fetchNews } from '../services/newsService';
import NewsCard from './NewsCard';
import { RefreshCw } from 'lucide-react';

const Feed = ({ apiKey }) => {
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadNews = async () => {
    setLoading(true);
    const data = await fetchNews();
    setNews(data);
    setLoading(false);
  };

  useEffect(() => {
    loadNews();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
         <RefreshCw className="animate-spin text-blue-600 mb-4" size={40} />
         <p className="text-gray-500">Fetching latest news...</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {news.map((item, index) => (
        <NewsCard key={`${item.id}-${index}`} item={item} apiKey={apiKey} />
      ))}
    </div>
  );
};

export default Feed;
