import { Menu, Moon, Search, Sun, X } from "lucide-react";
import { useEffect, useState } from "react";

interface HeaderProps {
	onSearchOpen: () => void;
	onMenuToggle: () => void;
	isMenuOpen: boolean;
	theme: "light" | "dark";
	onThemeToggle: () => void;
}

function useClock() {
	const [now, setNow] = useState(() => new Date());
	useEffect(() => {
		const t = setInterval(() => setNow(new Date()), 1000);
		return () => clearInterval(t);
	}, []);
	return now;
}

export function Header({
	onSearchOpen,
	onMenuToggle,
	isMenuOpen,
	theme,
	onThemeToggle,
}: HeaderProps) {
	const now = useClock();

	return (
		<header className="sticky top-0 z-40 border-b border-border-subtle bg-bg-primary">
			{/* Data strip: reads like a wire-service timestamp, not decoration. */}
			<div className="hidden border-b border-border-subtle sm:block">
				<div className="mx-auto flex max-w-[1680px] items-center gap-4 px-4 py-1.5 font-mono text-[11px] text-text-secondary sm:px-6 lg:px-10">
					<span className="tabular-nums">
						{now.toLocaleDateString("pt-BR", {
							weekday: "short",
							day: "2-digit",
							month: "short",
						})}
					</span>
					<span className="tabular-nums">
						{now.toLocaleTimeString("pt-BR", { hour12: false })}
					</span>
					<span className="ml-auto flex items-center gap-1.5 text-accent-secondary">
						<span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent-secondary" />
						AO VIVO
					</span>
				</div>
			</div>

			<div className="mx-auto max-w-[1680px] px-4 sm:px-6 lg:px-10">
				<div className="flex h-16 items-center justify-between gap-4">
					<div className="flex items-center gap-3">
						<button
							onClick={onMenuToggle}
							className="p-2 text-text-secondary hover:text-text-primary lg:hidden"
						>
							{isMenuOpen ? (
								<X className="h-5 w-5" />
							) : (
								<Menu className="h-5 w-5" />
							)}
						</button>
						<a href="/" className="flex items-baseline gap-2">
							<span className="font-display text-[26px] font-semibold leading-none tracking-tight text-text-primary">
								Fast News
							</span>
							<span className="hidden font-mono text-[11px] text-text-secondary sm:inline">
								ed. digital
							</span>
						</a>
					</div>

					<div className="mx-4 hidden max-w-xl flex-1 md:flex">
						<button
							onClick={onSearchOpen}
							className="group flex w-full items-center gap-3 border border-border-subtle bg-bg-secondary px-4 py-2 transition-colors hover:border-accent-primary/50"
						>
							<Search className="h-4 w-4 text-text-secondary" />
							<span className="text-sm text-text-secondary">
								Buscar notícias...
							</span>
							<kbd className="ml-auto hidden items-center gap-1 border border-border-subtle px-1.5 py-0.5 font-mono text-[10px] text-text-secondary sm:flex">
								Ctrl+K
							</kbd>
						</button>
					</div>

					<div className="flex items-center gap-1">
						<button
							onClick={onSearchOpen}
							className="p-2 text-text-secondary hover:text-text-primary md:hidden"
						>
							<Search className="h-5 w-5" />
						</button>

						<button
							onClick={onThemeToggle}
							className="p-2 text-text-secondary transition-colors hover:text-accent-primary"
							title="Alternar tema"
						>
							{theme === "dark" ? (
								<Sun className="h-5 w-5" />
							) : (
								<Moon className="h-5 w-5" />
							)}
						</button>
					</div>
				</div>
			</div>
		</header>
	);
}
