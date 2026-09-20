import type { StoryNode } from "../../hooks/useStories";

const SIGNAL_CONFIG = {
	bullish: { label: "Alta", color: "text-accent-secondary", arrow: "↑" },
	bearish: { label: "Baixa", color: "text-accent-tertiary", arrow: "↓" },
	neutral: { label: "Neutro", color: "text-text-secondary", arrow: "→" },
};

const IMPACT_BADGE: Record<string, string> = {
	critical: "border-accent-tertiary text-accent-tertiary",
	high: "border-accent-tertiary/70 text-accent-tertiary/90",
	medium: "border-border-subtle text-text-secondary",
	low: "border-accent-secondary/60 text-accent-secondary",
};

interface Props {
	stories: StoryNode[];
	onStoryClick?: (story: StoryNode) => void;
}

export function IntelligencePanel({ stories, onStoryClick }: Props) {
	const opportunities = stories.filter(
		(s) => s.financialSignal && s.affectedAssets?.length > 0,
	);
	const critical = stories.filter(
		(s) => s.impactLevel === "critical" || s.impactLevel === "high",
	);

	return (
		<div className="space-y-4">
			{opportunities.length > 0 && (
				<section>
					<h3 className="mb-2 font-mono text-[11px] uppercase tracking-wide text-text-secondary">
						Sinais de Mercado
					</h3>
					<div className="divide-y divide-border-subtle border border-border-subtle">
						{opportunities.slice(0, 5).map((story) => {
							const signal = story.financialSignal ?? "neutral";
							const cfg =
								SIGNAL_CONFIG[signal as keyof typeof SIGNAL_CONFIG] ??
								SIGNAL_CONFIG.neutral;
							return (
								<div
									key={story.id}
									onClick={() => onStoryClick?.(story)}
									className="cursor-pointer p-3 transition-colors hover:bg-bg-tertiary/40"
								>
									<div className="mb-1 flex items-center justify-between">
										<span
											className={`font-mono text-sm font-bold ${cfg.color}`}
										>
											{cfg.arrow} {cfg.label}
										</span>
										<div className="flex flex-wrap justify-end gap-1">
											{story.affectedAssets.slice(0, 3).map((a) => (
												<span
													key={a}
													className="border border-border-subtle px-1.5 py-0.5 font-mono text-[11px] text-text-primary"
												>
													{a}
												</span>
											))}
										</div>
									</div>
									<p className="line-clamp-2 text-xs text-text-primary">
										{story.title}
									</p>
								</div>
							);
						})}
					</div>
				</section>
			)}

			{critical.length > 0 && (
				<section>
					<h3 className="mb-2 font-mono text-[11px] uppercase tracking-wide text-text-secondary">
						Riscos Geopolíticos
					</h3>
					<div className="divide-y divide-border-subtle border border-border-subtle">
						{critical.slice(0, 4).map((story) => (
							<div
								key={story.id}
								onClick={() => onStoryClick?.(story)}
								className="cursor-pointer p-3 transition-colors hover:bg-bg-tertiary/40"
							>
								<div className="mb-1 flex items-start gap-2">
									<span
										className={`border px-1.5 py-0.5 font-mono text-[11px] uppercase ${IMPACT_BADGE[story.impactLevel]}`}
									>
										{story.impactLevel}
									</span>
								</div>
								<p className="line-clamp-2 text-xs font-medium text-text-primary">
									{story.title}
								</p>
								{story.worldImpact && (
									<p className="mt-1 line-clamp-2 text-xs text-text-secondary">
										{story.worldImpact}
									</p>
								)}
							</div>
						))}
					</div>
				</section>
			)}

			{opportunities.length === 0 && critical.length === 0 && (
				<p className="py-6 text-center font-mono text-xs text-text-secondary">
					Aguardando análise de histórias...
				</p>
			)}
		</div>
	);
}
