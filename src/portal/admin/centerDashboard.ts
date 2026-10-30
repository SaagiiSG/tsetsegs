import type { DashboardData } from '@/components/admin/DashboardStats';
import type { CenterAdminData } from './useCenterAdminData';

const DAY = 864e5;

type BoardRow = { student_id: string; name: string; tier: string | null; points: number; standing: number };
type Topics = Map<string, { subject: string; topic: string }>;

/** Center data in the shape of the Tsetsegs dashboard, counted by the same rules. `board` is the running sprint's board, or null. */
export function centerDashboard(
  data: CenterAdminData, board: BoardRow[] | null, topics: Topics | undefined, totalSolved: number, now = new Date(),
): Omit<DashboardData, 'isLoading'> {
  const todayStart = new Date(now).setHours(0, 0, 0, 0);
  const week = data.attempts.filter(a => new Date(a.created_at).getTime() >= now.getTime() - 7 * DAY);
  const students = data.students.filter(s => s.active);
  const correct = week.filter(a => a.is_correct).length;

  const heat = new Map<string, number>();
  week.forEach(a => { const d = new Date(a.created_at); const k = `${d.getDay()}-${d.getHours()}`; heat.set(k, (heat.get(k) ?? 0) + 1); });
  const heatmapData = Array.from({ length: 168 }, (_, i) => {
    const day = Math.floor(i / 24), hour = i % 24;
    return { day, hour, count: heat.get(`${day}-${hour}`) ?? 0 };
  });

  const byTopic = new Map<string, { correct: number; total: number }>();
  if (topics) week.forEach(a => {
    const t = topics.get(a.question_id)?.topic ?? 'Unknown';
    const e = byTopic.get(t) ?? { correct: 0, total: 0 };
    e.total++; if (a.is_correct) e.correct++;
    byTopic.set(t, e);
  });
  const topicData = [...byTopic].map(([category, e]) => ({ category, accuracy: Math.round((e.correct / e.total) * 100), attempts: e.total }))
    .sort((a, b) => a.accuracy - b.accuracy).slice(0, 6);

  const lastPractice = new Map<string, number>();
  data.attempts.forEach(a => { const t = new Date(a.created_at).getTime(); if (t > (lastPractice.get(a.student_id) ?? 0)) lastPractice.set(a.student_id, t); });
  // shortcut: attempts load 30 days back, so anyone quieter than that shows 30d; add a last-active column if centers need the true count.
  const floor = now.getTime() - 30 * DAY;
  const atRiskStudents = students.map(s => {
    const since = lastPractice.get(s.id) ?? Math.max(new Date(s.created_at).getTime(), floor);
    const daysInactive = Math.floor((now.getTime() - since) / DAY);
    return { id: s.id, name: s.name, phone: s.phone, daysInactive, riskScore: Math.min(100, daysInactive * 10) };
  }).filter(s => s.daysInactive >= 7).sort((a, b) => b.daysInactive - a.daysInactive).slice(0, 5);

  const teacher = new Map(data.members.map(m => [m.id, m.display_name]));
  const recentBatches = [...data.classes].sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 6).map(c => ({
    id: c.id,
    name: c.name,
    teacher: (c.teacher_member_id && teacher.get(c.teacher_member_id)) || 'Unassigned',
    studentCount: students.filter(s => s.class_id === c.id).length,
    courseType: 'SAT',
    // A bare date parses as UTC midnight; read it as local so it shows the right day everywhere.
    startDate: c.starts_on ? `${c.starts_on}T00:00` : c.created_at,
  }));

  return {
    stats: {
      activeToday: new Set(data.attempts.filter(a => new Date(a.created_at).getTime() >= todayStart).map(a => a.student_id)).size,
      weeklyAttempts: week.length,
      platformAccuracy: Math.round((correct / (week.length || 1)) * 1000) / 10,
      sprintParticipants: board ? { active: board.filter(r => r.points > 0).length, total: students.length } : { active: 0, total: 0 },
      totalQuestionsSolved: totalSolved,
    },
    sparklineData: [],
    heatmapData,
    topicData,
    sprintLeaders: (board ?? []).slice(0, 5).map(r => ({ id: r.student_id, name: r.name, tier: r.tier ?? 'unranked', points: r.points, rank: r.standing })),
    recentBatches,
    atRiskStudents,
  };
}
