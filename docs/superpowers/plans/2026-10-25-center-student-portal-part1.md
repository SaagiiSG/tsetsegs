# Center student portal part 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Center students see their points, streak, rank and ring move at the top of every page, get a hover sidebar, a real profile (their own and classmates'), a 7-step onboarding that ends with a ring set, and a daily "Let's close your ring today" pop-up.

**Architecture:** One migration adds onboarding columns to the student's own `tenant_student_goals` row, an `onboarding_eligible` flag on `tenant_students` (false for everyone who exists when it runs), and extends the existing `tenant_student_profile` definer so one read serves both the own profile and a classmate's. Numbers come from pure helpers (`src/portal/studentStats.ts`, `centerProfile.ts`, `onboarding.ts`) fed by data the portal already loads (`useMe`, `useCenterDailyProgress`, `tenant_student_board`). Main-app components (`TodayPointsChip`/`PointsFlyer`, `ProfileHeader`, `ActivityHeatmap`, `RankHistoryGraph`) are reused with center data passed in.

**Tech Stack:** React 18 + Vite + TypeScript, Tailwind, shadcn (Radix: Dialog, DropdownMenu, Slider, Switch, Progress), framer-motion, @tanstack/react-query, supabase-js, vitest (node env, `renderToStaticMarkup`), PGlite for SQL checks, headless Chrome over CDP for the browser check.

**Spec:** `docs/superpowers/specs/2026-10-25-center-student-portal-part1-design.md`

## Global Constraints

- No emoji anywhere in the sidebar or the dock menu; lucide line icons only.
- Use the repo's shadcn components and the portal's sky classes (`sky-card`, `sky-btn`, `student-chip`, `student-header`); reuse main-app components with center data passed in — don't copy them.
- English copy, plain and short. Strings the spec gives are used exactly.
- Mobile first: no sideways scroll at 375–390px; primary buttons in thumb reach.
- Real numbers only: a chip without a real value isn't rendered (no "—", no placeholder rank).
- Existing students are never forced into onboarding: only `tenant_students` rows created after the migration qualify; if eligibility can't be read, no onboarding.
- Center data only (`tenant_*` tables, existing functions); students see only their own center; phone numbers are never shown.
- No scoring-rule changes: `guard_tenant_attempt` / `guard_tenant_speed_run` decide points; the client only shows what the server paid.
- Every DB change is one migration in `drizzle/migrations/`, applied by Lovable; number and journal/snapshot entries assigned at merge. **Merge Task 1 alone first** so the migration is live before frontend that reads it is published.
- RLS: students write only their own rows; classmates' data is read only through `tenant_student_profile`.
- Main Tsetsegs app behaviour unchanged; `TodayPointsChip` only gains an optional `points` prop.
- Official SAT dates 2026–27 (College Board): 2026-08-22, 2026-09-12, 2026-10-03, 2026-11-07, 2026-12-05, 2027-03-06, 2027-05-01, 2027-06-05.
- Work in a worktree on branch `feat/center-portal-part1` off `main`; commit messages end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. **Brand-new student with zero data** — chips show `+0`, `0`, `#N · Unranked`, `0/3`; profile shows an empty heatmap and no history; never NaN/"undefined"/"—". Pinned by `zero data` (Task 2) and `zero-data profile` (Task 6).
2. **Student created before the cutoff with no goals row, or the eligibility read fails** — never sees onboarding, still gets today's one-time "Set your daily ring", and the ring pop-up doesn't stack on it. Pinned by `existing student is never onboarded` (Task 1), `never shows it to students from before the cutoff` / `fails closed` (Task 7), `goals not set` (Task 8).
3. **Tab closed mid-onboarding** — resumes at the saved step with answers kept; returning to step 6 after answering gets a fresh question. Pinned by `resumes where a closed tab stopped` (Task 7) and a live reload in Task 9.
4. **No active sprint** — rank chip shows all-time place; if the sprint list hasn't loaded, no chip. Pinned by `activeSprintId` / `rankFromBoard` (Task 2).
5. **Classmate in another center, and phone numbers** — profile read returns null / "Not allowed"; JSON never contains a phone. Pinned by Task 1 PGlite checks.

Phone width ≤ 375px and dark mode can't be unit tested; Task 9 checks both.

---

### Task 1: Migration — onboarding columns, cutoff, full classmate profile

**Files:**
- Create: `drizzle/migrations/00XX_center_student_onboarding.sql` (**number assigned at merge**, journal/snapshot added then)
- Modify: `src/integrations/supabase/types.ts` — `tenant_student_goals` Row/Insert/Update (~5741–5771), `tenant_students` (~5783–5824), `tenant_student_profile` Args (~6768–6771)
- Modify: `AGENTS.md` (one line)
- Test: `$SCRATCH/pg/onboarding.mjs` (session scratchpad, not committed; `$SCRATCH=/private/tmp/claude-501/-Users-saranochirsereglen-Developer-Saagii21/b84757e9-607f-4950-9375-3380791de5f0/scratchpad`)

**Interfaces:**
- Consumes: `tenant_my_student_id`, `tenant_has_role`, `has_role` (0063/0002); board point rule (0031:144–148).
- Produces:
  - `tenant_student_goals` + nullable `target_score smallint` (1000–1600), `prior_score smallint` (400–1600), `weak_section text` (`'math' | 'reading_writing' | 'same'`), `onboarding_step smallint` (1–7), `onboarding_done_at timestamptz`.
  - `tenant_students.onboarding_eligible boolean NOT NULL` — false for rows existing at migration time, true for rows created later.
  - `tenant_student_profile(_institution uuid, _student uuid, _tz text DEFAULT 'UTC') RETURNS jsonb` — keeps every key from 0023 plus `points` (board formula), `present` (present/late, capped 10), `solved_ids` (distinct correct question ids), `activity` (`[{date, points, answers}]`, last 371 days, grouped in `_tz`), `history` (every sprint, oldest first).

- [ ] **Step 1: Write the failing SQL test.** PGlite 0.5.11 is in `$SCRATCH/pg/node_modules` (fresh `npm i` stalls on this machine — reuse it; if PGlite stalls at startup, kill and rerun). Copy the loader (lines 1–49), the `as`/`check` helpers (76–83, 122) and exit lines from `$SCRATCH/centersec/test.mjs`; set `REPO=/Users/saranochirsereglen/Developer/tsetsegs-show`; after the 0001–0033 list also load `0063_blocked_center_locks_students.sql` and `0064_center_speed_pays_once.sql`. Seed before the migration: centers A=U(1), B=U(2); a1=U(31) (user U(21), A), a2=U(32) (user U(22), A, phone `99110032`, in a class), a4=U(34) (A, `active=false`), b1=U(33) (B). a2: attempts Q0 correct, Q1 wrong, Q1 correct (trigger pays 10, 0, 5), one speed run 1/1 (+10), 12 `present` attendance rows, two finished sprints with `tenant_rank_history` (silver→gold, gold→silver); move one a2 attempt to 20:00 UTC yesterday via superuser UPDATE (the guard trigger is INSERT-only). Load the migration with `fs.readdirSync(dir).find(f => f.endsWith('_center_student_onboarding.sql'))`.

