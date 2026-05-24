$validateContent = @"
name: Validate

on:
  pull_request:

concurrency:
  group: validate-\${{ github.ref }}
  cancel-in-progress: true

jobs:
  validate:
    name: PR Validation
    runs-on: ubuntu-latest
    timeout-minutes: 5
    steps:
      - uses: actions/checkout@v6

      - name: Check for committed secrets
        run: |
          forbidden=\$(git ls-files | grep -E '(^|\/)\.env\$|(^|\/)\.env\.(local|production|prod|staging|dev)\$|(^|\/)id_rsa\$|(^|\/).+\.pem\$|(^|\/).+\.key\$' || true)
          if [ -n "\$forbidden" ]; then
            echo "Secret files tracked: \$forbidden"
            exit 1
          fi
          echo "No committed secrets found."
"@

$deployContent = @"
name: Deploy

on:
  push:
    branches:
      - main
      - master

concurrency:
  group: deploy-\${{ github.ref }}
  cancel-in-progress: true

jobs:
  deploy:
    name: Build and Push Docker Image
    runs-on: ubuntu-latest
    timeout-minutes: 20
    permissions:
      contents: read
      packages: write
    steps:
      - uses: actions/checkout@v6

      - name: Build and Push to GHCR
        uses: juninmd/base-actions/docker-build-push@main
        with:
          image-name: \${{ github.repository }}
          github-token: \${{ secrets.GITHUB_TOKEN }}
"@

$validateB64 = [System.Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes($validateContent))
$deployB64 = [System.Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes($deployContent))

$repos = @(
  @{Name="vibe-kanban"; Branch="master"; Files=@("codeql.yml","project-health.yml","standard.yml"); NeedsDeploy=$true}
  @{Name="copilot-master"; Branch="master"; Files=@("bump-marketplace-version.json"); NeedsDeploy=$false}
  @{Name="git-summarizer-ts"; Branch="main"; Files=@("ci.yml.bak","ci.yml.disabled"); NeedsDeploy=$false}
  @{Name="ia-know"; Branch="master"; Files=@("project-health.yml","update-papers.yml"); NeedsDeploy=$false}
  @{Name="pac-memory"; Branch="main"; Files=@("project-health.yml","publish-ia-know-papers.yml"); NeedsDeploy=$false}
  @{Name="patriota-vscode-theme"; Branch="master"; Files=@("preview.yml.disabled","release.yml.disabled","test.yml.disabled"); NeedsDeploy=$false}
  @{Name="Ping-Hermano"; Branch="master"; Files=@("ci.yml"); NeedsDeploy=$false}
  @{Name="Repos_Apresentacoes"; Branch="master"; Files=@("project-health.yml"); NeedsDeploy=$false}
  @{Name="Repos_Cursos"; Branch="master"; Files=@("project-health.yml"); NeedsDeploy=$false}
  @{Name="Repos_Fatec"; Branch="master"; Files=@("project-health.yml"); NeedsDeploy=$false}
  @{Name="Repos_UniFacef"; Branch="master"; Files=@("project-health.yml"); NeedsDeploy=$false}
  @{Name="zplague-addons"; Branch="master"; Files=@("amxx_compile.yml"); NeedsDeploy=$false}
)

foreach ($r in $repos) {
  $name = $r.Name
  $branch = $r.Branch
  Write-Output "`n=== $name ==="

  # 1. Delete old files
  foreach ($f in $r.Files) {
    $sha = gh api "/repos/juninmd/$name/contents/.github/workflows/$f" --jq '.sha' 2>$null
    if ($sha) {
      Write-Output "  Deleting $f ..."
      $null = gh api -X DELETE "/repos/juninmd/$name/contents/.github/workflows/$f" -f message="cleanup: remove obsolete workflow $f" -f sha="$sha" -f branch="$branch" 2>$null
      if ($LASTEXITCODE -eq 0) { Write-Output "    OK" } else { Write-Output "    FAILED" }
    } else {
      Write-Output "  $f not found"
    }
  }

  # 2. Ensure validate.yml exists
  $vsha = gh api "/repos/juninmd/$name/contents/.github/workflows/validate.yml" --jq '.sha' 2>$null
  if (-not $vsha) {
    Write-Output "  Creating validate.yml ..."
    $null = gh api -X PUT "/repos/juninmd/$name/contents/.github/workflows/validate.yml" -f message="ci: add standard validate workflow" -f content="$validateB64" -f branch="$branch" 2>$null
    if ($LASTEXITCODE -eq 0) { Write-Output "    OK" } else { Write-Output "    FAILED" }
  } else {
    Write-Output "  validate.yml exists"
  }

  # 3. Create deploy.yml if needed
  if ($r.NeedsDeploy) {
    $dsha = gh api "/repos/juninmd/$name/contents/.github/workflows/deploy.yml" --jq '.sha' 2>$null
    if (-not $dsha) {
      Write-Output "  Creating deploy.yml ..."
      $null = gh api -X PUT "/repos/juninmd/$name/contents/.github/workflows/deploy.yml" -f message="ci: add standard deploy workflow" -f content="$deployB64" -f branch="$branch" 2>$null
      if ($LASTEXITCODE -eq 0) { Write-Output "    OK" } else { Write-Output "    FAILED" }
    } else {
      Write-Output "  deploy.yml exists"
    }
  }
}

Write-Output "`n=== ALL DONE ==="
