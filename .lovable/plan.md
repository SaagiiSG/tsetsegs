# Streak-Break Devastation Animation + Friend Request Notifications

## 1. Devastating streak-break animation

### Detection
Right now the streak system only fires `streak:extended`. We need a `streak:broken` signal.

- Add `dispatchStreakBroken({ lostStreak })` inside `src/hooks/useStudentStreak.ts` (`updateStudentStreak`) in the existing `daysSince > 1` branch where `newCurrentStreak = 1; isNew = true;` — dispatch with `streak.current_streak` (the run that just died) if it was ≥ 2 and no freezer saved it.
- Also handle "app opened after the streak silently died" (student hasn't practiced yet, so no update runs):
  - In `useStudentStreak`, when `streak` loads, compute `isSilentlyBroken` = `last_activity_date` exists, previous `current_streak >= 2`, `differenceInDays(today, last_activity_date) > 1`, and (`freezers_available === 0` or diff > 2).
  - Track `sessionStorage['streak-broken-shown:<studentId>']` so it only fires once per session per student, and only if the previous stored `current_streak` in `localStorage['last-known-streak:<studentId>']` was ≥ 2.
- Every successful `dispatchStreakExtended` also writes the new streak into `localStorage['last-known-streak:<studentId>']` so the "silent break" branch has a baseline.

### New event + listener
- Constant `STREAK_BROKEN_EVENT = 'streak:broken'` (colocated with `STREAK_EXTENDED_EVENT`).
- New component `src/components/student/StreakBrokenOverlay.tsx`:
  - Listens for `streak:broken` and mounts a full-screen fixed overlay (z-[80]).
  - Sequence (framer-motion, ~3.5s total, dismissable by tap or auto-close):
    1. **Frame collapse** — 4 dark bars slide in from each edge (top/right/bottom/left) then close inward like a shutter, dimming the viewport to near-black with a red vignette.
    2. **Screen shake** — the overlay content shakes for ~600ms with a heavy easing curve; subtle desaturation filter applied to `document.body` for the duration then reverted.
    3. **Flame shatter** — a large centered `<Flame>` icon, orange, ignites for ~400ms, then desaturates to grey, then splits into 6-8 SVG shards (pre-defined polygon paths in an inline SVG). Shards fly outward with rotation + gravity easing, fade to 0.
    4. **Ember fallout** — small grey particle dots drift downward for ~1.2s.
    5. **Message reveal** — "Streak broken" headline + "You lost your **N-day** streak" + faint "Start again today" subline + a single "Start over" button that closes the overlay and navigates to `/practice`.
  - Uses hardcoded coral/red gradient + neutral greys — no new tokens needed.
  - Respects `prefers-reduced-motion`: falls back to a simple fade with the message and no shake/shatter.
  - One haptic buzz via `navigator.vibrate([80, 40, 200])` if available.
- Mount `<StreakBrokenOverlay />` in `StudentLayoutContent` next to `StreakCelebrationListener`.

### Guards
- Never fires while a teacher/admin is impersonating a student (same `isTeacherOrAdmin` check as onboarding modal in `StudentLayout`).
- Never fires for a first-time user with no history.

## 2. Friend request notifications in the announcement bell

Right now incoming friend requests live only on `/practice/challenges` Friends tab.

### Bell drawer changes (`src/components/student/AnnouncementBell.tsx`)
- Consume `useFriends()` → `incoming`, `respond`.
- **Unread badge** on the bell button = `announcementUnread + incoming.length` (still capped at `9+`). Tooltip becomes "X new · Y friend requests" when both exist.
- Inside the sheet content, above the announcements list (and above `StudentSatSimulationCard` when no announcement is opened), render a new **"Friend requests"** section:
  - Header row: `UserPlus` icon + "Friend requests" + count chip.
  - One row per incoming request showing display name (fallback: phone), with **Accept** (primary) and **Decline** (ghost) buttons that call `respond(r.id, true/false)` and optimistically remove the row.
  - Hidden entirely when `incoming.length === 0`.
- When there are friend requests but no announcements, the "No announcements yet" empty state is suppressed (requests count as content).

### Extras
- If the drawer is closed and a new incoming request arrives (realtime already handled in `useFriends`), the bell badge count updates automatically via the hook re-fetching.
- No route changes, no schema changes.

## Files touched
- `src/hooks/useStudentStreak.ts` — add `dispatchStreakBroken`, silent-break detection, localStorage baseline tracking.
- `src/components/student/StreakBrokenOverlay.tsx` — new full-screen devastation animation.
- `src/components/student/StudentLayout.tsx` — mount the overlay.
- `src/components/student/AnnouncementBell.tsx` — friend requests section + combined unread badge.

## Out of scope
- No push notifications (browser/mobile).
- No changes to the challenges/friends page itself.
- No new DB columns or realtime channels.
