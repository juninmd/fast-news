import React from 'react';
import type { StoryDetail, ArticleNode } from '../../hooks/useStories';
import { StoryTimeline } from './StoryTimeline';

const IMPACT_COLORS: Record<string, string> = {
  critical: 'text-red-400',
  high: 'text-orange-400',
  medium: 'text-yellow-400',
  low: 'text-green-400',
};

const SIGNAL_COLORS: Record<string, string> = {
  bullish: 'text-green-400',
  bearish: 'text-red-400',
  neutral: 'text-gray-400',
};

interface Props {
  detail: StoryDetail;
  onClose: () => void;
  onArticleClick?: (article: ArticleNode) => void;
}

export function StoryDetailModal({ detail, onClose, onArticleClick }: Props) {
  const { story, articles, timeline } = detail;
  const signal = story.financialSignal ?? 'neutral';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto bg-bg-primary rounded-2xl border border-border shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-bg-primary border-b border-border p-4 flex items-start gap-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs px-2 py-0.5 rounded-full bg-surface-elevated text-text-secondary">
                {story.category}
              </span>
              <span className={`text-xs font-semibold ${IMPACT_COLORS[story.impactLevel]}`}>
                IMPACTO {story.impactLevel.toUpperCase()}
              </span>
              {story.financialSignal && (
                <span className={`text-xs font-bold ${SIGNAL_COLORS[signal]}`}>
                  {signal === 'bullish' ? '↑ Alta' : signal === 'bearish' ? '↓ Baixa' : '→ Neutro'}
                </span>
              )}
            </div>
            <h2 className="text-base font-bold text-text-primary">{story.title}</h2>
            {story.summary && (
              <p className="text-sm text-text-secondary mt-1">{story.summary}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-text-secondary hover:text-text-primary text-xl leading-none px-2"
          >
            ✕
          </button>
        </div>

        <div className="p-4 space-y-6">
          {/* World Impact */}
          {story.worldImpact && (
            <section>
              <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">
                Impacto no Mundo
              </h3>
              <p className="text-sm text-text-primary bg-surface rounded-lg p-3 border border-border">
                {story.worldImpact}
              </p>
            </section>
          )}

          {/* Affected Assets */}
          {story.affectedAssets?.length > 0 && (
            <section>
              <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">
                Ativos Afetados
              </h3>
              <div className="flex flex-wrap gap-2">
                {story.affectedAssets.map((asset) => (
                  <span
                    key={asset}
                    className={`px-3 py-1 rounded-full text-xs font-mono font-semibold border ${
                      signal === 'bullish'
                        ? 'bg-green-500/10 text-green-400 border-green-500/30'
                        : signal === 'bearish'
                        ? 'bg-red-500/10 text-red-400 border-red-500/30'
                        : 'bg-accent/10 text-accent border-accent/30'
                    }`}
                  >
                    {asset}
                  </span>
                ))}
              </div>
            </section>
          )}

          {/* Timeline */}
          {timeline.length > 0 && (
            <section>
              <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-3">
                Linha do Tempo ({timeline.length} eventos)
              </h3>
              <StoryTimeline events={timeline} />
            </section>
          )}

          {/* Articles */}
          <section>
            <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">
              {articles.length} Artigos Correlacionados
            </h3>
            <div className="space-y-2">
              {articles.map((article) => (
                <a
                  key={article.id}
                  href={article.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => { e.stopPropagation(); onArticleClick?.(article); }}
                  className="flex items-start gap-2 p-2 rounded-lg hover:bg-surface transition-colors group"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-text-primary line-clamp-2 group-hover:text-accent">
                      {article.title}
                    </p>
                    <p className="text-xs text-text-secondary mt-0.5">{article.source}</p>
                  </div>
                  <span className="text-xs text-text-secondary shrink-0">↗</span>
                </a>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
