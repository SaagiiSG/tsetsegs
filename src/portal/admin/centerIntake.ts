const ATTENDED = new Set(['present', 'late']);

export const joinUrl = (code: string) => `${window.location.origin}/join/${code}`;

type Student = { id: string; class_id: string | null; active: boolean };
type Mark = { student_id: string; class_id: string; session_date: string; status: string };
type ClassDates = { starts_on: string | null; created_at: string };

export type BatchStats = { students: number; attendanceRate: number | null; markedToday: number; homeworkRate: number | null; atRisk: number };

/**
 * One batch's numbers over the loaded 30 days, by the Tsetsegs Class Overview rules: a student is at risk after
 * 3+ absences or 3+ missed homeworks. `homework` is null until the center homework table exists.
 */
export function batchStats(classId: string, data: { students: Student[]; attendance: Mark[] }, homework: Mark[] | null, today: string): BatchStats {
  const roster = data.students.filter(s => s.class_id === classId && s.active);
  const att = data.attendance.filter(a => a.class_id === classId);
  const hw = (homework ?? []).filter(h => h.class_id === classId);
  const atRisk = roster.filter(s =>
    att.filter(a => a.student_id === s.id && a.status === 'absent').length >= 3
    || hw.filter(h => h.student_id === s.id && h.status === 'incomplete').length >= 3).length;
  return {
    students: roster.length,
    attendanceRate: att.length ? Math.round((100 * att.filter(a => ATTENDED.has(a.status)).length) / att.length) : null,
    markedToday: att.filter(a => a.session_date === today).length,
    homeworkRate: hw.length ? Math.round((100 * hw.filter(h => h.status === 'completed').length) / hw.length) : null,
    atRisk,
  };
}

/** "yyyy-MM" of the batch's start date, or of the day it was made when it has none. */
export const intakeMonth = (c: ClassDates) => (c.starts_on ?? c.created_at).slice(0, 7);

/** Batches and their active students starting in each of the last 12 months. */
export function intakeTrend(classes: (ClassDates & { id: string })[], students: Student[], now = new Date()) {
  return Array.from({ length: 12 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - 11 + i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const ids = new Set(classes.filter(c => intakeMonth(c) === key).map(c => c.id));
    return { label: d.toLocaleString('en', { month: 'short' }), batches: ids.size, students: students.filter(s => s.active && s.class_id && ids.has(s.class_id)).length };
  });
}

/** Same pattern as Tsetsegs batch names: "(November 2026 Intake) - Teacher". */
export function suggestBatchName(startsOn: string, teacher: string | null) {
  const month = new Date(`${startsOn}T00:00`).toLocaleString('en', { month: 'long', year: 'numeric' });
  return teacher ? `(${month} Intake) - ${teacher}` : `${month} Intake`;
}
