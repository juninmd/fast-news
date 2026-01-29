import React, { useState } from 'react';
import { summarizeText } from '../services/geminiService';
import { ExternalLink, Sparkles, Loader, Calendar, Newspaper } from 'lucide-react';

const NewsCard = ({ item, apiKey }) => {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSummarize = async () => {
    if (!apiKey) {
      setError("Por favor adicione sua chave de API Gemini nas configurações.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const textToSummarize = item.content || item.description || item.title;
      const result = await summarizeText(textToSummarize, apiKey);
      setSummary(result);
    } catch (error) {
      console.error(error);
      setError("Falha ao gerar resumo. Verifique sua chave de API.");
    } finally {
      setLoading(false);
    }
  };

  const getImage = () => {
    if (item.enclosure && item.enclosure.link) return item.enclosure.link;
    if (item.thumbnail) return item.thumbnail;
    const imgMatch = item.description?.match(/<img[^>]+src="([^">]+)"/);
    if (imgMatch) return imgMatch[1];
    return null;
  };

  const imageUrl = getImage();
  // Remove HTML tags for clean description preview
  const cleanDescription = item.description?.replace(/<[^>]+>/g, '').substring(0, 150) + '...';

  const formatDate = (dateString) => {
    try {
      const date = new Date(dateString);
      if (isNaN(date)) return '';
      return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    } catch {
      return '';
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col h-full border border-gray-100 dark:border-gray-700 group overflow-hidden">
      {imageUrl ? (
        <div className="h-52 overflow-hidden relative">
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <img
            src={imageUrl}
            alt={item.title}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
          />
          {item.category && (
            <div className="absolute top-3 right-3 z-20 bg-white/90 backdrop-blur-md text-gray-900 text-[10px] font-bold px-2.5 py-1 rounded-full shadow-sm tracking-wide uppercase">
                {item.category}
            </div>
          )}
        </div>
      ) : (
        <div className="h-52 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 flex items-center justify-center relative">
             <Newspaper className="text-gray-300 dark:text-gray-600 w-16 h-16" />
             {item.category && (
                <div className="absolute top-3 right-3 z-20 bg-white/90 backdrop-blur-md text-gray-900 text-[10px] font-bold px-2.5 py-1 rounded-full shadow-sm tracking-wide uppercase">
                    {item.category}
                </div>
              )}
        </div>
      )}
      <div className="p-5 flex flex-col flex-grow">
        <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wide bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded-full">
              {item.source}
            </span>
            <div className="flex items-center text-xs text-gray-400 dark:text-gray-500">
                <Calendar size={12} className="mr-1" />
                {formatDate(item.pubDate)}
            </div>
        </div>

        <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-3 leading-snug">
          <a href={item.link} target="_blank" rel="noopener noreferrer" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
            {item.title}
          </a>
        </h3>

        {/* Content Area */}
        <div className="flex-grow text-gray-600 dark:text-gray-300 text-sm mb-4 leading-relaxed">
          {summary ? (
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 p-4 rounded-lg border border-blue-100 dark:border-blue-800 animate-in fade-in duration-300">
                <div className="flex items-center gap-2 mb-2 text-blue-700 dark:text-blue-300 font-bold text-xs uppercase tracking-wide">
                    <Sparkles size={14} className="text-blue-500" />
                    <span>Resumo IA</span>
                </div>
                <p className="text-gray-800 dark:text-gray-200 italic">{summary}</p>
            </div>
          ) : (
            <p>{cleanDescription}</p>
          )}
        </div>

        {/* Footer Actions */}
        <div className="mt-auto flex items-center justify-between pt-4 border-t border-gray-100 dark:border-gray-700">
             <button
                onClick={handleSummarize}
                disabled={loading || summary}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold transition-all shadow-sm ${
                    summary
                    ? 'text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-700 cursor-default shadow-none'
                    : 'text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 hover:shadow-md active:scale-95'
                }`}
             >
                {loading ? <Loader size={14} className="animate-spin" /> : <Sparkles size={14} />}
                {loading ? 'Resumindo...' : (summary ? 'Resumido' : 'Resumir')}
             </button>

             <a
                href={item.link}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 text-xs font-semibold transition-colors"
             >
                Ler mais <ExternalLink size={14} />
             </a>
        </div>

        {error && (
            <p className="text-red-500 text-xs mt-3 bg-red-50 dark:bg-red-900/20 p-2 rounded border border-red-100 dark:border-red-800">{error}</p>
        )}
      </div>
    </div>
  );
};

export default NewsCard;
