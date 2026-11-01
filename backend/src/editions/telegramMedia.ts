import { directUrl, esc } from "./escape.js";
import { storyImage } from "./media.js";
import { clipWords } from "./text.js";
import type { Edition, Headline, Story } from "./types.js";

/** Telegram's hard cap for a photo caption. */
export const CAPTION_LIMIT = 1024;
const ALBUM_MAX = 4;
const OUTLETS_SHOWN = 4;

export interface Delivered {
	/** The cover photo (with masthead + lead) reached the chat. */
	cover: boolean;
	/** Stories of the photo album that reached the chat; empty when it did not. */
	album: Story[];
}

export interface TelegramMedia {
	cover?: { url: string; caption: string };
	album?: { urls: string[]; caption: string; stories: Story[] };
}

export const NOT_DELIVERED: Delivered = { cover: false, album: [] };

const TAG = /<[^>]*>/g;
const ENTITY: Record<string, string> = {
	"&amp;": "&",
	"&lt;": "<",
	"&gt;": ">",
	"&quot;": '"',
	"&#39;": "'",
};

/** Length Telegram counts against the caption cap: text after entity parsing, not markup. */
export function visibleLength(html: string): number {
	return html
		.replace(TAG, "")
		.replace(/&(amp|lt|gt|quot|#39);/g, (m) => ENTITY[m] ?? m).length;
}

/** One link per outlet, so the same story from three sites reads as one line. */
export function outlets(ids: number[], known: Map<number, Headline>): string {
	const seen = new Set<string>();
	const links: string[] = [];
	for (const id of ids) {
		const h = known.get(id);
		if (!h || seen.has(h.source)) continue;
		seen.add(h.source);
		const url = directUrl(h.url);
		const name = esc(clipWords(h.source, 24));
		links.push(url ? `<a href="${esc(url)}">${name}</a>` : name);
	}
	if (!links.length) return "";
	const extra = links.length - OUTLETS_SHOWN;
	const shown = links.slice(0, OUTLETS_SHOWN).join(" · ");
	return extra > 0 ? `${shown} +${extra}` : shown;
}

function allStories(e: Edition): Story[] {
	return [...e.draft.destaques, ...e.draft.secoes.flatMap((s) => s.materias)];
}

/** Stories the album covers: the first ones that have a photo other than the cover's. */
export function albumStories(e: Edition): { story: Story; url: string }[] {
	const used = new Set<string>();
	const cover = storyImage(e.draft.manchete.fontes, e.headlines);
	if (cover) used.add(cover);
	const lead = new Set(e.draft.manchete.fontes);
	const picked: { story: Story; url: string }[] = [];
	for (const s of allStories(e)) {
		if (picked.length >= ALBUM_MAX) break;
		if (s.fontes.some((id) => lead.has(id))) continue;
		const url = storyImage(s.fontes, e.headlines);
		if (!url || used.has(url)) continue;
		used.add(url);
		picked.push({ story: s, url });
	}
	return picked;
}

function albumCaption(
	e: Edition,
	items: { story: Story; url: string }[],
): string {
	const lines: string[] = [];
	for (const [i, { story }] of items.entries()) {
		const by = outlets(story.fontes, e.headlines);
		lines.push(
			`${i + 1}️⃣ <b>${esc(clipWords(story.titulo, 110))}</b>${by ? `\n      <i>${by}</i>` : ""}`,
		);
	}
	return lines.join("\n\n");
}

/**
 * Photos to send before the text summary. Captions are shrunk (deck first,
 * then trailing album stories) to fit Telegram's cap instead of dropping the
 * photo; parts without a usable image are simply absent.
 */
export function planTelegramMedia(
	e: Edition,
	header: string,
	leadBlock: (deckMax: number) => string,
): TelegramMedia {
	const media: TelegramMedia = {};
	const coverUrl = storyImage(e.draft.manchete.fontes, e.headlines);
	if (coverUrl)
		for (const deckMax of [320, 200, 100, 0]) {
			const caption = `${header}\n\n${leadBlock(deckMax)}`;
			if (visibleLength(caption) <= CAPTION_LIMIT) {
				media.cover = { url: coverUrl, caption };
				break;
			}
		}
	let items = albumStories(e);
	while (items.length && visibleLength(albumCaption(e, items)) > CAPTION_LIMIT)
		items = items.slice(0, -1);
	if (items.length)
		media.album = {
			urls: items.map((i) => i.url),
			caption: albumCaption(e, items),
			stories: items.map((i) => i.story),
		};
	return media;
}
