import React, { useState, useEffect } from 'react';
import { fetchTrendingTopics } from '../services/newsService';
import { TrendingUp, AlertCircle } from 'lucide-react';

const TrendingTopicsSkeleton = () => (
  <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-100 dark:border-gray-700 mb-6">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
      <div className="flex items-center gap-3 mb-2">
        <div className="h-5 w-5 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
        <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
      </div>
      <div className="flex overflow-x-auto pb-2 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex-shrink-0 bg-gray-200 dark:bg-gray-700 rounded-full px-4 py-1.5 animate-pulse">
            <div className="h-4 w-24 bg-gray-300 dark:bg-gray-600 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  </div>
);

const TrendingTopics = () => {
  const [trends, setTrends] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadTrends = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await fetchTrendingTopics();
        setTrends(data || []);
      } catch (err) {
        console.error('[TrendingTopics] Failed to load trends:', err);
        setError(err);
        setTrends([]);
      } finally {
        setLoading(false);
      }
    };
    loadTrends();
  }, []);

  if (loading) return <TrendingTopicsSkeleton />;
  if (error) return null;
  if (trends.length === 0) return null;

  return (
    <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-100 dark:border-gray-700 mb-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <div className="flex items-center gap-3 mb-2">
          <TrendingUp className="h-5 w-5 text-red-600" />
          <h2 className="text-sm font-bold text-gray-700 dark:text-gray-200 uppercase tracking-wider">
            Em alta no Brasil hoje
          </h2>
        </div>

        <div className="flex overflow-x-auto pb-2 gap-4 scrollbar-hide">
          {trends.map((trend, index) => (
            <a
              key={index}
              href={trend.link}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-shrink-0 bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full px-4 py-1.5 border border-gray-200 dark:border-gray-600 transition-colors group"
            >
              <span className="text-sm font-medium text-gray-700 dark:text-gray-200 group-hover:text-blue-600 dark:group-hover:text-blue-400 whitespace-nowrap flex items-center gap-2">
                {index + 1}. {trend.title}
              </span>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
};

export default TrendingTopics;
