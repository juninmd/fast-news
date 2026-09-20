import { ExternalLink, Flame } from "lucide-react";
import type { TopNewsArticle } from "../../hooks/useTopNews";
import { useTopNews } from "../../hooks/useTopNews";

const categoryColors: Record<string, string> = {
	"AI Frontier": "bg-accent-primary/15 text-accent-primary",
	"Big Techs": "bg-accent-secondary/15 text-accent-secondary",
	"Dev Tools": "bg-accent-secondary/15 text-accent-secondary",
	Tecnologia: "bg-accent-secondary/15 text-accent-secondary",
	Mundo: "bg-bg-tertiary text-text-secondary",
	Brasil: "bg-bg-tertiary text-text-secondary",
	default: "bg-bg-tertiary text-text-secondary",
};

function importanceColor(score: number): string {
	if (score >= 80) return "from-accent-primary to-accent-tertiary";
	if (score >= 60) return "from-accent-tertiary to-accent-secondary";
	if (score >= 40) return "from-accent-secondary to-accent-primary";
	return "from-accent-secondary to-accent-tertiary";
}

function timeAgo(dateStr: string): string {
	const diff = Date.now() - new Date(dateStr).getTime();
	if (diff < 0) return new Date(dateStr).toLocaleDateString("pt-BR");
	const h = Math.floor(diff / 3_600_000);
	if (h < 1) return `${Math.max(1, Math.floor(diff / 60_000))}m`;
	if (h < 24) return `${h}h`;
	return `${Math.floor(h / 24)}d`;
}

function TopCard({
	article,
	onClick,
	featured = false,
}: {
	article: TopNewsArticle;
	onClick: () => void;
	featured?: boolean;
}) {
	const catClass = categoryColors[article.category] ?? categoryColors.default;
	const score = Math.round(article.importance_score ?? 0);

	return (
		<button
			onClick={onClick}
			className={`group glass relative overflow-hidden text-left transition-all duration-200 hover:-translate-y-1 hover:border-accent-primary/40 ${
				featured ? "min-h-[420px]" : ""
			}`}
		>
			<div className={`relative overflow-hidden ${featured ? "h-64" : "h-28"}`}>
				{article.image_url ? (
					<img
						src={article.image_url}
						alt=""
						className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
						loading="lazy"
					/>
				) : (
					<div className="flex h-full items-center justify-center bg-gradient-to-br from-bg-tertiary to-bg-secondary">
						<Flame className="h-10 w-10 text-accent-primary/30" />
					</div>
				)}
				<div className="absolute inset-0 bg-gradient-to-t from-bg-secondary via-bg-secondary/10 to-transparent" />
			</div>

			<div className={featured ? "p-5" : "p-3"}>
				<div className="mb-2 flex items-center gap-1.5">
					<span
						className={`rounded-full px-2 py-0.5 text-xs font-medium ${catClass}`}
					>
						{article.category}
					</span>
					<span className="ml-auto text-xs text-text-secondary">
						{timeAgo(article.published_at)}
					</span>
				</div>

				<h4
					className={`mb-2 font-bold leading-tight text-text-primary transition-colors group-hover:text-accent-primary ${
						featured ? "line-clamp-3 text-2xl" : "line-clamp-2 text-sm"
					}`}
				>
					{article.title}
				</h4>
				{featured && article.summary && (
					<p className="mb-4 line-clamp-3 text-sm leading-relaxed text-text-secondary">
						{article.summary}
					</p>
				)}

				<div className="flex items-center justify-between gap-3">
					<span className="min-w-0 flex-1 truncate text-xs text-text-secondary">
						{article.source}
					</span>
					<div className="flex items-center gap-1 shrink-0">
						<div className="h-1 w-16 overflow-hidden rounded-full bg-bg-tertiary">
							<div
								className={`h-full rounded-full bg-gradient-to-r ${importanceColor(score)}`}
								style={{ width: `${score}%` }}
							/>
						</div>
						<span className="font-numbers text-xs text-text-secondary">
							{score}
						</span>
					</div>
				</div>
			</div>

			<div className="absolute right-2 top-2 opacity-0 transition-opacity group-hover:opacity-100">
				<div className="glass rounded-lg p-1">
					<ExternalLink className="h-3 w-3 text-accent-primary" />
				</div>
			</div>
		</button>
	);
}

function SkeletonCard() {
	return (
		<div className="glass min-h-56 animate-pulse">
			<div className="h-32 bg-bg-tertiary" />
			<div className="space-y-2 p-3">
				<div className="h-3 w-1/2 rounded bg-bg-tertiary" />
				<div className="h-4 rounded bg-bg-tertiary" />
				<div className="h-4 w-3/4 rounded bg-bg-tertiary" />
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
		<section className="mb-8">
			<div className="mb-4 flex items-baseline gap-2">
				<Flame className="h-5 w-5 text-accent-primary" />
				<h2 className="font-display text-xl font-semibold text-text-primary">
					Em alta agora
				</h2>
			</div>

			<div className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.8fr)]">
				{loading ? (
					Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
				) : (
					<>
						<TopCard
							article={articles[0]}
							featured
							onClick={() => onArticleClick(articles[0].id)}
						/>
						<div className="grid gap-3">
							{articles.slice(1, 5).map((a) => (
								<TopCard
									key={a.id}
									article={a}
									onClick={() => onArticleClick(a.id)}
								/>
							))}
						</div>
					</>
				)}
			</div>
		</section>
	);
}
