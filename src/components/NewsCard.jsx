import {
	Check,
	Copy,
	ExternalLink,
	Loader,
	Newspaper,
	Send,
	Sparkles,
	ThumbsDown,
	ThumbsUp,
} from "lucide-react";
import React, { useCallback, useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import {
	classifyWithBackendAI,
	summarizeWithBackendAI,
} from "../services/aiService";
import { summarizeWithGemini } from "../services/geminiService";
import { sendArticleToTelegram } from "../services/telegramService";
import BookmarkButton from "./BookmarkButton";

const STORAGE_KEY = "newsai_reactions";

function getReactions() {
	try {
		const stored = localStorage.getItem(STORAGE_KEY);
		return stored ? JSON.parse(stored) : {};
	} catch {
		return {};
	}
}

function saveReactions(reactions) {
	localStorage.setItem(STORAGE_KEY, JSON.stringify(reactions));
}

function extractVideoUrl(text) {
	if (!text) return null;
	const youtubeRegex =
		/(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
	const match = text.match(youtubeRegex);
	if (match) {
		return {
			type: "youtube",
			id: match[1],
			embedUrl: `https://www.youtube.com/embed/${match[1]}`,
		};
	}
	const vimeoRegex = /(?:https?:\/\/)?(?:www\.)?vimeo\.com\/(\d+)/;
	const vimeoMatch = text.match(vimeoRegex);
	if (vimeoMatch) {
		return {
			type: "vimeo",
			id: vimeoMatch[1],
			embedUrl: `https://player.vimeo.com/video/${vimeoMatch[1]}`,
		};
	}
	return null;
}

const NewsCard = ({ item, aiProvider, apiKey, aiModel, autoSummarize }) => {
	const [summary, setSummary] = useState(null);
	const [loading, setLoading] = useState(false);
	const [sendingTelegram, setSendingTelegram] = useState(false);
	const [telegramStatus, setTelegramStatus] = useState(null);
	const [error, setError] = useState(null);
	const [imageError, setImageError] = useState(false);
	const [copied, setCopied] = useState(false);
	const autoSummarizeAttempted = useRef(false);

	const [reaction, setReaction] = useState(() => {
		const reactions = getReactions();
		return reactions[item.id] || null;
	});

	const handleReaction = (type) => {
		const reactions = getReactions();
		if (reactions[item.id] === type) {
			delete reactions[item.id];
			setReaction(null);
		} else {
			reactions[item.id] = type;
			setReaction(type);
		}
		saveReactions(reactions);
	};

	const handleSummarize = useCallback(async () => {
		if (aiProvider === "gemini" && !apiKey) {
			setError("Configure API Key do Gemini.");
			return;
		}
		setLoading(true);
		setError(null);
		try {
			const textToSummarize = item.content || item.description || item.title;
			let result;

			if (aiProvider === "gemini") {
				result = await summarizeWithGemini(textToSummarize, apiKey);
			} else {
				result = await summarizeWithBackendAI(textToSummarize, aiModel);
			}

			setSummary(result);
		} catch (err) {
			console.error(err);
			setError("Falha ao gerar resumo.");
		} finally {
			setLoading(false);
		}
	}, [aiProvider, apiKey, aiModel, item]);

	useEffect(() => {
		if (
			autoSummarize &&
			!summary &&
			!loading &&
			!error &&
			!autoSummarizeAttempted.current
		) {
			autoSummarizeAttempted.current = true;
			handleSummarize();
		}
	}, [autoSummarize, summary, loading, error, handleSummarize]);

	const handleSendToTelegram = useCallback(async () => {
		setSendingTelegram(true);
		try {
			await sendArticleToTelegram(item.id);
			setTelegramStatus("success");
		} catch (e) {
			console.error(e);
			setTelegramStatus("error");
		} finally {
			setSendingTelegram(false);
			setTimeout(() => setTelegramStatus(null), 3000);
		}
	}, [item]);

	const copyToClipboard = () => {
		navigator.clipboard.writeText(item.link);
		setCopied(true);
		setTimeout(() => setCopied(false), 2000);
	};

	const getImage = () => {
		if (item.enclosure && item.enclosure.link) return item.enclosure.link;
		if (item.thumbnail) return item.thumbnail;
		const imgMatch = item.description?.match(/<img[^>]+src="([^">]+)"/);
		if (imgMatch) return imgMatch[1];
		return null;
	};

	const video = extractVideoUrl(item.content || item.description || "");
	const imageUrl = !video ? getImage() : null;
	const cleanDescription =
		item.description?.replace(/<[^>]+>/g, "").substring(0, 150) + "...";

	const formatDate = (dateString) => {
		try {
			const date = new Date(dateString);
			if (isNaN(date)) return "";
			return date.toLocaleDateString("pt-BR", {
				day: "2-digit",
				month: "2-digit",
				hour: "2-digit",
				minute: "2-digit",
			});
		} catch {
			return "";
		}
	};

	const relatedArticles = (() => {
		if (!item.title) return [];
		const words = item.title
			.toLowerCase()
			.split(/\s+/)
			.filter((w) => w.length > 4);
		return words.slice(0, 3);
	})();

	return (
		<div className="bg-white dark:bg-slate-900 rounded-[2rem] shadow-sm hover:shadow-[0_20px_50px_rgba(0,0,0,0.1)] dark:hover:shadow-[0_20px_50px_rgba(0,0,0,0.4)] hover:-translate-y-2 transition-all duration-500 h-full flex flex-col overflow-hidden group border border-slate-200/50 dark:border-slate-800/80">
			<div className="p-3">
				<div className="flex items-center justify-between mb-3 px-2 pt-1">
					<div className="flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
						<span className="text-blue-600 dark:text-blue-400 font-bold">
							{item.source}
						</span>
						<span className="text-slate-300 dark:text-slate-600">—</span>
						<span>{formatDate(item.pubDate)}</span>
					</div>
					<BookmarkButton
						item={item}
						className="!p-1 !bg-transparent !text-slate-400 hover:!text-blue-500"
					/>
				</div>

				<div className="relative overflow-hidden rounded-[1.5rem]">
					{video ? (
						<div className="aspect-video w-full overflow-hidden relative bg-black">
							<iframe
								src={video.embedUrl}
								title={item.title}
								className="w-full h-full"
								allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
								allowFullScreen
								loading="lazy"
							/>
						</div>
					) : imageUrl && !imageError ? (
						<div className="aspect-[16/10] w-full overflow-hidden relative">
							<img
								src={imageUrl}
								alt={item.title}
								loading="lazy"
								onError={() => setImageError(true)}
								className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
							/>
							<div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-900/30 to-slate-900/10 opacity-80 transition-opacity duration-300" />
						</div>
					) : (
						<div className="aspect-[16/10] bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-indigo-900/20 dark:to-blue-900/20 flex items-center justify-center relative">
							<Newspaper className="text-indigo-400 dark:text-indigo-500 w-16 h-16 opacity-50" />
						</div>
					)}

					{item.category && (
						<div className="absolute top-3 left-3 bg-white/80 dark:bg-slate-900/80 backdrop-blur-lg text-slate-800 dark:text-slate-200 text-[10px] font-extrabold px-3 py-1.5 rounded-full shadow-sm uppercase tracking-wider z-10">
							{item.category}
						</div>
					)}
				</div>
			</div>

			<div className="px-6 py-4 flex flex-col flex-grow relative">
				<h3 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white mb-4 leading-[1.3] group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
					<a
						href={item.link}
						target="_blank"
						rel="noopener noreferrer"
						className="focus:outline-none before:absolute before:inset-0"
					>
						{item.title}
					</a>
				</h3>

				<div className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed mb-4 flex-grow">
					{summary ? (
						<div className="bg-gradient-to-br from-indigo-50/50 to-blue-50/50 dark:from-indigo-900/20 dark:to-blue-900/10 p-4 rounded-2xl border border-indigo-100/50 dark:border-indigo-500/20 animate-in fade-in slide-in-from-bottom-2">
							<div className="flex items-center gap-1.5 mb-3 text-indigo-600 dark:text-indigo-400 font-bold text-[11px] uppercase tracking-wider">
								<Sparkles size={14} className="fill-current" /> Análise com IA
							</div>
							<div className="prose prose-sm dark:prose-invert max-w-none text-slate-700 dark:text-slate-300">
								<ReactMarkdown>{summary}</ReactMarkdown>
							</div>
						</div>
					) : (
						<p className="line-clamp-3">{cleanDescription}</p>
					)}
					{error && (
						<p className="text-red-500 text-[11px] mt-2 font-medium bg-red-50 dark:bg-red-900/20 px-3 py-1.5 rounded-lg inline-block">
							{error}
						</p>
					)}
				</div>

				{relatedArticles.length > 0 && (
					<div className="mb-4 flex flex-wrap gap-1.5">
						{relatedArticles.map((kw, i) => (
							<span
								key={i}
								className="text-[10px] bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-2.5 py-1 rounded-full font-medium"
							>
								#{kw}
							</span>
						))}
					</div>
				)}
			</div>

			<div className="px-5 pb-5 mt-auto bg-slate-50/50 dark:bg-slate-900/50">
				<div className="flex items-center justify-between py-2.5 border-b border-slate-200/50 dark:border-slate-700/50">
					<div className="flex items-center gap-1">
						<button
							onClick={() => handleReaction("like")}
							className={`p-2 rounded-lg transition-all hover:scale-110 active:scale-90 ${
								reaction === "like"
									? "text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/30"
									: "text-slate-400 dark:text-slate-500 hover:text-green-500 hover:bg-green-50 dark:hover:bg-green-900/20"
							}`}
							title="Curtir"
						>
							<ThumbsUp size={16} />
						</button>
						<button
							onClick={() => handleReaction("dislike")}
							className={`p-2 rounded-lg transition-all hover:scale-110 active:scale-90 ${
								reaction === "dislike"
									? "text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30"
									: "text-slate-400 dark:text-slate-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
							}`}
							title="Não curtir"
						>
							<ThumbsDown size={16} />
						</button>
					</div>

					<div className="flex items-center gap-1">
						<button
							onClick={handleSendToTelegram}
							disabled={sendingTelegram}
							className="p-2 rounded-lg text-slate-400 dark:text-slate-500 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all disabled:opacity-50"
							title="Enviar para Telegram"
						>
							{sendingTelegram ? (
								<Loader size={16} className="animate-spin" />
							) : telegramStatus === "success" ? (
								<Check size={16} />
							) : (
								<Send size={16} />
							)}
						</button>
						<button
							onClick={handleSummarize}
							disabled={loading || summary}
							className="p-2 rounded-lg text-slate-400 dark:text-slate-500 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-all disabled:opacity-50"
							title="Resumir com IA"
						>
							{loading ? (
								<Loader size={16} className="animate-spin" />
							) : (
								<Sparkles size={16} />
							)}
						</button>
					</div>
				</div>

				<div className="flex gap-2 mt-3">
					<a
						href={item.link}
						target="_blank"
						rel="noopener noreferrer"
						className="flex items-center justify-center gap-2 flex-1 bg-slate-100 hover:bg-blue-600 dark:bg-slate-800 dark:hover:bg-blue-600 text-slate-700 hover:text-white dark:text-slate-300 dark:hover:text-white py-3 rounded-2xl text-sm font-bold transition-all duration-300"
					>
						Ler reportagem
						<ExternalLink size={16} />
					</a>
					<button
						onClick={copyToClipboard}
						className="flex items-center justify-center gap-2 px-5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 py-3 rounded-2xl text-sm font-bold transition-all duration-300"
					>
						{copied ? <Check size={16} /> : <Copy size={16} />}
						Fast News
					</button>
				</div>
			</div>
		</div>
	);
};

export default NewsCard;
