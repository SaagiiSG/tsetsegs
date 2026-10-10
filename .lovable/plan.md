# Center Admin Workspace — parity with the main admin

Give each center admin a full workspace like ours, with a sidebar and the center's own brand. Every page only ever shows that center's data.

## What the center admin will see

A sidebar with the center's logo and name at the top, grouped like our admin:

```text
[Logo] Center name
Overview     Dashboard · Analytics · Class Overview
Batches      All Batches · Create Batch
Students     Search Accounts · Registration Queue
Tools        Search Questions · Sprint Monitor · Announcements
Center       Team · Settings (brand details)
```

- **Dashboard**: student count, active this week, accuracy, attendance rate, upcoming payments and quick actions.
- **Analytics**: accuracy trends, questions answered per day, weak topics, and attendance by class.
- **Class Overview**: today's classes with attendance status, and students who have missed 3 or more classes.
- **All Batches / Create Batch**: the center's classes with teacher, schedule, start date and student count. Create Batch is a form for adding a new class.
- **Search Accounts**: search students by name or phone and open a student page (progress, attendance, reset password, move class, remove access).
- **Registration Queue**: a QR or link sign-up page for each class. New students wait here until the center admin approves them.
- **Search Questions**: the shared question bank (read-only, BBK hidden), using the same search we already have.
- **Sprint Monitor**: weekly points sprints and a leaderboard for that center's students only. The admin can start, pause or finish a sprint.
- **Announcements**: post a message to all students or one class. Students see it on their portal, with a read count.
- **Team**: teachers and admins, with add, deactivate, a role and **New password** (the same flow we just fixed).
- **Settings**: brand name, logo upload, brand color (used for buttons and accents in all three of the center's portals), contact email, time zone and a read-only billing summary.

The teacher and student portals pick up the brand automatically. Students see announcements and the sprint leaderboard.

## Build order

1. The sidebar, Settings (brand) and Team. The current tabs move onto pages.
2. All Batches, Create Batch, Search Accounts and the student detail page.
3. Dashboard, Analytics and Class Overview.
4. Registration Queue, Announcements and Sprint Monitor, plus the student-side views.
5. Test every page with a test center: a center admin cannot see another center's data or our main students.

## Technical details

- Reuse the shared building blocks from our admin (sidebar look, cards, tables, search panel). Do not reuse the main admin pages themselves, because they read the main `batches`/`students` tables. Center pages read only `tenant_*` tables, so isolation holds.
- New tables, all with `institution_id` and RLS through `tenant_has_role` plus platform-admin access:
  - `tenant_registrations` (pending sign-ups, class, token)
  - `tenant_announcements` and `tenant_announcement_reads`
  - `tenant_sprints` and `tenant_sprint_points`
- `institution_customers.portal_settings` (jsonb) stores `logo_url`, `brand_color`, `display_name` and `timezone`. Logos go in a public `center-branding` storage bucket, with uploads restricted to that center's admins.
- The brand color is applied as a CSS variable on the portal root, so dialogs inherit it and the main app is untouched.
- Public registration goes through the `tenant-accounts` function (new `register` action, validated and rate-limited), never direct table access.
- Analytics come from `tenant_attempts` and `tenant_attendance`, using paginated or aggregated reads.
