import {
	ChevronDown,
	ChevronUp,
	ExternalLink,
	FileText,
	Flame,
	MessageSquare,
	TrendingUp,
} from "lucide-react";
import { useEffect, useState } from "react";
import { type TrendTerm, useTrends } from "../../hooks/useTrends";
import {
	FALLBACK_TWITTER_TOPICS,
	fetchTwitterTrends,
	type TwitterTrendsReport,
	type TwitterTrendTopic,
} from "../../services/twitterTrendsClient";
import { AnimatedNumber } from "./AnimatedNumber";

const WINDOWS = [
	{ hours: 6, label: "6h" },
	{ hours: 24, label: "24h" },
	{ hours: 48, label: "48h" },
] as const;

function Sparkline({ values }: { values: number[] }) {
	const max = Math.max(1, ...values);
	const w = 64;
	const h = 18;
	const step = w / Math.max(1, values.length - 1);
	const points = values
		.map(
			(v, i) =>
				`${(i * step).toFixed(1)},${(h - 1 - (v / max) * (h - 3)).toFixed(1)}`,
		)
		.join(" ");
	return (
		<svg
			width={w}
			height={h}
			viewBox={`0 0 ${w} ${h}`}
			aria-hidden="true"
			className="shrink-0 text-accent-primary"
		>
			<polyline
				points={points}
				fill="none"
				stroke="currentColor"
				strokeWidth="1.5"
				strokeLinejoin="round"
				strokeLinecap="round"
			/>
		</svg>
	);
}

function Growth({ term }: { term: TrendTerm }) {
	if (term.previous === 0) {
		return (
			<span className="font-mono text-[10px] font-semibold uppercase tracking-wide text-accent-tertiary">
				novo
			</span>
		);
	}
	return (
		<span className="font-mono text-[11px] tabular-nums text-accent-secondary">
			↑ {term.growth.toFixed(term.growth >= 10 ? 0 : 1)}×
		</span>
	);
}

function label(term: string): string {
	return term.replace(
		/(^|\s)(\p{L})/gu,
		(_, sp: string, ch: string) => sp + ch.toUpperCase(),
	);
}

function XIcon({ className = "h-3.5 w-3.5" }: { className?: string }) {
	return (
		<svg
			viewBox="0 0 24 24"
			aria-hidden="true"
			className={`fill-current ${className}`}
		>
			<path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
		</svg>
	);
}

