import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useStudentAuth } from "@/contexts/StudentAuthContext";
import { format, differenceInDays, parseISO, startOfDay, subDays } from "date-fns";

/**
 * Standalone function to update streak for a student (usable outside React components).
 * Call this after any practice activity (question attempt, speed session, etc.)
 * Dispatches a `streak:extended` CustomEvent when the day flips so a global
 * listener can show the celebration popup.
 */
export async function updateStudentStreak(
  studentAccountId: string
): Promise<{ extended: boolean; newStreak: number; isNew: boolean } | null> {
  try {
    const today = format(new Date(), "yyyy-MM-dd");

    // Get or create streak record
    let { data: streak, error } = await supabase
      .from("student_streaks")
      .select("*")
      .eq("student_account_id", studentAccountId)
      .maybeSingle();

    if (error && error.code !== "PGRST116") return null;

    if (!streak) {
      const { error: createError } = await supabase
        .from("student_streaks")
        .insert({
          student_account_id: studentAccountId,
          current_streak: 1,
          longest_streak: 1,
          last_activity_date: today,
          streak_start_date: today,
          total_practice_days: 1,
        });

      if (createError) {
        console.error("Failed to create streak:", createError);
        return null;
      }
      dispatchStreakExtended(1, true);
      return { extended: true, newStreak: 1, isNew: true };
    }

    // Already practiced today
    if (streak.last_activity_date === today) {
      return { extended: false, newStreak: streak.current_streak, isNew: false };
    }

    let newCurrentStreak = streak.current_streak;
    let newLongestStreak = streak.longest_streak;
    let newStreakStartDate = streak.streak_start_date;
    let newTotalDays = streak.total_practice_days + 1;
    let streak7 = streak.streak_7_achieved;
    let streak30 = streak.streak_30_achieved;
    let streak100 = streak.streak_100_achieved;
    let isNew = false;

    if (streak.last_activity_date) {
      const daysSince = differenceInDays(
        startOfDay(new Date()),
        startOfDay(parseISO(streak.last_activity_date))
      );

      if (daysSince === 1) {
        newCurrentStreak += 1;
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

    if (newCurrentStreak > newLongestStreak) {
      newLongestStreak = newCurrentStreak;
    }

    if (newCurrentStreak >= 7) streak7 = true;
    if (newCurrentStreak >= 30) streak30 = true;
    if (newCurrentStreak >= 100) streak100 = true;

    await supabase
      .from("student_streaks")
      .update({
        current_streak: newCurrentStreak,
        longest_streak: newLongestStreak,
        last_activity_date: today,
        streak_start_date: newStreakStartDate,
        total_practice_days: newTotalDays,
        streak_7_achieved: streak7,
        streak_30_achieved: streak30,
        streak_100_achieved: streak100,
      })
      .eq("student_account_id", studentAccountId);

    dispatchStreakExtended(newCurrentStreak, isNew);
    return { extended: true, newStreak: newCurrentStreak, isNew };
  } catch (err) {
    console.error("Failed to update student streak:", err);
    return null;
  }
}

function dispatchStreakExtended(newStreak: number, isNew: boolean) {
  if (typeof window === "undefined") return;
  try {
    window.dispatchEvent(
      new CustomEvent("streak:extended", { detail: { newStreak, isNew } })
    );
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
        .single();

      if (error && error.code !== "PGRST116") {
        throw error;
      }

      // If no streak exists, create one
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

  // Mutation to update streak when student practices
  const updateStreakMutation = useMutation({
    mutationFn: async () => {
      if (!studentId || !streak) return null;

      const today = format(new Date(), "yyyy-MM-dd");
      const lastActivity = streak.last_activity_date;

      // If already practiced today, no update needed
      if (lastActivity === today) {
        return streak;
      }

      let newCurrentStreak = streak.current_streak;
      let newLongestStreak = streak.longest_streak;
      let newStreakStartDate = streak.streak_start_date;
      let newTotalDays = streak.total_practice_days + 1;
      let streak7 = streak.streak_7_achieved;
      let streak30 = streak.streak_30_achieved;
      let streak100 = streak.streak_100_achieved;

      if (lastActivity) {
        const daysSinceLastActivity = differenceInDays(
          startOfDay(new Date()),
          startOfDay(parseISO(lastActivity))
        );

        if (daysSinceLastActivity === 1) {
          // Continued streak
          newCurrentStreak += 1;
        } else if (daysSinceLastActivity > 1) {
          // Streak broken, reset
          newCurrentStreak = 1;
          newStreakStartDate = today;
        }
      } else {
        // First activity ever
        newCurrentStreak = 1;
        newStreakStartDate = today;
      }

      // Update longest streak if current exceeds it
      if (newCurrentStreak > newLongestStreak) {
        newLongestStreak = newCurrentStreak;
      }

      // Check milestone achievements
      if (newCurrentStreak >= 7) streak7 = true;
      if (newCurrentStreak >= 30) streak30 = true;
      if (newCurrentStreak >= 100) streak100 = true;

      const { data, error } = await supabase
        .from("student_streaks")
        .update({
          current_streak: newCurrentStreak,
          longest_streak: newLongestStreak,
          last_activity_date: today,
          streak_start_date: newStreakStartDate,
          total_practice_days: newTotalDays,
          streak_7_achieved: streak7,
          streak_30_achieved: streak30,
          streak_100_achieved: streak100,
        })
        .eq("student_account_id", studentId)
        .select()
        .single();

      if (error) throw error;
      return data as StudentStreak;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["student-streak", studentId] });
    },
  });

  // Get activity days for the calendar view
  const { data: activityDays } = useQuery({
    queryKey: ["student-activity-days", studentId],
    queryFn: async () => {
      if (!studentId) return [];

      // Get unique dates from student_attempts in the last 120 days
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - 120);

      const { data, error } = await supabase
        .from("student_attempts")
        .select("attempted_at")
        .eq("student_account_id", studentId)
        .gte("attempted_at", cutoffDate.toISOString())
        .order("attempted_at", { ascending: false });

      if (error) throw error;

      // Extract unique dates
      const uniqueDates = new Set<string>();
      data?.forEach((attempt) => {
        const date = format(new Date(attempt.attempted_at), "yyyy-MM-dd");
        uniqueDates.add(date);
      });

      return Array.from(uniqueDates);
    },
    enabled: !!studentId,
  });

  return {
    streak,
    isLoading,
    error,
    activityDays: activityDays || [],
    updateStreak: updateStreakMutation.mutate,
    isUpdating: updateStreakMutation.isPending,
  };
};
