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
import type { CoverageLink } from "../../hooks/useNews";
import { useReadingHistory } from "../../hooks/useReadingHistory";
import { sendArticleToTelegram } from "../../services/telegramService";
import { CoverImage } from "./CoverImage";
import { SourceStack } from "./SourceStack";

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
	/** Video of the article (YouTube/Vimeo/file); the cover gets a play badge. */
	videoUrl?: string;
	sourceCount?: number;
	alsoIn?: CoverageLink[];
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
	videoUrl,
	sourceCount = 1,
	alsoIn = [],
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
		try {
			localStorage.setItem(REACTIONS_KEY, JSON.stringify(reactions));
		} catch {
			// storage blocked or full: the reaction still shows for this session
		}
	}

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
		navigator.clipboard
			.writeText(url)
			.then(() => {
				setCopied(true);
				setTimeout(() => setCopied(false), 2000);
			})
			.catch(() => {
				// clipboard refused (insecure context or denied permission)
			});
	}

	const featured = variant === "featured";
	const wide = variant === "compact";
	const [pop, setPop] = useState<string | null>(null);
	const flash = (key: string) => {
		setPop(key);
		setTimeout(() => setPop(null), 450);
	};

	return (
		<article
			data-card={id}
			data-read={read}
			className={`pulso-card group ${featured ? "pulso-card--featured" : ""} ${wide ? "pulso-card--wide" : ""}`}
		>
			<button
				type="button"
				tabIndex={-1}
				aria-hidden
				onClick={() => onSummarize?.(id)}
				className="pulso-card-cover block w-full text-left"
			>
				<CoverImage
					src={imageUrl}
					source={source}
					category={category}
					video={!!videoUrl}
					eager={featured}
					className={`w-full !border-0 ${featured ? "aspect-[16/10]" : "aspect-[16/9]"}`}
				/>
			</button>

			<div className="flex flex-1 flex-col gap-2 px-4 pt-3 pb-3">
				<div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-wide text-text-secondary">
					<span className="truncate text-accent-primary">{category}</span>
					<span className="text-faint">·</span>
					<span className="truncate">{source}</span>
					<span className="text-faint">·</span>
					<span className="shrink-0 tabular-nums">
						{formatDate(publishedAt)}
					</span>
					{read && (
						<CheckCircle2
							className="h-3 w-3 shrink-0 text-text-secondary/60"
							aria-label="Lida"
						/>
					)}
				</div>

				<h3
					className={`font-display leading-[1.12] tracking-tight text-text-primary ${
						featured ? "text-[28px] font-extrabold" : "text-lg font-semibold"
					}`}
				>
					<button
						type="button"
						onClick={() => onSummarize?.(id)}
						className="text-left transition-colors hover:text-accent-primary"
					>
						{title}
					</button>
				</h3>

				{excerpt && (featured || wide) && (
					<p className="line-clamp-3 text-sm leading-relaxed text-text-secondary">
						{excerpt}
					</p>
				)}

				<SourceStack
					source={source}
					sourceCount={sourceCount}
					others={alsoIn}
				/>

				<div className="pulso-card-actions">
					<button
						type="button"
						onClick={() => {
							handleReaction("like");
							flash("like");
						}}
						className={`${reaction === "like" ? "!text-accent-secondary" : ""} ${pop === "like" ? "pulso-pop" : ""}`}
						title="Curtir"
						aria-pressed={reaction === "like"}
					>
						<ThumbsUp className="h-3.5 w-3.5" />
					</button>
					<button
						type="button"
						onClick={() => {
							handleReaction("dislike");
							flash("dislike");
						}}
						className={`${reaction === "dislike" ? "!text-accent-tertiary" : ""} ${pop === "dislike" ? "pulso-pop" : ""}`}
						title="Não curtir"
						aria-pressed={reaction === "dislike"}
					>
						<ThumbsDown className="h-3.5 w-3.5" />
					</button>
					<button
						type="button"
						onClick={handleSendToTelegram}
						disabled={sendingTelegram}
						className="disabled:opacity-50"
						title="Enviar para Telegram"
					>
						<Send
							className={`h-3.5 w-3.5 ${sendingTelegram ? "animate-pulse" : ""}`}
						/>
					</button>
					{telegramStatus === "success" && (
						<span className="text-[11px] font-semibold text-accent-secondary">
							Enviado
						</span>
					)}
					{telegramStatus === "error" && (
						<span className="text-[11px] font-semibold text-accent-tertiary">
							Falha
						</span>
					)}

					<span className="flex-1" />

					<button
						type="button"
						onClick={() => onSummarize?.(id)}
						title="Abrir artigo"
					>
						<Sparkles className="h-3.5 w-3.5" />
					</button>
					<button
						type="button"
						data-save
						onClick={() => {
							toggle(id);
							flash("save");
						}}
						className={`${bookmarked ? "!text-accent-primary" : ""} ${pop === "save" ? "pulso-pop" : ""}`}
						title={bookmarked ? "Remover dos salvos" : "Salvar"}
					>
						<Bookmark
							className={`h-3.5 w-3.5 ${bookmarked ? "fill-current" : ""}`}
						/>
					</button>
					<button type="button" onClick={handleCopyLink} title="Copiar link">
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
						title="Ler reportagem"
					>
						<ExternalLink className="h-3.5 w-3.5" />
					</a>
				</div>
			</div>
		</article>
	);
}
