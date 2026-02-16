import React, { useState, useEffect } from 'react';
import { summarizeWithOllama } from '../services/ollamaService';
import { sendToTelegram } from '../services/telegramService';
import { ExternalLink, Sparkles, Loader, Calendar, Newspaper, Send, AlertTriangle, Check } from 'lucide-react';

const NewsCard = ({ item, ollamaUrl, ollamaModel, telegramBotToken, telegramChatId, autoSummarize }) => {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [sendingTelegram, setSendingTelegram] = useState(false);
  const [telegramStatus, setTelegramStatus] = useState(null); // success, error
  const [error, setError] = useState(null);
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    if (autoSummarize && ollamaUrl && !summary && !loading && !error) {
      handleSummarize();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoSummarize, ollamaUrl]);

  const handleSummarize = async () => {
    if (!ollamaUrl) {
      setError("Configure o Ollama nas configurações.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const textToSummarize = item.content || item.description || item.title;
      const result = await summarizeWithOllama(textToSummarize, ollamaUrl, ollamaModel);
      setSummary(result);
    } catch (error) {
      console.error(error);
      setError("Falha ao gerar resumo. Verifique se o Ollama está rodando.");
    } finally {
      setLoading(false);
    }
  };

  const handleSendToTelegram = async () => {
      if (!telegramBotToken || !telegramChatId) {
          setTelegramStatus('error');
          setTimeout(() => setTelegramStatus(null), 3000);
          return;
      }

      setSendingTelegram(true);
      try {
          const textToSend = `*${item.title}*\n\n${summary || item.description || ''}\n\n[Ler mais](${item.link})`;
          await sendToTelegram(textToSend, telegramBotToken, telegramChatId);
          setTelegramStatus('success');
      } catch (e) {
          console.error(e);
          setTelegramStatus('error');
      } finally {
          setSendingTelegram(false);
          setTimeout(() => setTelegramStatus(null), 3000);
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
      {imageUrl && !imageError ? (
        <div className="h-48 overflow-hidden relative">
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent z-10 opacity-60 group-hover:opacity-80 transition-opacity duration-300" />
          <img
            src={imageUrl}
            alt={item.title}
            loading="lazy"
            onError={() => setImageError(true)}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
          />
          {item.category && (
            <div className="absolute top-3 right-3 z-20 bg-white/90 backdrop-blur-md text-gray-900 text-[10px] font-bold px-2.5 py-1 rounded-full shadow-sm tracking-wide uppercase">
                {item.category}
            </div>
          )}
        </div>
      ) : (
        <div className="h-48 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 flex items-center justify-center relative">
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
            <span className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wide bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded-full truncate max-w-[120px]">
              {item.source}
            </span>
            <div className="flex items-center text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap ml-2">
                <Calendar size={12} className="mr-1" />
                {formatDate(item.pubDate)}
            </div>
        </div>

        <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-3 leading-tight line-clamp-3">
          <a href={item.link} target="_blank" rel="noopener noreferrer" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
            {item.title}
          </a>
        </h3>

        {/* Content Area */}
        <div className="flex-grow text-gray-600 dark:text-gray-300 text-sm mb-4 leading-relaxed">
          {summary ? (
            <div className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 p-4 rounded-lg border border-indigo-100 dark:border-indigo-800 animate-in fade-in duration-300">
                <div className="flex items-center gap-2 mb-2 text-indigo-700 dark:text-indigo-300 font-bold text-xs uppercase tracking-wide">
                    <Sparkles size={14} className="text-indigo-500" />
                    <span>Resumo Ollama</span>
                </div>
                <p className="text-gray-800 dark:text-gray-200 italic text-xs">{summary}</p>
            </div>
          ) : (
            <p className="line-clamp-4">{cleanDescription}</p>
          )}
        </div>

        {/* Footer Actions */}
        <div className="mt-auto flex items-center justify-between pt-4 border-t border-gray-100 dark:border-gray-700 gap-2">
             <div className="flex gap-2">
                 <button
                    onClick={handleSummarize}
                    disabled={loading || summary}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shadow-sm border ${
                        summary
                        ? 'text-green-600 bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800 dark:text-green-400'
                        : 'text-gray-700 bg-white border-gray-200 hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700'
                    }`}
                    title="Resumir com Ollama"
                 >
                    {loading ? <Loader size={14} className="animate-spin" /> : <Sparkles size={14} />}
                    {loading ? '...' : (summary ? 'Pronto' : 'Resumir')}
                 </button>

                 {(telegramBotToken && telegramChatId) && (
                     <button
                        onClick={handleSendToTelegram}
                        disabled={sendingTelegram}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shadow-sm border ${
                            telegramStatus === 'success' ? 'text-green-600 bg-green-50 border-green-200' :
                            telegramStatus === 'error' ? 'text-red-600 bg-red-50 border-red-200' :
                            'text-blue-600 bg-blue-50 border-blue-200 hover:bg-blue-100 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-400'
                        }`}
                        title="Enviar para Telegram"
                     >
                        {sendingTelegram ? <Loader size={14} className="animate-spin" /> :
                         telegramStatus === 'success' ? <Check size={14} /> :
                         telegramStatus === 'error' ? <AlertTriangle size={14} /> :
                         <Send size={14} />}
                     </button>
                 )}
             </div>

             <a
                href={item.link}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 text-xs font-semibold transition-colors whitespace-nowrap"
             >
                Ler <ExternalLink size={12} />
             </a>
        </div>

        {error && (
            <p className="text-red-500 text-[10px] mt-2 bg-red-50 dark:bg-red-900/20 p-1.5 rounded border border-red-100 dark:border-red-800">{error}</p>
        )}
      </div>
    </div>
  );
};

export default NewsCard;
