import pg from 'pg';
import { config } from '../config/env.js';

const { Pool } = pg;

let pool: pg.Pool | null = null;

export function getPool(): pg.Pool {
  if (!pool) {
    pool = new Pool({
      connectionString: config.databaseUrl,
      max: 10,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 5_000,
      query_timeout: 15_000,      // abort query if Postgres hangs >15s
      statement_timeout: 15_000,  // server-side timeout
    });

    pool.on('error', (err) => {
      console.error('[DB] Unexpected pool error:', err.message);
    });
  }
  return pool;
}

export async function query<T extends pg.QueryResultRow = any>(
  sql: string,
  params?: any[]
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
