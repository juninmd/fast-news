import { ExternalLink } from "lucide-react";
import type { TopNewsArticle } from "../../hooks/useTopNews";
import { useTopNews } from "../../hooks/useTopNews";

function timeAgo(dateStr: string): string {
	const diff = Date.now() - new Date(dateStr).getTime();
	if (diff < 0) return new Date(dateStr).toLocaleDateString("pt-BR");
	const h = Math.floor(diff / 3_600_000);
	if (h < 1) return `${Math.max(1, Math.floor(diff / 60_000))}min`;
	if (h < 24) return `${h}h`;
	return `${Math.floor(h / 24)}d`;
}

function WireRow({
	article,
	rank,
	onClick,
	lead = false,
}: {
	article: TopNewsArticle;
	rank: number;
	onClick: () => void;
	lead?: boolean;
}) {
	const score = Math.round(article.importance_score ?? 0);

	return (
		<button
			onClick={onClick}
			className="group flex w-full items-start gap-4 border-b border-border-subtle py-4 text-left last:border-b-0"
		>
			<span
				className={`shrink-0 pt-0.5 font-mono tabular-nums text-text-secondary/60 ${
					lead ? "text-3xl" : "text-lg"
				}`}
			>
				{String(rank).padStart(2, "0")}
			</span>

			<div className="min-w-0 flex-1">
				<div className="mb-1.5 flex items-center gap-2 font-mono text-[11px] uppercase tracking-wide text-text-secondary">
					<span>{article.category}</span>
					<span className="text-faint">·</span>
					<span className="truncate">{article.source}</span>
					<span className="text-faint">·</span>
					<span className="tabular-nums">{timeAgo(article.published_at)}</span>
					{article.sourceCount > 1 && (
						<>
							<span className="text-faint">·</span>
							<span className="tabular-nums text-accent-primary">
								{article.sourceCount} fontes
							</span>
						</>
					)}
				</div>
				<h3
					className={`font-display font-medium leading-snug text-text-primary transition-colors group-hover:text-accent-primary ${
						lead ? "text-2xl sm:text-3xl" : "text-base sm:text-lg"
					}`}
				>
					{article.title}
				</h3>
				{lead && article.summary && (
					<p className="mt-2 max-w-2xl text-sm leading-relaxed text-text-secondary">
						{article.summary}
					</p>
				)}
			</div>

			{article.image_url && (
				<div
					className={`hidden shrink-0 overflow-hidden border border-border-subtle bg-bg-tertiary sm:block ${
						lead ? "h-24 w-40" : "h-16 w-24"
					}`}
				>
					<img
						src={article.image_url}
						alt=""
						loading="lazy"
						className="h-full w-full object-cover"
					/>
				</div>
			)}

			<div className="hidden shrink-0 flex-col items-end gap-1 pt-0.5 sm:flex">
				<span className="font-mono text-xs tabular-nums text-text-secondary">
					{score}
				</span>
				<div className="h-1 w-10 overflow-hidden bg-bg-tertiary">
					<div
						className="h-full bg-accent-primary"
						style={{ width: `${score}%` }}
					/>
				</div>
			</div>

			<ExternalLink className="mt-1 h-3.5 w-3.5 shrink-0 text-text-secondary opacity-0 transition-opacity group-hover:opacity-100" />
		</button>
	);
}

function SkeletonRow({ lead = false }: { lead?: boolean }) {
	return (
		<div className="flex items-start gap-4 border-b border-border-subtle py-4 last:border-b-0">
			<div
				className={`shrink-0 animate-pulse bg-bg-tertiary ${lead ? "h-8 w-6" : "h-5 w-5"}`}
			/>
			<div className="flex-1 space-y-2">
				<div className="h-3 w-1/4 animate-pulse bg-bg-tertiary" />
				<div
					className={`animate-pulse bg-bg-tertiary ${lead ? "h-8 w-3/4" : "h-5 w-2/3"}`}
				/>
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

	return (
		<section className="mb-10 border border-border-subtle">
			<div className="flex items-center justify-between border-b border-border-subtle bg-bg-secondary px-4 py-2">
				<h2 className="font-mono text-xs font-semibold uppercase tracking-widest text-text-primary">
					Em alta agora
				</h2>
				<span className="font-mono text-[11px] text-text-secondary">
					cobertura entre portais + relevância
				</span>
			</div>

			<div className="px-4">
				{loading ? (
					<>
						<SkeletonRow lead />
						{Array.from({ length: 4 }).map((_, i) => (
							<SkeletonRow key={i} />
						))}
					</>
				) : (
					articles
						.slice(0, 5)
						.map((a, i) => (
							<WireRow
								key={a.id}
								article={a}
								rank={i + 1}
								lead={i === 0}
								onClick={() => onArticleClick(a.id)}
							/>
						))
				)}
			</div>
		</section>
	);
}
