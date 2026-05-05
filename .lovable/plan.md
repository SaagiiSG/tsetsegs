# Add 4 Standalone Lectures with QR Booking + Check-In

Create 4 one-off lectures, each with its own course record, public booking page (unique URL + QR), and admin check-in tab. Hex check-in code flow stays identical to NGEE.

## The 4 lectures (all 18:20–20:00, Room same as NGEE)

| Date | Lecture (MN) |
|---|---|
| May 8 | Сэтгэл зүйч мэргэжилийн тухай |
| May 13 | Үерхлийн хил хязгаар |
| May 20 | College Application явуулах зөвлөгөө |
| May 27 | Сэтгэцийн эрүүл мэндээ анхаарах зөвлөгөө |

## 1. Database (data only, no schema change)

For each lecture, insert one row in `ngee_courses` and one row in `ngee_sessions`:

- `ngee_courses`: `name = "<MN title>"`, `is_active = true`, `start_date = <lecture date>`, `start_time = 18:20`, `end_time = 20:00`, `weekdays = {<that single weekday>}`, `total_seats = 25`, `room` = same as the existing NGEE course, `booking_opens_hour = 8`, `booking_closes_hours_before = 1`.
- `ngee_sessions`: one row per course on the lecture date at 18:20 Asia/Ulaanbaatar, `booking_opens_at = now()` (open immediately so you can test), `booking_closes_at = session_date - 1h`, `total_seats = 25`.

(Skip `generate_ngee_sessions` — we insert the single session directly so no extra weekly sessions are created.)

## 2. Public booking page — `src/pages/public/NGEEBooking.tsx`

Currently the route `/ngee/:courseId` exists but `courseId` is ignored — it always loads the first active course. Change the course query:

- Read `useParams<{ courseId?: string }>()`.
- If `courseId` provided → `select * from ngee_courses where id = courseId` (no `is_active` filter so old lectures still resolve their old QR).
- Else → current behaviour (first active NGEE course) for backwards compatibility with `/ngee`.

Sessions query already filters by `course_id`, so it just works. The header line "Wed & Fri • …" should be replaced with a generic line built from the loaded course (`format(weekdays) • start–end • Room X`) so lecture pages don't say "Wed & Fri".

## 3. Admin page — `src/pages/admin/NGEEAdmin.tsx`

Add a course switcher at the top so the same admin screen handles NGEE + each lecture:

- Query all `ngee_courses where is_active = true` ordered by start_date.
- Add a `Select` (or pill row) labeled "Course" above the session picker. Default = NGEE course (first by created_at) so existing flow is unchanged.
- All downstream queries (sessions, bookings, check-in by code, QR) re-key on the selected course id.
- QR / public link becomes `https://flowersos.co/ngee/<courseId>` instead of `/ngee`. The "Copy link" + QR dialog use this dynamic URL.
- Header shows the selected course's name + schedule.

Result: from `/admin/ngee` admin can pick any of the 5 courses (NGEE + 4 lectures), see that course's sessions, accept hex check-in codes, and grab the QR for printing/sharing.

## 4. Check-in flow

No changes needed. `ngee_check_in_by_code(p_session_id, p_code)` already scopes by session, and the trigger `ngee_validate_and_codegen` generates a unique 4-char hex per booking per session. Each lecture's session is independent so codes can repeat across lectures without collision.

## Out of scope

- No recurring schedule for lectures (one-off only). If you later want to repeat any of them, just insert another `ngee_sessions` row for the same `course_id`.
- No SMS / reminders.
- No edits to `SeatGrid` or the booking form.

## Files touched

- `supabase/migrations/<new>.sql` — `INSERT` 4 courses + 4 sessions (data seed via migration is fine here since it's idempotent with `ON CONFLICT DO NOTHING` on a new `slug`-style key… actually we'll just guard with `WHERE NOT EXISTS (… name = …)`).
- `src/pages/public/NGEEBooking.tsx` — read `:courseId`, dynamic header.
- `src/pages/admin/NGEEAdmin.tsx` — course selector, dynamic public URL.
