import type { TimelineEvent } from "../../hooks/useStories";

const EVENT_STYLES: Record<string, { color: string; icon: string }> = {
	new_development: { color: "bg-accent-primary", icon: "●" },
	escalation: { color: "bg-accent-tertiary", icon: "▲" },
	contradiction: { color: "bg-accent-tertiary/70", icon: "⚡" },
	resolution: { color: "bg-accent-secondary", icon: "✓" },
	impact_update: { color: "bg-text-secondary", icon: "◆" },
};

interface Props {
	events: TimelineEvent[];
}

export function StoryTimeline({ events }: Props) {
	if (!events.length)
		return (
			<p className="py-6 text-center font-mono text-xs text-text-secondary">
				Sem eventos na linha do tempo
			</p>
		);

	return (
		<div className="relative pl-6">
			<div className="absolute bottom-0 left-2.5 top-0 w-px bg-border-subtle" />

			<div className="space-y-3">
				{events.map((event) => {
					const style =
						EVENT_STYLES[event.eventType] ?? EVENT_STYLES.new_development;
					const date = new Date(event.occurredAt);
					return (
						<div key={event.id} className="relative">
							<div
								className={`absolute -left-6 top-1.5 h-3 w-3 ${style.color}`}
							/>

							<div className="border border-border-subtle p-3">
								<div className="mb-1 flex items-center gap-2">
									<span className="border border-border-subtle px-1.5 py-0.5 font-mono text-[11px] capitalize text-text-secondary">
										{event.eventType.replace("_", " ")}
									</span>
									<span className="ml-auto font-mono text-[11px] text-text-secondary">
										{date.toLocaleDateString("pt-BR")}{" "}
										{date.toLocaleTimeString("pt-BR", {
											hour: "2-digit",
											minute: "2-digit",
										})}
									</span>
								</div>
								<p className="line-clamp-2 text-sm font-medium text-text-primary">
									{event.headline}
								</p>
								{event.whatChanged && (
									<p className="mt-1 border-l-2 border-accent-primary/50 pl-2 text-xs text-text-secondary">
										{event.whatChanged}
									</p>
								)}
							</div>
						</div>
					);
				})}
			</div>
		</div>
	);
}
