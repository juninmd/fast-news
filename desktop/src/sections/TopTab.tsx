import { t } from "../i18n";
import { api } from "../lib/api";
import { credibilityScore } from "../lib/format";
import { useAsync } from "../lib/hooks";
import Badge from "../components/Badge";
import EmptyState from "../components/EmptyState";
import ErrorBanner from "../components/ErrorBanner";
import { Flame } from "../components/Icons";
import NewsCard from "../components/NewsCard";
import Skeleton from "../components/Skeleton";

type Props = { version: number; onOpenArticle: (id: string) => void };

export default function TopTab({ version, onOpenArticle }: Props) {
  const state = useAsync(() => api.newsTop(), [version]);

  if (state.loading && !state.data) return <Skeleton />;
  if (state.error) return <ErrorBanner message={t("app.error", { error: state.error })} onRetry={state.reload} />;
  if (!state.data || state.data.length === 0) return <EmptyState message={t("top.empty")} icon={<Flame className="h-7 w-7" />} />;

  return (
    <div className="flex flex-col gap-2 overflow-y-auto pr-1">
      {state.data.map((article) => {
        const credibility = credibilityScore(article.fake_news_score);
        return (
          <NewsCard
            key={article.id}
            article={article}
            onOpen={onOpenArticle}
            badges={
              <>
                <Badge tone="accent">{t("top.sources", { n: article.sourceCount })}</Badge>
                {credibility !== null && (
                  <Badge tone={credibility >= 7 ? "ok" : credibility >= 4 ? "warn" : "danger"}>
                    {t("article.credibility", { value: credibility })}
                  </Badge>
                )}
                {article.political_bias && <Badge tone="warn">{t("article.bias", { value: article.political_bias })}</Badge>}
                {article.is_militant && <Badge tone="danger">{t("article.militant")}</Badge>}
              </>
            }
          />
        );
      })}
    </div>
  );
}
