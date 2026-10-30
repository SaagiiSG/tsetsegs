import { describe, expect, it } from 'vitest';
import { batchStats, intakeMonth, intakeTrend, suggestBatchName } from './centerIntake';

const today = '2026-10-30';
const students = [
  { id: 'a', class_id: 'c1', active: true },
  { id: 'b', class_id: 'c1', active: true },
  { id: 'c', class_id: 'c1', active: false },
  { id: 'd', class_id: 'c2', active: true },
];
const att = (student_id: string, session_date: string, status: string) => ({ student_id, class_id: 'c1', session_date, status });
const attendance = [
  att('a', '2026-10-30', 'present'), att('b', '2026-10-30', 'absent'),
  att('b', '2026-10-28', 'absent'), att('b', '2026-10-26', 'absent'), att('a', '2026-10-28', 'late'),
];
const hw = (student_id: string, session_date: string, status: string) => ({ student_id, class_id: 'c1', session_date, status });

describe('batchStats', () => {
  it('counts active students, attendance, today and at-risk like the Tsetsegs Class Overview', () => {
    expect(batchStats('c1', { students, attendance }, [], today)).toEqual({
      students: 2, attendanceRate: 40, markedToday: 2, homeworkRate: null, atRisk: 1,
    });
  });

  it('flags 3+ missed homeworks as at risk and reports the homework rate', () => {
    const homework = [hw('a', '2026-10-30', 'incomplete'), hw('a', '2026-10-28', 'incomplete'), hw('a', '2026-10-26', 'incomplete'), hw('a', '2026-10-24', 'completed')];
    const s = batchStats('c1', { students, attendance: [] }, homework, today);
    expect(s.homeworkRate).toBe(25);
    expect(s.atRisk).toBe(1);
  });

  it('leaves rates empty with no marks, and homework empty before the table exists', () => {
    expect(batchStats('c2', { students, attendance }, null, today)).toEqual({
      students: 1, attendanceRate: null, markedToday: 0, homeworkRate: null, atRisk: 0,
    });
  });
});

describe('intake months', () => {
  it('uses the start date, or the created day when there is none', () => {
    expect(intakeMonth({ starts_on: '2026-11-03', created_at: '2026-10-01T10:00:00Z' })).toBe('2026-11');
    expect(intakeMonth({ starts_on: null, created_at: '2026-10-01T10:00:00Z' })).toBe('2026-10');
  });

  it('counts batches and their active students for the last 12 months', () => {
    const classes = [{ id: 'c1', starts_on: '2026-10-05', created_at: '2026-09-01T00:00:00Z' }, { id: 'c2', starts_on: '2025-01-01', created_at: '2025-01-01T00:00:00Z' }];
    const trend = intakeTrend(classes, students, new Date(2026, 9, 30));
    expect(trend).toHaveLength(12);
    expect(trend[11]).toEqual({ label: 'Oct', batches: 1, students: 2 });
    expect(trend.reduce((n, m) => n + m.batches, 0)).toBe(1);
  });
});

describe('suggestBatchName', () => {
  it('follows the Tsetsegs pattern', () => {
    expect(suggestBatchName('2026-11-03', 'Ms Bold')).toBe('(November 2026 Intake) - Ms Bold');
    expect(suggestBatchName('2026-11-03', null)).toBe('November 2026 Intake');
  });
});
