import { t } from "../i18n";
import { api } from "../lib/api";
import { formatDateTime, relativeTime } from "../lib/format";
import { useAsync } from "../lib/hooks";
import Badge from "../components/Badge";
import ErrorBanner from "../components/ErrorBanner";
import { ChevronLeft } from "../components/Icons";
import NewsCard from "../components/NewsCard";
import Skeleton from "../components/Skeleton";

type Props = { id: string; onBack: () => void; onOpenArticle: (id: string) => void };

export default function StoryView({ id, onBack, onOpenArticle }: Props) {
  const state = useAsync(() => api.storyDetail(id), [id]);

  return (
    <div className="flex h-full flex-col gap-4">
      <button
        type="button"
        onClick={onBack}
        className="flex w-fit items-center gap-1 rounded-lg px-1.5 py-1 text-xs text-muted transition-colors hover:bg-hover hover:text-fg"
      >
        <ChevronLeft className="h-4 w-4" />
        {t("stories.back")}
      </button>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {state.loading && !state.data && <Skeleton rows={4} />}
        {state.error && <ErrorBanner message={t("app.error", { error: state.error })} onRetry={state.reload} />}

        {state.data && (
          <div className="flex flex-col gap-8 pb-4">
            <header className="flex flex-col gap-3">
              <div className="flex flex-wrap items-center gap-2 text-[11px] text-faint">
                <span className="fn-kicker text-accent-text">{state.data.story.category}</span>
                {state.data.story.lastUpdatedAt && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span>{relativeTime(state.data.story.lastUpdatedAt)}</span>
                  </>
                )}
              </div>
              <h1 className="font-reading text-[1.9rem] leading-[1.2] font-semibold tracking-tight text-fg">
                {state.data.story.title}
              </h1>
              <div className="flex flex-wrap items-center gap-1.5">
                <Badge tone="accent">{t("stories.articles", { n: state.data.story.articleCount })}</Badge>
                {state.data.story.impactLevel && (
                  <Badge tone="warn">
                    {t("stories.impact")}: {state.data.story.impactLevel}
                  </Badge>
                )}
                {state.data.story.financialSignal && (
                  <Badge>
                    {t("stories.financialSignal")}: {state.data.story.financialSignal}
                  </Badge>
                )}
                {state.data.story.firstSeenAt && (
                  <Badge>{t("stories.firstSeen", { date: formatDateTime(state.data.story.firstSeenAt) })}</Badge>
                )}
                {state.data.story.affectedAssets?.map((asset) => (
                  <Badge key={asset}>{asset}</Badge>
                ))}
              </div>
            </header>

            {state.data.story.summary && (
              <p className="fn-reading text-[1.1rem] leading-[1.7] text-fg/85">{state.data.story.summary}</p>
            )}

            {state.data.story.worldImpact && (
              <section className="rounded-2xl border border-edge bg-panel p-5">
                <h2 className="fn-kicker text-faint">{t("stories.worldImpact")}</h2>
                <p className="mt-2 text-[14px] leading-relaxed text-muted">{state.data.story.worldImpact}</p>
              </section>
            )}

            {state.data.timeline.length > 0 && (
              <section className="flex flex-col gap-3">
                <h2 className="fn-kicker text-faint">{t("stories.timeline")}</h2>
                <ol className="flex flex-col gap-4 border-l border-edge pl-4">
                  {state.data.timeline.map((event) => (
                    <li key={event.id} className="relative">
                      <span className="absolute top-1.5 -left-[1.28rem] h-2 w-2 rounded-full border-2 border-ink bg-accent" />
                      <p className="text-[14px] leading-snug text-fg">{event.headline}</p>
                      {event.whatChanged && <p className="mt-0.5 text-[12.5px] text-muted">{event.whatChanged}</p>}
                      {event.occurredAt && <p className="mt-0.5 text-[11px] text-faint">{formatDateTime(event.occurredAt)}</p>}
                    </li>
                  ))}
                </ol>
              </section>
            )}

            <section className="flex flex-col gap-3 border-t border-edge pt-6">
              <h2 className="fn-kicker text-faint">{t("article.related")}</h2>
              {state.data.articles.map((article) => (
                <NewsCard
                  key={article.id}
                  article={{ ...article, published_at: article.publishedAt }}
                  onOpen={onOpenArticle}
                  badges={<Badge>{article.source}</Badge>}
                />
              ))}
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
