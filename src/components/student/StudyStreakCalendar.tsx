import { useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Flame, Calendar, Trophy, Sparkles, Target, Award, Snowflake } from "lucide-react";
import { useStudentStreak } from "@/hooks/useStudentStreak";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, subMonths, addMonths, isSameDay, parseISO } from "date-fns";

const STREAK_MILESTONES = [
  { days: 7, badge: "Week Warrior", icon: Flame, color: "text-orange-500", bgColor: "bg-orange-500/20" },
  { days: 30, badge: "Month Master", icon: Calendar, color: "text-blue-500", bgColor: "bg-blue-500/20" },
  { days: 100, badge: "Century Scholar", icon: Trophy, color: "text-purple-500", bgColor: "bg-purple-500/20" },
];

export const StudyStreakCalendar = () => {
  const { streak, activityDays, activityDayMeta, isLoading, isStreakActive } = useStudentStreak();
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Calculate what day of the week the month starts on (0 = Sunday)
  const startDayOfWeek = monthStart.getDay();

  const isActivityDay = (date: Date) => {
    const dateStr = format(date, "yyyy-MM-dd");
    return activityDays.includes(dateStr);
  };

  const getNextMilestone = () => {
    if (!streak) return STREAK_MILESTONES[0];
    if (streak.current_streak < 7) return STREAK_MILESTONES[0];
    if (streak.current_streak < 30) return STREAK_MILESTONES[1];
    if (streak.current_streak < 100) return STREAK_MILESTONES[2];
    return null;
  };

  const nextMilestone = getNextMilestone();
  const daysToNextMilestone = nextMilestone 
    ? nextMilestone.days - (streak?.current_streak || 0) 
    : 0;

  if (isLoading) {
    return (
      <Card className="bg-card border-border">
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded w-1/3" />
            <div className="h-40 bg-muted rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card border-border overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl font-bold flex items-center gap-2">
            <Flame className={`w-5 h-5 ${isStreakActive ? "text-orange-500" : "text-muted-foreground grayscale opacity-50"}`} />
            Study Streak
          </CardTitle>
          
          {/* Current streak badge */}
          <motion.div
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            className="flex items-center gap-2"
          >
            <Badge 
              variant="secondary" 
              className={`text-lg px-3 py-1 border ${isStreakActive ? "bg-gradient-to-r from-orange-500/20 to-red-500/20 border-orange-500/30" : "bg-muted border-border text-muted-foreground"}`}
            >
              <Flame className={`w-4 h-4 mr-1 ${isStreakActive ? "text-orange-500" : "text-muted-foreground grayscale opacity-50"}`} />
              {streak?.current_streak || 0} days
            </Badge>
          </motion.div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3">
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center p-3 rounded-xl bg-muted/50"
          >
            <div className="text-2xl font-bold text-primary">{streak?.current_streak || 0}</div>
            <div className="text-xs text-muted-foreground">Current</div>
          </motion.div>
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-center p-3 rounded-xl bg-muted/50"
          >
            <div className="text-2xl font-bold text-amber-500">{streak?.longest_streak || 0}</div>
            <div className="text-xs text-muted-foreground">Best</div>
          </motion.div>
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-center p-3 rounded-xl bg-muted/50"
          >
            <div className="text-2xl font-bold text-green-500">{streak?.total_practice_days || 0}</div>
            <div className="text-xs text-muted-foreground">Total Days</div>
          </motion.div>
        </div>

        {/* Next milestone tracker */}
        {nextMilestone && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className={`p-4 rounded-xl ${nextMilestone.bgColor} border border-current/10`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg bg-background/50`}>
                  <nextMilestone.icon className={`w-5 h-5 ${nextMilestone.color}`} />
                </div>
                <div>
                  <p className="font-semibold text-sm">{nextMilestone.badge}</p>
                  <p className="text-xs text-muted-foreground">{daysToNextMilestone} days to go!</p>
                </div>
              </div>
              <div className="text-right">
                <div className="flex items-center gap-1">
                  <Target className="w-4 h-4 text-muted-foreground" />
                  <span className="font-mono text-sm">{nextMilestone.days} days</span>
                </div>
              </div>
            </div>
            
            {/* Progress bar */}
            <div className="mt-3 h-2 bg-background/50 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${((streak?.current_streak || 0) / nextMilestone.days) * 100}%` }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className={`h-full rounded-full bg-gradient-to-r from-orange-500 to-red-500`}
              />
            </div>
          </motion.div>
        )}

        {/* Calendar */}
        <div className="space-y-3">
          {/* Month navigation */}
          <div className="flex items-center justify-between">
            <button
              onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
              className="p-2 hover:bg-muted rounded-lg transition-colors"
            >
              ←
            </button>
            <span className="font-semibold">{format(currentMonth, "MMMM yyyy")}</span>
            <button
              onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
              className="p-2 hover:bg-muted rounded-lg transition-colors"
            >
              →
            </button>
          </div>

          {/* Day labels */}
          <div className="grid grid-cols-7 gap-1 text-center">
            {["S", "M", "T", "W", "T", "F", "S"].map((day, i) => (
              <div key={i} className="text-xs text-muted-foreground py-1">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-1">
            {/* Empty cells for days before month starts */}
            {Array.from({ length: startDayOfWeek }).map((_, i) => (
              <div key={`empty-${i}`} className="aspect-square" />
            ))}
            
            {/* Day cells */}
            {daysInMonth.map((day, i) => {
              const dateStr = format(day, "yyyy-MM-dd");
              const isActive = isActivityDay(day);
              const isTodayDate = isToday(day);
              const meta = activityDayMeta?.[dateStr];
              const isMilestone = !!meta?.isMilestone;
              const awardsFreezer = !!meta?.awardsFreezer;
              const isProjected = !!meta?.projected;
              const isFreezerUsedDay = streak?.freezer_last_used_date === dateStr;
              const showBadgeOnDay = isMilestone;
              const dayNum = format(day, "d");

              const tooltipContent = isMilestone
                ? (
                  <div className="flex items-center gap-2">
                    <Award className="w-4 h-4 text-amber-500" />
                    <div>
                      <p className="font-semibold">{meta?.badgeName}</p>
                      <p className="text-xs text-muted-foreground">Day {meta?.streakDay} streak{awardsFreezer ? " + Streak Freezer" : ""}{isProjected ? " (upcoming)" : ""}</p>
                    </div>
                  </div>
                )
                : awardsFreezer && isProjected
                  ? (
                    <div className="flex items-center gap-2">
                      <Snowflake className="w-4 h-4 text-sky-500" />
                      <div>
                        <p className="font-semibold">Streak Freezer</p>
                        <p className="text-xs text-muted-foreground">Day {meta?.streakDay} (upcoming)</p>
                      </div>
                    </div>
                  )
                  : isFreezerUsedDay
                    ? (
                      <div className="flex items-center gap-2">
                        <Snowflake className="w-4 h-4 text-sky-500" />
                        <p className="font-semibold">Freezer used here</p>
                      </div>
                    )
                    : isActive
                      ? (
                        <p className="font-semibold">Day {meta?.streakDay} of streak</p>
                      )
                      : null;

              const cell = (
                <motion.div
                  key={day.toISOString()}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.01 }}
                  className={`
                    aspect-square rounded-lg flex flex-col items-center justify-center text-sm relative overflow-hidden
                    ${isProjected && isMilestone
                      ? "border-2 border-dashed border-amber-400/70 bg-amber-500/10 text-amber-700 dark:text-amber-300"
                      : isProjected && awardsFreezer
                        ? "border-2 border-dashed border-sky-400/70 bg-sky-500/10 text-sky-700 dark:text-sky-300"
                        : isMilestone
                          ? "bg-gradient-to-br from-amber-400 via-orange-500 to-red-500 text-white font-bold shadow-lg shadow-amber-500/40 ring-1 ring-amber-300"
                          : isActive
                            ? "bg-gradient-to-br from-orange-500 to-red-500 text-white font-semibold shadow-lg shadow-orange-500/30"
                            : isFreezerUsedDay
                              ? "bg-sky-500/20 border border-sky-400/40 text-sky-700 dark:text-sky-300"
                              : "bg-muted/30 text-muted-foreground"
                    }
                    ${isTodayDate ? "ring-2 ring-primary ring-offset-2 ring-offset-background" : ""}
                  `}
                >
                  {showBadgeOnDay ? (
                    <>
                      <span className={`absolute top-0.5 left-1 text-[9px] font-mono leading-none ${isProjected ? "opacity-70" : "text-white/80"}`}>
                        {dayNum}
                      </span>
                      <div className="flex items-center gap-1">
                        <motion.div
                          initial={{ scale: 0, rotate: -20 }}
                          animate={{ scale: 1, rotate: 0 }}
                          transition={{ type: "spring", stiffness: 260, damping: 14 }}
                        >
                          <Award className={`w-5 h-5 ${isProjected ? "text-amber-500" : "text-white drop-shadow"}`} />
                        </motion.div>
                        {awardsFreezer && (
                          <motion.div
                            initial={{ scale: 0, rotate: 20 }}
                            animate={{ scale: 1, rotate: 0 }}
                            transition={{ type: "spring", stiffness: 260, damping: 14, delay: 0.1 }}
                          >
                            <Snowflake className={`w-4 h-4 ${isProjected ? "text-sky-500" : "text-sky-200 drop-shadow"}`} />
                          </motion.div>
                        )}
                      </div>
                      <span className={`text-[8px] font-bold uppercase tracking-tight leading-none mt-0.5 truncate max-w-full px-0.5 ${isProjected ? "" : "text-white/90"}`}>
                        {meta?.badgeName?.split(" ")[0]}
                      </span>
                    </>
                  ) : isProjected && awardsFreezer ? (
                    <>
                      <span className="absolute top-0.5 left-1 text-[9px] font-mono leading-none opacity-70">{dayNum}</span>
                      <Snowflake className="w-5 h-5 text-sky-500" />
                      <span className="text-[8px] font-bold uppercase tracking-tight leading-none mt-0.5">Freezer</span>
                    </>
                  ) : (
                    <>
                      {dayNum}
                      {awardsFreezer && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="absolute -bottom-1 -right-1 rounded-full bg-white p-0.5 shadow"
                        >
                          <Snowflake className="w-2.5 h-2.5 text-sky-500" />
                        </motion.div>
                      )}
                      {isFreezerUsedDay && !isActive && (
                        <Snowflake className="w-3 h-3 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-sky-500 opacity-70" />
                      )}
                      {isActive && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="absolute -top-1 -right-1"
                        >
                          <Sparkles className="w-3 h-3 text-yellow-400" />
                        </motion.div>
                      )}
                    </>
                  )}
                </motion.div>
              );

              if (tooltipContent) {
                return (
                  <Tooltip key={day.toISOString()}>
                    <TooltipTrigger asChild>
                      {cell}
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-xs">
                      {tooltipContent}
                    </TooltipContent>
                  </Tooltip>
                );
              }

              return cell;
            })}
          </div>

          {/* Legend */}
          <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 pt-1 text-[10px] text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <span className="inline-block w-2.5 h-2.5 rounded-sm bg-gradient-to-br from-orange-500 to-red-500" />
              Practiced
            </span>
            <span className="inline-flex items-center gap-1">
              <Award className="w-3 h-3 text-amber-500" />
              Milestone badge
            </span>
            <span className="inline-flex items-center gap-1">
              <Snowflake className="w-3 h-3 text-sky-500" />
              Freezer day
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="inline-block w-2.5 h-2.5 rounded-sm border-2 border-dashed border-amber-400" />
              Upcoming reward
            </span>
          </div>
        </div>

        {/* Achieved milestones */}
        {(streak?.streak_7_achieved || streak?.streak_30_achieved || streak?.streak_100_achieved) && (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Achievements Unlocked</p>
            <div className="flex flex-wrap gap-2">
              {streak?.streak_7_achieved && (
                <Badge variant="outline" className="bg-orange-500/10 border-orange-500/30">
                  <Flame className="w-3 h-3 mr-1" /> Week Warrior
                </Badge>
              )}
              {streak?.streak_30_achieved && (
                <Badge variant="outline" className="bg-blue-500/10 border-blue-500/30">
                  <Calendar className="w-3 h-3 mr-1" /> Month Master
                </Badge>
              )}
              {streak?.streak_100_achieved && (
                <Badge variant="outline" className="bg-purple-500/10 border-purple-500/30">
                  <Trophy className="w-3 h-3 mr-1" /> Century Scholar
                </Badge>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default StudyStreakCalendar;
