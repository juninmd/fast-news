-- One-off: merge the duplicated tracked_topics rows left by old boots (see schema.sql).
-- Analyses move to the oldest copy of each name, so no analysis is lost.
-- Run outside the app (no 15s pool timeout):
--   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f backend/scripts/dedupe-tracked-topics.sql
BEGIN;
SET LOCAL statement_timeout = 0;
SET LOCAL lock_timeout = '30s';
SELECT pg_advisory_xact_lock(hashtext('fast-news:tracked_topics_seed'));
LOCK TABLE tracked_topics IN SHARE ROW EXCLUSIVE MODE;

CREATE TEMP TABLE tracked_topic_keep ON COMMIT DROP AS
  SELECT id, first_value(id) OVER (PARTITION BY name ORDER BY created_at, id) AS keep_id
  FROM tracked_topics;
DELETE FROM tracked_topic_keep WHERE id = keep_id;

UPDATE ai_analyses a SET topic_id = k.keep_id
  FROM tracked_topic_keep k WHERE a.topic_id = k.id;
DELETE FROM tracked_topics t USING tracked_topic_keep k WHERE t.id = k.id;

SELECT count(*) AS topics_left, count(DISTINCT name) AS distinct_names FROM tracked_topics;
COMMIT;
