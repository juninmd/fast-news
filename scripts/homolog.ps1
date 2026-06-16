# Homologation: capture -> store -> LLM credibility -> Telegram. Logs to homolog.run.log. Idempotent.
$ErrorActionPreference = 'Continue'
$root = 'D:\Solutions\pessoal\fast-news'
$log  = Join-Path $root 'homolog.run.log'
function Step($m){ "[{0}] {1}" -f (Get-Date -Format 'HH:mm:ss'), $m | Tee-Object -FilePath $log -Append }
Set-Content $log "=== HOMOLOG START ==="

# 0) Wait for Docker daemon (Docker Desktop may still be booting)
Step "waiting for docker daemon..."
$dok=$false
for($i=0;$i -lt 60;$i++){ docker info *> $null; if($?){ $dok=$true; break }; Start-Sleep 5 }
if(-not $dok){ Step "DOCKER DAEMON NOT AVAILABLE - aborting"; exit 1 }
Step "docker up"

# 1) Bring up infra via compose (postgres, redis, ollama)
Push-Location $root
docker compose up -d postgres redis ollama *>> $log
Pop-Location
Step "compose up issued"

# 2) Wait postgres ready + ensure vector extension
for($i=0;$i -lt 40;$i++){ docker exec fast-news-postgres pg_isready -U fastnews *> $null; if($?){ break }; Start-Sleep 3 }
docker exec fast-news-postgres psql -U fastnews -d fastnews -c "CREATE EXTENSION IF NOT EXISTS vector;" *>> $log
Step "postgres ready"

# 3) Pull models
Step "pulling models (qwen3:1.7b, nomic-embed-text)..."
docker exec fast-news-ollama ollama pull qwen3:1.7b *>> $log
docker exec fast-news-ollama ollama pull nomic-embed-text *>> $log
Step ("models: " + ((docker exec fast-news-ollama ollama list | Out-String) -replace "`r?`n"," / "))

# 4) Probe ollama OpenAI-compat
try { $m = Invoke-WebRequest -Uri http://localhost:11434/v1/models -TimeoutSec 10; Step ("ollama /v1/models -> " + $m.StatusCode) } catch { Step ("ollama probe FAIL: " + $_.Exception.Message) }

# 5) Run agent one cycle (limit posts during homologation)
Step "running agent one cycle..."
$env:TELEGRAM_MAX_NEWS_PER_RUN = '3'
$env:MAX_ARTICLES_PER_FEED = '5'
Push-Location (Join-Path $root 'backend')
& pnpm exec tsx src/runAgent.ts *>> $log
Step ("agent exited rc=" + $LASTEXITCODE)
Pop-Location

# 6) DB validation
docker exec fast-news-postgres psql -U fastnews -d fastnews -c "SELECT count(*) AS total, count(fake_news_score) AS evaluated, count(telegram_sent_at) AS telegram_sent FROM news_articles;" *>> $log
docker exec fast-news-postgres psql -U fastnews -d fastnews -c "SELECT left(title,60) title, source, fake_news_score, telegram_sent_at FROM news_articles WHERE telegram_sent_at IS NOT NULL ORDER BY telegram_sent_at DESC LIMIT 5;" *>> $log
Step "=== HOMOLOG DONE ==="
