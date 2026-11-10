# Daily Ring Prizes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Closing a daily ring (Speed, Hard, Medium) pays a server-checked points prize, plus a bonus when all three close. The prize shows on the ring card and the ring pill, and a celebration plays when it's paid. This applies in the main and center student portals; the solo portal inherits the center version.

**Architecture:**
- One prize formula, written twice: TypeScript for display (`src/lib/ringPrizes.ts`) and SQL for paying (`ring_prize_points`).
- Center portal: a definer function `tenant_claim_ring_prize` recounts today's progress from the database and writes a `tenant_ring_prizes` row. `tenant_student_board` adds those rows to points.
- Main portal: a new `ring_prize` category on `point_transactions`, validated by a new branch in `student_points_allowed` (the existing guard trigger path).
- A small client hook claims a ring the moment it shows closed. A shared listener plays the celebration.

**Tech Stack:** React 18 + Vite + TanStack Query, Supabase (Postgres, RLS, plpgsql), framer-motion, react-confetti (installed), vitest.

**Spec:** `docs/superpowers/specs/2026-11-10-solo-portal-and-ring-prizes-design.md` (Part 1)

## Global Constraints

- **Rates:** speed 10 points per run, hard 5 points per question, medium 2 points per question.
- **Caps:** the goal counted toward the prize is capped at speed 5, hard 15 and medium 30.
- **All-three bonus:** 25.
- **Default goals** when none are set: speed 2, hard 5, medium 10.
- **Once per ring per 20 hours** (the `streak_daily` pattern).
- **Progress window:** "today" starts at the student's local midnight. The client sends `tz_offset_min = -new Date().getTimezoneOffset()`, and the server clamps it to −840..840.
- **What counts as progress:**
  - A speed run counts only if `correct > 0` (center), so empty run rows can't fill the ring.
  - Hard/medium progress is distinct correctly answered questions of that difficulty.
- **The server decides every point.** The client never chooses an amount the server keeps. Follow AGENTS.md's points rules.
- **Migrations:**
  - `drizzle/migrations/0121_ring_prizes.sql`, plus a `_journal.json` entry and `meta/0121_snapshot.json` (copy 0120's, new uuid, `prevId` = 0120's id).
  - The journal `when` must be greater than every `when` on origin/main (currently max 1794012864943). Re-check origin/main right before pushing.
- **UI:**
  - shadcn components and the existing `student-chip`, `sky-*` and `lv-*` classes only.
  - No hand-rolled buttons or badges.
  - Respect `useReducedMotion`.
- **No `Array.at`** (older Safari), per project memory.

## Review Focus

1. **A student raises their goal after a ring was paid.** They must not be paid again that day. Covered by the 20-hour test in Task 2 and the `paid` display in Task 3.
2. **A student whose browser is in another timezone** (solo students worldwide). The ring card's "closed" and the server's count must agree. Covered by the offset test in Task 2 and the `dayStartIso` test in Task 3.
3. **Two tabs, or a double effect, claim the same ring at once.** Exactly one row and one celebration. Covered by the advisory lock in Task 2 and the "claims each ring once" hook test in Task 3.
4. **A center speed run with 0 correct.** It must not count toward the Speed ring on either side. Covered by Task 2's SQL and Task 3's `useCenterDailyProgress` change and test.
5. **A student with no goals row.** Defaults of 2/5/10 apply on both sides. Covered by the Task 1 and Task 2 tests.

---

### Task 1: Prize formula (client)

**Files:**
- Create: `src/lib/ringPrizes.ts`
- Test: `src/lib/ringPrizes.test.ts`

**Interfaces:**
- Produces:
  - `type RingKey = 'speed' | 'hard' | 'medium'`
  - `type PrizeKey = RingKey | 'all'`
  - `RING_RATE`, `RING_CAP`, `ALL_RINGS_BONUS = 25`
  - `ringPrize(ring: RingKey, goal: number): number`
  - `ringPrizes(goals: { speed: number; hard: number; medium: number }): Record<PrizeKey, number>`
  - `prizeLeft(goals, paid: ReadonlySet<PrizeKey>): number`, the sum of unpaid prizes including the bonus
  - `prizeEarned(goals, paid): number`
  - `dayStartIso(now?: Date): string`, local midnight as ISO
  - `tzOffsetMin(now?: Date): number`, which is `-now.getTimezoneOffset()`

