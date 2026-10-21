import { useState } from "react";
import { CoverImage } from "../components/NeoEditorial/CoverImage";
import { useNews } from "../hooks/useNews";
import { useTopNews } from "../hooks/useTopNews";
import { timeAgoShort } from "../utils/format";
import {
	activeFilterCount,
	DEFAULT_FILTERS,
	type FeedFilters,
	FiltersSheet,
} from "./FiltersSheet";
import { FilterIcon, SearchIcon, SunIcon } from "./Icons";
import { Meta, RowSkeleton, StoryRow } from "./StoryRow";
import { fromTop, type MobileArticle } from "./types";
import { useSentinel } from "./useSentinel";

export const CATEGORIES = [
	"Todas",
	"Brasil",
	"Mundo",
	"Tecnologia",
	"Negócios",
	"IA",
	"Ciência",
	"Cripto",
	"Segurança",
	"Big Techs",
	"Dev Tools",
	"Gaming",
];

function SourceDots({ names }: { names: string[] }) {
	return (
		<div className="flex" aria-hidden="true">
			{names.slice(0, 3).map((n, i) => (
				<span
					key={`${n}-${i}`}
					className={`flex h-7 w-7 items-center justify-center rounded-full border-2 border-bg-primary bg-bg-tertiary text-[9px] font-semibold uppercase ${i > 0 ? "-ml-2" : ""}`}
				>
					{n.slice(0, 2)}
				</span>
			))}
		</div>
	);
}

function Lead({
	article,
	onOpen,
}: {
	article: MobileArticle;
	onOpen: (a: MobileArticle) => void;
}) {
	const others = article.alsoIn ?? [];
	const total = article.sourceCount ?? others.length + 1;
	return (
		<button
			type="button"
			onClick={() => onOpen(article)}
			className="block w-full text-left"
		>
			<CoverImage
				src={article.imageUrl}
				source={article.source}
				category={article.category}
				eager
				className="h-[200px] w-full rounded-[14px]"
			/>
			<div className="mt-3.5 flex items-center gap-2">
				<span className="font-mono text-[11px] uppercase tracking-wider text-accent-tertiary">
					Em alta
				</span>
				<Meta>
					· {article.category} · {timeAgoShort(article.publishedAt)}
				</Meta>
			</div>
			<h2 className="mt-1.5 font-display text-[23px] font-semibold leading-[1.25] text-text-primary">
				{article.title}
			</h2>
			{total > 1 && (
				<div className="mt-3 flex items-center gap-2.5">
					<SourceDots
						names={[article.source, ...others.map((o) => o.source)]}
					/>
					<span className="text-[13px] text-text-secondary">
						{total} fontes
					</span>
				</div>
			)}
		</button>
	);
}

export function TodayScreen({
	onOpen,
	onToggleTheme,
	onSearch,
}: {
	onOpen: (a: MobileArticle) => void;
	onToggleTheme: () => void;
	onSearch: () => void;
}) {
	const [category, setCategory] = useState("Todas");
	const [filters, setFilters] = useState<FeedFilters>(DEFAULT_FILTERS);
	const [sheet, setSheet] = useState(false);
	const { articles: top } = useTopNews();
	const { articles, loading, error, refetch, loadMore, hasMore } = useNews({
		category,
		minCredibility: filters.minCredibility || undefined,
		politicalBias: filters.politicalBias,
		excludeMilitant: filters.excludeMilitant || undefined,
		group: filters.group,
	});
	const sentinel = useSentinel(loadMore);

	const lead = category === "Todas" && top[0] ? fromTop(top[0]) : undefined;
	const rest = articles.filter((a) => a.id !== lead?.id);
	const filterCount = activeFilterCount(filters);
	const date = new Date().toLocaleDateString("pt-BR", {
		weekday: "short",
		day: "2-digit",
		month: "short",
	});

	return (
		<div className="flex h-full flex-col">
			<header className="shrink-0 px-5 pt-[max(0.75rem,var(--sat))]">
				<div className="flex items-center justify-between">
					<div>
						<h1 className="font-display text-2xl font-semibold leading-7">
							Fast News
						</h1>
						<p className="mt-0.5 font-mono text-[11px] uppercase tracking-wider text-text-secondary">
							{date.replace(".", "")}
						</p>
					</div>
					<div className="-mr-3 flex">
						<button
							type="button"
							onClick={() => setSheet(true)}
							aria-label={`Filtros${filterCount ? ` (${filterCount} ativos)` : ""}`}
							className="relative flex h-11 w-11 items-center justify-center"
						>
							<FilterIcon />
							{filterCount > 0 && (
								<span className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full bg-accent-primary" />
							)}
						</button>
						<button
							type="button"
							onClick={onSearch}
							aria-label="Buscar"
							className="flex h-11 w-11 items-center justify-center"
						>
							<SearchIcon />
						</button>
						<button
							type="button"
							onClick={onToggleTheme}
							aria-label="Alternar tema"
							className="flex h-11 w-11 items-center justify-center"
						>
							<SunIcon />
						</button>
					</div>
				</div>

				<div
					role="tablist"
					aria-label="Categorias"
					className="-mx-5 mt-3 flex gap-2 overflow-x-auto px-5 pb-1 scrollbar-hide"
				>
					{CATEGORIES.map((c) => {
						const on = c === category;
						return (
							<button
								key={c}
								type="button"
								role="tab"
								aria-selected={on}
								onClick={() => setCategory(c)}
								className={`h-11 shrink-0 rounded-full border px-4 text-sm font-medium ${
									on
										? "border-text-primary bg-text-primary text-bg-primary"
										: "border-border-subtle text-text-primary"
								}`}
							>
								{c}
							</button>
						);
					})}
				</div>
			</header>

			<div className="flex-1 overflow-y-auto overscroll-contain px-5 pb-6 pt-3">
				{lead && <Lead article={lead} onOpen={onOpen} />}

				<div className={lead ? "mt-4 border-t border-border-subtle" : ""}>
					{loading && articles.length === 0
						? Array.from({ length: 6 }).map((_, i) => <RowSkeleton key={i} />)
						: rest.map((a) => (
								<StoryRow key={a.id} article={a} onOpen={onOpen} />
							))}
				</div>

				{error && (
					<div className="py-10 text-center">
						<p className="text-sm text-accent-tertiary">
							Não foi possível carregar as notícias.
						</p>
						<button
							type="button"
							onClick={refetch}
							className="mt-3 h-11 rounded-full bg-accent-primary px-6 text-sm font-semibold text-white"
						>
							Tentar de novo
						</button>
					</div>
				)}

				{!loading && !error && articles.length === 0 && (
					<p className="py-12 text-center text-sm text-text-secondary">
						Nenhuma notícia com esses filtros.
					</p>
				)}

				{hasMore && articles.length > 0 && (
					<div ref={sentinel} className="py-6">
						<RowSkeleton />
					</div>
				)}
				{!hasMore && articles.length > 0 && (
					<p className="py-8 text-center text-sm text-text-secondary">
						Você chegou ao fim
					</p>
				)}
			</div>

			<FiltersSheet
				open={sheet}
				filters={filters}
				onChange={setFilters}
				onClose={() => setSheet(false)}
			/>
		</div>
	);
}
