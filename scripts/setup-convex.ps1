$ErrorActionPreference = 'Stop'
Set-Location (Split-Path $PSScriptRoot -Parent)

if (-not (Test-Path 'convex-secrets.env')) {
  Write-Error 'Missing convex-secrets.env in project root (gitignored).'
  exit 1
}

# npx writes status lines to stderr; with $ErrorActionPreference Stop that becomes a terminating error.
$prevEap = $ErrorActionPreference
$ErrorActionPreference = 'Continue'
$loginOut = (npx convex login status 2>&1 | ForEach-Object { $_.ToString() }) -join "`n"
$ErrorActionPreference = $prevEap
if ($loginOut -match 'Not logged in') {
  if ([Console]::IsInputRedirected) {
    Write-Error @'
Convex is not logged in on this machine, and this shell cannot run interactive login.
In Cursor/VS Code: open the Terminal panel, then run:
  npx convex login
  npm run convex:setup
'@
    exit 1
  }
  Write-Host '>>> Convex: log in (browser or paste token)...'
  npx convex login
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
}

Write-Host '>>> convex dev --once (link + push + codegen)...'
npx convex dev --once --configure=existing --team harkirat-tandon --project civilens
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host '>>> convex env set from convex-secrets.env...'
npx convex env set --from-file convex-secrets.env --force
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host 'Done. Open another terminal and run: npm run dev'
