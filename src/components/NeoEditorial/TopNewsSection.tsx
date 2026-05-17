import { Flame, ExternalLink } from 'lucide-react';
import { useTopNews } from '../../hooks/useTopNews';
import type { TopNewsArticle } from '../../hooks/useTopNews';

const categoryColors: Record<string, string> = {
  'AI Frontier': 'bg-violet-500/20 text-violet-400',
  'Big Techs':   'bg-blue-500/20 text-blue-400',
  'Dev Tools':   'bg-emerald-500/20 text-emerald-400',
  'Tecnologia':  'bg-sky-500/20 text-sky-400',
  'Mundo':       'bg-teal-500/20 text-teal-400',
  'Brasil':      'bg-green-500/20 text-green-400',
  'Segurança':   'bg-red-500/20 text-red-400',
  'Startups':    'bg-pink-500/20 text-pink-400',
  default:       'bg-bg-tertiary text-text-secondary',
};

function importanceColor(score: number): string {
  if (score >= 80) return 'from-red-500 to-orange-500';
  if (score >= 60) return 'from-orange-500 to-yellow-500';
  if (score >= 40) return 'from-yellow-500 to-green-500';
  return 'from-green-500 to-teal-500';
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const h = Math.floor(diff / 3_600_000);
  if (h < 1) return `${Math.floor(diff / 60_000)}m`;
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

interface TopNewsSectionProps {
  onArticleClick: (id: string) => void;
}

function TopCard({ article, onClick }: { article: TopNewsArticle; onClick: () => void }) {
  const catClass = categoryColors[article.category] ?? categoryColors.default;
  const score = Math.round(article.importance_score ?? 0);

  return (
    <button
      onClick={onClick}
      className="group relative flex-shrink-0 w-64 rounded-xl overflow-hidden bg-bg-secondary border border-border-subtle hover:border-accent-primary/40 transition-all duration-200 text-left"
    >
      {article.image_url ? (
        <div className="relative h-32 overflow-hidden">
          <img src={article.image_url} alt="" className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" loading="lazy" />
          <div className="absolute inset-0 bg-gradient-to-t from-bg-secondary via-transparent to-transparent" />
        </div>
      ) : (
        <div className="h-32 bg-gradient-to-br from-bg-tertiary to-bg-secondary flex items-center justify-center">
          <span className="text-3xl opacity-30">{article.category === 'Brasil' ? '🇧🇷' : article.category === 'AI Frontier' ? '🤖' : '📰'}</span>
        </div>
      )}

      <div className="p-3">
        <div className="flex items-center gap-1.5 mb-2">
          <span className={`px-1.5 py-0.5 rounded-full text-xs font-mono uppercase tracking-wider ${catClass}`}>
            {article.category}
          </span>
          <span className="text-xs text-text-secondary ml-auto">{timeAgo(article.published_at)}</span>
        </div>

        <h4 className="text-sm font-bold text-text-primary leading-snug line-clamp-2 mb-2 group-hover:text-accent-primary transition-colors">
          {article.title}
        </h4>

        <div className="flex items-center justify-between">
          <span className="text-xs text-text-secondary font-mono truncate max-w-[120px]">{article.source}</span>
          <div className="flex items-center gap-1">
            <div className="w-16 h-1 rounded-full bg-bg-tertiary overflow-hidden">
              <div
                className={`h-full rounded-full bg-gradient-to-r ${importanceColor(score)} transition-all`}
                style={{ width: `${score}%` }}
              />
            </div>
            <span className="text-xs text-text-secondary font-numbers">{score}</span>
          </div>
        </div>
      </div>

      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <div className="p-1 rounded-lg bg-bg-secondary/80 backdrop-blur-sm">
          <ExternalLink className="w-3 h-3 text-accent-primary" />
        </div>
      </div>
    </button>
  );
}

function SkeletonCard() {
  return (
    <div className="flex-shrink-0 w-64 rounded-xl overflow-hidden bg-bg-secondary border border-border-subtle animate-pulse">
      <div className="h-32 bg-bg-tertiary" />
      <div className="p-3 space-y-2">
        <div className="h-3 bg-bg-tertiary rounded w-1/2" />
        <div className="h-4 bg-bg-tertiary rounded" />
        <div className="h-4 bg-bg-tertiary rounded w-3/4" />
        <div className="h-2 bg-bg-tertiary rounded w-full mt-2" />
      </div>
    </div>
  );
}

export function TopNewsSection({ onArticleClick }: TopNewsSectionProps) {
  const { articles, loading } = useTopNews();

  if (!loading && articles.length === 0) return null;

  return (
    <section className="mb-8">
      <div className="flex items-center gap-2 mb-4">
        <Flame className="w-5 h-5 text-orange-400" />
        <h2 className="text-base font-display font-bold text-text-primary">Top Notícias</h2>
        <span className="text-xs text-text-secondary ml-1">rankeadas por IA</span>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-3 scrollbar-hide">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
          : articles.map((a) => (
              <TopCard key={a.id} article={a} onClick={() => onArticleClick(a.id)} />
            ))}
      </div>
    </section>
  );
}
