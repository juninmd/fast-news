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
    <div className="flex h-full flex-col gap-6 overflow-y-auto pb-4">
      <section className="flex shrink-0 flex-col gap-3">
        <h2 className="fn-kicker text-faint">{t("finance.summary")}</h2>
        {summary.data && summary.data.length > 0 ? (
          <div className="overflow-hidden rounded-2xl border border-edge bg-panel">
            <table className="w-full text-left text-[12.5px]">
              <thead className="border-b border-edge text-faint">
                <tr>
                  <th className="px-4 py-2.5 font-medium">{t("finance.col.direction")}</th>
                  <th className="px-4 py-2.5 font-medium">{t("finance.col.assetType")}</th>
                  <th className="px-4 py-2.5 text-right font-medium">{t("finance.col.count")}</th>
                  <th className="px-4 py-2.5 text-right font-medium">{t("finance.col.confidence")}</th>
                </tr>
              </thead>
              <tbody>
                {summary.data.map((row, index) => (
                  <tr key={`${row.direction}-${row.asset_type}-${index}`} className="border-t border-edge first:border-t-0">
                    <td className="px-4 py-2.5 text-fg">
                      {DIRECTION[row.direction] ? t(DIRECTION[row.direction].key) : row.direction}
                    </td>
                    <td className="px-4 py-2.5 text-muted">{row.asset_type ?? "—"}</td>
                    <td className="px-4 py-2.5 text-right text-muted">{parseCount(row.count)}</td>
                    <td className="px-4 py-2.5 text-right text-muted">{formatNumber(Number(row.avg_confidence), 2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-xs text-faint">{t("finance.summaryEmpty")}</p>
        )}
      </section>

      <section className="flex shrink-0 flex-col gap-3">
        <h2 className="fn-kicker text-faint">{t("finance.opportunities")}</h2>
        {list.data && list.data.length === 0 && (
          <EmptyState message={t("finance.empty")} icon={<Coins className="h-5 w-5" />} />
        )}
        {list.data?.map((item) => {
          const direction = item.direction ? DIRECTION[item.direction] : undefined;
          return (
            <article key={item.id} className="flex flex-col gap-2.5 rounded-2xl border border-edge bg-panel p-5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-reading text-[1.3rem] leading-none font-semibold text-fg">{item.asset}</span>
                {direction && <Badge tone={direction.tone}>{t(direction.key)}</Badge>}
                {item.asset_type && <Badge>{item.asset_type}</Badge>}
                {item.time_horizon && HORIZON[item.time_horizon] && <Badge>{t(HORIZON[item.time_horizon])}</Badge>}
                {item.confidence !== null && (
                  <Badge tone="accent">{t("finance.confidence", { value: item.confidence })}</Badge>
                )}
                <span className="ml-auto text-[11px] text-faint">{relativeTime(item.created_at)}</span>
              </div>
              {item.reasoning && <p className="text-[13.5px] leading-relaxed text-muted">{item.reasoning}</p>}
            </article>
          );
        })}
      </section>
    </div>
  );
}
