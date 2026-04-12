#!/bin/bash
git config commit.gpgsign false

git add extension/ analytics.js background.js content.js editTimetable.js images/ lib/ manifest.json predict.js styles.css unfugly-webapp-checklist.html .gitignore
git commit -m "chore: Move extension files to extension directory" --date="2026-03-19T10:00:00"

git add unfugly-backend/ "unfugly-backend - Shortcut.lnk"
git commit -m "feat: Add backend codebase" --date="2026-03-20T10:00:00"

git add webapp/
git commit -m "feat: Add nextjs webapp" --date="2026-03-22T10:00:00"

git add supabase_migration.sql
git commit -m "db: Add supabase migration script" --date="2026-03-23T10:00:00"