- [ ] **Step 1: Write the failing tests**

```ts
import { describe, it, expect } from 'vitest';
import { ringPrize, ringPrizes, prizeLeft, prizeEarned, dayStartIso, tzOffsetMin } from './ringPrizes';
describe('ring prizes', () => {
  it('pays goal × rate with default goals', () => expect(ringPrizes({ speed: 2, hard: 5, medium: 10 })).toEqual({ speed: 20, hard: 25, medium: 20, all: 25 }));
  it('caps the goal that counts', () => { expect(ringPrize('hard', 40)).toBe(75); expect(ringPrize('speed', 9)).toBe(50); expect(ringPrize('medium', 100)).toBe(60); });
  it('pays nothing for a zero or negative goal', () => { expect(ringPrize('speed', 0)).toBe(0); expect(ringPrize('hard', -3)).toBe(0); });
  it('counts what is left and earned', () => {
    const g = { speed: 2, hard: 5, medium: 10 };
    expect(prizeLeft(g, new Set())).toBe(90);
    expect(prizeLeft(g, new Set(['speed'] as const))).toBe(70);
    expect(prizeEarned(g, new Set(['speed', 'hard', 'medium', 'all'] as const))).toBe(90);
  });
  it('starts the day at local midnight', () => {
    const now = new Date(2026, 10, 10, 15, 30);
    expect(new Date(dayStartIso(now)).getTime()).toBe(new Date(2026, 10, 10).getTime());
    expect(tzOffsetMin(now)).toBe(-now.getTimezoneOffset());
  });
});
```

- [ ] **Step 2: Run** `npx vitest run src/lib/ringPrizes.test.ts`. Expected: FAIL (module not found).
- [ ] **Step 3: Implement `src/lib/ringPrizes.ts`** with the constants from Global Constraints.
- [ ] **Step 4: Run the same command.** Expected: PASS.
- [ ] **Step 5: Commit** `feat: ring prize formula`

### Task 2: Database: prizes for the center and main portals (migration 0121)

**Files:**
- Create: `drizzle/migrations/0121_ring_prizes.sql`
- Create: `drizzle/migrations/meta/0121_snapshot.json`
- Modify: `drizzle/migrations/meta/_journal.json`
- Modify: `src/integrations/supabase/types.ts` (add the table and the RPC so the client calls type-check; follow how other tenant tables and RPCs appear there)

**Interfaces:**
- Produces (SQL):
  - `public.ring_prize_points(_ring text, _goal int) RETURNS int IMMUTABLE`
    - same numbers as Task 1
    - returns 0 for an unknown ring
    - `'all'` returns 25
  - Table `public.tenant_ring_prizes`:
    - columns: `id uuid pk default gen_random_uuid(), institution_id uuid not null, student_id uuid not null references tenant_students(id) on delete cascade, ring text not null check (ring in ('speed','hard','medium','all')), points int not null check (points >= 0), created_at timestamptz not null default now()`
    - index `(student_id, created_at desc)`
    - RLS on: students SELECT their own rows (`student_id = public.tenant_my_student_id(institution_id)`)
    - no INSERT/UPDATE/DELETE grant to `authenticated`
  - `public.tenant_claim_ring_prize(_institution uuid, _ring text, _tz_offset_min int) RETURNS int`
    - SECURITY DEFINER, `search_path public`, `GRANT EXECUTE ... TO authenticated`
    - returns the points paid, or 0
  - `public.student_points_allowed(...)` gains a `p_category = 'ring_prize'` branch. Metadata: `{ "ring": "speed"|"hard"|"medium"|"all", "tz_offset_min": <int> }`.
  - `public.tenant_student_board(...)`: same signature and return type. Ring prize points are added into `practice_points` (and so into `points`); `answered` is unchanged.

