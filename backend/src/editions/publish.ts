import { config } from "../config/env.js";
import { getBot } from "../services/telegram.js";
import {
	type Delivered,
	NOT_DELIVERED,
	type TelegramMedia,
} from "./telegramMedia.js";
import type { EditionWindow } from "./types.js";

export type ChatDeliveryStatus = "full" | "summaryOnly" | "failed";

export interface ChatDeliveryOutcome {
	status: ChatDeliveryStatus;
	/** Permanent edition URL or t.me link to the posted file. */
	link?: string;
	/** Set when status is "summaryOnly" (file failed) or "failed" (message failed). */
	error?: string;
}

export interface PublishResult {
	chats: Record<string, ChatDeliveryOutcome>;
}

/**
 * Builds a stable link to a message in a chat. Works for both public
 * channels (t.me/<username>/<id>) and private chats the viewer is a member
 * of (t.me/c/<internal id>/<id>) — Telegram strips the -100 prefix that
 * bot APIs use for supergroup/channel ids in that second form.
 */
export function messageLink(chatId: string, messageId: number): string {
	if (chatId.startsWith("-100")) {
		return `https://t.me/c/${chatId.slice(4)}/${messageId}`;
	}
	if (chatId.startsWith("@")) {
		return `https://t.me/${chatId.slice(1)}/${messageId}`;
	}
	return `https://t.me/c/${chatId.replace(/^-/, "")}/${messageId}`;
}

// Telegraf puts the request URL, bot token included, in network errors.
export function safeMessage(err: unknown): string {
	return (err as Error).message.replace(/bot\d+:[\w-]+/g, "bot<redacted>");
}

export function editionFilename(w: EditionWindow): string {
	return `o-fio-${w.day}-${w.kind}.html`;
}

const MESSAGE_RETRY_DELAY_MS = 2000;
const DOCUMENT_SEND_ATTEMPTS = 3;
const DOCUMENT_RETRY_DELAY_MS = 4000;

/**
 * Telegraf's sendDocument reliably hung with "socket hang up" in production
 * even on a fresh connection with no prior traffic (confirmed live: a plain
 * curl multipart POST of a larger file to the same endpoint from the same
 * pod succeeded in under 2s while Telegraf's client failed 3/3 times in a
 * row). The fault is in Telegraf's client for this call, not the network or
 * file size, so this bypasses it with a direct multipart POST instead of
 * retrying into the same broken path.
 */
async function sendDocumentRaw(
	token: string,
	chatId: string,
	filename: string,
	file: Buffer,
): Promise<{ message_id: number }> {
	const form = new FormData();
	form.set("chat_id", chatId);
	form.set(
		"document",
		new Blob([Uint8Array.from(file)], { type: "text/html" }),
		filename,
	);
	const res = await fetch(`https://api.telegram.org/bot${token}/sendDocument`, {
		method: "POST",
		body: form,
	});
	const body = (await res.json().catch(() => null)) as {
		ok?: boolean;
		description?: string;
		result?: { message_id: number };
	} | null;
	if (!res.ok || !body?.ok || !body.result) {
		throw new Error(
			`sendDocument failed: ${res.status} ${body?.description ?? res.statusText}`,
		);
	}
	return body.result;
}

async function sendDocumentWithRetry(
	token: string,
	chatId: string,
	filename: string,
	file: Buffer,
): Promise<{ message_id: number }> {
	let lastErr: unknown;
	for (let attempt = 1; attempt <= DOCUMENT_SEND_ATTEMPTS; attempt++) {
		try {
			return await sendDocumentRaw(token, chatId, filename, file);
		} catch (err) {
			lastErr = err;
			if (attempt < DOCUMENT_SEND_ATTEMPTS) {
				console.warn(
					`[Edition] Retrying file for ${chatId} (attempt ${attempt + 1}/${DOCUMENT_SEND_ATTEMPTS}): ${safeMessage(err)}`,
				);
				await new Promise((r) => setTimeout(r, DOCUMENT_RETRY_DELAY_MS));
			}
		}
	}
	throw lastErr;
}

export interface DocumentDeliveryResult {
	links: Record<string, string>;
	failed: { chatId: string; error: string }[];
}

/**
 * Delivers the edition file to a set of chats, hiding retry and the Telegraf
 * bypass behind one seam. Both the first-send path (publishEdition, one chat
 * at a time) and the recovery runner (resendEditionDocument, a batch of
 * still-pending chats) call this instead of each owning their own copy of
 * the delivery mechanics.
 */
