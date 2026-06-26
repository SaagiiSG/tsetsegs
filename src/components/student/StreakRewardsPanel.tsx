import { motion } from "framer-motion";
import { Snowflake, Flame, Lock, Sparkles, Zap, Award } from "lucide-react";
import { cn } from "@/lib/utils";
import { useStudentStreak, STREAK_MILESTONES, computeDailyStreakXp } from "@/hooks/useStudentStreak";
import { format, subDays } from "date-fns";

export function StreakRewardsPanel() {
  const { streak, freezersAvailable, milestonesAchieved, nextMilestone, isStreakActive } = useStudentStreak();
  const current = streak?.current_streak ?? 0;
  const today = format(new Date(), "yyyy-MM-dd");
  const yesterday = format(subDays(new Date(), 1), "yyyy-MM-dd");

  const practicedToday = streak?.last_activity_date === today;
  const earnedXpToday = streak?.last_daily_xp_date === today ? computeDailyStreakXp(current) : 0;
  const nextDayXp = computeDailyStreakXp(current + 1);

  const freezerJustUsed = streak?.freezer_last_used_date === yesterday;

  // Did today's check-in hit a milestone? (current streak landed on a milestone day today)
  const milestoneEarnedToday = practicedToday
    ? STREAK_MILESTONES.find((m) => m.days === current) ?? null
    : null;
  const freezerEarnedToday = practicedToday && current > 0 && current % 7 === 0;

  return (
    <div className="space-y-4 rounded-xl border border-border bg-muted/30 p-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        {/* Freezer wallet */}
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-2"
        >
          <div className="relative">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-400/30 to-blue-500/30 border border-sky-400/40 flex items-center justify-center">
              <Snowflake className="w-5 h-5 text-sky-500" />
            </div>
            {freezersAvailable > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full bg-sky-500 text-[10px] font-bold text-white flex items-center justify-center px-1">
                {freezersAvailable}
              </span>
            )}
          </div>
          <div>
            <div className="text-sm font-semibold">Streak Freezers</div>
            <div className="text-[11px] text-muted-foreground leading-tight">
              Skip a day without losing your streak
            </div>
          </div>
        </motion.div>

        {/* XP today / next */}
        <div className="text-right">
          {earnedXpToday > 0 ? (
            <>
              <div className="flex items-center gap-1 justify-end text-amber-500 font-bold font-mono">
                <Zap className="w-4 h-4 fill-amber-500" />+{earnedXpToday} XP
              </div>
              <div className="text-[11px] text-muted-foreground">earned today</div>
            </>
          ) : (
            <>
              <div className="text-sm font-semibold">+{nextDayXp} XP</div>
              <div className="text-[11px] text-muted-foreground">tomorrow's reward</div>
            </>
          )}
        </div>
      </div>

      {freezerJustUsed && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-lg border border-sky-400/40 bg-sky-500/10 px-3 py-2 text-xs text-sky-700 dark:text-sky-300 flex items-center gap-2"
        >
          <Snowflake className="w-3.5 h-3.5" />
          A streak freezer covered yesterday — streak safe!
        </motion.div>
      )}

      {/* Milestone ladder */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Milestone Rewards
          </p>
          {nextMilestone && (
            <p className="text-[11px] text-muted-foreground font-mono">
              {Math.max(0, nextMilestone.days - current)} day{nextMilestone.days - current === 1 ? "" : "s"} to {nextMilestone.badgeName}
            </p>
          )}
        </div>

        <div className="grid grid-cols-6 gap-1.5">
          {milestonesAchieved.map((m) => {
            const isAchieved = m.achieved;
            const isCurrent = !isAchieved && nextMilestone?.days === m.days;
            return (
              <motion.div
                key={m.days}
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                className={cn(
                  "relative flex flex-col items-center gap-1 rounded-lg border p-2 text-center transition-colors",
                  isAchieved
                    ? "bg-gradient-to-br from-orange-500/20 to-red-500/20 border-orange-500/40"
                    : isCurrent
                      ? "bg-card border-primary/40 ring-1 ring-primary/30"
                      : "bg-muted/30 border-border opacity-60"
                )}
              >
                <div className="relative">
                  <Flame
                    className={cn(
                      "w-5 h-5",
                      isAchieved
                        ? "text-orange-500 fill-orange-500/40"
                        : "text-muted-foreground"
                    )}
                  />
                  {m.awardsFreezer && (
                    <Snowflake
                      className={cn(
                        "w-3 h-3 absolute -top-1 -right-1",
                        isAchieved ? "text-sky-500" : "text-muted-foreground"
                      )}
                    />
                  )}
                  {!isAchieved && !isCurrent && (
                    <Lock className="w-2.5 h-2.5 absolute -bottom-0.5 -right-0.5 text-muted-foreground" />
                  )}
                </div>
                <div className={cn("text-xs font-bold font-mono", isAchieved ? "text-orange-600 dark:text-orange-400" : "")}>
                  {m.days}d
                </div>
                {isAchieved && (
                  <Sparkles className="absolute -top-1 -left-1 w-3 h-3 text-yellow-400" />
                )}
              </motion.div>
            );
          })}
        </div>
      </div>

      {!isStreakActive && current === 0 && (
        <p className="text-[11px] text-center text-muted-foreground">
          Answer any question today to start earning streak rewards.
        </p>
      )}
    </div>
  );
}
