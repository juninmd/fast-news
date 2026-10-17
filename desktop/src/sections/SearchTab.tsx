import { useState } from "react";
import { t } from "../i18n";
import { api } from "../lib/api";
import { similarityPercent } from "../lib/format";
import { useAsync, useDebounced } from "../lib/hooks";
import type { ArticleSearch } from "../lib/types";
import Badge from "../components/Badge";
import EmptyState from "../components/EmptyState";
import ErrorBanner from "../components/ErrorBanner";
import NewsCard from "../components/NewsCard";
import SearchField from "../components/SearchField";
import Skeleton from "../components/Skeleton";

type Mode = "semantic" | "text";

export default function SearchTab({ onOpenArticle }: { onOpenArticle: (id: string) => void }) {
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState<Mode>("semantic");
  const term = useDebounced(query.trim(), 400);
  const ready = term.length >= 3;

  // Both endpoints answer the same shape, so the view does not care which one ranked the rows —
  // only `mode` matters, and it is "keyword" when the server had to degrade.
  const state = useAsync<ArticleSearch>(
    async () => {
      if (mode === "semantic") {
        const result = await api.ragSearch(term, 20);
        return { data: result.results, mode: result.mode };
      }
      return api.newsSearch(term);
    },
    [term, mode],
    { enabled: ready },
  );

  const results = state.data?.data ?? [];
  const degraded = state.data?.mode === "keyword";

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="min-w-0 flex-1">
          <SearchField value={query} onChange={setQuery} placeholder={t("search.placeholder")} autoFocus />
        </div>
        <div className="flex shrink-0 rounded-lg border border-edge p-0.5 text-xs">
          <ModeButton label={t("search.semantic")} active={mode === "semantic"} onClick={() => setMode("semantic")} />
          <ModeButton label={t("search.text")} active={mode === "text"} onClick={() => setMode("text")} />
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto pr-1">
        {!ready && <p className="py-10 text-center text-sm text-faint">{t("search.hint")}</p>}
        {ready && state.loading && results.length === 0 && <Skeleton rows={3} />}
        {ready && state.error && <ErrorBanner message={t("app.error", { error: state.error })} onRetry={state.reload} />}
        {ready && !state.loading && !state.error && results.length === 0 && (
          <EmptyState message={t("search.empty", { q: term })} />
        )}

        {ready && results.length > 0 && (
          <>
            <div className="flex flex-wrap items-center gap-2 pb-2 text-xs text-faint">
              <span>{t("search.results", { n: results.length })}</span>
              {degraded && <Badge tone="warn">{t("search.keywordMode")}</Badge>}
            </div>
            <div className="flex flex-col gap-2">
              {results.map((hit) => (
                <NewsCard
                  key={hit.id}
                  article={hit}
                  onOpen={onOpenArticle}
                  badges={degraded ? undefined : <Similarity similarity={hit.similarity} />}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function ModeButton({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-md px-2.5 py-1 transition-colors ${
        active ? "bg-accent/15 text-accent-text" : "text-muted hover:bg-hover hover:text-fg"
      }`}
    >
      {label}
    </button>
  );
}

function Similarity({ similarity }: { similarity: number | null }) {
  const percent = similarityPercent(similarity);
  return percent === null ? null : <Badge tone="accent">{t("search.similarity", { value: percent })}</Badge>;
}
