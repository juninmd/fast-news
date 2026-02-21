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
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 flex flex-col h-full border border-gray-100 dark:border-gray-700/50 group overflow-hidden">
      {imageUrl && !imageError ? (
        <div className="h-48 overflow-hidden relative">
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent z-10 opacity-60 group-hover:opacity-80 transition-opacity duration-500" />
          <img
            src={imageUrl}
            alt={item.title}
            loading="lazy"
            onError={() => setImageError(true)}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
          />
          {item.category && (
            <div className="absolute top-3 left-3 z-20 bg-blue-600/90 backdrop-blur-md text-white text-[10px] font-bold px-2.5 py-1 rounded-lg shadow-lg shadow-blue-900/20 tracking-wide uppercase border border-white/20">
                {item.category}
            </div>
          )}
        </div>
      ) : (
        <div className="h-48 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-800 flex items-center justify-center relative border-b border-gray-100 dark:border-gray-700">
             <Newspaper className="text-gray-300 dark:text-gray-600 w-12 h-12" />
             {item.category && (
                <div className="absolute top-3 left-3 z-20 bg-gray-900/10 dark:bg-gray-100/10 backdrop-blur-md text-gray-500 dark:text-gray-400 text-[10px] font-bold px-2.5 py-1 rounded-lg tracking-wide uppercase">
                    {item.category}
                </div>
              )}
        </div>
      )}
      <div className="p-5 flex flex-col flex-grow relative">
        <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wide bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded-md truncate max-w-[140px] border border-blue-100 dark:border-blue-900/30">
              {item.source}
            </span>
            <div className="flex items-center text-[10px] text-gray-400 dark:text-gray-500 whitespace-nowrap ml-2 font-medium">
                <Calendar size={10} className="mr-1" />
                {formatDate(item.pubDate)}
            </div>
        </div>

        <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-3 leading-tight line-clamp-3 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
          <a href={item.link} target="_blank" rel="noopener noreferrer">
            {item.title}
          </a>
        </h3>

        {/* Content Area */}
        <div className="flex-grow text-gray-600 dark:text-gray-300 text-sm mb-5 leading-relaxed">
          {summary ? (
            <div className="bg-indigo-50 dark:bg-slate-800/50 p-4 rounded-xl border border-indigo-100 dark:border-slate-700 animate-in fade-in slide-in-from-bottom-2 duration-500 shadow-sm">
                <div className="flex items-center gap-1.5 mb-2 text-indigo-600 dark:text-indigo-400 font-bold text-[10px] uppercase tracking-wide border-b border-indigo-100 dark:border-slate-700/50 pb-2">
                    <Sparkles size={12} className="text-indigo-500 fill-indigo-500" />
                    <span>Resumo IA</span>
                </div>
                <p className="text-gray-700 dark:text-gray-300 text-xs leading-relaxed font-medium">{summary}</p>
            </div>
          ) : (
            <p className="line-clamp-3 opacity-80 text-xs leading-relaxed">{cleanDescription}</p>
          )}
        </div>

        {/* Footer Actions */}
        <div className="mt-auto flex items-center justify-between pt-4 border-t border-gray-100 dark:border-gray-700/50 gap-2">
             <div className="flex gap-2">
                 <button
                    onClick={handleSummarize}
                    disabled={loading || summary}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all shadow-sm border transform active:scale-95 ${
                        summary
                        ? 'text-green-600 bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800 dark:text-green-400 cursor-default'
                        : 'text-gray-600 bg-white border-gray-200 hover:bg-gray-50 hover:shadow dark:bg-gray-800 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700 hover:border-gray-300 dark:hover:border-gray-500'
                    }`}
                    title="Resumir com Ollama"
                 >
                    {loading ? <Loader size={12} className="animate-spin" /> : <Sparkles size={12} />}
                    <span className="hidden sm:inline">{loading ? 'Gerando...' : (summary ? 'Pronto' : 'Resumir')}</span>
                 </button>

                 {(telegramBotToken && telegramChatId) && (
                     <button
                        onClick={handleSendToTelegram}
                        disabled={sendingTelegram}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all shadow-sm border transform active:scale-95 ${
                            telegramStatus === 'success' ? 'text-green-600 bg-green-50 border-green-200' :
                            telegramStatus === 'error' ? 'text-red-600 bg-red-50 border-red-200' :
                            'text-gray-600 bg-white border-gray-200 hover:bg-gray-50 hover:shadow dark:bg-gray-800 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700 hover:border-gray-300 dark:hover:border-gray-500'
                        }`}
                        title="Enviar para Telegram"
                     >
                        {sendingTelegram ? <Loader size={12} className="animate-spin" /> :
                         telegramStatus === 'success' ? <Check size={12} /> :
                         telegramStatus === 'error' ? <AlertTriangle size={12} /> :
                         <Send size={12} />}
                     </button>
                 )}
             </div>

             <a
                href={item.link}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 text-[10px] font-bold transition-colors whitespace-nowrap bg-blue-50 dark:bg-blue-900/20 px-3 py-1.5 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/40 hover:shadow-sm"
             >
                Ler <ExternalLink size={10} />
             </a>
        </div>

        {error && (
            <p className="text-red-500 text-[10px] mt-2 bg-red-50 dark:bg-red-900/20 p-2 rounded-lg border border-red-100 dark:border-red-800 animate-in fade-in">{error}</p>
        )}
      </div>
    </div>
  );
};

export default NewsCard;
