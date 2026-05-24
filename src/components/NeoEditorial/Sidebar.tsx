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
	if (!story) return <p className="text-text-secondary">Carregando...</p>;
	return (
		<>
			<p className="mb-2">Top notícia agora:</p>
			<p className="text-text-primary font-medium leading-snug line-clamp-3">
				{story.title}
			</p>
			<p className="mt-2 text-text-secondary">— {story.source}</p>
			<p className="mt-1 text-accent-primary flex items-center gap-1">
				<Sparkles className="w-3 h-3" />
				{new Date(story.published_at).toLocaleTimeString("pt-BR", {
					hour: "2-digit",
					minute: "2-digit",
					timeZone: "America/Sao_Paulo",
				})}
			</p>
		</>
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
		<aside className="w-72 flex-shrink-0 space-y-4">
			<section className="bg-bg-secondary rounded-xl border border-border-subtle overflow-hidden">
				<button
					onClick={() => toggleSection("trending")}
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
						{topics.length === 0
							? Array.from({ length: 5 }).map((_, i) => (
									<div
										key={i}
										className="h-8 bg-bg-tertiary rounded-lg animate-pulse"
									/>
								))
							: topics.map((topic) => (
									<button
										key={topic.id}
										className="block w-full text-left px-3 py-2 rounded-lg text-sm text-text-secondary hover:bg-bg-tertiary hover:text-accent-primary transition-colors"
									>
										#{topic.name}
									</button>
								))}
					</div>
				)}
			</section>

			<section className="bg-bg-secondary rounded-xl border border-border-subtle overflow-hidden">
				<button
					onClick={() => toggleSection("filters")}
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
								value={filters.company || ""}
								onChange={(e) => handleFilterChange("company", e.target.value)}
								className="w-full bg-bg-tertiary text-text-primary text-sm rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-accent-primary"
							>
								<option value="">All Companies</option>
								{COMPANIES.filter((c) => c !== "Todas").map((c) => (
									<option key={c} value={c}>
										{c}
									</option>
								))}
							</select>
						</div>
						<div>
							<label className="block text-xs text-text-secondary mb-2 uppercase tracking-wider">
								Category
							</label>
							<select
								value={filters.category || ""}
								onChange={(e) => handleFilterChange("category", e.target.value)}
								className="w-full bg-bg-tertiary text-text-primary text-sm rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-accent-primary"
							>
								<option value="">All Categories</option>
								{CATEGORIES.filter((c) => c !== "Todas").map((c) => (
									<option key={c} value={c}>
										{c}
									</option>
								))}
							</select>
						</div>
					</div>
				)}
			</section>

			<section className="bg-bg-secondary rounded-xl border border-border-subtle overflow-hidden">
				<button
					onClick={() => toggleSection("stats")}
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
						{sourcesStats.length > 0 ? (
							sourcesStats.map((source) => (
								<div key={source.name} className="space-y-1">
									<div className="flex items-center justify-between text-xs">
										<span className="text-text-secondary">{source.name}</span>
										<span className="font-numbers text-accent-primary">
											{source.count}
										</span>
									</div>
									<div className="h-1 bg-bg-tertiary rounded-full overflow-hidden">
										<div
											className="h-full bg-gradient-to-r from-accent-primary to-accent-secondary rounded-full transition-all"
											style={{ width: `${source.percentage}%` }}
										/>
									</div>
								</div>
							))
						) : (
							<p className="text-xs text-text-secondary">Loading stats...</p>
						)}
					</div>
				)}
			</section>

			<section className="bg-bg-secondary rounded-xl border border-border-subtle overflow-hidden">
				<button
					onClick={() => toggleSection("ai")}
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
							<TopStoryWidget />
						</div>
					</div>
				)}
			</section>
		</aside>
	);
}
