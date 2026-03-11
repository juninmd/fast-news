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
    <div className="bg-white dark:bg-slate-900 rounded-[2rem] shadow-sm hover:shadow-[0_20px_50px_rgba(0,0,0,0.1)] dark:hover:shadow-[0_20px_50px_rgba(0,0,0,0.4)] hover:-translate-y-2 transition-all duration-500 h-full flex flex-col overflow-hidden group border border-slate-200/50 dark:border-slate-800/80">
      <div className="relative p-3">
        <div className="relative overflow-hidden rounded-[1.5rem]">
          {imageUrl && !imageError ? (
              <div className="aspect-[16/10] w-full overflow-hidden relative">
                  <img
                      src={imageUrl}
                      alt={item.title}
                      loading="lazy"
                      onError={() => setImageError(true)}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-900/30 to-slate-900/10 opacity-80 transition-opacity duration-300" />
              </div>
          ) : (
              <div className="aspect-[16/10] bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-indigo-900/20 dark:to-blue-900/20 flex items-center justify-center relative">
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

      <div className="px-6 py-5 flex flex-col flex-grow relative">
        <h3 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white mb-3 leading-[1.3] group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-3">
          <a href={item.link} target="_blank" rel="noopener noreferrer" className="focus:outline-none before:absolute before:inset-0">
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
      <div className="px-6 pb-6 mt-auto">
         <a
            href={item.link}
            target="_blank"
            rel="noopener noreferrer"
            className="relative z-20 flex items-center justify-center w-full gap-2 bg-slate-100 hover:bg-blue-600 dark:bg-slate-800 dark:hover:bg-blue-600 text-slate-700 hover:text-white dark:text-slate-300 dark:hover:text-white py-3.5 rounded-2xl text-sm font-bold transition-all duration-300 group/link"
         >
            Ler notícia completa
            <ExternalLink size={16} className="opacity-70 group-hover/link:opacity-100 transition-opacity" />
         </a>
      </div>
    </div>
  );
};

export default NewsCard;
