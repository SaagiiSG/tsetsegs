

# Plan: Enhanced Session Booking with Verification Code System

## Overview

Four main changes: (1) bigger session cards with inline seat grids, (2) typed confirmation sentence before booking, (3) 6-digit hex check-in code system for attendance verification, and (4) booking close enforcement (already exists at 1 hour).

---

## 1. Bigger Session Cards with Inline Seat Grids (Scrollable)

**File:** `src/pages/student/StudentBooking.tsx`

- Replace the compact session cards with larger cards that show the seat grid directly inline (no dialog needed to see seats).
- Each session card becomes a full-width expandable/accordion-style card showing: title, date/time, room, available count, and the `SeatGrid` component embedded below.
- Wrap the sessions list in a `ScrollArea` for vertical scrolling.
- Clicking a seat in the inline grid selects it and shows the "Book Seat #X" button directly on the card.
- Remove or simplify the separate seat selection dialog since seats are now visible on the card itself.

## 2. Typed Confirmation Sentence

**File:** `src/pages/student/StudentBooking.tsx`

- In the confirmation dialog, replace the simple warning with a text input where the student must type exactly:
  > "I understand that I am booking #X on DD MMM and not showing to the session will result in 2 week ban from booking review session"
- The "Confirm Booking" button stays disabled until the typed text matches exactly.
- `X` = seat number, `DD MMM` = formatted date (e.g., "15 Mar").

## 3. Check-in Code System (Attendance Verification)

### Database Migration

- Add `check_in_code` column (text, nullable) to `review_sessions` table.
- Add `checked_in_at` column (timestamptz, nullable) to `seat_bookings` table.

### Admin Side

**File:** `src/pages/admin/ReviewSessions.tsx`

- In the Sessions tab, for sessions happening today or are upcoming within the next few hours, show a "Generate Check-in Code" button.
- Generate a random 6-character hex code (e.g., `A3F7B2`), save it to `review_sessions.check_in_code`.
- Display the code prominently so admin can share it with students in the room.

### Student Side - Check-in Widget

**New component:** `src/components/student/CheckInWidget.tsx`

- Query for sessions the student has booked today that haven't been checked in yet.
- If such a session exists, show a widget:
  - **Desktop (sidebar):** A small card at the bottom of `StudentDashboardSidebar` with a hex code input field.
  - **Mobile (top banner):** An announcement-style banner at the top of the screen in `StudentLayout`.
- Student enters the 6-digit hex code. If it matches the session's `check_in_code`, update `seat_bookings.checked_in_at = now()`.
- Success: show a checkmark and "Checked in!" state.

**Files modified:**
- `src/components/student/StudentDashboardSidebar.tsx` - Add widget at bottom of sidebar.
- `src/components/student/StudentLayout.tsx` - Add mobile banner at top.

### Attendance Tab Update

**File:** `src/pages/admin/ReviewSessions.tsx`

- In the attendance tab, show check-in status alongside the manual checkbox. Students who checked in with the code are auto-marked as attended.

## 4. Booking Close (Already Implemented)

The `booking_closes_at` is already set to 1 hour before session start. The UI already checks `isBefore(new Date(session.booking_closes_at), now)` and shows "Closed". No changes needed.

---

## Technical Details

### Migration SQL
```sql
ALTER TABLE public.review_sessions ADD COLUMN check_in_code text;
ALTER TABLE public.seat_bookings ADD COLUMN checked_in_at timestamptz;
```

### Check-in Code Generation
```typescript
const code = Array.from(crypto.getRandomValues(new Uint8Array(3)))
  .map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();
// e.g., "A3F7B2"
```

### Confirmation Text Match
```typescript
const expectedText = `I understand that I am booking #${selectedSeat} on ${format(new Date(selectedSession.session_date), 'd MMM')} and not showing to the session will result in 2 week ban from booking review session`;
const isMatch = confirmText === expectedText;
```

### Files Changed Summary
| File | Change |
|------|--------|
| `src/pages/student/StudentBooking.tsx` | Bigger cards with inline seat grids, typed confirmation |
| `src/components/student/CheckInWidget.tsx` | New - check-in code input widget |
| `src/components/student/StudentDashboardSidebar.tsx` | Add check-in widget at sidebar bottom |
| `src/components/student/StudentLayout.tsx` | Add mobile check-in banner |
| `src/pages/admin/ReviewSessions.tsx` | Add code generation, show check-in status in attendance |
| Migration SQL | Add `check_in_code` and `checked_in_at` columns |

