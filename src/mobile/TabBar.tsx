import type { ReactNode } from "react";
import { BookmarkIcon, HomeIcon, SearchIcon, TrendIcon } from "./Icons";
import type { Tab } from "./types";

const TABS: Array<{ id: Tab; label: string; icon: ReactNode }> = [
	{ id: "today", label: "Hoje", icon: <HomeIcon /> },
	{ id: "trending", label: "Em alta", icon: <TrendIcon /> },
	{ id: "search", label: "Buscar", icon: <SearchIcon /> },
	{ id: "saved", label: "Salvos", icon: <BookmarkIcon /> },
];

export function TabBar({
	active,
	onChange,
}: {
	active: Tab;
	onChange: (tab: Tab) => void;
}) {
	return (
		<nav
			aria-label="Navegação principal"
			className="mx-3 mt-1 mb-[calc(var(--sab)+10px)] flex shrink-0 gap-1 rounded-[22px] border border-border-subtle bg-bg-secondary/85 p-1.5 shadow-[var(--shadow-lift)] backdrop-blur-xl"
		>
			{TABS.map((t) => {
				const on = t.id === active;
				return (
					<button
						key={t.id}
						type="button"
						onClick={() => onChange(t.id)}
						aria-current={on ? "page" : undefined}
						className={`flex h-14 flex-1 flex-col items-center justify-center gap-1 rounded-2xl text-[11px] transition-all duration-300 active:scale-95 ${
							on
								? "bg-[var(--accent-soft)] font-semibold text-accent-primary"
								: "font-medium text-text-secondary"
						}`}
					>
						{t.icon}
						{t.label}
					</button>
				);
			})}
		</nav>
	);
}
