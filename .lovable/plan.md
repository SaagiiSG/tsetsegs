## HUD: show opponents' progress + who's leading

### 1. `src/hooks/useActiveChallenge.ts`
Return richer opponent data. Replace `opponents: string[]` with `opponents: Array<{ id, name, score, correct_count, attempted_count }>`. Populate it from the same `challenge_participants` fetch (already selects everything we need — just widen the select).

### 2. `src/components/student/challenges/ActiveChallengeHUD.tsx`
Add a per-format metric picker (`score` for `first_to_points`/`time_sprint`, `correct_count` for `first_to_correct`, `attempted_count` for `fixed_set`) with a short unit label (`pts`, `✓`, `q`).

Compute leader = participant with the highest metric (ties broken by correct_count then attempts). Under the existing "You X / target" row, add a second compact line:

- **1 v 1** (`participantsCount === 2`): show opponent name + their metric, with a colored arrow indicating who's ahead and by how much. Example: `Alex 120 pts  ▲ You +186`.
- **3+ players**: show the leader (or "You lead") with their metric and the gap to second place. Example: `👑 Alex 480 pts · +40 ahead` or `👑 You lead · +40`.

Keep the row tiny (single line, `text-[11px]`, tabular-nums, truncate long names) so the HUD stays a pill. On the leaderboard sheet nothing changes — it already lists everyone.

### 3. Runtime error
The `Should have a queue` error looks like a stale hook-order issue from the previous HUD edit (added `useState`/`useRef` at the top). Making the hook return a stable array shape (always the new `opponents` object array) plus keeping all hooks unconditional at the top of both components will clear it. No component-splitting needed beyond what's already there.

### Out of scope
No scoring, DB, or lobby changes.
