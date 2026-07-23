## 1. Database Health "failed to send request"

Root cause confirmed: the `admin-db-health` edge function returns **HTTP 404 NOT_FOUND** — it exists in the repo but was never deployed. The `supabase.functions.invoke('admin-db-health')` call therefore fails at the network layer.

Fix:
- Add a `[functions.admin-db-health]` block to `supabase/config.toml` with `verify_jwt = false` (we validate the bearer manually inside the function) so Lovable auto-deploys it.
- No code changes to the function itself — it already validates the caller via `has_role`.

## 2. "Failed to create custom problem"

Root cause: in `BluebookQuestionSelector.tsx`, the fill-in-blank branch inserts `question_type: "fill_in"`, but the DB check constraint is `question_type IN ('multiple_choice','fill_blank')`. Any fill-in submission is rejected. Multiple-choice submissions likely fail for a second reason too: `subject` is set to the module's raw `"english"` / `"math"` string with no validation, and the `.select().single()` after insert throws generically when RLS/constraints reject.

Fix:
- Map the UI's `"fill_in"` state to the DB value `"fill_blank"` on insert.
- Surface the real error message in the toast (`toast.error(error.message)`) instead of a generic string, so future failures are debuggable.
- Ensure `answer` is trimmed and, for MC, is one of `A/B/C/D`; ensure options are non-empty before hitting the DB.

## 3. Redesigned "Add Questions" page

Replace the current modal (`BluebookQuestionSelector` dialog) with a dedicated full page for editing a module's question list.

Route: `/admin/bluebook/edit/:testId/module/:moduleId`

Layout (desktop / iPad):

```text
+------------------------------------------------------------+
| ← Back to test        Module: Math Module 1   [Save]        |
+---------------------------------------+--------------------+
|  Prepared questions list (main)       |  Filters (sidebar) |
|  - search bar                         |  Section type      |
|  - table: ID | preview | subject |    |  Month             |
|    difficulty | [+ Add] / [Remove]    |  Year              |
|  - shows every question available     |  Variant           |
|    (subject-scoped to this module),   |  Difficulty        |
|    with an "Added" badge for ones     |  [Reset filters]   |
|    already in this module             |                    |
+---------------------------------------+--------------------+
|  Current module questions (reorderable, remove buttons)     |
+------------------------------------------------------------+
```

Behavior:
- Right sidebar holds Section type (auto-locked to this module's section), Month, Year, Variant, plus Difficulty — all optional filters that narrow the list below.
- Main area lists every prepared question matching the filters, paginated (50 per page). Each row has a `+ Add` button that appends it to the module immediately; already-added rows show a `Remove` button instead.
- Bottom strip shows the module's current ordered questions with drag-to-reorder and remove.
- Keep the existing custom-question flow accessible via a "Create new question" button that opens the current form in a side sheet (with the fill_blank fix from #2).
- The old modal is removed from `BluebookTestBuilder`; the `Add Questions` button on each `BluebookModuleCard` navigates to the new route instead.

Notes on Month/Year/Variant filtering: `bluebook_tests` already stores `test_month`, `test_year`, `variant`. `questions` does not have those fields, so these filters will scope by looking up questions previously used in bluebook tests matching those attributes (via `bluebook_module_questions → bluebook_modules → bluebook_tests`). If a filter set yields zero matches, the UI falls back to "no results, clear filters" — never silently ignores the filter.

## Technical file touches

- `supabase/config.toml` — add function block for `admin-db-health`.
- `src/components/admin/bluebook/BluebookQuestionSelector.tsx` — map `fill_in → fill_blank`, surface real error.
- `src/components/admin/bluebook/BluebookTestBuilder.tsx` — replace modal open with `navigate()` to new route.
- `src/components/admin/bluebook/BluebookModuleCard.tsx` — same navigation change.
- New: `src/pages/admin/BluebookModuleEditor.tsx` — the redesigned page.
- `src/pages/admin/BluebookManager.tsx` — register the new nested route.

No database migration needed.