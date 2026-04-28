import { useState, useRef, useEffect } from 'react';

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
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0 });
  const tabsRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (activeRef.current && tabsRef.current) {
      const activeRect = activeRef.current.getBoundingClientRect();
      const parentRect = tabsRef.current.getBoundingClientRect();
      setIndicatorStyle({
        left: activeRect.left - parentRect.left,
        width: activeRect.width,
      });
    }
  }, [activeCategory]);

  return (
    <div className="relative border-b border-border-subtle overflow-x-auto scrollbar-hide">
      <div ref={tabsRef} className="flex items-center gap-1 min-w-max">
        {CATEGORIES.map((category) => (
          <button
            key={category}
            ref={category === activeCategory ? activeRef : null}
            onClick={() => onCategoryChange(category)}
            className={`
              relative px-4 py-3 text-sm font-sans whitespace-nowrap transition-colors
              ${category === activeCategory
                ? 'text-accent-primary font-medium'
                : 'text-text-secondary hover:text-text-primary'
              }
            `}
          >
            {category}
          </button>
        ))}
      </div>

      <div
        className="absolute bottom-0 h-0.5 bg-accent-primary transition-all duration-300 ease-out"
        style={{
          left: indicatorStyle.left,
          width: indicatorStyle.width,
        }}
      />
    </div>
  );
}
