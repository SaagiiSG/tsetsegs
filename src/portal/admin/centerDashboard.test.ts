import { describe, expect, it } from 'vitest';
import { centerDashboard } from './centerDashboard';
import type { CenterAdminData } from './useCenterAdminData';

const now = new Date(2026, 9, 30, 15, 0);
const ago = (days: number, hours = 0) => new Date(now.getTime() - days * 864e5 - hours * 36e5).toISOString();

const student = (id: string, over: Partial<CenterAdminData['students'][number]> = {}) =>
  ({ id, name: id.toUpperCase(), phone: `99${id}`, active: true, class_id: 'c1', created_at: ago(60), ...over }) as CenterAdminData['students'][number];

const data = {
  members: [{ id: 'm1', display_name: 'Ms Bold' }],
  classes: [
    { id: 'c1', name: 'Morning', teacher_member_id: 'm1', starts_on: '2026-10-01', created_at: ago(40) },
    { id: 'c2', name: 'Evening', teacher_member_id: null, starts_on: null, created_at: ago(5) },
  ],
  students: [
    student('a'),
    student('b'),
    student('new', { created_at: ago(9) }),
    student('gone', { active: false }),
  ],
  attempts: [
    { student_id: 'a', question_id: 'q1', is_correct: true, created_at: ago(0, 1) },
    { student_id: 'a', question_id: 'q2', is_correct: false, created_at: ago(1) },
    { student_id: 'b', question_id: 'q1', is_correct: true, created_at: ago(2) },
    { student_id: 'b', question_id: 'q2', is_correct: true, created_at: ago(20) },
  ],
  dues: [],
  attendance: [],
  pendingRegistrations: 0,
} as unknown as CenterAdminData;

const topics = new Map([['q1', { subject: 'math', topic: 'Linear equations' }], ['q2', { subject: 'math', topic: 'Circles' }]]);
const board = [
  { student_id: 'a', name: 'A', tier: 'gold', points: 30, standing: 1 },
  { student_id: 'b', name: 'B', tier: 'unranked', points: 0, standing: 2 },
];

describe('centerDashboard', () => {
  const view = centerDashboard(data, board, topics, 42, now);

  it('counts this week the same way the Tsetsegs dashboard does', () => {
    expect(view.stats).toEqual({
      activeToday: 1,
      weeklyAttempts: 3,
      platformAccuracy: 66.7,
      sprintParticipants: { active: 1, total: 3 },
      totalQuestionsSolved: 42,
    });
  });

  it('shows no sprint when none is running', () => {
    const idle = centerDashboard(data, null, topics, 0, now);
    expect(idle.stats.sprintParticipants).toEqual({ active: 0, total: 0 });
    expect(idle.sprintLeaders).toEqual([]);
  });

  it('puts the weakest topics of the last 7 days first', () => {
    expect(view.topicData).toEqual([
      { category: 'Circles', accuracy: 0, attempts: 1 },
      { category: 'Linear equations', accuracy: 100, attempts: 2 },
    ]);
  });

  it('flags students quiet for 7+ days, longest first, capped at the 30 days loaded', () => {
    expect(view.atRiskStudents.map(s => [s.id, s.daysInactive])).toEqual([['new', 9]]);
    const quiet = centerDashboard({ ...data, attempts: [] }, null, topics, 0, now);
    expect(quiet.atRiskStudents.map(s => [s.id, s.daysInactive, s.riskScore])).toEqual([
      ['a', 30, 100], ['b', 30, 100], ['new', 9, 90],
    ]);
  });

  it('lists the newest classes with teacher and active student count', () => {
    expect(view.recentBatches.map(b => [b.name, b.teacher, b.studentCount])).toEqual([
      ['Evening', 'Unassigned', 0], ['Morning', 'Ms Bold', 3],
    ]);
  });

  it('maps the sprint board to leaders in standing order', () => {
    expect(view.sprintLeaders[0]).toEqual({ id: 'a', name: 'A', tier: 'gold', points: 30, rank: 1 });
  });

  it('fills the 7x24 heatmap', () => {
    expect(view.heatmapData).toHaveLength(168);
    expect(view.heatmapData.reduce((n, c) => n + c.count, 0)).toBe(3);
  });
});
