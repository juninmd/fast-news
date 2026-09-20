import { Menu, Moon, Search, Sun, X } from "lucide-react";
import { useEffect, useState } from "react";

interface HeaderProps {
	onSearchOpen: () => void;
	onMenuToggle: () => void;
	isMenuOpen: boolean;
	theme: "light" | "dark";
	onThemeToggle: () => void;
}

export function Header({
	onSearchOpen,
	onMenuToggle,
	isMenuOpen,
	theme,
	onThemeToggle,
}: HeaderProps) {
	const [isScrolled, setIsScrolled] = useState(false);

	useEffect(() => {
		const handleScroll = () => setIsScrolled(window.scrollY > 10);
		window.addEventListener("scroll", handleScroll);
		return () => window.removeEventListener("scroll", handleScroll);
	}, []);

	return (
		<header
			className={`
        sticky top-0 z-40 transition-all duration-300
        ${isScrolled ? "glass rounded-none border-x-0 border-t-0" : "bg-transparent"}
      `}
		>
			<div className="max-w-[1680px] mx-auto px-4 sm:px-6 lg:px-10">
				<div className="flex items-center justify-between h-16">
					<div className="flex items-center gap-3">
						<button
							onClick={onMenuToggle}
							className="lg:hidden p-2 rounded-lg hover:bg-white/5 text-text-secondary"
						>
							{isMenuOpen ? (
								<X className="w-5 h-5" />
							) : (
								<Menu className="w-5 h-5" />
							)}
						</button>
						<a href="/" className="flex items-center gap-2.5">
							<div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent-primary to-accent-secondary flex items-center justify-center shadow-glow">
								<span className="text-white font-display font-bold text-lg">
									F
								</span>
							</div>
							<span className="hidden sm:flex flex-col leading-none">
								<span className="font-display font-bold text-xl text-text-primary tracking-tight">
									Fast<span className="text-accent-primary">News</span>
								</span>
								<span className="text-[11px] text-text-secondary">
									Curadoria por IA, em tempo real
								</span>
							</span>
						</a>
					</div>

					<div className="hidden md:flex flex-1 max-w-xl mx-8">
						<button
							onClick={onSearchOpen}
							className="glass w-full flex items-center gap-3 px-4 py-2 hover:border-accent-primary/30 transition-colors group"
						>
							<Search className="w-4 h-4 text-text-secondary" />
							<span className="text-text-secondary text-sm">
								Buscar notícias...
							</span>
							<kbd className="ml-auto hidden sm:flex items-center gap-1 px-2 py-0.5 rounded-lg bg-white/5 text-text-secondary text-xs font-mono">
								Ctrl+K
							</kbd>
						</button>
					</div>

					<div className="flex items-center gap-2">
						<button
							onClick={onSearchOpen}
							className="md:hidden p-2 rounded-lg hover:bg-white/5 text-text-secondary"
						>
							<Search className="w-5 h-5" />
						</button>

						<button
							onClick={onThemeToggle}
							className="p-2 rounded-lg hover:bg-white/5 text-text-secondary hover:text-accent-primary transition-colors"
							title="Alternar tema"
						>
							{theme === "dark" ? (
								<Sun className="w-5 h-5" />
							) : (
								<Moon className="w-5 h-5" />
							)}
						</button>
					</div>
				</div>
			</div>
		</header>
	);
}
