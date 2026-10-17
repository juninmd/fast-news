import type { ReactNode } from "react";
import { relativeTime } from "../lib/format";

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
  /** Primeira matéria da lista: imagem larga e título maior, para abrir a seção. */
  featured?: boolean;
};

export default function NewsCard({ article, onOpen, badges, featured = false }: Props) {
  const when = relativeTime(article.published_at);

  if (featured) {
    return (
      <article className="group shrink-0 overflow-hidden rounded-2xl border border-edge bg-panel transition-colors hover:border-line">
        <button type="button" onClick={() => onOpen(article.id)} className="block w-full text-left">
          {article.image_url && (
            <div className="overflow-hidden border-b border-edge">
              <img
                src={article.image_url}
                alt=""
                loading="lazy"
                className="aspect-[16/7] max-h-64 w-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
              />
            </div>
          )}
          <div className="flex flex-col gap-2 p-6">
            <Meta article={article} when={when} />
            <h3 className="font-reading text-[1.5rem] leading-[1.25] font-semibold tracking-tight text-fg transition-colors group-hover:text-accent-text">
              {article.title}
            </h3>
            {article.summary && <p className="line-clamp-3 text-[14px] leading-relaxed text-muted">{article.summary}</p>}
            {badges && <div className="mt-1 flex flex-wrap items-center gap-1.5">{badges}</div>}
          </div>
        </button>
      </article>
    );
  }

  return (
    <article className="group shrink-0 rounded-2xl border border-edge bg-panel transition-colors hover:border-line">
      <button type="button" onClick={() => onOpen(article.id)} className="flex w-full items-start gap-4 p-4 text-left">
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <Meta article={article} when={when} />
          <h3 className="text-[15px] leading-[1.4] font-medium text-fg transition-colors group-hover:text-accent-text">
            {article.title}
          </h3>
          {article.summary && <p className="line-clamp-2 text-[13.5px] leading-[1.55] text-muted">{article.summary}</p>}
          {badges && <div className="mt-1 flex flex-wrap items-center gap-1.5">{badges}</div>}
        </div>
        {article.image_url && (
          <img
            src={article.image_url}
            alt=""
            loading="lazy"
            className="h-[5.25rem] w-[7.5rem] shrink-0 rounded-xl border border-edge object-cover"
          />
        )}
      </button>
    </article>
  );
}

function Meta({ article, when }: { article: CardData; when: string }) {
  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-faint">
      {article.category && <span className="fn-kicker text-accent-text">{article.category}</span>}
      {article.source && (
        <>
          <span aria-hidden="true">·</span>
          <span className="truncate">{article.source}</span>
        </>
      )}
      {when && (
        <>
          <span aria-hidden="true">·</span>
          <span className="whitespace-nowrap">{when}</span>
        </>
      )}
    </div>
  );
}
