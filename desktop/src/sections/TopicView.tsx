import { useState } from "react";
import { t } from "../i18n";
import { api, errText } from "../lib/api";
import { formatDateTime } from "../lib/format";
import { useAsync } from "../lib/hooks";
import type { Topic } from "../lib/types";
import Badge from "../components/Badge";
import ErrorBanner from "../components/ErrorBanner";
import { ChevronLeft } from "../components/Icons";
import MarkdownLite from "../components/MarkdownLite";
import Skeleton from "../components/Skeleton";

type Props = { topic: Topic; onBack: () => void; onError: (message: string) => void };

export default function TopicView({ topic, onBack, onError }: Props) {
  const history = useAsync(() => api.topicHistory(topic.id, 10), [topic.id]);
  const [fresh, setFresh] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const stored = history.data?.[0]?.content ?? null;
  const current = fresh ?? stored;

  async function analyze() {
    setBusy(true);
    try {
      const result = await api.topicAnalysis(topic.id, true);
      setFresh(result.analysis ?? "");
      history.reload();
    } catch (cause) {
      onError(errText(cause));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex h-full flex-col gap-3">
      <button
        type="button"
        onClick={onBack}
        className="flex w-fit items-center gap-1.5 rounded-lg border border-edge px-2.5 py-1 text-xs text-muted hover:bg-hover hover:text-fg"
      >
        <ChevronLeft className="h-3.5 w-3.5" />
        {t("topics.back")}
      </button>

      <div className="min-h-0 flex-1 overflow-y-auto pr-1">
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <h2 className="text-base font-semibold text-fg">{topic.name}</h2>
            {topic.description && <p className="text-sm text-muted">{topic.description}</p>}
            {topic.keywords && topic.keywords.length > 0 && (
              <div className="mt-1 flex flex-wrap gap-1.5">
                {topic.keywords.map((keyword) => (
                  <Badge key={keyword}>{keyword}</Badge>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void analyze()}
              disabled={busy}
              className="rounded-lg border border-accent/50 px-3 py-1.5 text-xs text-accent-text hover:bg-accent/10 disabled:opacity-50"
            >
              {busy ? t("topics.analyzing") : stored ? t("topics.refresh") : t("topics.analyze")}
            </button>
            {history.data?.[0]?.created_at && (
              <span className="text-[11px] text-faint">{formatDateTime(history.data[0].created_at)}</span>
            )}
          </div>

          <section className="fn-card p-4">
            {busy && !current && <Skeleton rows={4} />}
            {!busy && !current && <p className="text-sm text-faint">{t("app.empty")}</p>}
            {current && <MarkdownLite text={current} />}
          </section>

          {history.data && history.data.length > 1 && (
            <section className="flex flex-col gap-2">
              <h3 className="text-xs font-semibold tracking-wide text-faint uppercase">{t("topics.history")}</h3>
              {history.data.slice(1).map((item) => (
                <details key={item.id} className="fn-card p-3">
                  <summary className="cursor-pointer text-xs text-muted">{formatDateTime(item.created_at)}</summary>
                  <div className="mt-2">
                    <MarkdownLite text={item.content} />
                  </div>
                </details>
              ))}
            </section>
          )}

          {history.error && <ErrorBanner message={t("app.error", { error: history.error })} onRetry={history.reload} />}
        </div>
      </div>
    </div>
  );
}
