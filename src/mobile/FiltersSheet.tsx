import { CloseIcon } from "./Icons";

export interface FeedFilters {
	minCredibility: number;
	politicalBias: string;
	excludeMilitant: boolean;
	group: boolean;
}

export const DEFAULT_FILTERS: FeedFilters = {
	minCredibility: 0,
	politicalBias: "all",
	excludeMilitant: false,
	group: true,
};

export function activeFilterCount(f: FeedFilters): number {
	return (
		(f.minCredibility > 0 ? 1 : 0) +
		(f.politicalBias !== "all" ? 1 : 0) +
		(f.excludeMilitant ? 1 : 0) +
		(f.group ? 0 : 1)
	);
}

function Choice({
	label,
	on,
	onClick,
}: {
	label: string;
	on: boolean;
	onClick: () => void;
}) {
	return (
		<button
			type="button"
			onClick={onClick}
			aria-pressed={on}
			className={`h-11 rounded-full border px-4 text-sm font-medium ${
				on
					? "border-text-primary bg-text-primary text-bg-primary"
					: "border-border-subtle text-text-primary"
			}`}
		>
			{label}
		</button>
	);
}

function Toggle({
	label,
	checked,
	onChange,
}: {
	label: string;
	checked: boolean;
	onChange: (v: boolean) => void;
}) {
	return (
		<label className="flex min-h-11 items-center justify-between gap-4 text-sm font-medium">
			{label}
			<input
				type="checkbox"
				checked={checked}
				onChange={(e) => onChange(e.target.checked)}
				className="h-5 w-5 accent-[var(--accent-primary)]"
			/>
		</label>
	);
}

/** Bottom sheet with the feed filters, so the feed itself stays clean. */
export function FiltersSheet({
	open,
	filters,
	onChange,
	onClose,
}: {
	open: boolean;
	filters: FeedFilters;
	onChange: (f: FeedFilters) => void;
	onClose: () => void;
}) {
	if (!open) return null;
	const set = (patch: Partial<FeedFilters>) =>
		onChange({ ...filters, ...patch });

	return (
		<div className="fixed inset-0 z-50 flex items-end">
			<button
				type="button"
				aria-label="Fechar filtros"
				onClick={onClose}
				className="absolute inset-0 bg-black/60"
			/>
			<div
				role="dialog"
				aria-label="Filtros"
				className="relative w-full animate-slide-up rounded-t-2xl border-t border-border-subtle bg-bg-secondary px-5 pb-[max(1.5rem,var(--sab))] pt-4"
			>
				<div className="flex items-center justify-between">
					<h2 className="font-display text-xl font-semibold">Filtros</h2>
					<button
						type="button"
						onClick={onClose}
						aria-label="Fechar"
						className="flex h-11 w-11 items-center justify-center"
					>
						<CloseIcon />
					</button>
				</div>

				<p className="mt-3 font-mono text-[11px] uppercase tracking-wider text-text-secondary">
					Credibilidade mínima
				</p>
				<div className="mt-2 flex flex-wrap gap-2">
					<Choice
						label="Todas"
						on={filters.minCredibility === 0}
						onClick={() => set({ minCredibility: 0 })}
					/>
					<Choice
						label="7+ confiável"
						on={filters.minCredibility === 7}
						onClick={() => set({ minCredibility: 7 })}
					/>
					<Choice
						label="9+ alta"
						on={filters.minCredibility === 9}
						onClick={() => set({ minCredibility: 9 })}
					/>
				</div>

				<p className="mt-5 font-mono text-[11px] uppercase tracking-wider text-text-secondary">
					Viés político
				</p>
				<div className="mt-2 flex flex-wrap gap-2">
					{[
						["all", "Todos"],
						["neutral", "Neutro"],
						["left", "Esquerda"],
						["right", "Direita"],
					].map(([value, label]) => (
						<Choice
							key={value}
							label={label as string}
							on={filters.politicalBias === value}
							onClick={() => set({ politicalBias: value as string })}
						/>
					))}
				</div>

				<div className="mt-4 divide-y divide-border-subtle">
					<Toggle
						label="Agrupar mesma notícia de várias fontes"
						checked={filters.group}
						onChange={(group) => set({ group })}
					/>
					<Toggle
						label="Ocultar panfletário/militante"
						checked={filters.excludeMilitant}
						onChange={(excludeMilitant) => set({ excludeMilitant })}
					/>
				</div>

				<div className="mt-5 flex gap-3">
					<button
						type="button"
						onClick={() => onChange(DEFAULT_FILTERS)}
						className="h-12 flex-1 rounded-full border border-border-subtle text-sm font-semibold"
					>
						Limpar
					</button>
					<button
						type="button"
						onClick={onClose}
						className="h-12 flex-1 rounded-full bg-accent-primary text-sm font-semibold text-white"
					>
						Ver notícias
					</button>
				</div>
			</div>
		</div>
	);
}
