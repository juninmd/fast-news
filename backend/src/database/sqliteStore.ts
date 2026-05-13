import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = process.env['SQLITE_PATH'] || path.join(__dirname, '../../../data/news_embeddings.db');

let db: Database.Database | null = null;

function cosineSim(a: number[], b: number[]): number {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb);
  return denom === 0 ? 0 : dot / denom;
}

export function getSqliteDb(): Database.Database {
  if (!db) {
    const dir = path.dirname(DB_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.exec(`
      CREATE TABLE IF NOT EXISTS articles (
        id        TEXT PRIMARY KEY,
        guid      TEXT UNIQUE NOT NULL,
        title     TEXT NOT NULL,
        content   TEXT,
        url       TEXT NOT NULL,
        source    TEXT,
        category  TEXT,
        company   TEXT,
        published_at TEXT,
        embedding TEXT,
        indexed_at TEXT DEFAULT (datetime('now'))
      );
      CREATE INDEX IF NOT EXISTS idx_articles_category ON articles(category);
      CREATE INDEX IF NOT EXISTS idx_articles_published ON articles(published_at DESC);
    `);
    console.log('[sqlite] DB ready at', DB_PATH);
  }
  return db;
}

export interface SqliteArticle {
  id: string;
  guid: string;
  title: string;
  content: string;
  url: string;
  source: string;
  category: string;
  company?: string;
  publishedAt?: string;
}

export function upsertArticleToSqlite(article: SqliteArticle, embedding: number[]): void {
  const store = getSqliteDb();
  store.prepare(`
    INSERT INTO articles (id, guid, title, content, url, source, category, company, published_at, embedding)
    VALUES (@id, @guid, @title, @content, @url, @source, @category, @company, @publishedAt, @embedding)
    ON CONFLICT(guid) DO NOTHING
  `).run({
    id: article.id,
    guid: article.guid,
    title: article.title,
    content: article.content || '',
    url: article.url,
    source: article.source || '',
    category: article.category || '',
    company: article.company || null,
    publishedAt: article.publishedAt || null,
    embedding: JSON.stringify(embedding),
  });
}

export interface SearchResult extends SqliteArticle {
  similarity: number;
}

export function searchSimilarInSqlite(queryEmbedding: number[], limit = 10): SearchResult[] {
  const store = getSqliteDb();
  const rows = store.prepare(`
    SELECT id, guid, title, content, url, source, category, company, published_at, embedding
    FROM articles WHERE embedding IS NOT NULL
  `).all() as Array<SqliteArticle & { embedding: string; published_at: string }>;

  const scored = rows.map((row) => {
    const emb: number[] = JSON.parse(row.embedding);
    return { ...row, publishedAt: row.published_at, similarity: cosineSim(queryEmbedding, emb) };
  });

  return scored
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, limit)
    .map(({ embedding: _e, published_at: _p, ...rest }) => rest as SearchResult);
}

export function getSqliteStats(): { total: number; categories: Array<{ category: string; count: number }> } {
  const store = getSqliteDb();
  const total = (store.prepare('SELECT COUNT(*) as c FROM articles').get() as { c: number }).c;
  const categories = store.prepare(
    "SELECT category, COUNT(*) as count FROM articles GROUP BY category ORDER BY count DESC"
  ).all() as Array<{ category: string; count: number }>;
  return { total, categories };
}

export function exportForRAG(limit = 5000): Array<{
  id: string; title: string; content: string; url: string;
  source: string; category: string; publishedAt: string | null; embedding: number[];
}> {
  const store = getSqliteDb();
  const rows = store.prepare(`
    SELECT id, title, content, url, source, category, published_at, embedding
    FROM articles WHERE embedding IS NOT NULL ORDER BY published_at DESC LIMIT ?
  `).all(limit) as Array<{
    id: string; title: string; content: string; url: string;
    source: string; category: string; published_at: string; embedding: string;
  }>;

  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    content: r.content,
    url: r.url,
    source: r.source,
    category: r.category,
    publishedAt: r.published_at,
    embedding: JSON.parse(r.embedding),
  }));
}
