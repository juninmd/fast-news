import { type UIEvent, useEffect, useRef, useState } from "react";
import { t } from "../i18n";
import { api, errText } from "../lib/api";
import { credibilityScore, formatDateTime, formatNumber, similarityPercent } from "../lib/format";
import { useAsync } from "../lib/hooks";
import type { ArticleDetail } from "../lib/types";
import Badge from "./Badge";
import ErrorBanner from "./ErrorBanner";
import { ChevronLeft, Close, ExternalLink } from "./Icons";
import NewsCard from "./NewsCard";
import Skeleton from "./Skeleton";

type Props = { id: string; onClose: () => void; onOpenArticle: (id: string) => void; onError: (message: string) => void };

/** Leitura em tela cheia: coluna de ~65 caracteres, serifa e progresso no topo. */
export default function ArticleReader({ id, onClose, onOpenArticle, onError }: Props) {
  const detail = useAsync(() => api.newsDetail(id), [id]);
  const related = useAsync(() => api.newsRelated(id), [id]);
  const scroller = useRef<HTMLDivElement>(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Abrir uma relacionada troca a matéria sem desmontar o leitor: volta ao topo.
  useEffect(() => {
    scroller.current?.scrollTo({ top: 0 });
    setProgress(0);
  }, [id]);

  // O foco entra no leitor ao abrir e volta para o card de origem ao fechar.
  useEffect(() => {
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    scroller.current?.focus();
    return () => previous?.focus();
  }, []);

  const openExternal = (url: string) => void api.openLink(url).catch((cause) => onError(errText(cause)));
  const article = detail.data;
  const paragraphs =
    article?.content
      ?.split(/\n+/)
      .map((line) => line.trim())
      .filter(Boolean) ?? [];

  function onScroll(event: UIEvent<HTMLDivElement>) {
    const element = event.currentTarget;
    const max = element.scrollHeight - element.clientHeight;
    setProgress(max > 0 ? Math.min(1, element.scrollTop / max) : 0);
  }

  return (
    <div
      ref={scroller}
      onScroll={onScroll}
      role="dialog"
      aria-modal="true"
      aria-label={article?.title ?? t("article.loading")}
      tabIndex={-1}
      className="absolute inset-0 z-50 overflow-y-auto bg-ink"
    >
      <div className="sticky top-0 z-10 border-b border-edge bg-ink/85 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-[48rem] items-center gap-3 px-6 py-2.5">
          <button
            type="button"
            onClick={onClose}
            className="flex items-center gap-1 rounded-lg px-1.5 py-1 text-xs text-muted transition-colors hover:bg-hover hover:text-fg"
          >
            <ChevronLeft className="h-4 w-4" />
            {t("article.back")}
          </button>
          <span className="hidden truncate text-[11px] text-faint sm:block">{article?.source ?? t("article.loading")}</span>
          <div className="ml-auto flex items-center gap-1.5">
            {article && (
              <button
                type="button"
                onClick={() => openExternal(article.url)}
                className="flex items-center gap-1.5 rounded-lg border border-edge px-2.5 py-1 text-xs text-muted transition-colors hover:bg-hover hover:text-fg"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{t("app.openExternal")}</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              title={t("app.close")}
              aria-label={t("app.close")}
              className="flex h-7 w-7 items-center justify-center rounded-lg text-muted transition-colors hover:bg-hover hover:text-fg"
            >
              <Close />
            </button>
          </div>
        </div>
        <div className="h-px w-full bg-edge">
          <div className="h-px bg-accent transition-[width] duration-150" style={{ width: `${progress * 100}%` }} />
        </div>
      </div>

      <article className="mx-auto w-full max-w-[42rem] px-6 pt-10 pb-24">
        {detail.loading && !article && <Skeleton rows={6} />}
        {detail.error && <ErrorBanner message={t("app.error", { error: detail.error })} onRetry={detail.reload} />}

        {article && (
          <div className="motion-safe:animate-ler">
            <p className="fn-kicker text-accent-text">{article.category}</p>
            <h1 className="mt-3 font-reading text-[2rem] leading-[1.18] font-semibold tracking-tight text-fg sm:text-[2.3rem]">
              {article.title}
            </h1>
            <div className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12.5px] text-faint">
              <span className="text-muted">{article.source}</span>
              {article.published_at && (
                <>
                  <span aria-hidden="true">·</span>
                  <span>{formatDateTime(article.published_at)}</span>
                </>
              )}
            </div>
            <div className="mt-5 flex flex-wrap items-center gap-1.5">
              <Signals article={article} />
            </div>

            {article.image_url && (
              <img
                src={article.image_url}
                alt=""
                className="mt-8 aspect-[16/8] max-h-[26rem] w-full rounded-2xl border border-edge object-cover"
              />
            )}

            {article.summary && (
              <p className="mt-8 font-reading text-[1.2rem] leading-[1.7] text-fg/80">{article.summary}</p>
            )}

            {paragraphs.length > 0 ? (
              <div className="fn-reading mt-8 text-fg/90">
                {paragraphs.map((paragraph, index) => (
                  <p key={index}>{paragraph}</p>
                ))}
              </div>
            ) : (
              !article.summary && <p className="mt-8 text-sm text-faint">{t("article.noContent")}</p>
            )}

            {related.data && related.data.data.length > 0 && (
              <section className="mt-16 border-t border-edge pt-8">
                <h2 className="fn-kicker text-faint">{t("article.related")}</h2>
                <div className="mt-4 flex flex-col gap-2.5">
                  {related.data.data.map((hit) => (
                    <NewsCard
                      key={hit.id}
                      article={hit}
                      onOpen={onOpenArticle}
                      badges={<Similarity similarity={hit.similarity} />}
                    />
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </article>
    </div>
  );
}

function Signals({ article }: { article: ArticleDetail }) {
  const credibility = credibilityScore(article.fake_news_score);
  return (
    <>
      {article.importance_score !== null && article.importance_score > 0 && (
        <Badge tone="accent">{t("article.importance", { value: formatNumber(article.importance_score, 1) })}</Badge>
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

function Similarity({ similarity }: { similarity: number | null }) {
  const percent = similarityPercent(similarity);
  if (percent === null) return null;
  return <Badge tone="accent">{t("search.similarity", { value: percent })}</Badge>;
}
