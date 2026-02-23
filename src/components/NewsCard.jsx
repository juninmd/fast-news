import React, { useState, useEffect } from 'react';
import { summarizeWithOllama } from '../services/ollamaService';
import { summarizeWithGemini } from '../services/geminiService';
import { sendToTelegram } from '../services/telegramService';
import { ExternalLink, Sparkles, Loader, Calendar, Newspaper, Send, AlertTriangle, Check, Copy } from 'lucide-react';

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
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 flex flex-col h-full overflow-hidden group border border-gray-100 dark:border-gray-700/50 break-inside-avoid mb-6">
      <div className="relative">
        {imageUrl && !imageError ? (
            <div className="aspect-video w-full overflow-hidden relative">
                <img
                    src={imageUrl}
                    alt={item.title}
                    loading="lazy"
                    onError={() => setImageError(true)}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </div>
        ) : (
            <div className="aspect-[2/1] bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 flex items-center justify-center relative">
                <Newspaper className="text-gray-400 dark:text-gray-500 w-10 h-10" />
            </div>
        )}

        {/* Category Badge */}
        {item.category && (
            <div className="absolute top-3 left-3 bg-blue-600 text-white backdrop-blur-sm text-[10px] font-bold px-3 py-1 rounded-lg shadow-lg uppercase tracking-wide z-10">
                {item.category}
            </div>
        )}

        {/* Action Buttons Overlay */}
        <div className="absolute top-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10">
             <button
                onClick={handleSummarize}
                disabled={loading || summary}
                className="bg-white/90 dark:bg-gray-900/90 text-indigo-600 dark:text-indigo-400 p-2 rounded-full hover:scale-110 transition-transform shadow-sm disabled:opacity-50"
                title="Resumir com IA"
             >
                {loading ? <Loader size={16} className="animate-spin" /> : <Sparkles size={16} />}
             </button>
             {telegramBotToken && (
                 <button
                    onClick={handleSendToTelegram}
                    disabled={sendingTelegram}
                    className="bg-white/90 dark:bg-gray-900/90 text-blue-500 dark:text-blue-400 p-2 rounded-full hover:scale-110 transition-transform shadow-sm"
                    title="Enviar para Telegram"
                 >
                    {sendingTelegram ? <Loader size={16} className="animate-spin" /> :
                     telegramStatus === 'success' ? <Check size={16} /> :
                     <Send size={16} />}
                 </button>
             )}
             <button
                onClick={copyToClipboard}
                className="bg-white/90 dark:bg-gray-900/90 text-gray-500 p-2 rounded-full hover:scale-110 transition-transform shadow-sm"
                title="Copiar Link"
             >
                <Copy size={16} />
             </button>
        </div>
      </div>

      <div className="p-5 flex flex-col flex-grow">
        <div className="flex items-center gap-2 mb-3 text-[10px] text-gray-400 font-bold uppercase tracking-wider">
             <span className="text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded-full">{item.source}</span>
             <span>•</span>
             <span>{formatDate(item.pubDate)}</span>
        </div>

        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-3 leading-tight group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
          <a href={item.link} target="_blank" rel="noopener noreferrer">
            {item.title}
          </a>
        </h3>

        <div className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
            {summary ? (
                <div className="bg-indigo-50 dark:bg-indigo-900/20 p-3 rounded-lg text-xs border border-indigo-100 dark:border-indigo-800/30 animate-in fade-in">
                    <div className="flex items-center gap-1 mb-1 text-indigo-600 dark:text-indigo-400 font-bold text-[10px] uppercase">
                        <Sparkles size={10} /> IA Resumo
                    </div>
                    {summary}
                </div>
            ) : (
                <p className="line-clamp-3 opacity-80">{cleanDescription}</p>
            )}
            {error && <p className="text-red-500 text-[10px] mt-1">{error}</p>}
        </div>

        <div className="mt-auto pt-3 border-t border-gray-100 dark:border-gray-700/50 flex justify-between items-center">
             <a
                href={item.link}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-semibold text-gray-900 dark:text-white flex items-center gap-1 hover:gap-2 transition-all"
             >
                Ler notícia <ExternalLink size={12} className="text-gray-400" />
             </a>
        </div>
      </div>
    </div>
  );
};

export default NewsCard;
