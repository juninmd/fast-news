import type { ThreadEventKind } from "./types.js";

/** Marker and label for events that changed the course of a story. */
const MARKS: Partial<Record<ThreadEventKind, { mark: string; label: string }>> =
	{
		escalation: { mark: "▲", label: "escalada" },
		contradiction: { mark: "⚠", label: "contradição" },
		resolution: { mark: "✓", label: "desfecho" },
		impact: { mark: "◆", label: "impacto" },
	};

export function kindMark(
	kind: ThreadEventKind | undefined,
): { mark: string; label: string } | null {
	return (kind && MARKS[kind]) || null;
}
