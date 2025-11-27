# Data sync script for Windows
# Usage: .\sync-data.ps1 -Action [push|pull|watch]

param(
    [Parameter(Mandatory=$true)]
    [ValidateSet("push", "pull", "watch")]
    [string]$Action
)

$RepoDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$DataDir = "data"

Set-Location $RepoDir

switch ($Action) {
    "push" {
        # Push local changes to remote
        git add "$DataDir/"
        $changes = git diff --cached --name-only "$DataDir/"
        if ($changes) {
            $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
            git commit -m "sync: [auto-sync data $timestamp]"
            git push origin main
            Write-Host "Data pushed to remote" -ForegroundColor Green
        } else {
            Write-Host "No changes to push" -ForegroundColor Yellow
        }
    }
    
    "pull" {
        # Pull remote changes
        git stash push -m "temp-stash" -- "$DataDir/" 2>$null
        git pull origin main
        git stash pop 2>$null
        Write-Host "Data pulled from remote" -ForegroundColor Green
    }
    
    "watch" {
        # Watch for changes and auto-sync every 30 seconds
        Write-Host "Starting data sync watcher (Ctrl+C to stop)..." -ForegroundColor Cyan
        while ($true) {
            try {
                # Pull first
                git pull origin main 2>$null
                
                # Then push if there are changes
                git add "$DataDir/"
                $changes = git diff --cached --name-only "$DataDir/"
                if ($changes) {
                    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
                    git commit -m "sync: [auto-sync data $timestamp]"
                    git push origin main
                    Write-Host "[$timestamp] Data synced" -ForegroundColor Green
                }
                
                Start-Sleep -Seconds 30
            } catch {
                Write-Host "Sync error: $_" -ForegroundColor Red
                Start-Sleep -Seconds 30
            }
        }
    }
}
