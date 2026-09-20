const CATEGORIES = [
	"Todas",
	"Big Techs",
	"AI Frontier",
	"Dev Tools",
	"Gaming",
	"Tecnologia",
	"IA",
	"Brasil",
	"Mundo",
	"Negocios",
	"Cripto",
	"Ciencia",
];

interface CategoryTabsProps {
	activeCategory: string;
	onCategoryChange: (category: string) => void;
}

export function CategoryTabs({
	activeCategory,
	onCategoryChange,
}: CategoryTabsProps) {
	return (
		<nav aria-label="Categorias" className="border border-border-subtle">
			<div className="flex flex-col">
				{CATEGORIES.map((category, i) => {
					const active = category === activeCategory;
					return (
						<button
							key={category}
							onClick={() => onCategoryChange(category)}
							className={`
              flex items-center justify-between px-3 py-2.5 text-left text-sm transition-colors
              ${i > 0 ? "border-t border-border-subtle" : ""}
              ${
								active
									? "bg-accent-primary/10 text-accent-primary font-medium"
									: "text-text-secondary hover:text-text-primary"
							}
            `}
						>
							<span>{category}</span>
							{active && <span className="h-1.5 w-1.5 bg-accent-primary" />}
						</button>
					);
				})}
			</div>
		</nav>
	);
}
