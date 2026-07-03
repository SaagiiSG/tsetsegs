## HUD not updating in real time — fix

Backend confirms data is landing (participant score = 306, correct_count = 2 after the two answers), so the DB trigger works. Realtime is enabled and REPLICA IDENTITY is FULL on all three challenge tables. The failure is on the client subscription side — most likely the `student_account_id` filter isn't delivering trigger-driven UPDATEs reliably, or the channel is set up before the participant row exists.

### Fix in `src/hooks/useActiveChallenge.ts`
1. Drop the `student_account_id` filter on the `challenge_participants` subscription. Subscribe to `*` events on `challenge_participants` and `challenges` with no filter, and let the handler refetch. Cheap — refetch is 2 tiny queries.
2. Also `.on` `INSERT` on `challenge_attempts` and refetch — gives immediate feedback the instant the attempt lands, independent of the trigger's UPDATE broadcast.
3. Add a lightweight polling fallback: while `state.challenge?.status === 'active'`, `setInterval(fetchActive, 4000)`. Guarantees the HUD converges even if the socket drops.

### Fix in `src/lib/challengeAmbient.ts`
After the successful `challenge_attempts` insert, dispatch a `window` custom event `challenge:attempt-recorded`. `useActiveChallenge` listens for it and calls `fetchActive()` immediately — this makes the local student's HUD tick up instantly without waiting for the round-trip.

### Out of scope
- No schema, RLS, publication, or scoring changes.
- No changes to the leaderboard sheet, lobby, or `ChallengePlay`.
