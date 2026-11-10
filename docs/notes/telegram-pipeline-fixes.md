# Fast News Telegram Pipeline Fixes

## Issues Identified & Fixed

### 1. **Queue Worker Synchronization (CRITICAL)**
**Problem**: Queue processors were registered asynchronously without proper synchronization. When `runIngestionAndPost()` started, articles could be enqueued before the Bull queue processors were fully initialized, causing jobs to be lost.

**Files Changed**:
- `backend/src/services/ollamaQueue.ts`
- `backend/src/services/telegramQueue.ts`
- `backend/src/runners/runIngestion.ts`

**Changes**:
1. Added `processorReady` flag to track initialization state
2. Ensured `process()` handlers are registered and ready before returning from `startOllamaQueueWorker()` and `startTelegramQueueWorker()`
3. Added 100ms buffer after processor registration to allow Bull time to initialize
4. Updated runner to log worker startup progress and ensure full initialization before starting ingestion

### 2. **Enhanced Logging & Debugging**
**Files Changed**:
- `backend/src/services/telegramQueue.ts`
- `backend/src/jobs/ingestionJob.ts`

**Changes**:
- Added detailed logging for enqueued article count
- Added error details when articles fail to enqueue
- Added log for fetched unsent evaluated articles count

### 3. **K8s CronJob Configuration**
**Problem**: CronJobs lacked `imagePullSecrets` for pulling container images from GHCR.

**Files Changed**:
- `app-charts/fast-news/cronjobs.yaml`

**Changes**:
- Added `imagePullSecrets` with `ghcr-pull-secret` to all three CronJob pods (ingestion, learning, digest)

## Pipeline Flow Verification

### K8s CronJob → Runner → Queue Workers → Telegram

1. **K8s CronJob** (runs every 15 minutes)
   - Executes `node dist/runners/runIngestion.js`

2. **Runner** (`backend/src/runners/runIngestion.ts`)
   - Initializes PostgreSQL connection ✅
   - Initializes Redis connection ✅
   - **Starts OllamaQueue worker** (credibility analysis) ✅ NOW SYNCHRONIZED
   - **Starts TelegramQueue worker** (posting to Telegram) ✅ NOW SYNCHRONIZED
   - Runs ingestion: fetches articles, stores them, enqueues for credibility
   - Waits for OllamaQueue to drain (credibility analysis completes)
   - Waits for TelegramQueue to drain (Telegram posts complete)

3. **OllamaQueue Worker** (`backend/src/services/ollamaQueue.ts`)
   - Processes credibility analysis for new articles
   - Enriches articles with fake_news_score, political_bias, credibility_flags
   - Enqueues enriched articles to TelegramQueue

4. **TelegramQueue Worker** (`backend/src/services/telegramQueue.ts`)
   - Processes articles and posts to configured Telegram chat IDs
   - Updates `telegram_sent_at` timestamp on articles
   - Rate-limited to 1 message every 2.5 seconds (avoids Telegram throttle)

## Configuration Verification

### Environment Variables Required in K8s CronJob

The `app-charts/fast-news/cronjobs.yaml` includes:
- ✅ `TELEGRAM_ENABLED=true`
- ✅ `TELEGRAM_BOT_TOKEN` (from secret)
- ✅ `TELEGRAM_CHAT_IDS` (from secret)
- ✅ `TELEGRAM_NEWS_CATEGORIES` (whitelist)
- ✅ `TELEGRAM_MAX_NEWS_PER_RUN=5`
- ✅ `OLLAMA_BASE_URL` → LiteLLM proxy
- ✅ `OLLAMA_EMBEDDING_BASE_URL` → Native Ollama (no /v1 suffix)
- ✅ Redis URL with password
- ✅ Database URL with credentials

### Main App Configuration

The main app deployment (`app-charts/fast-news/deployment.yaml`):
- ✅ `ENABLE_INTERNAL_CRONS=false` (correct — crons run as K8s CronJobs)
- ✅ Telegram queues still initialize as workers (for webhook mode)

## Testing

### Manual Test
```bash
# Check recent Telegram posts
cd fast-news && node temp/check_telegram.js

# Expected output:
# Recent Telegram posts (last 15m): [count]
# Latest 5 Telegram posts:
#   2026-05-30T00:XX:XXXZ | score=X | [article title...]
```

### K8s Test
```bash
# Trigger manual CronJob run
kubectl create job --from=cronjob/fast-news-ingestion fast-news-ingestion-manual -n fast-news

# Watch pod logs
kubectl logs -f -n fast-news job/fast-news-ingestion-manual -c ingestion

# Expected log sequence:
# [Runner] Starting ingestion...
# [Runner] Starting Ollama credibility queue worker...
# [OllamaQueue] Credibility worker started and ready (concurrency: 2).
# [Runner] Starting Telegram posting queue worker...
# [TelegramQueue] Worker started and ready.
# [Runner] Queue workers ready. Starting ingestion...
# [ingestion] Starting news ingestion...
# [IngestionJob] Requeued X unevaluated articles for Ollama.
# [IngestionJob] Queued X previously-evaluated articles for Telegram.
# [OllamaQueue] Credibility done for [article-id] (score: X)
# [TelegramQueue] Job [article-id] completed.
# [TelegramQueue] Enqueued X articles for Telegram posting.
# [Runner] Completed ingestion in XXXms
```

## Deployment

1. **Rebuild Docker image** (if not auto-built):
   ```bash
   docker build -t ghcr.io/juninmd/fast-news:latest -f backend.Dockerfile .
   docker push ghcr.io/juninmd/fast-news:latest
   ```

2. **Apply K8s changes**:
   ```bash
   kubectl apply -f app-charts/fast-news/
   # or rely on ArgoCD auto-sync
   ```

3. **Verify CronJob is running**:
   ```bash
   kubectl get cronjob -n fast-news
   kubectl get jobs -n fast-news --sort-by=.metadata.creationTimestamp | tail -5
   ```

## Rollback

If issues occur after deployment:
1. Revert the three TypeScript files to previous commit
2. Revert cronjobs.yaml changes (remove imagePullSecrets)
3. Rebuild and push Docker image
4. Allow K8s/ArgoCD to pull the previous image

