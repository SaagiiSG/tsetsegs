import { useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Flame, Calendar, Trophy, Sparkles, Target } from "lucide-react";
import { useStudentStreak } from "@/hooks/useStudentStreak";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, subMonths, addMonths, isSameDay, parseISO } from "date-fns";

const STREAK_MILESTONES = [
  { days: 7, badge: "Week Warrior", icon: Flame, color: "text-orange-500", bgColor: "bg-orange-500/20" },
  { days: 30, badge: "Month Master", icon: Calendar, color: "text-blue-500", bgColor: "bg-blue-500/20" },
  { days: 100, badge: "Century Scholar", icon: Trophy, color: "text-purple-500", bgColor: "bg-purple-500/20" },
];

export const StudyStreakCalendar = () => {
  const { streak, activityDays, isLoading, isStreakActive } = useStudentStreak();
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
              className="text-lg px-3 py-1 bg-gradient-to-r from-orange-500/20 to-red-500/20 border-orange-500/30"
            >
              <Flame className="w-4 h-4 mr-1 text-orange-500" />
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
              const isActive = isActivityDay(day);
              const isTodayDate = isToday(day);
              
              return (
                <motion.div
                  key={day.toISOString()}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.01 }}
                  className={`
                    aspect-square rounded-lg flex items-center justify-center text-sm relative
                    ${isActive 
                      ? "bg-gradient-to-br from-orange-500 to-red-500 text-white font-semibold shadow-lg shadow-orange-500/30" 
                      : "bg-muted/30 text-muted-foreground"
                    }
                    ${isTodayDate ? "ring-2 ring-primary ring-offset-2 ring-offset-background" : ""}
                  `}
                >
                  {format(day, "d")}
                  {isActive && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute -top-1 -right-1"
                    >
                      <Sparkles className="w-3 h-3 text-yellow-400" />
                    </motion.div>
                  )}
                </motion.div>
              );
            })}
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
