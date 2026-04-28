import { useState } from 'react';
import { TrendingUp, Filter, BarChart3, Sparkles, ChevronDown, ChevronUp } from 'lucide-react';

const COMPANIES = [
  'Todas', 'GitHub', 'Google', 'Microsoft', 'Meta', 'Apple', 'Amazon',
  'Nvidia', 'OpenAI', 'Anthropic', 'xAI', 'Mistral', 'HuggingFace'
];

const CATEGORIES = [
  'Todas', 'Big Techs', 'AI Frontier', 'Dev Tools', 'Gaming',
  'Tecnologia', 'IA', 'Brasil', 'Mundo', 'Negocios', 'Cripto', 'Ciencia'
];

interface SidebarProps {
  onFilterChange?: (filters: SidebarFilters) => void;
  sourcesStats?: SourceStats[];
}

interface SidebarFilters {
  company?: string;
  category?: string;
}

interface SourceStats {
  name: string;
  count: number;
  percentage: number;
}

const TRENDING_TOPICS = [
  'GitHub Copilot', 'Claude 4', 'Grok 3', 'Gemini Ultra', 'Steam Deck 2'
];

export function Sidebar({ onFilterChange, sourcesStats = [] }: SidebarProps) {
  const [filters, setFilters] = useState<SidebarFilters>({});
  const [expandedSections, setExpandedSections] = useState({
    trending: true,
    filters: true,
    stats: false,
    ai: false,
  });

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const handleFilterChange = (key: keyof SidebarFilters, value: string) => {
    const newFilters = { ...filters, [key]: value || undefined };
    setFilters(newFilters);
    onFilterChange?.(newFilters);
  };

  return (
    <aside className="w-72 flex-shrink-0 space-y-4">
      <section className="bg-bg-secondary rounded-xl border border-border-subtle overflow-hidden">
        <button
          onClick={() => toggleSection('trending')}
          className="w-full flex items-center justify-between p-4 hover:bg-bg-tertiary transition-colors"
        >
          <span className="flex items-center gap-2 font-sans font-medium text-text-primary">
            <TrendingUp className="w-4 h-4 text-accent-primary" />
            Trending
          </span>
          {expandedSections.trending ? (
            <ChevronUp className="w-4 h-4 text-text-secondary" />
          ) : (
            <ChevronDown className="w-4 h-4 text-text-secondary" />
          )}
        </button>
        {expandedSections.trending && (
          <div className="px-4 pb-4 space-y-2">
            {TRENDING_TOPICS.map((topic) => (
              <button
                key={topic}
                className="block w-full text-left px-3 py-2 rounded-lg text-sm text-text-secondary hover:bg-bg-tertiary hover:text-accent-primary transition-colors"
              >
                #{topic}
              </button>
            ))}
          </div>
        )}
      </section>

      <section className="bg-bg-secondary rounded-xl border border-border-subtle overflow-hidden">
        <button
          onClick={() => toggleSection('filters')}
          className="w-full flex items-center justify-between p-4 hover:bg-bg-tertiary transition-colors"
        >
          <span className="flex items-center gap-2 font-sans font-medium text-text-primary">
            <Filter className="w-4 h-4 text-accent-secondary" />
            Filters
          </span>
          {expandedSections.filters ? (
            <ChevronUp className="w-4 h-4 text-text-secondary" />
          ) : (
            <ChevronDown className="w-4 h-4 text-text-secondary" />
          )}
        </button>
        {expandedSections.filters && (
          <div className="px-4 pb-4 space-y-4">
            <div>
              <label className="block text-xs text-text-secondary mb-2 uppercase tracking-wider">
                Company
              </label>
              <select
                value={filters.company || ''}
                onChange={(e) => handleFilterChange('company', e.target.value)}
                className="w-full bg-bg-tertiary text-text-primary text-sm rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-accent-primary"
              >
                <option value="">All Companies</option>
                {COMPANIES.filter(c => c !== 'Todas').map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-text-secondary mb-2 uppercase tracking-wider">
                Category
              </label>
              <select
                value={filters.category || ''}
                onChange={(e) => handleFilterChange('category', e.target.value)}
                className="w-full bg-bg-tertiary text-text-primary text-sm rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-accent-primary"
              >
                <option value="">All Categories</option>
                {CATEGORIES.filter(c => c !== 'Todas').map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>
        )}
      </section>

      <section className="bg-bg-secondary rounded-xl border border-border-subtle overflow-hidden">
        <button
          onClick={() => toggleSection('stats')}
          className="w-full flex items-center justify-between p-4 hover:bg-bg-tertiary transition-colors"
        >
          <span className="flex items-center gap-2 font-sans font-medium text-text-primary">
            <BarChart3 className="w-4 h-4 text-accent-tertiary" />
            Sources
          </span>
          {expandedSections.stats ? (
            <ChevronUp className="w-4 h-4 text-text-secondary" />
          ) : (
            <ChevronDown className="w-4 h-4 text-text-secondary" />
          )}
        </button>
        {expandedSections.stats && (
          <div className="px-4 pb-4 space-y-3">
            {sourcesStats.length > 0 ? sourcesStats.map((source) => (
              <div key={source.name} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-text-secondary">{source.name}</span>
                  <span className="font-numbers text-accent-primary">{source.count}</span>
                </div>
                <div className="h-1 bg-bg-tertiary rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-accent-primary to-accent-secondary rounded-full transition-all"
                    style={{ width: `${source.percentage}%` }}
                  />
                </div>
              </div>
            )) : (
              <p className="text-xs text-text-secondary">Loading stats...</p>
            )}
          </div>
        )}
      </section>

      <section className="bg-bg-secondary rounded-xl border border-border-subtle overflow-hidden">
        <button
          onClick={() => toggleSection('ai')}
          className="w-full flex items-center justify-between p-4 hover:bg-bg-tertiary transition-colors"
        >
          <span className="flex items-center gap-2 font-sans font-medium text-text-primary">
            <Sparkles className="w-4 h-4 text-accent-primary" />
            AI Summary
          </span>
          {expandedSections.ai ? (
            <ChevronUp className="w-4 h-4 text-text-secondary" />
          ) : (
            <ChevronDown className="w-4 h-4 text-text-secondary" />
          )}
        </button>
        {expandedSections.ai && (
          <div className="px-4 pb-4">
            <div className="p-3 rounded-lg bg-bg-tertiary text-xs text-text-secondary">
              <p className="mb-2">Today top story:</p>
              <p className="text-text-primary font-medium">
                GitHub announces Copilot X with GPT-4 Turbo integration
              </p>
              <p className="mt-2 text-accent-primary flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                Updated 5 min ago
              </p>
            </div>
          </div>
        )}
      </section>
    </aside>
  );
}
