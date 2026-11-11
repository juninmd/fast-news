import {
	Activity,
	Bookmark,
	Brain,
	History,
	LayoutGrid,
	Network,
	Newspaper,
	Orbit,
	Radio,
} from "lucide-react";
import {
	type CSSProperties,
	type ReactNode,
	useLayoutEffect,
	useRef,
	useState,
} from "react";

export type PulsoView =
	| "briefing"
	| "feed"
	| "words"
	| "stories"
	| "graph"
	| "intelligence"
	| "bookmarks"
	| "history"
	| "status";

export const VIEW_LABELS: Record<PulsoView, string> = {
	briefing: "Briefing",
	feed: "Feed",
	words: "Palavras",
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
	words: <Orbit aria-hidden />,
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
	"words",
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

/**
 * Glass dock: vertical on desktop, floating pill below 1024px (same markup,
 * CSS decides). An ink blob springs to the active item.
 */
export function Rail({ active, onChange, counts }: RailProps) {
	const navRef = useRef<HTMLElement>(null);
	const [ink, setInk] = useState<CSSProperties>({ opacity: 0 });

	// biome-ignore lint/correctness/useExhaustiveDependencies: re-measure when the active view changes
	useLayoutEffect(() => {
		const place = () => {
			const on = navRef.current?.querySelector<HTMLElement>(
				'[aria-current="page"]',
			);
			if (!on) return;
			setInk({
				opacity: 1,
				transform: `translate(${on.offsetLeft}px, ${on.offsetTop}px)`,
				width: on.offsetWidth,
				height: on.offsetHeight,
			});
		};
		place();
		window.addEventListener("resize", place);
		return () => window.removeEventListener("resize", place);
	}, [active]);

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
		<nav ref={navRef} className="pulso-rail" aria-label="Navegação principal">
			<span className="pulso-rail-ink" style={ink} aria-hidden />
			<a href="/" className="pulso-logo" aria-label="Fast News, início">
				f
			</a>
			{ORDER.map(item)}
			<span className="pulso-rail-spacer" />
			{item("status")}
		</nav>
	);
}
