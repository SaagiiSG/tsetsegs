## Goal
Transform the single-page QR registration form (`/student-register?...`) into a friendly, multi-step onboarding sequence in Mongolian (with English translations), adapting to whether the batch is a SAT or IELTS course.

## New sequence (one screen per step, with Back/Next + progress bar)

1. **Welcome** — "Тавтай морил, Tsetsegs SAT Prep!" / "Welcome to Tsetsegs" + teacher name pulled from the batch (e.g. "Багш: Enguun"). Big Next button.
2. **Name** — First name + Last name (labels bilingual: "Нэр / First name", "Овог / Last name").
3. **Phone numbers** — Student phone (8 digits, "Утасны дугаар / Phone number") + Parent phone ("Эцэг эхийн утас / Parent phone"). Parent name stays here too (already collected today).
4. **School & Grade** — Grade dropdown (7–12) + School name text field.
5. **Level** —
   - SAT batches: Math level + English level (Beginner / Intermediate / Advanced).
   - IELTS batches: English level only.
6. **Prior test experience** — "Та өмнө нь SAT/IELTS өгсөн үү?" Yes / No.
   - If **Yes** → next screen: previous score input + planned next test date (month/year).
   - If **No** → next screen: planned first test date (month/year).
7. **Finish** — "Амжилт хүсье! / Good luck on your journey" + return-to-login button. Submit happens here.

## Course-type awareness
- The QR link already carries a batch (`unique_link_id`). Load the batch once on mount; use `course_type` to decide SAT vs IELTS wording and whether to show the Math-level step.
- Show teacher name on the Welcome screen from `batches.teacher`.

## Data model
Add nullable columns to `registration_requests` so the extra answers persist and reviewers can see them:
- `first_name`, `last_name`, `parent_phone`, `grade`, `school`, `math_level`, `english_level`, `has_taken_test` (bool), `previous_score` (int), `planned_test_date` (text, "YYYY-MM").
- Keep existing `full_name` populated as `first_name + ' ' + last_name` for backward compatibility with the review screens.
- Migration includes the required GRANTs (already granted on this table; re-assert to be safe).

Reviewer screens (`ReviewRegistration`, `ReviewRegistrationAdmin`, `teacher/ReviewRegistrationContent`) get a small read-only "Details" section showing the new fields — no workflow changes.

## Files to change
- `src/pages/StudentRegistration.tsx` — rewrite as a stepper (local `step` state 0–6, shared `formData`, per-step validation, progress bar, Back/Next, bilingual labels, course-type branching).
- New: `src/components/registration/steps/*` — one small component per step to keep the page readable (`WelcomeStep`, `NameStep`, `PhoneStep`, `SchoolStep`, `LevelStep`, `PriorTestStep`, `FutureTestStep`, `FinishStep`).
- New migration: add the columns above to `registration_requests`.
- Light additions to the three Review\* files to render the new fields.

## UX details
- Progress bar at top ("Алхам 3 / 7").
- Enter key advances; Back preserves data.
- All validation happens per step so users can't advance with bad input; final submit only fires on the Finish step.
- Existing "already registered / already pending / rejected" states remain and short-circuit at Step 3 (phone) once the phone is entered, so we don't waste the user's time filling later steps.
- Keep the current gradient background + GraduationCap header for brand consistency.

## Out of scope
- No changes to teacher/admin approval logic itself.
- No changes to how batches are created or how QR links are generated.
- No SMS trigger changes.