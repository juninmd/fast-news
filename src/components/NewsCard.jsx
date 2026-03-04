import React, { useState, useEffect } from 'react';
import { summarizeWithOllama } from '../services/ollamaService';
import { summarizeWithGemini } from '../services/geminiService';
import { sendToTelegram } from '../services/telegramService';
import { ExternalLink, Sparkles, Loader, Send, Check, Copy, Newspaper } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

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
    <div className="bg-gradient-to-br from-white to-slate-50 dark:from-slate-900 dark:to-slate-800 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 h-full flex flex-col overflow-hidden group border border-slate-100 dark:border-slate-800">
      <div className="relative p-2">
        <div className="relative overflow-hidden rounded-2xl">
          {imageUrl && !imageError ? (
              <div className="aspect-[4/3] w-full overflow-hidden relative">
                  <img
                      src={imageUrl}
                      alt={item.title}
                      loading="lazy"
                      onError={() => setImageError(true)}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-slate-900/20 to-transparent opacity-80 group-hover:opacity-90 transition-opacity duration-300" />
              </div>
          ) : (
              <div className="aspect-[4/3] bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900 flex items-center justify-center relative">
                  <Newspaper className="text-slate-400 dark:text-slate-500 w-16 h-16 opacity-50" />
              </div>
          )}

          {/* Category Badge */}
          {item.category && (
              <div className="absolute top-3 left-3 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md text-slate-800 dark:text-slate-200 text-[10px] font-bold px-3 py-1.5 rounded-full shadow-sm uppercase tracking-wider z-10">
                  {item.category}
              </div>
          )}

          {/* Quick Actions Overlay */}
          <div className="absolute top-3 right-3 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transform translate-x-4 group-hover:translate-x-0 transition-all duration-300 z-10">
              <button
                  onClick={handleSummarize}
                  disabled={loading || summary}
                  className="bg-white/90 dark:bg-slate-900/90 text-indigo-600 dark:text-indigo-400 p-2.5 rounded-full hover:bg-white dark:hover:bg-slate-800 shadow-lg backdrop-blur-md transition-colors disabled:opacity-50"
                  title="Resumir com IA"
              >
                  {loading ? <Loader size={16} className="animate-spin" /> : <Sparkles size={16} />}
              </button>
              {telegramBotToken && (
                  <button
                      onClick={handleSendToTelegram}
                      disabled={sendingTelegram}
                      className="bg-white/90 dark:bg-slate-900/90 text-blue-500 dark:text-blue-400 p-2.5 rounded-full hover:bg-white dark:hover:bg-slate-800 shadow-lg backdrop-blur-md transition-colors disabled:opacity-50"
                      title="Enviar para Telegram"
                  >
                      {sendingTelegram ? <Loader size={16} className="animate-spin" /> :
                       telegramStatus === 'success' ? <Check size={16} /> :
                       <Send size={16} />}
                  </button>
              )}
              <button
                  onClick={copyToClipboard}
                  className="bg-white/90 dark:bg-slate-900/90 text-slate-600 dark:text-slate-400 p-2.5 rounded-full hover:bg-white dark:hover:bg-slate-800 shadow-lg backdrop-blur-md transition-colors"
                  title="Copiar Link"
              >
                  <Copy size={16} />
              </button>
          </div>

          {/* Source and Date on Image Bottom */}
          <div className="absolute bottom-3 left-3 flex items-center gap-2 text-[11px] font-medium text-white/90 drop-shadow-md z-10">
               <span className="bg-blue-600/80 backdrop-blur-sm px-2.5 py-1 rounded-md">{item.source}</span>
               <span className="bg-black/40 backdrop-blur-sm px-2.5 py-1 rounded-md">{formatDate(item.pubDate)}</span>
          </div>
        </div>
      </div>

      <div className="p-6 pt-4 flex flex-col flex-grow relative">
        <h3 className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-white mb-3 leading-snug group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-3">
          <a href={item.link} target="_blank" rel="noopener noreferrer" className="focus:outline-none">
            {item.title}
          </a>
        </h3>

        <div className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed mb-4 flex-grow">
            {summary ? (
                <div className="bg-gradient-to-br from-indigo-50/50 to-blue-50/50 dark:from-indigo-900/20 dark:to-blue-900/10 p-4 rounded-2xl border border-indigo-100/50 dark:border-indigo-500/20 animate-in fade-in slide-in-from-bottom-2">
                    <div className="flex items-center gap-1.5 mb-3 text-indigo-600 dark:text-indigo-400 font-bold text-[11px] uppercase tracking-wider">
                        <Sparkles size={14} className="fill-current" /> Resumo IA
                    </div>
                    <div className="prose prose-sm dark:prose-invert max-w-none text-slate-700 dark:text-slate-300">
                        <ReactMarkdown>{summary}</ReactMarkdown>
                    </div>
                </div>
            ) : (
                <p className="line-clamp-3">{cleanDescription}</p>
            )}
            {error && <p className="text-red-500 text-[11px] mt-2 font-medium bg-red-50 dark:bg-red-900/20 px-3 py-1.5 rounded-lg inline-block">{error}</p>}
        </div>
      </div>

      {/* Footer link */}
      <div className="px-5 pb-5 mt-auto">
         <a
            href={item.link}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center w-full gap-2 bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 py-3 rounded-xl text-sm font-semibold transition-colors group/link"
         >
            Ler notícia completa
            <ExternalLink size={16} className="text-slate-400 group-hover/link:text-blue-500 transition-colors" />
         </a>
      </div>
    </div>
  );
};

export default NewsCard;
