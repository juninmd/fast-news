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

function formatDate(date: Date | string): string {
	const now = new Date();
	const d = new Date(date);
	const diff = now.getTime() - d.getTime();
	if (diff < 0) return d.toLocaleDateString("pt-BR");
	const hours = Math.floor(diff / 3_600_000);
	if (hours < 1) return `${Math.max(1, Math.floor(diff / 60_000))}min`;
	if (hours < 24) return `${hours}h`;
	const days = Math.floor(hours / 24);
	if (days < 7) return `${days}d`;
	return d.toLocaleDateString("pt-BR");
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
	const featured = variant === "featured";

	return (
		<article
			className={`group border-b border-border-subtle py-5 first:pt-0 last:border-b-0 ${read ? "opacity-60" : ""}`}
		>
			<div className="flex items-start gap-5">
				<div className="min-w-0 flex-1">
					<div className="mb-1.5 flex items-center gap-2 font-mono text-[11px] uppercase tracking-wide text-text-secondary">
						<span>{category}</span>
						<span className="text-faint">·</span>
						<span className="truncate">{source}</span>
						<span className="text-faint">·</span>
						<span className="tabular-nums">{formatDate(publishedAt)}</span>
						{read && (
							<CheckCircle2 className="h-3 w-3 text-text-secondary/50" />
						)}
					</div>

					<h3
						className={`font-display font-medium leading-snug text-text-primary transition-colors group-hover:text-accent-primary ${
							featured ? "text-2xl" : "text-lg"
						}`}
					>
						{title}
					</h3>

					{excerpt && (
						<p className="mt-2 line-clamp-2 max-w-2xl text-sm leading-relaxed text-text-secondary">
							{excerpt}
						</p>
					)}

					<div className="mt-3 flex items-center gap-1">
						<button
							onClick={() => handleReaction("like")}
							className={`p-1.5 transition-colors ${
								reaction === "like"
									? "text-accent-secondary"
									: "text-text-secondary hover:text-accent-secondary"
							}`}
							title="Curtir"
						>
							<ThumbsUp className="h-3.5 w-3.5" />
						</button>
						<button
							onClick={() => handleReaction("dislike")}
							className={`p-1.5 transition-colors ${
								reaction === "dislike"
									? "text-accent-tertiary"
									: "text-text-secondary hover:text-accent-tertiary"
							}`}
							title="Não curtir"
						>
							<ThumbsDown className="h-3.5 w-3.5" />
						</button>
						<button
							onClick={handleSendToTelegram}
							disabled={sendingTelegram}
							className="p-1.5 text-text-secondary transition-colors hover:text-accent-primary disabled:opacity-50"
							title="Enviar para Telegram"
						>
							<Send
								className={`h-3.5 w-3.5 ${sendingTelegram ? "animate-pulse" : ""}`}
							/>
						</button>
						{telegramStatus === "success" && (
							<span className="text-[11px] font-medium text-accent-secondary">
								Enviado
							</span>
						)}
						{telegramStatus === "error" && (
							<span className="text-[11px] font-medium text-accent-tertiary">
								Falha
							</span>
						)}

						<div className="flex-1" />

						<button
							onClick={() => onSummarize?.(id)}
							className="p-1.5 text-text-secondary transition-colors hover:text-accent-primary"
							title="Abrir artigo"
						>
							<Sparkles className="h-3.5 w-3.5" />
						</button>
						<button
							onClick={() => toggle(id)}
							className={`p-1.5 transition-colors ${
								bookmarked
									? "text-accent-primary"
									: "text-text-secondary hover:text-accent-primary"
							}`}
							title={bookmarked ? "Remover dos salvos" : "Salvar"}
						>
							<Bookmark
								className={`h-3.5 w-3.5 ${bookmarked ? "fill-current" : ""}`}
							/>
						</button>
						<button
							onClick={handleCopyLink}
							className="p-1.5 text-text-secondary transition-colors hover:text-accent-primary"
							title="Copiar link"
						>
							{copied ? (
								<CheckCircle2 className="h-3.5 w-3.5 text-accent-secondary" />
							) : (
								<Copy className="h-3.5 w-3.5" />
							)}
						</button>
						<a
							href={url}
							target="_blank"
							rel="noopener noreferrer"
							onClick={() => onShare?.(id)}
							className="p-1.5 text-text-secondary transition-colors hover:text-accent-primary"
							title="Ler reportagem"
						>
							<ExternalLink className="h-3.5 w-3.5" />
						</a>
					</div>
				</div>

				{videoEmbedUrl ? (
					<div
						className={`hidden shrink-0 overflow-hidden border border-border-subtle bg-black sm:block ${
							featured ? "h-32 w-56" : "h-20 w-32"
						}`}
					>
						<iframe
							src={videoEmbedUrl}
							title={title}
							className="h-full w-full"
							allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
							allowFullScreen
							loading="lazy"
						/>
					</div>
				) : (
					showImage && (
						<div
							className={`hidden shrink-0 overflow-hidden border border-border-subtle bg-bg-tertiary sm:block ${
								featured ? "h-32 w-56" : "h-20 w-32"
							}`}
						>
							<img
								src={imageUrl}
								alt=""
								loading="lazy"
								decoding="async"
								onError={() => setImageError(true)}
								className="h-full w-full object-cover"
							/>
						</div>
					)
				)}
			</div>
		</article>
	);
}
