param(
  [string]$WorkDir = "$env:TEMP\gh-cleanup",
  [string]$ValidateTmpl = "D:\Solutions\pessoal\fast-news\scripts\validate-template.yml",
  [string]$DeployTmpl = "D:\Solutions\pessoal\fast-news\scripts\deploy-template.yml"
)

$validateContent = Get-Content -Path $ValidateTmpl -Raw
$deployContent = Get-Content -Path $DeployTmpl -Raw

# All repos with workflows, grouped by action
$repos = @(
  # Has deploy.yml + validate.yml already → upgrade validate
  @{Name="fast-news";         Branch="main";   Del=@(); NeedsDeploy=$false},
  @{Name="shorts-generator";  Branch="master"; Del=@(); NeedsDeploy=$false},
  @{Name="github-assistance"; Branch="master"; Del=@(); NeedsDeploy=$false},
  @{Name="vibe-code";         Branch="main";   Del=@(); NeedsDeploy=$false},
  @{Name="queima-buchinho";   Branch="master"; Del=@(); NeedsDeploy=$false},
  @{Name="jules-orchestrator";Branch="master"; Del=@(); NeedsDeploy=$false},
  @{Name="evangelho-do-dia";  Branch="master"; Del=@(".github/workflows/README.md"); NeedsDeploy=$false},
  @{Name="amazon-site-stripe";Branch="master"; Del=@(); NeedsDeploy=$false},
  @{Name="brainiac";          Branch="master"; Del=@(); NeedsDeploy=$false},
  @{Name="churras-facil";     Branch="master"; Del=@(); NeedsDeploy=$false},
  @{Name="dinheirama";        Branch="master"; Del=@(); NeedsDeploy=$false},
  @{Name="doctor-ai-infra";   Branch="main";   Del=@(); NeedsDeploy=$false},
  @{Name="Gintama-Genius";    Branch="master"; Del=@(); NeedsDeploy=$false},
  @{Name="imoveis-franca";    Branch="master"; Del=@(); NeedsDeploy=$false},
  @{Name="intelbras-guard";   Branch="master"; Del=@(); NeedsDeploy=$false},
  @{Name="meu-livro";         Branch="master"; Del=@(); NeedsDeploy=$false},
  @{Name="meu-livro-2";       Branch="master"; Del=@(); NeedsDeploy=$false},
  @{Name="super-man";         Branch="main";   Del=@(); NeedsDeploy=$false},
  @{Name="surprise";          Branch="master"; Del=@(); NeedsDeploy=$false},
  @{Name="tower-defense";     Branch="main";   Del=@(); NeedsDeploy=$false},
  @{Name="pac-memory";        Branch="main";   Del=@(); NeedsDeploy=$false},
  # Has only validate.yml, needs deploy.yml too
  @{Name="copilot-master";    Branch="master"; Del=@(); NeedsDeploy=$true},
  @{Name="git-summarizer-ts"; Branch="main";   Del=@(); NeedsDeploy=$true},
  @{Name="ia-know";           Branch="master"; Del=@(); NeedsDeploy=$true},
  # Has only validate.yml, no deploy needed
  @{Name="Repos_Apresentacoes";Branch="master";Del=@(); NeedsDeploy=$false},
  @{Name="Repos_Cursos";      Branch="master"; Del=@(); NeedsDeploy=$false},
  @{Name="Repos_Fatec";       Branch="master"; Del=@(); NeedsDeploy=$false},
  @{Name="Repos_UniFacef";    Branch="master"; Del=@(); NeedsDeploy=$false},
  @{Name="zplague-addons";    Branch="master"; Del=@(); NeedsDeploy=$false}
)

New-Item -ItemType Directory -Path $WorkDir -Force | Out-Null
$count = 0
$total = $repos.Count

foreach ($r in $repos) {
  $count++
  $name = $r.Name
  $branch = $r.Branch
  $repoPath = "$WorkDir\$name"
  
  Write-Output "[$count/$total] $name ..."

  if (Test-Path $repoPath) { Remove-Item -Recurse -Force $repoPath }
  $null = gh repo clone "juninmd/$name" $repoPath -- --depth 1 -b $branch 2>&1
  if (-not (Test-Path "$repoPath\.git")) { Write-Output "  SKIP (clone fail)"; continue }

  $changed = $false

  # Delete extra files
  foreach ($f in $r.Del) {
    $fp = "$repoPath\$f"
    if (Test-Path $fp) { Remove-Item -Force $fp; Write-Output "  DEL $f"; $changed = $true }
  }

  # Upgrade validate.yml
  $vp = "$repoPath\.github\workflows\validate.yml"
  if (Test-Path $vp) {
    $oldContent = Get-Content -Path $vp -Raw
    $hash = [System.Security.Cryptography.SHA256]::Create().ComputeHash([System.Text.Encoding]::UTF8.GetBytes($oldContent))
    $oldHash = [System.BitConverter]::ToString($hash) -replace '-',''
    $newHash = [System.BitConverter]::ToString([System.Security.Cryptography.SHA256]::Create().ComputeHash([System.Text.Encoding]::UTF8.GetBytes($validateContent))) -replace '-',''
    if ($oldHash -ne $newHash) {
      Set-Content -Path $vp -Value $validateContent -Encoding UTF8 -NoNewline
      Write-Output "  UPD validate.yml"
      $changed = $true
    } else { Write-Output "  OK validate.yml" }
  } else {
    New-Item -ItemType Directory -Path "$repoPath\.github\workflows" -Force | Out-Null
    Set-Content -Path $vp -Value $validateContent -Encoding UTF8 -NoNewline
    Write-Output "  ADD validate.yml"
    $changed = $true
  }

  # Add deploy.yml if needed
  if ($r.NeedsDeploy) {
    $dp = "$repoPath\.github\workflows\deploy.yml"
    if (-not (Test-Path $dp)) {
      Set-Content -Path $dp -Value $deployContent -Encoding UTF8 -NoNewline
      Write-Output "  ADD deploy.yml"
      $changed = $true
    } else { Write-Output "  OK deploy.yml" }
  }

  if ($changed) {
    $null = git -C $repoPath add -A 2>&1
    $null = git -C $repoPath diff --cached --quiet 2>&1
    if ($LASTEXITCODE -ne 0) {
      $null = git -C $repoPath commit -m "ci: standardize workflows" --no-verify 2>&1
      $null = git -C $repoPath push origin $branch 2>&1
      if ($LASTEXITCODE -eq 0) { Write-Output "  PUSH ok" } else { Write-Output "  PUSH FAIL" }
    } else { Write-Output "  no changes" }
  } else { Write-Output "  no changes" }
}

Write-Output "`n=== ALL $total DONE ==="
