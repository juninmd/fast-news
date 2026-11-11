import {
	Activity,
	Bookmark,
	Brain,
	History,
	LayoutGrid,
	Network,
	Newspaper,
	Radio,
} from "lucide-react";
import type { ReactNode } from "react";

export type PulsoView =
	| "briefing"
	| "feed"
	| "stories"
	| "graph"
	| "intelligence"
	| "bookmarks"
	| "history"
	| "status";

export const VIEW_LABELS: Record<PulsoView, string> = {
	briefing: "Briefing",
	feed: "Feed",
	stories: "Histórias",
	graph: "Grafo",
	intelligence: "Inteligência",
	bookmarks: "Salvos",
	history: "Lidos",
	status: "Status",
};

const ICONS: Record<PulsoView, ReactNode> = {
	briefing: <Newspaper aria-hidden />,
	feed: <LayoutGrid aria-hidden />,
	stories: <Activity aria-hidden />,
	graph: <Network aria-hidden />,
	intelligence: <Brain aria-hidden />,
	bookmarks: <Bookmark aria-hidden />,
	history: <History aria-hidden />,
	status: <Radio aria-hidden />,
};

const ORDER: PulsoView[] = [
	"briefing",
	"feed",
	"stories",
	"graph",
	"intelligence",
	"bookmarks",
	"history",
];

interface RailProps {
	active: PulsoView;
	onChange: (view: PulsoView) => void;
	counts: Partial<Record<PulsoView, number>>;
}

/** Vertical rail on desktop; floating tab bar below 1024px (same markup, CSS decides). */
export function Rail({ active, onChange, counts }: RailProps) {
	const item = (v: PulsoView) => {
		const n = counts[v] ?? 0;
		return (
			<button
				key={v}
				type="button"
				className="pulso-rail-btn"
				aria-current={active === v ? "page" : undefined}
				aria-label={n > 0 ? `${VIEW_LABELS[v]} (${n})` : VIEW_LABELS[v]}
				onClick={() => onChange(v)}
			>
				{ICONS[v]}
				{VIEW_LABELS[v]}
				{n > 0 && (
					<span className="pulso-badge tabular-nums" aria-hidden>
						{n > 99 ? "99+" : n}
					</span>
				)}
			</button>
		);
	};

	return (
		<nav className="pulso-rail" aria-label="Navegação principal">
			<a href="/" className="pulso-logo" aria-label="Fast News, início">
				f
			</a>
			{ORDER.map(item)}
			<span className="pulso-rail-spacer" />
			{item("status")}
		</nav>
	);
}
