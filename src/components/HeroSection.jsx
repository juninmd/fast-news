import React, { useState } from 'react';
import { summarizeWithOllama } from '../services/ollamaService';
import { summarizeWithGemini } from '../services/geminiService';
import { Sparkles, Loader, ExternalLink, Calendar, Newspaper, ArrowRight, X } from 'lucide-react';
import { summarizeWithAiSdk } from '../services/aiSdkService';

const HeroSection = ({ item, aiProvider, geminiApiKey, aiSdkProvider, aiSdkApiKey, aiSdkModel, ollamaUrl, ollamaModel }) => {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [imageError, setImageError] = useState(false);

  if (!item) return null;

  const handleSummarize = async () => {
    if (aiProvider === 'ollama' && !ollamaUrl) {
      setError("Configure o Ollama nas configurações.");
      return;
    }
    if (aiProvider === 'gemini' && !geminiApiKey) {
      setError("Configure a API Key do Gemini nas configurações.");
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

      if (aiProvider === 'gemini') {
          result = await summarizeWithGemini(textToSummarize, geminiApiKey);
      } else if (aiProvider === 'ai-sdk') {
          result = await summarizeWithAiSdk(textToSummarize, aiSdkProvider, aiSdkApiKey, aiSdkModel);
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
    <div className="relative w-full h-[600px] md:h-[700px] rounded-[3rem] overflow-hidden shadow-[0_30px_60px_-15px_rgba(0,0,0,0.5)] mb-16 group border border-slate-100/10 dark:border-slate-800/80">
      {/* Background Image */}
      <div className="absolute inset-0 bg-[#020617]">
        {imageUrl && !imageError ? (
          <img
            src={imageUrl}
            alt={item.title}
            onError={() => setImageError(true)}
            className="w-full h-full object-cover opacity-70 group-hover:scale-110 transition-transform duration-[3000ms] ease-out"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-950 opacity-90">
            <Newspaper className="text-slate-700 w-40 h-40" />
          </div>
        )}
        {/* Advanced Gradient Overlay for Glassmorphism base */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#020617] via-[#020617]/80 to-transparent mix-blend-multiply" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#020617]/90 via-transparent to-transparent" />
      </div>

      {/* Content Container */}
      <div className="absolute bottom-0 left-0 w-full p-8 md:p-16 flex flex-col items-start z-10">

        {/* Metadata Glass Badge */}
        <div className="flex flex-wrap items-center gap-3 mb-6 animate-in slide-in-from-bottom-4 fade-in duration-1000 delay-100">
            {item.category && (
                <span className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xs font-black px-5 py-2 rounded-full uppercase tracking-widest shadow-[0_0_20px_rgba(37,99,235,0.4)] border border-blue-400/20">
                    {item.category}
                </span>
            )}
            <span className="text-slate-200 text-sm font-semibold flex items-center gap-2 bg-white/10 px-5 py-2 rounded-full backdrop-blur-xl border border-white/10 shadow-lg">
                <Calendar size={14} className="opacity-70" />
                {formatDate(item.pubDate)}
            </span>
            <span className="text-blue-300 text-sm font-bold uppercase tracking-wider bg-white/10 px-5 py-2 rounded-full backdrop-blur-xl border border-white/10 shadow-lg">
                {item.source}
            </span>
        </div>

        {/* Title */}
        <h1 className="text-4xl md:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-300 mb-6 leading-[1.1] max-w-5xl tracking-tight drop-shadow-2xl animate-in slide-in-from-bottom-8 fade-in duration-1000 delay-200">
          <a href={item.link} target="_blank" rel="noopener noreferrer" className="hover:text-blue-400 transition-colors drop-shadow-sm">
            {item.title}
          </a>
        </h1>

        {/* Description or Summary */}
        <div className="max-w-4xl mb-12 animate-in slide-in-from-bottom-10 fade-in duration-1000 delay-300 w-full">
            {summary ? (
                <div className="bg-white/5 backdrop-blur-3xl p-8 rounded-3xl border border-white/10 text-slate-100 shadow-[0_8px_32px_0_rgba(0,0,0,0.3)] relative overflow-hidden group/summary">
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-purple-500/10 opacity-0 group-hover/summary:opacity-100 transition-opacity duration-500" />
                    <div className="absolute top-0 right-0 p-6 opacity-10 mix-blend-overlay">
                        <Sparkles size={120} />
                    </div>
                    <div className="flex items-center gap-3 mb-4 text-blue-400 font-black text-sm uppercase tracking-widest relative z-10">
                        <span className="relative flex h-3 w-3">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500"></span>
                        </span>
                        Resumo IA {aiProvider === 'ai-sdk' ? aiSdkProvider : aiProvider}
                    </div>
                    <p className="text-lg md:text-xl leading-relaxed font-medium relative z-10 text-slate-200 drop-shadow-sm">
                        {summary}
                    </p>
                </div>
            ) : (
                <p className="text-slate-300 text-lg md:text-2xl leading-relaxed line-clamp-2 md:line-clamp-3 font-medium drop-shadow-xl max-w-3xl">
                    {cleanDescription}
                </p>
            )}
        </div>

        {/* Actions */}
        <div className="flex flex-wrap items-center gap-5 animate-in slide-in-from-bottom-12 fade-in duration-1000 delay-500">
          <a
            href={item.link}
            target="_blank"
            rel="noopener noreferrer"
            className="group/btn flex items-center gap-3 bg-white text-slate-900 hover:bg-slate-100 px-8 py-4 rounded-full font-bold transition-all transform hover:-translate-y-1 hover:shadow-[0_0_30px_rgba(255,255,255,0.3)] active:scale-95 text-[1rem]"
          >
            Ler Matéria Completa
            <ArrowRight size={18} className="group-hover/btn:translate-x-1.5 transition-transform" />
          </a>

          <button
            onClick={handleSummarize}
            disabled={loading || summary}
            className={`flex items-center gap-3 px-8 py-4 rounded-full font-bold transition-all transform hover:-translate-y-1 active:scale-95 backdrop-blur-xl border text-[1rem] ${
                summary
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.2)] cursor-default'
                : 'bg-blue-600/20 border-blue-500/30 text-blue-300 hover:bg-blue-600/40 hover:border-blue-500/50 hover:text-white hover:shadow-[0_0_30px_rgba(37,99,235,0.4)]'
            }`}
          >
            {loading ? <Loader size={20} className="animate-spin" /> : <Sparkles size={20} />}
            <span>{loading ? 'Processando com IA...' : (summary ? 'Resumo Gerado' : `Resumir com IA`)}</span>
          </button>
        </div>

        {error && (
            <div className="mt-8 text-red-200 text-sm font-semibold bg-red-900/50 border border-red-500/50 px-5 py-4 rounded-2xl backdrop-blur-xl shadow-2xl animate-in fade-in slide-in-from-bottom-2 flex items-center gap-3">
                <span className="bg-red-500 text-white rounded-full p-1"><X size={14}/></span>
                {error}
            </div>
        )}

      </div>
    </div>
  );
};

export default React.memo(HeroSection);
