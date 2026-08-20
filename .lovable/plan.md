# Mock Tests tab in the teacher practice hub

Add a fifth tab, **Mocks**, next to Browse / Live Session / Test / Flagged so teachers can see exactly which mock tests students can take, and preview the actual questions.

## What teachers will see

**Tab list**
- Every published mock test (the same ones students see under practice tests), newest first.
- Per test: name, month/year label, published badge, section make-up (Reading & Writing / Math modules), total questions, total time in minutes.
- Filters at the top: section (all / math / english) and year, matching the student-side filtering so a teacher can find the same test a student mentions.
- Empty state when nothing is published yet.

**Preview**
- "Preview" on a test opens the existing student-style test preview (module switcher, question navigator, figures, passages, answer choices, show/hide answer toggle) inside the teacher page — read-only, no attempt is recorded.
- A back action returns to the mock list.

Unpublished drafts stay out of this tab; publishing remains an admin action, so this tab is read-only by design.

## Technical notes

- New `src/components/teacher/practice/mocks/TeacherMocksTab.tsx`: queries `bluebook_tests` where `is_published = true` plus aggregated `bluebook_modules` / `bluebook_module_questions` counts (same shape as the student list query). No new tables, RPCs, or policies — existing SELECT policies already allow reading published tests, their modules, and module questions.
- Make `src/components/admin/bluebook/StudentTestPreview.tsx` reusable: accept optional `testId` and `onBack` props, falling back to the current route param and admin navigation when they are absent. Existing admin route behaviour is unchanged.
- Register the tab in `TeacherPracticeHub.tsx` (grid becomes 5 columns) with a `FileText` icon, and keep it working on mobile widths.
- No changes to student-facing mock flow, scoring, or attempts.
