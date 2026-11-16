import { X } from "lucide-react";
import { useEffect, useRef } from "react";
import type { TranslateLang } from "../../hooks/useTranslatedTitles";
import { Sidebar } from "../NeoEditorial/Sidebar";
import { Segmented } from "./Segmented";
import { Switch } from "./Switch";

export interface FeedFilters {
	minCredibility: number;
	politicalBias: string;
	excludeMilitant: boolean;
	groupSources: boolean;
	scope: "all" | "ai";
	lang: TranslateLang;
}

export const DEFAULT_FILTERS: FeedFilters = {
	minCredibility: 0,
	politicalBias: "all",
	excludeMilitant: false,
	groupSources: true,
	scope: "all",
	lang: "off",
};

export function activeFilterCount(f: FeedFilters, extra = 0) {
	return (
		[
			f.minCredibility > 0,
			f.politicalBias !== "all",
			f.excludeMilitant,
			!f.groupSources,
			f.scope !== "all",
			f.lang !== "off",
		].filter(Boolean).length + extra
	);
}

const CRED = [
	["0", "Todas"],
	["7", "≥ 7/10"],
	["9", "≥ 9/10"],
] as const;

const BIAS = [
	["all", "Todos"],
	["left", "Esq."],
	["neutral", "Neutro"],
	["right", "Dir."],
] as const;

const SCOPES = [
	["all", "Tudo"],
	["ai", "Só IA"],
] as const;

const LANGS = [
	["off", "Original"],
	["pt", "PT"],
	["en", "EN"],
	["es", "ES"],
] as const;

interface FilterDrawerProps {
	open: boolean;
	filters: FeedFilters;
	onChange: (next: FeedFilters) => void;
	onClose: () => void;
	onSidebarFilters: (f: { company?: string; category?: string }) => void;
}

/** Every feed filter in one place: right drawer on desktop, bottom sheet on phones. */
export function FilterDrawer({
	open,
	filters,
	onChange,
	onClose,
	onSidebarFilters,
}: FilterDrawerProps) {
	const closeRef = useRef<HTMLButtonElement>(null);
	const set = <K extends keyof FeedFilters>(k: K, v: FeedFilters[K]) =>
		onChange({ ...filters, [k]: v });

	useEffect(() => {
		if (!open) return;
		closeRef.current?.focus();
		const onKey = (e: KeyboardEvent) => {
			if (e.key === "Escape") onClose();
		};
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, [open, onClose]);

	return (
		<>
			{open && <div className="pulso-scrim" onClick={onClose} aria-hidden />}
			<aside
				className="pulso-drawer"
				aria-label="Filtros do feed"
				hidden={!open}
			>
				<div className="flex items-center justify-between">
					<h2 className="font-display text-2xl font-extrabold tracking-tight">
						Filtros
					</h2>
					<button
						ref={closeRef}
						type="button"
						className="pulso-icon-btn"
						aria-label="Fechar filtros"
						onClick={onClose}
					>
						<X className="h-4 w-4" />
					</button>
				</div>

				<div className="space-y-2">
					<p className="pulso-eyebrow">Credibilidade mínima</p>
					<Segmented
						label="Credibilidade mínima"
						value={String(filters.minCredibility) as "0" | "7" | "9"}
						options={CRED}
						onChange={(v) => set("minCredibility", Number(v))}
					/>
				</div>

				<div className="space-y-2">
					<p className="pulso-eyebrow">Viés político</p>
					<Segmented
						label="Viés político"
						value={filters.politicalBias as (typeof BIAS)[number][0]}
						options={BIAS}
						onChange={(v) => set("politicalBias", v)}
					/>
					<div
						className="pulso-bias mt-3"
						style={{ width: "100%" }}
						aria-hidden
					/>
				</div>

				<Switch
					id="pulso-exclude-militant"
					label="Ocultar panfletário/militante"
					checked={filters.excludeMilitant}
					onChange={(v) => set("excludeMilitant", v)}
				/>
				<Switch
					id="pulso-group-sources"
					label="Agrupar mesma notícia de várias fontes"
					checked={filters.groupSources}
					onChange={(v) => set("groupSources", v)}
				/>

				<div className="space-y-2">
					<p className="pulso-eyebrow">Escopo</p>
					<Segmented
						label="Escopo"
						value={filters.scope}
						options={SCOPES}
						onChange={(v) => set("scope", v)}
					/>
				</div>

				<div className="space-y-2">
					<p className="pulso-eyebrow">Traduzir títulos</p>
					<Segmented
						label="Traduzir títulos"
						value={filters.lang}
						options={LANGS}
						onChange={(v) => set("lang", v)}
					/>
				</div>

				<div className="border-t border-border-subtle pt-4 [&_aside]:w-full">
					<Sidebar onFilterChange={onSidebarFilters} />
				</div>

				<div className="sticky bottom-0 mt-auto flex gap-2 bg-bg-secondary pt-2">
					<button
						type="button"
						className="pulso-chip"
						onClick={() => onChange(DEFAULT_FILTERS)}
					>
						Limpar
					</button>
					<button
						type="button"
						onClick={onClose}
						className="flex-1 rounded-xl bg-accent-primary px-4 py-2.5 text-sm font-bold text-white transition-transform hover:scale-[1.02]"
					>
						Ver matérias
					</button>
				</div>
			</aside>
		</>
	);
}
