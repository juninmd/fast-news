import { ArrowUpRight, ChevronRight, History, Search } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

export interface PaletteCommand {
	id: string;
	label: string;
	hint?: string;
	run: () => void;
}

export interface PaletteArticle {
	id: string;
	title: string;
	source?: string;
}

interface CommandPaletteProps {
	open: boolean;
	initialQuery?: string;
	onClose: () => void;
	/** Semantic (RAG) search over the whole archive. */
	onSearch: (query: string) => void;
	onOpenArticle: (id: string, title: string) => void;
	recentSearches: string[];
	trending: string[];
	articles: PaletteArticle[];
	commands: PaletteCommand[];
}

type Item = {
	key: string;
	group: string;
	label: string;
	hint?: string;
	icon: "search" | "recent" | "trend" | "article" | "command";
	run: () => void;
};

function normalize(s: string) {
	return s
		.toLowerCase()
		.normalize("NFD")
		.replace(/\p{Diacritic}/gu, "");
}

/**
 * ⌘K: one entry point for semantic search, loaded headlines, recent and
 * trending searches, and every app command (prefix ">" for commands only).
 */
export function CommandPalette({
	open,
	initialQuery = "",
	onClose,
	onSearch,
	onOpenArticle,
	recentSearches,
	trending,
	articles,
	commands,
}: CommandPaletteProps) {
	const [query, setQuery] = useState(initialQuery);
	const [sel, setSel] = useState(0);
	const inputRef = useRef<HTMLInputElement>(null);
	const listRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (open) {
			setQuery(initialQuery);
			setSel(0);
			requestAnimationFrame(() => inputRef.current?.focus());
		}
	}, [open, initialQuery]);

	const items = useMemo<Item[]>(() => {
		const raw = query.trim();
		const commandMode = raw.startsWith(">");
		const q = normalize(raw.replace(/^>/, "").trim());
		const out: Item[] = [];
		const matchingCommands = commands.filter((c) =>
			normalize(c.label).includes(q),
		);

		if (!commandMode) {
			if (q) {
				out.push({
					key: "semantic",
					group: "Busca semântica",
					label: `Buscar “${raw}” por significado`,
					hint: "↵",
					icon: "search",
					run: () => onSearch(raw),
				});
				const words = q.split(/\s+/).filter(Boolean);
				for (const a of articles) {
					const hay = normalize(`${a.title} ${a.source ?? ""}`);
					if (words.every((w) => hay.includes(w))) {
						out.push({
							key: `a-${a.id}`,
							group: "No seu feed",
							label: a.title,
							hint: a.source,
							icon: "article",
							run: () => onOpenArticle(a.id, a.title),
						});
						if (out.length >= 7) break;
					}
				}
			} else {
				for (const r of recentSearches) {
					out.push({
						key: `r-${r}`,
						group: "Buscas recentes",
						label: r,
						icon: "recent",
						run: () => onSearch(r),
					});
				}
				for (const t of trending.slice(0, 5)) {
					out.push({
						key: `t-${t}`,
						group: "Em alta",
						label: t,
						icon: "trend",
						run: () => onSearch(t),
					});
				}
			}
		}
		for (const c of commandMode || !q
			? matchingCommands
			: matchingCommands.slice(0, 4)) {
			out.push({
				key: `c-${c.id}`,
				group: "Comandos",
				label: c.label,
				hint: c.hint,
				icon: "command",
				run: c.run,
			});
		}
		return out;
	}, [
		query,
		commands,
		articles,
		recentSearches,
		trending,
		onSearch,
		onOpenArticle,
	]);

	useEffect(() => {
		setSel((s) => Math.min(s, Math.max(0, items.length - 1)));
	}, [items.length]);

	useEffect(() => {
		listRef.current
			?.querySelector(`[data-index="${sel}"]`)
			?.scrollIntoView?.({ block: "nearest" });
	}, [sel]);

	if (!open) return null;

	const choose = (item: Item | undefined) => {
		if (!item) return;
		onClose();
		item.run();
	};

	const onKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === "Escape") {
			e.preventDefault();
			onClose();
		} else if (e.key === "ArrowDown") {
			e.preventDefault();
			setSel((s) => Math.min(s + 1, items.length - 1));
		} else if (e.key === "ArrowUp") {
			e.preventDefault();
			setSel((s) => Math.max(s - 1, 0));
		} else if (e.key === "Enter") {
			e.preventDefault();
			choose(items[sel]);
		}
	};

	const icon = (i: Item["icon"]) => {
		const cls = "h-4 w-4 shrink-0 text-text-secondary";
		if (i === "recent") return <History className={cls} />;
		if (i === "trend") return <ArrowUpRight className={cls} />;
		if (i === "command") return <ChevronRight className={cls} />;
		if (i === "search")
			return <Search className="h-4 w-4 shrink-0 text-accent-primary" />;
		return <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-faint" />;
	};

	let lastGroup = "";
	return (
		<div
			className="pulso-palette"
			onMouseDown={(e) => {
				if (e.target === e.currentTarget) onClose();
			}}
		>
			<div
				className="pulso-palette-box"
				role="dialog"
				aria-modal="true"
				aria-label="Buscar ou executar comando"
				onKeyDown={onKeyDown}
			>
				<div className="flex items-center gap-3 border-b border-border-subtle px-4 py-3.5">
					<Search className="h-5 w-5 text-text-secondary" />
					<input
						ref={inputRef}
						id="pulso-palette-input"
						type="text"
						value={query}
						onChange={(e) => {
							setQuery(e.target.value);
							setSel(0);
						}}
						placeholder="Buscar notícias, temas, fontes… ou > para comandos"
						aria-label="Buscar notícias"
						aria-controls="pulso-palette-list"
						autoComplete="off"
						className="min-w-0 flex-1 bg-transparent text-base text-text-primary outline-none placeholder:text-text-secondary"
					/>
					<span className="rounded-md bg-[var(--accent-soft)] px-2 py-0.5 font-mono text-[10px] tracking-wider text-accent-primary">
						{query.trim().startsWith(">") ? "COMANDO" : "SEMÂNTICA"}
					</span>
				</div>
				<div
					ref={listRef}
					id="pulso-palette-list"
					role="listbox"
					className="max-h-[52vh] overflow-y-auto p-2"
				>
					{items.length === 0 && (
						<p className="px-3 py-6 text-center text-sm text-text-secondary">
							Nada encontrado. Pressione Enter para buscar por significado.
						</p>
					)}
					{items.map((item, i) => {
						const header = item.group !== lastGroup;
						lastGroup = item.group;
						return (
							<div key={item.key}>
								{header && (
									<div className="pulso-eyebrow px-2.5 pt-2.5 pb-1 text-[10px]">
										{item.group}
									</div>
								)}
								<button
									type="button"
									role="option"
									data-index={i}
									aria-selected={i === sel}
									className="pulso-palette-item"
									onMouseEnter={() => setSel(i)}
									onClick={() => choose(item)}
								>
									{icon(item.icon)}
									<span className="min-w-0 truncate">{item.label}</span>
									{item.hint && <small>{item.hint}</small>}
								</button>
							</div>
						);
					})}
				</div>
				<div className="flex flex-wrap gap-4 border-t border-border-subtle px-4 py-2 font-mono text-[11px] text-text-secondary">
					<span>↑↓ navegar</span>
					<span>↵ abrir</span>
					<span>&gt; comandos</span>
					<span>esc fechar</span>
				</div>
			</div>
		</div>
	);
}
