import { useEffect, useState } from 'react';
import { X, ExternalLink, Clock, ShieldAlert, AlertTriangle } from 'lucide-react';

interface Article {
  id: string;
  title: string;
  summary: string;
  content: string;
  url: string;
  source: string;
  category: string;
  company: string | null;
  published_at: string;
  image_url: string | null;
  fake_news_score: number | null;
  political_bias: string | null;
  is_militant: boolean;
  has_incoherence: boolean;
}

interface RelatedArticle {
  id: string;
  title: string;
  source: string;
  url: string;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
    timeZone: 'America/Sao_Paulo',
  });
}

function fakeNewsLabel(score: number): { label: string; color: string } {
  if (score <= 2) return { label: '✓ Confiável', color: 'text-green-400' };
  if (score <= 4) return { label: '⚠ Verificar', color: 'text-yellow-400' };
  if (score <= 7) return { label: '⚠ Suspeito', color: 'text-orange-400' };
  return { label: '✗ Não confiável', color: 'text-red-400' };
}

const BIAS_LABELS: Record<string, string> = {
  left: '🔵 Esquerda', far_left: '🔵🔵 Esq. Radical',
  right: '🔴 Direita', far_right: '🔴🔴 Dir. Radical',
};

interface ArticleModalProps {
  articleId: string | null;
  onClose: () => void;
}

export function ArticleModal({ articleId, onClose }: ArticleModalProps) {
  const [article, setArticle] = useState<Article | null>(null);
  const [related, setRelated] = useState<RelatedArticle[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!articleId) { setArticle(null); setRelated([]); return; }
    setLoading(true);
    setError(false);
    setArticle(null);
    setRelated([]);

    fetch(`/api/news/${articleId}`)
      .then((r) => { if (!r.ok) throw new Error(); return r.json(); })
      .then((d) => { setArticle(d); setLoading(false); })
      .catch(() => { setError(true); setLoading(false); });

    fetch(`/api/news/${articleId}/related`)
      .then((r) => r.json())
      .then((d) => setRelated((d.data ?? []).slice(0, 4)))
      .catch(() => {});
  }, [articleId]);

  useEffect(() => {
    if (!articleId) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [articleId, onClose]);

  if (!articleId) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-bg-primary/80 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-2xl max-h-[90vh] flex flex-col bg-bg-secondary border border-border-subtle rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border-subtle flex-shrink-0">
          <span className="text-xs text-text-secondary font-mono uppercase tracking-wider">
            {loading ? 'Carregando...' : article?.category ?? ''}
          </span>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-bg-tertiary text-text-secondary transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1">
          {loading && (
            <div className="p-6 space-y-4 animate-pulse">
              <div className="h-48 bg-bg-tertiary rounded-xl" />
              <div className="h-6 bg-bg-tertiary rounded w-3/4" />
              <div className="h-4 bg-bg-tertiary rounded" />
              <div className="h-4 bg-bg-tertiary rounded w-5/6" />
            </div>
          )}

          {error && (
            <div className="p-12 text-center text-text-secondary">
              <AlertTriangle className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>Artigo não encontrado.</p>
            </div>
          )}

          {article && (
            <>
              {article.image_url && (
                <div className="h-52 overflow-hidden flex-shrink-0">
                  <img src={article.image_url} alt="" className="w-full h-full object-cover" />
                </div>
              )}

              <div className="p-6">
                <h2 className="text-xl font-display font-bold text-text-primary leading-tight mb-3">
                  {article.title}
                </h2>

                {/* Meta */}
                <div className="flex flex-wrap items-center gap-3 mb-4 text-xs text-text-secondary">
                  <span className="font-mono font-medium text-text-primary">{article.source}</span>
                  {article.company && article.company !== article.source && (
                    <span>· {article.company}</span>
                  )}
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {formatDate(article.published_at)}
                  </span>
                </div>

                {/* Credibility */}
                {(article.fake_news_score != null || article.political_bias || article.is_militant || article.has_incoherence) && (
                  <div className="flex flex-wrap gap-2 mb-4">
                    {article.fake_news_score != null && (
                      <span className={`text-xs font-semibold flex items-center gap-1 ${fakeNewsLabel(article.fake_news_score).color}`}>
                        <ShieldAlert className="w-3 h-3" />
                        {fakeNewsLabel(article.fake_news_score).label} ({article.fake_news_score}/10)
                      </span>
                    )}
                    {article.political_bias && article.political_bias !== 'neutral' && BIAS_LABELS[article.political_bias] && (
                      <span className="text-xs text-text-secondary">⚖️ {BIAS_LABELS[article.political_bias]}</span>
                    )}
                    {article.is_militant && <span className="text-xs text-orange-400">📢 Militante</span>}
                    {article.has_incoherence && <span className="text-xs text-yellow-400">⚡ Incoerências detectadas</span>}
                  </div>
                )}

                {/* Content */}
                <div className="prose prose-invert prose-sm max-w-none text-text-secondary leading-relaxed">
                  {article.content || article.summary}
                </div>

                {/* Related */}
                {related.length > 0 && (
                  <div className="mt-6 pt-4 border-t border-border-subtle">
                    <p className="text-xs text-text-secondary uppercase tracking-wider mb-3">Relacionadas</p>
                    <ul className="space-y-2">
                      {related.map((r) => (
                        <li key={r.id}>
                          <a
                            href={r.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-text-secondary hover:text-accent-primary transition-colors line-clamp-1"
                          >
                            {r.title} <span className="text-xs opacity-60">— {r.source}</span>
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        {article && (
          <div className="p-4 border-t border-border-subtle flex-shrink-0">
            <a
              href={article.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-accent-primary/10 hover:bg-accent-primary/20 text-accent-primary font-medium text-sm transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              Ler reportagem completa
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