- [ ] **Step 1: Write the migration.**
  - **`tenant_claim_ring_prize` order:**
    1. `me := tenant_my_student_id(_institution)`. If it's NULL, `RAISE EXCEPTION 'Not allowed'`.
    2. `pg_advisory_xact_lock(hashtext('ring' || me::text))`.
    3. If the ring isn't one of the four, return 0.
    4. `off := least(840, greatest(-840, coalesce(_tz_offset_min, 0)))`; `day_start := date_trunc('day', now() + make_interval(mins => off)) - make_interval(mins => off)`.
    5. If a row for (me, _ring) has `created_at > now() - interval '20 hours'`, return 0.
    6. For `'all'`: require prizes for all of speed, hard and medium with `created_at >= day_start`, then pay 25.
    7. Otherwise:
       - Read goals from `tenant_student_goals` (defaults 2/5/10).
       - Count progress since `day_start`:
         - speed = `tenant_speed_runs` with `correct > 0`
         - hard/medium = `count(DISTINCT a.question_id)` over `tenant_attempts a JOIN intl_questions q ON q.id = a.question_id WHERE a.is_correct AND lower(q.difficulty_level) = _ring`
       - If progress < goal, or the prize is 0, return 0.
    8. Insert the row and return its points.
  - **The `ring_prize` branch of `student_points_allowed`** has the same shape:
    - Goals: `student_accounts.daily_goal_speed/hard/medium` (defaults 2/5/10).
    - Hard/medium: distinct correct `student_attempts` since `day_start`, joined to the same question table and `difficulty_level` that `src/hooks/useDailyProgress.ts` uses (read its `qEmbed`).
    - Speed: `least(` today's `student_activity_logs` with `activity_type = 'speed_mode_complete'`, today's `point_transactions` with `category = 'speed_session' AND points > 0)`, so each counted run needs real paid speed answers.
    - Already paid: `point_transactions` with `category = 'ring_prize' AND metadata->>'ring' = ring` in the last 20 hours. Return NULL.
    - `'all'`: three `ring_prize` rows since `day_start`. Return 25.
    - Return NULL whenever the prize isn't due, which matches the guard's "silently not paid".
  - **Board:** `CREATE OR REPLACE tenant_student_board`, copied from drizzle 0031:131-160. The `pr` CTE also unions `tenant_ring_prizes` points in the same window and institution, counting toward `pts` but not `n`.
  - End with `DO $$ BEGIN RAISE NOTICE '0121 applied: daily ring prizes'; END $$;`

- [ ] **Step 2: Syntax- and logic-check in the scratchpad (not committed).**
  - Use `@electric-sql/pglite` in the session scratchpad directory.
  - Stub only what the migration touches: `tenant_students`, `tenant_student_goals`, `tenant_speed_runs`, `tenant_attempts`, `intl_questions`, `tenant_sprints`, `tenant_classes`, `tenant_rank_history`, `student_accounts`, `student_attempts`, `student_activity_logs`, `point_transactions`, `sprints`.
  - Stub these as plain SQL functions that read a `set_config` value: `tenant_my_student_id(uuid)`, `request_student_id()`, `tenant_has_role`, `has_role`, `auth.uid()`.
  - Assert:
    - (a) defaults 2/5/10 with 2 correct runs, 5 hard and 10 medium pay 20/25/20, then `'all'` pays 25
    - (b) a second claim inside 20h returns 0, even after raising the goal
    - (c) a run with `correct = 0` doesn't count
    - (d) offset +840 versus −840 moves `day_start` and is clamped
    - (e) the board's points include the prizes
    - (f) the main branch returns NULL for an unknown ring and for a second claim
  - Expected: all assertions pass.
- [ ] **Step 3: Add the journal entry (idx 121, tag `0121_ring_prizes`, `when` above the max) and the snapshot.** Run `npx tsc --noEmit -p tsconfig.app.json`. Expected: exit 0.
- [ ] **Step 4: Commit** `feat(db): daily ring prizes for center and main portals (0121)`

### Task 3: Center and solo portals: claim, show, celebrate

**Files:**
- Create: `src/portal/useCenterRingPrizes.ts`
- Create: `src/components/student/RingPrizeCelebration.tsx`
- Modify:
  - `src/portal/CenterDailyGoals.tsx` (`useCenterDailyProgress`: a speed run counts only if `correct > 0`)
  - `src/portal/studentStats.ts` (`todayPoints` takes an optional prizes list)
  - `src/portal/CenterTopBar.tsx` (`RingChip` shows the prize, and the top bar mounts the claimer)
  - `src/components/student/dashboard/DailyRing.tsx` (optional `prizes` prop)
  - `src/portal/CenterStudentPortal.tsx` (pass `prizes` to `DailyRing`, mount the celebration listener)
