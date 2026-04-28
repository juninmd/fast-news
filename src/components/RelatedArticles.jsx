import React, { useState, useEffect, useCallback } from 'react';
import { Link2, Loader, ArrowRight, Sparkles, X } from 'lucide-react';

const RelatedArticles = ({ currentArticle, allArticles, maxResults = 3 }) => {
  const [related, setRelated] = useState([]);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const findRelated = useCallback(() => {
    if (!currentArticle?.title || !allArticles?.length) return [];

    const words = currentArticle.title.toLowerCase().split(/\s+/)
      .filter(w => w.length > 4 && !commonWords.has(w))
      .slice(0, 5);

    const scored = allArticles
      .filter(a => a.id !== currentArticle.id)
      .map(article => {
        let score = 0;
        const articleWords = article.title.toLowerCase();

        words.forEach(word => {
          if (articleWords.includes(word)) score += 2;
        });

        if (article.category === currentArticle.category) score += 3;
        if (article.source === currentArticle.source) score += 1;

        return { ...article, score };
      })
      .filter(a => a.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, maxResults);

    return scored;
  }, [currentArticle, allArticles, maxResults]);

  useEffect(() => {
    setLoading(true);
    const timer = setTimeout(() => {
      const found = findRelated();
      setRelated(found);
      setLoading(false);
    }, 800);
    return () => clearTimeout(timer);
  }, [findRelated]);

  if (related.length === 0 && !loading) return null;

  return (
    <div className="mt-4 p-4 bg-gradient-to-br from-blue-50/50 to-indigo-50/50 dark:from-blue-900/10 dark:to-indigo-900/10 rounded-2xl border border-blue-100/50 dark:border-blue-800/30">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 text-xs font-bold uppercase tracking-wider">
          <Sparkles size={14} />
          Artigos Relacionados
        </div>
        <button onClick={() => setExpanded(!expanded)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
          {expanded ? <X size={16} /> : <ArrowRight size={16} />}
        </button>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-sm">
          <Loader size={14} className="animate-spin" />
          Analisando artigos...
        </div>
      ) : expanded ? (
        <div className="space-y-3">
          {related.map((article) => (
            <a
              key={article.id}
              href={article.link}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-start gap-3 p-3 bg-white/80 dark:bg-slate-800/80 rounded-xl hover:shadow-md transition-all group"
            >
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-medium text-slate-400 dark:text-slate-500 mb-1">{article.source}</p>
                <h4 className="text-sm font-medium text-slate-800 dark:text-slate-200 line-clamp-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                  {article.title}
                </h4>
              </div>
              <Link2 size={14} className="text-slate-300 group-hover:text-blue-500 mt-1" />
            </a>
          ))}
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {related.map((article) => (
            <span key={article.id} className="text-xs px-3 py-1.5 bg-white/80 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 rounded-full border border-slate-200/50 dark:border-slate-700/50">
              {article.title.substring(0, 40)}...
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

const commonWords = new Set([
  'para', 'como', 'mais', 'sobre', 'essa', 'este', 'este', 'entre', 'sendo',
  'após', 'apenas', 'pode', 'deve', 'sobre', 'com', 'para', 'que', 'uma',
  'este', 'está', 'for', 'ser', 'ano', 'após', 'sua', 'seu', 'muito', 'mais'
]);

export default RelatedArticles;