import { Moon, Search, SlidersHorizontal, Sun } from "lucide-react";
import {
	type CSSProperties,
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import {
	ArticleModal,
	CategoryTabs,
	NewsCard,
	SkeletonCard,
	StatusPanel,
} from "./components/NeoEditorial";
import {
	activeFilterCount,
	BriefingView,
	CommandPalette,
	DEFAULT_FILTERS,
	type FeedFilters,
	FilterDrawer,
	type PaletteCommand,
	type PulsoView,
	Rail,
	VIEW_LABELS,
	WordsView,
} from "./components/Pulso";
import {
	auroraTint,
	useCardTilt,
	withViewTransition,
} from "./components/Pulso/motion";
import {
	CorrelationGraph,
	IntelligencePanel,
	StoryCard,
	StoryDetailModal,
} from "./components/StoryIntelligence";
import { useNews, useTheme } from "./hooks";
import { useBookmarks } from "./hooks/useBookmarks";
import type { CoverageLink } from "./hooks/useNews";
import { useReadingHistory } from "./hooks/useReadingHistory";
import type { ArticleNode, GraphEdge } from "./hooks/useStories";
import { useGlobalGraph, useStories, useStoryDetail } from "./hooks/useStories";
import { useTranslatedTitles } from "./hooks/useTranslatedTitles";
import { useTrends } from "./hooks/useTrends";
import "./styles/animations.css";
import "./styles/pulso.css";
import "./styles/aurora.css";

const VIEW_KEY = "fn_view";
const VIEWS = Object.keys(VIEW_LABELS) as PulsoView[];

const EXPORTS = [
	["RSS", "/api/feed.xml"],
	["JSON", "/api/feed.json"],
	["OPML", "/api/sources/opml"],
	["Podcast", "/api/podcast.xml"],
] as const;

/** Bento rhythm: a big lead, then wide tiles every few cards. */
function variantFor(i: number): "featured" | "compact" | "standard" {
	if (i % 11 === 0) return "featured";
	if (i % 11 === 5 || i % 11 === 9) return "compact";
	return "standard";
}

function initialView(): PulsoView {
	try {
		const v = localStorage.getItem(VIEW_KEY) as PulsoView | null;
		if (v && VIEWS.includes(v)) return v;
	} catch {
		// storage blocked: start on the briefing
	}
	return "briefing";
}

function App() {
	const [activeCategory, setActiveCategory] = useState("Todas");
	const [activeView, setActiveView] = useState<PulsoView>(initialView);
	const [selectedStoryId, setSelectedStoryId] = useState<string | null>(null);
	const [selectedArticleId, setSelectedArticleId] = useState<string | null>(
		null,
	);
	const [searchResults, setSearchResults] = useState<unknown[] | null>(null);
	const [searchQuery, setSearchQuery] = useState("");
	const [searchGraph, setSearchGraph] = useState<{
		nodes: ArticleNode[];
		edges: GraphEdge[];
	} | null>(null);
	const [sidebarFilters, setSidebarFilters] = useState<{
		company?: string;
		category?: string;
	}>({});
	const [filters, setFilters] = useState<FeedFilters>(DEFAULT_FILTERS);
	const [drawerOpen, setDrawerOpen] = useState(false);
	const [paletteOpen, setPaletteOpen] = useState(false);
	const [paletteQuery, setPaletteQuery] = useState("");
	const [recentSearches, setRecentSearches] = useState<string[]>([]);
	const [toast, setToast] = useState<string | null>(null);
	const [cursor, setCursor] = useState(-1);

	const { stories, loading: storiesLoading } = useStories(activeCategory);
	const { detail: storyDetail, loading: detailLoading } =
		useStoryDetail(selectedStoryId);
	const { graph, loading: graphLoading } = useGlobalGraph(activeCategory);
	const { theme, toggleTheme } = useTheme();
	const { markRead, history: readHistory } = useReadingHistory();
	const { bookmarks, isBookmarked } = useBookmarks();
	const { report: trends } = useTrends(24);

	const {
		articles: originalArticles,
		loading,
		error,
		refetch,
		loadMore,
		hasMore,
	} = useNews({
		category: activeCategory,
		scope: filters.scope,
		minCredibility:
			filters.minCredibility > 0 ? filters.minCredibility : undefined,
		politicalBias:
			filters.politicalBias !== "all" ? filters.politicalBias : undefined,
		excludeMilitant: filters.excludeMilitant ? true : undefined,
		group: filters.groupSources,
		...sidebarFilters,
	});
	const articles = useTranslatedTitles(originalArticles, filters.lang);

	const mainRef = useRef<HTMLDivElement>(null);
	useCardTilt(mainRef);

	const go = useCallback((v: PulsoView) => {
		withViewTransition(() => {
			setActiveView(v);
			setCursor(-1);
		});
		try {
			localStorage.setItem(VIEW_KEY, v);
		} catch {
			// remembering the view is a convenience only
		}
		window.scrollTo({ top: 0 });
	}, []);

	const notify = useCallback((message: string) => setToast(message), []);

	useEffect(() => {
		if (!toast) return;
		const t = setTimeout(() => setToast(null), 2600);
		return () => clearTimeout(t);
	}, [toast]);

	// Open article from Telegram deep link (?id=<uuid>)
	useEffect(() => {
		const id = new URLSearchParams(window.location.search).get("id");
		if (id) setSelectedArticleId(id);
	}, []);

	const openArticle = useCallback(
		(id: string, title?: string) => {
			setSelectedArticleId(id);
			if (title) markRead(id, title);
		},
		[markRead],
	);

	const handleSearch = useCallback(
		(query: string) => {
			const q = query.trim();
			if (!q) return;
			setRecentSearches((prev) =>
				[q, ...prev.filter((s) => s !== q)].slice(0, 5),
			);
			setSearchQuery(q);
			go("feed");
			fetch(`/api/rag/search?q=${encodeURIComponent(q)}&limit=18`)
				.then((r) => r.json())
				.then((d) => {
					setSearchResults((d.results ?? []).map(toCardArticle));
					setSearchGraph(d.graph ?? null);
				})
				.catch(() => notify("A busca semântica não respondeu. Tente de novo."));
		},
		[go, notify],
	);

	const clearSearch = () => {
		setSearchResults(null);
		setSearchGraph(null);
		setSearchQuery("");
	};

	const handleSummarize = useCallback(
		async (id: string, title?: string) => {
			notify("Analisando credibilidade…");
			try {
				await fetch(`/api/news/${id}/credibility`, { method: "POST" });
			} catch {
				// the reader shows whatever data is available
			}
			setToast(null);
			openArticle(id, title);
		},
		[openArticle, notify],
	);

	const openPalette = useCallback((q = "") => {
		setPaletteQuery(q);
		setPaletteOpen(true);
	}, []);

	// Infinite scroll on the feed.
	useEffect(() => {
		if (activeView !== "feed" || searchResults) return;
		const onScroll = () => {
			if (
				window.innerHeight + window.scrollY >=
					document.body.offsetHeight - 1000 &&
				hasMore &&
				!loading
			) {
				loadMore();
			}
		};
		window.addEventListener("scroll", onScroll, { passive: true });
		return () => window.removeEventListener("scroll", onScroll);
	}, [activeView, searchResults, hasMore, loading, loadMore]);

	const feedList = (searchResults !== null ? searchResults : articles) as Array<
		Parameters<typeof NewsCard>[0]
	>;

	// Global shortcuts: ⌘K / "/" palette, J/K move, O open, S save, F filters.
	useEffect(() => {
		const onKey = (e: KeyboardEvent) => {
			if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
				e.preventDefault();
				setPaletteOpen((o) => !o);
				return;
			}
			const t = e.target as HTMLElement;
			if (
				paletteOpen ||
				drawerOpen ||
				selectedArticleId ||
				e.metaKey ||
				e.ctrlKey ||
				e.altKey ||
				t.closest("input, textarea, select, [contenteditable]")
			)
				return;
			if (e.key === "/") {
				e.preventDefault();
				openPalette();
				return;
			}
			if (e.key === "f" && activeView === "feed") {
				setDrawerOpen(true);
				return;
			}
			if (activeView !== "feed" || feedList.length === 0) return;
			const cards = document.querySelectorAll<HTMLElement>("[data-card]");
			if (e.key === "j" || e.key === "k") {
				e.preventDefault();
				const next = Math.max(
					0,
					Math.min(cards.length - 1, cursor + (e.key === "j" ? 1 : -1)),
				);
				setCursor(next);
				cards[next]?.scrollIntoView({ block: "nearest", behavior: "smooth" });
			}
			const current = cursor >= 0 ? feedList[cursor] : undefined;
			if (!current) return;
			if (e.key === "o" || e.key === "Enter") {
				handleSummarize(current.id, current.title);
			}
			if (e.key === "s") {
				cards[cursor]
					?.querySelector<HTMLButtonElement>("button[data-save]")
					?.click();
			}
		};
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, [
		paletteOpen,
		drawerOpen,
		selectedArticleId,
		activeView,
		feedList,
		cursor,
		handleSummarize,
		openPalette,
	]);

	const commands = useMemo<PaletteCommand[]>(
		() => [
			...VIEWS.map((v) => ({
				id: `go-${v}`,
				label: `Ir para ${VIEW_LABELS[v]}`,
				run: () => go(v),
			})),
			{
				id: "filters",
				label: "Abrir filtros do feed",
				hint: "F",
				run: () => {
					go("feed");
					setDrawerOpen(true);
				},
			},
			{
				id: "theme",
				label: theme === "dark" ? "Usar tema claro" : "Usar tema escuro",
				run: toggleTheme,
			},
			{
				id: "scope",
				label: filters.scope === "ai" ? "Mostrar todas as editorias" : "Só IA",
				run: () =>
					setFilters((f) => ({
						...f,
						scope: f.scope === "ai" ? "all" : "ai",
					})),
			},
			{
				id: "reset",
				label: "Limpar filtros",
				run: () => {
					setFilters(DEFAULT_FILTERS);
					setActiveCategory("Todas");
				},
			},
			...EXPORTS.map(([label, href]) => ({
				id: `export-${label}`,
				label: `Abrir feed ${label}`,
				run: () => window.open(href, "_blank", "noopener"),
			})),
			{
				id: "jornal",
				label: "Abrir o jornal O Fio",
				run: () =>
					window.open("https://juninmd.github.io/fast-news/", "_blank"),
			},
		],
		[go, theme, toggleTheme, filters.scope],
	);

	const filterCount = activeFilterCount(
		filters,
		Object.values(sidebarFilters).filter(Boolean).length,
	);

	return (
		<div
			className="pulso-shell bg-bg-primary text-text-primary"
			style={
				auroraTint(activeCategory)
					? ({
							"--aurora-tint": auroraTint(activeCategory),
						} as CSSProperties)
					: undefined
			}
		>
			<div className="pulso-aurora" aria-hidden>
				<i />
				<i />
				<i />
			</div>
			<div className="pulso-progress" aria-hidden />
			<Rail
				active={activeView}
				onChange={go}
				counts={{
					bookmarks: bookmarks.length,
					history: readHistory.length,
				}}
			/>

			<div ref={mainRef} className="pulso-main min-w-0">
				<header className="pulso-topbar">
					<h1
						key={activeView}
						className="pulso-title"
						aria-label={VIEW_LABELS[activeView]}
					>
						{[...VIEW_LABELS[activeView]].map((ch, i) => (
							<span
								key={i}
								aria-hidden
								style={{ animationDelay: `${i * 28}ms` }}
							>
								{ch}
							</span>
						))}
					</h1>
					<span className="hidden items-center gap-2 font-mono text-[11px] tracking-widest text-accent-tertiary xl:flex">
						<span className="pulso-live-dot" />
						AO VIVO
					</span>
					<button
						type="button"
						className="pulso-cmdk"
						onClick={() => openPalette()}
						aria-label="Buscar ou executar comando"
					>
						<Search className="h-4 w-4 shrink-0" />
						<span className="pulso-cmdk-label truncate">
							Buscar por significado, ou um comando…
						</span>
						<kbd className="pulso-kbd">⌘K</kbd>
					</button>
					<button
						type="button"
						className="pulso-icon-btn"
						onClick={() => setDrawerOpen(true)}
						aria-label="Filtros"
						title="Filtros"
					>
						<SlidersHorizontal className="h-4 w-4" />
						{filterCount > 0 && (
							<span className="pulso-badge">{filterCount}</span>
						)}
					</button>
					<button
						type="button"
						className="pulso-icon-btn"
						onClick={toggleTheme}
						aria-label="Alternar tema"
						title="Alternar tema"
					>
						{theme === "dark" ? (
							<Sun className="h-4 w-4" />
						) : (
							<Moon className="h-4 w-4" />
						)}
					</button>
				</header>

				<main key={activeView} className="pulso-view">
					{activeView === "briefing" && (
						<BriefingView
							scope={filters.scope}
							onScopeChange={(scope) => setFilters((f) => ({ ...f, scope }))}
							onOpenArticle={openArticle}
							onSearch={(term) => openPalette(term)}
							onSeeFeed={() => go("feed")}
							headlines={articles.slice(0, 12)}
						/>
					)}

					{activeView === "feed" && (
						<>
							<CategoryTabs
								activeCategory={activeCategory}
								onCategoryChange={(category) => {
									setActiveCategory(category);
									clearSearch();
								}}
							/>
							<div className="mb-4 flex flex-wrap items-center gap-2">
								<button
									type="button"
									className="pulso-chip"
									onClick={() => setDrawerOpen(true)}
								>
									<SlidersHorizontal className="h-3.5 w-3.5" />
									Filtros{filterCount > 0 ? ` · ${filterCount}` : ""}
								</button>
								<span className="flex-1" />
								<span className="pulso-eyebrow hidden tabular-nums sm:inline">
									{feedList.length} matérias · J/K navega · O abre · S salva
								</span>
							</div>

							{searchResults !== null && (
								<div className="pulso-panel mb-5 p-4">
									<div className="mb-3 flex flex-wrap items-center gap-2">
										<p className="text-sm font-semibold">
											{searchResults.length} resultados semânticos para “
											{searchQuery}”
										</p>
										<button
											type="button"
											onClick={clearSearch}
											className="ml-auto text-xs font-semibold text-accent-primary hover:underline"
										>
											Limpar busca
										</button>
									</div>
									{searchGraph && searchGraph.nodes.length > 1 && (
										<CorrelationGraph
											nodes={searchGraph.nodes}
											edges={searchGraph.edges}
											stories={[]}
											height={260}
											onNodeClick={(n) => window.open(n.url, "_blank")}
										/>
									)}
								</div>
							)}

							{error && (
								<div className="py-12 text-center">
									<p className="mb-4 text-accent-tertiary">{error.message}</p>
									<button
										type="button"
										onClick={refetch}
										className="rounded-xl bg-accent-primary px-4 py-2 font-semibold text-white"
									>
										Retry
									</button>
								</div>
							)}

							<div className="pulso-bento">
								{loading && feedList.length === 0
									? Array.from({ length: 6 }).map((_, i) => (
											<SkeletonCard key={i} />
										))
									: feedList.map((article, i) => (
											<div
												key={article.id}
												className={`contents ${cursor === i ? "[&>article]:outline-2 [&>article]:outline-offset-2 [&>article]:outline-accent-primary [&>article]:outline" : ""}`}
											>
												<NewsCard
													{...article}
													variant={variantFor(i)}
													onShare={() =>
														notify("Abrindo a reportagem original")
													}
													onSummarize={() =>
														handleSummarize(article.id, article.title)
													}
												/>
											</div>
										))}
							</div>

							{!loading &&
								!error &&
								feedList.length === 0 &&
								searchResults === null && (
									<div className="py-16 text-center text-text-secondary">
										<p className="font-display text-xl font-bold text-text-primary">
											Nada passa por esses filtros
										</p>
										<p className="mt-1">
											Afrouxe a credibilidade ou volte para “Todas”.
										</p>
										<button
											type="button"
											className="pulso-chip mt-4"
											onClick={() => {
												setFilters(DEFAULT_FILTERS);
												setActiveCategory("Todas");
											}}
										>
											Limpar filtros
										</button>
									</div>
								)}

							{loading && feedList.length > 0 && (
								<div className="pulso-loadmore">
									<span className="pulso-dots" aria-hidden>
										<i />
										<i />
										<i />
									</span>
									Carregando mais matérias
								</div>
							)}
							{!hasMore && feedList.length > 0 && searchResults === null && (
								<p className="pulso-loadmore">Você chegou ao fim</p>
							)}
						</>
					)}

					{activeView === "words" && (
						<WordsView
							onSearch={handleSearch}
							onOpenArticle={openArticle}
							articles={articles}
						/>
					)}

					{activeView === "bookmarks" &&
						(bookmarks.length === 0 ? (
							<EmptyState
								title="Nada salvo ainda"
								text="Toque no marcador de um card, ou aperte S no feed."
							/>
						) : (
							<div className="pulso-bento">
								{articles
									.filter((a) => isBookmarked(a.id))
									.map((article) => (
										<NewsCard
											key={article.id}
											{...article}
											onSummarize={() =>
												handleSummarize(article.id, article.title)
											}
										/>
									))}
							</div>
						))}

					{activeView === "history" &&
						(readHistory.length === 0 ? (
							<EmptyState
								title="Nenhuma matéria lida ainda"
								text="As matérias que você abrir aparecem aqui."
							/>
						) : (
							<ul className="grid max-w-3xl gap-2">
								{readHistory.map((h, i) => (
									<li
										key={h.id}
										className="pulso-keypoint !p-0"
										style={{ animationDelay: `${Math.min(i, 12) * 40}ms` }}
									>
										<button
											type="button"
											onClick={() => openArticle(h.id, h.title)}
											className="pulso-panel w-full px-4 py-3 text-left transition-colors hover:border-accent-primary/40"
										>
											<p className="line-clamp-1 font-display text-base font-semibold">
												{h.title}
											</p>
											<p className="mt-1 font-mono text-xs text-text-secondary">
												{new Date(h.readAt).toLocaleString("pt-BR", {
													day: "2-digit",
													month: "2-digit",
													hour: "2-digit",
													minute: "2-digit",
												})}
											</p>
										</button>
									</li>
								))}
							</ul>
						))}

					{activeView === "stories" && (
						<>
							<CategoryTabs
								activeCategory={activeCategory}
								onCategoryChange={setActiveCategory}
							/>
							<div className="pulso-story-grid">
								{storiesLoading
									? Array.from({ length: 6 }).map((_, i) => (
											<SkeletonCard key={i} />
										))
									: stories.map((story, i) => (
											<div
												key={story.id}
												style={{
													animationDelay: `${Math.min(i, 12) * 50}ms`,
												}}
											>
												<StoryCard
													story={story}
													selected={selectedStoryId === story.id}
													onClick={() =>
														setSelectedStoryId(
															story.id === selectedStoryId ? null : story.id,
														)
													}
												/>
											</div>
										))}
							</div>
							{!storiesLoading && stories.length === 0 && (
								<EmptyState
									title="Nenhuma história detectada ainda"
									text="Aguarde a próxima ingestão."
								/>
							)}
						</>
					)}

					{activeView === "graph" && (
						<div className="space-y-4">
							<CategoryTabs
								activeCategory={activeCategory}
								onCategoryChange={setActiveCategory}
							/>
							{graphLoading ? (
								<div className="flex h-96 items-center justify-center gap-3 text-text-secondary">
									<span className="pulso-dots" aria-hidden>
										<i />
										<i />
										<i />
									</span>
									Carregando grafo
								</div>
							) : (
								graph && (
									<div className="pulso-panel overflow-hidden p-2">
										<CorrelationGraph
											nodes={graph.nodes}
											edges={graph.edges}
											stories={graph.stories}
											height={560}
											onNodeClick={(n) => openArticle(n.id, n.title)}
										/>
									</div>
								)
							)}
							<p className="text-center text-xs text-text-secondary">
								Cada ponto é um artigo. Linhas = correlação semântica. Clique
								para abrir.
							</p>
						</div>
					)}

					{activeView === "intelligence" && (
						<IntelligencePanel
							stories={stories}
							onStoryClick={(s) => {
								setSelectedStoryId(s.id);
								go("stories");
							}}
						/>
					)}

					{activeView === "status" && (
						<div className="space-y-6">
							<StatusPanel />
							<section className="pulso-panel flex flex-wrap items-center gap-2 p-4">
								<span className="pulso-eyebrow mr-2">Exportar</span>
								{EXPORTS.map(([label, href]) => (
									<a
										key={label}
										className="pulso-chip"
										href={
											filters.scope === "ai" && label !== "OPML"
												? `${href}?scope=ai`
												: href
										}
										target="_blank"
										rel="noreferrer"
									>
										{label}
									</a>
								))}
								<a
									className="pulso-chip"
									href="https://juninmd.github.io/fast-news/"
									target="_blank"
									rel="noreferrer"
								>
									Jornal O Fio ↗
								</a>
							</section>
						</div>
					)}
				</main>
			</div>

			<FilterDrawer
				open={drawerOpen}
				filters={filters}
				onChange={setFilters}
				onClose={() => setDrawerOpen(false)}
				onSidebarFilters={setSidebarFilters}
			/>

			<CommandPalette
				open={paletteOpen}
				initialQuery={paletteQuery}
				onClose={() => setPaletteOpen(false)}
				onSearch={handleSearch}
				onOpenArticle={(id, title) => openArticle(id, title)}
				recentSearches={recentSearches}
				trending={(trends?.terms ?? []).map((t) => t.term)}
				articles={articles}
				commands={commands}
			/>

			<ArticleModal
				articleId={selectedArticleId}
				onClose={() => {
					setSelectedArticleId(null);
					window.history.replaceState({}, "", window.location.pathname);
				}}
			/>

			{toast && (
				<div className="pulso-toast" role="status">
					{toast}
				</div>
			)}

			{storyDetail && !detailLoading && (
				<StoryDetailModal
					detail={storyDetail}
					onClose={() => setSelectedStoryId(null)}
				/>
			)}
		</div>
	);
}

function EmptyState({ title, text }: { title: string; text: string }) {
	return (
		<div className="py-20 text-center text-text-secondary">
			<p className="font-display text-xl font-bold text-text-primary">
				{title}
			</p>
			<p className="mt-1">{text}</p>
		</div>
	);
}

export default App;

function toCardArticle(article: {
	id: string;
	title: string;
	content?: string;
	summary?: string;
	url: string;
	source: string;
	category: string;
	company?: string;
	published_at?: string;
	publishedAt?: string;
	image_url?: string;
	imageUrl?: string;
	video_url?: string | null;
	source_count?: number;
	also_in?: CoverageLink[];
}) {
	return {
		id: article.id,
		title: article.title,
		excerpt: article.summary ?? article.content?.slice(0, 220),
		url: article.url,
		source: article.source,
		category: article.category,
		company: article.company,
		publishedAt:
			article.published_at ?? article.publishedAt ?? new Date().toISOString(),
		imageUrl: article.image_url ?? article.imageUrl,
		videoUrl: article.video_url ?? undefined,
		sourceCount: article.source_count,
		alsoIn: article.also_in,
	};
}
