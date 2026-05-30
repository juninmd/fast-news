import { Request, Response, Router } from "express";
import { config } from "../../config/env.js";
import { query } from "../../database/client.js";
import {
	getBot,
	postArticleToTelegram,
	type TelegramArticle,
} from "../../services/telegram.js";

export const telegramRouter: Router = Router();

telegramRouter.post(
	"/articles/:id/send",
	async (req: Request, res: Response) => {
		const { id } = req.params;
		const result = await query<{
			id: string;
			title: string;
			url: string;
			source: string;
			category: string;
			company: string | null;
			content: string;
			publishedAt: Date | null;
			imageUrl: string | null;
			fakeNewsScore: number | null;
			politicalBias: string | null;
			isMilitant: boolean;
			hasIncoherence: boolean;
			credibilityFlags: string[] | null;
			credibilityReasoning: string | null;
			storyId: string | null;
		}>(
			`SELECT na.id, na.title, na.url, na.source, na.category, na.company,
            na.content, na.published_at AS "publishedAt", na.image_url AS "imageUrl",
            na.fake_news_score AS "fakeNewsScore", na.political_bias AS "politicalBias",
            na.is_militant AS "isMilitant", na.has_incoherence AS "hasIncoherence",
            na.credibility_flags AS "credibilityFlags",
            na.credibility_reasoning AS "credibilityReasoning",
            sa.story_id AS "storyId"
     FROM news_articles na
     LEFT JOIN LATERAL (
       SELECT story_id FROM story_articles WHERE article_id = na.id LIMIT 1
     ) sa ON true
     WHERE na.id = $1`,
			[id],
		);
		const article = result.rows[0];
		if (!article) return res.status(404).json({ error: "Article not found" });
		await postArticleToTelegram({
			...article,
			company: article.company ?? undefined,
			imageUrl: article.imageUrl ?? undefined,
			storyId: article.storyId ?? undefined,
			credibilityFlags: article.credibilityFlags ?? [],
		} satisfies TelegramArticle);
		return res.status(202).json({ ok: true, articleId: id });
	},
);

telegramRouter.post("/webhook", async (req: Request, res: Response) => {
	if (!config.telegramEnabled || config.telegramBotMode !== "webhook") {
		return res
			.status(404)
			.json({ error: "Webhook not enabled or Telegram is disabled" });
	}
	try {
		await getBot().handleUpdate(req.body, res);
	} catch (err: any) {
		console.error("[Telegram] Webhook error:", err.message);
		res.sendStatus(500);
	}
});
