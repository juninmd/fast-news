import { t } from "../i18n";
import type { MessageKey } from "../i18n/pt-BR";
import { api, errText } from "../lib/api";
import { formatDateTime, formatDate } from "../lib/format";
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
    return <EmptyState message={t("editions.empty")} icon={<BookOpen className="h-7 w-7" />} />;
  }

  function open(url: string) {
    void api.openLink(url).catch((cause) => onError(errText(cause)));
  }

  return (
    <div className="flex flex-col gap-2 overflow-y-auto pr-1">
      {state.data.map((edition) => {
        const link = edition.links[0];
        return (
          <article key={`${edition.editionKey}-${edition.sentAt ?? ""}`} className="fn-card flex items-center gap-3 p-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 text-[11px] text-faint">
                <span className="font-medium tracking-wide text-accent-text uppercase">
                  {KIND[edition.kind] ? t(KIND[edition.kind]) : edition.kind}
                </span>
                {edition.windowStart && <span>· {formatDateTime(edition.windowStart)}</span>}
              </div>
              <p className="mt-1 text-sm font-medium text-fg">{formatDate(edition.sentAt ?? edition.windowStart)}</p>
              {edition.sentAt && (
                <p className="mt-0.5 text-xs text-faint">{t("editions.sentAt", { date: formatDateTime(edition.sentAt) })}</p>
              )}
            </div>
            {link && (
              <button
                type="button"
                onClick={() => open(link)}
                className="flex shrink-0 items-center gap-1.5 rounded-lg border border-accent/50 px-3 py-1.5 text-xs text-accent-text hover:bg-accent/10"
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
