import { config } from "../config/env.js";
import { getBot } from "../services/telegram.js";
import type { EditionWindow } from "./types.js";

export interface PublishResult {
	delivered: string[];
	failed: { chatId: string; error: string }[];
	/** t.me links to the posted file, one per chat that received it. */
	links: Record<string, string>;
}

/**
 * Builds a stable link to a message in a chat. Works for both public
 * channels (t.me/<username>/<id>) and private chats the viewer is a member
 * of (t.me/c/<internal id>/<id>) — Telegram strips the -100 prefix that
 * bot APIs use for supergroup/channel ids in that second form.
 */
function messageLink(chatId: string, messageId: number): string {
	if (chatId.startsWith("-100")) {
		return `https://t.me/c/${chatId.slice(4)}/${messageId}`;
	}
	if (chatId.startsWith("@")) {
		return `https://t.me/${chatId.slice(1)}/${messageId}`;
	}
	return `https://t.me/c/${chatId.replace(/^-/, "")}/${messageId}`;
}

// Telegraf puts the request URL, bot token included, in network errors.
function safeMessage(err: unknown): string {
	return (err as Error).message.replace(/bot\d+:[\w-]+/g, "bot<redacted>");
}

export function editionFilename(w: EditionWindow): string {
	return `o-fio-${w.day}-${w.kind}.html`;
}

/** Sends the summary message and the full newspaper file to every chat. */
export async function publishEdition(
	w: EditionWindow,
	summary: string,
	html: string,
): Promise<PublishResult> {
	if (!config.telegramEnabled || !config.telegramBotToken)
		throw new Error("[Edition] Telegram is disabled or has no bot token");
	if (!config.telegramChatIds.length)
		throw new Error("[Edition] TELEGRAM_CHAT_IDS is empty");

	const telegram = getBot().telegram;
	const file = Buffer.from(html, "utf-8");
	const result: PublishResult = { delivered: [], failed: [], links: {} };
	for (const chatId of config.telegramChatIds) {
		try {
			await telegram.sendMessage(chatId, summary, {
				parse_mode: "HTML",
				link_preview_options: { is_disabled: true },
			});
		} catch (err) {
			result.failed.push({ chatId, error: safeMessage(err) });
			continue;
		}
		// Once the summary is out the chat counts as delivered, so a retry never
		// repeats it; a failed attachment is still reported and fails the job.
		result.delivered.push(chatId);
		const doc = { source: file, filename: editionFilename(w) };
		try {
			// One retry: large uploads sometimes lose the socket mid-request.
			const sent = await telegram.sendDocument(chatId, doc).catch((err) => {
				// The first upload may have landed, so a duplicate is possible.
				console.warn(
					`[Edition] Retrying file for ${chatId}: ${safeMessage(err)}`,
				);
				return telegram.sendDocument(chatId, doc);
			});
			result.links[chatId] = messageLink(chatId, sent.message_id);
		} catch (err) {
			result.failed.push({ chatId, error: `document: ${safeMessage(err)}` });
		}
	}
	return result;
}
