import React from 'react';
import type { StoryNode } from '../../hooks/useStories';

const IMPACT_COLORS: Record<string, string> = {
  critical: 'bg-red-500/20 text-red-400 border-red-500/30',
  high: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  medium: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  low: 'bg-green-500/20 text-green-400 border-green-500/30',
};

const SIGNAL_COLORS: Record<string, string> = {
  bullish: 'text-green-400',
  bearish: 'text-red-400',
  neutral: 'text-gray-400',
};

const SIGNAL_ICONS: Record<string, string> = {
  bullish: '↑',
  bearish: '↓',
  neutral: '→',
};

interface Props {
  story: StoryNode;
  onClick?: () => void;
  selected?: boolean;
}

export function StoryCard({ story, onClick, selected }: Props) {
  const impactClass = IMPACT_COLORS[story.impactLevel] ?? IMPACT_COLORS.medium;
  const signal = story.financialSignal ?? 'neutral';

  return (
    <div
      onClick={onClick}
      className={`cursor-pointer rounded-xl border p-4 transition-all duration-200 ${
        selected
          ? 'border-accent bg-accent/10'
          : 'border-border bg-surface hover:border-accent/50 hover:bg-surface/80'
      }`}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${impactClass}`}>
          {story.impactLevel.toUpperCase()}
        </span>
        <div className="flex items-center gap-1">
          <span className={`text-sm font-bold ${SIGNAL_COLORS[signal]}`}>
            {SIGNAL_ICONS[signal]} {signal}
          </span>
        </div>
      </div>

      <h3 className="text-sm font-semibold text-text-primary line-clamp-2 mb-1">
        {story.title}
      </h3>

      {story.summary && (
        <p className="text-xs text-text-secondary line-clamp-2 mb-2">{story.summary}</p>
      )}

      {story.affectedAssets?.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {story.affectedAssets.slice(0, 4).map((asset) => (
            <span key={asset} className="text-xs px-1.5 py-0.5 rounded bg-accent/10 text-accent font-mono">
              {asset}
            </span>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between text-xs text-text-secondary">
        <span className="px-1.5 py-0.5 rounded bg-surface-elevated">{story.category}</span>
        <span>{story.articleCount} artigos</span>
      </div>
    </div>
  );
}
