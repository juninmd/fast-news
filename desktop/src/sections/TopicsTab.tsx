import { useState } from "react";
import { t } from "../i18n";
import { api } from "../lib/api";
import { truncate } from "../lib/format";
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
    return <EmptyState message={t("topics.empty")} icon={<Tag className="h-7 w-7" />} />;
  }

  return (
    <div className="flex flex-col gap-2 overflow-y-auto pr-1">
      {state.data.map((topic) => (
        <button
          key={topic.id}
          type="button"
          onClick={() => setOpen(topic)}
          className="fn-card flex items-center gap-3 p-3 text-left transition-colors hover:border-line"
        >
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-fg">{topic.name}</p>
            {topic.description && <p className="mt-0.5 text-xs text-muted">{truncate(topic.description, 160)}</p>}
            {topic.keywords && topic.keywords.length > 0 && (
              <p className="mt-1 truncate text-[11px] text-faint">{topic.keywords.slice(0, 8).join(" · ")}</p>
            )}
          </div>
          <span className="shrink-0 text-faint">
            <ChevronRight />
          </span>
        </button>
      ))}
    </div>
  );
}
