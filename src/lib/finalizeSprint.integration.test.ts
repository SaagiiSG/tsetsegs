/**
 * End-to-end integration test for the `finalize-sprint` edge function.
 *
 * It seeds throwaway sprints + ghost student accounts, runs the real deployed
 * edge function as an admin, then asserts that every persisted
 * `reserved_next_tier` / `final_rank` / `is_top_1` value matches the shared
 * `rankProgression` logic used by the leaderboard UI.
 *
 * Requires admin credentials in the environment (never commit them):
 *   TEST_ADMIN_EMAIL, TEST_ADMIN_PASSWORD
 * Without them the suite is skipped so CI stays green.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { getRankOutcome, LAST_SPRINT_OF_SEASON } from './rankProgression';

const env = ((globalThis as any).process?.env ?? {}) as Record<string, string | undefined>;
const SUPABASE_URL = (import.meta as any).env?.VITE_SUPABASE_URL ?? env.VITE_SUPABASE_URL;
const SUPABASE_KEY =
  (import.meta as any).env?.VITE_SUPABASE_PUBLISHABLE_KEY ?? env.VITE_SUPABASE_PUBLISHABLE_KEY;
const ADMIN_EMAIL = env.TEST_ADMIN_EMAIL;
const ADMIN_PASSWORD = env.TEST_ADMIN_PASSWORD;


const canRun = Boolean(SUPABASE_URL && SUPABASE_KEY && ADMIN_EMAIL && ADMIN_PASSWORD);

// Throwaway seasons so we never touch live sprint data.
const FINALE_SEASON = 9901;
const NORMAL_SEASON = 9902;

type Seed = { tier: string; group: number; count: number };

/** Groups seeded into the season-finale sprint (sprint 3). */
const FINALE_SEEDS: Seed[] = [
  { tier: 'gold', group: 1, count: 12 },
  { tier: 'ruby', group: 1, count: 3 },
  { tier: 'unranked', group: 1, count: 4 },
];

/** Groups seeded into a mid-season sprint (sprint 2) to cover the normal rule. */
const NORMAL_SEEDS: Seed[] = [
  { tier: 'silver', group: 1, count: 18 },
  { tier: 'diamond', group: 1, count: 3 },
];

interface SeededRow {
  accountId: string;
  tier: string;
  group: number;
  points: number;
  expectedRank: number;
}

