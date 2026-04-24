import { useState, useEffect } from 'react';
import { fetchTrendingTopics } from '../services/newsService';
import { TrendingUp } from 'lucide-react';

const TrendingTopics = () => {
  const [trends, setTrends] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadTrends = async () => {
      const data = await fetchTrendingTopics();
      setTrends(data);
      setLoading(false);
    };
    loadTrends();
  }, []);

  if (loading) return null; // Or a small skeleton
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
