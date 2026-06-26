import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useStudentAuth } from "@/contexts/StudentAuthContext";
import { format, differenceInDays, parseISO, startOfDay, subDays } from "date-fns";

// Milestone ladder — every milestone earns a badge; 7/14/21 also award a freezer.
export const STREAK_MILESTONES = [
  { days: 3, badgeName: "Spark", awardsFreezer: false },
  { days: 7, badgeName: "Week Warrior", awardsFreezer: true },
  { days: 10, badgeName: "Double Digits", awardsFreezer: false },
  { days: 14, badgeName: "Fortnight Flame", awardsFreezer: true },
  { days: 15, badgeName: "Half Month Hero", awardsFreezer: false },
  { days: 21, badgeName: "Three Week Inferno", awardsFreezer: true },
] as const;

const MILESTONE_FLAG_MAP: Record<number, keyof StudentStreak> = {
  3: "milestone_3_achieved",
  7: "streak_7_achieved",
  10: "milestone_10_achieved",
  14: "milestone_14_achieved",
  15: "milestone_15_achieved",
  21: "milestone_21_achieved",
};

// XP formula: 2^(day/3), rounded. Capped to keep meaningful but not runaway.
const DAILY_XP_CAP = 256;
export function computeDailyStreakXp(day: number): number {
  if (day <= 0) return 0;
  return Math.min(DAILY_XP_CAP, Math.max(1, Math.round(Math.pow(2, day / 3))));
}

export interface StreakExtendedDetail {
  newStreak: number;
  isNew: boolean;
  xpEarned: number;
  freezerEarned: boolean;
  freezerUsed: boolean;
  milestonesUnlocked: { days: number; badgeName: string; awardsFreezer: boolean }[];
}

/**
 * Standalone function to update streak for a student (usable outside React components).
 * Handles XP, freezer wallet, milestone badges, and auto-consume of freezers on a 1-day skip.
 */
