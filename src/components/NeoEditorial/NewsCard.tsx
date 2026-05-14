import { useState } from 'react';
import { Clock, Bookmark, Share2, Sparkles } from 'lucide-react';

const categoryColors: Record<string, string> = {
  'AI Frontier':  'bg-violet-500/20 text-violet-400',
  'Big Techs':    'bg-blue-500/20 text-blue-400',
  'Dev Tools':    'bg-emerald-500/20 text-emerald-400',
  'Engenharia':   'bg-cyan-500/20 text-cyan-400',
  'Open Source':  'bg-orange-500/20 text-orange-400',
  'Segurança':    'bg-red-500/20 text-red-400',
  'Startups':     'bg-pink-500/20 text-pink-400',
  'Gaming':       'bg-yellow-500/20 text-yellow-400',
  'Tecnologia':   'bg-sky-500/20 text-sky-400',
  'Mundo':        'bg-teal-500/20 text-teal-400',
  'Negocios':     'bg-amber-500/20 text-amber-400',
  'Brasil':       'bg-green-500/20 text-green-400',
  'Ciencia':      'bg-purple-500/20 text-purple-400',
  'IA':           'bg-violet-500/20 text-violet-400',
  default:        'bg-bg-tertiary text-text-secondary',
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
  // Credibility
  fake_news_score?: number | null;
  political_bias?: string | null;
  is_militant?: boolean;
  has_incoherence?: boolean;
  credibility_flags?: string[];
  onBookmark?: (id: string) => void;
  onShare?: (id: string) => void;
  onSummarize?: (id: string) => void;
}

const BIAS_CONFIG: Record<string, { label: string; color: string }> = {
  left:     { label: 'Esq',      color: 'bg-blue-500/20 text-blue-400 border-blue-500/40' },
  far_left: { label: 'Esq+',     color: 'bg-blue-600/30 text-blue-300 border-blue-500/60' },
  right:    { label: 'Dir',      color: 'bg-red-500/20 text-red-400 border-red-500/40' },
  far_right:{ label: 'Dir+',     color: 'bg-red-600/30 text-red-300 border-red-500/60' },
  neutral:  { label: 'Neutro',   color: 'bg-gray-500/20 text-gray-400 border-gray-500/40' },
};

function fakeNewsColor(score: number): string {
  if (score <= 3) return 'bg-green-500/15 text-green-400 border-green-500/40';
  if (score <= 6) return 'bg-yellow-500/15 text-yellow-400 border-yellow-500/40';
  return 'bg-red-500/15 text-red-400 border-red-500/40';
}

function fakeNewsLabel(score: number): string {
  if (score <= 2) return '✓ Confiável';
  if (score <= 4) return '⚠ Verificar';
  if (score <= 7) return '⚠ Suspeito';
  return '✗ Fake News';
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
  fake_news_score,
  political_bias,
  is_militant,
  has_incoherence,
  credibility_flags,
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
        <div className="flex flex-wrap items-center gap-1.5 mb-3">
          <span className={`px-2 py-0.5 rounded-full text-xs font-mono uppercase tracking-wider ${getCategoryClass(category)}`}>
            {category}
          </span>
          {company && (
            <span className="text-xs text-text-secondary font-numbers">
              {company}
            </span>
          )}
          {/* Credibility badges */}
          {fake_news_score != null && (
            <span
              className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${fakeNewsColor(fake_news_score)}`}
              title={`Score de credibilidade: ${fake_news_score}/10`}
            >
              {fakeNewsLabel(fake_news_score)} {fake_news_score}/10
            </span>
          )}
          {political_bias && political_bias !== 'neutral' && BIAS_CONFIG[political_bias] && (
            <span
              className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${BIAS_CONFIG[political_bias].color}`}
              title={`Viés político: ${political_bias}`}
            >
              {BIAS_CONFIG[political_bias].label}
            </span>
          )}
          {is_militant && (
            <span
              className="px-2 py-0.5 rounded-full text-xs font-semibold border bg-orange-500/15 text-orange-400 border-orange-500/40"
              title="Conteúdo de cunho militante/panfletário"
            >
              📢 Militante
            </span>
          )}
          {has_incoherence && (
            <span
              className="px-2 py-0.5 rounded-full text-xs font-semibold border bg-yellow-500/15 text-yellow-400 border-yellow-500/40"
              title={`Inconsistências detectadas: ${(credibility_flags ?? []).join(', ')}`}
            >
              ⚡ Incoerente
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
