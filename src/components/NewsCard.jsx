import React, { useState, useEffect } from 'react';
import { summarizeWithOllama, classifyWithOllama } from '../services/ollamaService';
import { sendToTelegram } from '../services/telegramService';
import { ExternalLink, Sparkles, Loader, Send, Check, Copy, Newspaper } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

const EMOJI_MAP = {
    'Tecnologia': '💻',
    'IA': '🤖',
    'Brasil': '🇧🇷',
    'Mundo': '🌍',
    'Negócios': '💼',
    'Ciência': '🔬',
    'Esportes': '⚽',
    'Automóveis': '🚗',
    'Entretenimento': '🍿',
    'Games': '🎮',
    'Saúde': '⚕️',
    'Cripto': '₿',
    'Marketing': '🚀',
    'Moda': '👗',
    'Música': '🎵',
    'Turismo': '✈️',
    'Geral': '📰'
};

const escapeHTML = (text) => {
    if (!text) return '';
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
};

const formatSummaryForTelegramHTML = (text) => {
    if (!text) return '';
    let htmlText = escapeHTML(text);
    htmlText = htmlText.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>');
    return htmlText;
};

const NewsCard = ({ item, ollamaUrl, ollamaModel, telegramBotToken, telegramChatId, autoSummarize }) => {
  const [summary, setSummary] = useState(null);
  const [aiCategory, setAiCategory] = useState(null);
  const [loading, setLoading] = useState(false);
  const [sendingTelegram, setSendingTelegram] = useState(false);
  const [telegramStatus, setTelegramStatus] = useState(null); // success, error
  const [error, setError] = useState(null);
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    if (autoSummarize && !summary && !loading && !error) {
      if (ollamaUrl) {
        handleSummarize();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoSummarize, ollamaUrl]);

  const handleSummarize = async () => {
    if (!ollamaUrl) {
      setError("Configure Ollama.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const textToSummarize = item.content || item.description || item.title;
      let result = await summarizeWithOllama(textToSummarize, ollamaUrl, ollamaModel);

      try {
          const classifiedCategory = await classifyWithOllama(textToSummarize, ollamaUrl, ollamaModel);
          if (classifiedCategory) {
               setAiCategory(classifiedCategory);
          }
      } catch (catError) {
           console.error("Failed to classify:", catError);
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
          let finalCategory = aiCategory || item.category || 'Geral';

          if (!aiCategory) {
              const textToClassify = item.content || item.description || item.title;
              if (ollamaUrl) {
                  finalCategory = await classifyWithOllama(textToClassify, ollamaUrl, ollamaModel);
              }
              setAiCategory(finalCategory); // cache it
          }

          const emoji = EMOJI_MAP[finalCategory] || '📰';
          const categoryHashtag = finalCategory.replace(/\s+/g, '');
          const hashtags = `#${categoryHashtag} #Notícias`;

          const safeTitle = escapeHTML(item.title);

          const formattedSummary = formatSummaryForTelegramHTML(summary || item.description || '');

          const textToSend = `<b>${emoji} ${finalCategory.toUpperCase()}</b>\n───────────────\n<b>${safeTitle}</b>\n\n${formattedSummary}\n\n<i>${hashtags}</i>\n\n<a href="${item.link}">Ler matéria completa</a>`;
          await sendToTelegram(textToSend, telegramBotToken, telegramChatId, 'HTML');
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
    <div className="bg-white dark:bg-slate-900 rounded-[2rem] shadow-sm hover:shadow-[0_15px_40px_-10px_rgba(0,0,0,0.1)] dark:hover:shadow-[0_15px_40px_-10px_rgba(255,255,255,0.05)] hover:-translate-y-2 transition-all duration-500 h-full flex flex-col overflow-hidden group border border-slate-200/50 dark:border-slate-800/80">
      <div className="relative p-2">
        <div className="relative overflow-hidden rounded-t-[1.8rem] rounded-b-2xl shadow-[inset_0_0_0_1px_rgba(0,0,0,0.05)] dark:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.05)]">
          {imageUrl && !imageError ? (
              <div className="aspect-[16/10] w-full overflow-hidden relative group-hover:after:absolute group-hover:after:inset-0 group-hover:after:bg-black/10 transition-all">
                  <img
                      src={imageUrl}
                      alt={item.title}
                      loading="lazy"
                      onError={() => setImageError(true)}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-900/30 to-slate-900/10 opacity-80 transition-opacity duration-300" />
              </div>
          ) : (
              <div className="aspect-[16/10] bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900 flex items-center justify-center relative">
                  <Newspaper className="text-slate-400 dark:text-slate-600 w-16 h-16 opacity-50" />
              </div>
          )}

          {/* Category Badge */}
          {(aiCategory || item.category) && (
              <div className="absolute top-3 left-3 flex items-center gap-2 z-10">
                  <div className={`bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl text-slate-800 dark:text-slate-200 text-[11px] font-black px-3 py-1.5 rounded-full shadow-lg shadow-black/5 uppercase tracking-wider flex items-center gap-1.5 border border-white/20 ${aiCategory ? 'bg-gradient-to-r from-blue-50/90 to-indigo-50/90 dark:from-blue-900/80 dark:to-indigo-900/80 text-indigo-700 dark:text-indigo-300 border-indigo-200/50 dark:border-indigo-700/50 shadow-indigo-500/20' : ''}`}>
                      {aiCategory && <Sparkles size={10} className="text-indigo-600 dark:text-indigo-400" />}
                      {aiCategory || item.category}
                  </div>
              </div>
          )}

          {/* Source Badge (Top Right) */}
          <div className="absolute top-3 right-3 bg-slate-900/80 dark:bg-black/60 backdrop-blur-md text-white text-[11px] font-bold px-3 py-1.5 rounded-full shadow-lg border border-white/10 z-10 flex items-center gap-1.5 group-hover:bg-blue-600/90 transition-colors">
             <span className="w-1.5 h-1.5 rounded-full bg-blue-400 group-hover:bg-white animate-pulse transition-colors"></span>
             {item.source}
          </div>

          {/* Date on Image Bottom */}
          <div className="absolute bottom-3 left-3 flex items-center gap-2 text-xs font-semibold text-white/90 drop-shadow-md z-10">
               <span className="bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/10 shadow-sm">{formatDate(item.pubDate)}</span>
          </div>
        </div>
      </div>

      <div className="px-6 py-5 flex flex-col flex-grow relative">
        <h3 className="text-2xl md:text-3xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-700 dark:from-white dark:to-slate-300 mb-3 leading-[1.2] group-hover:from-blue-600 group-hover:to-blue-500 dark:group-hover:from-blue-400 dark:group-hover:to-blue-300 transition-all line-clamp-3">
          <a href={item.link} target="_blank" rel="noopener noreferrer" className="focus:outline-none before:absolute before:inset-0">
            {item.title}
          </a>
        </h3>

        <div className="text-[15px] text-slate-600 dark:text-slate-300 leading-relaxed mb-4 flex-grow font-medium">
            {summary ? (
                <div className="bg-gradient-to-br from-indigo-50/50 to-blue-50/50 dark:from-indigo-900/20 dark:to-blue-900/10 p-4 rounded-2xl border border-indigo-100/50 dark:border-indigo-500/20 animate-in fade-in slide-in-from-bottom-2 shadow-sm">
                    <div className="flex items-center gap-1.5 mb-3 text-indigo-600 dark:text-indigo-400 font-bold text-[11px] uppercase tracking-wider">
                        <Sparkles size={14} className="fill-current" /> Resumo IA
                    </div>
                    <div className="prose prose-sm dark:prose-invert max-w-none text-slate-700 dark:text-slate-300 prose-p:leading-relaxed prose-li:my-1">
                        <ReactMarkdown>{summary}</ReactMarkdown>
                    </div>
                </div>
            ) : (
                <p className="line-clamp-3 opacity-90">{cleanDescription}</p>
            )}
            {error && <p className="text-red-500 text-[11px] mt-2 font-medium bg-red-50 dark:bg-red-900/20 px-3 py-1.5 rounded-lg inline-block">{error}</p>}
        </div>
      </div>

      {/* Footer Action Bar */}
      <div className="px-6 pb-6 mt-auto space-y-3">
         <a
            href={item.link}
            target="_blank"
            rel="noopener noreferrer"
            className="relative z-20 flex items-center justify-center w-full gap-2 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white py-3.5 rounded-2xl text-[15px] font-bold transition-all duration-300 shadow-sm hover:shadow-[0_0_20px_rgba(37,99,235,0.4)] group/link active:scale-[0.98] border border-transparent"
         >
            Ler notícia completa
            <ExternalLink size={18} className="opacity-80 group-hover/link:opacity-100 group-hover/link:translate-x-1 transition-all" />
         </a>

         <div className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800/80">
             <button
                 onClick={handleSummarize}
                 disabled={loading || summary !== null}
                 title="Resumir e Classificar com IA"
                 className="flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-indigo-50/80 hover:bg-indigo-200 dark:bg-indigo-900/30 dark:hover:bg-indigo-800/70 text-indigo-700 dark:text-indigo-300 font-bold text-xs transition-all disabled:opacity-50 disabled:cursor-not-allowed group/btn hover:shadow-md border border-indigo-100/50 dark:border-indigo-800/50"
             >
                 {loading ? <Loader size={16} className="animate-spin" /> : <Sparkles size={16} className="group-hover/btn:scale-110 group-hover/btn:rotate-12 transition-all text-indigo-500" />}
                 <span>{summary ? 'Resumo IA' : 'Resumir IA'}</span>
             </button>

             <button
                 onClick={handleSendToTelegram}
                 disabled={sendingTelegram || !telegramBotToken}
                 title="Enviar para Telegram (Canal)"
                 className="flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-blue-50/80 hover:bg-blue-200 dark:bg-blue-900/30 dark:hover:bg-blue-800/70 text-blue-700 dark:text-blue-300 font-bold text-xs transition-all disabled:opacity-50 disabled:cursor-not-allowed group/btn hover:shadow-md border border-blue-100/50 dark:border-blue-800/50"
             >
                 {sendingTelegram ? (
                     <Loader size={16} className="animate-spin" />
                 ) : telegramStatus === 'success' ? (
                     <Check size={16} className="text-emerald-500" />
                 ) : (
                     <Send size={16} className="group-hover/btn:scale-110 transition-transform group-hover/btn:translate-x-1 group-hover/btn:-translate-y-1 text-blue-500" />
                 )}
                 <span>{telegramStatus === 'success' ? 'Enviado!' : 'Telegram'}</span>
             </button>

             <button
                 onClick={copyToClipboard}
                 title="Copiar Link"
                 className="flex-none p-2.5 rounded-xl bg-slate-50 hover:bg-slate-200 dark:bg-slate-800/50 dark:hover:bg-slate-700 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors border border-slate-200/50 dark:border-slate-700/50"
             >
                 <Copy size={16} />
             </button>
         </div>
      </div>
    </div>
  );
};

export default NewsCard;
