import { Flame, TrendingUp } from "lucide-react";
import { useState } from "react";
import { type TrendTerm, useTrends } from "../../hooks/useTrends";
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

export function TrendingPanel({
	onSelectTerm,
}: {
	onSelectTerm: (term: string) => void;
}) {
	const [hours, setHours] = useState<number>(24);
	const { report, loading } = useTrends(hours);
	const terms = report?.terms.slice(0, 10) ?? [];
	const themes = report?.themes.slice(0, 6) ?? [];
	const topScore = Math.max(1, ...terms.map((t) => t.score));

	return (
		<section
			aria-labelledby="trending-title"
			className="flex h-full flex-col border border-border-subtle"
		>
			<div className="flex items-center justify-between border-b border-border-subtle bg-bg-secondary px-4 py-2">
				<h2
					id="trending-title"
					className="flex items-center gap-2 font-mono text-xs font-semibold uppercase tracking-widest text-text-primary"
				>
					<Flame className="h-3.5 w-3.5 text-accent-tertiary" />
					Temas em alta
				</h2>
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
			</div>

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
		</section>
	);
}
