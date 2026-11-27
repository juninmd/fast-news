// Trechos literais de origin/main (AppNeo, Rail, StatusPanel); markups inline viram componentes só para o comparativo.

export function Toast() {
	return (
		<div className="pulso-toast" role="status">
			Analisando credibilidade…
		</div>
	);
}

export function Kbd() {
	return <kbd className="pulso-kbd">⌘K</kbd>;
}

export function RailBadge() {
	return (
		<span className="pulso-badge tabular-nums" aria-hidden>
			3
		</span>
	);
}

export function HealthCard() {
	return (
		<div className="p-4 rounded-xl bg-bg-secondary border border-border-subtle flex flex-col">
			<span className="text-xs text-text-secondary uppercase tracking-wider">
				database
			</span>
			<span className="text-lg font-bold mt-1 text-green-400">🟢 Ativo</span>
			<span className="text-xs text-text-secondary mt-2">Latência: 12ms</span>
		</div>
	);
}
