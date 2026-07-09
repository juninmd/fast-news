import {
	AlertTriangle,
	BookOpen,
	Clock,
	ExternalLink,
	Focus,
	X,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useReadingHistory } from "../../hooks/useReadingHistory";

interface Article {
	id: string;
	title: string;
	summary: string;
	content: string;
	url: string;
	source: string;
	category: string;
	company: string | null;
	published_at: string;
	image_url: string | null;
}

interface RelatedArticle {
	id: string;
	title: string;
	source: string;
	url: string;
}

function formatDate(dateStr: string): string {
	return new Date(dateStr).toLocaleString("pt-BR", {
		day: "2-digit",
		month: "2-digit",
		year: "numeric",
		hour: "2-digit",
		minute: "2-digit",
		timeZone: "America/Sao_Paulo",
	});
}

interface ArticleModalProps {
	articleId: string | null;
	onClose: () => void;
}

export function ArticleModal({ articleId, onClose }: ArticleModalProps) {
	const [article, setArticle] = useState<Article | null>(null);
	const [related, setRelated] = useState<RelatedArticle[]>([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState(false);
	const [progress, setProgress] = useState(0);
	const [focusMode, setFocusMode] = useState(false);
	const scrollRef = useRef<HTMLDivElement>(null);
	const { markRead } = useReadingHistory();

	useEffect(() => {
		if (!articleId) {
			setArticle(null);
			setRelated([]);
			setProgress(0);
			return;
		}
		setLoading(true);
		setError(false);
		setArticle(null);
		setRelated([]);
		setProgress(0);

		fetch(`/api/news/${articleId}`)
			.then((r) => {
				if (!r.ok) throw new Error();
				return r.json();
			})
			.then((d) => {
				setArticle(d);
				setLoading(false);
			})
			.catch(() => {
				setError(true);
				setLoading(false);
			});

		fetch(`/api/news/${articleId}/related`)
			.then((r) => r.json())
			.then((d) => setRelated((d.data ?? []).slice(0, 4)))
			.catch(() => {});
	}, [articleId]);

	// Track reading progress
	const handleScroll = useCallback(() => {
		const el = scrollRef.current;
		if (!el) return;
		const pct = el.scrollTop / (el.scrollHeight - el.clientHeight);
		setProgress(Math.min(100, Math.round(pct * 100)));
	}, []);

	// Mark read when 80% scrolled
	useEffect(() => {
		if (progress >= 80 && article) markRead(article.id, article.title);
	}, [progress, article, markRead]);

	useEffect(() => {
		if (!articleId) return;
		const handler = (e: KeyboardEvent) => {
			if (e.key === "Escape") onClose();
		};
		window.addEventListener("keydown", handler);
		return () => window.removeEventListener("keydown", handler);
	}, [articleId, onClose]);

	if (!articleId) return null;

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center p-4">
			<div
				className={`absolute inset-0 backdrop-blur-sm transition-colors duration-300 ${focusMode ? "bg-black/90" : "bg-bg-primary/80"}`}
				onClick={onClose}
			/>

			<div
				className={`relative w-full flex flex-col bg-bg-secondary border border-border-subtle rounded-2xl shadow-2xl overflow-hidden transition-all duration-300 ${focusMode ? "max-w-2xl max-h-[95vh]" : "max-w-2xl max-h-[90vh]"}`}
			>
				{/* Reading progress bar */}
				<div className="absolute top-0 left-0 right-0 h-0.5 bg-bg-tertiary z-10">
					<div
						className="h-full bg-gradient-to-r from-accent-primary to-accent-secondary transition-all duration-150"
						style={{ width: `${progress}%` }}
					/>
				</div>

				{/* Header */}
				<div
					className={`flex items-center justify-between px-5 py-3.5 border-b border-border-subtle flex-shrink-0 ${focusMode ? "bg-bg-secondary/95" : ""}`}
				>
					<div className="flex items-center gap-3">
						<span className="text-xs text-text-secondary font-mono uppercase tracking-wider">
							{loading ? "Carregando..." : (article?.category ?? "")}
						</span>
						{!loading && article && (
							<span className="text-xs text-text-secondary font-numbers">
								{progress > 0 && `${progress}%`}
							</span>
						)}
					</div>
					<div className="flex items-center gap-1">
						<button
							onClick={() => setFocusMode((f) => !f)}
							className={`p-1.5 rounded-lg transition-colors ${focusMode ? "bg-accent-primary/20 text-accent-primary" : "hover:bg-bg-tertiary text-text-secondary"}`}
							title={focusMode ? "Sair do modo foco" : "Modo foco"}
						>
							<Focus className="w-4 h-4" />
						</button>
						<button
							onClick={onClose}
							className="p-1.5 rounded-lg hover:bg-bg-tertiary text-text-secondary transition-colors"
						>
							<X className="w-4 h-4" />
						</button>
					</div>
				</div>

				{/* Body */}
				<div
					ref={scrollRef}
					onScroll={handleScroll}
					className="overflow-y-auto flex-1"
				>
					{loading && (
						<div className="p-6 space-y-4 animate-pulse">
							<div className="h-52 bg-bg-tertiary rounded-xl" />
							<div className="h-7 bg-bg-tertiary rounded w-3/4" />
							<div className="h-4 bg-bg-tertiary rounded" />
							<div className="h-4 bg-bg-tertiary rounded w-5/6" />
							<div className="h-4 bg-bg-tertiary rounded w-4/5" />
						</div>
					)}

					{error && (
						<div className="p-12 text-center text-text-secondary">
							<AlertTriangle className="w-8 h-8 mx-auto mb-2 opacity-50" />
							<p>Artigo não encontrado.</p>
						</div>
					)}

					{article && (
						<>
							{article.image_url && !focusMode && (
								<div className="h-52 overflow-hidden flex-shrink-0">
									<img
										src={article.image_url}
										alt=""
										loading="lazy"
										className="w-full h-full object-cover"
									/>
								</div>
							)}

							<div className={`p-6 ${focusMode ? "py-8" : ""}`}>
								<h2
									className={`font-display font-bold text-text-primary leading-tight mb-4 ${focusMode ? "text-2xl" : "text-xl"}`}
								>
									{article.title}
								</h2>

								{/* Meta */}
								<div className="flex flex-wrap items-center gap-3 mb-4 text-xs text-text-secondary">
									<span className="font-mono font-medium text-text-primary">
										{article.source}
									</span>
									{article.company && article.company !== article.source && (
										<span>· {article.company}</span>
									)}
									<span className="flex items-center gap-1">
										<Clock className="w-3 h-3" />
										{formatDate(article.published_at)}
									</span>
									<span className="flex items-center gap-1 text-text-secondary">
										<BookOpen className="w-3 h-3" />~
										{Math.ceil(
											(article.content || article.summary).split(" ").length /
												200,
										)}{" "}
										min
									</span>
								</div>

								{/* Content */}
								<div
									className={`text-text-secondary leading-relaxed whitespace-pre-line ${focusMode ? "text-base" : "text-sm"}`}
								>
									{article.content || article.summary}
								</div>

								{/* Related */}
								{related.length > 0 && (
									<div className="mt-6 pt-4 border-t border-border-subtle">
										<p className="text-xs text-text-secondary uppercase tracking-wider mb-3">
											Relacionadas
										</p>
										<ul className="space-y-2">
											{related.map((r) => (
												<li key={r.id}>
													<a
														href={r.url}
														target="_blank"
														rel="noopener noreferrer"
														className="text-sm text-text-secondary hover:text-accent-primary transition-colors line-clamp-1"
													>
														{r.title}{" "}
														<span className="text-xs opacity-60">
															— {r.source}
														</span>
													</a>
												</li>
											))}
										</ul>
									</div>
								)}
							</div>
						</>
					)}
				</div>

				{/* Footer */}
				{article && (
					<div className="p-4 border-t border-border-subtle flex-shrink-0">
						<a
							href={article.url}
							target="_blank"
							rel="noopener noreferrer"
							className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-accent-primary/10 hover:bg-accent-primary/20 text-accent-primary font-medium text-sm transition-colors"
						>
							<ExternalLink className="w-4 h-4" />
							Ler reportagem completa
						</a>
					</div>
				)}
			</div>
		</div>
	);
}
