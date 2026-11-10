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
			className="flex shrink-0 border-t border-border-subtle bg-bg-secondary pb-[var(--sab)]"
		>
			{TABS.map((t) => {
				const on = t.id === active;
				return (
					<button
						key={t.id}
						type="button"
						onClick={() => onChange(t.id)}
						aria-current={on ? "page" : undefined}
						className={`flex h-16 flex-1 flex-col items-center justify-center gap-1 text-[11px] transition-colors ${
							on
								? "font-semibold text-accent-primary"
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
