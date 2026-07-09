import React, { useCallback, useEffect, useState } from "react";
import {
	ArticleModal,
	CategoryTabs,
	Header,
	NewsCard,
	SearchModal,
	Sidebar,
	SkeletonCard,
	StatusPanel,
	TopNewsSection,
} from "./components/NeoEditorial";
import {
	CorrelationGraph,
	IntelligencePanel,
	StoryCard,
	StoryDetailModal,
} from "./components/StoryIntelligence";
import { useNews, useTheme } from "./hooks";
import { useBookmarks } from "./hooks/useBookmarks";
import { useReadingHistory } from "./hooks/useReadingHistory";
import type { ArticleNode, GraphEdge } from "./hooks/useStories";
import { useGlobalGraph, useStories, useStoryDetail } from "./hooks/useStories";
import "./styles/animations.css";

function App() {
	const [activeCategory, setActiveCategory] = useState("Todas");
	const [activeView, setActiveView] = useState<
		| "feed"
		| "stories"
		| "graph"
		| "intelligence"
		| "bookmarks"
		| "history"
		| "status"
	>("feed");
	const [selectedStoryId, setSelectedStoryId] = useState<string | null>(null);
	const [selectedArticleId, setSelectedArticleId] = useState<string | null>(
		null,
	);
	const [searchResults, setSearchResults] = useState<unknown[] | null>(null);
	const [searchGraph, setSearchGraph] = useState<{
		nodes: ArticleNode[];
		edges: GraphEdge[];
	} | null>(null);
	const [filters, setFilters] = useState({});
	const [minCredibility, setMinCredibility] = useState<number>(0);
	const [politicalBias, setPoliticalBias] = useState<string>("all");
	const [excludeMilitant, setExcludeMilitant] = useState<boolean>(false);

	const { stories, loading: storiesLoading } = useStories(activeCategory);
	const { detail: storyDetail, loading: detailLoading } =
		useStoryDetail(selectedStoryId);
	const { graph, loading: graphLoading } = useGlobalGraph(activeCategory);
	const [searchOpen, setSearchOpen] = useState(false);
	const [menuOpen, setMenuOpen] = useState(false);
	const [recentSearches, setRecentSearches] = useState<string[]>([]);
	// @ts-ignore
	const [toast, setToast] = useState(null);
	const { theme, toggleTheme } = useTheme();
	const { markRead, history: readHistory } = useReadingHistory();
	const { bookmarks, isBookmarked } = useBookmarks();

	const { articles, loading, error, refetch, loadMore, hasMore } = useNews({
		category: activeCategory,
		minCredibility: minCredibility > 0 ? minCredibility : undefined,
		politicalBias: politicalBias !== "all" ? politicalBias : undefined,
		excludeMilitant: excludeMilitant ? true : undefined,
		...filters,
	});

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

	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if ((e.metaKey || e.ctrlKey) && e.key === "k") {
				e.preventDefault();
				setSearchOpen(true);
			}
			if (e.key === "Escape") {
				setSearchOpen(false);
			}
		};
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, []);

	const handleSearch = useCallback((query: string) => {
		setRecentSearches((prev) =>
			[query, ...prev.filter((s) => s !== query)].slice(0, 5),
		);
		fetch(`/api/rag/search?q=${encodeURIComponent(query)}&limit=18`)
			.then((r) => r.json())
			.then((d) => {
				setSearchResults((d.results ?? []).map(toCardArticle));
				setSearchGraph(d.graph ?? null);
				setActiveView("feed");
			})
			.catch(() => {});
	}, []);

	const handleBookmark = useCallback(() => {
		setToast({ message: "Article saved!", type: "success" });
	}, []);

	const handleShare = useCallback(() => {
		navigator.clipboard.writeText(window.location.href);
		setToast({ message: "Link copied!", type: "success" });
	}, []);

	const handleSummarize = useCallback(
		async (id: string, title?: string) => {
			setToast({ message: "Abrindo artigo...", type: "success" });
			setTimeout(() => setToast(null), 1000);
			openArticle(id, title);
		},
		[openArticle],
	);

	useEffect(() => {
		const handleScroll = () => {
			if (
				window.innerHeight + window.scrollY >=
					document.body.offsetHeight - 1000 &&
				hasMore &&
				!loading
			) {
				loadMore();
			}
		};
		window.addEventListener("scroll", handleScroll);
		return () => window.removeEventListener("scroll", handleScroll);
	}, [hasMore, loading, loadMore]);

	useEffect(() => {
		if (toast) {
			const timer = setTimeout(() => setToast(null), 3000);
			return () => clearTimeout(timer);
		}
	}, [toast]);

	return (
		<div className="min-h-screen bg-bg-primary text-text-primary">
			<Header
				onSearchOpen={() => setSearchOpen(true)}
				onMenuToggle={() => setMenuOpen(!menuOpen)}
				isMenuOpen={menuOpen}
				theme={theme}
				onThemeToggle={toggleTheme}
			/>

			<main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
				<TopNewsSection onArticleClick={openArticle} />

				{articles.length > 0 && activeView === "feed" && !searchResults && (
					<section className="mb-8">
						<NewsCard
							{...articles[0]}
							variant="featured"
							onBookmark={handleBookmark}
							onShare={handleShare}
							onSummarize={() =>
								handleSummarize(articles[0].id, articles[0].title)
							}
						/>
					</section>
				)}

				<section className="mb-6">
					<div className="flex items-center gap-4 mb-4">
						{(
							[
								"feed",
								"stories",
								"graph",
								"intelligence",
								"bookmarks",
								"history",
								"status",
							] as const
						).map((v) => {
							const labels: Record<string, string> = {
								feed: "📰 Feed",
								stories: "🔗 Histórias",
								graph: "🕸 Grafo",
								intelligence: "💡 Inteligência",
								bookmarks: `🔖 Salvos${bookmarks.length > 0 ? ` (${bookmarks.length})` : ""}`,
								history: `📖 Lidos${readHistory.length > 0 ? ` (${readHistory.length})` : ""}`,
								status: "⚡ Status",
							};
							return (
								<button
									key={v}
									onClick={() => setActiveView(v)}
									className={`text-sm font-medium px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap ${
										activeView === v
											? "bg-accent-primary text-white"
											: "text-text-secondary hover:text-text-primary hover:bg-bg-tertiary"
									}`}
								>
									{labels[v]}
								</button>
							);
						})}
					</div>
				</section>

				<div className="grid gap-8 lg:grid-cols-[220px_minmax(0,1fr)_280px]">
					<aside className="lg:sticky lg:top-24 lg:self-start">
						<CategoryTabs
							activeCategory={activeCategory}
							onCategoryChange={(category) => {
								setActiveCategory(category);
								setSearchResults(null);
								setSearchGraph(null);
							}}
						/>
					</aside>

					<div className="min-w-0">
						{/* Bookmarks view */}
						{activeView === "bookmarks" && (
							<div>
								{bookmarks.length === 0 ? (
									<p className="text-center py-16 text-text-secondary">
										Nenhum artigo salvo ainda. Clique em 🔖 nos cards para
										salvar.
									</p>
								) : (
									<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
										{articles
											.filter((a) => isBookmarked(a.id))
											.map((article) => (
												<NewsCard
													key={article.id}
													{...article}
													onSummarize={() =>
														handleSummarize(article.id, article.title)
													}
													onShare={handleShare}
												/>
											))}
									</div>
								)}
							</div>
						)}

						{/* History view */}
						{activeView === "history" && (
							<div>
								{readHistory.length === 0 ? (
									<p className="text-center py-16 text-text-secondary">
										Nenhum artigo lido ainda. Artigos lidos (80%+) aparecem
										aqui.
									</p>
								) : (
									<ul className="space-y-2">
										{readHistory.map((h) => (
											<li key={h.id}>
												<button
													onClick={() => openArticle(h.id, h.title)}
													className="w-full text-left px-4 py-3 rounded-xl bg-bg-secondary border border-border-subtle hover:border-accent-primary/30 transition-colors"
												>
													<p className="text-sm text-text-primary line-clamp-1">
														{h.title}
													</p>
													<p className="text-xs text-text-secondary mt-1">
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
								)}
							</div>
						)}

						{/* Stories view */}
						{activeView === "stories" && (
							<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
								{storiesLoading
									? Array.from({ length: 6 }).map((_, i) => (
											<SkeletonCard key={i} />
										))
									: stories.map((story) => (
											<StoryCard
												key={story.id}
												story={story}
												selected={selectedStoryId === story.id}
												onClick={() =>
													setSelectedStoryId(
														story.id === selectedStoryId ? null : story.id,
													)
												}
											/>
										))}
								{!storiesLoading && stories.length === 0 && (
									<p className="col-span-3 text-center py-12 text-text-secondary">
										Nenhuma história detectada ainda. Aguarde a próxima
										ingestão.
									</p>
								)}
							</div>
						)}

						{/* Graph view */}
						{activeView === "graph" && (
							<div className="space-y-4">
								{graphLoading ? (
									<div className="h-96 flex items-center justify-center text-text-secondary">
										Carregando grafo...
									</div>
								) : (
									graph && (
										<CorrelationGraph
											nodes={graph.nodes}
											edges={graph.edges}
											stories={graph.stories}
											height={500}
											onNodeClick={(n) => window.open(n.url, "_blank")}
										/>
									)
								)}
								<p className="text-xs text-text-secondary text-center">
									Cada ponto é um artigo. Linhas = correlação semântica. Clique
									para abrir o artigo.
								</p>
							</div>
						)}

						{/* Intelligence view */}
						{activeView === "intelligence" && (
							<IntelligencePanel
								stories={stories}
								onStoryClick={(s) => {
									setSelectedStoryId(s.id);
									setActiveView("stories");
								}}
							/>
						)}

						{/* Status view */}
						{activeView === "status" && <StatusPanel />}

						{/* Feed view */}
						{activeView === "feed" && (
							<>
								{/* Advanced Filters */}
								<div className="mb-6 p-4 rounded-xl bg-bg-secondary border border-border-subtle flex flex-wrap gap-4 items-center animate-fade-in">
									<div className="flex flex-col gap-1">
										<label className="text-xs text-text-secondary font-medium">
											Credibilidade Mínima
										</label>
										<select
											value={minCredibility}
											onChange={(e) =>
												setMinCredibility(Number(e.target.value))
											}
											className="bg-bg-tertiary border border-border-subtle rounded-lg px-3 py-1.5 text-sm text-text-primary outline-none focus:border-accent-primary"
										>
											<option value={0}>Todas</option>
											<option value={7}>{"Confiável (>= 7/10)"}</option>
											<option value={9}>
												{"Alta Confiabilidade (>= 9/10)"}
											</option>
										</select>
									</div>

									<div className="flex flex-col gap-1">
										<label className="text-xs text-text-secondary font-medium">
											Viés Político
										</label>
										<select
											value={politicalBias}
											onChange={(e) => setPoliticalBias(e.target.value)}
											className="bg-bg-tertiary border border-border-subtle rounded-lg px-3 py-1.5 text-sm text-text-primary outline-none focus:border-accent-primary"
										>
											<option value="all">Todos</option>
											<option value="neutral">⚖️ Neutro</option>
											<option value="left">🔵 Esquerda</option>
											<option value="right">🔴 Direita</option>
										</select>
									</div>

									<div className="flex items-center gap-2 mt-4 sm:mt-0">
										<input
											type="checkbox"
											id="exclude-militant"
											checked={excludeMilitant}
											onChange={(e) => setExcludeMilitant(e.target.checked)}
											className="rounded border-border-subtle bg-bg-tertiary text-accent-primary focus:ring-accent-primary w-4 h-4 cursor-pointer"
										/>
										<label
											htmlFor="exclude-militant"
											className="text-sm font-medium text-text-primary cursor-pointer select-none"
										>
											Ocultar Panfletário/Militante
										</label>
									</div>
								</div>
								{error && (
									<div className="text-center py-12">
										<p className="text-red-400 mb-4">{error.message}</p>
										<button
											onClick={refetch}
											className="px-4 py-2 rounded-lg bg-accent-primary text-white hover:bg-accent-primary/80 transition-colors"
										>
											Retry
										</button>
									</div>
								)}
								{searchResults !== null && (
									<div className="mb-4 rounded-xl border border-accent-primary/20 bg-accent-primary/5 p-4">
										<div className="mb-3 flex items-center gap-2">
											<p className="text-sm font-medium text-text-primary">
												{(searchResults as unknown[]).length} resultados
												semanticos
											</p>
											<button
												onClick={() => {
													setSearchResults(null);
													setSearchGraph(null);
												}}
												className="ml-auto text-xs text-accent-primary hover:underline"
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
								<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 stagger-reveal">
									{loading && articles.length === 0
										? Array.from({ length: 6 }).map((_, i) => (
												<SkeletonCard key={i} />
											))
										: (searchResults !== null
												? (searchResults as Array<{
														id: string;
														[k: string]: unknown;
													}>)
												: articles.slice(1)
											).map((article) => (
												<NewsCard
													key={article.id as string}
													{...(article as Parameters<typeof NewsCard>[0])}
													onBookmark={handleBookmark}
													onShare={handleShare}
													onSummarize={() =>
														handleSummarize(
															article.id as string,
															(article as { title?: string }).title,
														)
													}
												/>
											))}
								</div>
							</>
						)}

						{activeView === "feed" && loading && articles.length > 0 && (
							<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
								{Array.from({ length: 3 }).map((_, i) => (
									<SkeletonCard key={`loading-${i}`} />
								))}
							</div>
						)}

						{activeView === "feed" && !hasMore && articles.length > 0 && (
							<p className="text-center py-8 text-text-secondary">
								Você chegou ao fim
							</p>
						)}
					</div>

					<Sidebar onFilterChange={setFilters} />
				</div>
			</main>

			<SearchModal
				isOpen={searchOpen}
				onClose={() => setSearchOpen(false)}
				onSearch={(q) => {
					handleSearch(q);
					setSearchOpen(false);
				}}
				recentSearches={recentSearches}
			/>

			<ArticleModal
				articleId={selectedArticleId}
				onClose={() => {
					setSelectedArticleId(null);
					window.history.replaceState({}, "", window.location.pathname);
				}}
			/>

			{toast && (
				<div className="fixed bottom-4 right-4 px-4 py-2 bg-bg-secondary border border-border-subtle rounded-lg shadow-lg animate-slide-up">
					<p className="text-sm text-text-primary">{toast.message}</p>
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
	};
}