```js
const sql = (s) => db.query(s).then(r => Object.values(r.rows[0] ?? {})[0]);
check(await sql(`select onboarding_eligible from tenant_students where id='${a1}'`) === false, 'existing student is never onboarded');
await db.exec(`insert into tenant_students (id, institution_id, name, phone, user_id) values ('${a3}','${A}','New Kid','99110099','${U(23)}')`);
check(await sql(`select onboarding_eligible from tenant_students where id='${a3}'`) === true, 'student added after the migration is onboarded');
check(await as(U(21), `update tenant_students set onboarding_eligible=true where id='${a1}' returning id`) === '0 rows', 'a student cannot flip their own cutoff');
check(!(await as(U(21), `insert into tenant_student_goals (student_id,institution_id,target_score,prior_score,weak_section,onboarding_step) values ('${a1}','${A}',1450,1200,'math',3) returning onboarding_step`)).startsWith('ERR'), 'student saves own onboarding answers');
check(/row-level security/.test(await as(U(21), `insert into tenant_student_goals (student_id,institution_id,onboarding_step) values ('${a2}','${A}',2)`)), "student can't write a classmate's ring");
for (const [c, v] of [['target_score', 1650], ['target_score', 950], ['prior_score', 300], ['weak_section', "'physics'"], ['onboarding_step', 8]])
  check(/check constraint/.test(await as(U(21), `insert into tenant_student_goals (student_id,institution_id,${c}) values ('${a1}','${A}',${v})`)), `rejects ${c}=${v}`);
const prof = JSON.parse(await as(U(21), `select tenant_student_profile('${A}','${a2}','Asia/Ulaanbaatar')`));
check(prof.name === 'Kid a2' && !JSON.stringify(prof).includes('99110032') && !('phone' in prof), 'classmate profile opens without the phone');
check(prof.points === 25 && prof.points === JSON.parse(await as(U(21), `select points from tenant_student_board('${A}') where student_id='${a2}'`)), 'profile points match the leaderboard');
check(prof.present === 10, 'attendance capped at the badge threshold');
check(prof.solved_ids.length === 2, 'solved ids are distinct correct questions');
check(prof.history.map(h => h.next_tier).join() === 'gold,silver', 'full rank history, oldest first');
const utcToday = new Date().toISOString().slice(0, 10), utcYesterday = new Date(Date.now() - 864e5).toISOString().slice(0, 10);
check(prof.activity.some(d => d.date === utcToday), 'activity groups by the student time zone');
check(JSON.parse(await as(U(21), `select tenant_student_profile('${A}','${a2}','UTC')`)).activity.some(d => d.date === utcYesterday), 'UTC puts it a day earlier');
check(!(await as(U(21), `select tenant_student_profile('${A}','${a2}','Mars/Base')`)).startsWith('ERR'), 'unknown time zone falls back to UTC');
check(await as(U(21), `select tenant_student_profile('${A}','${b1}')`) === 'null', 'student from another center: null');
check(/Not allowed/.test(await as(U(21), `select tenant_student_profile('${B}','${b1}')`)), 'another center: Not allowed');
check((await as(null, `select tenant_student_profile('${A}','${a2}')`, 'anon')).startsWith('ERR'), 'signed out: refused');
check(await as(U(21), `select tenant_student_profile('${A}','${a4}')`) === 'null', 'inactive classmate: null');
```

- [ ] **Step 2: Run it** — `cd $SCRATCH/pg && node onboarding.mjs`. Expected: FAIL (`find` returns undefined → readFileSync throws).
- [ ] **Step 3: Write the migration.** Order: goals columns with CHECKs; the cutoff; `DROP FUNCTION IF EXISTS public.tenant_student_profile(uuid, uuid)`; `CREATE FUNCTION` with the 0023 access check and keys kept verbatim; `REVOKE ALL … FROM PUBLIC, anon`; `GRANT EXECUTE … TO authenticated`; a `RAISE NOTICE`. Non-obvious parts:

```sql
-- Cutoff: rows that exist now are never onboarded; rows created later are.
ALTER TABLE public.tenant_students ADD COLUMN onboarding_eligible boolean NOT NULL DEFAULT false;
ALTER TABLE public.tenant_students ALTER COLUMN onboarding_eligible SET DEFAULT true;
-- in the function body, before the SELECT:
IF _tz IS NULL OR NOT EXISTS (SELECT 1 FROM pg_timezone_names WHERE name = _tz) THEN _tz := 'UTC'; END IF;
-- new keys:
'points', (SELECT COALESCE(sum(COALESCE(points, CASE WHEN is_correct THEN 10 ELSE 0 END)),0) FROM public.tenant_attempts WHERE student_id=s.id)
        + (SELECT COALESCE(sum(correct),0)*10 FROM public.tenant_speed_runs WHERE student_id=s.id),
'present', LEAST(10, (SELECT count(*) FROM public.tenant_attendance WHERE student_id=s.id AND status IN ('present','late'))),
'solved_ids', COALESCE((SELECT jsonb_agg(DISTINCT question_id) FROM public.tenant_attempts WHERE student_id=s.id AND is_correct), '[]'::jsonb),
'activity', COALESCE((SELECT jsonb_agg(jsonb_build_object('date', d, 'points', p, 'answers', n) ORDER BY d) FROM (
   SELECT d, sum(p) p, sum(n) n FROM (
     SELECT (created_at AT TIME ZONE _tz)::date d, COALESCE(points, CASE WHEN is_correct THEN 10 ELSE 0 END) p, 1 n
       FROM public.tenant_attempts WHERE student_id=s.id AND created_at > now() - interval '371 days'
     UNION ALL SELECT (created_at AT TIME ZONE _tz)::date, correct*10, 0
       FROM public.tenant_speed_runs WHERE student_id=s.id AND created_at > now() - interval '371 days') x GROUP BY d) y), '[]'::jsonb),
'history', COALESCE((SELECT jsonb_agg(jsonb_build_object('sprint', hs.name, 'tier', h.tier, 'next_tier', h.next_tier, 'position', h.final_position, 'points', h.points) ORDER BY hs.ends_on)
   FROM public.tenant_rank_history h JOIN public.tenant_sprints hs ON hs.id=h.sprint_id WHERE h.student_id=s.id), '[]'::jsonb)
```

- [ ] **Step 4: Update `types.ts`** — the 5 goals fields and `onboarding_eligible` (optional in Insert/Update); `_tz?: string` on the profile Args.
- [ ] **Step 5: `AGENTS.md`** — "Center onboarding answers live on the student's own `tenant_student_goals` row; only `tenant_students` created after 00XX (`onboarding_eligible`) are onboarded; classmate profiles are read only through `tenant_student_profile` (same center, no phone)."
- [ ] **Step 6: Run again** — `node onboarding.mjs`, then `npx tsc --noEmit -p tsconfig.app.json`. Expected: `ALL PASS`; only the known `shaders/react` errors.
- [ ] **Step 7: Commit** — `git add drizzle/migrations/00XX_center_student_onboarding.sql src/integrations/supabase/types.ts AGENTS.md && git commit -m "Center onboarding answers, onboarding cutoff and full classmate profiles (00XX)"`. This task merges alone so Lovable applies it first.

