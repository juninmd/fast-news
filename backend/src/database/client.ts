import pg from "pg";
import { config } from "../config/env.js";

const { Pool } = pg;

let pool: pg.Pool | null = null;

export const VECTOR_SESSION_SQL =
	"SET ivfflat.probes = 10; SET ivfflat.iterative_scan = relaxed_order; SET hnsw.iterative_scan = strict_order";

export function getPool(): pg.Pool {
	if (!pool) {
		pool = new Pool({
			connectionString: config.databaseUrl,
			max: 10,
			idleTimeoutMillis: 30_000,
			connectionTimeoutMillis: 5_000,
			query_timeout: 15_000, // abort query if Postgres hangs >15s
			statement_timeout: 15_000, // server-side timeout
		});

		// ivfflat defaults (probes=1) scan 1 of 100 lists and THEN apply the
		// WHERE (date/category/similarity), so filtered searches came back with
		// far fewer neighbours than LIMIT and near-duplicates slipped through
		// clustering. More probes + iterative scan (pgvector >= 0.8) keep
		// scanning until LIMIT is met. Unknown GUCs are only warned about.
		pool.on("connect", (client) => {
			client
				.query(VECTOR_SESSION_SQL)
				.catch((err) =>
					console.warn("[DB] vector session settings skipped:", err.message),
				);
		});

		pool.on("error", (err) => {
			console.error("[DB] Unexpected pool error:", err.message);
		});
	}
	return pool;
}

export async function query<T extends pg.QueryResultRow = any>(
	sql: string,
	params?: any[],
): Promise<pg.QueryResult<T>> {
	const client = getPool();
	return client.query<T>(sql, params);
}

export async function closePool(): Promise<void> {
	if (pool) {
		await pool.end();
		pool = null;
	}
}
