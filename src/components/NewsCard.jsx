import React, { useState, useEffect } from 'react';
import { summarizeWithOllama, classifyWithOllama } from '../services/ollamaService';
import { summarizeWithGemini, classifyWithGemini } from '../services/geminiService';
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

const NewsCard = ({ item, aiProvider, apiKey, ollamaUrl, ollamaModel, telegramBotToken, telegramChatId, autoSummarize }) => {
  const [summary, setSummary] = useState(null);
  const [aiCategory, setAiCategory] = useState(null);
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

      try {
          const classifiedCategory = aiProvider === 'gemini'
              ? await classifyWithGemini(textToSummarize, apiKey)
              : await classifyWithOllama(textToSummarize, ollamaUrl, ollamaModel);
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
              if (aiProvider === 'gemini' && apiKey) {
                  finalCategory = await classifyWithGemini(textToClassify, apiKey);
              } else if ((!aiProvider || aiProvider === 'ollama') && ollamaUrl) {
                  finalCategory = await classifyWithOllama(textToClassify, ollamaUrl, ollamaModel);
              }
              setAiCategory(finalCategory); // cache it
          }

          const emoji = EMOJI_MAP[finalCategory] || '📰';
          const categoryHashtag = finalCategory.replace(/\s+/g, '');
          const hashtags = `#${categoryHashtag} #Notícias`;

          const textToSend = `*${emoji} ${finalCategory.toUpperCase()}*\n───────────────\n*${item.title}*\n\n${summary || item.description || ''}\n\n_${hashtags}_\n\n[Ler matéria completa](${item.link})`;
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
    <div className="bg-white dark:bg-slate-900 rounded-[2rem] shadow-sm hover:shadow-xl dark:hover:shadow-2xl hover:-translate-y-2 transition-all duration-500 h-full flex flex-col overflow-hidden group border border-slate-200/50 dark:border-slate-800/80">
      <div className="relative p-3">
        <div className="relative overflow-hidden rounded-[1.5rem]">
          {imageUrl && !imageError ? (
              <div className="aspect-[16/10] w-full overflow-hidden relative">
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
              <div className="aspect-[16/10] bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-indigo-900/20 dark:to-blue-900/20 flex items-center justify-center relative">
                  <Newspaper className="text-indigo-400 dark:text-indigo-500 w-16 h-16 opacity-50" />
              </div>
          )}

          {/* Category Badge */}
          {(aiCategory || item.category) && (
              <div className="absolute top-3 left-3 flex items-center gap-2 z-10">
                  <div className={`bg-white/80 dark:bg-slate-900/80 backdrop-blur-lg text-slate-800 dark:text-slate-200 text-[10px] font-extrabold px-3 py-1.5 rounded-full shadow-sm uppercase tracking-wider flex items-center gap-1 ${aiCategory ? 'border border-indigo-500/50 dark:border-indigo-400/50 shadow-indigo-500/20' : ''}`}>
                      {aiCategory && <Sparkles size={10} className="text-indigo-600 dark:text-indigo-400" />}
                      {aiCategory || item.category}
                  </div>
              </div>
          )}

          {/* Source Badge (Top Right) */}
          <div className="absolute top-3 right-3 bg-blue-600/90 dark:bg-blue-600/90 backdrop-blur-md text-white text-[10px] font-bold px-3 py-1.5 rounded-full shadow-lg border border-blue-400/30 z-10 flex items-center gap-1.5">
             <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>
             {item.source}
          </div>

          {/* Date on Image Bottom */}
          <div className="absolute bottom-3 left-3 flex items-center gap-2 text-xs font-medium text-white/90 drop-shadow-md z-10">
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

      {/* Footer Action Bar */}
      <div className="px-6 pb-6 mt-auto space-y-3">
         <a
            href={item.link}
            target="_blank"
            rel="noopener noreferrer"
            className="relative z-20 flex items-center justify-center w-full gap-2 bg-gradient-to-r from-slate-100 to-slate-200 hover:from-blue-600 hover:to-indigo-600 dark:from-slate-800 dark:to-slate-800/80 dark:hover:from-blue-600 dark:hover:to-indigo-600 text-slate-800 hover:text-white dark:text-slate-200 py-3.5 rounded-2xl text-sm font-bold transition-all duration-300 shadow-sm hover:shadow-[0_0_20px_rgba(37,99,235,0.4)] group/link"
         >
            Ler notícia completa
            <ExternalLink size={16} className="opacity-70 group-hover/link:opacity-100 group-hover/link:translate-x-1 transition-all" />
         </a>

         <div className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800/80">
             <button
                 onClick={handleSummarize}
                 disabled={loading || summary !== null}
                 title="Resumir e Classificar com IA"
                 className="flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-indigo-50/80 hover:bg-indigo-100 dark:bg-indigo-900/30 dark:hover:bg-indigo-800/50 text-indigo-700 dark:text-indigo-300 font-bold text-xs transition-all disabled:opacity-50 disabled:cursor-not-allowed group/btn hover:shadow-sm border border-indigo-100/50 dark:border-indigo-800/50"
             >
                 {loading ? <Loader size={16} className="animate-spin" /> : <Sparkles size={16} className="group-hover/btn:scale-110 group-hover/btn:rotate-12 transition-all text-indigo-500" />}
                 <span>{summary ? 'Resumo IA' : 'Resumir IA'}</span>
             </button>

             <button
                 onClick={handleSendToTelegram}
                 disabled={sendingTelegram || !telegramBotToken}
                 title="Enviar para Telegram (Canal)"
                 className="flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-blue-50/80 hover:bg-blue-100 dark:bg-blue-900/30 dark:hover:bg-blue-800/50 text-blue-700 dark:text-blue-300 font-bold text-xs transition-all disabled:opacity-50 disabled:cursor-not-allowed group/btn hover:shadow-sm border border-blue-100/50 dark:border-blue-800/50"
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
