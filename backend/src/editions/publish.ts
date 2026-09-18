import { config } from "../config/env.js";
import { getBot } from "../services/telegram.js";
import type { EditionWindow } from "./types.js";

export interface PublishResult {
	delivered: string[];
	failed: { chatId: string; error: string }[];
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
			result.failed.push({ chatId, error: (err as Error).message });
			continue;
		}
		// Once the summary is out the chat counts as delivered, so a retry never
		// repeats it; a failed attachment is still reported and fails the job.
		result.delivered.push(chatId);
		try {
			await telegram.sendDocument(chatId, {
				source: file,
				filename: editionFilename(w),
			});
		} catch (err) {
			result.failed.push({
				chatId,
				error: `document: ${(err as Error).message}`,
			});
		}
	}
	return result;
}