### Task 2: Center stats helpers (today's points, ring, rank)

**Files:**
- Create: `src/portal/studentStats.ts`
- Test: `src/portal/studentStats.test.ts`

**Interfaces:**
- Consumes: `TIER_ORDER`, `TierType` from `@/data/badgeDefinitions`.
- Produces:

```ts
export type Ring = { speed: number; hard: number; medium: number };
export function todayPoints(attempts: { created_at: string; is_correct: boolean; points: number | null }[], runs: { created_at: string; correct: number }[], now?: Date): number;
export function ringStatus(progress: Ring, goals: Ring): { closed: number; pct: number; questionsLeft: number; speedLeft: number; done: boolean };
export function activeSprintId(sprints: { id: string; status: string }[] | undefined): string | null | undefined;
export function rankFromBoard(rows: { student_id: string; standing: number; tier: string | null }[] | undefined, studentId: string): { place: number; tier: TierType } | null;
```

- [ ] **Step 1: Write the failing tests**

```ts
import { describe, it, expect } from 'vitest';
import { todayPoints, ringStatus, activeSprintId, rankFromBoard } from './studentStats';
const at = (s: string) => new Date(s).toISOString();
const now = new Date('2026-10-25T15:00:00');
describe('todayPoints', () => {
  it('adds what the server paid since local midnight, speed runs at 10 per correct', () => {
    const attempts = [
      { created_at: at('2026-10-25T09:00:00'), is_correct: true, points: 10 },
      { created_at: at('2026-10-25T09:05:00'), is_correct: true, points: 5 },
      { created_at: at('2026-10-25T09:06:00'), is_correct: false, points: 0 },
      { created_at: at('2026-10-25T09:07:00'), is_correct: true, points: null },
      { created_at: at('2026-10-24T23:59:00'), is_correct: true, points: 10 },
    ];
    const runs = [{ created_at: at('2026-10-25T10:00:00'), correct: 3 }, { created_at: at('2026-10-24T10:00:00'), correct: 4 }];
    expect(todayPoints(attempts, runs, now)).toBe(55);
  });
  it('zero data', () => expect(todayPoints([], [], now)).toBe(0));
});
describe('ringStatus', () => {
  it('counts closed rings, percent and what is left', () => {
    expect(ringStatus({ speed: 1, hard: 2, medium: 10 }, { speed: 2, hard: 5, medium: 10 })).toEqual({ closed: 1, pct: 76, questionsLeft: 3, speedLeft: 1, done: false });
    expect(ringStatus({ speed: 3, hard: 6, medium: 12 }, { speed: 2, hard: 5, medium: 10 })).toEqual({ closed: 3, pct: 100, questionsLeft: 0, speedLeft: 0, done: true });
  });
  it('zero data', () => expect(ringStatus({ speed: 0, hard: 0, medium: 0 }, { speed: 2, hard: 5, medium: 10 })).toEqual({ closed: 0, pct: 0, questionsLeft: 15, speedLeft: 2, done: false }));
});
describe('rank chip', () => {
  it('uses the active sprint, else all-time, and waits for the list', () => {
    expect(activeSprintId([{ id: 's1', status: 'finished' }, { id: 's2', status: 'active' }])).toBe('s2');
    expect(activeSprintId([{ id: 's1', status: 'finished' }, { id: 's3', status: 'paused' }])).toBeNull();
    expect(activeSprintId(undefined)).toBeUndefined();
  });
  it('reads my place and league from the board', () => {
    const rows = [{ student_id: 'a', standing: 1, tier: 'gold' }, { student_id: 'b', standing: 2, tier: 'nonsense' }];
    expect(rankFromBoard(rows, 'a')).toEqual({ place: 1, tier: 'gold' });
    expect(rankFromBoard(rows, 'b')).toEqual({ place: 2, tier: 'unranked' });
    expect(rankFromBoard(rows, 'zzz')).toBeNull();
    expect(rankFromBoard(undefined, 'a')).toBeNull();
  });
});
```

- [ ] **Step 2: Run** — `npx vitest run src/portal/studentStats.test.ts`. Expected: FAIL (module not found).
- [ ] **Step 3: Implement** the four functions in `src/portal/studentStats.ts`. `todayPoints`: local midnight, attempts count `points ?? (is_correct ? 10 : 0)` (board rule, 0031:144), runs `correct * 10`. `ringStatus`: `pct = round(100 * Σmin(progress, goal) / Σgoal)`.
- [ ] **Step 4: Run** — same command. Expected: 6 passed.
- [ ] **Step 5: Commit** — `git add src/portal/studentStats.* && git commit -m "Center stats helpers for today's points, ring and rank"`

### Task 3: Top bar chips — centered on desktop/tablet, points + streak on phones

**Files:**
- Create: `src/portal/CenterTopBar.tsx`
- Modify: `src/components/student/TodayPointsChip.tsx:40-42` (optional `points` prop)
- Modify: `src/portal/CenterStreak.tsx` — line 10 widen `useCenterStreak`'s param to `{ created_at: string }[]`; lines 45–62 export `MiniRing` with optional `colors`; export `SKY_RING` (moved from `CenterStudentPortal.tsx:64`)
- Modify: `src/portal/CenterDailyGoals.tsx:31-47` (`useCenterDailyProgress` also returns `ready: runs.isSuccess`)
- Modify: `src/portal/CenterStudentPortal.tsx` — line 77 add `points` to the attempts select; lines 211–217 header becomes a sticky three-column grid holding `<CenterTopBar>`
- Test: `src/portal/CenterTopBar.test.tsx`

**Interfaces:**
- Consumes: Task 2 helpers; `useCenterSprints` (`admin/ToolPages.tsx:26`); `tenant_student_board` with the same query keys as `CenterRankings.tsx:34-37` (`['center-board', center.id, sprintId]`, `['center-all-time', center.id, 'all']`); `CenterStreakDialog`, `CenterRingHistoryDialog`.
- Produces:

```ts
export function TodayPointsChip({ points }?: { points?: number }): JSX.Element; // omitted = main-app source, unchanged
export function useCenterRank(studentId: string): { place: number; tier: TierType } | null;
export function StreakChip(p: { days: number; onClick?: () => void }): JSX.Element;
export function RankChip(p: { rank: { place: number; tier: TierType } | null; onClick?: () => void }): JSX.Element | null;
export function RingChip(p: { p: [number, number, number]; closed: number; onClick?: () => void }): JSX.Element;
export function CenterTopBar(p: { studentId: string; attempts: { question_id: string; is_correct: boolean; created_at: string; points: number | null }[]; meta: Record<string, QMeta> }): JSX.Element;
```

- [ ] **Step 1: Write the failing test**

