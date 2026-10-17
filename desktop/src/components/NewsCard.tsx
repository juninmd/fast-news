import type { ReactNode } from "react";
import { relativeTime, truncate } from "../lib/format";

export type CardData = {
  id: string;
  title: string;
  summary?: string | null;
  source: string;
  category: string;
  published_at: string | null;
  image_url?: string | null;
};

type Props = {
  article: CardData;
  onOpen: (id: string) => void;
  badges?: ReactNode;
  actions?: ReactNode;
};

export default function NewsCard({ article, onOpen, badges, actions }: Props) {
  const when = relativeTime(article.published_at);
  return (
    <article className="fn-card flex gap-3 p-3 transition-colors hover:border-line">
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-faint">
          {article.category && <span className="font-medium tracking-wide text-accent-text uppercase">{article.category}</span>}
          <span className="truncate">{article.source}</span>
          {when && <span>· {when}</span>}
        </div>
        <button
          type="button"
          onClick={() => onOpen(article.id)}
          className="mt-1 text-left text-sm leading-snug font-medium text-fg hover:text-accent-text"
        >
          {article.title}
        </button>
        {article.summary && <p className="mt-1 line-clamp-2 text-xs text-muted">{truncate(article.summary, 240)}</p>}
        {(badges || actions) && (
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            {badges}
            {actions}
          </div>
        )}
      </div>
      {article.image_url && (
        <img
          src={article.image_url}
          alt=""
          loading="lazy"
          className="h-20 w-28 shrink-0 rounded-lg border border-edge object-cover"
        />
      )}
    </article>
  );
}
