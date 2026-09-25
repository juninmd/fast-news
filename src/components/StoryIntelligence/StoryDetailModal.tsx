import type { ArticleNode, StoryDetail } from "../../hooks/useStories";
import { StoryTimeline } from "./StoryTimeline";

const IMPACT_COLORS: Record<string, string> = {
	critical: "text-accent-tertiary",
	high: "text-accent-tertiary/90",
	medium: "text-text-secondary",
	low: "text-accent-secondary",
};

const SIGNAL_COLORS: Record<string, string> = {
	bullish: "text-accent-secondary",
	bearish: "text-accent-tertiary",
	neutral: "text-text-secondary",
};

interface Props {
	detail: StoryDetail;
	onClose: () => void;
	onArticleClick?: (article: ArticleNode) => void;
}

export function StoryDetailModal({ detail, onClose, onArticleClick }: Props) {
	const { story, articles, timeline } = detail;
	const signal = story.financialSignal ?? "neutral";

	return (
		<div
			className="fixed inset-0 z-50 flex items-center justify-center bg-strong/60 p-4"
			onClick={onClose}
		>
			<div
				className="relative max-h-[90vh] w-full max-w-3xl overflow-y-auto border border-border-subtle bg-bg-primary"
				onClick={(e) => e.stopPropagation()}
			>
				<div className="sticky top-0 flex items-start gap-3 border-b border-border-subtle bg-bg-primary p-4">
					<div className="flex-1">
						<div className="mb-1 flex items-center gap-2">
							<span className="border border-border-subtle px-2 py-0.5 font-mono text-[11px] text-text-secondary">
								{story.category}
							</span>
							<span
								className={`font-mono text-[11px] font-semibold uppercase ${IMPACT_COLORS[story.impactLevel]}`}
							>
								Impacto {story.impactLevel}
							</span>
							{story.financialSignal && (
								<span
									className={`font-mono text-xs font-bold ${SIGNAL_COLORS[signal]}`}
								>
									{signal === "bullish"
										? "↑ Alta"
										: signal === "bearish"
											? "↓ Baixa"
											: "→ Neutro"}
								</span>
							)}
						</div>
						<h2 className="font-display text-lg font-semibold text-text-primary">
							{story.title}
						</h2>
						{story.summary && (
							<p className="mt-1 text-sm text-text-secondary">
								{story.summary}
							</p>
						)}
					</div>
					<button
						onClick={onClose}
						className="border border-border-subtle px-2 py-1 text-lg leading-none text-text-secondary transition-colors hover:text-text-primary"
					>
						✕
					</button>
				</div>

				<div className="space-y-6 p-4">
					{story.worldImpact && (
						<section>
							<h3 className="mb-2 font-mono text-[11px] uppercase tracking-wide text-text-secondary">
								Impacto no Mundo
							</h3>
							<p className="border border-border-subtle p-3 text-sm text-text-primary">
								{story.worldImpact}
							</p>
						</section>
					)}

					{story.affectedAssets?.length > 0 && (
						<section>
							<h3 className="mb-2 font-mono text-[11px] uppercase tracking-wide text-text-secondary">
								Ativos Afetados
							</h3>
							<div className="flex flex-wrap gap-2">
								{story.affectedAssets.map((asset) => (
									<span
										key={asset}
										className={`border px-3 py-1 font-mono text-xs font-semibold ${
											signal === "bullish"
												? "border-accent-secondary/40 text-accent-secondary"
												: signal === "bearish"
													? "border-accent-tertiary/40 text-accent-tertiary"
													: "border-accent-primary/40 text-accent-primary"
										}`}
									>
										{asset}
									</span>
								))}
							</div>
						</section>
					)}

					{timeline.length > 0 && (
						<section>
							<h3 className="mb-3 font-mono text-[11px] uppercase tracking-wide text-text-secondary">
								Linha do Tempo ({timeline.length} eventos)
							</h3>
							<StoryTimeline events={timeline} />
						</section>
					)}

					<section>
						<h3 className="mb-2 font-mono text-[11px] uppercase tracking-wide text-text-secondary">
							{articles.length} Artigos Correlacionados
						</h3>
						<div className="divide-y divide-border-subtle border border-border-subtle">
							{articles.map((article) => (
								<a
									key={article.id}
									href={article.url}
									target="_blank"
									rel="noopener noreferrer"
									onClick={(e) => {
										e.stopPropagation();
										onArticleClick?.(article);
									}}
									className="group flex items-start gap-2 p-3 transition-colors hover:bg-bg-tertiary/40"
								>
									<div className="min-w-0 flex-1">
										<p className="line-clamp-2 text-xs font-medium text-text-primary group-hover:text-accent-primary">
											{article.title}
										</p>
										<p className="mt-0.5 font-mono text-[11px] text-text-secondary">
											{article.source}
										</p>
									</div>
									<span className="shrink-0 text-xs text-text-secondary">
										↗
									</span>
								</a>
							))}
						</div>
					</section>
				</div>
			</div>
		</div>
	);
}
