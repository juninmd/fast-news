import { useState } from "react";
import { t } from "../i18n";
import { api } from "../lib/api";
import { formatDateTime, relativeTime, truncate } from "../lib/format";
import { useAsync } from "../lib/hooks";
import type { Story } from "../lib/types";
import Badge, { type Tone } from "../components/Badge";
import EmptyState from "../components/EmptyState";
import ErrorBanner from "../components/ErrorBanner";
import { ChevronRight, Layers } from "../components/Icons";
import Skeleton from "../components/Skeleton";
import StoryView from "./StoryView";

const IMPACT_TONE: Record<string, Tone> = { high: "danger", medium: "warn", low: "neutral" };

type Props = { version: number; onOpenArticle: (id: string) => void };

export default function StoriesTab({ version, onOpenArticle }: Props) {
  const [openId, setOpenId] = useState<string | null>(null);
  const state = useAsync(() => api.stories(30), [version]);

  if (openId) return <StoryView id={openId} onBack={() => setOpenId(null)} onOpenArticle={onOpenArticle} />;

  if (state.loading && !state.data) return <Skeleton rows={3} />;
  if (state.error) return <ErrorBanner message={t("app.error", { error: state.error })} onRetry={state.reload} />;
  if (!state.data || state.data.length === 0) {
    return <EmptyState message={t("stories.empty")} icon={<Layers className="h-7 w-7" />} />;
  }

  return (
    <div className="flex flex-col gap-2 overflow-y-auto pr-1">
      {state.data.map((story) => (
        <StoryRow key={story.id} story={story} onOpen={() => setOpenId(story.id)} />
      ))}
    </div>
  );
}

function StoryRow({ story, onOpen }: { story: Story; onOpen: () => void }) {
  const when = relativeTime(story.lastUpdatedAt ?? story.firstSeenAt);
  return (
    <button
      type="button"
      onClick={onOpen}
      className="fn-card flex items-start gap-3 p-3 text-left transition-colors hover:border-line"
    >
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-faint">
          <span className="font-medium tracking-wide text-accent-text uppercase">{story.category}</span>
          {when && <span>· {when}</span>}
        </div>
        <p className="mt-1 text-sm leading-snug font-medium text-fg">{story.title}</p>
        {story.summary && <p className="mt-1 line-clamp-2 text-xs text-muted">{truncate(story.summary, 200)}</p>}
        <div className="mt-2 flex flex-wrap gap-1.5">
          <Badge>{t("stories.articles", { n: story.articleCount })}</Badge>
          {story.impactLevel && (
            <Badge tone={IMPACT_TONE[story.impactLevel] ?? "neutral"}>{t("stories.impact")}: {story.impactLevel}</Badge>
          )}
          {story.firstSeenAt && <Badge>{formatDateTime(story.firstSeenAt)}</Badge>}
        </div>
      </div>
      <span className="mt-1 shrink-0 text-faint">
        <ChevronRight />
      </span>
    </button>
  );
}
