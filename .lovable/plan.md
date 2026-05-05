## National Generalized Entrance Exam (NGEE) — Public Seat Booking + Hex Check-In

A standalone, **public** booking system for the new NGEE course (taught via the YouTube channel). No student account required. Students scan a QR → fill name + phone → pick a seat → receive a unique **hex check-in code**. On the day of class, the teacher enters the hex code in their panel to mark the student present.

This is intentionally separate from the existing `review_sessions` / `seat_bookings` system (which requires a `student_account_id`).

### Course details (seeded)
- Course name: **National Generalized Entrance Exam (NGEE)**
- Room: **1105**
- Schedule: **Wed & Fri, 16:30 – 18:00**
- Total seats: **25**
- First session: **tomorrow**
- Booking window per session: **opens 08:00 day-of, closes 14:30 (2 h before start)**

---

### 1. Database (new tables, isolated)

`public.ngee_courses`
- `id`, `name`, `room`, `total_seats` (default 25)
- `weekdays int[]` (e.g. `{3,5}`)
- `start_time time` (16:30), `end_time time` (18:00)
- `start_date date`, `is_active bool`
- `booking_opens_hour int` (default 8), `booking_closes_hours_before int` (default 2)

`public.ngee_sessions` (auto-generated instances)
- `id`, `course_id`, `session_date timestamptz`, `session_end_date timestamptz`
- `booking_opens_at timestamptz`, `booking_closes_at timestamptz`
- `total_seats int`, `is_cancelled bool`

`public.ngee_bookings`
- `id`, `session_id` → ngee_sessions
- `first_name text`, `last_name text`, `phone text` (normalized to +976)
- `seat_number int`
- `check_in_code text NOT NULL` — short hex (e.g. 4 chars uppercase, ~65k space; unique per session)
- `attended bool DEFAULT false`, `checked_in_at timestamptz`, `checked_in_by text`
- `booked_at`, `cancelled_at`
- Partial unique indexes:
  - one active seat per session
  - one active booking per phone per session
  - unique `check_in_code` per session

**RLS**
- `ngee_courses`, `ngee_sessions`: public SELECT (active only); admin manage.
- `ngee_bookings`:
  - Public INSERT (booking) — BEFORE INSERT trigger validates `now()` is between `booking_opens_at` and `booking_closes_at`, and seat is in range. Trigger also generates the hex code.
  - **No public SELECT of full rows** — names/phones/codes must stay private. Instead expose:
    - View `ngee_session_taken_seats(session_id, seat_number)` → public SELECT (powers the seat grid).
    - RPC `lookup_my_booking(phone, session_id)` → returns the caller's own booking (used on success screen + self-cancel).
  - Admin + teacher: full SELECT/UPDATE.
  - RPC `check_in_by_code(session_id, code)` (SECURITY DEFINER) — teachers/admins call this to flip `attended=true`. Returns the booking row on success.

**Hex code generation** (trigger):
- 4 uppercase hex chars (`A1F3`, `7BC2`, …). Retry up to 5× on collision within session.
- Easy to read aloud; ~65k unique codes per session is way more than 25 seats.

**Session generation**: SQL function `generate_ngee_sessions(course_id uuid, weeks_ahead int)` — inserts upcoming Wed/Fri rows for the next N weeks based on weekdays + times. Idempotent (skips existing dates). Run on seed and re-runnable from admin.

---

### 2. Public booking page (no auth)

Route: `/ngee/:courseId` (QR target)

Flow (3 taps max):
1. Land → see next upcoming session at top + tabs/dropdown for other sessions. Seat grid (`<SeatGrid />`) below.
2. Tap a seat → modal with **First name / Last name / Phone** (zod: name 1–50, phone normalized; +976 default).
3. Tap **Confirm** → insert + show **success screen**:
   - Big seat number
   - **Big hex code** in JetBrains Mono (e.g. `A1F3`)
   - "Show this code to the teacher when you arrive" (Mongolian + English)
   - Session date / time / room 1105
   - "Save / screenshot" hint, "Add to calendar" link
   - "Cancel my booking" (uses phone to look up)

Edge states:
- Booking not yet open → countdown to 08:00.
- Booking closed → "Closed 2h before session" (greyed grid).
- Phone already booked for the session → show their existing seat + hex code.
- Seat just taken (race) → "Just taken, pick another".
- Session full → message + show next available session.

Mobile-first, brand colors (coral / indigo), Chillax headers, JetBrains Mono for seat # and hex code.

---

### 3. Teacher / admin panel

New route: `/admin/ngee` (and `/teacher/ngee` if teachers need it). Added to `menuSections.ts` under **Tools** as "NGEE Course" (Armchair icon) and surfaced in the mobile MoreSheet automatically.

Tabs:

**a. Today's Check-In** (default tab — the most-used screen)
- Big input: "Enter hex code" (auto-uppercases, 4 chars, autofocus, mobile numeric/text keyboard).
- On submit → calls `check_in_by_code` RPC → shows green flash with student name, seat #, time → ready for next code.
- Live attendance counter: `12 / 25 checked in`.
- Recent check-ins list (last 10) with undo within 30 s.
- Errors: "Code not found", "Already checked in at HH:MM" (still surfaces who).

**b. Sessions**
- List upcoming + past sessions (booked / total, status: Open / Closed / Done).
- Per session: View bookings, Cancel session, "Regenerate next 8 weeks".

**c. Bookings (per session)**
- Table: name, phone, seat #, hex code, booked_at, attended toggle, cancel.
- Search by name/phone/code. CSV export.

**d. Course settings**
- Room, total seats, weekdays/times, booking window. Edits apply only to **future** generated sessions.
- "Copy public link" + "Show QR" (inline `qrcode` lib) — admin grabs the QR PNG to put in YouTube video / pinned comment.

---

### 4. Seeding (one-time, in the migration)

- Insert one `ngee_courses` row with the details above.
- Call `generate_ngee_sessions(course_id, 12)` so the next ~12 weeks of Wed/Fri sessions exist immediately, including tomorrow's.

---

### Files to add / change

**Migration**
- `supabase/migrations/<ts>_ngee_booking.sql` — tables, RLS, view, trigger (hex + window validation), RPCs, generator function, seed.

**New pages / components**
- `src/pages/public/NGEEBooking.tsx` — public booking page.
- `src/components/ngee/NGEEBookingForm.tsx` — name/phone modal.
- `src/components/ngee/NGEEBookingSuccess.tsx` — hex code success screen.
- `src/pages/admin/NGEEAdmin.tsx` — wraps the 4 tabs.
- `src/components/admin/ngee/NGEECheckInTab.tsx`
- `src/components/admin/ngee/NGEESessionsList.tsx`
- `src/components/admin/ngee/NGEEBookingsTable.tsx`
- `src/components/admin/ngee/NGEECourseSettings.tsx`
- `src/components/admin/ngee/NGEEQRDialog.tsx`

**Modified**
- `src/App.tsx` — add public `/ngee/:courseId` route (outside ProtectedRoute) and `/admin/ngee`.
- `src/components/admin/menuSections.ts` — add "NGEE Course" entry under Tools.

Reuses: `<SeatGrid />`, existing UI primitives, react-query patterns from `StudentBooking.tsx`, brand tokens.

---

### Open defaults (will use unless told otherwise)

1. Hex length: **4 uppercase chars** (easy to say aloud). Switch to 6 if you want more entropy.
2. Phone normalization: **+976 Mongolia** (matches rest of platform).
3. Self-cancel: **enabled** until `booking_closes_at`, identified by phone.
4. Public link: **per course** (one QR for the whole NGEE channel).