- Test:
  - `src/lib/ringPrizes.test.ts` is already done
  - Create `src/portal/useCenterRingPrizes.test.ts` and `src/components/student/dashboard/DailyRing.test.tsx`
  - Extend `src/portal/CenterTopBar.test.tsx` and `src/portal/studentStats.test.ts` (create it if absent)

**Interfaces:**
- Consumes: Task 1's functions and Task 2's RPC `tenant_claim_ring_prize(_institution, _ring, _tz_offset_min)` and table `tenant_ring_prizes`.
- Produces:
  - `useCenterRingPrizes(studentId: string, goals: Ring): { paid: Set<PrizeKey>; prizes: Record<PrizeKey, number>; rows: { ring: PrizeKey; points: number; created_at: string }[] }`
    - reads today's rows, query key `['center-ring-prizes', studentId]`
  - `useCenterRingPrizeClaimer(studentId: string, progress: Ring, goals: Ring, ready: boolean): void`
    - claims each closed, unpaid ring once per mount (a ref guards against double effects), then `'all'` when the three are paid
    - on `points > 0`:
      - `emitPointsEarned(points)`
      - `emitRingPrize({ ring, points })`
      - invalidate `['center-ring-prizes', studentId]` and the `['center-board', ...]` / `['center-all-time', ...]` keys `useCenterRank` uses
  - `emitRingPrize(e: { ring: PrizeKey; points: number }): void` and `<RingPrizeCelebration />`, a window-event listener like `PointsFlyer`
  - `DailyRing` prop `prizes?: Record<PrizeKey, { points: number; paid: boolean }>`
  - `RingChip` props gain `left?: number; earned?: number`
  - `todayPoints(attempts, runs, now?, prizes?: { created_at: string; points: number }[])`

- [ ] **Step 1: Write the failing tests.**
  - **`DailyRing.test.tsx` (`renderToStaticMarkup`):**
    - with `prizes` {speed 20 unpaid, hard 25 paid, medium 20 unpaid, all 25 unpaid}, the markup contains `+20`, `+25 earned` and `+25 bonus`
    - without `prizes` it renders exactly as before (no `+`)
  - **`CenterTopBar.test.tsx`:**
    - `<RingChip p={[1,0,0]} closed={1} left={70} />` contains `1/3` and `+70`
    - `closed={3} earned={90}` contains `+90`
    - it still matches `max-md:!hidden student-chip`
  - **`studentStats.test.ts`:** `todayPoints([], [], now, [{ created_at: <today>, points: 25 }, { created_at: <yesterday>, points: 20 }])` is `25`.
  - **`useCenterRingPrizes.test.ts`:**
    - test the pure decision helper `ringsToClaim(progress: Ring, goals: Ring, paid: ReadonlySet<PrizeKey>, asked: ReadonlySet<PrizeKey>): PrizeKey[]`, exported from the hook file
    - `{2,5,10}` progress against `{2,5,10}` goals with nothing paid gives `['speed','hard','medium']`
    - with all three paid it gives `['all']`
    - with `asked` containing `speed` it omits speed (claims each ring once)
    - progress `{1,5,10}` gives `['hard','medium']`
  - **`CenterDailyGoals` progress:** a run with `correct: 0` today isn't counted. Test via a pure helper `speedRunsToday(runs, start)` exported from `CenterDailyGoals.tsx`.
