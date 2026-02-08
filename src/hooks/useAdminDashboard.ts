import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { subDays, startOfDay, format, getDay, getHours } from 'date-fns';

interface DashboardStats {
  activeToday: number;
  weeklyAttempts: number;
  platformAccuracy: number;
  sprintParticipants: { active: number; total: number };
  totalQuestionsSolved: number;
}

interface HeatmapCell {
  day: number;
  hour: number;
  count: number;
}

interface TopicAccuracy {
  category: string;
  accuracy: number;
  attempts: number;
}

interface SprintLeader {
  id: string;
  name: string;
  tier: string;
  points: number;
  rank: number;
}

interface RecentBatch {
  id: string;
  name: string;
  teacher: string;
  studentCount: number;
  courseType: string;
  startDate: string;
}

interface AtRiskStudent {
  id: string;
  name: string;
  daysInactive: number;
  riskScore: number;
  phone: string;
}

export function useAdminDashboard() {
  const now = new Date();
  const sevenDaysAgo = subDays(now, 7);
  const todayStart = startOfDay(now);

  // Fetch core stats
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['admin-dashboard-stats'],
    queryFn: async (): Promise<DashboardStats> => {
      // Active today - unique students who attempted today
      const { data: todayAttempts } = await supabase
        .from('student_attempts')
        .select('student_account_id')
        .gte('attempted_at', todayStart.toISOString());

      const activeToday = new Set(todayAttempts?.map(a => a.student_account_id) || []).size;

      // Weekly attempts count
      const { count: weeklyAttempts } = await supabase
        .from('student_attempts')
        .select('*', { count: 'exact', head: true })
        .gte('attempted_at', sevenDaysAgo.toISOString());

      // Platform accuracy (7-day rolling)
      const { data: accuracyData } = await supabase
        .from('student_attempts')
        .select('is_correct')
        .gte('attempted_at', sevenDaysAgo.toISOString());

      const correct = accuracyData?.filter(a => a.is_correct).length || 0;
      const total = accuracyData?.length || 1;
      const platformAccuracy = Math.round((correct / total) * 100 * 10) / 10;

      // Sprint participants
      const { data: activeSprint } = await supabase
        .from('sprints')
        .select('id')
        .eq('is_active', true)
        .single();

      let sprintParticipants = { active: 0, total: 0 };
      if (activeSprint) {
        const { data: rankings } = await supabase
          .from('student_sprint_rankings')
          .select('student_account_id, total_points')
          .eq('sprint_id', activeSprint.id);

        const { count: totalAccounts } = await supabase
          .from('student_accounts')
          .select('*', { count: 'exact', head: true })
          .eq('is_active', true);

        sprintParticipants = {
          active: rankings?.filter(r => r.total_points > 0).length || 0,
          total: totalAccounts || 0
        };
      }

      // Total questions solved all time
      const { count: totalQuestionsSolved } = await supabase
        .from('student_attempts')
        .select('*', { count: 'exact', head: true })
        .eq('is_correct', true);

      return {
        activeToday,
        weeklyAttempts: weeklyAttempts || 0,
        platformAccuracy,
        sprintParticipants,
        totalQuestionsSolved: totalQuestionsSolved || 0
      };
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Fetch 7-day sparkline data
  const { data: sparklineData } = useQuery({
    queryKey: ['admin-dashboard-sparkline'],
    queryFn: async () => {
      const days = [];
      for (let i = 6; i >= 0; i--) {
        const dayStart = startOfDay(subDays(now, i));
        const dayEnd = startOfDay(subDays(now, i - 1));
        
        const { count } = await supabase
          .from('student_attempts')
          .select('*', { count: 'exact', head: true })
          .gte('attempted_at', dayStart.toISOString())
          .lt('attempted_at', dayEnd.toISOString());
        
        days.push({
          day: format(dayStart, 'EEE'),
          value: count || 0
        });
      }
      return days;
    },
    staleTime: 5 * 60 * 1000,
  });

  // Fetch activity heatmap data (7 days x 24 hours)
  const { data: heatmapData } = useQuery({
    queryKey: ['admin-dashboard-heatmap'],
    queryFn: async (): Promise<HeatmapCell[]> => {
      const { data: attempts } = await supabase
        .from('student_attempts')
        .select('attempted_at')
        .gte('attempted_at', sevenDaysAgo.toISOString());

      const heatmap: Record<string, number> = {};
      
      attempts?.forEach(attempt => {
        const date = new Date(attempt.attempted_at);
        const day = getDay(date);
        const hour = getHours(date);
        const key = `${day}-${hour}`;
        heatmap[key] = (heatmap[key] || 0) + 1;
      });

      const cells: HeatmapCell[] = [];
      for (let day = 0; day < 7; day++) {
        for (let hour = 0; hour < 24; hour++) {
          const key = `${day}-${hour}`;
          cells.push({ day, hour, count: heatmap[key] || 0 });
        }
      }
      return cells;
    },
    staleTime: 5 * 60 * 1000,
  });

  // Fetch topic accuracy data
  const { data: topicData } = useQuery({
    queryKey: ['admin-dashboard-topics'],
    queryFn: async (): Promise<TopicAccuracy[]> => {
      const { data: attempts } = await supabase
        .from('student_attempts')
        .select(`
          is_correct,
          question:questions(category:question_categories(name))
        `)
        .gte('attempted_at', sevenDaysAgo.toISOString());

      const categoryStats: Record<string, { correct: number; total: number }> = {};
      
      attempts?.forEach(attempt => {
        const categoryName = (attempt.question as any)?.category?.name || 'Unknown';
        if (!categoryStats[categoryName]) {
          categoryStats[categoryName] = { correct: 0, total: 0 };
        }
        categoryStats[categoryName].total++;
        if (attempt.is_correct) {
          categoryStats[categoryName].correct++;
        }
      });

      return Object.entries(categoryStats)
        .map(([category, stats]) => ({
          category,
          accuracy: Math.round((stats.correct / stats.total) * 100),
          attempts: stats.total
        }))
        .sort((a, b) => a.accuracy - b.accuracy)
        .slice(0, 6);
    },
    staleTime: 5 * 60 * 1000,
  });

  // Fetch sprint leaders
  const { data: sprintLeaders } = useQuery({
    queryKey: ['admin-dashboard-sprint-leaders'],
    queryFn: async (): Promise<SprintLeader[]> => {
      const { data: activeSprint } = await supabase
        .from('sprints')
        .select('id')
        .eq('is_active', true)
        .single();

      if (!activeSprint) return [];

      const { data: rankings } = await supabase
        .from('student_sprint_rankings')
        .select(`
          id,
          total_points,
          current_tier,
          student_account:student_accounts(
            id,
            linked_student:students(name)
          )
        `)
        .eq('sprint_id', activeSprint.id)
        .order('total_points', { ascending: false })
        .limit(5);

      return rankings?.map((r, idx) => ({
        id: (r.student_account as any)?.id || r.id,
        name: (r.student_account as any)?.linked_student?.name || 'Unknown',
        tier: r.current_tier,
        points: r.total_points,
        rank: idx + 1
      })) || [];
    },
    staleTime: 5 * 60 * 1000,
  });

  // Fetch recent batches
  const { data: recentBatches } = useQuery({
    queryKey: ['admin-dashboard-recent-batches'],
    queryFn: async (): Promise<RecentBatch[]> => {
      const { data: batches } = await supabase
        .from('batches')
        .select('id, batch_name, teacher, course_type, start_date, students(id)')
        .order('created_at', { ascending: false })
        .limit(6);

      return batches?.map(b => ({
        id: b.id,
        name: b.batch_name || `Batch ${format(new Date(b.start_date), 'MMM d')}`,
        teacher: b.teacher || 'Unassigned',
        studentCount: (b.students as any[])?.length || 0,
        courseType: b.course_type,
        startDate: b.start_date
      })) || [];
    },
    staleTime: 5 * 60 * 1000,
  });

  // Fetch at-risk students
  const { data: atRiskStudents } = useQuery({
    queryKey: ['admin-dashboard-at-risk'],
    queryFn: async (): Promise<AtRiskStudent[]> => {
      const { data: accounts } = await supabase
        .from('student_accounts')
        .select(`
          id,
          phone_number,
          last_login,
          linked_student:students(name)
        `)
        .eq('is_active', true);

      const atRisk = accounts?.map(acc => {
        const lastLogin = acc.last_login ? new Date(acc.last_login) : new Date(0);
        const daysInactive = Math.floor((now.getTime() - lastLogin.getTime()) / (1000 * 60 * 60 * 24));
        
        // Simple risk score based on inactivity
        const riskScore = Math.min(100, daysInactive * 10);
        
        return {
          id: acc.id,
          name: (acc.linked_student as any)?.name || acc.phone_number,
          daysInactive,
          riskScore,
          phone: acc.phone_number
        };
      })
      .filter(s => s.daysInactive >= 7)
      .sort((a, b) => b.daysInactive - a.daysInactive)
      .slice(0, 5);

      return atRisk || [];
    },
    staleTime: 5 * 60 * 1000,
  });

  return {
    stats: stats || {
      activeToday: 0,
      weeklyAttempts: 0,
      platformAccuracy: 0,
      sprintParticipants: { active: 0, total: 0 },
      totalQuestionsSolved: 0
    },
    sparklineData: sparklineData || [],
    heatmapData: heatmapData || [],
    topicData: topicData || [],
    sprintLeaders: sprintLeaders || [],
    recentBatches: recentBatches || [],
    atRiskStudents: atRiskStudents || [],
    isLoading: statsLoading
  };
}
