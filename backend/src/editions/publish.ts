import { config } from "../config/env.js";
import { getBot } from "../services/telegram.js";
import type { EditionWindow } from "./types.js";

export interface PublishResult {
	delivered: string[];
	failed: { chatId: string; error: string }[];
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
	const result: PublishResult = { delivered: [], failed: [] };
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
			await telegram
				.sendDocument(chatId, doc)
				.catch(() => telegram.sendDocument(chatId, doc));
		} catch (err) {
			result.failed.push({ chatId, error: `document: ${safeMessage(err)}` });
		}
	}
	return result;
}
