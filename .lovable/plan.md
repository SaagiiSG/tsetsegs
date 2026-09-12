# All-Time Leaderboard: Entry Limit Selector + YESH Score Column

## Goal
Two upgrades to the All-Time leaderboard tab:
1. A three-button stacked selector [10 | 50 | 100] to choose how many entries are shown, with 100 as the default.
2. An extra YESH score column next to the real SAT score, converting the student's SAT **Math** score into Mongolian YESH points.

## User decisions
- YESH conversion uses the **Math section score**.
- Scores below 560 show **—** (no conversion).
- Default entry count: **100**; selector options 10 / 50 / 100, active option visually highlighted.

## YESH conversion table (from Math score)
```text
760–800 → 800
710–750 → 749
660–700 → 699
610–650 → 649
560–600 → 599
below 560 → —
```

## Plan

### 1. Entry count selector — `src/hooks/useLeaderboard.ts` + `AllTimeTab.tsx`
- The `all_time_leaderboard` RPC already accepts `p_limit` (currently hardcoded to 100 in the hook). Expose `allTimeLimit` state (10 | 50 | 100, default 100) in `useLeaderboard`, pass it to the RPC as `p_limit`, and include it in the query key so switching refetches.
- In `AllTimeTab.tsx`, add a three-button segmented control next to the existing All Time / Last 30 Days filter: `[10 | 50 | 100]` styled as a joined button stack, with the active value highlighted (primary background). Wire it to `setAllTimeLimit`.
- Remove the hardcoded `leaderboard.slice(0, 50)` in the row render — the RPC limit now controls how many rows arrive.

### 2. YESH score column — `AllTimeTab.tsx`
- Add a small helper (e.g. `satMathToYesh(score: number): number | null`) implementing the bracket table above.
- Inside the existing right-side SAT score card (the gold-gradient panel), add a YESH line under the SAT score:
  - Label: "YESH"
  - Value: converted number in gold gradient text, or "—" when the Math score is missing or below 560.
- The card still only renders when a real score exists (existing behavior unchanged).

### 3. Files to change
- `src/hooks/useLeaderboard.ts` — limit state + pass `p_limit` to RPC
- `src/components/student/leaderboard/AllTimeTab.tsx` — selector UI, remove 50-row slice, YESH conversion + display

### 4. Out of scope
- No database changes (RPC already supports `p_limit`).
- Full profile dialog YESH display (leaderboard only, unless requested).
