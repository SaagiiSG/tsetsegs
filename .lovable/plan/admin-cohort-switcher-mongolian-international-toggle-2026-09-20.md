# Admin Cohort Switcher: Mongolian / International Toggle

## Goal
A dropdown in the top-right of the admin header that flips the entire admin panel between the Mongolian and International worlds. Only dev admin accounts see it. Regular admins always see Mongolian data exactly as today.

Decisions locked in:
- Scope: everything that can be cohort-filtered switches — dashboard stats, overview, batches, student accounts, student search, sprint monitor.
- The separate `/admin/international` page and its menu item are removed; the toggle is the single way to view international data.
- The choice is remembered across sessions (saved in the browser).

## How it works

```text
Dev admin header:  [ Sidebar | DEV MODE            🇲🇳 Mongolian ▾ ]
                                                   🌍 International
                          │
              AdminCohortContext ('mn' | 'intl', localStorage-backed)
                          │
   ┌──────────┬───────────┼───────────┬──────────────┬─────────────┐
 Dashboard  Overview   Batches    Student Accts   Search      Sprint Monitor
 (stats,    (batch     (list +    (accounts      (students   (active sprint,
  activity,  cards)     create)    filtered)      filtered)   leaders by cohort)
  leaders,
  at-risk)
```

- Regular admins and teachers: no dropdown, context forced to `'mn'` — behavior identical to today (international data already hidden from them).
- Dev in "Mongolian" mode: sees only Mongolian batches/students (today the dev sees everyone mixed — this tightens it so the two worlds never mix on screen).
- Dev in "International" mode: every list, count, and stat shows the international cohort only.
- Question bank, question search, announcements, NGEE, bug reports, bluebook, settings stay shared/global — questions and content have no cohort.

## Work breakdown

### 1. Cohort context + header dropdown
- `src/contexts/AdminCohortContext.tsx`: holds `'mn' | 'intl'`, persisted to `localStorage`, exposes `cohort` and `setCohort`. Non-dev accounts are always forced to `'mn'` regardless of the saved value (defense in depth — a saved `'intl'` never leaks to a regular admin).
- `src/components/admin/CohortSwitcher.tsx`: compact dropdown (flag + label) rendered in the admin header, dev-only.
- Wire into `src/pages/Admin.tsx` desktop header (top-right) and `src/components/admin/mobile/MobileAdminShell.tsx` header so it works on mobile too.

### 2. Convert existing "exclude international" filters to "filter by selected cohort"
These currently hard-exclude intl for non-devs and show everything for devs; they now filter by the context cohort instead:
- `BatchesView.tsx` — `.eq('is_international', cohort === 'intl')`; drop the `internationalOnly` prop usage.
- `useAdminDashboard.ts` — recent batches by cohort flag; sprint queries use the context cohort (currently hardcoded `'mn'`); student-attempt-based stats (active today, weekly attempts, accuracy, heatmap, topic accuracy, solved count) filtered to accounts of the selected cohort; at-risk list filtered by account cohort.
- `StudentAccountsManagement.tsx` and `questions/StudentsTab.tsx` — filter by `student_accounts.cohort` = selected cohort (both dev and non-dev).
- `src/pages/admin/StudentSearch.tsx` — replace the "exclude intl ids" logic with a positive filter: in mn mode exclude intl-batch students, in intl mode show only intl-batch students.
- `SprintMonitor.tsx` — its internal cohort selector (currently local state defaulting to `'mn'`) follows the context.
- `BatchOverview.tsx` — batch list filtered by the cohort flag.

### 3. Remove the old International page
- Delete `src/pages/admin/InternationalView.tsx`, its route in `Admin.tsx`, and the "International" item in `menuSections.ts`.
- The searchable intl student table from that page is already covered by the switched Students/Search/Batches views.

### 4. Query freshness
- All affected react-query keys get the cohort appended so switching the toggle refetches instead of showing stale cached data.

## Edge cases handled
- Refresh while in International mode: restored from localStorage, dev-only check runs first.
- A dev's saved "intl" choice can never affect a regular admin: the context ignores the saved value for non-devs.
- Dashboard in International mode with tiny cohort: stats simply show small numbers / zeros — no special empty states needed.
- Ghost students remain hidden everywhere regardless of cohort.

## Technical notes
- No database changes — everything rides on existing `batches.is_international` and `student_accounts.cohort` columns.
- Activity stats join `student_attempts` → `student_accounts.cohort`; with the small intl cohort this stays fast.
- Files touched: ~10 components/hooks + 1 new context + 1 new switcher component.
