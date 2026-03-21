

## Plan: QR Onboarding + SAT Countdown Widget + Session Closing Sequence

### Current State

- `/register` page already exists with code validation + form collecting: first/last name, phone, parent phone, math/english level, SAT date, previous SAT history. It inserts into `students` table with `batch_id: null` and `is_review_student: true`.
- `students` table already has `sat_test_month`, `parent_phone`, `math_level`, `english_level` columns.
- SAT countdown on speed mode page uses hardcoded dates, not student's booked SAT.
- `practice_tests` table stores mock scores per student (test_number, score).
- `attendance` table has session_1 through session_24 columns.
- `homework` table tracks completion per session.

---

### 1. QR Onboarding Flow (Batch-Specific Registration)

**Concept**: Teachers generate a QR code link like `/register?batch=<batch_id>` (or use existing registration code system). Students scan, fill out their info, and get auto-assigned to that batch. No more manual teacher data entry.

**Changes to `/register` (ReviewRegistration.tsx)**:
- Accept optional `?batch=<batch_id>` query param alongside the existing code system
- When batch ID is present, skip the code step and go straight to the form
- Auto-set `batch_id` on the student record instead of `null`
- Auto-create a `student_account` record so the student can immediately log in
- Keep existing code-based flow as fallback

**Database migration**:
- Add `onboarding_completed` boolean to `student_accounts` (default false)
- This flags whether the student has gone through first-login onboarding

**New: First-login onboarding modal** (in StudentLayout or practice pages):
- When `student.linked_student?.sat_test_month` is null, show a quick onboarding overlay
- Ask: "When is your SAT?" with date picker from known SAT dates
- Updates the `students.sat_test_month` field
- Only shown once, then marks onboarding complete

### 2. SAT Countdown Widget in Sidebar

**Modify `StudentSidebar.tsx`**:
- Add a compact SAT countdown card below the user info header
- Read `student.linked_student.sat_test_month` from auth context
- Parse the `YYYY-MM` format to calculate days/hours until that SAT date
- Display: "Next SAT: XXd XXh" with a calendar icon
- If no SAT date set, show "Set your SAT date" link that triggers the onboarding question
- Also add it to the practice page layout for mobile (bottom nav area or top banner)

**Remove** the hardcoded `SATCountdown` from `StudentSpeedMode.tsx` (or keep it as secondary).

### 3. Session Closing Sequence (Shareable Report)

**New page**: `src/pages/student/StudentClosingReport.tsx` at `/practice/closing-report/:studentId`

**Also accessible via**: `/closing-report/:token` (public shareable link for parents)

**5-page animated sequence** (SAT students only, skip for IELTS):

1. **Class Stats** - Attendance rate (from `attendance` table), homework completion (from `homework` table), total sessions attended
2. **First Mock Score** - First `practice_tests` entry (test_number = 1, i.e. Practice Test 4)
3. **Highest Score** - Max score from `practice_tests`
4. **Math Improvement** - Delta between first and last math-section scores (needs reading/writing vs math breakdown — the `practice_tests` table doesn't have section breakdown for SAT, only IELTS has listening/reading/writing/speaking. Will use `bluebook_answers` or overall score delta instead)
5. **Thank You** - Branded closing message with share button

**Database migration**:
- Create `closing_report_tokens` table: `id`, `student_id`, `batch_id`, `token` (unique), `created_at`, `expires_at`
- RLS: public SELECT by token, admin/teacher can INSERT

**Shareable**: Generate a unique token, create a public route `/report/:token` that renders the same 5-page sequence without requiring login.

**Route additions in App.tsx**:
- `/practice/closing-report` (inside StudentLayout, authenticated)
- `/report/:token` (public, outside StudentLayout)

**Trigger**: Admin can trigger closing reports for a batch (batch end date or manual). A banner appears on the student's `/practice` page when available.

---

### Technical Details

**Database migrations**:
1. `ALTER TABLE student_accounts ADD COLUMN onboarding_completed boolean DEFAULT false`
2. `CREATE TABLE closing_report_tokens (id uuid PK, student_id uuid REFERENCES students, batch_id uuid REFERENCES batches, token text UNIQUE, created_at timestamptz DEFAULT now(), expires_at timestamptz)`
3. RLS on `closing_report_tokens`: public SELECT where token matches, admin/teacher ALL

**Files to create**:
- `src/pages/student/StudentClosingReport.tsx` — 5-page swipeable/clickable sequence
- `src/pages/PublicClosingReport.tsx` — public wrapper that fetches by token

**Files to modify**:
- `src/pages/ReviewRegistration.tsx` — batch-specific QR flow, auto-create student_account
- `src/components/student/StudentSidebar.tsx` — SAT countdown widget
- `src/components/student/StudentBottomNav.tsx` — SAT countdown for mobile
- `src/components/student/StudentLayout.tsx` — onboarding check modal
- `src/pages/student/StudentSpeedMode.tsx` — remove/replace hardcoded countdown
- `src/App.tsx` — new routes

**Feature flags**: Add `closing_reports` and `qr_onboarding` to feature_flags table.