describe.skipIf(!canRun)('finalize-sprint (integration)', () => {
  let admin: SupabaseClient;
  let accessToken: string;
  const accountIds: string[] = [];
  const sprintIds: string[] = [];
  let finaleSprintId = '';
  let normalSprintId = '';
  const finaleRows: SeededRow[] = [];
  const normalRows: SeededRow[] = [];

  const tag = Date.now().toString().slice(-6);

  async function seedSprint(
    season: number,
    sprintNumber: number,
    seeds: Seed[],
    rows: SeededRow[]
  ): Promise<string> {
    const start = new Date(Date.now() - 14 * 864e5).toISOString().slice(0, 10);
    const end = new Date(Date.now() - 1 * 864e5).toISOString().slice(0, 10);
    const { data: sprint, error } = await admin
      .from('sprints')
      .insert({
        season_number: season,
        sprint_number: sprintNumber,
        start_date: start,
        end_date: end,
        is_active: false,
      })
      .select('id')
      .single();
    if (error) throw error;
    sprintIds.push(sprint.id);

    for (const seed of seeds) {
      for (let i = 0; i < seed.count; i++) {
        // Ghost accounts are hidden from every student/admin surface.
        const { data: acc, error: accErr } = await admin
          .from('student_accounts')
          .insert({
            phone_number: `9${tag}${season}${seed.tier.slice(0, 2)}${i}`.slice(0, 20),
            is_ghost: true,
            is_active: false,
          })
          .select('id')
          .single();
        if (accErr) throw accErr;
        accountIds.push(acc.id);

        const points = (seed.count - i) * 100; // descending → rank = i + 1
        const { error: rankErr } = await admin.from('student_sprint_rankings').insert({
          sprint_id: sprint.id,
          student_account_id: acc.id,
          current_tier: seed.tier,
          group_number: seed.group,
          total_points: points,
          is_top_1: false,
        });
        if (rankErr) throw rankErr;

        rows.push({
          accountId: acc.id,
          tier: seed.tier,
          group: seed.group,
          points,
          expectedRank: i + 1,
        });
      }
    }
    return sprint.id;
  }

  async function runFinalize(sprintId: string) {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/finalize-sprint`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: SUPABASE_KEY!,
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ sprintId }),
    });
    const json = await res.json();
    expect(res.status, JSON.stringify(json)).toBe(200);
    expect(json.success, JSON.stringify(json)).toBe(true);
    return json;
  }

  async function persisted(sprintId: string) {
    const { data, error } = await admin
      .from('student_sprint_rankings')
      .select('student_account_id, current_tier, final_rank, is_top_1, reserved_next_tier')
      .eq('sprint_id', sprintId);
    if (error) throw error;
    return new Map(data!.map((r) => [r.student_account_id, r]));
  }

  beforeAll(async () => {
    admin = createClient(SUPABASE_URL!, SUPABASE_KEY!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data, error } = await admin.auth.signInWithPassword({
      email: ADMIN_EMAIL!,
      password: ADMIN_PASSWORD!,
    });
    if (error) throw error;
    accessToken = data.session!.access_token;

    finaleSprintId = await seedSprint(FINALE_SEASON, LAST_SPRINT_OF_SEASON, FINALE_SEEDS, finaleRows);
    normalSprintId = await seedSprint(NORMAL_SEASON, 2, NORMAL_SEEDS, normalRows);
  }, 120_000);

  afterAll(async () => {
    if (!admin) return;
    // Rankings can also exist in the live "next" sprint via auto-enroll — clear all.
    if (accountIds.length) {
      await admin.from('student_sprint_rankings').delete().in('student_account_id', accountIds);
      await admin.from('point_transactions').delete().in('student_account_id', accountIds);
      await admin.from('student_badges').delete().in('student_account_id', accountIds);
      await admin.from('student_accounts').delete().in('id', accountIds);
    }
    if (sprintIds.length) await admin.from('sprints').delete().in('id', sprintIds);
    await admin.auth.signOut();
  }, 120_000);

  it('ranks the season-finale sprint and persists the tier each shared rule predicts', async () => {
    await runFinalize(finaleSprintId);
    const rows = await persisted(finaleSprintId);

    for (const seeded of finaleRows) {
      const row = rows.get(seeded.accountId);
      expect(row, `missing ranking for ${seeded.accountId}`).toBeTruthy();
      expect(row!.final_rank).toBe(seeded.expectedRank);
      expect(row!.is_top_1).toBe(seeded.expectedRank === 1);

      const expected = getRankOutcome(seeded.tier, seeded.expectedRank, {
        sprintNumber: LAST_SPRINT_OF_SEASON,
      });
      expect(
        row!.reserved_next_tier,
        `${seeded.tier} rank ${seeded.expectedRank} expected ${expected.rule} → ${expected.nextTier}`
      ).toBe(expected.nextTier);
    }
  }, 300_000);

  it('preserves the exact tier of every last-sprint P1 winner', async () => {
    const rows = await persisted(finaleSprintId);
    const winners = finaleRows.filter((r) => r.expectedRank === 1);
    expect(winners.length).toBe(FINALE_SEEDS.length);
    for (const w of winners) {
      const row = rows.get(w.accountId)!;
      expect(row.reserved_next_tier, `${w.tier} winner must keep tier`).toBe(w.tier);
      expect(getRankOutcome(w.tier, 1, { sprintNumber: LAST_SPRINT_OF_SEASON }).rule).toBe('preserved');
    }
  }, 120_000);

  it('drops every non-winner exactly one tier at season end (floored at unranked)', async () => {
    const rows = await persisted(finaleSprintId);
    for (const seeded of finaleRows.filter((r) => r.expectedRank > 1)) {
      const expected = getRankOutcome(seeded.tier, seeded.expectedRank, {
        sprintNumber: LAST_SPRINT_OF_SEASON,
      });
      expect(['dropped', 'stayed']).toContain(expected.rule);
      expect(rows.get(seeded.accountId)!.reserved_next_tier).toBe(expected.nextTier);
    }
  }, 120_000);

  it('applies the promote/drop cutoff rule on a mid-season sprint', async () => {
    await runFinalize(normalSprintId);
    const rows = await persisted(normalSprintId);

    for (const seeded of normalRows) {
      const row = rows.get(seeded.accountId)!;
      expect(row.final_rank).toBe(seeded.expectedRank);
      const expected = getRankOutcome(seeded.tier, seeded.expectedRank, { sprintNumber: 2 });
      expect(
        row.reserved_next_tier,
        `${seeded.tier} rank ${seeded.expectedRank} expected ${expected.rule} → ${expected.nextTier}`
      ).toBe(expected.nextTier);
    }
  }, 300_000);
});
