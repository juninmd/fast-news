import React, { useState } from 'react';
import { summarizeWithOllama } from '../services/ollamaService';
import { summarizeWithGemini } from '../services/geminiService';
import { Sparkles, Loader, ExternalLink, Calendar, Newspaper, ArrowRight } from 'lucide-react';

const HeroSection = ({ item, aiProvider, apiKey, ollamaUrl, ollamaModel }) => {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [imageError, setImageError] = useState(false);

  if (!item) return null;

  const handleSummarize = async () => {
    if (aiProvider === 'gemini') {
      if (!apiKey) {
        setError("Configure a API Key do Gemini nas configurações.");
        return;
      }
    } else {
      if (!ollamaUrl) {
        setError("Configure o Ollama nas configurações.");
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
      setError("Falha ao gerar resumo. Verifique suas configurações.");
    } finally {
      setLoading(false);
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
  const cleanDescription = item.description?.replace(/<[^>]+>/g, '').substring(0, 200) + '...';

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
    <div className="relative w-full h-[550px] md:h-[650px] rounded-[2.5rem] overflow-hidden shadow-2xl shadow-black/20 mb-16 group border border-slate-200/50 dark:border-slate-800/80">
      {/* Background Image */}
      <div className="absolute inset-0 bg-[#0f172a]">
        {imageUrl && !imageError ? (
          <img
            src={imageUrl}
            alt={item.title}
            onError={() => setImageError(true)}
            className="w-full h-full object-cover opacity-60 group-hover:scale-105 transition-transform duration-[2000ms] ease-out"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-800 to-slate-900 opacity-80">
            <Newspaper className="text-slate-600 w-32 h-32" />
          </div>
        )}
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0f172a] via-[#0f172a]/70 to-transparent" />
      </div>

      {/* Content Container */}
      <div className="absolute bottom-0 left-0 w-full p-8 md:p-16 flex flex-col items-start z-10">

        {/* Metadata */}
        <div className="flex flex-wrap items-center gap-4 mb-6 animate-in slide-in-from-bottom-4 fade-in duration-700 delay-100">
            {item.category && (
                <span className="bg-blue-600 text-white text-xs font-bold px-4 py-1.5 rounded-full uppercase tracking-wider shadow-lg shadow-blue-900/50 border border-white/10">
                    {item.category}
                </span>
            )}
            <span className="text-slate-200 text-sm font-medium flex items-center gap-1.5 bg-black/40 px-4 py-1.5 rounded-full backdrop-blur-md border border-white/10">
                <Calendar size={14} />
                {formatDate(item.pubDate)}
            </span>
            <span className="text-blue-300 text-sm font-bold uppercase tracking-wider bg-black/40 px-4 py-1.5 rounded-full backdrop-blur-md border border-white/10">
                {item.source}
            </span>
        </div>

        {/* Title */}
        <h1 className="text-4xl md:text-6xl font-black text-white mb-6 leading-[1.1] max-w-5xl tracking-tight drop-shadow-xl animate-in slide-in-from-bottom-8 fade-in duration-700 delay-200">
          <a href={item.link} target="_blank" rel="noopener noreferrer" className="hover:text-blue-400 transition-colors">
            {item.title}
          </a>
        </h1>

        {/* Description or Summary */}
        <div className="max-w-4xl mb-10 animate-in slide-in-from-bottom-10 fade-in duration-700 delay-300">
            {summary ? (
                <div className="bg-slate-900/60 backdrop-blur-2xl p-6 rounded-3xl border border-slate-700/50 text-slate-100 shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-[0.03]">
                        <Sparkles size={100} />
                    </div>
                    <div className="flex items-center gap-2 mb-3 text-blue-400 font-bold text-sm uppercase tracking-wider">
                        <Sparkles size={16} className="text-blue-400 fill-blue-400/20" />
                        Resumo IA
                    </div>
                    <p className="text-base md:text-[1.1rem] leading-relaxed font-medium relative z-10">
                        {summary}
                    </p>
                </div>
            ) : (
                <p className="text-slate-300 text-lg md:text-xl leading-relaxed line-clamp-2 md:line-clamp-3 font-medium drop-shadow-lg max-w-3xl">
                    {cleanDescription}
                </p>
            )}
        </div>

        {/* Actions */}
        <div className="flex flex-wrap items-center gap-4 animate-in slide-in-from-bottom-12 fade-in duration-700 delay-500">
          <a
            href={item.link}
            target="_blank"
            rel="noopener noreferrer"
            className="group/btn flex items-center gap-3 bg-blue-600 text-white hover:bg-blue-500 px-8 py-4 rounded-[1.25rem] font-bold transition-all transform hover:-translate-y-1 hover:shadow-xl hover:shadow-blue-600/30 active:scale-95 text-[1rem]"
          >
            Ler Matéria Completa
            <ArrowRight size={18} className="group-hover/btn:translate-x-1.5 transition-transform" />
          </a>

          <button
            onClick={handleSummarize}
            disabled={loading || summary}
            className={`flex items-center gap-3 px-8 py-4 rounded-[1.25rem] font-bold transition-all transform hover:-translate-y-1 active:scale-95 backdrop-blur-md border text-[1rem] ${
                summary
                ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300 cursor-default'
                : 'bg-slate-800/60 border-slate-700/80 text-white hover:bg-slate-800 hover:border-slate-600 hover:shadow-xl hover:shadow-black/20'
            }`}
          >
            {loading ? <Loader size={18} className="animate-spin" /> : <Sparkles size={18} />}
            <span>{loading ? 'Gerando...' : (summary ? 'Resumo Gerado' : `Resumir com IA`)}</span>
          </button>
        </div>

        {error && (
            <div className="mt-6 text-red-300 text-sm font-medium bg-red-900/40 border border-red-500/30 px-4 py-3 rounded-xl backdrop-blur-md animate-in fade-in slide-in-from-bottom-2">
                {error}
            </div>
        )}

      </div>
    </div>
  );
};

export default HeroSection;
