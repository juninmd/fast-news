param(
  [string]$WorkDir = "$env:TEMP\gh-cleanup-2",
  [string]$ValidateTmpl = "D:\Solutions\pessoal\fast-news\scripts\validate-template.yml",
  [string]$DeployTmpl = "D:\Solutions\pessoal\fast-news\scripts\deploy-template.yml"
)

$validateNew = Get-Content -Path $ValidateTmpl -Raw
$deployContent = Get-Content -Path $DeployTmpl -Raw

$allRepos = @(
  "fast-news","shorts-generator","github-assistance","vibe-code",
  "queima-buchinho","jules-orchestrator","evangelho-do-dia",
  "amazon-site-stripe","brainiac","churras-facil","dinheirama",
  "Gintama-Genius","imoveis-franca","intelbras-guard",
  "meu-livro","meu-livro-2","pac-memory","copilot-master",
  "git-summarizer-ts","ia-know",
  "Repos_Apresentacoes","Repos_Cursos","Repos_Fatec","Repos_UniFacef",
  "zplague-addons","doctor-ai-infra","super-man","surprise","tower-defense",
  "confluence-summarizer","ApexSociety","app-voice-vault","app-tip-splitter",
  "app-decision-roulette","auto-wellhub-checkin","ball-x-pitt","copilot-plus",
  "bunker","de_industrial","detect-wifi","etanol-gasolina","gign",
  "init-vm-ssh","Instagram-Simple-Downloader","jules-extension-vscode",
  "juninmd","KamisamaLoader","mika","my-academy","my-food","n8n-shorts",
  "nova-ai","pobre-lingo","pocket","roadmap-developer","santos-e-beatos",
  "server-do-junin","sherlock","vtuber-ai","warrior-x-horde"
)

# Check which repos have Dockerfile
$hasDocker = @{}
foreach ($r in $allRepos) {
  $r2 = gh api "/repos/juninmd/$r/contents/Dockerfile" --jq '.name' 2>$null
  if ($LASTEXITCODE -eq 0 -and $r2) { $hasDocker[$r] = $true }
}

New-Item -ItemType Directory -Path $WorkDir -Force | Out-Null
$total = $allRepos.Count
$done = 0

foreach ($name in $allRepos) {
  $done++
  Write-Output "[$done/$total] $name ..."
  $rp = "$WorkDir\$name"

  if (Test-Path $rp) { Remove-Item -Recurse -Force $rp }
  $null = gh repo clone "juninmd/$name" $rp -- --depth 1 2>&1
  if (-not (Test-Path "$rp\.git")) { Write-Output "  skip"; continue }

  $changed = $false

  # Write validate.yml (always - it's the simplified version)
  $vp = "$rp\.github\workflows\validate.yml"
  New-Item -ItemType Directory -Path "$rp\.github\workflows" -Force | Out-Null
  Set-Content -Path $vp -Value $validateNew -Encoding UTF8
  $changed = $true

  # Add deploy.yml if Dockerfile exists AND deploy.yml doesn't exist
  if ($hasDocker[$name]) {
    $dp = "$rp\.github\workflows\deploy.yml"
    if (-not (Test-Path $dp)) {
      Set-Content -Path $dp -Value $deployContent -Encoding UTF8
      Write-Output "  +deploy"
    }
  }

  # Also check if deploy.yml already exists (keep it)
  # Remove any non-standard workflow files
  Get-ChildItem -Path "$rp\.github\workflows" -File | Where-Object { $_.Name -ne "validate.yml" -and $_.Name -ne "deploy.yml" } | ForEach-Object {
    Remove-Item -Force $_.FullName
    Write-Output "  -$($_.Name)"
    $changed = $true
  }

  if ($changed) {
    $null = git -C $rp add -A 2>&1
    $null = git -C $rp diff --cached --quiet 2>&1
    if ($LASTEXITCODE -ne 0) {
      $null = git -C $rp commit -m "ci: simplify validate to composite action" --no-verify 2>&1
      $null = git -C $rp push origin HEAD 2>&1
      if ($LASTEXITCODE -eq 0) { Write-Output "  pushed" } else { Write-Output "  PUSH FAIL" }
    } else { Write-Output "  same" }
  } else { Write-Output "  skip" }
}

Write-Output "`n=== DONE ($done repos) ==="
