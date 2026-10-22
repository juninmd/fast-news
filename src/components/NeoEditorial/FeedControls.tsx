import { useEffect, useRef, useState } from "react";
import type { TranslateLang } from "../../hooks/useTranslatedTitles";

interface FeedControlsProps {
	scope: "all" | "ai";
	onScopeChange: (scope: "all" | "ai") => void;
	lang: TranslateLang;
	onLangChange: (lang: TranslateLang) => void;
}

const PERIODS = [
	["4h", "4 horas"],
	["daily", "Dia"],
	["weekly", "Semana"],
	["monthly", "Mês"],
] as const;

const LANGS: Array<[TranslateLang, string]> = [
	["off", "Original"],
	["pt", "PT"],
	["en", "EN"],
	["es", "ES"],
];

const LINKS = [
	["RSS", "/api/feed.xml"],
	["JSON", "/api/feed.json"],
	["OPML", "/api/sources/opml"],
	["Podcast", "/api/podcast.xml"],
] as const;

const btn = (active: boolean) =>
	`px-2.5 py-1.5 text-xs transition-colors ${
		active
			? "bg-accent-primary/10 text-accent-primary font-medium"
			: "text-text-secondary hover:text-text-primary"
	}`;

/** Browser speech synthesis: free, no server TTS or model involved. */
function useDigestSpeech() {
	const [speaking, setSpeaking] = useState(false);
	const supported =
		typeof window !== "undefined" && "speechSynthesis" in window;
	const active = useRef(false);

	useEffect(
		() => () => {
			if (active.current) window.speechSynthesis.cancel();
		},
		[],
	);

	const stop = () => {
		window.speechSynthesis.cancel();
		active.current = false;
		setSpeaking(false);
	};

	const play = async (period: string, scope: "all" | "ai") => {
		if (!supported) return;
		try {
			const res = await fetch(
				`/api/digests/${period}?format=script${scope === "ai" ? "&scope=ai" : ""}`,
			);
			if (!res.ok) return;
			const utterance = new SpeechSynthesisUtterance(await res.text());
			utterance.lang = "pt-BR";
			utterance.onend = utterance.onerror = () => {
				active.current = false;
				setSpeaking(false);
			};
			window.speechSynthesis.cancel();
			active.current = true;
			setSpeaking(true);
			window.speechSynthesis.speak(utterance);
		} catch {
			setSpeaking(false);
		}
	};

	return { speaking, supported, play, stop };
}

export function FeedControls({
	scope,
	onScopeChange,
	lang,
	onLangChange,
}: FeedControlsProps) {
	const [period, setPeriod] = useState<string>("daily");
	const { speaking, supported, play, stop } = useDigestSpeech();

	return (
		<section
			aria-label="Filtros do feed"
			className="mb-4 space-y-3 border border-border-subtle p-3"
		>
			<div>
				<p className="mb-1 font-mono text-[10px] uppercase tracking-wide text-text-secondary">
					Escopo
				</p>
				<div className="flex divide-x divide-border-subtle border border-border-subtle">
					<button
						type="button"
						className={btn(scope === "all")}
						onClick={() => onScopeChange("all")}
					>
						Tudo
					</button>
					<button
						type="button"
						className={btn(scope === "ai")}
						onClick={() => onScopeChange("ai")}
					>
						Só IA
					</button>
				</div>
			</div>

			<div>
				<p className="mb-1 font-mono text-[10px] uppercase tracking-wide text-text-secondary">
					Traduzir títulos
				</p>
				<div className="flex divide-x divide-border-subtle border border-border-subtle">
					{LANGS.map(([value, label]) => (
						<button
							key={value}
							type="button"
							className={btn(lang === value)}
							onClick={() => onLangChange(value)}
						>
							{label}
						</button>
					))}
				</div>
			</div>

			{supported && (
				<div>
					<p className="mb-1 font-mono text-[10px] uppercase tracking-wide text-text-secondary">
						Ouvir resumo
					</p>
					<div className="flex gap-2">
						<select
							value={period}
							onChange={(e) => setPeriod(e.target.value)}
							className="min-w-0 flex-1 border border-border-subtle bg-bg-primary px-2 py-1.5 text-xs text-text-primary"
							aria-label="Período do resumo"
						>
							{PERIODS.map(([value, label]) => (
								<option key={value} value={value}>
									{label}
								</option>
							))}
						</select>
						<button
							type="button"
							onClick={() => (speaking ? stop() : play(period, scope))}
							className="border border-border-subtle px-3 py-1.5 text-xs text-text-primary hover:bg-accent-primary/10"
						>
							{speaking ? "Parar" : "Ouvir"}
						</button>
					</div>
				</div>
			)}

			<div className="flex flex-wrap gap-x-3 gap-y-1 border-t border-border-subtle pt-2 text-xs">
				{LINKS.map(([label, href]) => (
					<a
						key={label}
						href={
							scope === "ai" && label !== "OPML" ? `${href}?scope=ai` : href
						}
						target="_blank"
						rel="noreferrer"
						className="text-text-secondary underline-offset-2 hover:text-accent-primary hover:underline"
					>
						{label}
					</a>
				))}
			</div>
		</section>
	);
}
