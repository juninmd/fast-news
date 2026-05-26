export async function sendArticleToTelegram(articleId) {
	const res = await fetch(`/api/telegram/articles/${encodeURIComponent(articleId)}/send`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
	});
	if (!res.ok) {
		const err = await res.json().catch(() => ({}));
		throw new Error(err.error || "Telegram send failed");
	}
	return res.json();
}
