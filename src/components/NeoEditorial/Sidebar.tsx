import {
	BarChart3,
	ChevronDown,
	ChevronUp,
	Filter,
	Sparkles,
	TrendingUp,
} from "lucide-react";
import { useEffect, useState } from "react";

const COMPANIES = [
	"Todas",
	"GitHub",
	"Google",
	"Microsoft",
	"Meta",
	"Apple",
	"Amazon",
	"Nvidia",
	"OpenAI",
	"Anthropic",
	"xAI",
	"Mistral",
	"HuggingFace",
];

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

function TopStoryWidget() {
	const [story, setStory] = useState<{
		title: string;
		source: string;
		published_at: string;
	} | null>(null);
	useEffect(() => {
		fetch("/api/news/top")
			.then((r) => r.json())
			.then((d) => setStory(d.data?.[0] ?? null))
			.catch(() => {});
	}, []);
	if (!story)
		return (
			<p className="font-mono text-xs text-text-secondary">Carregando...</p>
		);
	return (
		<>
			<p className="mb-2 font-mono text-[11px] uppercase text-text-secondary">
				Top notícia agora
			</p>
			<p className="font-sans text-sm font-medium leading-snug text-text-primary line-clamp-3">
				{story.title}
			</p>
			<p className="mt-2 font-mono text-xs text-text-secondary">
				— {story.source}
			</p>
			<p className="mt-1 flex items-center gap-1 font-mono text-xs text-accent-primary">
				<Sparkles className="h-3 w-3" />
				{new Date(story.published_at).toLocaleTimeString("pt-BR", {
					hour: "2-digit",
					minute: "2-digit",
					timeZone: "America/Sao_Paulo",
				})}
			</p>
		</>
	);
}

function SidebarSection({
	icon,
	title,
	expanded,
	onToggle,
	children,
}: {
	icon: React.ReactNode;
	title: string;
	expanded: boolean;
	onToggle: () => void;
	children: React.ReactNode;
}) {
	return (
		<section className="border border-border-subtle">
			<button
				onClick={onToggle}
				className="flex w-full items-center justify-between px-4 py-3 transition-colors hover:bg-bg-tertiary/40"
			>
				<span className="flex items-center gap-2 font-mono text-xs uppercase tracking-wide text-text-primary">
					{icon}
					{title}
				</span>
				{expanded ? (
					<ChevronUp className="h-4 w-4 text-text-secondary" />
				) : (
					<ChevronDown className="h-4 w-4 text-text-secondary" />
				)}
			</button>
			{expanded && (
				<div className="border-t border-border-subtle px-4 py-3">
					{children}
				</div>
			)}
		</section>
	);
}

export function Sidebar({ onFilterChange, sourcesStats = [] }: SidebarProps) {
	const [filters, setFilters] = useState<SidebarFilters>({});
	const [topics, setTopics] = useState<{ id: string; name: string }[]>([]);
	const [expandedSections, setExpandedSections] = useState({
		trending: true,
		filters: true,
		stats: false,
		ai: false,
	});

	useEffect(() => {
		fetch("/api/topics")
			.then((r) => r.json())
			.then((d) => setTopics((d.data ?? d).slice(0, 8)))
			.catch(() => {});
	}, []);

	const toggleSection = (section: keyof typeof expandedSections) => {
		setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
	};

	const handleFilterChange = (key: keyof SidebarFilters, value: string) => {
		const newFilters = { ...filters, [key]: value || undefined };
		setFilters(newFilters);
		onFilterChange?.(newFilters);
	};

	return (
		<aside className="w-72 flex-shrink-0 space-y-3">
			<SidebarSection
				icon={<TrendingUp className="h-3.5 w-3.5 text-accent-primary" />}
				title="Trending"
				expanded={expandedSections.trending}
				onToggle={() => toggleSection("trending")}
			>
				<div className="space-y-1">
					{topics.length === 0
						? Array.from({ length: 5 }).map((_, i) => (
								<div key={i} className="h-7 animate-pulse bg-bg-tertiary" />
							))
						: topics.map((topic) => (
								<button
									key={topic.id}
									className="block w-full px-2 py-1.5 text-left font-mono text-xs text-text-secondary transition-colors hover:text-accent-primary"
								>
									#{topic.name}
								</button>
							))}
				</div>
			</SidebarSection>

			<SidebarSection
				icon={<Filter className="h-3.5 w-3.5 text-accent-secondary" />}
				title="Filtros"
				expanded={expandedSections.filters}
				onToggle={() => toggleSection("filters")}
			>
				<div className="space-y-4">
					<div>
						<label className="mb-2 block font-mono text-[11px] uppercase text-text-secondary">
							Empresa
						</label>
						<select
							value={filters.company || ""}
							onChange={(e) => handleFilterChange("company", e.target.value)}
							className="w-full border border-border-subtle bg-bg-secondary px-3 py-2 text-sm text-text-primary outline-none focus-visible:border-accent-primary"
						>
							<option value="">Todas as empresas</option>
							{COMPANIES.filter((c) => c !== "Todas").map((c) => (
								<option key={c} value={c}>
									{c}
								</option>
							))}
						</select>
					</div>
					<div>
						<label className="mb-2 block font-mono text-[11px] uppercase text-text-secondary">
							Categoria
						</label>
						<select
							value={filters.category || ""}
							onChange={(e) => handleFilterChange("category", e.target.value)}
							className="w-full border border-border-subtle bg-bg-secondary px-3 py-2 text-sm text-text-primary outline-none focus-visible:border-accent-primary"
						>
							<option value="">Todas as categorias</option>
							{CATEGORIES.filter((c) => c !== "Todas").map((c) => (
								<option key={c} value={c}>
									{c}
								</option>
							))}
						</select>
					</div>
				</div>
			</SidebarSection>

			<SidebarSection
				icon={<BarChart3 className="h-3.5 w-3.5 text-accent-tertiary" />}
				title="Fontes"
				expanded={expandedSections.stats}
				onToggle={() => toggleSection("stats")}
			>
				<div className="space-y-3">
					{sourcesStats.length > 0 ? (
						sourcesStats.map((source) => (
							<div key={source.name} className="space-y-1">
								<div className="flex items-center justify-between text-xs">
									<span className="text-text-secondary">{source.name}</span>
									<span className="font-mono text-accent-primary">
										{source.count}
									</span>
								</div>
								<div className="h-1 bg-bg-tertiary">
									<div
										className="h-full bg-accent-primary"
										style={{ width: `${source.percentage}%` }}
									/>
								</div>
							</div>
						))
					) : (
						<p className="font-mono text-xs text-text-secondary">
							Carregando estatísticas...
						</p>
					)}
				</div>
			</SidebarSection>

			<SidebarSection
				icon={<Sparkles className="h-3.5 w-3.5 text-accent-primary" />}
				title="Resumo IA"
				expanded={expandedSections.ai}
				onToggle={() => toggleSection("ai")}
			>
				<TopStoryWidget />
			</SidebarSection>
		</aside>
	);
}
