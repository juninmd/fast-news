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
    <div className="flex h-full flex-col gap-3">
      <BackButton label={t("stories.back")} onClick={onBack} />

      <div className="min-h-0 flex-1 overflow-y-auto pr-1">
        {state.loading && !state.data && <Skeleton rows={4} />}
        {state.error && <ErrorBanner message={t("app.error", { error: state.error })} onRetry={state.reload} />}

        {state.data && (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <div className="flex flex-wrap items-center gap-2 text-[11px] text-faint">
                <span className="font-medium tracking-wide text-accent-text uppercase">{state.data.story.category}</span>
                {state.data.story.lastUpdatedAt && <span>· {relativeTime(state.data.story.lastUpdatedAt)}</span>}
              </div>
              <h2 className="text-base leading-snug font-semibold text-fg">{state.data.story.title}</h2>
              <div className="flex flex-wrap gap-1.5">
                <Badge tone="accent">{t("stories.articles", { n: state.data.story.articleCount })}</Badge>
                {state.data.story.impactLevel && <Badge tone="warn">Impacto: {state.data.story.impactLevel}</Badge>}
                {state.data.story.firstSeenAt && (
                  <Badge>{t("stories.firstSeen", { date: formatDateTime(state.data.story.firstSeenAt) })}</Badge>
                )}
                {state.data.story.financialSignal && (
                  <Badge>{t("stories.financialSignal")}: {state.data.story.financialSignal}</Badge>
                )}
                {state.data.story.affectedAssets?.map((asset) => (
                  <Badge key={asset}>{asset}</Badge>
                ))}
              </div>
            </div>

            {state.data.story.summary && <p className="text-sm leading-relaxed text-muted">{state.data.story.summary}</p>}

            {state.data.story.worldImpact && (
              <section className="fn-card p-3">
                <h3 className="text-xs font-semibold tracking-wide text-faint uppercase">{t("stories.worldImpact")}</h3>
                <p className="mt-1 text-sm leading-relaxed text-muted">{state.data.story.worldImpact}</p>
              </section>
            )}

            {state.data.timeline.length > 0 && (
              <section className="flex flex-col gap-2">
                <h3 className="text-xs font-semibold tracking-wide text-faint uppercase">{t("stories.timeline")}</h3>
                <ol className="flex flex-col gap-2 border-l border-edge pl-3">
                  {state.data.timeline.map((event) => (
                    <li key={event.id} className="relative">
                      <span className="absolute top-1.5 -left-[17px] h-1.5 w-1.5 rounded-full bg-accent" />
                      <p className="text-sm text-fg">{event.headline}</p>
                      {event.whatChanged && <p className="text-xs text-muted">{event.whatChanged}</p>}
                      {event.occurredAt && <p className="text-[11px] text-faint">{formatDateTime(event.occurredAt)}</p>}
                    </li>
                  ))}
                </ol>
              </section>
            )}

            <section className="flex flex-col gap-2">
              <h3 className="text-xs font-semibold tracking-wide text-faint uppercase">{t("article.related")}</h3>
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

function BackButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-fit items-center gap-1.5 rounded-lg border border-edge px-2.5 py-1 text-xs text-muted hover:bg-hover hover:text-fg"
    >
      <ChevronLeft className="h-3.5 w-3.5" />
      {label}
    </button>
  );
}
