import { Bookmark, CheckCircle2, Clock, Share2, Sparkles } from "lucide-react";
import { useBookmarks } from "../../hooks/useBookmarks";
import { useReadingHistory } from "../../hooks/useReadingHistory";

const categoryColors: Record<string, string> = {
	"AI Frontier": "bg-violet-500/20 text-violet-400 border-violet-500/30",
	"Big Techs": "bg-blue-500/20 text-blue-400 border-blue-500/30",
	"Dev Tools": "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
	Engenharia: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
	"Open Source": "bg-orange-500/20 text-orange-400 border-orange-500/30",
	Segurança: "bg-red-500/20 text-red-400 border-red-500/30",
	Startups: "bg-pink-500/20 text-pink-400 border-pink-500/30",
	Gaming: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
	Tecnologia: "bg-sky-500/20 text-sky-400 border-sky-500/30",
	Mundo: "bg-teal-500/20 text-teal-400 border-teal-500/30",
	Negocios: "bg-amber-500/20 text-amber-400 border-amber-500/30",
	Brasil: "bg-green-500/20 text-green-400 border-green-500/30",
	Ciencia: "bg-purple-500/20 text-purple-400 border-purple-500/30",
	IA: "bg-violet-500/20 text-violet-400 border-violet-500/30",
	default: "bg-bg-tertiary text-text-secondary border-transparent",
};

interface NewsCardProps {
	id: string;
	title: string;
	excerpt?: string;
	url: string;
	source: string;
	category: string;
	company?: string;
	publishedAt: Date | string;
	imageUrl?: string;
	variant?: "compact" | "standard" | "featured";
	fake_news_score?: number | null;
	political_bias?: string | null;
	is_militant?: boolean;
	has_incoherence?: boolean;
	credibility_flags?: string[];
	onBookmark?: (id: string) => void;
	onShare?: (id: string) => void;
	onSummarize?: (id: string) => void;
}

const BIAS_CONFIG: Record<string, { label: string; color: string }> = {
	left: {
		label: "Esq",
		color: "bg-blue-500/20 text-blue-400 border-blue-500/40",
	},
	far_left: {
		label: "Esq+",
		color: "bg-blue-600/30 text-blue-300 border-blue-500/60",
	},
	right: {
		label: "Dir",
		color: "bg-red-500/20 text-red-400 border-red-500/40",
	},
	far_right: {
		label: "Dir+",
		color: "bg-red-600/30 text-red-300 border-red-500/60",
	},
};

function fakeNewsColor(score: number): string {
	if (score <= 3) return "bg-green-500/15 text-green-400 border-green-500/40";
	if (score <= 6)
		return "bg-yellow-500/15 text-yellow-400 border-yellow-500/40";
	return "bg-red-500/15 text-red-400 border-red-500/40";
}

function fakeNewsLabel(score: number): string {
	if (score <= 2) return "✓ Confiável";
	if (score <= 4) return "⚠ Verificar";
	if (score <= 7) return "⚠ Suspeito";
	return "✗ Fake News";
}

function formatDate(date: Date | string): string {
	const now = new Date();
	const d = new Date(date);
	const diff = now.getTime() - d.getTime();
	const hours = Math.floor(diff / 3_600_000);
	if (hours < 1) return `${Math.floor(diff / 60_000)}m atrás`;
	if (hours < 24) return `${hours}h atrás`;
	const days = Math.floor(hours / 24);
	if (days < 7) return `${days}d atrás`;
	return d.toLocaleDateString("pt-BR");
}

