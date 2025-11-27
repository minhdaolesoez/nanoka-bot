#!/bin/bash
# Data sync script - Run on each server
# Usage: ./sync-data.sh [push|pull|watch]

DATA_DIR="data"
REPO_DIR="$(dirname "$0")"

cd "$REPO_DIR"

case "$1" in
    push)
        # Push local changes to remote
        git add "$DATA_DIR/"
        git diff --cached --quiet "$DATA_DIR/" || {
            git commit -m "sync: [auto-sync data $(date '+%Y-%m-%d %H:%M:%S')]"
            git push origin main
            echo "Data pushed to remote"
        }
        ;;
    
    pull)
        # Pull remote changes
        git stash push -m "temp-stash" -- "$DATA_DIR/" 2>/dev/null
        git pull origin main
        git stash pop 2>/dev/null || true
        echo "Data pulled from remote"
        ;;
    
    watch)
        # Watch for changes and auto-sync every 30 seconds
        echo "Starting data sync watcher..."
        while true; do
            # Pull first
            git pull origin main 2>/dev/null
            
            # Then push if there are changes
            git add "$DATA_DIR/"
            git diff --cached --quiet "$DATA_DIR/" || {
                git commit -m "sync: [auto-sync data $(date '+%Y-%m-%d %H:%M:%S')]"
                git push origin main
            }
            
            sleep 30
        done
        ;;
    
    *)
        echo "Usage: $0 [push|pull|watch]"
        echo "  push  - Push local data changes to remote"
        echo "  pull  - Pull data changes from remote"
        echo "  watch - Auto-sync every 30 seconds"
        exit 1
        ;;
esac
