import { t } from "../i18n";
import type { MessageKey } from "../i18n/pt-BR";
import { api } from "../lib/api";
import { formatNumber, parseCount, relativeTime } from "../lib/format";
import { useAsync } from "../lib/hooks";
import Badge, { type Tone } from "../components/Badge";
import EmptyState from "../components/EmptyState";
import ErrorBanner from "../components/ErrorBanner";
import { Coins } from "../components/Icons";
import Skeleton from "../components/Skeleton";

const DIRECTION: Record<string, { key: MessageKey; tone: Tone }> = {
  buy: { key: "finance.buy", tone: "ok" },
  sell: { key: "finance.sell", tone: "danger" },
  watch: { key: "finance.watch", tone: "warn" },
};

const HORIZON: Record<string, MessageKey> = {
  short: "finance.short",
  medium: "finance.medium",
  long: "finance.long",
};

export default function FinanceTab({ version }: { version: number }) {
  const list = useAsync(() => api.financial(), [version]);
  const summary = useAsync(() => api.financialSummary(), [version]);

  if (list.loading && !list.data) return <Skeleton rows={3} />;
  if (list.error) return <ErrorBanner message={t("app.error", { error: list.error })} onRetry={list.reload} />;

  return (
    <div className="flex h-full flex-col gap-3 overflow-y-auto pr-1">
      <section className="flex flex-col gap-2">
        <h3 className="text-xs font-semibold tracking-wide text-faint uppercase">{t("finance.summary")}</h3>
        {summary.data && summary.data.length > 0 ? (
          <div className="fn-card overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-raised text-faint">
                <tr>
                  <th className="px-3 py-2 font-medium">{t("finance.col.direction")}</th>
                  <th className="px-3 py-2 font-medium">{t("finance.col.assetType")}</th>
                  <th className="px-3 py-2 text-right font-medium">{t("finance.col.count")}</th>
                  <th className="px-3 py-2 text-right font-medium">{t("finance.col.confidence")}</th>
                </tr>
              </thead>
              <tbody>
                {summary.data.map((row, index) => (
                  <tr key={`${row.direction}-${row.asset_type}-${index}`} className="border-t border-edge">
                    <td className="px-3 py-2 text-fg">
                      {DIRECTION[row.direction] ? t(DIRECTION[row.direction].key) : row.direction}
                    </td>
                    <td className="px-3 py-2 text-muted">{row.asset_type ?? "—"}</td>
                    <td className="px-3 py-2 text-right text-muted">{parseCount(row.count)}</td>
                    <td className="px-3 py-2 text-right text-muted">{formatNumber(Number(row.avg_confidence), 2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-xs text-faint">{t("finance.summaryEmpty")}</p>
        )}
      </section>

      <section className="flex flex-col gap-2">
        {list.data && list.data.length === 0 && <EmptyState message={t("finance.empty")} icon={<Coins className="h-7 w-7" />} />}
        {list.data?.map((item) => {
          const direction = item.direction ? DIRECTION[item.direction] : undefined;
          return (
            <article key={item.id} className="fn-card flex flex-col gap-2 p-3">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-fg">{item.asset}</span>
                {direction && <Badge tone={direction.tone}>{t(direction.key)}</Badge>}
                {item.asset_type && <Badge>{item.asset_type}</Badge>}
                {item.time_horizon && HORIZON[item.time_horizon] && (
                  <Badge>{t(HORIZON[item.time_horizon])}</Badge>
                )}
                {item.confidence !== null && <Badge tone="accent">{t("finance.confidence", { value: item.confidence })}</Badge>}
                <span className="ml-auto text-[11px] text-faint">{relativeTime(item.created_at)}</span>
              </div>
              {item.reasoning && <p className="text-xs leading-relaxed text-muted">{item.reasoning}</p>}
            </article>
          );
        })}
      </section>
    </div>
  );
}
