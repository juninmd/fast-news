import React, { useState, useEffect } from 'react';
import { summarizeWithOllama, classifyWithOllama } from '../services/ollamaService';
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
          let finalCategory = item.category || 'Geral';

          if ((!aiProvider || aiProvider === 'ollama') && ollamaUrl) {
              const textToClassify = item.content || item.description || item.title;
              finalCategory = await classifyWithOllama(textToClassify, ollamaUrl, ollamaModel);
          }

          const categoryHashtag = finalCategory.replace(/\s+/g, '');
          const hashtags = `#${categoryHashtag} #Notícias`;

          const textToSend = `*${finalCategory.toUpperCase()}*\n───────────────\n*${item.title}*\n\n${summary || item.description || ''}\n\n_${hashtags}_\n\n[Ler matéria completa](${item.link})`;
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
    <div className="bg-gradient-to-br from-white to-slate-50 dark:from-slate-900 dark:to-slate-800 rounded-[2rem] shadow-2xl dark:shadow-black/60 hover:shadow-[0_20px_40px_-15px_rgba(59,130,246,0.3)] dark:hover:shadow-[0_20px_40px_-15px_rgba(59,130,246,0.2)] hover:-translate-y-4 transition-all duration-500 h-full flex flex-col overflow-hidden group border border-slate-200/60 dark:border-slate-700/60 ring-1 ring-black/5 dark:ring-white/10">
      <div className="relative p-4">
        <div className="relative overflow-hidden rounded-[1.5rem] shadow-md">
          {imageUrl && !imageError ? (
              <div className="aspect-video w-full overflow-hidden relative">
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
              <div className="aspect-video bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-indigo-900/20 dark:to-blue-900/20 flex items-center justify-center relative">
                  <Newspaper className="text-indigo-400 dark:text-indigo-500 w-16 h-16 opacity-50" />
              </div>
          )}

          {/* Category Badge */}
          {item.category && (
              <div className="absolute top-3 left-3 bg-white/80 dark:bg-slate-900/80 backdrop-blur-lg text-slate-800 dark:text-slate-200 text-[10px] font-extrabold px-3 py-1.5 rounded-full shadow-sm uppercase tracking-wider z-10">
                  {item.category}
              </div>
          )}

          {/* Source and Date on Image Bottom */}
          <div className="absolute bottom-3 left-3 flex items-center gap-2 text-xs font-medium text-white/90 drop-shadow-md z-10">
               <span className="bg-blue-600/80 backdrop-blur-sm px-2.5 py-1 rounded-md">{item.source}</span>
               <span className="bg-black/40 backdrop-blur-sm px-2.5 py-1 rounded-md">{formatDate(item.pubDate)}</span>
          </div>
        </div>
      </div>

      <div className="px-7 py-5 flex flex-col flex-grow relative bg-gradient-to-b from-transparent to-slate-50/50 dark:to-slate-800/50">
        <h3 className="text-[1.65rem] font-extrabold tracking-tight text-slate-900 dark:text-white mb-4 leading-tight group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-3">
          <a href={item.link} target="_blank" rel="noopener noreferrer" className="focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 rounded-sm">
            {item.title}
          </a>
        </h3>

        <div className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed mb-4 flex-grow font-medium">
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
      <div className="px-7 pb-7 mt-auto flex flex-col gap-4">
         <div className="flex gap-3 w-full justify-between items-center border-t-2 border-slate-100 dark:border-slate-800/60 pt-5">
             <div className="flex gap-2">
                  <button
                      onClick={handleSummarize}
                      disabled={loading || summary}
                      className="bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 shadow-sm border border-slate-200 dark:border-slate-700 transition-colors disabled:opacity-50 flex items-center gap-1.5 text-xs font-bold"
                      title="Resumir com IA"
                  >
                      {loading ? <Loader size={14} className="animate-spin" /> : <Sparkles size={14} />}
                      <span className="hidden sm:inline">Resumir</span>
                  </button>
                  {telegramBotToken && (
                      <button
                          onClick={handleSendToTelegram}
                          disabled={sendingTelegram}
                          className="bg-white dark:bg-slate-800 text-blue-500 dark:text-blue-400 p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 shadow-sm border border-slate-200 dark:border-slate-700 transition-colors disabled:opacity-50 flex items-center gap-1.5 text-xs font-bold"
                          title="Enviar para Telegram"
                      >
                          {sendingTelegram ? <Loader size={14} className="animate-spin" /> :
                           telegramStatus === 'success' ? <Check size={14} /> :
                           <Send size={14} />}
                           <span className="hidden sm:inline">Telegram</span>
                      </button>
                  )}
             </div>
              <button
                  onClick={copyToClipboard}
                  className="bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 shadow-sm border border-slate-200 dark:border-slate-700 transition-colors text-xs font-bold flex items-center gap-1.5"
                  title="Copiar Link"
              >
                  <Copy size={14} />
                  <span className="hidden sm:inline">Copiar</span>
              </button>
         </div>

         <a
            href={item.link}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center w-full gap-2 bg-slate-900 dark:bg-blue-600 hover:bg-slate-800 dark:hover:bg-blue-500 text-white shadow-md hover:shadow-xl py-3 rounded-xl text-sm font-bold transition-all duration-300 group/link active:scale-[0.98]"
         >
            Ler notícia completa
            <ExternalLink size={16} className="text-white/70 group-hover/link:text-white transition-colors" />
         </a>
      </div>
    </div>
  );
};

export default NewsCard;
