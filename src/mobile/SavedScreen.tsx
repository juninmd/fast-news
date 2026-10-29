import { useEffect, useState } from "react";
import { useBookmarks } from "../hooks/useBookmarks";
import { useReadingHistory } from "../hooks/useReadingHistory";
import { timeAgoShort } from "../utils/format";
import { RowSkeleton, StoryRow } from "./StoryRow";
import { fromApi, type MobileArticle } from "./types";

type Section = "saved" | "read";

export function SavedScreen({
	onOpen,
}: {
	onOpen: (a: MobileArticle) => void;
}) {
	const [section, setSection] = useState<Section>("saved");
	const { bookmarks } = useBookmarks();
	const { history } = useReadingHistory();
	const [saved, setSaved] = useState<MobileArticle[]>([]);
	const [loading, setLoading] = useState(false);

	useEffect(() => {
		if (bookmarks.length === 0) {
			setSaved([]);
			return;
		}
		let cancelled = false;
		setLoading(true);
		Promise.all(
			bookmarks.slice(0, 40).map((id) =>
				fetch(`/api/news/${id}`)
					.then((r) => (r.ok ? r.json() : null))
					.catch(() => null),
			),
		)
			.then((rows) => {
				if (!cancelled) setSaved(rows.filter(Boolean).map(fromApi));
			})
			.finally(() => {
				if (!cancelled) setLoading(false);
			});
		return () => {
			cancelled = true;
		};
	}, [bookmarks]);

	return (
		<div className="flex h-full flex-col">
			<header className="shrink-0 px-5 pt-[max(1.25rem,var(--sat))]">
				<h1 className="font-display text-[32px] font-semibold leading-[1.2]">
					Salvos
				</h1>
				<div
					role="group"
					aria-label="Seção"
					className="mt-3.5 flex rounded-full border border-border-subtle bg-bg-secondary p-[3px]"
				>
					{(
						[
							["saved", `Salvos (${bookmarks.length})`],
							["read", `Lidos (${history.length})`],
						] as const
					).map(([id, label]) => (
						<button
							key={id}
							type="button"
							onClick={() => setSection(id)}
							aria-pressed={section === id}
							className={`h-11 flex-1 rounded-full text-sm ${
								section === id
									? "bg-accent-primary font-semibold text-white"
									: "font-medium text-text-secondary"
							}`}
						>
							{label}
						</button>
					))}
				</div>
			</header>

			<div className="flex-1 overflow-y-auto overscroll-contain px-5 pb-6 pt-2">
				{section === "saved" && (
					<>
						{loading && saved.length === 0
							? Array.from({ length: Math.min(bookmarks.length, 4) }).map(
									(_, i) => <RowSkeleton key={i} />,
								)
							: saved.map((a) => (
									<StoryRow key={a.id} article={a} onOpen={onOpen} />
								))}
						{bookmarks.length === 0 && (
							<p className="py-16 text-center text-sm text-text-secondary">
								Nenhuma notícia salva. Toque no marcador dentro de uma matéria
								para guardá-la.
							</p>
						)}
					</>
				)}

				{section === "read" && (
					<>
						{history.map((h) => (
							<button
								key={h.id}
								type="button"
								onClick={() =>
									onOpen({
										id: h.id,
										title: h.title,
										url: "",
										source: "",
										category: "",
										publishedAt: new Date(h.readAt),
									})
								}
								className="block min-h-14 w-full border-b border-border-subtle py-3 text-left"
							>
								<span className="line-clamp-2 text-base font-semibold leading-snug">
									{h.title}
								</span>
								<span className="mt-1 block font-mono text-[11px] uppercase tracking-wider text-text-secondary">
									lida há {timeAgoShort(new Date(h.readAt))}
								</span>
							</button>
						))}
						{history.length === 0 && (
							<p className="py-16 text-center text-sm text-text-secondary">
								As matérias que você ler até o fim aparecem aqui.
							</p>
						)}
					</>
				)}
			</div>
		</div>
	);
}
