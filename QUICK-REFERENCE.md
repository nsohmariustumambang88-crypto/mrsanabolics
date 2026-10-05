# Database Cleanup - Quick Reference

## One-Line Summary
**Remove non-essential data to prevent free database quota issues. Saves 50-70% storage.**

---

## Copy These Scripts to Any Project

### Setup
```bash
mkdir -p scripts
cp cleanup-database.mjs scripts/
cp export-database-data.mjs scripts/

# Add to package.json:
"db:cleanup": "node scripts/cleanup-database.mjs",
"db:export": "node scripts/export-database-data.mjs"
```

---

## Quick Commands

| Command | Purpose |
|---------|---------|
| `npm run db:size` | Show database size per table |
| `npm run db:cleanup -- --dry-run` | Preview what will be deleted |
| `npm run db:export reviews` | Backup reviews before delete |
| `npm run db:cleanup -- --apply` | Actually delete unnecessary data |

---

## What Gets Deleted

| ❌ Delete | 💾 Keep |
|-----------|---------|
| reviews (move to JSON) | products |
| page_views (use Analytics) | orders |
| visitors (use Analytics) | contacts |
| search_queries | customers |
| | subscribers |

---

## Typical Results

**Before:** 5+ MB → **After:** 2-3 MB (50% savings)

**Free Tier Quota Status:**
- Supabase: 500 MB → 2.6 MB = **99.5% safe** ✅
- Neon: 3 GB → 2.6 MB = **99.9% safe** ✅

---

## Quickstart (3 Steps)

```bash
# 1. Preview
npm run db:cleanup -- --dry-run

# 2. Export backup (optional)
npm run db:export reviews

# 3. Execute
npm run db:cleanup -- --apply
```

---

## For Different Projects

### E-Commerce (Orders, Reviews)
```bash
npm run db:export reviews      # Backup first
npm run db:cleanup -- --apply  # Delete from DB
```

### SaaS (Events, Logs)
```bash
# Identify non-essential tables in DB
# Update cleanup script with table names
npm run db:cleanup -- --apply
```

### Chat/Messaging (Message History)
```bash
# Archive messages >90 days
DELETE FROM chat_messages WHERE created_at < NOW() - '90 days'::interval;
npm run db:cleanup -- --apply
```

---

## When to Use

- ✅ Database size > 250 MB (free tier)
- ✅ Quota warning received
- ✅ Before new project launch
- ✅ Monthly maintenance
- ✅ After high-traffic period

---

## Before You Run

```bash
# 1. Check environment
echo $DATABASE_URL        # Should show your DB URL
echo $NEON_DATABASE_URL   # For Neon backup

# 2. Backup critical data
npm run db:export reviews

# 3. Test with dry-run first
npm run db:cleanup -- --dry-run

# 4. Then apply
npm run db:cleanup -- --apply
```

---

## Monitoring

```bash
# Check size after cleanup
npm run db:size

# Expected: 50% reduction
```

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| `DATABASE_URL not set` | `echo $DATABASE_URL` to check |
| No `scripts/` folder | `mkdir -p scripts/` |
| Permission denied | `chmod +x scripts/*.mjs` |
| Table not found | Check table names in cleanup script |

---

## File Locations

```
Your Project/
├── scripts/
│   ├── cleanup-database.mjs      ← Copy this
│   └── export-database-data.mjs  ← Copy this
├── backups/                       ← Exports go here
│   ├── reviews.json
│   ├── page_views.json
│   └── visitors.json
├── public/data/                   ← Or put JSON here
│   └── reviews.json
└── package.json                   ← Add scripts here
```

---

## Environment Variables Needed

```bash
# .env file
DATABASE_URL="postgresql://user:pass@host/db"

# Optional (for Neon backup)
NEON_DATABASE_URL="postgresql://..."
```

---

## Estimated Savings

| Project Type | Before | After | Savings |
|--------------|--------|-------|---------|
| E-Commerce | 5 MB | 2.5 MB | 50% |
| SaaS | 500 MB | 50 MB | 90% |
| Startup | 100 MB | 20 MB | 80% |

---

## Support

**For MrAnabolics specifically:**
- See: DATABASE-OPTIMIZATION-GUIDE.md
- See: DATABASE-OPTIMIZATION-SUMMARY.md

**For your other projects:**
- Copy cleanup scripts to `/scripts`
- Follow "Quickstart" section above
- Adapt table names to your schema

---

**Last Updated:** October 2, 2026  
**Status:** ✅ Ready to Use