export async function deliverEditionDocument(
	chatIds: string[],
	filename: string,
	file: Buffer,
): Promise<DocumentDeliveryResult> {
	if (!config.telegramBotToken)
		throw new Error("[Edition] Telegram is disabled or has no bot token");
	const result: DocumentDeliveryResult = { links: {}, failed: [] };
	for (const chatId of chatIds) {
		try {
			const sent = await sendDocumentWithRetry(
				config.telegramBotToken,
				chatId,
				filename,
				file,
			);
			result.links[chatId] = messageLink(chatId, sent.message_id);
		} catch (err) {
			result.failed.push({ chatId, error: safeMessage(err) });
		}
	}
	return result;
}

type Telegram = ReturnType<typeof getBot>["telegram"];

/**
 * Sends the cover photo and the story album. Telegram fetches the image URLs
 * itself and rejects a dead or oversized one, so each part is best-effort:
 * what fails is reported back and the text summary carries it instead.
 */
async function sendMedia(
	telegram: Telegram,
	chatId: string,
	media: TelegramMedia | undefined,
): Promise<Delivered> {
	const delivered = { ...NOT_DELIVERED };
	if (media?.cover) {
		try {
			await telegram.sendPhoto(chatId, media.cover.url, {
				caption: media.cover.caption,
				parse_mode: "HTML",
			});
			delivered.cover = true;
		} catch (err) {
			console.warn(
				`[Edition] Cover photo skipped for ${chatId}: ${safeMessage(err)}`,
			);
		}
	}
	const album = media?.album;
	if (album) {
		try {
			if (album.urls.length === 1)
				await telegram.sendPhoto(chatId, album.urls[0] as string, {
					caption: album.caption,
					parse_mode: "HTML",
				});
			else
				await telegram.sendMediaGroup(
					chatId,
					album.urls.map((url, i) => ({
						type: "photo" as const,
						media: url,
						...(i === 0
							? { caption: album.caption, parse_mode: "HTML" as const }
							: {}),
					})),
				);
			delivered.album = album.stories;
		} catch (err) {
			console.warn(
				`[Edition] Album skipped for ${chatId}: ${safeMessage(err)}`,
			);
		}
	}
	return delivered;
}

/**
 * Sends the photos, the summary message and (without a Pages link) the full
 * newspaper file to every chat. `summary` may be a function of what the photos
 * delivered, so the text never repeats a story a photo already told.
 */
export async function publishEdition(
	w: EditionWindow,
	summary: string | ((delivered: Delivered) => string),
	html: string,
	editionUrl?: string,
	media?: TelegramMedia,
): Promise<PublishResult> {
	if (!config.telegramEnabled || !config.telegramBotToken)
		throw new Error("[Edition] Telegram is disabled or has no bot token");
	if (!config.telegramChatIds.length)
		throw new Error("[Edition] TELEGRAM_CHAT_IDS is empty");

	const telegram = getBot().telegram;
	const file = Buffer.from(html, "utf-8");
	const filename = editionFilename(w);
	const result: PublishResult = { chats: {} };
	for (const chatId of config.telegramChatIds) {
		try {
			const options: Parameters<typeof telegram.sendMessage>[2] = {
				parse_mode: "HTML",
				link_preview_options: { is_disabled: true },
			};
			if (editionUrl) {
				const url = new URL(editionUrl);
				if (url.protocol !== "https:")
					throw new Error("Edition link must use HTTPS");
				options.reply_markup = {
					inline_keyboard: [
						[{ text: "Ler o jornal completo", url: url.toString() }],
					],
				};
			}
			const delivered = await sendMedia(telegram, chatId, media);
			const text = typeof summary === "function" ? summary(delivered) : summary;
			// One retry: photos are already out, and a rerun of the whole edition would repeat them.
			await telegram
				.sendMessage(chatId, text, options)
				.catch(async (err: unknown) => {
					if (!delivered.cover && !delivered.album.length) throw err;
					await new Promise((r) => setTimeout(r, MESSAGE_RETRY_DELAY_MS));
					await telegram.sendMessage(chatId, text, options);
				});
		} catch (err) {
			result.chats[chatId] = { status: "failed", error: safeMessage(err) };
			continue;
		}
		if (editionUrl) {
			result.chats[chatId] = { status: "full", link: editionUrl };
			continue;
		}
		// Once the summary is out a retry never repeats it; a failed attachment
		// still leaves the chat as "summaryOnly" rather than fully failed.
		const delivery = await deliverEditionDocument([chatId], filename, file);
		const link = delivery.links[chatId];
		const failure = delivery.failed[0];
		result.chats[chatId] = link
			? { status: "full", link }
			: { status: "summaryOnly", error: `document: ${failure?.error}` };
	}
	return result;
}
