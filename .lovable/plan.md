# Admin side update — one page at a time

I work through the 10 notes in the "admin side update" collection one at a time. Each page gets built, checked in the preview and shown to you. I only start the next page after you say OK. Each note decides where its change goes: main admin, Tsetsegs workspace, or center admin.

## Order

1. **Dashboard** (this round)
2. Analytics, then Batches + Create batch wizard
3. Student accounts, then SAT schedule
4. Concept videos, then Question bank
5. Registration, Settings, Sprint monitor

## Step 1: Dashboard (main admin, platform overview)

**Top bar**
- The Mongolia/International switcher shows one icon next to the name, not two.

**Header**
- One line: "Platform overview" (bold, glowing) on the left and the "Live" signal on the right. The separate "Dashboard" title goes away.

**Stat cards** (replace the current five)
- **Customers**: number of signed-up centers.
- **Active accounts**: total active student accounts. Hover to see center students vs solo students.
- **ARR / MRR**: worked out from center payment records. Solo revenue shows 0 until there's a paywall.
- **Pending payment**: total unpaid amount and how many bills are unpaid.

**Removed from this page**
- Quick navigation buttons are deleted.
- The current cards, activity heatmap, weak topics, recent classes and at-risk students move to a new **Tsetsegs workspace > Dashboard** page in the sidebar, unchanged.

**New sections**
- **Customer globe**: an interactive globe with a pin for each customer's country, sized by how many students they have.
- **Most active**: a toggle between top customers and top countries, ranked by questions solved this week.
- **Recent payments**: the latest paid bills (customer, amount, date).
- **Overdue payments**: each overdue customer with days late and a warning count.
  - **Send warning** adds a warning and shows a notice on that center admin's dashboard.
  - After 3 warnings, a **Block access** button appears. Blocking locks the whole center portal (admin, teachers and students) until we unblock it. Unblock is one click.

## Technical details

- New columns on `institution_customers`: `payment_warning_count int default 0`, `last_warning_at`, `access_blocked_at`. Only admins can write them, and the change goes through a `SECURITY DEFINER` RPC.
- Center resolution (`centerContext`) shows a "Access paused, contact FlowersOS" screen when `access_blocked_at` is set. `tenant_has_role` also denies access for blocked centers, so the block holds on the server too.
- MRR = sum of the paid dues over the last 30 days. ARR = MRR × 12. Shown in each due's currency (grouped when there is more than one).
- Active accounts = active `tenant_students` + main `student_accounts` that aren't deactivated (counted with `count`, so the 1000-row limit doesn't apply).
- Globe: a lightweight `react-globe.gl`/three globe, using the existing deduped three. Countries are geocoded from `institution_customers.country` through a static centroid map.
- The old dashboard components move into the new `tsetsegs/dashboard` route, and the sidebar gets a "Tsetsegs workspace" section. The center admin sidebar stays in sync where it applies.
- Each page after this gets its own short plan, built from its note, before I build it.
