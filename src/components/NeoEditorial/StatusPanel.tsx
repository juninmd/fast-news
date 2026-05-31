import React, { useEffect, useState } from "react";

interface Feed {
	id: string;
	name: string;
	url: string;
	category: string;
	company?: string;
	isActive: boolean;
	lastFetched?: string;
}

interface HealthData {
	status: string;
	uptime: number;
	dependencies: {
		database: { status: string; latencyMs: number };
		redis: { status: string; latencyMs: number };
		ollama: { status: string; latencyMs: number };
	};
}

export function StatusPanel() {
	const [health, setHealth] = useState<HealthData | null>(null);
	const [feeds, setFeeds] = useState<Feed[]>([]);
	const [newFeed, setNewFeed] = useState({
		name: "",
		url: "",
		category: "Tecnologia",
		company: "",
	});
	const [loading, setLoading] = useState(true);

	const loadData = async () => {
		try {
			const [hRes, fRes] = await Promise.all([
				fetch("/health"),
				fetch("/api/news/feeds/list"),
			]);
			if (hRes.ok) setHealth(await hRes.json());
			if (fRes.ok) {
				const data = await fRes.json();
				setFeeds(data.data || []);
			}
		} catch (err) {
			console.error(err);
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		loadData();
	}, []);

	const handleToggle = async (id: string, active: boolean) => {
		await fetch("/api/news/feeds/toggle", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ id, isActive: !active }),
		});
		setFeeds(feeds.map((f) => (f.id === id ? { ...f, isActive: !active } : f)));
	};

	const handleDelete = async (id: string) => {
		if (!confirm("Excluir este feed?")) return;
		await fetch(`/api/news/feeds/${id}`, { method: "DELETE" });
		setFeeds(feeds.filter((f) => f.id !== id));
	};

	const handleAdd = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!newFeed.name || !newFeed.url) return;
		await fetch("/api/news/feeds/add", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(newFeed),
		});
		setNewFeed({ name: "", url: "", category: "Tecnologia", company: "" });
		loadData();
	};

	return (
		<div className="space-y-6">
			{/* Health dashboard */}
			<div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-fade-in">
				{health &&
					Object.entries(health.dependencies).map(([name, status]) => (
						<div
							key={name}
							className="p-4 rounded-xl bg-bg-secondary border border-border-subtle flex flex-col"
						>
							<span className="text-xs text-text-secondary uppercase tracking-wider">
								{name}
							</span>
							<span
								className={`text-lg font-bold mt-1 ${
									status.status === "up" ? "text-green-400" : "text-red-400"
								}`}
							>
								{status.status === "up" ? "🟢 Ativo" : "🔴 Fora do Ar"}
							</span>
							<span className="text-xs text-text-secondary mt-2">
								Latência: {status.latencyMs ?? 0}ms
							</span>
						</div>
					))}
			</div>

			{/* Feeds CRUD */}
			<div className="p-6 rounded-xl bg-bg-secondary border border-border-subtle space-y-4 animate-fade-in">
				<h3 className="text-md font-semibold text-text-primary">
					Gerenciador de RSS Feeds
				</h3>
				<form
					onSubmit={handleAdd}
					className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-bg-tertiary/40 p-4 rounded-xl border border-border-subtle"
				>
					<input
						placeholder="Nome"
						value={newFeed.name}
						onChange={(e) => setNewFeed({ ...newFeed, name: e.target.value })}
						className="bg-bg-tertiary border border-border-subtle rounded-lg px-3 py-1.5 text-sm text-text-primary outline-none focus:border-accent-primary"
					/>
					<input
						placeholder="URL do RSS"
						value={newFeed.url}
						onChange={(e) => setNewFeed({ ...newFeed, url: e.target.value })}
						className="bg-bg-tertiary border border-border-subtle rounded-lg px-3 py-1.5 text-sm text-text-primary outline-none focus:border-accent-primary"
					/>
					<input
						placeholder="Categoria"
						value={newFeed.category}
						onChange={(e) =>
							setNewFeed({ ...newFeed, category: e.target.value })
						}
						className="bg-bg-tertiary border border-border-subtle rounded-lg px-3 py-1.5 text-sm text-text-primary outline-none focus:border-accent-primary"
					/>
					<button
						type="submit"
						className="px-4 py-1.5 rounded-lg bg-accent-primary text-white hover:bg-accent-primary/80 transition-colors text-sm font-semibold"
					>
						+ Adicionar Feed
					</button>
				</form>

				<div className="overflow-x-auto">
					<table className="min-w-full text-left text-sm">
						<thead>
							<tr className="border-b border-border-subtle text-text-secondary">
								<th className="py-2">Nome</th>
								<th className="py-2">URL</th>
								<th className="py-2">Categoria</th>
								<th className="py-2 text-center">Status</th>
								<th className="py-2 text-right">Ações</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-border-subtle/50">
							{feeds.map((feed) => (
								<tr key={feed.id}>
									<td className="py-3 font-medium text-text-primary">
										{feed.name}
									</td>
									<td
										className="py-3 text-xs text-text-secondary max-w-[200px] truncate"
										title={feed.url}
									>
										{feed.url}
									</td>
									<td className="py-3 text-text-secondary">{feed.category}</td>
									<td className="py-3 text-center">
										<button
											type="button"
											onClick={() => handleToggle(feed.id, feed.isActive)}
											className={`text-xs px-2.5 py-1 rounded-full font-semibold transition-colors ${
												feed.isActive
													? "bg-green-500/10 text-green-400 border border-green-500/30"
													: "bg-red-500/10 text-red-400 border border-red-500/30"
											}`}
										>
											{feed.isActive ? "Ativo" : "Inativo"}
										</button>
									</td>
									<td className="py-3 text-right">
										<button
											type="button"
											onClick={() => handleDelete(feed.id)}
											className="text-red-400 hover:text-red-300 text-xs font-semibold"
										>
											Excluir
										</button>
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			</div>
		</div>
	);
}