- [ ] **Step 2: Run** `npx vitest run src/portal src/components/student/dashboard`. Expected: the new tests FAIL.
- [ ] **Step 3: Implement.**
  - **`RingPrizeCelebration`:**
    - On each event, show a short overlay: the ring name, then "+N", for 2.5s.
    - Use framer-motion `AnimatePresence` and `react-confetti` (`recycle={false}`, `numberOfPieces` ~120, colours from the ring: speed yellow, hard coral, medium teal, the same as `DailyRing`'s defaults).
    - For `'all'`: a larger centred card, "All rings closed", "+25 bonus", with ~300 pieces. In the center portal, wait for `usePopupTurn` (`src/portal/popupGate.ts`).
    - Reduced motion: no confetti and no movement; the card fades only.
  - **`RingChip`:**
    - Appends ` · +{left}` while not all closed and `left > 0`.
    - Appends ` · +{earned} ✓` when `closed === 3`.
    - Still `max-md:!hidden`.
  - **`DailyRing`:** each ring's legend row adds a muted `+N`, or a check plus `+N earned` when paid, and a bonus line under the rings.
  - **`CenterTopBar`:**
    - mounts the claimer
    - passes `left` and `earned` from `useCenterRingPrizes`
    - adds prize rows into `todayPoints`
- [ ] **Step 4: Run** `npx vitest run` and `npx tsc --noEmit -p tsconfig.app.json`. Expected: all pass, exit 0.
- [ ] **Step 5: Look at it.**
  - Run `npx vite --port 8137` and open `/demo?signup=practice&lang=en`, then `/demo/student/student`, with the CDP driver in the scratchpad (see project memory: drive Chrome over CDP).
  - Screenshot the home ring card and the top pill at 1280px, and the ring card at 390px.
  - Until 0121 is applied live, the RPC is missing. The claimer must fail quietly (no error toast, no crash), and the card shows `+N` amounts. Expected: that.
- [ ] **Step 6: Commit** `feat(portal): ring prizes on the ring card, pill and a celebration`

### Task 4: Main student portal: claim, show, celebrate, and a ring pill

**Files:**
- Create: `src/hooks/useRingPrizes.ts`
- Create: `src/components/student/RingChip.tsx` (move `RingChip` here from `src/portal/CenterTopBar.tsx`; `CenterTopBar` re-imports it, and `CenterTopBar.test.tsx` imports keep working through a re-export)
- Modify:
  - `src/components/student/StreakAndRankBar.tsx` (add the ring pill, which opens the existing ring/streak history if one exists, otherwise navigates to `/practice/dashboard`)
  - `src/pages/student/StudentDashboardHome.tsx:126` (pass `prizes` to `DailyRing`)
  - `src/components/student/StudentLayout.tsx` (mount `<RingPrizeCelebration />` and the claimer)
- Test: `src/hooks/useRingPrizes.test.ts`

**Interfaces:**
- Consumes:
  - Tasks 1 and 3: `ringPrizes`, `prizeLeft`, `prizeEarned`, `ringsToClaim`, `emitRingPrize`, `RingPrizeCelebration`, `RingChip`, `DailyRing` `prizes`
  - Existing: `useDailyGoals`, `useDailyProgress`, `emitPointsEarned`, and the active sprint from `useLeaderboard` (as `StreakAndRankBar` already reads it)
- Produces:
  - `useRingPrizes(): { paid: Set<PrizeKey>; prizes: Record<PrizeKey, number> }`
    - reads own `point_transactions` with `category = 'ring_prize'` since `dayStartIso()`
  - `useRingPrizeClaimer(): void`
    - for each key from `ringsToClaim`, inserts into `point_transactions` `{ student_account_id, category: 'ring_prize', points: ringPrizes(goals)[key], metadata: { ring: key, tz_offset_min: tzOffsetMin() }, sprint_id: activeSprint?.id ?? null }` with `.select('points')`
    - copy how `useStudentStreak.ts:197-207` inserts `streak_daily`, so the student token header is the same
    - an empty result means not paid
    - a returned row with `points > 0` triggers `emitPointsEarned`, `emitRingPrize`, and invalidates the ring-prize, today-points and leaderboard queries

- [ ] **Step 1: Write the failing test.** `useRingPrizes.test.ts` tests the pure mapper `paidFromRows(rows: { metadata: { ring?: string } | null; points: number }[]): Set<PrizeKey>`, exported from the hook file:
  - rows with `points > 0` and a known ring are paid
  - `points 0`, an unknown ring and `null` metadata are ignored
- [ ] **Step 2: Run** `npx vitest run src/hooks/useRingPrizes.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** the hook, the ring pill in `StreakAndRankBar` (fed by `useDailyProgress` and `useDailyGoals`, with `left` and `earned` as in Task 3), `DailyRing` `prizes` on the home page, and the mounts in `StudentLayout`.
- [ ] **Step 4: Run** `npx vitest run` and `npx tsc --noEmit -p tsconfig.app.json`. Expected: pass, exit 0.
- [ ] **Step 5: Don't sign in to the main portal from a test browser.** It has a device lock that signs the student out elsewhere (project memory). This task is verified by tests and the type check only. Say so in the report.
- [ ] **Step 6: Commit** `feat(main): ring prizes, ring pill and celebration in the main student portal`
