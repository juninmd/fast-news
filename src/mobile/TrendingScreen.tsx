import { useState } from "react";
import { type TrendTerm, useTrends } from "../hooks/useTrends";

const WINDOWS = [6, 24, 48] as const;

function titleCase(term: string): string {
	return term.replace(
		/(^|\s)(\p{L})/gu,
		(_, sp: string, ch: string) => sp + ch.toUpperCase(),
	);
}

function Spark({ values }: { values: number[] }) {
	const max = Math.max(1, ...values);
	const w = 64;
	const h = 28;
	const step = w / Math.max(1, values.length - 1);
	const points = values
		.map(
			(v, i) =>
				`${(i * step).toFixed(1)},${(h - 2 - (v / max) * (h - 4)).toFixed(1)}`,
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
				strokeWidth="1.8"
				strokeLinejoin="round"
				strokeLinecap="round"
			/>
		</svg>
	);
}

function Growth({ term }: { term: TrendTerm }) {
	if (term.previous === 0) {
		return (
			<span className="font-mono text-xs font-semibold uppercase text-accent-tertiary">
				novo
			</span>
		);
	}
	return (
		<span className="font-mono text-xs tabular-nums text-accent-secondary">
			↑ {term.growth.toFixed(term.growth >= 10 ? 0 : 1).replace(".", ",")}×
		</span>
	);
}

export function TrendingScreen({
	onSelectTerm,
}: {
	onSelectTerm: (term: string) => void;
}) {
	const [hours, setHours] = useState<number>(24);
	const { report, loading } = useTrends(hours);
	const terms = report?.terms.slice(0, 15) ?? [];
	const themes = report?.themes.slice(0, 6) ?? [];

	return (
		<div className="flex h-full flex-col">
			<header className="shrink-0 px-5 pt-[max(1.25rem,var(--sat))]">
				<h1 className="font-display text-[32px] font-semibold leading-[1.2]">
					Em alta
				</h1>
				<p className="mt-0.5 text-sm text-text-secondary">
					Temas que surgiram em várias fontes ao mesmo tempo
				</p>
				<div
					role="group"
					aria-label="Janela de tempo"
					className="mt-3.5 flex rounded-full border border-border-subtle bg-bg-secondary p-[3px]"
				>
					{WINDOWS.map((w) => (
						<button
							key={w}
							type="button"
							onClick={() => setHours(w)}
							aria-pressed={hours === w}
							className={`h-11 flex-1 rounded-full text-sm ${
								hours === w
									? "bg-accent-primary font-semibold text-white"
									: "font-medium text-text-secondary"
							}`}
						>
							{w}h
						</button>
					))}
				</div>
			</header>

			<div className="flex-1 overflow-y-auto overscroll-contain px-5 pb-6 pt-2">
				{loading && !report
					? Array.from({ length: 8 }).map((_, i) => (
							<div
								key={i}
								className="h-[72px] animate-pulse border-b border-border-subtle"
							/>
						))
					: terms.map((t, i) => (
							<button
								key={t.term}
								type="button"
								onClick={() => onSelectTerm(t.term)}
								className="flex min-h-[72px] w-full items-center gap-3.5 border-b border-border-subtle text-left"
							>
								<span className="w-[22px] font-mono text-xs text-text-secondary">
									{String(i + 1).padStart(2, "0")}
								</span>
								<span className="min-w-0 flex-1">
									<span className="flex items-center gap-2">
										<span className="truncate font-display text-xl font-semibold leading-6">
											{titleCase(t.term)}
										</span>
										<Growth term={t} />
									</span>
									<span className="mt-0.5 block text-[13px] text-text-secondary">
										{t.sources} fontes · {t.count} notícias
									</span>
								</span>
								<Spark values={t.hourly.length > 1 ? t.hourly : [0, 0]} />
							</button>
						))}

				{!loading && terms.length === 0 && (
					<p className="py-12 text-center text-sm text-text-secondary">
						Sem temas em alta nesta janela.
					</p>
				)}

				{themes.length > 0 && report && (
					<section aria-label="Editorias" className="mt-6">
						<h2 className="font-mono text-[11px] uppercase tracking-wider text-text-secondary">
							Editorias · {report.totalArticles} notícias
						</h2>
						<div className="mt-2.5 flex h-2.5 gap-0.5 overflow-hidden rounded-full">
							{themes.map((th, i) => (
								<div
									key={th.theme}
									className="bg-accent-primary"
									style={{
										flex: th.share,
										opacity: 1 - i * 0.14,
									}}
								/>
							))}
						</div>
						<ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-[13px]">
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
		</div>
	);
}