```tsx
import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup as html } from 'react-dom/server';
vi.mock('@/integrations/supabase/client', () => ({ supabase: {} }));
import { RankChip, RingChip, StreakChip } from './CenterTopBar';
describe('top bar chips', () => {
  it('keeps rank and ring off phones, streak on', () => {
    const rank = html(<RankChip rank={{ place: 3, tier: 'platinum' }} />);
    expect(rank).toContain('#3'); expect(rank).toContain('Emerald'); expect(rank).toMatch(/class="hidden md:inline-flex/);
    const ring = html(<RingChip p={[1, 0.4, 1]} closed={2} />);
    expect(ring).toContain('2/3'); expect(ring).toMatch(/class="hidden md:inline-flex/);
    const streak = html(<StreakChip days={5} />);
    expect(streak).toContain('>5<'); expect(streak).not.toContain('hidden');
  });
  it('shows no rank chip until the rank is real', () => expect(html(<RankChip rank={null} />)).toBe(''));
});
```

- [ ] **Step 2: Run** — `npx vitest run src/portal/CenterTopBar.test.tsx`. Expected: FAIL (module not found).
- [ ] **Step 3: Implement.** `TodayPointsChip`: `useOptionalStudentAuth()`, fetch only when `points === undefined`; shown value `points ?? data`. `useCenterRank`: `activeSprintId` → `undefined` waits (query disabled), `null` uses the all-time board; returns `rankFromBoard`. `CenterTopBar`: `<StreakChip>` opens `CenterStreakDialog`; `<TodayPointsChip points={prog.ready ? todayPoints(attempts, prog.runs) : undefined} />`; `<RankChip>` → `/student/leaderboard`; `<RingChip>` opens `CenterRingHistoryDialog`; goals = `useCenterGoals(...).data ?? { speed: 2, hard: 5, medium: 10 }` (as home, line 296). Header: `sticky top-0 z-30`, `.student-header` glass, `grid grid-cols-[1fr_auto_1fr]` so chips stay centered and visible while a long question scrolls (the flyer needs a visible target); left mobile logo + `truncate` name, right the bell.
- [ ] **Step 4: Run** — same + `npx tsc --noEmit -p tsconfig.app.json`. Expected: 2 passed, no new type errors.
- [ ] **Step 5: Commit** — `git add src/portal/CenterTopBar.* src/portal/CenterStreak.tsx src/portal/CenterDailyGoals.tsx src/portal/CenterStudentPortal.tsx src/components/student/TodayPointsChip.tsx && git commit -m "Center top bar: today's points, streak, rank and ring"`

### Task 4: Points fly into the chip on paid answers and speed runs

**Files:**
- Modify: `src/portal/studentStats.ts` (export `attemptPoints`, `runPoints`; `todayPoints` uses them)
- Modify: `src/portal/CenterStudentPortal.tsx` — `useRecordAttempt` (~411–424): select `points`, emit, return the result; `SpeedPage` run insert (~594–598): `.select('correct').single()` then emit
- Test: `src/portal/studentStats.test.ts`

**Interfaces:**
- Consumes: `emitPointsEarned` (`src/components/student/PointsFlyer.tsx:6`).
- Produces:

```ts
export function attemptPoints(row: { is_correct: boolean; points: number | null }): number;
export function runPoints(run: { correct: number }): number;
function useRecordAttempt(me: Me): (questionId: string, ok: boolean, seconds?: number, answer?: string) => Promise<{ is_correct: boolean; points: number } | null>;
```

- [ ] **Step 1: Add the failing test**

```ts
import { attemptPoints, runPoints } from './studentStats';
it('flies exactly what the chip adds', () => {
  const t = at('2026-10-25T14:00:00');
  const row = { created_at: t, is_correct: true, points: 5 }, legacy = { created_at: t, is_correct: true, points: null }, run = { created_at: t, correct: 3 };
  expect(attemptPoints(row)).toBe(5); expect(attemptPoints(legacy)).toBe(10); expect(attemptPoints({ is_correct: false, points: 0 })).toBe(0);
  expect(runPoints(run)).toBe(30);
  expect(todayPoints([row, legacy], [run], now) - todayPoints([legacy], [], now)).toBe(attemptPoints(row) + runPoints(run));
});
```

- [ ] **Step 2: Run** — `npx vitest run src/portal/studentStats.test.ts`. Expected: FAIL (`attemptPoints` is not a function).
- [ ] **Step 3: Implement.** In `useRecordAttempt`, call `emitPointsEarned(attemptPoints(row))` **before** `qc.setQueryData` (comment: `// emit first: the chip holds its number until "+N" lands`); when paid > 0 invalidate `['center-board', center.id]` and `['center-all-time', center.id]`; return `{ is_correct: row.is_correct, points: paid }`. Speed: on the inserted run `emitPointsEarned(runPoints(data))`, then invalidate as today. `Solver` ignores the return value; its first-try-only rule (~line 440) stays.
- [ ] **Step 4: Run** — same + tsc. Expected: 7 passed.
- [ ] **Step 5: Commit** — `git add src/portal/studentStats.* src/portal/CenterStudentPortal.tsx && git commit -m "Paid answers and speed runs fly into the center points chip"`

### Task 5: Hover sidebar — Profile, Settings, Dark mode, red Log out

**Files:**
- Create: `src/portal/StudentRail.tsx` (`NAV` moves here from `CenterStudentPortal.tsx:97-107`)
- Modify: `src/portal/CenterStudentPortal.tsx` — delete `ProfileCard` (~109–131) and the `collapsed` state/toggle (~179–181); replace `<aside>` (~191–208) with a `w-20` placeholder + `<StudentRail />`; dock "More" menu (~170) adds Profile, a Dark mode toggle, a separator, and Log out (`text-destructive`); delete the mobile header Log out button (~215)
- Test: `src/portal/StudentRail.test.tsx`

