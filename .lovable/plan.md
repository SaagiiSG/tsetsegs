

## Seat Booking System for Review Sessions

### What We're Building
A complete seat booking system where:
- **Admin** creates review session schedules (reusable as templates/presets), sets seat count per session
- **Students** book seats via a movie-theatre-style visual grid
- **Auto-close** bookings 1 hour before session start
- **No-show penalty**: 2-week booking ban for students who book but don't attend

### Database Schema (4 new tables)

**1. `review_session_templates`** — Reusable schedule presets
- `id`, `name`, `subject` (text), `total_seats` (int), `room` (text), `session_times` (jsonb — array of day/time combos like `[{day: "Saturday", time: "14:00"}]`), `is_active` (bool), `created_by` (uuid), `created_at`

**2. `review_sessions`** — Individual scheduled sessions (generated from templates or created manually)
- `id`, `template_id` (FK nullable), `title`, `subject`, `session_date` (timestamptz), `total_seats` (int), `room`, `booking_closes_at` (timestamptz, auto = session_date - 1hr), `is_active` (bool), `created_at`

**3. `seat_bookings`** — Student reservations
- `id`, `review_session_id` (FK), `student_account_id` (FK), `seat_number` (int), `booked_at` (timestamptz default now()), `attended` (bool nullable — null=pending, true=came, false=no-show), `cancelled_at` (timestamptz nullable)
- Unique constraint on `(review_session_id, seat_number)` where `cancelled_at IS NULL` (partial unique index)

**4. `booking_bans`** — No-show penalties
- `id`, `student_account_id` (FK), `banned_until` (timestamptz), `reason` (text), `created_at`

### RLS Policies
- **Templates**: Admin full CRUD; public SELECT for active ones
- **Sessions**: Admin full CRUD; public SELECT for active ones
- **Bookings**: Admin ALL; public can INSERT/SELECT/UPDATE (book, view, cancel their own)
- **Bans**: Admin ALL; public SELECT (students check own ban)

### Admin Side

**New page: `/admin/review-sessions`** (added to Tools section in sidebar)

1. **Templates Tab** — Create/edit schedule templates (name, subject, room, seats, recurring day/time patterns). Save as reusable presets. "Generate Sessions" button to bulk-create individual sessions from a template for a date range.

2. **Sessions Tab** — View all upcoming/past sessions. Shows booking count vs total seats. Can also create one-off sessions manually.

3. **Attendance Tab** — After a session ends, admin sees list of booked students with checkboxes. Click "Finalize Attendance" → unchecked students get marked as no-shows → auto-creates `booking_bans` entries (14 days).

### Student Side

**New page: `/practice/booking`** (added to sidebar/bottom nav)

1. Shows upcoming review sessions with seat availability
2. Ban check — if student has active ban, show message with countdown timer
3. Booking closed check — if `booking_closes_at` has passed, disable booking
4. **Seat grid** — Visual movie-theatre layout (rows x columns). Taken seats greyed out, available seats clickable. Student picks a seat → confirms → booking created
5. "My Bookings" section — upcoming and past bookings with cancel option (before close time)

### Files to Create
- `src/pages/admin/ReviewSessions.tsx` — main admin page with Templates/Sessions/Attendance tabs
- `src/components/admin/ReviewSessionTemplateForm.tsx` — template create/edit form
- `src/components/admin/ReviewSessionAttendance.tsx` — post-session attendance marking
- `src/pages/student/StudentBooking.tsx` — student booking page
- `src/components/student/SeatGrid.tsx` — visual seat grid component

### Files to Modify
- `src/App.tsx` — add routes
- `src/components/admin/AdminSidebar.tsx` — add "Review Sessions" to Tools section
- `src/components/student/StudentBottomNav.tsx` or `StudentSidebar.tsx` — add booking nav item
- Database migration for 4 tables + RLS + partial unique index

### No-Show Flow
```text
Session ends → Admin opens Attendance tab → Sees booked students
→ Checks "attended" for students who came → Clicks "Finalize"
→ Unchecked = no-show → booking_bans entry (banned_until = now + 14 days)
→ Banned students see countdown on booking page
```

