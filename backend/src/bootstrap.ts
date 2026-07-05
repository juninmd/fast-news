import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { closePool, getPool } from "./database/client.js";
import { initVectorStore } from "./database/vectorStore.js";
import { closeRedis, getRedis } from "./services/cache.js";
import { syncDefaultFeeds } from "./services/sources.js";

const __dir = dirname(fileURLToPath(import.meta.url));
const MIGRATION_FILES = ["schema.sql", "telegram-feedback.sql"];

export async function runMigrations(): Promise<void> {
	const sql = MIGRATION_FILES.map((file) =>
		readFileSync(join(__dir, "database", file), "utf-8"),
	).join("\n");
	await getPool().query(sql);
}

/** Shared boot sequence for every entry point (server, agent CLI, k8s runners). */
export async function initInfra(): Promise<void> {
	await getPool().query("SELECT 1");
	await runMigrations();
	await initVectorStore();
	await syncDefaultFeeds();
	await getRedis();
}

export async function shutdownInfra(): Promise<void> {
	await closeRedis();
	await closePool();
}