export function TrendingPanel({
	onSelectTerm,
	onSelectArticle,
}: {
	onSelectTerm: (term: string) => void;
	onSelectArticle?: (articleId: string) => void;
}) {
	const [activeTab, setActiveTab] = useState<"portais" | "twitter">("portais");
	const [hours, setHours] = useState<number>(24);
	const { report, loading } = useTrends(hours);

	// Twitter / X State
	const [twitterReport, setTwitterReport] =
		useState<TwitterTrendsReport | null>(null);
	const [twitterLoading, setTwitterLoading] = useState(false);
	const [expandedTopic, setExpandedTopic] = useState<number | null>(0); // First open by default

	useEffect(() => {
		if (activeTab === "twitter" && !twitterReport && !twitterLoading) {
			setTwitterLoading(true);
			fetchTwitterTrends()
				.then((data) => {
					setTwitterReport(data);
				})
				.catch(() => {
					setTwitterReport({
						location: "Brasil",
						asOf: new Date().toISOString(),
						topics: FALLBACK_TWITTER_TOPICS,
						source: "X (Twitter) Trending Topics Brasil",
					});
				})
				.finally(() => {
					setTwitterLoading(false);
				});
		}
	}, [activeTab, twitterReport, twitterLoading]);

	const terms = report?.terms.slice(0, 10) ?? [];
	const themes = report?.themes.slice(0, 6) ?? [];
	const topScore = Math.max(1, ...terms.map((t) => t.score));

	const twitterTopics: TwitterTrendTopic[] =
		twitterReport?.topics ?? FALLBACK_TWITTER_TOPICS;

	const handleOpenArticle = () => {
		if (onSelectArticle) {
			onSelectArticle("twitter-trends-today");
		} else {
			window.location.href = "#twitter-trends-today";
		}
	};

	return (
		<section
			aria-labelledby="trending-title"
			className="flex h-full flex-col border border-border-subtle bg-bg-primary"
		>
			{/* Top Header with Tab Switcher */}
			<div className="flex flex-wrap items-center justify-between gap-2 border-b border-border-subtle bg-bg-secondary px-4 py-2">
				<div className="flex items-center gap-2">
					<h2
						id="trending-title"
						className="flex items-center gap-1.5 font-mono text-xs font-semibold uppercase tracking-widest text-text-primary"
					>
						<Flame className="h-3.5 w-3.5 text-accent-tertiary" />
						Temas em alta
					</h2>

					{/* Source Mode Tabs */}
					<div
						className="ml-2 inline-flex rounded border border-border-subtle bg-bg-primary p-0.5"
						role="tablist"
						aria-label="Fonte dos tópicos"
					>
						<button
							type="button"
							role="tab"
							aria-selected={activeTab === "portais"}
							onClick={() => setActiveTab("portais")}
							className={`px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide transition-colors ${
								activeTab === "portais"
									? "bg-accent-primary text-white font-semibold"
									: "text-text-secondary hover:text-text-primary"
							}`}
						>
							Portais
						</button>
						<button
							type="button"
							role="tab"
							aria-selected={activeTab === "twitter"}
							onClick={() => setActiveTab("twitter")}
							className={`inline-flex items-center gap-1 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide transition-colors ${
								activeTab === "twitter"
									? "bg-accent-primary text-white font-semibold"
									: "text-text-secondary hover:text-text-primary"
							}`}
						>
							<XIcon className="h-2.5 w-2.5" />
							<span>X (Twitter)</span>
						</button>
					</div>
				</div>

				{/* Portais: Time window picker */}
				{activeTab === "portais" && (
					<div className="flex" role="group" aria-label="Janela de tempo">
						{WINDOWS.map((w) => (
							<button
								key={w.hours}
								type="button"
								onClick={() => setHours(w.hours)}
								aria-pressed={hours === w.hours}
								className={`border border-border-subtle px-2 py-0.5 font-mono text-[11px] transition-colors first:border-r-0 last:border-l-0 ${
									hours === w.hours
										? "bg-accent-primary text-white"
										: "text-text-secondary hover:text-text-primary"
								}`}
							>
								{w.label}
							</button>
						))}
					</div>
				)}

				{/* Twitter Tab Action: Read as News */}
				{activeTab === "twitter" && (
					<button
						type="button"
						onClick={handleOpenArticle}
						className="inline-flex items-center gap-1 border border-accent-primary/40 bg-accent-primary/10 px-2 py-0.5 font-mono text-[11px] font-medium text-accent-primary hover:bg-accent-primary/20 transition-colors"
						title="Abrir cobertura jornalística completa com análise dos tweets"
					>
						<FileText className="h-3 w-3" />
						<span>Ler notícia</span>
					</button>
				)}
			</div>

			{/* TAB CONTENT: PORTAIS */}
			{activeTab === "portais" && (
				<>
					<div className="flex-1 px-4 py-2">
						{loading && !report ? (
							Array.from({ length: 6 }).map((_, i) => (
								<div key={i} className="flex items-center gap-3 py-2.5">
									<div className="h-4 w-4 skeleton" />
									<div className="h-4 flex-1 skeleton" />
								</div>
							))
						) : terms.length === 0 ? (
							<p className="py-8 text-center text-sm text-text-secondary">
								Sem temas em alta nesta janela.
							</p>
						) : (
							<ol>
								{terms.map((t, i) => (
									<li
										key={t.term}
										className="border-b border-border-subtle last:border-b-0"
									>
										<button
											type="button"
											onClick={() => onSelectTerm(t.term)}
											className="group flex w-full items-center gap-3 py-2.5 text-left"
											title={`Buscar “${t.term}”`}
										>
											<span className="w-5 shrink-0 font-mono text-xs tabular-nums text-text-secondary/60">
												{String(i + 1).padStart(2, "0")}
											</span>
											<span className="min-w-0 flex-1">
												<span className="flex items-baseline gap-2">
													<span className="truncate text-sm font-medium text-text-primary transition-colors group-hover:text-accent-primary">
														{label(t.term)}
													</span>
													<Growth term={t} />
												</span>
												<span className="mt-1 flex items-center gap-2">
													<span className="h-1 flex-1 overflow-hidden bg-bg-tertiary">
														<span
															className="block h-full origin-left animate-[grow-x_700ms_cubic-bezier(0.22,1,0.36,1)_both] bg-accent-primary/70 motion-reduce:animate-none"
															style={{
																width: `${Math.max(6, (t.score / topScore) * 100)}%`,
															}}
														/>
													</span>
													<span className="w-44 shrink-0 text-right font-mono text-[11px] tabular-nums text-text-secondary">
														<AnimatedNumber value={t.sources} /> fontes ·{" "}
														<AnimatedNumber value={t.count} /> notícias
													</span>
												</span>
											</span>
											<Sparkline values={t.hourly} />
										</button>
									</li>
								))}
							</ol>
						)}
					</div>

					{themes.length > 0 && (
						<div className="border-t border-border-subtle px-4 py-3">
							<p className="mb-2 flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wide text-text-secondary">
								<TrendingUp className="h-3 w-3" />
								Editorias · {report?.totalArticles ?? 0} notícias
							</p>
							<div
								className="flex h-2 w-full overflow-hidden bg-bg-tertiary"
								aria-hidden="true"
							>
								{themes.map((th, i) => (
									<span
										key={th.theme}
										className="h-full border-r border-bg-primary last:border-r-0"
										style={{
											width: `${th.share * 100}%`,
											background: `color-mix(in srgb, var(--accent-primary) ${100 - i * 15}%, var(--bg-tertiary))`,
										}}
									/>
								))}
							</div>
							<ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
								{themes.map((th) => (
									<li
										key={th.theme}
										className="font-mono text-[11px] text-text-secondary"
									>
										<span className="text-text-primary">{th.theme}</span>{" "}
										<span className="tabular-nums">
											{Math.round(th.share * 100)}%
										</span>
										{th.growth >= 1.5 && th.previous > 0 && (
											<span className="ml-1 text-accent-secondary">↑</span>
										)}
									</li>
								))}
							</ul>
						</div>
					)}
				</>
			)}

			{/* TAB CONTENT: X (TWITTER) TRENDS */}
			{activeTab === "twitter" && (
				<div className="flex flex-1 flex-col overflow-hidden">
					{/* Editorial Banner */}
					<div className="border-b border-border-subtle bg-bg-secondary/60 px-4 py-2.5">
						<div className="flex items-start justify-between gap-3">
							<div>
								<div className="flex items-center gap-1.5">
									<span className="inline-block h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
									<span className="font-mono text-[11px] font-semibold uppercase tracking-wider text-text-primary">
										Trending Topics Brasil
									</span>
								</div>
								<p className="mt-0.5 text-xs text-text-secondary">
									Assuntos em destaque no X com contexto e tweets
									representativos.
								</p>
							</div>
							<button
								type="button"
								onClick={handleOpenArticle}
								className="shrink-0 flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-white bg-accent-primary hover:bg-accent-primary/90 rounded transition-colors"
							>
								<FileText className="h-3.5 w-3.5" />
								<span>Ler reportagem</span>
							</button>
						</div>
					</div>

					{/* Topics List with Expandable Tweets */}
					<div className="flex-1 overflow-y-auto px-4 py-2 max-h-[520px]">
						{twitterLoading && !twitterReport ? (
							Array.from({ length: 6 }).map((_, i) => (
								<div key={i} className="py-3 border-b border-border-subtle">
									<div className="h-4 w-32 skeleton mb-2" />
									<div className="h-3 w-full skeleton" />
								</div>
							))
						) : (
							<ol className="divide-y divide-border-subtle">
								{twitterTopics.map((topic, index) => {
									const isExpanded = expandedTopic === index;
									return (
										<li key={topic.name} className="py-3">
											<div className="flex items-start justify-between gap-2">
												<button
													type="button"
													onClick={() => onSelectTerm(topic.name)}
													className="group flex-1 text-left"
													title={`Filtrar matérias sobre ${topic.name}`}
												>
													<div className="flex items-center gap-2">
														<span className="font-mono text-xs font-bold text-accent-primary">
															#{topic.rank}
														</span>
														<span className="text-sm font-semibold text-text-primary group-hover:text-accent-primary transition-colors">
															{topic.name}
														</span>
														{topic.volume && (
															<span className="font-mono text-[10px] text-text-secondary bg-bg-secondary px-1.5 py-0.2 rounded border border-border-subtle">
																{topic.volume}
															</span>
														)}
													</div>
													<div className="mt-0.5">
														<span className="font-mono text-[10px] font-medium uppercase tracking-wider text-accent-secondary">
															{topic.category}
														</span>
													</div>
												</button>

												<button
													type="button"
													onClick={() =>
														setExpandedTopic(isExpanded ? null : index)
													}
													aria-expanded={isExpanded}
													className="p-1 text-text-secondary hover:text-text-primary transition-colors"
													title={
														isExpanded
															? "Ocultar tweets de exemplo"
															: "Ver tweets de exemplo"
													}
												>
													{isExpanded ? (
														<ChevronUp className="h-4 w-4" />
													) : (
														<ChevronDown className="h-4 w-4" />
													)}
												</button>
											</div>

											{/* Summary / Context */}
											<p className="mt-1 text-xs leading-relaxed text-text-secondary">
												{topic.summary}
											</p>

											{/* Expandable Sample Tweets */}
											{isExpanded && topic.sampleTweets.length > 0 && (
												<div className="mt-2.5 space-y-2 border-l-2 border-accent-primary/40 pl-3">
													<p className="font-mono text-[10px] font-semibold uppercase tracking-wider text-text-primary flex items-center gap-1">
														<MessageSquare className="h-3 w-3 text-accent-primary" />
														Vozes no X (Tweets em destaque)
													</p>

													{topic.sampleTweets.map((tweet) => (
														<div
															key={tweet.id}
															className="rounded border border-border-subtle bg-bg-secondary/40 p-2.5 text-xs"
														>
															<div className="flex items-center justify-between text-[11px] mb-1">
																<div className="flex items-center gap-1">
																	<span className="font-semibold text-text-primary">
																		{tweet.authorName}
																	</span>
																	<span className="text-text-secondary">
																		{tweet.authorHandle}
																	</span>
																	{tweet.authorVerified && (
																		<span
																			className="text-accent-primary text-[10px]"
																			title="Verificado"
																		>
																			✓
																		</span>
																	)}
																</div>
																{tweet.timestamp && (
																	<span className="text-[10px] text-text-secondary">
																		{tweet.timestamp}
																	</span>
																)}
															</div>

															<p className="text-text-secondary italic mb-2">
																"{tweet.text}"
															</p>

															<div className="flex items-center justify-between pt-1 border-t border-border-subtle/50 text-[10px] text-text-secondary">
																<div className="flex items-center gap-3">
																	{tweet.likes && <span>❤️ {tweet.likes}</span>}
																	{tweet.retweets && (
																		<span>🔁 {tweet.retweets}</span>
																	)}
																</div>
																{tweet.url && (
																	<a
																		href={tweet.url}
																		target="_blank"
																		rel="noopener noreferrer"
																		className="inline-flex items-center gap-1 text-accent-primary hover:underline"
																	>
																		<span>Ver no X</span>
																		<ExternalLink className="h-2.5 w-2.5" />
																	</a>
																)}
															</div>
														</div>
													))}
												</div>
											)}
										</li>
									);
								})}
							</ol>
						)}
					</div>

					{/* Bottom Bar: Read Full News Story */}
					<div className="border-t border-border-subtle p-3 bg-bg-secondary/30">
						<button
							type="button"
							onClick={handleOpenArticle}
							className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded border border-accent-primary/40 bg-accent-primary/10 hover:bg-accent-primary/20 text-accent-primary font-medium text-xs transition-colors"
						>
							<FileText className="h-3.5 w-3.5" />
							<span>Abrir matéria especial completa dos Trending Topics</span>
						</button>
					</div>
				</div>
			)}
		</section>
	);
}
