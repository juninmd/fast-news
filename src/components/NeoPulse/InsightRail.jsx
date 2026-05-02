import { Brain, Flame, Newspaper, Target } from 'lucide-react';

const stopwords = new Set(['para', 'com', 'uma', 'das', 'dos', 'que', 'por', 'the', 'and', 'from']);

function topTerms(articles) {
  const counts = new Map();
  articles.forEach((article) => {
    `${article.title} ${article.category}`.toLowerCase()
      .replace(/[^\p{L}\p{N}\s-]/gu, ' ')
      .split(/\s+/)
      .filter((word) => word.length > 3 && !stopwords.has(word))
      .forEach((word) => counts.set(word, (counts.get(word) || 0) + 1));
  });
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
}

function sectionTitle(label, icon) {
  const TitleIcon = icon;
  return (
    <p className="mb-3 flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-faint">
      <TitleIcon className="h-4 w-4" /> {label}
    </p>
  );
}

export function InsightRail({ articles, analyses, onFilter }) {
  const terms = topTerms(articles);
  const topSources = [...new Map(articles.map((item) => [item.source, item])).keys()].slice(0, 5);
  const best = articles.filter((item) => item.usefulScore >= 70).slice(0, 3);
  const insights = Object.values(analyses).filter((item) => item?.why).slice(0, 2);

  return (
    <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
      <section className="rounded-lg border border-ink bg-panel p-4">
        {sectionTitle('temas quentes', Flame)}
        <div className="flex flex-wrap gap-2">
          {terms.map(([term, count]) => (
            <button key={term} onClick={() => onFilter(term)} className="rounded-md bg-cyan-300/10 px-2.5 py-1.5 text-xs font-bold text-cyan-700 hover:bg-cyan-300/20 dark:text-cyan-100">
              {term} <span className="text-faint">{count}</span>
            </button>
          ))}
        </div>
      </section>
      <section className="rounded-lg border border-ink bg-panel p-4">
        {sectionTitle('fila executiva', Target)}
        <div className="space-y-3">
          {best.map((item) => (
            <button key={item.id} onClick={() => onFilter(item.category)} className="block w-full text-left">
              <span className="text-sm font-black leading-tight text-strong">{item.title}</span>
              <span className="mt-1 block text-xs text-faint">{item.source} - score {item.usefulScore}</span>
            </button>
          ))}
        </div>
      </section>
      <section className="rounded-lg border border-ink bg-panel p-4">
        {sectionTitle('leitura da IA', Brain)}
        <div className="space-y-3 text-sm leading-6 text-muted">
          {insights.length ? insights.map((item) => <p key={item.why}>{item.why}</p>) : <p>Aguardando Ollama analisar os primeiros sinais uteis.</p>}
        </div>
      </section>
      <section className="rounded-lg border border-ink bg-panel p-4">
        {sectionTitle('mix de fontes', Newspaper)}
        <div className="space-y-2">
          {topSources.map((source) => <p key={source} className="truncate text-sm text-muted">{source}</p>)}
        </div>
      </section>
    </aside>
  );
}