export function NewsCard({
	id,
	title,
	excerpt,
	source,
	category,
	company,
	publishedAt,
	imageUrl,
	variant = "standard",
	fake_news_score,
	political_bias,
	is_militant,
	has_incoherence,
	credibility_flags,
	onShare,
	onSummarize,
}: NewsCardProps) {
	const { toggle, isBookmarked } = useBookmarks();
	const { wasRead } = useReadingHistory();
	const bookmarked = isBookmarked(id);
	const read = wasRead(id);
	const catClass =
		categoryColors[category as keyof typeof categoryColors] ??
		categoryColors.default;

	return (
		<article
			className={`
        group relative rounded-2xl overflow-hidden
        bg-bg-secondary border transition-all duration-300 ease-out
        ${read ? "border-border-subtle opacity-80" : "border-border-subtle hover:border-accent-primary/30"}
        hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/20
        ${variant === "featured" ? "col-span-2 row-span-2" : ""}
      `}
		>
			{/* Image */}
			{imageUrl && (
				<div
					className={`relative overflow-hidden ${variant === "compact" ? "h-32" : variant === "featured" ? "h-64" : "h-44"}`}
				>
					<img
						src={imageUrl}
						alt=""
						loading="lazy"
						decoding="async"
						className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
					/>
					<div className="absolute inset-0 bg-gradient-to-t from-bg-secondary/90 via-bg-secondary/20 to-transparent" />
					{/* Category badge over image */}
					<div className="absolute top-3 left-3">
						<span
							className={`px-2 py-0.5 rounded-full text-xs font-mono uppercase tracking-wider border ${catClass} backdrop-blur-sm`}
						>
							{category}
						</span>
					</div>
					{read && (
						<div className="absolute top-3 right-3">
							<CheckCircle2 className="w-4 h-4 text-text-secondary/60" />
						</div>
					)}
				</div>
			)}

			<div className={`p-5 ${variant === "featured" ? "p-6" : ""}`}>
				{/* Category (no image case) */}
				{!imageUrl && (
					<div className="flex flex-wrap items-center gap-1.5 mb-3">
						<span
							className={`px-2 py-0.5 rounded-full text-xs font-mono uppercase tracking-wider border ${catClass}`}
						>
							{category}
						</span>
						{company && (
							<span className="text-xs text-text-secondary">{company}</span>
						)}
						{read && (
							<CheckCircle2 className="w-3 h-3 text-text-secondary/50 ml-auto" />
						)}
					</div>
				)}

				{/* Credibility badges */}
				{(fake_news_score != null ||
					(political_bias &&
						political_bias !== "neutral" &&
						BIAS_CONFIG[political_bias]) ||
					is_militant ||
					has_incoherence) && (
					<div className="flex flex-wrap gap-1 mb-3">
						{fake_news_score != null && (
							<span
								className={`px-1.5 py-0.5 rounded-md text-xs font-semibold border ${fakeNewsColor(fake_news_score)}`}
								title={`Score: ${fake_news_score}/10`}
							>
								{fakeNewsLabel(fake_news_score)}
							</span>
						)}
						{political_bias &&
							political_bias !== "neutral" &&
							BIAS_CONFIG[political_bias] && (
								<span
									className={`px-1.5 py-0.5 rounded-md text-xs font-semibold border ${BIAS_CONFIG[political_bias].color}`}
								>
									{BIAS_CONFIG[political_bias].label}
								</span>
							)}
						{is_militant && (
							<span className="px-1.5 py-0.5 rounded-md text-xs font-semibold border bg-orange-500/15 text-orange-400 border-orange-500/40">
								📢
							</span>
						)}
						{has_incoherence && (
							<span
								className="px-1.5 py-0.5 rounded-md text-xs font-semibold border bg-yellow-500/15 text-yellow-400 border-yellow-500/40"
								title={(credibility_flags ?? []).join(", ")}
							>
								⚡
							</span>
						)}
					</div>
				)}

				<h3
					className={`
          font-display font-bold text-text-primary leading-tight mb-2
          group-hover:text-accent-primary/90 transition-colors duration-200
          ${variant === "featured" ? "text-2xl" : variant === "compact" ? "text-sm" : "text-base"}
          ${read ? "opacity-70" : ""}
        `}
				>
					{title}
				</h3>

				{variant !== "compact" && excerpt && (
					<p className="text-text-secondary text-sm line-clamp-2 mb-4 leading-relaxed">
						{excerpt}
					</p>
				)}

				<div className="flex items-center justify-between mt-auto pt-3 border-t border-border-subtle/60">
					<div className="flex items-center gap-1.5 text-text-secondary text-xs min-w-0">
						<Clock className="w-3 h-3 flex-shrink-0" />
						<span className="font-numbers">{formatDate(publishedAt)}</span>
						<span className="mx-1 opacity-40">·</span>
						<span className="font-mono truncate max-w-[100px]">{source}</span>
					</div>

					<div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-150 flex-shrink-0">
						<button
							onClick={() => onSummarize?.(id)}
							className="p-1.5 rounded-lg hover:bg-accent-primary/15 text-text-secondary hover:text-accent-primary transition-colors"
							title="Abrir artigo"
						>
							<Sparkles className="w-3.5 h-3.5" />
						</button>
						<button
							onClick={() => toggle(id)}
							className={`p-1.5 rounded-lg hover:bg-accent-primary/15 transition-colors ${
								bookmarked
									? "text-accent-primary"
									: "text-text-secondary hover:text-accent-primary"
							}`}
							title={bookmarked ? "Remover dos salvos" : "Salvar"}
						>
							<Bookmark
								className={`w-3.5 h-3.5 ${bookmarked ? "fill-current" : ""}`}
							/>
						</button>
						<button
							onClick={() => onShare?.(id)}
							className="p-1.5 rounded-lg hover:bg-accent-primary/15 text-text-secondary hover:text-accent-primary transition-colors"
							title="Compartilhar"
						>
							<Share2 className="w-3.5 h-3.5" />
						</button>
					</div>
				</div>
			</div>
		</article>
	);
}
