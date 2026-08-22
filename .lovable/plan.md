# Keyword Question Search (Admin, Teacher, Student)

One shared keyword search over the whole question bank, surfaced in three places with role-appropriate rules.

## What gets searched

Matches against question text, answer choices, and question ID across every set — CB (435), EXT (2,024), ANP (120), 68, BBK (218), and the English sets. Filters available in all three surfaces: subject (Math/English), question set, difficulty, category.

## The three surfaces

**Admin — new page `/admin/question-search`**
- Sees everything, including BBK and inactive/hidden questions, with a set badge on each result.
- Result opens the existing admin question editor for that question.
- Sidebar entry under the question-bank area.

**Teacher — new "Search" tab in the Practice hub**
- Sees everything except BBK (consistent with BBK being hidden from teacher browse today).
- Result opens the existing read-only `TeacherQuestionViewer` with next/prev through the result list.

**Student — new page `/practice/search`**
- Excludes BBK and anything flagged hidden from practice; only active questions.
- Tapping a result opens it in the normal practice solver, so it counts for points and progress exactly like any other practice question.
- Added to the practice sidebar, the iPad dock, and the quick-nav sheet (Cmd+K) so it is reachable on every device.

## Behaviour

- Typing is debounced; short queries (under 2 characters) return nothing rather than dumping the bank.
- Results are capped per page with "load more" so large matches stay fast.
- Matching keyword is highlighted in the result snippet.
- Empty state explains the filters in effect (e.g. "practice-test questions are not searchable").

## Technical notes

- New shared hook `useQuestionSearch(query, filters, scope)` where `scope` is `admin | teacher | student`; the scope decides the BBK / `hide_from_practice` / `is_active` predicates so the student rule can never be bypassed from the UI.
- Search runs as a single Postgres query using `or(question_text.ilike, question_id.ilike, choice_a…d.ilike)` on `questions`, ordered by `question_id`, page size 60.
- A trigram index (`pg_trgm` GIN on `question_text`) is added via migration so `ilike '%…%'` over ~4k rows stays fast; a migration approval will appear for that.
- New files: `src/hooks/useQuestionSearch.ts`, `src/components/questions/QuestionSearchPanel.tsx` (shared UI), `src/pages/admin/QuestionSearch.tsx`, `src/components/teacher/practice/search/TeacherQuestionSearchTab.tsx`, `src/pages/student/StudentQuestionSearch.tsx`.
- Edits: `src/pages/Admin.tsx` + admin sidebar (route/link), `TeacherPracticeHub.tsx` (6th tab), `src/App.tsx` (student route), `StudentDashboardSidebar.tsx`, `StudentSidebar.tsx`, `StudentIPadDock.tsx`, `PracticeCommandSheet.tsx`.
- Student results reuse the existing practice solver route so attempt/points logic is untouched.
