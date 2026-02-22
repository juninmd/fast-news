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
    <div className="relative w-full h-[500px] rounded-3xl overflow-hidden shadow-2xl mb-12 group transition-all duration-500 hover:shadow-blue-900/20 border border-gray-200 dark:border-gray-800">
      {/* Background Image */}
      <div className="absolute inset-0 bg-gray-900">
        {imageUrl && !imageError ? (
          <img
            src={imageUrl}
            alt={item.title}
            onError={() => setImageError(true)}
            className="w-full h-full object-cover opacity-60 group-hover:scale-105 transition-transform duration-1000 ease-out"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900 opacity-80">
            <Newspaper className="text-gray-600 w-24 h-24" />
          </div>
        )}
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/60 to-transparent" />
      </div>

      {/* Content Container */}
      <div className="absolute bottom-0 left-0 w-full p-8 md:p-12 flex flex-col items-start z-10">

        {/* Metadata */}
        <div className="flex items-center gap-3 mb-4 animate-in slide-in-from-bottom-2 fade-in duration-500 delay-100">
            {item.category && (
                <span className="bg-blue-600 text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider shadow-lg shadow-blue-900/50 backdrop-blur-sm border border-white/10">
                    {item.category}
                </span>
            )}
            <span className="text-gray-300 text-xs font-medium flex items-center gap-1 bg-black/30 px-3 py-1 rounded-full backdrop-blur-sm border border-white/5">
                <Calendar size={12} />
                {formatDate(item.pubDate)}
            </span>
            <span className="text-blue-400 text-xs font-bold uppercase tracking-wider bg-black/30 px-3 py-1 rounded-full backdrop-blur-sm border border-white/5">
                {item.source}
            </span>
        </div>

        {/* Title */}
        <h1 className="text-3xl md:text-5xl font-bold text-white mb-4 leading-tight max-w-4xl drop-shadow-lg animate-in slide-in-from-bottom-4 fade-in duration-700 delay-200">
          <a href={item.link} target="_blank" rel="noopener noreferrer" className="hover:text-blue-400 transition-colors">
            {item.title}
          </a>
        </h1>

        {/* Description or Summary */}
        <div className="max-w-3xl mb-8 animate-in slide-in-from-bottom-6 fade-in duration-700 delay-300">
            {summary ? (
                <div className="bg-indigo-900/40 backdrop-blur-md p-5 rounded-2xl border border-indigo-500/30 text-indigo-100 shadow-xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-3 opacity-10">
                        <Sparkles size={64} />
                    </div>
                    <div className="flex items-center gap-2 mb-2 text-indigo-300 font-bold text-xs uppercase tracking-wider">
                        <Sparkles size={14} className="text-indigo-400 fill-indigo-400" />
                        Resumo Inteligente
                    </div>
                    <p className="text-sm md:text-base leading-relaxed font-medium relative z-10">
                        {summary}
                    </p>
                </div>
            ) : (
                <p className="text-gray-300 text-lg md:text-xl leading-relaxed line-clamp-2 md:line-clamp-3 font-light drop-shadow-md">
                    {cleanDescription}
                </p>
            )}
        </div>

        {/* Actions */}
        <div className="flex flex-wrap items-center gap-4 animate-in slide-in-from-bottom-8 fade-in duration-700 delay-500">
          <a
            href={item.link}
            target="_blank"
            rel="noopener noreferrer"
            className="group/btn flex items-center gap-2 bg-white text-gray-900 hover:bg-gray-100 px-6 py-3 rounded-xl font-bold transition-all transform hover:-translate-y-0.5 hover:shadow-lg hover:shadow-white/20 active:scale-95"
          >
            Ler Matéria Completa
            <ArrowRight size={18} className="group-hover/btn:translate-x-1 transition-transform" />
          </a>

          <button
            onClick={handleSummarize}
            disabled={loading || summary}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all transform hover:-translate-y-0.5 active:scale-95 backdrop-blur-sm border ${
                summary
                ? 'bg-green-500/20 border-green-500/50 text-green-300 cursor-default'
                : 'bg-white/10 border-white/20 text-white hover:bg-white/20 hover:border-white/40 hover:shadow-lg hover:shadow-black/20'
            }`}
          >
            {loading ? <Loader size={18} className="animate-spin" /> : <Sparkles size={18} />}
            <span>{loading ? 'Gerando Resumo...' : (summary ? 'Resumo Gerado' : `Resumir com ${aiProvider === 'gemini' ? 'Gemini' : 'IA'}`)}</span>
          </button>
        </div>

        {error && (
            <div className="mt-4 text-red-400 text-xs bg-red-900/30 border border-red-500/30 px-3 py-2 rounded-lg animate-in fade-in slide-in-from-bottom-2">
                {error}
            </div>
        )}

      </div>
    </div>
  );
};

export default HeroSection;
