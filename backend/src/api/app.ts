import cors from "cors";
import express from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { forwardAsyncErrors } from "./asyncErrors.js";
import { healthHandler } from "./health.js";
import { aiRouter } from "./routes/ai.js";
import { editionsRouter } from "./routes/editions.js";
import { feedsRouter } from "./routes/feeds.js";
import { financialRouter } from "./routes/financial.js";
import { newsRouter } from "./routes/news.js";
import { ragRouter } from "./routes/rag.js";
import { sourcesRouter } from "./routes/sources.js";
import { storiesRouter } from "./routes/stories.js";
import { telegramRouter } from "./routes/telegram.js";
import { topicsRouter } from "./routes/topics.js";
import { translateRouter } from "./routes/translate.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function createApp(): express.Application {
	const app = express();

	app.use(cors({ origin: "*" }));
	app.use(express.json());

	app.get("/health", healthHandler);
	app.head("/health", healthHandler);

	app.use("/api/news", forwardAsyncErrors(newsRouter));
	app.use("/api/topics", forwardAsyncErrors(topicsRouter));
	app.use("/api/financial", forwardAsyncErrors(financialRouter));
	app.use("/api/rag", forwardAsyncErrors(ragRouter));
	app.use("/api/stories", forwardAsyncErrors(storiesRouter));
	app.use("/api/editions", forwardAsyncErrors(editionsRouter));
	app.use("/api/telegram", forwardAsyncErrors(telegramRouter));
	app.use("/api/ai", forwardAsyncErrors(aiRouter));
	app.use("/api/sources", forwardAsyncErrors(sourcesRouter));
	app.use("/api/translate", forwardAsyncErrors(translateRouter));
	// feed.xml, feed.json, digests/*, podcast.xml
	app.use("/api", forwardAsyncErrors(feedsRouter));

	// Serve static files from frontend build (optional — only when built)
	const clientPath = path.join(__dirname, "../../client");
	if (fs.existsSync(clientPath)) {
		app.use(express.static(clientPath));
		app.get("*", (req, res, next) => {
			if (req.path.startsWith("/api/")) return next();
			res.sendFile(path.join(clientPath, "index.html"));
		});
	}

	app.use(
		(
			err: Error,
			_req: express.Request,
			res: express.Response,
			_next: express.NextFunction,
		) => {
			console.error("[API] Error:", err.message);
			res.status(500).json({ error: "Internal server error" });
		},
	);

	return app;
}
