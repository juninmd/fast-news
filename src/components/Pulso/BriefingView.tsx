import { useEffect, useState } from "react";
import { type DigestPeriod, useDigest } from "../../hooks/useDigest";
import { useDigestSpeech } from "../../hooks/useDigestSpeech";
import { useTrends } from "../../hooks/useTrends";
import { TopNewsSection } from "../NeoEditorial/TopNewsSection";
import { TrendingPanel } from "../NeoEditorial/TrendingPanel";
import { Segmented } from "./Segmented";
import { WordWheel } from "./WordWheel";
import { titleCase, type WheelWord } from "./wheelModel";

const PERIODS = [
	["4h", "4h"],
	["daily", "Dia"],
	["weekly", "Semana"],
	["monthly", "Mês"],
] as const;

const SCOPES = [
	["all", "Tudo"],
	["ai", "Só IA"],
] as const;

const reduceMotion = () =>
	typeof window !== "undefined" &&
	window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/** Types the text in, two characters per frame-ish tick. */
function useTypewriter(text: string) {
	const [shown, setShown] = useState("");
	useEffect(() => {
		if (!text || reduceMotion()) {
			setShown(text);
			return;
		}
		let i = 0;
		setShown("");
		const t = setInterval(() => {
			i += 3;
			setShown(text.slice(0, i));
			if (i >= text.length) clearInterval(t);
		}, 18);
		return () => clearInterval(t);
	}, [text]);
	return { shown, typing: shown.length < text.length };
}

interface BriefingViewProps {
	scope: "all" | "ai";
	onScopeChange: (scope: "all" | "ai") => void;
	onOpenArticle: (id: string, title?: string) => void;
	onSearch: (term: string) => void;
	onSeeFeed: () => void;
	/** Opens the full "Palavras" view; the wheel teaser hides without it. */
	onOpenWords?: () => void;
	headlines: Array<{ id: string; title: string; category: string }>;
}

