import { Request, Response, Router } from "express";
import { config } from "../../config/env.js";
import {
	fetchTelegramArticle,
	getBot,
	isValidWebhookSecret,
} from "../../services/telegram.js";
import { postArticleToTelegram } from "../../services/telegramBroadcast.js";
import { requireAdmin } from "../adminAuth.js";

export const telegramRouter: Router = Router();

telegramRouter.post(
	"/articles/:id/send",
	requireAdmin,
	async (req: Request, res: Response) => {
		const id = String(req.params.id);
		const article = await fetchTelegramArticle(id);
		if (!article) return res.status(404).json({ error: "Article not found" });
		await postArticleToTelegram(article);
		return res.status(202).json({ ok: true, articleId: id });
	},
);

telegramRouter.post("/webhook", async (req: Request, res: Response) => {
	if (!config.telegramEnabled || config.telegramBotMode !== "webhook") {
		return res
			.status(404)
			.json({ error: "Webhook not enabled or Telegram is disabled" });
	}
	if (!isValidWebhookSecret(req.get("x-telegram-bot-api-secret-token"))) {
		return res.status(401).json({ error: "Unauthorized" });
	}
	try {
		await getBot().handleUpdate(req.body, res);
	} catch (err: any) {
		console.error("[Telegram] Webhook error:", err.message);
		res.sendStatus(500);
	}
});
