import {
	Bookmark,
	CheckCircle2,
	Copy,
	ExternalLink,
	Send,
	Sparkles,
	ThumbsDown,
	ThumbsUp,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useBookmarks } from "../../hooks/useBookmarks";
import { useReadingHistory } from "../../hooks/useReadingHistory";
import { sendArticleToTelegram } from "../../services/telegramService";

// Editorial, restrained palette: accent tokens for AI/tech signal, muted
// neutrals for everything else — avoids the "rainbow SaaS badge" look.
const categoryColors: Record<string, string> = {
	"AI Frontier":
		"bg-accent-primary/15 text-accent-primary border-accent-primary/30",
	IA: "bg-accent-primary/15 text-accent-primary border-accent-primary/30",
	"Big Techs":
		"bg-accent-secondary/15 text-accent-secondary border-accent-secondary/30",
	"Dev Tools":
		"bg-accent-secondary/15 text-accent-secondary border-accent-secondary/30",
	Engenharia:
		"bg-accent-secondary/15 text-accent-secondary border-accent-secondary/30",
	"Open Source":
		"bg-accent-tertiary/15 text-accent-tertiary border-accent-tertiary/30",
	Segurança:
		"bg-accent-primary/15 text-accent-primary border-accent-primary/30",
	Startups:
		"bg-accent-tertiary/15 text-accent-tertiary border-accent-tertiary/30",
	Gaming:
		"bg-accent-tertiary/15 text-accent-tertiary border-accent-tertiary/30",
	Tecnologia:
		"bg-accent-secondary/15 text-accent-secondary border-accent-secondary/30",
	Mundo: "bg-bg-tertiary text-text-secondary border-border-subtle",
	Negocios:
		"bg-accent-tertiary/15 text-accent-tertiary border-accent-tertiary/30",
	Brasil: "bg-bg-tertiary text-text-secondary border-border-subtle",
	Ciencia:
		"bg-accent-secondary/15 text-accent-secondary border-accent-secondary/30",
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
	onBookmark?: (id: string) => void;
	onShare?: (id: string) => void;
	onSummarize?: (id: string) => void;
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

function formatFullDate(date: Date | string): string {
	try {
		const d = new Date(date);
		if (isNaN(d.getTime())) return "";
		return d.toLocaleDateString("pt-BR", {
			day: "2-digit",
			month: "2-digit",
			hour: "2-digit",
			minute: "2-digit",
		});
	} catch {
		return "";
	}
}

function extractVideoUrl(text?: string): string | null {
	if (!text) return null;
	const match = text.match(
		/(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/,
	);
	return match ? `https://www.youtube.com/embed/${match[1]}` : null;
}

const REACTIONS_KEY = "newsai_reactions";

function getReactions(): Record<string, "like" | "dislike"> {
	try {
		return JSON.parse(localStorage.getItem(REACTIONS_KEY) || "{}");
	} catch {
		return {};
	}
}

export function NewsCard({
	id,
	title,
	excerpt,
	url,
	source,
	category,
	company,
	publishedAt,
	imageUrl,
	variant = "standard",
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

	const [reaction, setReaction] = useState<"like" | "dislike" | null>(() => {
		return getReactions()[id] || null;
	});
	const [sendingTelegram, setSendingTelegram] = useState(false);
	const [telegramStatus, setTelegramStatus] = useState<
		"success" | "error" | null
	>(null);
	const [copied, setCopied] = useState(false);
	const [imageError, setImageError] = useState(false);

	useEffect(() => {
		if (telegramStatus) {
			const t = setTimeout(() => setTelegramStatus(null), 3000);
			return () => clearTimeout(t);
		}
	}, [telegramStatus]);

	function handleReaction(type: "like" | "dislike") {
		const reactions = getReactions();
		if (reactions[id] === type) {
			delete reactions[id];
			setReaction(null);
		} else {
			reactions[id] = type;
			setReaction(type);
		}
		localStorage.setItem(REACTIONS_KEY, JSON.stringify(reactions));
	}

	const videoEmbedUrl = extractVideoUrl(excerpt);
	const relatedKeywords = title
		.toLowerCase()
		.split(/\s+/)
		.filter((w) => w.length > 4)
		.slice(0, 3);

	async function handleSendToTelegram() {
		setSendingTelegram(true);
		try {
			await sendArticleToTelegram(id);
			setTelegramStatus("success");
		} catch {
			setTelegramStatus("error");
		} finally {
			setSendingTelegram(false);
		}
	}

	function handleCopyLink() {
		navigator.clipboard.writeText(url);
		setCopied(true);
		setTimeout(() => setCopied(false), 2000);
	}

	const showImage = imageUrl && !imageError && !videoEmbedUrl;

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
			{variant !== "compact" && (
				<div className="px-5 pt-4 pb-1 flex items-center gap-2 text-xs text-text-secondary">
					<span className="font-semibold text-text-primary truncate max-w-[140px]">
						{source}
					</span>
					<span className="opacity-40">—</span>
					<span className="font-numbers whitespace-nowrap">
						{formatFullDate(publishedAt)}
					</span>
				</div>
			)}

			{videoEmbedUrl ? (
				<div className="aspect-video w-full overflow-hidden bg-black">
					<iframe
						src={videoEmbedUrl}
						title={title}
						className="w-full h-full"
						allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
						allowFullScreen
						loading="lazy"
					/>
				</div>
			) : showImage ? (
				<div
					className={`relative overflow-hidden ${variant === "compact" ? "h-32" : variant === "featured" ? "h-64" : "h-44"}`}
				>
					<img
						src={imageUrl}
						alt=""
						loading="lazy"
						decoding="async"
						onError={() => setImageError(true)}
						className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
					/>
					<div className="absolute inset-0 bg-gradient-to-t from-bg-secondary/90 via-bg-secondary/20 to-transparent" />
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
			) : (
				variant !== "compact" && (
					<div className="px-5 pt-1">
						<span
							className={`inline-block px-2 py-0.5 rounded-full text-xs font-mono uppercase tracking-wider border ${catClass}`}
						>
							{category}
						</span>
					</div>
				)
			)}

			<div className={`p-5 ${variant === "featured" ? "p-6" : ""}`}>
				{variant === "compact" && (
					<div className="flex flex-wrap items-center gap-1.5 mb-2">
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
					<p className="text-text-secondary text-sm line-clamp-3 mb-3 leading-relaxed">
						{excerpt}
					</p>
				)}

				{relatedKeywords.length > 0 && variant !== "compact" && (
					<div className="flex flex-wrap gap-1.5 mb-4">
						{relatedKeywords.map((kw, i) => (
							<span
								key={i}
								className="text-[10px] font-medium bg-accent-primary/10 text-accent-primary px-2 py-0.5 rounded-full"
							>
								#{kw}
							</span>
						))}
					</div>
				)}

				<div className="flex items-center gap-1 pt-3 border-t border-border-subtle/60 mb-2">
					<button
						onClick={() => handleReaction("like")}
						className={`p-1.5 rounded-lg transition-all hover:scale-110 active:scale-90 ${
							reaction === "like"
								? "bg-green-500/15 text-green-400"
								: "text-text-secondary hover:text-green-400 hover:bg-green-500/10"
						}`}
						title="Curtir"
					>
						<ThumbsUp className="w-3.5 h-3.5" />
					</button>
					<button
						onClick={() => handleReaction("dislike")}
						className={`p-1.5 rounded-lg transition-all hover:scale-110 active:scale-90 ${
							reaction === "dislike"
								? "bg-red-500/15 text-red-400"
								: "text-text-secondary hover:text-red-400 hover:bg-red-500/10"
						}`}
						title="Não curtir"
					>
						<ThumbsDown className="w-3.5 h-3.5" />
					</button>
					<div className="flex-1" />
					<button
						onClick={handleSendToTelegram}
						disabled={sendingTelegram}
						className="p-1.5 rounded-lg text-text-secondary hover:text-blue-400 hover:bg-blue-500/10 transition-all disabled:opacity-50"
						title="Enviar para Telegram"
					>
						<Send
							className={`w-3.5 h-3.5 ${sendingTelegram ? "animate-pulse" : ""}`}
						/>
					</button>
					{telegramStatus === "success" && (
						<span className="text-[10px] text-green-400 font-medium animate-fade-in">
							Enviado!
						</span>
					)}
					{telegramStatus === "error" && (
						<span className="text-[10px] text-red-400 font-medium animate-fade-in">
							Falha
						</span>
					)}
				</div>

				<div className="flex items-center justify-between mt-auto pt-3 border-t border-border-subtle/60">
					<div className="flex items-center gap-1.5 text-text-secondary text-xs min-w-0">
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
							onClick={handleCopyLink}
							className="p-1.5 rounded-lg hover:bg-accent-primary/15 text-text-secondary hover:text-accent-primary transition-colors"
							title="Copiar link"
						>
							{copied ? (
								<CheckCircle2 className="w-3.5 h-3.5 text-green-400" />
							) : (
								<Copy className="w-3.5 h-3.5" />
							)}
						</button>
						<a
							href={url}
							target="_blank"
							rel="noopener noreferrer"
							className="p-1.5 rounded-lg hover:bg-accent-primary/15 text-text-secondary hover:text-accent-primary transition-colors"
							title="Ler reportagem"
						>
							<ExternalLink className="w-3.5 h-3.5" />
						</a>
					</div>
				</div>
			</div>
		</article>
	);
}
