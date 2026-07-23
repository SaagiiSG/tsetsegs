## Goal

Skip archival for now (we're at 37% disk, no emergency). Instead, give admins a self-serve **Database Health** tool inside the admin panel so you can check status any time without pinging me.

## What it shows

A single admin page that surfaces the same metrics we just looked at, in plain language:

- Database size (e.g. "2.60 GB")
- Data disk usage (%) with a colored bar — green <70%, amber 70–85%, red >85%
- Memory usage (%) with the same bar
- Active connections (used / max)
- Pooler clients (used / max)
- WAL (write-ahead log) size
- Restarts since boot, rolled-back transactions since boot, deadlocks, OOM kills
- Cloud lifecycle status (Active / Restarting / Paused, etc.)

Plus a **Top 15 tables by size** section (name + pretty size + row count) so you can see at a glance which tables are growing.

Each metric has a one-line plain-English explanation on hover ("WAL is the write-ahead log — Postgres's crash-recovery buffer; large values are fine unless they keep growing").

At the bottom: a "Last refreshed at HH:MM" timestamp and a **Refresh** button. No auto-polling (cheap to open, cheap to leave alone).

## How it works

Two admin-only edge functions:

1. `admin-db-health` — calls the same underlying health snapshot + cloud status, returns a JSON blob.
2. `admin-db-table-sizes` — runs a read-only query on `pg_class` / `pg_stat_user_tables` for the top 15 tables in `public` with size + row estimate.

Both functions:
- Require a valid Supabase JWT
- Verify the caller has the `admin` role via `has_role(auth.uid(), 'admin')` before returning anything
- Return a clear 403 for non-admins

No new tables, no new secrets, no schema changes.

## UI

- New route: `/admin/database-health`
- New sidebar entry under the admin section: **"Database Health"** with a database icon
- Component: `src/pages/admin/DatabaseHealth.tsx`
- Sub-components:
  - `HealthMetricCard.tsx` — label, value, colored bar, tooltip explanation
  - `TableSizesList.tsx` — sortable list, largest first
- Matches the existing admin panel styling (semantic tokens, no hardcoded colors)

## Files to add

- `supabase/functions/admin-db-health/index.ts`
- `supabase/functions/admin-db-table-sizes/index.ts`
- `src/pages/admin/DatabaseHealth.tsx`
- `src/components/admin/health/HealthMetricCard.tsx`
- `src/components/admin/health/TableSizesList.tsx`
- Route + sidebar entry updates in the admin layout / router

## Out of scope (deliberately)

- No archival to S3
- No log pruning
- No auto-alerts (can be a follow-up if you want a Slack/SMS ping when disk >85%)

That's it — a read-only observability panel so you can watch the trend yourself.
