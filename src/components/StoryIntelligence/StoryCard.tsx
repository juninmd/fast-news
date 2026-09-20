import type { StoryNode } from "../../hooks/useStories";

const IMPACT_COLORS: Record<string, string> = {
	critical: "border-accent-tertiary/40 text-accent-tertiary",
	high: "border-accent-tertiary/30 text-accent-tertiary/90",
	medium: "border-border-subtle text-text-secondary",
	low: "border-accent-secondary/30 text-accent-secondary",
};

const SIGNAL_COLORS: Record<string, string> = {
	bullish: "text-accent-secondary",
	bearish: "text-accent-tertiary",
	neutral: "text-text-secondary",
};

const SIGNAL_ICONS: Record<string, string> = {
	bullish: "↑",
	bearish: "↓",
	neutral: "→",
};

interface Props {
	story: StoryNode;
	onClick?: () => void;
	selected?: boolean;
}

export function StoryCard({ story, onClick, selected }: Props) {
	const impactClass = IMPACT_COLORS[story.impactLevel] ?? IMPACT_COLORS.medium;
	const signal = story.financialSignal ?? "neutral";

	return (
		<div
			onClick={onClick}
			className={`cursor-pointer border p-4 transition-colors ${
				selected
					? "border-accent-primary bg-accent-primary/5"
					: "border-border-subtle hover:border-accent-primary/40"
			}`}
		>
			<div className="mb-2 flex items-start justify-between gap-2">
				<span
					className={`border px-1.5 py-0.5 font-mono text-[11px] uppercase ${impactClass}`}
				>
					{story.impactLevel}
				</span>
				<span
					className={`font-mono text-xs font-semibold ${SIGNAL_COLORS[signal]}`}
				>
					{SIGNAL_ICONS[signal]} {signal}
				</span>
			</div>

			<h3 className="mb-1 line-clamp-2 font-sans text-sm font-semibold text-text-primary">
				{story.title}
			</h3>

			{story.summary && (
				<p className="mb-2 line-clamp-2 text-xs text-text-secondary">
					{story.summary}
				</p>
			)}

			{story.affectedAssets?.length > 0 && (
				<div className="mb-2 flex flex-wrap gap-1.5">
					{story.affectedAssets.slice(0, 4).map((asset) => (
						<span
							key={asset}
							className="border border-accent-primary/30 px-1.5 py-0.5 font-mono text-[11px] text-accent-primary"
						>
							{asset}
						</span>
					))}
				</div>
			)}

			<div className="flex items-center justify-between font-mono text-[11px] text-text-secondary">
				<span className="border border-border-subtle px-1.5 py-0.5">
					{story.category}
				</span>
				<span>{story.articleCount} artigos</span>
			</div>
		</div>
	);
}
