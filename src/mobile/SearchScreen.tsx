import { useCallback, useEffect, useState } from "react";
import { useTrends } from "../hooks/useTrends";
import { SearchIcon } from "./Icons";
import { RowSkeleton, StoryRow } from "./StoryRow";
import { fromApi, type MobileArticle } from "./types";

const RECENT_KEY = "fn_recent_searches";

function loadRecent(): string[] {
	try {
		const v = JSON.parse(localStorage.getItem(RECENT_KEY) ?? "[]");
		return Array.isArray(v) ? v.slice(0, 6) : [];
	} catch {
		return [];
	}
}

export function SearchScreen({
	onOpen,
	pendingQuery,
	onQueryConsumed,
}: {
	onOpen: (a: MobileArticle) => void;
	/** A term picked elsewhere (trending) that should be searched on arrival. */
	pendingQuery: string | null;
	onQueryConsumed: () => void;
}) {
	const [input, setInput] = useState("");
	const [query, setQuery] = useState("");
	const [results, setResults] = useState<MobileArticle[] | null>(null);
	const [loading, setLoading] = useState(false);
	const [failed, setFailed] = useState(false);
	const [recent, setRecent] = useState<string[]>(loadRecent);
	const { report } = useTrends(24);

	const run = useCallback((raw: string) => {
		const q = raw.trim();
		if (q.length < 3) return;
		setInput(q);
		setQuery(q);
		setLoading(true);
		setFailed(false);
		setRecent((prev) => {
			const next = [q, ...prev.filter((r) => r !== q)].slice(0, 6);
			try {
				localStorage.setItem(RECENT_KEY, JSON.stringify(next));
			} catch {
				// recents are a convenience; ignore blocked storage
			}
			return next;
		});
		fetch(`/api/news/search?q=${encodeURIComponent(q)}`)
			.then((r) => {
				if (!r.ok) throw new Error(`HTTP ${r.status}`);
				return r.json();
			})
			.then((d) => setResults((d.data ?? []).map(fromApi)))
			.catch(() => {
				setResults([]);
				setFailed(true);
			})
			.finally(() => setLoading(false));
	}, []);

	useEffect(() => {
		if (!pendingQuery) return;
		run(pendingQuery);
		onQueryConsumed();
	}, [pendingQuery, run, onQueryConsumed]);

	const suggestions = report?.terms.slice(0, 8).map((t) => t.term) ?? [];

	return (
		<div className="flex h-full flex-col">
			<form
				role="search"
				onSubmit={(e) => {
					e.preventDefault();
					run(input);
				}}
				className="shrink-0 px-5 pt-[max(0.875rem,var(--sat))]"
			>
				<label className="flex h-12 items-center gap-2.5 rounded-full border border-border-subtle bg-bg-secondary px-3.5 focus-within:border-accent-primary">
					<span className="text-text-secondary">
						<SearchIcon size={20} />
					</span>
					<input
						type="search"
						enterKeyHint="search"
						value={input}
						onChange={(e) => {
							setInput(e.target.value);
							if (!e.target.value) {
								setResults(null);
								setQuery("");
							}
						}}
						placeholder="Buscar notícias, temas, fontes"
						aria-label="Buscar notícias"
						className="min-w-0 flex-1 bg-transparent text-base text-text-primary outline-none placeholder:text-text-secondary"
					/>
				</label>
			</form>

			<div className="flex-1 overflow-y-auto overscroll-contain px-5 pb-6 pt-4">
				{results === null && !loading && (
					<>
						{recent.length > 0 && (
							<section>
								<h2 className="font-mono text-[11px] uppercase tracking-wider text-text-secondary">
									Recentes
								</h2>
								<ul className="mt-1">
									{recent.map((r) => (
										<li key={r}>
											<button
												type="button"
												onClick={() => run(r)}
												className="flex min-h-11 w-full items-center text-left text-base"
											>
												{r}
											</button>
										</li>
									))}
								</ul>
							</section>
						)}
						{suggestions.length > 0 && (
							<section className={recent.length > 0 ? "mt-5" : ""}>
								<h2 className="font-mono text-[11px] uppercase tracking-wider text-text-secondary">
									Em alta agora
								</h2>
								<div className="mt-2 flex flex-wrap gap-2">
									{suggestions.map((s) => (
										<button
											key={s}
											type="button"
											onClick={() => run(s)}
											className="h-11 rounded-full border border-border-subtle px-4 text-sm font-medium"
										>
											{s}
										</button>
									))}
								</div>
							</section>
						)}
					</>
				)}

				{loading &&
					Array.from({ length: 4 }).map((_, i) => <RowSkeleton key={i} />)}

				{results !== null && !loading && (
					<>
						<h2 className="font-mono text-[11px] uppercase tracking-wider text-text-secondary">
							{results.length} resultados para “{query}”
						</h2>
						<div className="mt-1.5 border-t border-border-subtle">
							{results.map((a) => (
								<StoryRow key={a.id} article={a} onOpen={onOpen} />
							))}
						</div>
						{results.length === 0 && (
							<p className="py-12 text-center text-sm text-text-secondary">
								{failed
									? "A busca falhou. Tente de novo."
									: "Nada encontrado nos últimos 30 dias."}
							</p>
						)}
					</>
				)}
			</div>
		</div>
	);
}