export function BriefingView({
	scope,
	onScopeChange,
	onOpenArticle,
	onSearch,
	onSeeFeed,
	onOpenWords,
	headlines,
}: BriefingViewProps) {
	const [period, setPeriod] = useState<DigestPeriod>("daily");
	const { items, loading } = useDigest(period, scope);
	const { speaking, supported, play, stop } = useDigestSpeech();

	const lead = items[0];
	const text = items
		.slice(0, 3)
		.map((i) => i.summary?.trim() || i.title)
		.join(" ");
	const { shown, typing } = useTypewriter(text);
	const now = new Date().toLocaleTimeString("pt-BR", {
		hour: "2-digit",
		minute: "2-digit",
	});

	return (
		<div className="space-y-6">
			{headlines.length > 0 && (
				<div className="pulso-ticker" aria-hidden>
					<div className="pulso-ticker-track">
						{[...headlines, ...headlines].map((h, i) => (
							<span key={`${h.id}-${i}`}>
								<b>{h.category.toUpperCase()}</b>
								{h.title}
							</span>
						))}
					</div>
				</div>
			)}

			<div className="grid gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
				<section
					className="pulso-panel pulso-brief"
					aria-labelledby="pulso-brief-title"
				>
					<div className="flex flex-wrap items-center justify-between gap-3">
						<span className="pulso-eyebrow">✦ Briefing · {now}</span>
						<Segmented
							label="Período do resumo"
							value={period}
							options={PERIODS}
							onChange={setPeriod}
						/>
					</div>

					<h2 id="pulso-brief-title" className="pulso-brief-title">
						{loading
							? "Montando seu briefing…"
							: lead
								? lead.title
								: "Ainda sem destaques neste período"}
					</h2>
					<p className="pulso-typed text-text-primary" data-typing={typing}>
						{loading ? (
							<span className="block h-16 skeleton rounded-lg" />
						) : (
							shown ||
							"Assim que a próxima ingestão rodar, o resumo aparece aqui."
						)}
					</p>

					<div className="mt-4 flex flex-wrap items-center gap-3">
						{supported && (
							<button
								type="button"
								className="pulso-play"
								data-on={speaking}
								onClick={() => (speaking ? stop() : play(period, scope))}
							>
								<span className="pulso-eq" aria-hidden>
									<i />
									<i />
									<i />
									<i />
								</span>
								{speaking ? "Parar leitura" : "Ouvir briefing"}
							</button>
						)}
						<Segmented
							label="Escopo"
							value={scope}
							options={SCOPES}
							onChange={onScopeChange}
						/>
					</div>

					{items.length > 0 && (
						<ol className="mt-5 grid gap-1">
							{items.slice(0, 6).map((it, i) => (
								<li key={it.id}>
									<button
										type="button"
										className="pulso-keypoint"
										style={{ animationDelay: `${i * 60}ms` }}
										onClick={() => onOpenArticle(it.id, it.title)}
									>
										<b>{String(i + 1).padStart(2, "0")}</b>
										<span className="min-w-0">{it.title}</span>
										<span className="font-mono text-[11px] text-text-secondary">
											{it.sourceCount > 1
												? `${it.sourceCount} fontes`
												: it.source}
										</span>
									</button>
								</li>
							))}
						</ol>
					)}
				</section>

				<div className="min-w-0 [&>section]:h-full [&>section]:overflow-hidden [&>section]:rounded-[20px] [&>section]:bg-bg-secondary">
					<TrendingPanel
						onSelectTerm={onSearch}
						onSelectArticle={(id) => onOpenArticle(id)}
					/>
				</div>
			</div>

			{onOpenWords && (
				<WheelTeaser onSearch={onSearch} onOpenWords={onOpenWords} />
			)}

			<div className="flex items-center justify-between gap-3">
				<span className="pulso-eyebrow">Mesma notícia, várias fontes</span>
				<button type="button" className="pulso-chip" onClick={onSeeFeed}>
					Ver feed completo →
				</button>
			</div>
			<div className="[&>section]:overflow-hidden [&>section]:rounded-[20px] [&>section]:bg-bg-secondary">
				<TopNewsSection onArticleClick={(id) => onOpenArticle(id)} />
			</div>
		</div>
	);
}

/** Compact Roda de Palavras on the briefing, linking to the full view. */
function WheelTeaser({
	onSearch,
	onOpenWords,
}: {
	onSearch: (term: string) => void;
	onOpenWords: () => void;
}) {
	const { report } = useTrends(24);
	const [word, setWord] = useState<WheelWord | null>(null);
	const terms = report?.terms ?? [];
	if (terms.length < 3) return null;
	const t = word?.term;
	return (
		<section
			className="pulso-panel pulso-wheel-teaser"
			aria-labelledby="pulso-wheel-teaser-title"
		>
			<WordWheel
				terms={terms}
				max={12}
				className="pulso-wheel--mini"
				label="Roda de palavras das últimas 24h"
				onFocusChange={setWord}
				onActivate={(w) => onSearch(w.term.term)}
			/>
			<div className="grid min-w-0 content-center gap-3">
				<span className="pulso-eyebrow">✦ Roda de palavras · 24h</span>
				<h2
					id="pulso-wheel-teaser-title"
					className="font-display text-2xl font-extrabold leading-tight"
				>
					{t ? titleCase(t.term) : "O que domina os portais"}
				</h2>
				{t && (
					<p className="text-sm text-text-secondary">
						{t.count} menções em {t.sources} portais. Gire a roda; toque de novo
						na palavra para buscar.
					</p>
				)}
				<div className="flex flex-wrap gap-2">
					{t && (
						<button
							type="button"
							className="pulso-chip"
							onClick={() => onSearch(t.term)}
						>
							Buscar “{t.term}”
						</button>
					)}
					<button type="button" className="pulso-chip" onClick={onOpenWords}>
						Abrir a roda completa →
					</button>
				</div>
			</div>
		</section>
	);
}
