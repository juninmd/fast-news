import { ExternalLink, Eye, Sparkles } from 'lucide-react';

const fmt = (date) => {
  const hours = Math.floor((Date.now() - new Date(date).getTime()) / 36e5);
  if (Number.isNaN(hours)) return 'sem data';
  if (hours < 1) return 'agora';
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
};

function Tile({ article, analysis, selected, onOpen, onAnalyze }) {
  const score = analysis?.score ?? article.usefulScore;
  return (
    <article className={`neo-tile group ${selected ? 'border-cyan-300/70' : 'border-ink'}`}>
      {article.imageUrl && (
        <div className="overflow-hidden">
          <img src={article.imageUrl} alt="" className="h-40 w-full object-cover transition-transform duration-500 group-hover:scale-105" />
        </div>
      )}
      <div className="flex min-h-72 flex-col p-4">
        <div className="mb-3 flex items-center justify-between gap-2">
          <span className="rounded-md bg-cyan-400/10 px-2 py-1 text-xs text-cyan-700 dark:text-cyan-200">{article.category}</span>
          <span className="rounded-full border border-ink px-2 py-1 text-xs font-bold text-muted">{score}/100</span>
        </div>
        <h3 className="text-lg font-black leading-tight text-strong">{article.title}</h3>
        <div className="mt-3 h-1 overflow-hidden rounded-full bg-zinc-800/20 dark:bg-zinc-800/70">
          <div className={`h-full ${score > 70 ? 'bg-emerald-300' : 'bg-amber-300'}`} style={{ width: `${Math.max(score, 8)}%` }} />
        </div>
        <p className="mt-3 line-clamp-3 text-sm leading-6 text-muted">{analysis?.summary || article.excerpt}</p>
        <div className="mt-auto pt-4">
          <p className="mb-3 truncate text-xs text-faint">{article.source} - {fmt(article.publishedAt)}</p>
          <div className="flex items-center gap-2">
            <button onClick={() => onOpen(article)} className="neo-action">
              <Eye className="h-4 w-4" /> Ler
            </button>
            <button onClick={() => onAnalyze(article)} className="neo-icon" title="Analisar com Ollama">
              <Sparkles className="h-4 w-4" />
            </button>
            <a href={article.url} target="_blank" rel="noreferrer" className="neo-icon" title="Abrir fonte">
              <ExternalLink className="h-4 w-4" />
            </a>
          </div>
        </div>
      </div>
    </article>
  );
}

export function ArticleGrid({ articles, analyses, selected, onOpen, onAnalyze, loading }) {
  if (!articles.length && !loading) {
    return <div className="rounded-lg border border-ink p-10 text-center text-muted">Nenhuma noticia encontrada.</div>;
  }

  return (
    <section className="grid gap-4 md:grid-cols-2">
      {articles.map((article) => (
        <Tile
          key={article.id}
          article={article}
          analysis={analyses[article.id]}
          selected={selected?.id === article.id}
          onOpen={onOpen}
          onAnalyze={onAnalyze}
        />
      ))}
    </section>
  );
}
