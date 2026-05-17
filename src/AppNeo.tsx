import React, { useState, useEffect, useCallback } from 'react';
import { Header, CategoryTabs, NewsCard, Sidebar, SearchModal, SkeletonCard, TopNewsSection, ArticleModal } from './components/NeoEditorial';
import { StoryCard, CorrelationGraph, IntelligencePanel, StoryDetailModal } from './components/StoryIntelligence';
import { useTheme, useNews } from './hooks';
import { useStories, useStoryDetail, useGlobalGraph } from './hooks/useStories';
import './styles/animations.css';

function App() {
  const [activeCategory, setActiveCategory] = useState('Todas');
  const [activeView, setActiveView] = useState<'feed' | 'stories' | 'graph' | 'intelligence'>('feed');
  const [selectedStoryId, setSelectedStoryId] = useState<string | null>(null);
  const [selectedArticleId, setSelectedArticleId] = useState<string | null>(null);
  const [searchResults, setSearchResults] = useState<unknown[] | null>(null);
  const [filters, setFilters] = useState({});

  const { stories, loading: storiesLoading } = useStories(activeCategory);
  const { detail: storyDetail, loading: detailLoading } = useStoryDetail(selectedStoryId);
  const { graph, loading: graphLoading } = useGlobalGraph(activeCategory);
  const [searchOpen, setSearchOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  // @ts-ignore
  const [toast, setToast] = useState(null);
  const { theme, toggleTheme } = useTheme();

  const { articles, loading, error, refetch, loadMore, hasMore } = useNews({
    category: activeCategory,
    ...filters,
  });

  // Open article from Telegram deep link (?id=<uuid>)
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get('id');
    if (id) setSelectedArticleId(id);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen(true);
      }
      if (e.key === 'Escape') {
        setSearchOpen(false);
        setSettingsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleSearch = useCallback((query: string) => {
    setRecentSearches((prev) => [query, ...prev.filter((s) => s !== query)].slice(0, 5));
    fetch(`/api/news/search?q=${encodeURIComponent(query)}`)
      .then((r) => r.json())
      .then((d) => { setSearchResults(d.data ?? []); setActiveView('feed'); })
      .catch(() => {});
  }, []);

  const handleBookmark = useCallback(() => {
    setToast({ message: 'Article saved!', type: 'success' });
  }, []);

  const handleShare = useCallback(() => {
    navigator.clipboard.writeText(window.location.href);
    setToast({ message: 'Link copied!', type: 'success' });
  }, []);

  const handleSummarize = useCallback(() => {
    setToast({ message: 'Generating summary...', type: 'success' });
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      if (
        window.innerHeight + window.scrollY >= document.body.offsetHeight - 1000 &&
        hasMore && !loading
      ) {
        loadMore();
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
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
        onSettingsOpen={() => setSettingsOpen(true)}
        onMenuToggle={() => setMenuOpen(!menuOpen)}
        isMenuOpen={menuOpen}
        theme={theme}
        onThemeToggle={toggleTheme}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <TopNewsSection onArticleClick={setSelectedArticleId} />

        {articles.length > 0 && activeView === 'feed' && !searchResults && (
          <section className="mb-8">
            <NewsCard
              {...articles[0]}
              variant="featured"
              onBookmark={handleBookmark}
              onShare={handleShare}
              onSummarize={() => setSelectedArticleId(articles[0].id)}
            />
          </section>
        )}

        <section className="mb-6">
          <div className="flex items-center gap-4 mb-4">
            {(['feed', 'stories', 'graph', 'intelligence'] as const).map((v) => (
              <button
                key={v}
                onClick={() => setActiveView(v)}
                className={`text-sm font-medium px-3 py-1.5 rounded-lg transition-colors ${
                  activeView === v
                    ? 'bg-accent text-white'
                    : 'text-text-secondary hover:text-text-primary hover:bg-surface'
                }`}
              >
                {v === 'feed' ? '📰 Feed' : v === 'stories' ? '🔗 Histórias' : v === 'graph' ? '🕸 Grafo' : '💡 Inteligência'}
              </button>
            ))}
          </div>
          <CategoryTabs
            activeCategory={activeCategory}
            onCategoryChange={setActiveCategory}
          />
        </section>

        <div className="flex gap-8">
          <div className="flex-1">
            {/* Stories view */}
            {activeView === 'stories' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {storiesLoading
                  ? Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)
                  : stories.map((story) => (
                      <StoryCard
                        key={story.id}
                        story={story}
                        selected={selectedStoryId === story.id}
                        onClick={() => setSelectedStoryId(story.id === selectedStoryId ? null : story.id)}
                      />
                    ))}
                {!storiesLoading && stories.length === 0 && (
                  <p className="col-span-3 text-center py-12 text-text-secondary">
                    Nenhuma história detectada ainda. Aguarde a próxima ingestão.
                  </p>
                )}
              </div>
            )}

            {/* Graph view */}
            {activeView === 'graph' && (
              <div className="space-y-4">
                {graphLoading
                  ? <div className="h-96 flex items-center justify-center text-text-secondary">Carregando grafo...</div>
                  : graph && (
                      <CorrelationGraph
                        nodes={graph.nodes}
                        edges={graph.edges}
                        stories={graph.stories}
                        height={500}
                        onNodeClick={(n) => window.open(n.url, '_blank')}
                      />
                    )
                }
                <p className="text-xs text-text-secondary text-center">
                  Cada ponto é um artigo. Linhas = correlação semântica. Clique para abrir o artigo.
                </p>
              </div>
            )}

            {/* Intelligence view */}
            {activeView === 'intelligence' && (
              <IntelligencePanel
                stories={stories}
                onStoryClick={(s) => { setSelectedStoryId(s.id); setActiveView('stories'); }}
              />
            )}

            {/* Feed view */}
            {activeView === 'feed' && (
              <>
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
                  <div className="flex items-center gap-2 mb-4">
                    <p className="text-sm text-text-secondary">{(searchResults as unknown[]).length} resultados</p>
                    <button onClick={() => setSearchResults(null)} className="text-xs text-accent-primary hover:underline">Limpar busca</button>
                  </div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 stagger-reveal">
                  {loading && articles.length === 0
                    ? Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)
                    : (searchResults !== null ? (searchResults as Array<{ id: string; [k: string]: unknown }>) : articles.slice(1)).map((article) => (
                        <NewsCard
                          key={article.id as string}
                          {...(article as Parameters<typeof NewsCard>[0])}
                          onBookmark={handleBookmark}
                          onShare={handleShare}
                          onSummarize={() => setSelectedArticleId(article.id as string)}
                        />
                      ))}
                </div>
              </>
            )}


            {activeView === 'feed' && loading && articles.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
                {Array.from({ length: 3 }).map((_, i) => (
                  <SkeletonCard key={`loading-${i}`} />
                ))}
              </div>
            )}

            {activeView === 'feed' && !hasMore && articles.length > 0 && (
              <p className="text-center py-8 text-text-secondary">
                Você chegou ao fim
              </p>
            )}
          </div>

          <Sidebar
            onFilterChange={setFilters}
          />
        </div>
      </main>

      <SearchModal
        isOpen={searchOpen}
        onClose={() => setSearchOpen(false)}
        onSearch={(q) => { handleSearch(q); setSearchOpen(false); }}
        recentSearches={recentSearches}
      />

      <ArticleModal
        articleId={selectedArticleId}
        onClose={() => setSelectedArticleId(null)}
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
