import { useEffect, useMemo, useState } from "react";

export type TranslateLang = "off" | "pt" | "en" | "es";

/**
 * Swaps article titles for their translation. The backend caches every title
 * forever and enforces a daily model budget, so this asks once per list and
 * silently keeps the original title for anything it could not translate.
 */
export function useTranslatedTitles<T extends { id: string; title: string }>(
	articles: T[],
	lang: TranslateLang,
): T[] {
	const [translated, setTranslated] = useState<Record<string, string>>({});

	useEffect(() => {
		if (lang === "off") {
			setTranslated({});
			return;
		}
		const ids = articles.map((a) => a.id).slice(0, 100);
		if (!ids.length) return;
		const ac = new AbortController();
		fetch(`/api/translate?lang=${lang}&ids=${ids.join(",")}`, {
			signal: ac.signal,
		})
			.then((r) => (r.ok ? r.json() : null))
			.then((body) => {
				if (!body?.data) return;
				const map: Record<string, string> = {};
				for (const item of body.data as Array<{
					id: string;
					title: string;
					origin: string;
				}>) {
					if (item.origin !== "unavailable") map[item.id] = item.title;
				}
				setTranslated(map);
			})
			.catch(() => undefined);
		return () => ac.abort();
	}, [articles, lang]);

	return useMemo(
		() =>
			lang === "off"
				? articles
				: articles.map((a) =>
						translated[a.id] ? { ...a, title: translated[a.id] as string } : a,
					),
		[articles, lang, translated],
	);
}
