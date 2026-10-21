import { useCallback, useEffect, useState } from "react";
import { CoverImage } from "../components/NeoEditorial/CoverImage";
import { useBookmarks } from "../hooks/useBookmarks";
import { useReadingHistory } from "../hooks/useReadingHistory";
import { timeAgoShort } from "../utils/format";
import { BackIcon, BookmarkIcon, ExternalIcon, ShareIcon } from "./Icons";
import { openExternal, shareLink } from "./native";
import type { MobileArticle } from "./types";

interface FullArticle {
	id: string;
	title: string;
	summary: string | null;
	content: string;
	url: string;
	source: string;
	category: string;
	published_at: string;
	image_url: string | null;
}

interface Related {
	id: string;
	title: string;
	source: string;
	url: string;
}

function Section({
	title,
	children,
}: {
	title: string;
	children: React.ReactNode;
}) {
	return (
		<section className="mt-6">
			<h2 className="font-mono text-[11px] uppercase tracking-wider text-text-secondary">
				{title}
			</h2>
			{children}
		</section>
	);
}

/** Full-screen reader: summary, coverage by outlet, and a fixed link to the original story. */
export function ReaderScreen({
	seed,
	onClose,
	onToast,
}: {
	seed: MobileArticle;
	onClose: () => void;
	onToast: (message: string) => void;
}) {
	const [full, setFull] = useState<FullArticle | null>(null);
	const [related, setRelated] = useState<Related[]>([]);
	const [failed, setFailed] = useState(false);
	const [progress, setProgress] = useState(0);
	const { toggle, isBookmarked } = useBookmarks();
	const { markRead } = useReadingHistory();

	useEffect(() => {
		const ac = new AbortController();
		fetch(`/api/news/${seed.id}`, { signal: ac.signal })
			.then((r) => {
				if (!r.ok) throw new Error(`HTTP ${r.status}`);
				return r.json();
			})
			.then(setFull)
			.catch(() => {
				if (!ac.signal.aborted) setFailed(true);
			});
		fetch(`/api/news/${seed.id}/related`, { signal: ac.signal })
			.then((r) => (r.ok ? r.json() : { data: [] }))
			.then((d) => setRelated((d.data ?? []).slice(0, 5)))
			.catch(() => {
				// related stories are optional
			});
		return () => ac.abort();
	}, [seed.id]);

	const onScroll = useCallback(
		(e: React.UIEvent<HTMLDivElement>) => {
			const el = e.currentTarget;
			const max = el.scrollHeight - el.clientHeight;
			const pct = max > 0 ? Math.min(100, (el.scrollTop / max) * 100) : 100;
			setProgress(pct);
			if (pct >= 80) markRead(seed.id, full?.title ?? seed.title);
		},
		[markRead, seed.id, seed.title, full?.title],
	);

	const title = full?.title ?? seed.title;
	const source = full?.source || seed.source;
	const category = full?.category || seed.category;
	const url = full?.url || seed.url;
	const image = full?.image_url ?? seed.imageUrl;
	const when = full?.published_at ?? seed.publishedAt;
	const coverage = seed.alsoIn ?? [];
	const saved = isBookmarked(seed.id);
	const paragraphs = (full?.content ?? "")
		.split(/\n{2,}/)
		.map((p) => p.trim())
		.filter(Boolean)
		.slice(0, 6);

	return (
		<div
			role="dialog"
			aria-label={title}
			className="fixed inset-0 z-40 flex animate-slide-up flex-col bg-bg-primary text-text-primary"
		>
			<div className="h-0.5 shrink-0 bg-bg-tertiary">
				<div
					className="h-full bg-accent-primary transition-[width] duration-150"
					style={{ width: `${progress}%` }}
				/>
			</div>

			<div className="flex shrink-0 items-center justify-between px-2 pt-[max(0.5rem,var(--sat))]">
				<button
					type="button"
					onClick={onClose}
					aria-label="Voltar"
					className="flex h-11 w-11 items-center justify-center"
				>
					<BackIcon />
				</button>
				<div className="flex">
					<button
						type="button"
						aria-label="Compartilhar"
						onClick={async () => {
							const r = await shareLink(title, url);
							if (r === "copied") onToast("Link copiado");
						}}
						disabled={!url}
						className="flex h-11 w-11 items-center justify-center disabled:opacity-40"
					>
						<ShareIcon />
					</button>
					<button
						type="button"
						aria-label={saved ? "Remover dos salvos" : "Salvar"}
						aria-pressed={saved}
						onClick={() => {
							toggle(seed.id);
							onToast(saved ? "Removido dos salvos" : "Salvo");
						}}
						className={`flex h-11 w-11 items-center justify-center ${saved ? "text-accent-primary" : ""}`}
					>
						<BookmarkIcon filled={saved} />
					</button>
				</div>
			</div>

			<div
				onScroll={onScroll}
				className="flex-1 overflow-y-auto overscroll-contain px-5 pb-6"
			>
				<p className="font-mono text-[11px] uppercase tracking-wider text-text-secondary">
					{[category, source, timeAgoShort(when)].filter(Boolean).join(" · ")}
				</p>
				<h1 className="mt-2 font-display text-[27px] font-semibold leading-[1.22]">
					{title}
				</h1>

				<CoverImage
					src={image}
					source={source || "Fast News"}
					category={category}
					eager
					className="mt-4 h-[180px] w-full rounded-[14px]"
				/>

				{full?.summary && (
					<div className="mt-4 rounded-[14px] border border-border-subtle bg-bg-secondary px-4 py-3.5">
						<span className="font-mono text-[11px] uppercase tracking-wider text-accent-primary">
							Resumo IA
						</span>
						<p className="mt-2 text-[15px] leading-[1.5]">{full.summary}</p>
					</div>
				)}

				{paragraphs.length > 0 && (
					<div className="mt-4 space-y-3 text-[15px] leading-[1.6] text-text-primary">
						{paragraphs.map((p, i) => (
							<p key={i}>{p}</p>
						))}
					</div>
				)}

				{failed && !full && (
					<p className="mt-6 text-sm text-text-secondary">
						Não foi possível carregar o texto. Use o botão abaixo para ler a
						matéria original.
					</p>
				)}

				{coverage.length > 0 && (
					<Section title={`Cobertura · ${coverage.length + 1} fontes`}>
						<ul className="mt-2 border-t border-border-subtle">
							{coverage.map((c) => (
								<li key={c.id} className="border-b border-border-subtle">
									<button
										type="button"
										onClick={() => openExternal(c.url)}
										className="flex min-h-14 w-full flex-col justify-center py-2 text-left"
									>
										<span className="font-mono text-xs uppercase tracking-wide text-text-secondary">
											{c.source} · {timeAgoShort(c.publishedAt)}
										</span>
										<span className="mt-0.5 text-sm leading-snug">
											{c.title}
										</span>
									</button>
								</li>
							))}
						</ul>
					</Section>
				)}

				{related.length > 0 && (
					<Section title="Relacionadas">
						<ul className="mt-2 border-t border-border-subtle">
							{related.map((r) => (
								<li key={r.id} className="border-b border-border-subtle">
									<button
										type="button"
										onClick={() => openExternal(r.url)}
										className="flex min-h-14 w-full flex-col justify-center py-2 text-left"
									>
										<span className="font-mono text-xs uppercase tracking-wide text-text-secondary">
											{r.source}
										</span>
										<span className="mt-0.5 text-sm leading-snug">
											{r.title}
										</span>
									</button>
								</li>
							))}
						</ul>
					</Section>
				)}
			</div>

			<div className="shrink-0 border-t border-border-subtle bg-bg-secondary px-5 pb-[max(1rem,var(--sab))] pt-3">
				<button
					type="button"
					onClick={() => openExternal(url)}
					disabled={!url}
					className="flex h-[52px] w-full items-center justify-center gap-2 rounded-full bg-accent-primary text-base font-semibold text-white disabled:opacity-50"
				>
					Ler reportagem original
					<ExternalIcon />
				</button>
			</div>
		</div>
	);
}
