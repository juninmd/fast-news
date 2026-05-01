import ReactMarkdown from 'react-markdown';
import { ExternalLink, Loader, Sparkles, X } from 'lucide-react';

export function ReaderPanel({ article, analysis, fullContent, fullLoading, onClose, onAnalyze }) {
  if (!article) return null;
  const markdown = fullContent || article.body || article.excerpt;

  return (
    <aside className="fixed inset-y-0 right-0 z-50 w-full max-w-2xl overflow-y-auto border-l border-white/10 bg-zinc-950 shadow-2xl lg:w-[46rem]">
      <div className="sticky top-0 flex items-center gap-2 border-b border-white/10 bg-zinc-950/90 p-4 backdrop-blur">
        <button onClick={onClose} className="neo-icon" title="Fechar">
          <X className="h-5 w-5" />
        </button>
        <button onClick={() => onAnalyze(article)} className="neo-action">
          <Sparkles className="h-4 w-4" /> Ollama
        </button>
        <a href={article.url} target="_blank" rel="noreferrer" className="neo-action ml-auto">
          Fonte <ExternalLink className="h-4 w-4" />
        </a>
      </div>
      {article.imageUrl && <img src={article.imageUrl} alt="" className="h-72 w-full object-cover" />}
      <div className="p-6">
        <p className="mb-3 text-xs uppercase tracking-[0.24em] text-cyan-200">{article.source} · {article.category}</p>
        <h2 className="text-3xl font-black leading-tight text-white">{article.title}</h2>
        {fullLoading && (
          <p className="mt-4 flex items-center gap-2 text-sm text-cyan-200">
            <Loader className="h-4 w-4 animate-spin" /> Buscando post completo...
          </p>
        )}
        {analysis && (
          <div className="my-5 rounded-lg border border-cyan-400/20 bg-cyan-400/10 p-4">
            <p className="text-sm font-bold text-cyan-100">Utilidade: {analysis.useful ? 'alta' : 'baixa'} · {analysis.score}/100</p>
            <p className="mt-2 text-sm text-zinc-300">{analysis.why}</p>
          </div>
        )}
        <div className="prose prose-invert max-w-none prose-p:leading-7 prose-a:text-cyan-300">
          {analysis?.summary && <ReactMarkdown>{`> ${analysis.summary}`}</ReactMarkdown>}
          <ReactMarkdown>{markdown}</ReactMarkdown>
        </div>
        {analysis?.actions?.length > 0 && (
          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            {analysis.actions.map((item) => <div key={item} className="rounded-lg bg-white/5 p-3 text-sm text-zinc-200">{item}</div>)}
            {analysis.risks.map((item) => <div key={item} className="rounded-lg bg-amber-300/10 p-3 text-sm text-amber-100">{item}</div>)}
          </div>
        )}
      </div>
    </aside>
  );
}
