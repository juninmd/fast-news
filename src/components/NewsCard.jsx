import React, { useState, useEffect } from 'react';
import { summarizeWithOllama, classifyWithOllama } from '../services/ollamaService';
import { summarizeWithGemini, classifyWithGemini } from '../services/geminiService';
import { summarizeWithAiSdk, classifyWithAiSdk } from '../services/aiSdkService';
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
    'Educação': '📚',
    'Política': '🏛️',
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
    const noLinksText = text.replace(/https?:\/\/[^\s]+|www\.[^\s]+/g, '');
    let preHtmlText = noLinksText.replace(/\*\*(.*?)\*\*/g, '@@BOLD@@$1@@ENDBOLD@@');
    let htmlText = escapeHTML(preHtmlText);
    htmlText = htmlText.replace(/@@BOLD@@(.*?)@@ENDBOLD@@/g, '<b>$1</b>');
    return htmlText;
};

const NewsCard = ({ item, aiProvider, geminiApiKey, aiSdkProvider, aiSdkApiKey, aiSdkModel, ollamaUrl, ollamaModel, telegramBotToken, telegramChatId, autoSummarize }) => {
  const [summary, setSummary] = useState(null);
  const [aiCategory, setAiCategory] = useState(null);
  const [loading, setLoading] = useState(false);
  const [sendingTelegram, setSendingTelegram] = useState(false);
  const [telegramStatus, setTelegramStatus] = useState(null); // success, error
  const [error, setError] = useState(null);
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    if (autoSummarize && !summary && !loading && !error) {
      if (
        (aiProvider === 'ollama' && ollamaUrl) ||
        (aiProvider === 'gemini' && geminiApiKey) ||
        (aiProvider === 'ai-sdk' && aiSdkApiKey)
      ) {
        handleSummarize();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoSummarize, aiProvider, ollamaUrl, geminiApiKey, aiSdkApiKey, aiSdkProvider]);

  const handleSummarize = async () => {
    if (aiProvider === 'ollama' && !ollamaUrl) {
      setError("Configure Ollama.");
      return;
    }
    if (aiProvider === 'gemini' && !geminiApiKey) {
      setError("Configure a API Key do Gemini.");
      return;
    }
    if (aiProvider === 'ai-sdk' && !aiSdkApiKey) {
      setError(`Configure a API Key do ${aiSdkProvider} nas configurações do AI SDK.`);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const textToSummarize = item.content || item.description || item.title;
      let result;
      let classifiedCategory;

      if (aiProvider === 'gemini') {
          result = await summarizeWithGemini(textToSummarize, geminiApiKey);
          try {
             classifiedCategory = await classifyWithGemini(textToSummarize, geminiApiKey);
             if (classifiedCategory) setAiCategory(classifiedCategory);
          } catch (catError) {
             console.error("Failed to classify with Gemini:", catError);
          }
      } else if (aiProvider === 'ai-sdk') {
          result = await summarizeWithAiSdk(textToSummarize, aiSdkProvider, aiSdkApiKey, aiSdkModel);
          try {
              classifiedCategory = await classifyWithAiSdk(textToSummarize, aiSdkProvider, aiSdkApiKey, aiSdkModel);
              if (classifiedCategory) setAiCategory(classifiedCategory);
          } catch (catError) {
               console.error("Failed to classify with AI SDK:", catError);
          }
      } else {
          result = await summarizeWithOllama(textToSummarize, ollamaUrl, ollamaModel);
          try {
              classifiedCategory = await classifyWithOllama(textToSummarize, ollamaUrl, ollamaModel);
              if (classifiedCategory) setAiCategory(classifiedCategory);
          } catch (catError) {
               console.error("Failed to classify with Ollama:", catError);
          }
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
              if (aiProvider === 'gemini') {
                  finalCategory = await classifyWithGemini(textToClassify, geminiApiKey) || finalCategory;
              } else if (aiProvider === 'ai-sdk') {
                  finalCategory = await classifyWithAiSdk(textToClassify, aiSdkProvider, aiSdkApiKey, aiSdkModel) || finalCategory;
              } else if (ollamaUrl) {
                  finalCategory = await classifyWithOllama(textToClassify, ollamaUrl, ollamaModel) || finalCategory;
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
    <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-md hover:scale-105 transition-transform duration-300 h-full flex flex-col overflow-hidden group border border-slate-100 dark:border-slate-800">
      <div className="relative p-0 m-2 mt-2">
        <div className="relative overflow-hidden rounded-2xl shadow-inner border border-white/20 dark:border-white/5">
          {imageUrl && !imageError ? (
              <div className="aspect-[16/9] w-full overflow-hidden relative group-hover:after:absolute group-hover:after:inset-0 group-hover:after:bg-black/20 transition-all">
                  <img
                      src={imageUrl}
                      alt={item.title}
                      loading="lazy"
                      onError={() => setImageError(true)}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-900/40 to-transparent opacity-90 transition-opacity duration-300" />
              </div>
          ) : (
              <div className="aspect-[16/9] bg-gradient-to-br from-indigo-100 to-blue-100 dark:from-slate-800 dark:to-slate-900 flex items-center justify-center relative">
                  <Newspaper className="text-slate-400 dark:text-slate-600 w-16 h-16 opacity-50" />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900/50 to-transparent opacity-50 transition-opacity duration-300" />
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

      <div className="p-6 flex flex-col flex-grow relative">
        <h3 className="text-2xl md:text-3xl font-extrabold tracking-tight text-slate-800 dark:text-slate-100 mb-3 leading-snug group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-3 drop-shadow-sm">
          <a href={item.link} target="_blank" rel="noopener noreferrer" className="focus:outline-none before:absolute before:inset-0">
            {item.title}
          </a>
        </h3>

        <div className="text-[14px] text-slate-600 dark:text-slate-300 leading-relaxed mb-4 flex-grow font-medium">
            {summary ? (
                <div className="bg-gradient-to-br from-indigo-100/80 to-blue-100/60 dark:from-indigo-900/50 dark:to-blue-900/30 p-5 rounded-[1.5rem] border border-indigo-200/60 dark:border-indigo-500/30 animate-in fade-in slide-in-from-bottom-2 shadow-md">
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
      <div className="px-6 pb-6 mt-auto flex flex-col gap-3">
         <a
            href={item.link}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center w-full gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white py-3 rounded-xl text-sm font-bold transition-all duration-300 shadow-md hover:shadow-xl hover:shadow-blue-500/30 hover:-translate-y-0.5 active:scale-[0.98]"
         >
            <span>Acessar Notícia Completa</span>
            <ExternalLink size={15} className="transition-transform group-hover:translate-x-1" />
         </a>

         <div className="grid grid-cols-[1fr_1fr_auto] gap-3 pt-4 border-t border-slate-200/80 dark:border-slate-700/80">
             <button
                 onClick={handleSummarize}
                 disabled={loading || summary !== null}
                 title="Resumir e Classificar com IA"
                 className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-slate-50 hover:bg-indigo-50 dark:bg-slate-800/50 dark:hover:bg-indigo-900/30 text-slate-700 hover:text-indigo-700 dark:text-slate-300 dark:hover:text-indigo-300 font-semibold text-[13px] transition-all disabled:opacity-50 disabled:cursor-not-allowed border border-slate-200/60 dark:border-slate-700/60 hover:border-indigo-200 dark:hover:border-indigo-800/60"
             >
                 {loading ? <Loader size={15} className="animate-spin text-indigo-500" /> : <Sparkles size={15} className="text-indigo-500" />}
                 <span className="truncate">{summary ? 'Gerado por IA' : 'Resumir'}</span>
             </button>

             <button
                 onClick={handleSendToTelegram}
                 disabled={sendingTelegram || !telegramBotToken}
                 title="Enviar para Telegram (Canal)"
                 className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-slate-50 hover:bg-blue-50 dark:bg-slate-800/50 dark:hover:bg-blue-900/30 text-slate-700 hover:text-blue-700 dark:text-slate-300 dark:hover:text-blue-300 font-semibold text-[13px] transition-all disabled:opacity-50 disabled:cursor-not-allowed border border-slate-200/60 dark:border-slate-700/60 hover:border-blue-200 dark:hover:border-blue-800/60"
             >
                 {sendingTelegram ? (
                     <Loader size={15} className="animate-spin text-blue-500" />
                 ) : telegramStatus === 'success' ? (
                     <Check size={15} className="text-emerald-500" />
                 ) : (
                     <Send size={15} className="text-blue-500" />
                 )}
                 <span className="truncate">{telegramStatus === 'success' ? 'Enviado!' : 'Telegram'}</span>
             </button>

             <button
                 onClick={copyToClipboard}
                 title="Copiar Link"
                 className="flex items-center justify-center p-2.5 rounded-xl bg-slate-50 hover:bg-slate-200 dark:bg-slate-800/50 dark:hover:bg-slate-700 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors border border-slate-200/60 dark:border-slate-700/60 active:scale-[0.95]"
             >
<Copy size={15} />
             </button>
         </div>
      </div>
    </div>
  );
};

export default React.memo(NewsCard);
