const TELEGRAM_API = "https://api.telegram.org/bot";

export async function sendToTelegram(
	text,
	botToken,
	chatId,
	replyMarkup = null,
) {
	const url = `${TELEGRAM_API}${botToken}/sendMessage`;
	const payload = {
		chat_id: chatId,
		text,
		parse_mode: "HTML",
		disable_web_page_preview: false,
	};

	if (replyMarkup) {
		payload.reply_markup = JSON.stringify(replyMarkup);
	}

	const res = await fetch(url, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(payload),
	});

	if (!res.ok) {
		const err = await res.json();
		throw new Error(err.description || "Telegram send failed");
	}

	return res.json();
}

export async function sendPhotoToTelegram(
	caption,
	photoUrl,
	botToken,
	chatId,
	replyMarkup = null,
) {
	const url = `${TELEGRAM_API}${botToken}/sendPhoto`;
	const payload = {
		chat_id: chatId,
		photo: photoUrl,
		caption,
		parse_mode: "HTML",
	};

	if (replyMarkup) {
		payload.reply_markup = JSON.stringify(replyMarkup);
	}

	const res = await fetch(url, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(payload),
	});

	if (!res.ok) {
		const err = await res.json();
		throw new Error(err.description || "Telegram sendPhoto failed");
	}

	return res.json();
}
