import { Request, Response, Router } from "express";
import {
	isLang,
	SUPPORTED_LANGS,
	translateTitles,
} from "../../services/translation.js";

export const translateRouter: Router = Router();

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// GET /api/translate?lang=en&ids=a,b,c — titles only, cached forever, capped per day (see TRANSLATION_DAILY_LIMIT).
translateRouter.get("/", async (req: Request, res: Response) => {
	const lang = req.query["lang"];
	if (!isLang(lang))
		return res
			.status(400)
			.json({ error: `lang must be one of: ${SUPPORTED_LANGS.join(", ")}` });
	const ids = String(req.query["ids"] ?? "")
		.split(",")
		.map((s) => s.trim())
		.filter((s) => UUID.test(s));
	if (!ids.length) return res.status(400).json({ error: "ids is required" });
	const data = await translateTitles(ids, lang);
	return res.json({ lang, data });
});