export async function updateStudentStreak(
  studentAccountId: string
): Promise<{ extended: boolean; newStreak: number; isNew: boolean } | null> {
  try {
    const today = format(new Date(), "yyyy-MM-dd");
    const yesterday = format(subDays(new Date(), 1), "yyyy-MM-dd");

    let { data: streak, error } = await supabase
      .from("student_streaks")
      .select("*")
      .eq("student_account_id", studentAccountId)
      .maybeSingle();

    if (error && error.code !== "PGRST116") return null;

    // First-ever record
    if (!streak) {
      const xp = computeDailyStreakXp(1);
      const { data: created, error: createError } = await supabase
        .from("student_streaks")
        .insert({
          student_account_id: studentAccountId,
          current_streak: 1,
          longest_streak: 1,
          last_activity_date: today,
          streak_start_date: today,
          total_practice_days: 1,
          last_daily_xp_date: today,
        })
        .select()
        .single();
      if (createError) {
        console.error("Failed to create streak:", createError);
        return null;
      }
      await awardStreakXp(studentAccountId, xp, 1);
      const milestones = await awardMilestonesIfHit(studentAccountId, created as StudentStreak, 1);
      dispatchStreakExtended({
        newStreak: 1, isNew: true, xpEarned: xp, freezerEarned: false, freezerUsed: false, milestonesUnlocked: milestones,
      });
      return { extended: true, newStreak: 1, isNew: true };
    }

    // Already practiced today — no-op
    if (streak.last_activity_date === today) {
      return { extended: false, newStreak: streak.current_streak, isNew: false };
    }

    let newCurrentStreak = streak.current_streak;
    let newLongestStreak = streak.longest_streak;
    let newStreakStartDate = streak.streak_start_date;
    let newTotalDays = streak.total_practice_days + 1;
    let isNew = false;
    let freezerUsed = false;
    let freezersAvailable = streak.freezers_available ?? 0;
    let freezersEarnedTotal = streak.freezers_earned_total ?? 0;
    let freezerLastUsedDate = streak.freezer_last_used_date;

    if (streak.last_activity_date) {
      const daysSince = differenceInDays(
        startOfDay(new Date()),
        startOfDay(parseISO(streak.last_activity_date))
      );

      if (daysSince === 1) {
        newCurrentStreak += 1;
      } else if (daysSince === 2 && freezersAvailable > 0) {
        // Auto-consume a freezer to cover yesterday
        newCurrentStreak += 1;
        freezersAvailable -= 1;
        freezerLastUsedDate = yesterday;
        freezerUsed = true;
      } else if (daysSince > 1) {
        newCurrentStreak = 1;
        newStreakStartDate = today;
        isNew = true;
      }
    } else {
      newCurrentStreak = 1;
      newStreakStartDate = today;
      isNew = true;
    }

    if (newCurrentStreak > newLongestStreak) newLongestStreak = newCurrentStreak;

    // Freezer drop: every 7 consecutive days (once per longest-streak high water)
    let freezerEarned = false;
    const expectedFreezers = Math.floor(newLongestStreak / 7);
    if (expectedFreezers > freezersEarnedTotal) {
      const newlyEarned = expectedFreezers - freezersEarnedTotal;
      freezersAvailable += newlyEarned;
      freezersEarnedTotal = expectedFreezers;
      freezerEarned = newCurrentStreak % 7 === 0;
    }

    // Daily XP
    let xpEarned = 0;
    if (streak.last_daily_xp_date !== today) {
      xpEarned = computeDailyStreakXp(newCurrentStreak);
    }

    const { data: updated, error: updErr } = await supabase
      .from("student_streaks")
      .update({
        current_streak: newCurrentStreak,
        longest_streak: newLongestStreak,
        last_activity_date: today,
        streak_start_date: newStreakStartDate,
        total_practice_days: newTotalDays,
        freezers_available: freezersAvailable,
        freezers_earned_total: freezersEarnedTotal,
        freezer_last_used_date: freezerLastUsedDate,
        last_daily_xp_date: xpEarned > 0 ? today : streak.last_daily_xp_date,
      })
      .eq("student_account_id", studentAccountId)
      .select()
      .single();

    if (updErr) {
      console.error("Failed to update streak:", updErr);
      return null;
    }

    if (xpEarned > 0) {
      await awardStreakXp(studentAccountId, xpEarned, newCurrentStreak);
    }
    const milestonesUnlocked = await awardMilestonesIfHit(
      studentAccountId,
      updated as StudentStreak,
      newCurrentStreak
    );

    dispatchStreakExtended({
      newStreak: newCurrentStreak,
      isNew,
      xpEarned,
      freezerEarned,
      freezerUsed,
      milestonesUnlocked,
    });
    return { extended: true, newStreak: newCurrentStreak, isNew };
  } catch (err) {
    console.error("Failed to update student streak:", err);
    return null;
  }
}

async function awardStreakXp(studentAccountId: string, points: number, day: number) {
  try {
    await supabase.from("point_transactions").insert({
      student_account_id: studentAccountId,
      points,
      category: "streak_daily",
      metadata: { streak_day: day },
    });
  } catch (e) {
    console.error("Failed to award streak XP:", e);
  }
}

async function awardMilestonesIfHit(
  studentAccountId: string,
  streak: StudentStreak,
  newCurrentStreak: number
): Promise<{ days: number; badgeName: string; awardsFreezer: boolean }[]> {
  const unlocked: { days: number; badgeName: string; awardsFreezer: boolean }[] = [];
  const flagUpdates: Partial<Record<string, boolean>> = {};

  for (const m of STREAK_MILESTONES) {
    const flag = MILESTONE_FLAG_MAP[m.days];
    const alreadyDone = (streak as any)[flag] === true;
    if (newCurrentStreak >= m.days && !alreadyDone) {
      flagUpdates[flag as string] = true;
      unlocked.push({ days: m.days, badgeName: m.badgeName, awardsFreezer: m.awardsFreezer });

      try {
        const { data: badge } = await supabase
          .from("badges")
          .select("id")
          .eq("name", m.badgeName)
          .maybeSingle();
        if (badge?.id) {
          await supabase.from("student_badges").upsert(
            {
              student_account_id: studentAccountId,
              badge_id: badge.id,
              progress: 100,
              is_unlocked: true,
              unlocked_at: new Date().toISOString(),
            },
            { onConflict: "student_account_id,badge_id" }
          );
        }
      } catch (e) {
        console.error("Failed to award milestone badge", m.badgeName, e);
      }
    }
  }

  if (Object.keys(flagUpdates).length > 0) {
    await supabase
      .from("student_streaks")
      .update(flagUpdates as any)
      .eq("student_account_id", studentAccountId);
  }

  return unlocked;
}

