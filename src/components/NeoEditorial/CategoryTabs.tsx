const CATEGORIES = [
  'Todas',
  'Big Techs',
  'AI Frontier',
  'Dev Tools',
  'Gaming',
  'Tecnologia',
  'IA',
  'Brasil',
  'Mundo',
  'Negocios',
  'Cripto',
  'Ciencia',
];

interface CategoryTabsProps {
  activeCategory: string;
  onCategoryChange: (category: string) => void;
}

export function CategoryTabs({ activeCategory, onCategoryChange }: CategoryTabsProps) {
  return (
    <nav aria-label="Categorias" className="rounded-xl border border-border-subtle bg-bg-secondary/80 p-2">
      <div className="mb-2 px-2 text-xs font-mono uppercase tracking-wider text-text-secondary">
        Categorias
      </div>
      <div className="grid gap-1">
        {CATEGORIES.map((category) => (
          <button
            key={category}
            onClick={() => onCategoryChange(category)}
            className={`
              flex items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition-colors
              ${category === activeCategory
                ? 'bg-accent-primary text-white shadow-sm'
                : 'text-text-secondary hover:bg-bg-tertiary hover:text-text-primary'
              }
            `}
          >
            <span className="font-medium">{category}</span>
            {category === activeCategory && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
          </button>
        ))}
      </div>
    </nav>
  );
}
