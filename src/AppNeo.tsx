import React, { useState, useEffect, useCallback } from 'react';
import { Header, CategoryTabs, NewsCard, Sidebar, SearchModal, SkeletonCard } from './components/NeoEditorial';
import { useTheme, useNews } from './hooks';
import './styles/animations.css';

function App() {
  const [activeCategory, setActiveCategory] = useState('Todas');
  const [filters, setFilters] = useState({});
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

  const handleSearch = useCallback((query: string, searchFilters: object) => {
    console.log('Searching:', query, searchFilters);
    setRecentSearches((prev) => [query, ...prev.filter((s) => s !== query)].slice(0, 5));
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
        {articles.length > 0 && (
          <section className="mb-8">
            <NewsCard
              {...articles[0]}
              variant="featured"
              onBookmark={handleBookmark}
              onShare={handleShare}
              onSummarize={handleSummarize}
            />
          </section>
        )}

        <section className="mb-6">
          <CategoryTabs
            activeCategory={activeCategory}
            onCategoryChange={setActiveCategory}
          />
        </section>

        <div className="flex gap-8">
          <div className="flex-1">
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

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 stagger-reveal">
              {loading && articles.length === 0
                ? Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)
                : articles.slice(1).map((article) => (
                    <NewsCard
                      key={article.id}
                      {...article}
                      onBookmark={handleBookmark}
                      onShare={handleShare}
                      onSummarize={handleSummarize}
                    />
                  ))}
            </div>

            {loading && articles.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
                {Array.from({ length: 3 }).map((_, i) => (
                  <SkeletonCard key={`loading-${i}`} />
                ))}
              </div>
            )}

            {!hasMore && articles.length > 0 && (
              <p className="text-center py-8 text-text-secondary">
                You have reached the end
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
        onSearch={handleSearch}
        recentSearches={recentSearches}
      />

      {toast && (
        <div className="fixed bottom-4 right-4 px-4 py-2 bg-bg-secondary border border-border-subtle rounded-lg shadow-lg animate-slide-up">
          <p className="text-sm text-text-primary">{toast.message}</p>
        </div>
      )}
    </div>
  );
}

export default App;
