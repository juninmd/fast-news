import { useState, useEffect } from 'react';
import { Search, Settings, Moon, Sun, Menu, X } from 'lucide-react';

interface HeaderProps {
  onSearchOpen: () => void;
  onSettingsOpen: () => void;
  onMenuToggle: () => void;
  isMenuOpen: boolean;
  theme: 'light' | 'dark';
  onThemeToggle: () => void;
}

export function Header({ onSearchOpen, onSettingsOpen, onMenuToggle, isMenuOpen, theme, onThemeToggle }: HeaderProps) {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 10);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header
      className={`
        sticky top-0 z-40 transition-all duration-200
        ${isScrolled ? 'bg-bg-primary/80 backdrop-blur-xl border-b border-border-subtle' : 'bg-transparent'}
      `}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <button
              onClick={onMenuToggle}
              className="lg:hidden p-2 rounded-lg hover:bg-bg-tertiary text-text-secondary"
            >
              {isMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <a href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent-primary to-accent-secondary flex items-center justify-center">
                <span className="text-white font-display font-bold text-lg">F</span>
              </div>
              <span className="hidden sm:block font-display font-bold text-xl text-text-primary">
                Fast<span className="text-accent-primary">News</span>
              </span>
            </a>
          </div>

          <div className="hidden md:flex flex-1 max-w-xl mx-8">
            <button
              onClick={onSearchOpen}
              className="w-full flex items-center gap-3 px-4 py-2 rounded-xl bg-bg-secondary border border-border-subtle hover:border-accent-primary/30 transition-colors group"
            >
              <Search className="w-4 h-4 text-text-secondary" />
              <span className="text-text-secondary text-sm">Search news...</span>
              <kbd className="ml-auto hidden sm:flex items-center gap-1 px-2 py-0.5 rounded-lg bg-bg-tertiary text-text-secondary text-xs font-mono">
                Ctrl+K
              </kbd>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onSearchOpen}
              className="md:hidden p-2 rounded-lg hover:bg-bg-tertiary text-text-secondary"
            >
              <Search className="w-5 h-5" />
            </button>

            <button
              onClick={onThemeToggle}
              className="p-2 rounded-lg hover:bg-bg-tertiary text-text-secondary hover:text-accent-primary transition-colors"
              title="Toggle theme"
            >
              {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>

            <button
              onClick={onSettingsOpen}
              className="p-2 rounded-lg hover:bg-bg-tertiary text-text-secondary hover:text-accent-primary transition-colors"
            >
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
