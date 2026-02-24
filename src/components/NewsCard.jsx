import React, { useState, useEffect } from 'react';
import { summarizeWithOllama } from '../services/ollamaService';
import { summarizeWithGemini } from '../services/geminiService';
import { sendToTelegram } from '../services/telegramService';
import { ExternalLink, Sparkles, Loader, Send, Check, Copy, Newspaper } from 'lucide-react';

const NewsCard = ({ item, aiProvider, apiKey, ollamaUrl, ollamaModel, telegramBotToken, telegramChatId, autoSummarize }) => {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [sendingTelegram, setSendingTelegram] = useState(false);
  const [telegramStatus, setTelegramStatus] = useState(null); // success, error
  const [error, setError] = useState(null);
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    if (autoSummarize && !summary && !loading && !error) {
      if (aiProvider === 'gemini' && apiKey) {
        handleSummarize();
      } else if ((!aiProvider || aiProvider === 'ollama') && ollamaUrl) {
        handleSummarize();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoSummarize, ollamaUrl, apiKey, aiProvider]);

  const handleSummarize = async () => {
    if (aiProvider === 'gemini') {
      if (!apiKey) {
        setError("Configure API Key do Gemini.");
        return;
      }
    } else {
      if (!ollamaUrl) {
        setError("Configure Ollama.");
        return;
      }
    }

    setLoading(true);
    setError(null);
    try {
      const textToSummarize = item.content || item.description || item.title;
      let result;

      if (aiProvider === 'gemini') {
        result = await summarizeWithGemini(textToSummarize, apiKey);
      } else {
        result = await summarizeWithOllama(textToSummarize, ollamaUrl, ollamaModel);
      }

      setSummary(result);
    } catch (error) {
      console.error(error);
      setError("Falha ao gerar resumo.");
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

  const copyToClipboard = () => {
      navigator.clipboard.writeText(item.link);
  };

  const getImage = () => {
    if (item.enclosure && item.enclosure.link) return item.enclosure.link;
    if (item.thumbnail) return item.thumbnail;
    const imgMatch = item.description?.match(/<img[^>]+src="([^">]+)"/);
    if (imgMatch) return imgMatch[1];
    return null;
  };

  const imageUrl = getImage();
  const cleanDescription = item.description?.replace(/<[^>]+>/g, '').substring(0, 150) + '...';

  const formatDate = (dateString) => {
    try {
      const date = new Date(dateString);
      if (isNaN(date)) return '';
      return date.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return '';
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 flex flex-col h-full overflow-hidden group border border-gray-100 dark:border-gray-700/50">
      <div className="relative overflow-hidden rounded-t-3xl">
        {imageUrl && !imageError ? (
            <div className="aspect-video w-full overflow-hidden relative">
                <img
                    src={imageUrl}
                    alt={item.title}
                    loading="lazy"
                    onError={() => setImageError(true)}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60 group-hover:opacity-80 transition-opacity duration-300" />
            </div>
        ) : (
            <div className="aspect-video bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 flex items-center justify-center relative">
                <Newspaper className="text-gray-400 dark:text-gray-500 w-12 h-12" />
            </div>
        )}

        {/* Category Badge */}
        {item.category && (
            <div className="absolute top-4 left-4 bg-blue-600/90 backdrop-blur-md text-white text-[10px] font-bold px-3 py-1.5 rounded-full shadow-lg uppercase tracking-wider z-10 border border-white/10">
                {item.category}
            </div>
        )}

        {/* Action Buttons Overlay */}
        <div className="absolute top-4 right-4 flex gap-2 translate-x-10 opacity-0 group-hover:translate-x-0 group-hover:opacity-100 transition-all duration-300 ease-out z-10">
             <button
                onClick={handleSummarize}
                disabled={loading || summary}
                className="bg-white/90 dark:bg-gray-900/90 text-indigo-600 dark:text-indigo-400 p-2.5 rounded-full hover:scale-110 transition-transform shadow-lg disabled:opacity-50 backdrop-blur-md border border-white/20"
                title="Resumir com IA"
             >
                {loading ? <Loader size={18} className="animate-spin" /> : <Sparkles size={18} />}
             </button>
             {telegramBotToken && (
                 <button
                    onClick={handleSendToTelegram}
                    disabled={sendingTelegram}
                    className="bg-white/90 dark:bg-gray-900/90 text-blue-500 dark:text-blue-400 p-2.5 rounded-full hover:scale-110 transition-transform shadow-lg backdrop-blur-md border border-white/20"
                    title="Enviar para Telegram"
                 >
                    {sendingTelegram ? <Loader size={18} className="animate-spin" /> :
                     telegramStatus === 'success' ? <Check size={18} /> :
                     <Send size={18} />}
                 </button>
             )}
             <button
                onClick={copyToClipboard}
                className="bg-white/90 dark:bg-gray-900/90 text-gray-500 p-2.5 rounded-full hover:scale-110 transition-transform shadow-lg backdrop-blur-md border border-white/20"
                title="Copiar Link"
             >
                <Copy size={18} />
             </button>
        </div>
      </div>

      <div className="p-6 flex flex-col flex-grow relative">
        <div className="flex items-center gap-2 mb-3 text-[11px] text-gray-400 font-bold uppercase tracking-wider">
             <span className="text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-2.5 py-1 rounded-full">{item.source}</span>
             <span className="text-gray-300">•</span>
             <span>{formatDate(item.pubDate)}</span>
        </div>

        <h3 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white mb-4 leading-tight group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
          <a href={item.link} target="_blank" rel="noopener noreferrer">
            {item.title}
          </a>
        </h3>

        <div className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed mb-6">
            {summary ? (
                <div className="bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-indigo-900/20 dark:to-blue-900/10 p-4 rounded-xl text-xs border border-indigo-100 dark:border-indigo-500/20 animate-in fade-in slide-in-from-bottom-2">
                    <div className="flex items-center gap-1.5 mb-2 text-indigo-600 dark:text-indigo-400 font-bold text-[10px] uppercase tracking-wider">
                        <Sparkles size={12} className="fill-current" /> Resumo Inteligente
                    </div>
                    <div className="prose prose-xs dark:prose-invert max-w-none text-indigo-900/80 dark:text-indigo-200">
                        {summary}
                    </div>
                </div>
            ) : (
                <p className="line-clamp-3 opacity-90 font-light">{cleanDescription}</p>
            )}
            {error && <p className="text-red-500 text-[10px] mt-2 font-medium bg-red-50 dark:bg-red-900/20 p-2 rounded-lg inline-block">{error}</p>}
        </div>

        <div className="mt-auto pt-4 border-t border-gray-100 dark:border-gray-700/50 flex justify-between items-center">
             <a
                href={item.link}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2 hover:gap-3 transition-all group/link"
             >
                Ler notícia completa
                <ExternalLink size={14} className="text-gray-400 group-hover/link:text-blue-500 transition-colors" />
             </a>
        </div>
      </div>
    </div>
  );
};

export default NewsCard;
