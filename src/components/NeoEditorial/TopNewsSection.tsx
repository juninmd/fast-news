import { ExternalLink, Flame } from 'lucide-react';
import { useTopNews } from '../../hooks/useTopNews';
import type { TopNewsArticle } from '../../hooks/useTopNews';

const categoryColors: Record<string, string> = {
  'AI Frontier': 'bg-violet-500/20 text-violet-300',
  'Big Techs': 'bg-blue-500/20 text-blue-300',
  'Dev Tools': 'bg-emerald-500/20 text-emerald-300',
  Tecnologia: 'bg-sky-500/20 text-sky-300',
  Mundo: 'bg-teal-500/20 text-teal-300',
  Brasil: 'bg-green-500/20 text-green-300',
  default: 'bg-bg-tertiary text-text-secondary',
};

function importanceColor(score: number): string {
  if (score >= 80) return 'from-red-500 to-orange-500';
  if (score >= 60) return 'from-orange-500 to-yellow-500';
  if (score >= 40) return 'from-yellow-500 to-green-500';
  return 'from-green-500 to-teal-500';
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const h = Math.max(0, Math.floor(diff / 3_600_000));
  if (h < 1) return `${Math.max(1, Math.floor(diff / 60_000))}m`;
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

function TopCard({ article, onClick, featured = false }: {
  article: TopNewsArticle;
  onClick: () => void;
  featured?: boolean;
}) {
  const catClass = categoryColors[article.category] ?? categoryColors.default;
  const score = Math.round(article.importance_score ?? 0);

  return (
    <button
      onClick={onClick}
      className={`group relative overflow-hidden rounded-xl bg-bg-secondary text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-accent-primary/40 ${
        featured ? 'min-h-[420px] border border-accent-primary/30 shadow-glow' : 'border border-border-subtle'
      }`}
    >
      <div className={`relative overflow-hidden ${featured ? 'h-64' : 'h-28'}`}>
        {article.image_url ? (
          <img src={article.image_url} alt="" className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" loading="lazy" />
        ) : (
          <div className="flex h-full items-center justify-center bg-gradient-to-br from-bg-tertiary to-bg-secondary">
            <Flame className="h-10 w-10 text-accent-primary/30" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-bg-secondary via-bg-secondary/10 to-transparent" />
      </div>

      <div className={featured ? 'p-5' : 'p-3'}>
        <div className="mb-2 flex items-center gap-1.5">
          <span className={`rounded-full px-1.5 py-0.5 font-mono text-xs uppercase tracking-wider ${catClass}`}>
            {article.category}
          </span>
          <span className="ml-auto text-xs text-text-secondary">{timeAgo(article.published_at)}</span>
        </div>

        <h4 className={`mb-2 font-bold leading-tight text-text-primary transition-colors group-hover:text-accent-primary ${
          featured ? 'line-clamp-3 text-2xl' : 'line-clamp-2 text-sm'
        }`}>
          {article.title}
        </h4>
        {featured && article.summary && (
          <p className="mb-4 line-clamp-3 text-sm leading-relaxed text-text-secondary">{article.summary}</p>
        )}

        <div className="flex items-center justify-between">
          <span className="max-w-[140px] truncate font-mono text-xs text-text-secondary">{article.source}</span>
          <div className="flex items-center gap-1">
            <div className="h-1 w-16 overflow-hidden rounded-full bg-bg-tertiary">
              <div className={`h-full rounded-full bg-gradient-to-r ${importanceColor(score)}`} style={{ width: `${score}%` }} />
            </div>
            <span className="font-numbers text-xs text-text-secondary">{score}</span>
          </div>
        </div>
      </div>

      <div className="absolute right-2 top-2 opacity-0 transition-opacity group-hover:opacity-100">
        <div className="rounded-lg bg-bg-secondary/80 p-1 backdrop-blur-sm">
          <ExternalLink className="h-3 w-3 text-accent-primary" />
        </div>
      </div>
    </button>
  );
}

function SkeletonCard() {
  return (
    <div className="min-h-56 rounded-xl border border-border-subtle bg-bg-secondary animate-pulse">
      <div className="h-32 bg-bg-tertiary" />
      <div className="space-y-2 p-3">
        <div className="h-3 w-1/2 rounded bg-bg-tertiary" />
        <div className="h-4 rounded bg-bg-tertiary" />
        <div className="h-4 w-3/4 rounded bg-bg-tertiary" />
      </div>
    </div>
  );
}

export function TopNewsSection({ onArticleClick }: { onArticleClick: (id: string) => void }) {
  const { articles, loading } = useTopNews();

  if (!loading && articles.length === 0) return null;

  return (
    <section className="mb-8">
      <div className="mb-4 flex items-center gap-2">
        <Flame className="h-5 w-5 text-orange-400" />
        <h2 className="font-display text-base font-bold text-text-primary">Noticias principais</h2>
        <span className="ml-1 text-xs text-text-secondary">rankeadas por IA</span>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.8fr)]">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
        ) : (
          <>
            <TopCard article={articles[0]} featured onClick={() => onArticleClick(articles[0].id)} />
            <div className="grid gap-3">
              {articles.slice(1, 5).map((a) => (
                <TopCard key={a.id} article={a} onClick={() => onArticleClick(a.id)} />
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  );
}
