import { useCallback, useEffect, useRef, useState } from "react";
import { t } from "../i18n";
import { api, errText } from "../lib/api";
import { formatNumber } from "../lib/format";
import { useAsync } from "../lib/hooks";
import type { Article } from "../lib/types";
import Badge from "../components/Badge";
import CategoryChips from "../components/CategoryChips";
import EmptyState from "../components/EmptyState";
import ErrorBanner from "../components/ErrorBanner";
import NewsCard from "../components/NewsCard";
import Skeleton from "../components/Skeleton";

const PAGE_SIZE = 20;

type Props = { version: number; onOpenArticle: (id: string) => void };

export default function FeedTab({ version, onOpenArticle }: Props) {
  const [category, setCategory] = useState<string | null>(null);
  const [items, setItems] = useState<Article[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const seq = useRef(0);

  const categories = useAsync(() => api.categories(), [version]).data ?? [];

  const load = useCallback(
    async (nextPage: number, replace: boolean) => {
      const id = ++seq.current;
      setLoading(true);
      setError(null);
      try {
        const result = await api.newsList(nextPage, PAGE_SIZE, category ?? undefined);
        if (seq.current !== id) return;
        setItems((previous) => (replace ? result.data : [...previous, ...result.data]));
        setPage(result.page || nextPage);
        setHasMore(result.hasMore);
      } catch (cause) {
        if (seq.current === id) setError(errText(cause));
      } finally {
        if (seq.current === id) setLoading(false);
      }
    },
    [category],
  );

  useEffect(() => {
    void load(1, true);
  }, [load, version]);

  return (
    <div className="flex h-full flex-col gap-3">
      <CategoryChips categories={categories} active={category} onPick={setCategory} />

      <div className="min-h-0 flex-1 overflow-y-auto pr-1">
        {error && <ErrorBanner message={t("app.error", { error })} onRetry={() => void load(1, true)} />}
        {items.length === 0 && loading && <Skeleton />}
        {items.length === 0 && !loading && !error && <EmptyState message={t("feed.empty")} />}

        <div className="flex flex-col gap-2">
          {items.map((article) => (
            <NewsCard
              key={article.id}
              article={article}
              onOpen={onOpenArticle}
              badges={
                article.importance_score !== null && article.importance_score > 0 ? (
                  <Badge tone="accent">
                    {t("article.importance", { value: formatNumber(article.importance_score, 1) })}
                  </Badge>
                ) : undefined
              }
            />
          ))}
        </div>

        {items.length > 0 && (
          <div className="flex items-center justify-center gap-3 py-4 text-xs text-faint">
            {hasMore ? (
              <button
                type="button"
                onClick={() => void load(page + 1, false)}
                disabled={loading}
                className="rounded-lg border border-edge px-3 py-1.5 text-muted hover:bg-hover hover:text-fg disabled:opacity-50"
              >
                {t("feed.loadMore")}
              </button>
            ) : (
              <span>{t("feed.end")}</span>
            )}
            {loading && <span>{t("app.loading")}</span>}
          </div>
        )}
      </div>
    </div>
  );
}
