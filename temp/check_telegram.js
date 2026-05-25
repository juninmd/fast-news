const { Pool } = require("pg");
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function check() {
  const recent = await pool.query(
    `SELECT COUNT(*) as c FROM news_articles 
     WHERE telegram_sent_at IS NOT NULL 
     AND telegram_sent_at > NOW() - INTERVAL '15 minutes'`
  );
  console.log("Recent Telegram posts (last 15m):", recent.rows[0].c);

  const latest = await pool.query(
    `SELECT id, title, telegram_sent_at, fake_news_score 
     FROM news_articles 
     WHERE telegram_sent_at IS NOT NULL 
     ORDER BY telegram_sent_at DESC LIMIT 5`
  );
  console.log("\nLatest 5 Telegram posts:");
  latest.rows.forEach(r => 
    console.log(`  ${r.telegram_sent_at.toISOString()} | score=${r.fake_news_score} | ${r.title.slice(0,70)}`)
  );

  await pool.end();
}

check().catch(e => { console.error(e); process.exit(1); });
