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
    <article className={`neo-tile ${selected ? 'border-cyan-300/70' : 'border-white/10'}`}>
      {article.imageUrl && <img src={article.imageUrl} alt="" className="h-40 w-full object-cover" />}
      <div className="flex min-h-72 flex-col p-4">
        <div className="mb-3 flex items-center justify-between gap-2">
          <span className="rounded-md bg-cyan-400/10 px-2 py-1 text-xs text-cyan-200">{article.category}</span>
          <span className="text-xs font-bold text-zinc-400">{score}/100</span>
        </div>
        <h3 className="text-lg font-black leading-tight text-white">{article.title}</h3>
        <p className="mt-3 line-clamp-3 text-sm leading-6 text-zinc-400">{analysis?.summary || article.excerpt}</p>
        <div className="mt-auto pt-4">
          <p className="mb-3 truncate text-xs text-zinc-500">{article.source} · {fmt(article.publishedAt)}</p>
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
    return <div className="rounded-lg border border-white/10 p-10 text-center text-zinc-400">Nenhuma noticia encontrada.</div>;
  }

  return (
    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
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
