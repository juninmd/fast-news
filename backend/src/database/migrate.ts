import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { getPool } from './client.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function migrate(): Promise<void> {
  const pool = getPool();
  const schemaPath = join(__dirname, 'schema.sql');
  const sql = readFileSync(schemaPath, 'utf-8');

  console.log('[migrate] Running schema migration...');
  try {
    await pool.query(sql);
    console.log('[migrate] Migration completed successfully.');
  } catch (err) {
    console.error('[migrate] Migration failed:', err);
    throw err;
  } finally {
    await pool.end();
  }
}

migrate().catch((err) => {
  console.error(err);
  process.exit(1);
});
