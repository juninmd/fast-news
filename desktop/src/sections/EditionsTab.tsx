import { t } from "../i18n";
import type { MessageKey } from "../i18n/pt-BR";
import { api, errText } from "../lib/api";
import { dateParts, formatDate, formatDateTime } from "../lib/format";
import { useAsync } from "../lib/hooks";
import EmptyState from "../components/EmptyState";
import ErrorBanner from "../components/ErrorBanner";
import { BookOpen, ExternalLink } from "../components/Icons";
import Skeleton from "../components/Skeleton";

const KIND: Record<string, MessageKey> = {
  manha: "editions.manha",
  meiodia: "editions.meiodia",
  tarde: "editions.tarde",
  noite: "editions.noite",
};

type Props = { version: number; onError: (message: string) => void };

export default function EditionsTab({ version, onError }: Props) {
  const state = useAsync(() => api.editions(), [version]);

  if (state.loading && !state.data) return <Skeleton rows={3} />;
  if (state.error) return <ErrorBanner message={t("app.error", { error: state.error })} onRetry={state.reload} />;
  if (!state.data || state.data.length === 0) {
    return <EmptyState message={t("editions.empty")} icon={<BookOpen className="h-5 w-5" />} />;
  }

  function open(url: string) {
    void api.openLink(url).catch((cause) => onError(errText(cause)));
  }

  return (
    <div className="flex flex-col gap-3 overflow-y-auto">
      {state.data.map((edition) => {
        const link = edition.links[0];
        const kindLabel = KIND[edition.kind] ? t(KIND[edition.kind]) : edition.kind;
        const { day, month } = dateParts(edition.windowStart ?? edition.sentAt);
        return (
          <article
            key={`${edition.editionKey}-${edition.sentAt ?? ""}`}
            className="group flex shrink-0 items-center gap-4 rounded-2xl border border-edge bg-panel p-5 transition-colors hover:border-line"
          >
            <div className="flex w-12 shrink-0 flex-col items-center rounded-xl border border-edge bg-raised py-2">
              <span className="font-reading text-[1.2rem] leading-none font-semibold text-fg">{day}</span>
              <span className="mt-1 text-[10px] tracking-wide text-faint uppercase">{month}</span>
            </div>
            <div className="min-w-0 flex-1">
              <span className="fn-kicker text-accent-text">{kindLabel}</span>
              <p className="mt-1 text-[12.5px] text-muted">
                {edition.sentAt
                  ? t("editions.sentAt", { date: formatDateTime(edition.sentAt) })
                  : formatDate(edition.windowStart)}
              </p>
            </div>
            {link && (
              <button
                type="button"
                onClick={() => open(link)}
                className="flex shrink-0 items-center gap-1.5 rounded-lg border border-accent/30 bg-accent/10 px-3 py-1.5 text-xs font-medium text-accent-text transition-colors hover:bg-accent/15"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                {t("editions.open")}
              </button>
            )}
          </article>
        );
      })}
    </div>
  );
}
