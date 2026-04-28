import { useState } from 'react';
import { Clock, Bookmark, Share2, Sparkles } from 'lucide-react';

const categoryColors = {
  'AI Frontier': 'bg-accent-primary/20 text-accent-primary',
  'Big Techs': 'bg-accent-secondary/20 text-accent-secondary',
  'Gaming': 'bg-accent-tertiary/20 text-accent-tertiary',
  'Dev Tools': 'bg-emerald-500/20 text-emerald-400',
  'Tecnologia': 'bg-blue-500/20 text-blue-400',
  'IA': 'bg-purple-500/20 text-purple-400',
  default: 'bg-bg-tertiary text-text-secondary',
};

interface NewsCardProps {
  id: string;
  title: string;
  excerpt?: string;
  url: string;
  source: string;
  category: string;
  company?: string;
  publishedAt: Date | string;
  imageUrl?: string;
  variant?: 'compact' | 'standard' | 'featured';
  onBookmark?: (id: string) => void;
  onShare?: (id: string) => void;
  onSummarize?: (id: string) => void;
}

export function NewsCard({
  id,
  title,
  excerpt,
  source,
  category,
  company,
  publishedAt,
  imageUrl,
  variant = 'standard',
  onBookmark,
  onShare,
  onSummarize,
}: NewsCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);

  const formatDate = (date: Date | string) => {
    const now = new Date();
    const d = new Date(date);
    const diff = now.getTime() - d.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    if (hours < 1) return 'Agora';
    if (hours < 24) return `${hours}h atrás`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d atrás`;
    return d.toLocaleDateString('pt-BR');
  };

  const getCategoryClass = (cat: string) => {
    return categoryColors[cat as keyof typeof categoryColors] || categoryColors.default;
  };

  return (
    <article
      className={`
        card-glow group relative rounded-xl overflow-hidden
        bg-bg-secondary border border-border-subtle
        transition-all duration-200 ease-out
        ${variant === 'featured' ? 'col-span-2 row-span-2' : ''}
        ${isHovered ? 'scale-[1.02]' : ''}
      `}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {imageUrl && (
        <div className={`relative overflow-hidden ${variant === 'compact' ? 'h-32' : 'h-48'}`}>
          <img
            src={imageUrl}
            alt=""
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-bg-secondary via-transparent to-transparent" />
        </div>
      )}

      <div className="p-5">
        <div className="flex items-center gap-2 mb-3">
          <span className={`px-2 py-0.5 rounded-full text-xs font-mono uppercase tracking-wider ${getCategoryClass(category)}`}>
            {category}
          </span>
          {company && (
            <span className="text-xs text-text-secondary font-numbers">
              {company}
            </span>
          )}
        </div>

        <h3 className={`
          font-display font-bold text-text-primary leading-tight mb-2
          group-hover:text-glow transition-all duration-200
          ${variant === 'featured' ? 'text-2xl' : variant === 'compact' ? 'text-base' : 'text-lg'}
        `}>
          {title}
        </h3>

        {variant !== 'compact' && excerpt && (
          <p className="text-text-secondary text-sm line-clamp-2 mb-4">
            {excerpt}
          </p>
        )}

        <div className="flex items-center justify-between mt-auto pt-4 border-t border-border-subtle">
          <div className="flex items-center gap-1 text-text-secondary text-xs">
            <Clock className="w-3 h-3" />
            <span>{formatDate(publishedAt)}</span>
            <span className="mx-2">•</span>
            <span className="font-mono">{source}</span>
          </div>

          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={() => onSummarize?.(id)}
              className="p-1.5 rounded-lg hover:bg-accent-primary/20 text-text-secondary hover:text-accent-primary transition-colors"
              title="Resumir com AI"
            >
              <Sparkles className="w-4 h-4" />
            </button>
            <button
              onClick={() => {
                setIsBookmarked(!isBookmarked);
                onBookmark?.(id);
              }}
              className={`p-1.5 rounded-lg hover:bg-accent-primary/20 transition-colors ${
                isBookmarked ? 'text-accent-primary' : 'text-text-secondary hover:text-accent-primary'
              }`}
              title="Salvar"
            >
              <Bookmark className={`w-4 h-4 ${isBookmarked ? 'fill-current' : ''}`} />
            </button>
            <button
              onClick={() => onShare?.(id)}
              className="p-1.5 rounded-lg hover:bg-accent-primary/20 text-text-secondary hover:text-accent-primary transition-colors"
              title="Compartilhar"
            >
              <Share2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {isHovered && (
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute inset-0 bg-gradient-to-br from-accent-primary/5 via-transparent to-accent-secondary/5" />
        </div>
      )}
    </article>
  );
}
