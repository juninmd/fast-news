import { CoverImage } from "../components/NeoEditorial/CoverImage";
import { timeAgoShort } from "../utils/format";
import type { MobileArticle } from "./types";

const short = (s: string) => (s.length > 24 ? `${s.slice(0, 23)}…` : s);

export function Meta({ children }: { children: React.ReactNode }) {
	return (
		<span className="font-mono text-[11px] uppercase tracking-wider text-text-secondary">
			{children}
		</span>
	);
}

/** One story in the feed: text first, small square photo on the right. */
export function StoryRow({
	article,
	onOpen,
}: {
	article: MobileArticle;
	onOpen: (a: MobileArticle) => void;
}) {
	const sources = article.sourceCount ?? 1;
	return (
		<button
			type="button"
			onClick={() => onOpen(article)}
			className="flex w-full gap-3.5 border-b border-border-subtle py-4 text-left"
		>
			<div className="min-w-0 flex-1">
				<Meta>
					{article.category} · {short(article.source)}
					{sources > 1 ? ` · ${sources} fontes` : ""} ·{" "}
					{timeAgoShort(article.publishedAt)}
				</Meta>
				<p className="mt-1 line-clamp-3 text-base font-semibold leading-snug text-text-primary">
					{article.title}
				</p>
			</div>
			<CoverImage
				src={article.imageUrl}
				source={article.source}
				category={article.category}
				className="h-[84px] w-[84px] shrink-0 rounded-[10px]"
			/>
		</button>
	);
}

export function RowSkeleton() {
	return (
		<div
			className="flex gap-3.5 border-b border-border-subtle py-4"
			aria-hidden
		>
			<div className="flex-1 space-y-2">
				<div className="h-3 w-2/3 animate-pulse rounded bg-bg-tertiary" />
				<div className="h-4 w-full animate-pulse rounded bg-bg-tertiary" />
				<div className="h-4 w-4/5 animate-pulse rounded bg-bg-tertiary" />
			</div>
			<div className="h-[84px] w-[84px] animate-pulse rounded-[10px] bg-bg-tertiary" />
		</div>
	);
}
