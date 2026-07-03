# Auto-backup: commits and pushes any pending changes to GitHub.
# Runs silently; only acts when there is something to commit.
Set-Location "C:\Users\itata\Matadora-business"

$status = git status --porcelain
if ([string]::IsNullOrWhiteSpace($status)) {
    exit 0
}

git add -A
git commit -m "auto-backup: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" | Out-Null
git push origin main 2>&1 | Out-Null
