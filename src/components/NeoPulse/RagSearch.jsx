import { Brain, ExternalLink, Loader, Search, X } from "lucide-react";
import { useState } from "react";
import { ragSearch } from "../../services/ragService";

function ScoreBadge({ score }) {
	const pct = Math.round(score * 100);
	const color =
		pct >= 80
			? "text-emerald-300"
			: pct >= 60
				? "text-amber-300"
				: "text-zinc-400";
	return <span className={`text-xs font-bold ${color}`}>{pct}%</span>;
}

export function RagSearch({ onClose }) {
	const [q, setQ] = useState("");
	const [results, setResults] = useState(null);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState("");

	const search = async (e) => {
		e.preventDefault();
		if (q.trim().length < 3) return;
		setLoading(true);
		setError("");
		try {
			const data = await ragSearch(q.trim(), 12);
			setResults(data);
		} catch {
			setError("Backend indisponível ou embedding não configurado.");
		} finally {
			setLoading(false);
		}
	};

	return (
		<div
			className="fixed inset-0 z-50 grid place-items-start bg-black/80 pt-16 backdrop-blur-sm"
			onClick={onClose}
		>
			<div
				className="mx-auto w-full max-w-2xl rounded-xl border border-white/10 bg-zinc-950 shadow-2xl"
				onClick={(e) => e.stopPropagation()}
			>
				<div className="flex items-center gap-3 border-b border-white/10 p-4">
					<Brain className="h-5 w-5 text-fuchsia-400" />
					<span className="font-bold text-white">Busca Semântica RAG</span>
					<button onClick={onClose} className="ml-auto neo-icon">
						<X className="h-4 w-4" />
					</button>
				</div>

				<form onSubmit={search} className="flex gap-2 p-4">
					<input
						autoFocus
						value={q}
						onChange={(e) => setQ(e.target.value)}
						placeholder="Ex: impacto da IA no mercado financeiro..."
						className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none placeholder:text-zinc-500 focus:border-fuchsia-400/50"
					/>
					<button type="submit" disabled={loading} className="neo-action gap-2">
						{loading ? (
							<Loader className="h-4 w-4 animate-spin" />
						) : (
							<Search className="h-4 w-4" />
						)}
						Buscar
					</button>
				</form>

				{error && <p className="px-4 pb-3 text-sm text-red-400">{error}</p>}

				{results && (
					<div className="max-h-[60vh] overflow-y-auto px-4 pb-4">
						<p className="mb-3 text-xs text-zinc-500">
							{results.total} resultados para "{results.query}"
						</p>
						<div className="space-y-3">
							{results.results.map((item) => (
								<a
									key={item.id}
									href={item.url}
									target="_blank"
									rel="noreferrer"
									className="flex items-start gap-3 rounded-lg border border-white/5 bg-white/3 p-3 transition hover:border-fuchsia-400/30 hover:bg-fuchsia-400/5"
								>
									<div className="flex-1 min-w-0">
										<p className="text-sm font-bold leading-tight text-white line-clamp-2">
											{item.title}
										</p>
										<p className="mt-1 line-clamp-2 text-xs text-zinc-400">
											{item.content?.slice(0, 140)}
										</p>
										<div className="mt-2 flex items-center gap-3 text-xs text-zinc-500">
											<span>{item.source}</span>
											<span className="rounded bg-zinc-800 px-1.5 py-0.5">
												{item.category}
											</span>
										</div>
									</div>
									<div className="flex flex-col items-end gap-1 shrink-0">
										<ScoreBadge score={item.similarity} />
										<ExternalLink className="h-3.5 w-3.5 text-zinc-600" />
									</div>
								</a>
							))}
						</div>
					</div>
				)}

				{results?.results?.length === 0 && (
					<p className="px-4 pb-4 text-sm text-zinc-500">
						Nenhum resultado. Aguarde a ingestão popular o banco.
					</p>
				)}
			</div>
		</div>
	);
}
