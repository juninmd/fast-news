import { ExternalLink, Layers } from "lucide-react";
import type { TopNewsArticle } from "../../hooks/useTopNews";
import { useTopNews } from "../../hooks/useTopNews";
import { timeAgoShort } from "../../utils/format";
import { CoverImage } from "./CoverImage";

function Meta({ article }: { article: TopNewsArticle }) {
	return (
		<div className="mb-1.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 font-mono text-[11px] uppercase tracking-wide text-text-secondary">
			<span>{article.category}</span>
			<span className="text-faint">·</span>
			<span className="truncate">{article.source}</span>
			<span className="text-faint">·</span>
			<span className="tabular-nums">{timeAgoShort(article.published_at)}</span>
		</div>
	);
}

function Coverage({ article }: { article: TopNewsArticle }) {
	if (article.sourceCount < 2) return null;
	return (
		<span className="inline-flex items-center gap-1 bg-accent-primary/10 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-accent-primary">
			<Layers className="h-3 w-3" />
			{article.sourceCount} fontes
		</span>
	);
}

function Lead({
	article,
	onClick,
}: {
	article: TopNewsArticle;
	onClick: () => void;
}) {
	const others = (article.sources ?? []).filter(
		(s) => s.source !== article.source,
	);
	return (
		<article className="group grid gap-5 border-b border-border-subtle py-5 md:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
			<button
				type="button"
				onClick={onClick}
				className="block text-left"
				aria-label={article.title}
			>
				<CoverImage
					eager
					src={article.image_url}
					source={article.source}
					category={article.category}
					className="aspect-[16/9] w-full"
				/>
			</button>
			<div className="flex min-w-0 flex-col">
				<Meta article={article} />
				<button type="button" onClick={onClick} className="text-left">
					<h3 className="font-display text-2xl font-medium leading-tight text-text-primary transition-colors group-hover:text-accent-primary sm:text-3xl">
						{article.title}
					</h3>
				</button>
				{article.summary && (
					<p className="mt-3 line-clamp-3 text-sm leading-relaxed text-text-secondary">
						{article.summary}
					</p>
				)}
				<div className="mt-4 flex items-center gap-2">
					<Coverage article={article} />
					<span className="font-mono text-[11px] text-text-secondary">
						{article.articleCount && article.articleCount > article.sourceCount
							? `${article.articleCount} reportagens`
							: null}
					</span>
				</div>
				{others.length > 0 && (
					<ul className="mt-3 divide-y divide-border-subtle border border-border-subtle">
						{others.slice(0, 4).map((o) => (
							<li key={o.id}>
								<a
									href={o.url}
									target="_blank"
									rel="noopener noreferrer"
									className="group/link flex items-baseline gap-3 px-3 py-1.5 text-[13px] hover:bg-bg-secondary"
								>
									<span className="w-24 shrink-0 truncate font-mono text-[11px] uppercase tracking-wide text-text-secondary">
										{o.source}
									</span>
									<span className="min-w-0 flex-1 truncate text-text-primary group-hover/link:text-accent-primary">
										{o.title}
									</span>
									<ExternalLink className="h-3 w-3 shrink-0 text-text-secondary opacity-0 group-hover/link:opacity-100" />
								</a>
							</li>
						))}
					</ul>
				)}
			</div>
		</article>
	);
}

function Tile({
	article,
	rank,
	onClick,
}: {
	article: TopNewsArticle;
	rank: number;
	onClick: () => void;
}) {
	return (
		<button
			type="button"
			onClick={onClick}
			className="group flex gap-3 border-b border-border-subtle py-3 text-left last:border-b-0"
		>
			<CoverImage
				src={article.image_url}
				source={article.source}
				className="h-16 w-24 shrink-0"
			/>
			<span className="min-w-0 flex-1">
				<span className="mb-1 flex items-center gap-2 font-mono text-[10px] uppercase tracking-wide text-text-secondary">
					<span className="tabular-nums text-text-secondary/60">
						{String(rank).padStart(2, "0")}
					</span>
					<span className="truncate">{article.source}</span>
					<span className="tabular-nums">
						{timeAgoShort(article.published_at)}
					</span>
				</span>
				<span className="line-clamp-2 block font-display text-[15px] font-medium leading-snug text-text-primary transition-colors group-hover:text-accent-primary">
					{article.title}
				</span>
				{article.sourceCount > 1 && (
					<span className="mt-1 inline-flex items-center gap-1 font-mono text-[11px] font-semibold text-accent-primary">
						<Layers className="h-3 w-3" />
						{article.sourceCount} fontes
					</span>
				)}
			</span>
		</button>
	);
}

function SkeletonLead() {
	return (
		<div className="grid gap-5 py-5 md:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
			<div className="aspect-[16/9] skeleton" />
			<div className="space-y-3">
				<div className="h-3 w-1/3 skeleton" />
				<div className="h-8 w-full skeleton" />
				<div className="h-8 w-2/3 skeleton" />
				<div className="h-4 w-1/2 skeleton" />
			</div>
		</div>
	);
}

export function TopNewsSection({
	onArticleClick,
}: {
	onArticleClick: (id: string) => void;
}) {
	const { articles, loading } = useTopNews();

	if (!loading && articles.length === 0) return null;
	const [lead, ...rest] = articles;

	return (
		<section className="h-full border border-border-subtle">
			<div className="flex items-center justify-between border-b border-border-subtle bg-bg-secondary px-4 py-2">
				<h2 className="font-mono text-xs font-semibold uppercase tracking-widest text-text-primary">
					Em alta agora
				</h2>
				<span className="font-mono text-[11px] text-text-secondary">
					mesma notícia, várias fontes
				</span>
			</div>

			<div className="px-4">
				{loading || !lead ? (
					<SkeletonLead />
				) : (
					<Lead article={lead} onClick={() => onArticleClick(lead.id)} />
				)}
				{!loading && rest.length > 0 && (
					<div className="grid gap-x-6 md:grid-cols-2">
						{rest.slice(0, 6).map((a, i) => (
							<Tile
								key={a.id}
								article={a}
								rank={i + 2}
								onClick={() => onArticleClick(a.id)}
							/>
						))}
					</div>
				)}
			</div>
		</section>
	);
}
