import { useState } from "react";
import { t } from "../i18n";
import { api } from "../lib/api";
import { useAsync } from "../lib/hooks";
import type { Topic } from "../lib/types";
import EmptyState from "../components/EmptyState";
import ErrorBanner from "../components/ErrorBanner";
import { ChevronRight, Tag } from "../components/Icons";
import Skeleton from "../components/Skeleton";
import TopicView from "./TopicView";

type Props = { version: number; onError: (message: string) => void };

export default function TopicsTab({ version, onError }: Props) {
  const [open, setOpen] = useState<Topic | null>(null);
  const state = useAsync(() => api.topics(), [version]);

  if (open) return <TopicView topic={open} onBack={() => setOpen(null)} onError={onError} />;

  if (state.loading && !state.data) return <Skeleton rows={3} />;
  if (state.error) return <ErrorBanner message={t("app.error", { error: state.error })} onRetry={state.reload} />;
  if (!state.data || state.data.length === 0) {
    return <EmptyState message={t("topics.empty")} icon={<Tag className="h-5 w-5" />} />;
  }

  return (
    <div className="flex flex-col gap-3 overflow-y-auto">
      {state.data.map((topic) => (
        <button
          key={topic.id}
          type="button"
          onClick={() => setOpen(topic)}
          className="group flex shrink-0 items-center gap-4 rounded-2xl border border-edge bg-panel p-5 text-left transition-colors hover:border-line"
        >
          <div className="min-w-0 flex-1">
            <p className="text-[15px] font-medium text-fg transition-colors group-hover:text-accent-text">{topic.name}</p>
            {topic.description && <p className="mt-1 text-[13px] leading-relaxed text-muted">{topic.description}</p>}
            {topic.keywords && topic.keywords.length > 0 && (
              <p className="mt-2 truncate text-[11px] text-faint">{topic.keywords.slice(0, 8).join(" · ")}</p>
            )}
          </div>
          <span className="shrink-0 text-faint transition-colors group-hover:text-fg">
            <ChevronRight />
          </span>
        </button>
      ))}
    </div>
  );
}
