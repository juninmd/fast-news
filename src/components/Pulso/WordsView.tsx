import { ArrowUpRight, Search } from "lucide-react";
import { useState } from "react";
import { useTrends } from "../../hooks/useTrends";
import { Segmented } from "./Segmented";
import { WordWheel } from "./WordWheel";
import { titleCase, type WheelWord } from "./wheelModel";

const WINDOWS = [
	["6", "6h"],
	["24", "24h"],
	["48", "48h"],
] as const;

function Spark({ values, tone }: { values: number[]; tone: string }) {
	const v = values.length > 1 ? values : [0, 0];
	const max = Math.max(1, ...v);
	const w = 240;
	const h = 56;
	const stepX = w / (v.length - 1);
	const y = (n: number) => (h - 6 - (n / max) * (h - 14)).toFixed(1);
	const pts = v.map((n, i) => `${(i * stepX).toFixed(1)},${y(n)}`).join(" ");
	return (
		<svg
			viewBox={`0 0 ${w} ${h}`}
			preserveAspectRatio="none"
			className="pulso-wheel-spark"
			data-tone={tone}
			aria-hidden
		>
			<polygon points={`0,${h} ${pts} ${w},${h}`} className="fill" />
			<polyline points={pts} className="line" />
			<circle cx={w} cy={y(v[v.length - 1])} r="3.5" className="dot" />
		</svg>
	);
}

interface WordsViewProps {
	onSearch: (term: string) => void;
	onOpenArticle: (id: string, title?: string) => void;
	articles: Array<{ id: string; title: string; source?: string }>;
}

export function WordsView({
	onSearch,
	onOpenArticle,
	articles,
}: WordsViewProps) {
	const [hours, setHours] = useState("24");
	const { report, loading } = useTrends(Number(hours));
	const [word, setWord] = useState<WheelWord | null>(null);
	const terms = report?.terms ?? [];
	const themes = report?.themes.slice(0, 6) ?? [];
	const t = word?.term;

	const byId = new Map(articles.map((a) => [a.id, a]));
	const related = (t?.articleIds ?? [])
		.map((id) => byId.get(id))
		.filter((a): a is NonNullable<typeof a> => !!a)
		.slice(0, 4);

	return (
		<div className="space-y-6">
			<div className="flex flex-wrap items-end justify-between gap-3">
				<p className="max-w-[60ch] text-text-secondary">
					Os termos que mais aparecem nos portais, em três anéis. Tamanho é
					relevância, cor é crescimento. Arraste para girar, use as setas ou
					clique numa palavra; clique de novo para buscar.
				</p>
				<Segmented
					label="Janela de tempo"
					value={hours}
					options={WINDOWS}
					onChange={setHours}
				/>
			</div>

			<div className="grid items-center gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
				<div className="pulso-wheel-stage">
					{loading && terms.length === 0 ? (
						<div className="pulso-wheel pulso-wheel--loading" aria-busy>
							<span className="pulso-dots" aria-hidden>
								<i />
								<i />
								<i />
							</span>
						</div>
					) : terms.length === 0 ? (
						<div className="pulso-wheel pulso-wheel--loading">
							<p className="px-10 text-center text-sm text-text-secondary">
								Sem termos em alta nesta janela. Tente 48h.
							</p>
						</div>
					) : (
						<WordWheel
							terms={terms}
							onFocusChange={setWord}
							onActivate={(w) => onSearch(w.term.term)}
						/>
					)}
					<div className="pulso-wheel-legend" aria-hidden>
						<span data-tone="new">Novo na janela</span>
						<span data-tone="rising">Crescendo</span>
						<span data-tone="steady">Estável</span>
					</div>
				</div>

				<section
					className="pulso-panel pulso-wheel-detail"
					aria-live="polite"
					aria-label="Termo em foco"
				>
					<span className="pulso-eyebrow">Na seta</span>
					{t && word ? (
						<>
							<h2 key={t.term} className="pulso-wheel-term">
								{titleCase(t.term)}
							</h2>
							<span className="pulso-tone-badge" data-tone={word.tone}>
								{word.tone === "new"
									? "novo na janela"
									: `↑ ${t.growth.toFixed(t.growth >= 10 ? 0 : 1).replace(".", ",")}×`}
							</span>
							<dl className="pulso-wheel-stats">
								<div>
									<dt>menções</dt>
									<dd>{t.count}</dd>
								</div>
								<div>
									<dt>portais</dt>
									<dd>{t.sources}</dd>
								</div>
								<div>
									<dt>score</dt>
									<dd>{Math.round(t.score)}</dd>
								</div>
							</dl>
							<div>
								<span className="pulso-eyebrow">Menções por hora</span>
								<Spark values={t.hourly} tone={word.tone} />
							</div>
							{related.length > 0 && (
								<ul className="grid gap-1.5">
									{related.map((a) => (
										<li key={a.id}>
											<button
												type="button"
												className="pulso-keypoint"
												onClick={() => onOpenArticle(a.id, a.title)}
											>
												<ArrowUpRight className="h-4 w-4 text-accent-primary" />
												<span className="min-w-0">{a.title}</span>
												<span className="font-mono text-[11px] text-text-secondary">
													{a.source}
												</span>
											</button>
										</li>
									))}
								</ul>
							)}
							<button
								type="button"
								className="pulso-play self-start"
								onClick={() => onSearch(t.term)}
							>
								<Search className="h-4 w-4" />
								Buscar “{t.term}” por significado
							</button>
						</>
					) : (
						<p className="text-text-secondary">
							{loading ? "Lendo os portais…" : "Gire a roda para escolher."}
						</p>
					)}
				</section>
			</div>

			{themes.length > 0 && report && (
				<section className="pulso-panel p-5" aria-label="Editorias">
					<span className="pulso-eyebrow">
						Editorias · {report.totalArticles} notícias em {hours}h
					</span>
					<div className="pulso-theme-bar">
						{themes.map((th, i) => (
							<span
								key={th.theme}
								style={{
									flex: th.share,
									animationDelay: `${i * 70}ms`,
								}}
								title={`${th.theme} ${Math.round(th.share * 100)}%`}
							/>
						))}
					</div>
					<ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-sm">
						{themes.map((th) => (
							<li key={th.theme}>
								{th.theme}{" "}
								<span className="font-mono text-text-secondary">
									{Math.round(th.share * 100)}%
								</span>
							</li>
						))}
					</ul>
				</section>
			)}
		</div>
	);
}
