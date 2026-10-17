import { useEffect } from "react";
import { t } from "../i18n";
import { api, errText } from "../lib/api";
import { credibilityScore, formatDateTime, formatNumber, similarityPercent } from "../lib/format";
import { useAsync } from "../lib/hooks";
import type { ArticleDetail } from "../lib/types";
import Badge from "./Badge";
import ErrorBanner from "./ErrorBanner";
import { Close, ExternalLink } from "./Icons";
import NewsCard from "./NewsCard";
import Skeleton from "./Skeleton";

type Props = { id: string; onClose: () => void; onOpenArticle: (id: string) => void; onError: (message: string) => void };

export default function ArticleReader({ id, onClose, onOpenArticle, onError }: Props) {
  const detail = useAsync(() => api.newsDetail(id), [id]);
  const related = useAsync(() => api.newsRelated(id), [id]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const openExternal = (url: string) => void api.openLink(url).catch((cause) => onError(errText(cause)));
  const article = detail.data;

  return (
    <div className="absolute inset-0 z-40 flex justify-center bg-ink/70 p-3 backdrop-blur-sm">
      <section
        role="dialog"
        aria-modal="true"
        aria-label={article?.title ?? t("app.loading")}
        className="fn-card motion-safe:animate-surgir flex w-full max-w-3xl flex-col overflow-hidden shadow-2xl"
      >
        <header className="flex shrink-0 items-center gap-2 border-b border-edge px-4 py-2">
          <span className="truncate text-xs text-faint">{article ? article.source : t("article.loading")}</span>
          <div className="ml-auto flex items-center gap-1">
            {article && (
              <button
                type="button"
                onClick={() => openExternal(article.url)}
                className="flex items-center gap-1.5 rounded-lg border border-edge px-2.5 py-1 text-xs text-muted hover:bg-hover hover:text-fg"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                {t("app.openExternal")}
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              title={t("app.close")}
              aria-label={t("app.close")}
              className="flex h-7 w-7 items-center justify-center rounded-lg text-muted hover:bg-hover hover:text-fg"
            >
              <Close />
            </button>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {detail.loading && <Skeleton rows={5} />}
          {detail.error && <ErrorBanner message={t("app.error", { error: detail.error })} onRetry={detail.reload} />}
          {article && (
            <article className="flex flex-col gap-4">
              <h2 className="text-lg leading-snug font-semibold text-fg">{article.title}</h2>
              <div className="flex flex-wrap gap-1.5">
                <MetaBadges article={article} />
              </div>
              {article.image_url && (
                <img
                  src={article.image_url}
                  alt=""
                  className="max-h-72 w-full rounded-xl border border-edge object-cover"
                />
              )}
              {article.summary && (
                <p className="text-sm leading-relaxed text-muted">{article.summary}</p>
              )}
              {article.content ? (
                <p className="text-sm leading-relaxed whitespace-pre-line text-fg/90">{article.content}</p>
              ) : (
                <p className="text-sm text-faint">{t("article.noContent")}</p>
              )}
            </article>
          )}

          {related.data && related.data.data.length > 0 && (
            <div className="mt-6 flex flex-col gap-2 border-t border-edge pt-4">
              <h3 className="text-xs font-semibold tracking-wide text-faint uppercase">{t("article.related")}</h3>
              {related.data.data.map((hit) => (
                <NewsCard
                  key={hit.id}
                  article={hit}
                  onOpen={onOpenArticle}
                  badges={<SimilarityBadge similarity={hit.similarity} />}
                />
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function MetaBadges({ article }: { article: ArticleDetail }) {
  const credibility = credibilityScore(article.fake_news_score);
  return (
    <>
      <Badge tone="accent">{article.category}</Badge>
      {article.company && <Badge>{article.company}</Badge>}
      {article.published_at && <Badge>{t("article.published", { date: formatDateTime(article.published_at) })}</Badge>}
      {article.importance_score !== null && (
        <Badge tone="neutral">{t("article.importance", { value: formatNumber(article.importance_score, 1) })}</Badge>
      )}
      {credibility !== null && (
        <Badge tone={credibility >= 7 ? "ok" : credibility >= 4 ? "warn" : "danger"}>
          {t("article.credibility", { value: credibility })}
        </Badge>
      )}
      {article.political_bias && <Badge tone="warn">{t("article.bias", { value: article.political_bias })}</Badge>}
      {article.is_militant && <Badge tone="danger">{t("article.militant")}</Badge>}
      {article.has_incoherence && <Badge tone="danger">{t("article.incoherence")}</Badge>}
      {article.credibility_flags?.map((flag) => (
        <Badge key={flag} tone="warn">
          {flag}
        </Badge>
      ))}
    </>
  );
}

function SimilarityBadge({ similarity }: { similarity: number | null }) {
  const percent = similarityPercent(similarity);
  if (percent === null) return null;
  return <Badge tone="accent">{t("search.similarity", { value: percent })}</Badge>;
}
