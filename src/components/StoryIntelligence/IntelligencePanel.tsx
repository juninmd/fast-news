import React from "react";
import type { StoryNode } from "../../hooks/useStories";

const SIGNAL_CONFIG = {
	bullish: {
		label: "Alta",
		color: "text-green-400",
		bg: "bg-green-500/10 border-green-500/30",
		arrow: "↑",
	},
	bearish: {
		label: "Baixa",
		color: "text-red-400",
		bg: "bg-red-500/10 border-red-500/30",
		arrow: "↓",
	},
	neutral: {
		label: "Neutro",
		color: "text-gray-400",
		bg: "bg-gray-500/10 border-gray-500/30",
		arrow: "→",
	},
};

const IMPACT_BADGE: Record<string, string> = {
	critical: "bg-red-500 text-white",
	high: "bg-orange-500 text-white",
	medium: "bg-yellow-500 text-black",
	low: "bg-green-600 text-white",
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
			{/* Market Signals */}
			{opportunities.length > 0 && (
				<section>
					<h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">
						Sinais de Mercado
					</h3>
					<div className="space-y-2">
						{opportunities.slice(0, 5).map((story) => {
							const signal = story.financialSignal ?? "neutral";
							const cfg =
								SIGNAL_CONFIG[signal as keyof typeof SIGNAL_CONFIG] ??
								SIGNAL_CONFIG.neutral;
							return (
								<div
									key={story.id}
									onClick={() => onStoryClick?.(story)}
									className={`cursor-pointer rounded-lg border p-3 ${cfg.bg} transition-opacity hover:opacity-80`}
								>
									<div className="flex items-center justify-between mb-1">
										<span className={`text-sm font-bold ${cfg.color}`}>
											{cfg.arrow} {cfg.label}
										</span>
										<div className="flex flex-wrap gap-1 justify-end">
											{story.affectedAssets.slice(0, 3).map((a) => (
												<span
													key={a}
													className="text-xs px-1.5 py-0.5 rounded bg-black/20 font-mono text-white"
												>
													{a}
												</span>
											))}
										</div>
									</div>
									<p className="text-xs text-text-primary line-clamp-2">
										{story.title}
									</p>
								</div>
							);
						})}
					</div>
				</section>
			)}

			{/* High Impact Risks */}
			{critical.length > 0 && (
				<section>
					<h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">
						Riscos Geopolíticos
					</h3>
					<div className="space-y-2">
						{critical.slice(0, 4).map((story) => (
							<div
								key={story.id}
								onClick={() => onStoryClick?.(story)}
								className="cursor-pointer rounded-lg border border-border bg-surface p-3 hover:border-accent/50 transition-colors"
							>
								<div className="flex items-start gap-2 mb-1">
									<span
										className={`text-xs font-bold px-1.5 py-0.5 rounded ${IMPACT_BADGE[story.impactLevel]}`}
									>
										{story.impactLevel.toUpperCase()}
									</span>
								</div>
								<p className="text-xs font-medium text-text-primary line-clamp-2">
									{story.title}
								</p>
								{story.worldImpact && (
									<p className="text-xs text-text-secondary line-clamp-2 mt-1">
										{story.worldImpact}
									</p>
								)}
							</div>
						))}
					</div>
				</section>
			)}

			{opportunities.length === 0 && critical.length === 0 && (
				<p className="text-xs text-text-secondary text-center py-6">
					Aguardando análise de histórias...
				</p>
			)}
		</div>
	);
}
