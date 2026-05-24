$validateTemplate = Get-Content -Path "D:\Solutions\pessoal\fast-news\scripts\validate-template.yml" -Raw
$deployTemplate = Get-Content -Path "D:\Solutions\pessoal\fast-news\scripts\deploy-template.yml" -Raw

$validateB64 = [System.Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes($validateTemplate))
$deployB64 = [System.Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes($deployTemplate))

$repos = @(
  @{Name="vibe-kanban"; Branch="master"; Files=@("codeql.yml","project-health.yml","standard.yml"); NeedsDeploy=$true},
  @{Name="copilot-master"; Branch="master"; Files=@("bump-marketplace-version.json"); NeedsDeploy=$false},
  @{Name="git-summarizer-ts"; Branch="main"; Files=@("ci.yml.bak","ci.yml.disabled"); NeedsDeploy=$false},
  @{Name="ia-know"; Branch="master"; Files=@("project-health.yml","update-papers.yml"); NeedsDeploy=$false},
  @{Name="pac-memory"; Branch="main"; Files=@("project-health.yml","publish-ia-know-papers.yml"); NeedsDeploy=$false},
  @{Name="patriota-vscode-theme"; Branch="master"; Files=@("preview.yml.disabled","release.yml.disabled","test.yml.disabled"); NeedsDeploy=$false},
  @{Name="Ping-Hermano"; Branch="master"; Files=@("ci.yml"); NeedsDeploy=$false},
  @{Name="Repos_Apresentacoes"; Branch="master"; Files=@("project-health.yml"); NeedsDeploy=$false},
  @{Name="Repos_Cursos"; Branch="master"; Files=@("project-health.yml"); NeedsDeploy=$false},
  @{Name="Repos_Fatec"; Branch="master"; Files=@("project-health.yml"); NeedsDeploy=$false},
  @{Name="Repos_UniFacef"; Branch="master"; Files=@("project-health.yml"); NeedsDeploy=$false},
  @{Name="zplague-addons"; Branch="master"; Files=@("amxx_compile.yml"); NeedsDeploy=$false}
)

foreach ($r in $repos) {
  $name = $r.Name
  $branch = $r.Branch
  Write-Output "--- $name ---"

  foreach ($f in $r.Files) {
    $sha = gh api "/repos/juninmd/$name/contents/.github/workflows/$f" --jq '.sha' 2>$null
    if ($sha) {
      $null = gh api -X DELETE "/repos/juninmd/$name/contents/.github/workflows/$f" -f message="cleanup: remove obsolete workflow" -f sha="$sha" -f branch="$branch" 2>$null
      if ($LASTEXITCODE -eq 0) { Write-Output "  DEL $f" } else { Write-Output "  FAIL $f" }
    }
  }

  $vsha = gh api "/repos/juninmd/$name/contents/.github/workflows/validate.yml" --jq '.sha' 2>$null
  if (-not $vsha) {
    $null = gh api -X PUT "/repos/juninmd/$name/contents/.github/workflows/validate.yml" -f message="ci: add validate workflow" -f content="$validateB64" -f branch="$branch" 2>$null
    if ($LASTEXITCODE -eq 0) { Write-Output "  ADD validate.yml" } else { Write-Output "  FAIL validate.yml" }
  } else {
    Write-Output "  KEEP validate.yml"
  }

  if ($r.NeedsDeploy) {
    $dsha = gh api "/repos/juninmd/$name/contents/.github/workflows/deploy.yml" --jq '.sha' 2>$null
    if (-not $dsha) {
      $null = gh api -X PUT "/repos/juninmd/$name/contents/.github/workflows/deploy.yml" -f message="ci: add deploy workflow" -f content="$deployB64" -f branch="$branch" 2>$null
      if ($LASTEXITCODE -eq 0) { Write-Output "  ADD deploy.yml" } else { Write-Output "  FAIL deploy.yml" }
    } else {
      Write-Output "  KEEP deploy.yml"
    }
  }
}

Write-Output "=== DONE ==="
