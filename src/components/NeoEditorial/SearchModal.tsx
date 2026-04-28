import { useState, useEffect, useRef } from 'react';
import { Search, X, ArrowRight, Clock, Sparkles } from 'lucide-react';

const CATEGORIES = [
  'Todas', 'Big Techs', 'AI Frontier', 'Dev Tools', 'Gaming',
  'Tecnologia', 'IA', 'Brasil', 'Mundo', 'Negocios', 'Cripto', 'Ciencia'
];

const COMPANIES = [
  'Todas', 'GitHub', 'Google', 'Microsoft', 'Meta', 'Apple', 'Amazon',
  'Nvidia', 'OpenAI', 'Anthropic', 'xAI', 'Mistral', 'HuggingFace',
  'Cohere', 'Vercel', 'Cloudflare', 'Supabase', 'Cursor', 'Steam',
  'Xbox', 'PlayStation', 'Nintendo'
];

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSearch: (query: string, filters: SearchFilters) => void;
  recentSearches?: string[];
}

interface SearchFilters {
  category?: string;
  company?: string;
}

export function SearchModal({ isOpen, onClose, onSearch, recentSearches = [] }: SearchModalProps) {
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState<SearchFilters>({});
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
      setQuery('');
      setFilters({});
      setSelectedIndex(0);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((i) => Math.min(i + 1, recentSearches.length - 1));
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, 0));
      }
      if (e.key === 'Enter' && query) {
        onSearch(query, filters);
        onClose();
      }
    };

    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, query, filters, recentSearches, selectedIndex, onSearch, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]">
      <div
        className="absolute inset-0 bg-bg-primary/80 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />

      <div className="relative w-full max-w-2xl mx-4 bg-bg-secondary border border-border-subtle rounded-2xl shadow-2xl overflow-hidden animate-slide-up">
        <div className="flex items-center gap-3 p-4 border-b border-border-subtle">
          <Search className="w-5 h-5 text-text-secondary" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search news, topics, sources..."
            className="flex-1 bg-transparent text-text-primary placeholder-text-secondary outline-none font-sans"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="p-1 rounded-lg hover:bg-bg-tertiary text-text-secondary"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <kbd className="hidden sm:flex items-center gap-1 px-2 py-1 rounded-lg bg-bg-tertiary text-text-secondary text-xs font-mono">
            ESC
          </kbd>
        </div>

        <div className="flex items-center gap-4 p-3 border-b border-border-subtle bg-bg-primary/30">
          <span className="text-xs text-text-secondary">Filters:</span>
          <select
            value={filters.category || ''}
            onChange={(e) => setFilters({ ...filters, category: e.target.value || undefined })}
            className="bg-bg-tertiary text-text-primary text-xs rounded-lg px-2 py-1 outline-none focus:ring-1 focus:ring-accent-primary"
          >
            <option value="">All Categories</option>
            {CATEGORIES.filter(c => c !== 'Todas').map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <select
            value={filters.company || ''}
            onChange={(e) => setFilters({ ...filters, company: e.target.value || undefined })}
            className="bg-bg-tertiary text-text-primary text-xs rounded-lg px-2 py-1 outline-none focus:ring-1 focus:ring-accent-primary"
          >
            <option value="">All Companies</option>
            {COMPANIES.filter(c => c !== 'Todas').map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        <div className="max-h-80 overflow-y-auto p-2">
          {query ? (
            <div className="p-3 text-center text-text-secondary text-sm">
              Press Enter to search for "{query}"
              <span className="block mt-1 flex items-center justify-center gap-1 text-accent-primary">
                <Sparkles className="w-3 h-3" /> AI-powered semantic search
              </span>
            </div>
          ) : recentSearches.length > 0 ? (
            <div className="space-y-1">
              <div className="px-3 py-2 text-xs text-text-secondary uppercase tracking-wider">
                Recent Searches
              </div>
              {recentSearches.map((search, i) => (
                <button
                  key={search}
                  onClick={() => {
                    setQuery(search);
                    onSearch(search, filters);
                    onClose();
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                    i === selectedIndex
                      ? 'bg-accent-primary/20 text-accent-primary'
                      : 'text-text-secondary hover:bg-bg-tertiary hover:text-text-primary'
                  }`}
                >
                  <Clock className="w-4 h-4" />
                  <span className="flex-1 text-left text-sm">{search}</span>
                  <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100" />
                </button>
              ))}
            </div>
          ) : (
            <div className="p-6 text-center text-text-secondary">
              <Search className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>Start typing to search</p>
              <p className="text-xs mt-1">Use filters to narrow results by category or company</p>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between px-4 py-3 border-t border-border-subtle bg-bg-primary/30">
          <div className="flex items-center gap-4 text-xs text-text-secondary">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-bg-tertiary font-mono">↑↓</kbd>
              Navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-bg-tertiary font-mono">↵</kbd>
              Select
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-bg-tertiary font-mono">ESC</kbd>
              Close
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
