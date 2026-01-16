import React, { useState } from 'react';
import { summarizeText } from '../services/geminiService';
import { ExternalLink, Sparkles, Loader } from 'lucide-react';

const NewsCard = ({ item, apiKey }) => {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSummarize = async () => {
    if (!apiKey) {
      setError("Please add your Gemini API Key in settings.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      // Use description or content if available, fallback to title
      const textToSummarize = item.content || item.description || item.title;
      const result = await summarizeText(textToSummarize, apiKey);
      setSummary(result);
    } catch (err) {
      setError("Failed to generate summary. Check your API key or try again.");
    } finally {
      setLoading(false);
    }
  };

  // Extract an image if available in description or enclosures
  const getImage = () => {
    if (item.enclosure && item.enclosure.link) return item.enclosure.link;
    if (item.thumbnail) return item.thumbnail;
    // Simple regex to find img tag in description
    const imgMatch = item.description?.match(/<img[^>]+src="([^">]+)"/);
    if (imgMatch) return imgMatch[1];
    return null; // Placeholder could be added
  };

  const imageUrl = getImage();
  const cleanDescription = item.description?.replace(/<[^>]+>/g, '').substring(0, 150) + '...';

  return (
    <div className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300 flex flex-col h-full">
      {imageUrl && (
        <div className="h-48 overflow-hidden">
          <img src={imageUrl} alt={item.title} className="w-full h-full object-cover" />
        </div>
      )}
      <div className="p-5 flex flex-col flex-grow">
        <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-blue-600 uppercase tracking-wide">
              {item.source}
            </span>
            <span className="text-xs text-gray-400">
                {new Date(item.pubDate).toLocaleDateString()}
            </span>
        </div>
        <h3 className="text-lg font-bold text-gray-900 mb-2 leading-tight">
          <a href={item.link} target="_blank" rel="noopener noreferrer" className="hover:text-blue-600 transition-colors">
            {item.title}
          </a>
        </h3>

        {/* Content Area */}
        <div className="flex-grow text-gray-600 text-sm mb-4">
          {summary ? (
            <div className="bg-blue-50 p-3 rounded-lg border border-blue-100">
                <div className="flex items-center gap-2 mb-1 text-blue-700 font-medium text-xs">
                    <Sparkles size={14} />
                    <span>AI Summary</span>
                </div>
                <p className="text-gray-800 italic">{summary}</p>
            </div>
          ) : (
            <p>{cleanDescription}</p>
          )}
        </div>

        {/* Footer Actions */}
        <div className="mt-auto flex items-center justify-between pt-4 border-t border-gray-100">
             <button
                onClick={handleSummarize}
                disabled={loading || summary}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                    summary
                    ? 'text-gray-400 cursor-default'
                    : 'text-purple-600 bg-purple-50 hover:bg-purple-100'
                }`}
             >
                {loading ? <Loader size={14} className="animate-spin" /> : <Sparkles size={14} />}
                {loading ? 'Summarizing...' : (summary ? 'Summarized' : 'Summarize')}
             </button>

             <a
                href={item.link}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-gray-500 hover:text-blue-600 text-xs font-medium"
             >
                Read more <ExternalLink size={14} />
             </a>
        </div>

        {error && (
            <p className="text-red-500 text-xs mt-2">{error}</p>
        )}
      </div>
    </div>
  );
};

export default NewsCard;