**Interfaces:**
- Consumes: `useCenter` (`signOut`, `center`), `useTheme` (next-themes), shadcn `Switch`, lucide `UserRound`, `Settings`, `Moon`, `LogOut`.
- Produces: `export const NAV`; `export function StudentRail(): JSX.Element` — a `group/rail` `fixed` aside, `w-20` → `w-60` on `hover:` and `focus-within:`, labels `opacity-0 group-hover/rail:opacity-100`, `motion-reduce:transition-none`, overlays content (doesn't push it). Dark mode is a `<label>` wrapping the Moon icon, "Dark mode" and `<Switch>`.

- [ ] **Step 1: Write the failing test**

```tsx
import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
vi.mock('@/integrations/supabase/client', () => ({ supabase: {} }));
import { CenterContext } from './centerContext';
import { StudentRail } from './StudentRail';
const ctx = { center: { id: 'c', name: 'Sky Prep', country: 'US', slug: 'sky' }, role: 'student' as const, name: 'Ana', userId: 'u', signOut: () => {}, reloadCenter: () => {} };
const html = renderToStaticMarkup(<MemoryRouter initialEntries={['/student']}><CenterContext.Provider value={ctx}><StudentRail /></CenterContext.Provider></MemoryRouter>);
describe('student rail', () => {
  it('has no emoji', () => expect(html).not.toMatch(/\p{Extended_Pictographic}/u));
  it('keeps the pages and adds the account block', () => {
    for (const l of ['Home', 'Practice', 'Concept videos', 'Speed mode', 'Leaderboard', 'Analytics', 'Review mistakes', 'Badges', 'Help', 'Profile', 'Settings', 'Dark mode', 'Log out']) expect(html).toContain(l);
    expect(html).toContain('href="/student/profile"'); expect(html).toContain('role="switch"');
  });
  it('shows Log out in red', () => expect(html).toMatch(/class="[^"]*text-destructive[^"]*"[^>]*>(?:(?!<\/button>).)*Log out/s));
});
```

- [ ] **Step 2: Run** — `npx vitest run src/portal/StudentRail.test.tsx`. Expected: FAIL (module not found).
- [ ] **Step 3: Implement** `StudentRail` and the dock/header edits above.
- [ ] **Step 4: Run** — same + `npx tsc --noEmit -p tsconfig.app.json && npx eslint src/portal/StudentRail.tsx src/portal/CenterStudentPortal.tsx`. Expected: 3 passed, clean.
- [ ] **Step 5: Commit** — `git add src/portal/StudentRail.* src/portal/CenterStudentPortal.tsx && git commit -m "Center hover sidebar with Profile, Settings, Dark mode and Log out"`

### Task 6: Profile view — own page and classmates' full profile

**Files:**
- Create: `src/portal/centerProfile.ts`, `src/portal/CenterProfileView.tsx`
- Modify: `src/portal/CenterStudentProfileDialog.tsx` (becomes a large scrolling Dialog around `CenterProfileView`, same props)
- Modify: `src/portal/CenterStudentPortal.tsx` — add the `profile` route (~223–236); `BadgesPage` (~694–719) uses `centerBadges` + `CenterBadgeGrid`
- Modify: `src/portal/CenterRankings.tsx:76,82` — level from `centerLevel(points).level` (same formula)
- Test: `src/portal/centerProfile.test.ts`

**Interfaces:**
- Consumes: Task 1 RPC (`_tz: Intl.DateTimeFormat().resolvedOptions().timeZone`); `ProfileHeader`, `ActivityHeatmap`, `RankHistoryGraph` (`src/components/student/profile`); `useCenterStreak` (fed the active days); `usePracticeQuestions` + `practiceSetIds`.
- Produces:

```ts
export function centerLevel(points: number): { level: number; progress: number; toNext: number };
export type CenterBadge = { name: string; desc: string; got: boolean; prog: [number, number] };
export function centerBadges(i: { answered: number; correct: number; present: number; solved: Set<string>; setIds?: Record<string, string[]> }): CenterBadge[];
export type RawProfile = { name: string; class_name: string | null; joined: string; tier: string; points: number; practice_answered: number; practice_correct: number; math_correct: number; english_correct: number; speed_runs: number; best_speed: number | null; present: number; solved_ids: string[]; last_active: string | null; activity: { date: string; points: number; answers: number }[]; history: { sprint: string; tier: string; next_tier: string; position: number; points: number }[] };
export function toProfileView(raw: RawProfile, today?: Date): { activity: ActivityDay[]; activeDays: string[]; rankHistory: RankHistoryEntry[]; tier: TierType; level: ReturnType<typeof centerLevel> };
export function CenterProfileView(p: { studentId: string; name: string }): JSX.Element;
export function CenterBadgeGrid(p: { badges: CenterBadge[] }): JSX.Element;
```

- [ ] **Step 1: Write the failing tests**

```ts
import { describe, it, expect } from 'vitest';
import { centerLevel, centerBadges, toProfileView, type RawProfile } from './centerProfile';
const raw: RawProfile = { name: 'Ana Lee', class_name: 'SAT A', joined: '2026-09-01T00:00:00Z', tier: 'gold', points: 250, practice_answered: 40, practice_correct: 30, math_correct: 20, english_correct: 10, speed_runs: 3, best_speed: 9, present: 10, solved_ids: ['q1', 'q2'], last_active: '2026-10-24T10:00:00Z',
  activity: [{ date: '2026-10-23', points: 20, answers: 3 }, { date: '2026-10-24', points: 15, answers: 2 }],
  history: [{ sprint: 'Sprint 1', tier: 'silver', next_tier: 'gold', position: 4, points: 120 }, { sprint: 'Sprint 2', tier: 'gold', next_tier: 'silver', position: 30, points: 10 }] };
const today = new Date('2026-10-25T12:00:00');
describe('centerLevel', () => it('matches the leaderboard level', () => {
  expect(centerLevel(0)).toEqual({ level: 1, progress: 0, toNext: 100 });
  expect(centerLevel(250)).toEqual({ level: 2, progress: 75, toNext: 50 });
  expect(centerLevel(300)).toEqual({ level: 3, progress: 0, toNext: 400 });
}));
describe('toProfileView', () => {
  it('fills a full year and maps rank history', () => {
    const v = toProfileView(raw, today);
    expect(v.activity).toHaveLength(365); expect(v.activity[0].date).toBe('2025-10-26');
    expect(v.activity.at(-1)).toEqual({ date: '2026-10-25', points: 0, sessionsCount: 0 });
    expect(v.activity.at(-2)).toEqual({ date: '2026-10-24', points: 15, sessionsCount: 2 });
    expect(v.activeDays).toEqual(['2026-10-23', '2026-10-24']);
    expect(v.rankHistory).toEqual([
      { sprint: 'Sprint 1', sprintNumber: 1, seasonNumber: 1, rank: 'gold', finalPoints: 120, position: 4 },
      { sprint: 'Sprint 2', sprintNumber: 2, seasonNumber: 1, rank: 'gold', finalPoints: 10, position: 30 }]);
    expect(v.tier).toBe('gold'); expect(v.level).toEqual({ level: 2, progress: 75, toNext: 50 });
  });
  it('zero-data profile', () => {
    const v = toProfileView({ ...raw, points: 0, activity: [], history: [], solved_ids: [], tier: 'unranked' }, today);
    expect(v.activity.every(d => d.points === 0)).toBe(true); expect(v.rankHistory).toEqual([]); expect(v.activeDays).toEqual([]);
    expect(v.level).toEqual({ level: 1, progress: 0, toNext: 100 });
  });
});
describe('centerBadges', () => it('uses the Badges page rules', () => {
  const b = centerBadges({ answered: 120, correct: 100, present: 10, solved: new Set(['a', 'b']), setIds: { '68': ['a', 'b'], SATMathTraining800: ['a', 'c'], CB: [] } });
  expect(b.filter(x => x.got).map(x => x.name)).toEqual(['First steps', 'Centurion', 'Sharpshooter', 'Regular', '68 master']);
  expect(b.find(x => x.name === '150 master')!.prog).toEqual([1, 2]);
  expect(b.find(x => x.name === 'CB master')).toMatchObject({ got: false, prog: [0, 1] });
}));
```

- [ ] **Step 2: Run** — `npx vitest run src/portal/centerProfile.test.ts`. Expected: FAIL (module not found).
- [ ] **Step 3: Implement.** `centerBadges` moved from `BadgesPage` (~700–707) unchanged. `toProfileView`: `rank` = higher of `tier`/`next_tier` (main-app rule, `useStudentProfile.ts:296-300`); `activeDays` = days with `answers > 0`. `CenterProfileView`: query key `['center-student-profile', center.id, studentId]`; renders `ProfileHeader` (`createdAt=joined`, `lastLogin=last_active`, `reservedNextTier=null`), `ActivityHeatmap` (streak from `useCenterStreak(activeDays.map(d => ({ created_at: `${d}T12:00:00` })))`), `CenterBadgeGrid`, a 4-stat grid — Points collected, Questions solved (`solved_ids.length`), Speed sessions (`speed_runs`), Active days — and `RankHistoryGraph`. Loading/error/null keep the dialog's copy ("Could not load this profile.", "This student is no longer active."). `PerformanceStatsGrid` and `FeaturedBadges` are not reused (main-only fields, link to `/practice/badges`).
- [ ] **Step 4: Run** — same + tsc. Expected: 5 passed.
- [ ] **Step 5: Commit** — `git add src/portal/centerProfile.* src/portal/CenterProfileView.tsx src/portal/CenterStudentProfileDialog.tsx src/portal/CenterStudentPortal.tsx src/portal/CenterRankings.tsx && git commit -m "Center profile page and full classmate profiles from the leaderboard"`

### Task 7: Onboarding — 7 steps, resume, gated to students added after the cutoff

**Files:**
- Create: `src/lib/satDates.ts` (official dates from Global Constraints; `src/demo/demoData.ts` re-exports `demoSatDates` from it)
- Create: `src/portal/onboarding.ts`, `src/portal/CenterOnboarding.tsx`
- Modify: `src/portal/CenterDailyGoals.tsx` — `CenterGoals` (14) gains the 5 Task 1 fields; `useCenterGoals` (17–28) maps them and adds `enabled: !!studentId`; export `INTENSITIES` (49–53)
- Modify: `src/portal/CenterStudentPortal.tsx` — `useOnboardingGate(me?: Me)` reads `tenant_students.onboarding_eligible, sat_month` in its own query (a failed read = not eligible); while the gate loads, `main` shows `SkyHomeSkeleton` (home and the old pop-up never flash); `OnboardingRoute` calls `useRecordAttempt` and renders `CenterOnboarding` in place of the shell
- Test: `src/portal/onboarding.test.ts`

**Interfaces:**
- Consumes: Task 1 columns; `computeGoals`, `GoalIntensity` (`src/hooks/useDailyGoals.ts`); `centerSatProgress`, `CENTER_SAT_UNLOCK_AT` (440); `useRecordAttempt` (Task 4 return); `MiniRing`, `SKY_RING`; shadcn `Slider`, `Progress`, `Button`, `Input`.
- Produces:

```ts
export const SAT_DATES: string[]; // src/lib/satDates.ts
export function onboardingStep(eligible: boolean | undefined, goals: CenterGoals | undefined): number | null;
export function canSkip(step: number): boolean;
export function welcomeCopy(centerName: string): string;
export function satDateOptions(now: Date, satMonth: string | null): { options: { value: string; label: string }[]; prefill: string | null };
export function helpMePick(prior: number | null): number;
export function defaultIntensity(daysToSat: number | null): GoalIntensity;
export function ringPlanCopy(goals: { hard: number; medium: number }, distinctMath: number): string;
export function questionSubjects(weak: string | null): string[];
export function stepSixMessage(result: { is_correct: boolean; points: number } | null, tryNo: 1 | 2, difficulty: string | null): string;
export function CenterOnboarding(p: { studentId: string; attempts: Me['attempts']; meta: Me['meta']; start: number; satMonth: string | null; goals: CenterGoals | undefined; record: RecordFn }): JSX.Element;
```

- [ ] **Step 1: Write the failing tests**

```ts
import { describe, it, expect } from 'vitest';
import { onboardingStep, canSkip, welcomeCopy, satDateOptions, helpMePick, defaultIntensity, ringPlanCopy, questionSubjects, stepSixMessage } from './onboarding';
const goals = (o = {}) => ({ speed: 2, hard: 5, medium: 10, intensity: null, sat_date: null, isSet: true, target_score: null, prior_score: null, weak_section: null, onboarding_step: null, onboarding_done_at: null, ...o });
describe('who sees onboarding', () => {
  it('never shows it to students from before the cutoff', () => { expect(onboardingStep(false, goals({ isSet: false }))).toBeNull(); expect(onboardingStep(false, undefined)).toBeNull(); });
  it('fails closed when eligibility could not be read', () => expect(onboardingStep(undefined, goals({ isSet: false }))).toBeNull());
  it('starts a new student at step 1', () => expect(onboardingStep(true, goals({ isSet: false }))).toBe(1));
  it('resumes where a closed tab stopped', () => expect(onboardingStep(true, goals({ onboarding_step: 4 }))).toBe(4));
  it('skips a ring set the old way, a finished run, and an unreadable goals row', () => {
    expect(onboardingStep(true, goals())).toBeNull();
    expect(onboardingStep(true, goals({ onboarding_step: 7, onboarding_done_at: '2026-10-25T10:00:00Z' }))).toBeNull();
    expect(onboardingStep(true, undefined)).toBeNull();
  });
  it('lets only steps 2-5 be skipped', () => expect([1, 2, 3, 4, 5, 6, 7].map(canSkip)).toEqual([false, true, true, true, true, false, false]));
});
describe('steps', () => {
  it('welcome', () => expect(welcomeCopy('Sky Prep')).toBe('Sky Prep set you up on FlowersOS. 5 quick steps, about 2 minutes.'));
  it('lists real upcoming SAT dates and prefills the center month', () => {
    const o = satDateOptions(new Date('2026-10-25T12:00:00'), null);
    expect(o.options.map(d => d.value)).toEqual(['2026-11-07', '2026-12-05', '2027-03-06', '2027-05-01', '2027-06-05']);
    expect(o.options[0].label).toBe('Sat, Nov 7, 2026'); expect(o.prefill).toBeNull();
    expect(satDateOptions(new Date('2026-10-25T12:00:00'), '2026-12').prefill).toBe('2026-12-05');
    expect(satDateOptions(new Date('2026-10-25T12:00:00'), '2027-05').prefill).toBe('2027-05-01');
    expect(satDateOptions(new Date('2026-10-25T12:00:00'), '2027-04').prefill).toBeNull();
    expect(satDateOptions(new Date('2026-11-08T12:00:00'), '2026-11')).toEqual({ options: expect.any(Array), prefill: null });
  });
  it('help me pick', () => expect([null, 1500, 1200, 1230, 700].map(helpMePick)).toEqual([1300, 1600, 1350, 1400, 1000]));
  it('defaults the ring pace from the SAT date', () => expect([null, 13, 60, 90, 200].map(defaultIntensity)).toEqual(['gradual', 'intense', 'intense', 'gradual', 'with_the_flow']));
  it('does honest maths', () => {
    expect(ringPlanCopy({ hard: 5, medium: 10 }, 0)).toBe('About 15 questions a day. Your Math score prediction unlocks in about 4 weeks.');
    expect(ringPlanCopy({ hard: 8, medium: 15 }, 0)).toBe('About 23 questions a day. Your Math score prediction unlocks in about 3 weeks.');
    expect(ringPlanCopy({ hard: 5, medium: 10 }, 400)).toBe('About 15 questions a day. Your Math score prediction unlocks in about a week.');
    expect(ringPlanCopy({ hard: 5, medium: 10 }, 440)).toBe('About 15 questions a day. Your Math score prediction is already unlocked.');
  });
  it('picks the question section', () => { expect(questionSubjects('reading_writing')).toEqual(['english', 'English']); expect(questionSubjects('same')).toEqual(['math', 'Math']); expect(questionSubjects(null)).toEqual(['math', 'Math']); });
  it('never promises ring progress it did not make', () => {
    expect(stepSixMessage({ is_correct: true, points: 10 }, 1, 'Medium')).toBe('+10 points, your ring moved');
    expect(stepSixMessage({ is_correct: true, points: 5 }, 2, 'medium')).toBe('+5 points, your ring moved');
    expect(stepSixMessage({ is_correct: true, points: 10 }, 1, 'easy')).toBe('+10 points');
    expect(stepSixMessage({ is_correct: true, points: 0 }, 1, 'medium')).toBe('Correct, your ring moved');
    expect(stepSixMessage({ is_correct: false, points: 0 }, 1, 'medium')).toBe('Not quite. Read how it works, then try once more.');
    expect(stepSixMessage({ is_correct: false, points: 0 }, 2, 'medium')).toBe("Good try — here's how it works");
    expect(stepSixMessage(null, 1, 'medium')).toBe("We couldn't save that answer. Check your connection and try again.");
  });
});
```

- [ ] **Step 2: Run** — `npx vitest run src/portal/onboarding.test.ts`. Expected: FAIL (module not found).
- [ ] **Step 3: Implement the helpers** in `onboarding.ts`. Non-obvious: `helpMePick` = `prior == null ? 1300 : clamp(round50(prior + 150), 1000, 1600)`; `ringPlanCopy` weeks = `max(1, round(ceil((440 - distinct) / (hard + medium)) / 7))`, "about a week" when 1.
- [ ] **Step 4: Implement `CenterOnboarding`.**
  - Layout: `grid lg:grid-cols-2 min-h-dvh`; left = center logo + brand colour (`--primary`) on the `AURORA` wash, a lucide tile per step, the latest answer in big mono (days to the SAT, prior score, target score, section, then `MiniRing` at steps 6–7); on phones the left half is an `h-28` band on top; thin `<Progress value={step / 7 * 100}>` fixed on top; primary button `sticky bottom-0` with `pb-[env(safe-area-inset-bottom)]`.
  - Saving: every Continue/Skip upserts `{ student_id, institution_id, onboarding_step: next, ...answer }` into `tenant_student_goals`.
  - Step 1: title `Welcome, {first}`, body `welcomeCopy`, button "Start".
  - Step 2: "When is your SAT?" — date buttons + "Not sure yet"; selection starts from `goals.sat_date ?? prefill`; saves `sat_date` only (`sat_month` never written).
  - Step 3: "Taken a practice SAT?" — "Not yet" or "Yes, about" + number input (400–1600) → `prior_score`.
  - Step 4: "Target score" — `Slider` 1000–1600 step 50 + "Help me pick" (`helpMePick(prior_score)`) → `target_score`.
  - Step 5: "Which part feels harder?" — Math / Reading and Writing / About the same → `math` / `reading_writing` / `same`.
  - Step 6: "Try one real SAT question" — from `intl_questions`: active, not hidden, `questionSubjects(weak)`, `ilike('difficulty_level','medium')`, random offset as `PracticePage` (~505–517), excluding ids in `attempts`, first candidate with `normaliseChoices(...).length`. Each try calls `record(...)` (both tries recorded); after each show `stepSixMessage` + `ExplanationView`; if no question loads, show Continue.
  - Step 7: "Set your daily ring" — `INTENSITIES` cards, preselected `defaultIntensity(days)`; values from `computeGoals`; `ringPlanCopy(vals, centerSatProgress(attempts, meta))`; "I'm in" upserts the ring, `set_at`, `onboarding_step: 7`, `onboarding_done_at`, then `await qc.invalidateQueries({ queryKey: ['center-goals', studentId] })` and `navigate('/student', { replace: true })`.
- [ ] **Step 5: Run** — same + `npx tsc --noEmit -p tsconfig.app.json && npx eslint src/portal/onboarding.ts src/portal/CenterOnboarding.tsx`. Expected: 13 passed, clean.
- [ ] **Step 6: Commit** — `git add src/lib/satDates.ts src/demo/demoData.ts src/portal/onboarding.* src/portal/CenterOnboarding.tsx src/portal/CenterDailyGoals.tsx src/portal/CenterStudentPortal.tsx && git commit -m "Seven-step onboarding for new center students, ending with the daily ring"`

### Task 8: Daily "Let's close your ring today" pop-up

**Files:**
- Modify: `src/portal/studentStats.ts` (+2 functions); `src/portal/CenterStreak.tsx:14` (export `dayKey`); `src/portal/CenterDailyGoals.tsx` (add `CenterRingNudge`); `src/portal/CenterStudentPortal.tsx` `HomePage` (~292–295): a second effect opens the nudge
- Test: `src/portal/studentStats.test.ts`

**Interfaces:**
- Consumes: `ringStatus` (Task 2), `prog.ready` (Task 3), `MiniRing`, `SKY_RING`.
- Produces:

```ts
export function shouldShowRingNudge(s: { goalsSet: boolean; ready: boolean; done: boolean; lastShown: string | null; today: string }): boolean;
export function ringNudgeCopy(s: ReturnType<typeof ringStatus>): string;
export function CenterRingNudge(p: { open: boolean; onOpenChange: (o: boolean) => void; progress: Ring; goals: Ring; onStart: () => void }): JSX.Element;
```

- [ ] **Step 1: Add the failing tests**

```ts
import { shouldShowRingNudge, ringNudgeCopy } from './studentStats';
const base = { goalsSet: true, ready: true, done: false, lastShown: null, today: '2026-10-25' };
it('shows once a day until the ring is closed', () => {
  expect(shouldShowRingNudge(base)).toBe(true);
  expect(shouldShowRingNudge({ ...base, lastShown: '2026-10-25' })).toBe(false);
  expect(shouldShowRingNudge({ ...base, lastShown: '2026-10-24' })).toBe(true);
  expect(shouldShowRingNudge({ ...base, done: true })).toBe(false);
});
it('goals not set: the old "Set your daily ring" pop-up goes first', () => expect(shouldShowRingNudge({ ...base, goalsSet: false })).toBe(false));
it('waits for speed runs to load', () => expect(shouldShowRingNudge({ ...base, ready: false })).toBe(false));
it('says what is left in plain words', () => {
  expect(ringNudgeCopy(ringStatus({ speed: 1, hard: 1, medium: 1 }, { speed: 1, hard: 3, medium: 6 }))).toBe("You're 30% there. 7 more questions.");
  expect(ringNudgeCopy(ringStatus({ speed: 0, hard: 3, medium: 6 }, { speed: 1, hard: 3, medium: 6 }))).toBe("You're 90% there. 1 more speed session.");
  expect(ringNudgeCopy(ringStatus({ speed: 0, hard: 1, medium: 1 }, { speed: 2, hard: 5, medium: 10 }))).toBe("You're 12% there. 13 more questions and 2 speed sessions.");
  expect(ringNudgeCopy(ringStatus({ speed: 0, hard: 0, medium: 0 }, { speed: 2, hard: 5, medium: 10 }))).toBe("You're 0% there. 15 more questions and 2 speed sessions.");
});
```

- [ ] **Step 2: Run** — `npx vitest run src/portal/studentStats.test.ts`. Expected: FAIL (not exported).
- [ ] **Step 3: Implement.** `CenterRingNudge`: Dialog titled "Let's close your ring today", `MiniRing` size 96, `ringNudgeCopy` as description, button "Start practicing" → `/student/practice?mode=random`; dismissible. `HomePage` effect: key `center_ring_nudge_${studentId}`; when `shouldShowRingNudge(...)`, open and store `dayKey(new Date())`.
- [ ] **Step 4: Run** — same + tsc. Expected: 11 passed.
- [ ] **Step 5: Commit** — `git add src/portal/studentStats.* src/portal/CenterStreak.tsx src/portal/CenterDailyGoals.tsx src/portal/CenterStudentPortal.tsx && git commit -m "Daily pop-up: Let's close your ring today"`

### Task 9: Browser check at 390px, 375px and 1440px

**Files:**
- Test: `$SCRATCH/portal-e2e.mjs` (not committed). CDP helpers: copy the pattern from `/Users/saranochirsereglen/Developer/Saagii21/lifeInCanada/studio_21/design/harness/check.mjs` (`PUT /json/new`, WebSocket, `Runtime.evaluate`), adding `Emulation.setDeviceMetricsOverride`, real-mouse `Input.dispatchMouseEvent` clicks and `Input.insertText` typing. Chrome port 9339, base `http://localhost:8095`.
- Needs: Task 1 live (applied by Lovable) and env `CENTER` (test center slug, e.g. `zz-signin-test`), `NEW_PHONE` (a student the center admin added after the migration, not activated), `NEW_PASSWORD`, `OLD_PHONE`/`OLD_PASSWORD` (an existing student with a ring).

**Interfaces:** Consumes everything above. Produces screenshots in `$SCRATCH/portal-shots/` and one `true`/`false` line per check.

- [ ] **Step 1: Start tools** — `npx vite --port 8095 --strictPort` and `"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --disable-gpu --no-first-run --disk-cache-size=1 --user-data-dir="$(mktemp -d)" --remote-debugging-port=9339 about:blank &`; open `/?center=$CENTER` first (slug sticks in sessionStorage).
- [ ] **Step 2: Phone run** (`390×844`, new student):
  1. Create the password → onboarding; text contains "set you up on FlowersOS. 5 quick steps, about 2 minutes."; progress bar present; primary button `rect.bottom > innerHeight - 120`; no sideways scroll.
  2. Step 2 lists upcoming dates + "Not sure yet"; if the admin set `sat_month`, that date is pre-selected.
  3. Skip step 3, reload → reopens at "Target score".
  4. Pick Math at step 5; step 6 shows exactly one `stepSixMessage` string; keep the `+N` it announces.
  5. Step 7: one intensity preselected; copy matches `/^About \d+ questions a day\. Your Math score prediction (unlocks in about (a week|\d+ weeks)|is already unlocked)\.$/`.
  6. "I'm in" → home; dialog "Let's close your ring today", text matches `/^You're \d+% there\./`, a "Start practicing" button.
  7. Header: exactly two visible chips (streak, points); points shows the step-6 `+N`; rank and ring chips `display: none`; no sideways scroll.
  8. Dock dragged to the top (`localStorage.center_dock_edge = 'top'`, reload): `elementFromPoint` at the chip centre still returns the chip.
  9. Dock "More" shows Profile, Settings, Dark mode, Log out; Log out's computed colour has red > green and blue.
  10. Reload home the same day: no ring dialog.
  11. `/student/profile`: heatmap, badges and stats present; no `NaN` or `undefined` in the text.
- [ ] **Step 3: Narrow + dark run** (`375×667`, `localStorage.theme = 'dark'` first): repeat checks 7 and 11 and onboarding step 7 (fresh `NEW_PHONE` or reset that student's goals row); no sideways scroll on any screen; dark screenshots of the chips, the dialog and the profile, checked by eye for readable text.
- [ ] **Step 4: Desktop run** (`1440×900`, old student):
  1. No onboarding.
  2. Four chips; chip row centre within 24px of `main`'s centre; rank chip matches `/^#\d+/` with a league name; ring chip matches `/^[0-3]\/3$/`.
  3. Rail ~80px at rest, ≥230px after `mouseMoved` over it; `/\p{Extended_Pictographic}/u.test(rail.innerText) === false`; Log out is red.
  4. Dark mode switch puts `dark` on `<html>`; screenshot.
  5. Leaderboard → All-Time → click a classmate: dialog shows profile header, heatmap, badges; its text has no `/\d{8,}/`.
  6. Practice: answer one question; if correct, a "+N" bubble appears and the points chip grows by N within 2 s.
  7. Speed mode: finish a short run; a "+N" equal to 10 × correct flies.
- [ ] **Step 5: Run everything once more** — `npx vitest run src/portal && npx tsc --noEmit -p tsconfig.app.json && npx eslint src/portal`. Expected: all pass; every browser line `true`.
- [ ] **Step 6: Commit** — only if a check needed a fix (message names the check); then merge the branch.

---

**Notes from planning (decided):**
1. SAT dates: official 2026–27 list in `src/lib/satDates.ts`; only future dates shown; there is no center-level SAT schedule, only each student's `sat_month` (used to prefill).
2. Steps 3 and 4 swapped versus the first mockup (practice score before target score) so "Help me pick" can use it.
3. A correct 2nd try pays 5 only if the retry is recorded; the center Solver records first tries only, so onboarding records both tries.
4. "Mini daily ring 2/3" = rings closed (speed/hard/medium) out of 3.
5. The score prediction is Math-only (440 distinct Math questions), so the copy says "Math score prediction".
6. Cutoff = the moment the migration runs (column default flip), not a timestamp literal.
7. `PerformanceStatsGrid` / `FeaturedBadges` not reused (main-only fields); the profile uses the center badge grid and four stats.
8. Copy not given by the spec (Start/Continue/Skip, step 6 title, first wrong-try line, pace thresholds ≤60 days intense / >150 with the flow, speed-session wording) is the planner's call.
9. Today's classmate dialog shows points as correct × 10 but the server pays 10/5/2; the new `points` key fixes it.

**Risk:** Task 9 needs the migration live. If the frontend is published before Lovable applies it, classmate profiles fail to load until it is applied; onboarding simply doesn't show (the gate treats a failed read as "not eligible").
