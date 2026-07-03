# Challenges: Desmos + Cross-Platform Active Challenge HUD

Two connected changes so a live challenge feels present everywhere the student goes, not walled off inside `/practice/challenges`.

## 1. Desmos calculator inside ChallengePlay

- In `src/pages/student/challenges/ChallengePlay.tsx`, mount `<DesmosCalculator />` when `challenge.subject === 'math'` (mirrors how `StudentPractice.tsx` gates it).
- Reuses the existing floating draggable calculator — no new component, same snap zones and behavior students already know from practice.
- English challenges: no calculator (matches practice behavior).

## 2. Global "Active Challenge" HUD

Right now the goal/leaderboard only exists on `ChallengePlay`. If a student leaves that page to look at the dashboard, leaderboard, or a practice question, the challenge disappears from view. We'll surface it everywhere via a small persistent bar mounted in `StudentLayout`.

### Where it lives
- New hook `useActiveChallenge()` in `src/hooks/useActiveChallenge.ts`:
  - Finds the current student's `challenge_participants` row where the joined `challenges.status = 'active'` (limit 1, most recent).
  - Subscribes to realtime updates on both `challenges` and `challenge_participants` (same channels `useChallenge` already uses) so score/target/status stay live.
  - Returns `{ challenge, myPart, progressPct, targetText, timeRemaining }`.
- New component `src/components/student/challenges/ActiveChallengeHUD.tsx`:
  - Fixed, compact pill anchored top-center on desktop, just below the top edge on mobile (respects existing bottom nav / iPad dock spacing — same safe-area logic as `StreakCelebrationListener`).
  - Shows: challenge subject icon, opponent name(s) or "vs 3", live progress bar, `targetText` (e.g. `12 / 20 ✓`, `340 / 500 pts`, `0:47 left`), and a "Resume" button that routes to `/practice/challenges/:id/play`.
  - Hidden automatically while the student is already on `/practice/challenges/:id/play` (avoid duplicate with in-page leaderboard).
  - Auto-dismisses when challenge flips to `finished` / `cancelled`; if `finished`, briefly morphs into a "See results" CTA for ~10s then disappears.
- Mount `<ActiveChallengeHUD />` inside `StudentLayoutContent` in `src/components/student/StudentLayout.tsx`, next to `StreakCelebrationListener`, so it appears on dashboard, practice, speed, leaderboard, badges, etc.

### Behavior details
- Only one active challenge shown at a time (schema already effectively enforces this via challenge lifecycle).
- Clicking the HUD navigates to `ChallengePlay`; the calculator stays available there via change #1.
- HUD is read-only — no answering from it. It's a status + shortcut.
- No DB or schema changes required.

## Files touched
- `src/pages/student/challenges/ChallengePlay.tsx` — mount `DesmosCalculator` for math.
- `src/hooks/useActiveChallenge.ts` — new hook.
- `src/components/student/challenges/ActiveChallengeHUD.tsx` — new component.
- `src/components/student/StudentLayout.tsx` — mount the HUD once, layout-wide.

## Out of scope
- Notifications when challenged (already handled elsewhere / separate ask).
- Answering questions from the HUD.
- Changing challenge scoring, formats, or DB schema.