function dispatchStreakExtended(detail: StreakExtendedDetail) {
  if (typeof window === "undefined") return;
  try {
    window.dispatchEvent(new CustomEvent("streak:extended", { detail }));
  } catch {
    /* noop */
  }
}

interface StudentStreak {
  id: string;
  student_account_id: string;
  current_streak: number;
  longest_streak: number;
  last_activity_date: string | null;
  streak_start_date: string | null;
  total_practice_days: number;
  streak_7_achieved: boolean;
  streak_30_achieved: boolean;
  streak_100_achieved: boolean;
  milestone_3_achieved: boolean;
  milestone_10_achieved: boolean;
  milestone_14_achieved: boolean;
  milestone_15_achieved: boolean;
  milestone_21_achieved: boolean;
  freezers_available: number;
  freezers_earned_total: number;
  freezer_last_used_date: string | null;
  last_daily_xp_date: string | null;
  created_at: string;
  updated_at: string;
}

export const useStudentStreak = () => {
  const { student } = useStudentAuth();
  const studentId = student?.id;
  const queryClient = useQueryClient();

  const { data: streak, isLoading, error } = useQuery({
    queryKey: ["student-streak", studentId],
    queryFn: async () => {
      if (!studentId) return null;

      const { data, error } = await supabase
        .from("student_streaks")
        .select("*")
        .eq("student_account_id", studentId)
        .maybeSingle();

      if (error && error.code !== "PGRST116") throw error;

      if (!data) {
        const { data: newStreak, error: createError } = await supabase
          .from("student_streaks")
          .insert({ student_account_id: studentId })
          .select()
          .single();
        if (createError) throw createError;
        return newStreak as StudentStreak;
      }
      return data as StudentStreak;
    },
    enabled: !!studentId,
  });

  const isStreakActive = (() => {
    if (!streak?.last_activity_date) return false;
    const today = format(new Date(), "yyyy-MM-dd");
    const yesterday = format(subDays(new Date(), 1), "yyyy-MM-dd");
    return streak.last_activity_date === today || streak.last_activity_date === yesterday;
  })();

  const freezersAvailable = streak?.freezers_available ?? 0;

  const milestonesAchieved = STREAK_MILESTONES.map((m) => ({
    ...m,
    achieved: streak ? (streak as any)[MILESTONE_FLAG_MAP[m.days]] === true : false,
  }));

  const nextMilestone = milestonesAchieved.find((m) => !m.achieved) ?? null;

  const updateStreakMutation = useMutation({
    mutationFn: async () => {
      if (!studentId) return null;
      return updateStudentStreak(studentId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["student-streak", studentId] });
    },
  });

  const { data: activityDays } = useQuery({
    queryKey: ["student-activity-days", studentId],
    queryFn: async () => {
      if (!studentId) return [];
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - 120);

      const { data, error } = await supabase
        .from("student_attempts")
        .select("attempted_at")
        .eq("student_account_id", studentId)
        .gte("attempted_at", cutoffDate.toISOString())
        .order("attempted_at", { ascending: false });
      if (error) throw error;

      const uniqueDates = new Set<string>();
      data?.forEach((attempt) => {
        uniqueDates.add(format(new Date(attempt.attempted_at), "yyyy-MM-dd"));
      });
      return Array.from(uniqueDates);
    },
    enabled: !!studentId,
  });

  return {
    streak,
    isLoading,
    error,
    isStreakActive,
    freezersAvailable,
    milestonesAchieved,
    nextMilestone,
    activityDays: activityDays || [],
    updateStreak: updateStreakMutation.mutate,
    isUpdating: updateStreakMutation.isPending,
  };
};
