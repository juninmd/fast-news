import "dotenv/config";
import { getPool } from "./src/database/client.js";
import { getRedis } from "./src/services/cache.js";

async function test() {
	console.log("Testing DB connection...");
	try {
		const pool = getPool();
		const res = await pool.query("SELECT NOW()");
		console.log("DB connection successful:", res.rows[0].now);
	} catch (e) {
		console.error("DB connection failed:", e);
	}

	console.log("\nTesting Redis connection...");
	try {
		const redis = await getRedis();
		await redis.ping();
		console.log("Redis connection successful (PONG)");
	} catch (e) {
		console.error("Redis connection failed:", e);
	}

	process.exit(0);
}

test();
