import React, { useState, useCallback } from 'react';
import { summarizeWithOllama, classifyWithOllama } from '../services/ollamaService';
import { summarizeWithGemini } from '../services/geminiService';
import { sendToTelegram } from '../services/telegramService';
import { ExternalLink, Sparkles, Loader, Send, Check, Copy, Newspaper, Clock } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import BookmarkButton from './BookmarkButton';

const NewsCard = ({ item, aiProvider, apiKey, ollamaUrl, ollamaModel, telegramBotToken, telegramChatId }) => {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [sendingTelegram, setSendingTelegram] = useState(false);
  const [telegramStatus, setTelegramStatus] = useState(null);
  const [error, setError] = useState(null);
  const [imageError, setImageError] = useState(false);

  const handleSummarize = useCallback(async () => {
    if (aiProvider === 'gemini' && !apiKey) {
      setError("Configure API Key do Gemini.");
      return;
    }
    if ((!aiProvider || aiProvider === 'ollama') && !ollamaUrl) {
      setError("Configure Ollama.");
      return;
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
    } catch (err) {
      console.error(err);
      setError("Falha ao gerar resumo.");
    } finally {
      setLoading(false);
    }
  }, [aiProvider, apiKey, ollamaUrl, ollamaModel, item]);

  const handleSendToTelegram = useCallback(async () => {
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
  }, [aiProvider, ollamaUrl, ollamaModel, telegramBotToken, telegramChatId, item, summary]);

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

  const estimateReadTime = (text) => {
    const words = text?.split(/\s+/).length || 0;
    return Math.max(1, Math.ceil(words / 200));
  };

  const getRelatedArticles = () => {
    if (!item.title) return [];
    const keywords = item.title.toLowerCase().split(/\s+/).filter(w => w.length > 4);
    return keywords.slice(0, 3);
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

          {item.category && (
            <div className="absolute top-3 left-3 bg-white/80 dark:bg-slate-900/80 backdrop-blur-lg text-slate-800 dark:text-slate-200 text-[10px] font-extrabold px-3 py-1.5 rounded-full shadow-sm uppercase tracking-wider z-10">
                {item.category}
            </div>
          )}

          <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between z-10">
            <div className="flex items-center gap-2 text-[11px] font-medium text-white/90 drop-shadow-md">
              <span className="bg-blue-600/80 backdrop-blur-sm px-2.5 py-1 rounded-md">{item.source}</span>
              <span className="bg-black/40 backdrop-blur-sm px-2.5 py-1 rounded-md">{formatDate(item.pubDate)}</span>
            </div>
            <BookmarkButton item={item} className="!bg-black/40 backdrop-blur-sm !rounded-md p-1.5" />
          </div>
        </div>
      </div>

      <div className="px-6 py-5 flex flex-col flex-grow relative">
        <h3 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white mb-3 leading-[1.3] group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-3">
          <a href={item.link} target="_blank" rel="noopener noreferrer" className="focus:outline-none before:absolute before:inset-0">
            {item.title}
          </a>
        </h3>

        <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 mb-3">
          <span className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-md">
            <Clock size={12} />{estimateReadTime(item.title)} min
          </span>
          <span className="flex items-center gap-1">
            {getRelatedArticles().map((kw, i) => (
              <span key={i} className="bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-full text-[10px]">#{kw}</span>
            ))}
          </span>
        </div>

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

      <div className="px-5 pb-5 mt-auto bg-slate-50/50 dark:bg-slate-900/50 flex flex-col gap-3">
        <div className="flex gap-2 w-full justify-between items-center mb-2">
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
