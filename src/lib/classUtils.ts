export interface TimeSlot {
  day: string;
  start_time: string;
  end_time: string;
}

const DAY_MAP: Record<string, string> = {
  'monday': 'Даваа',
  'tuesday': 'Мягмар',
  'wednesday': 'Лхагва',
  'thursday': 'Пүрэв',
  'friday': 'Баасан',
  'saturday': 'Бямба',
  'sunday': 'Ням',
};

export function isOnlineClass(schedule: string): boolean {
  return schedule.includes("Online") || schedule.includes("online");
}

// Strip "[Holiday]" tag from schedule for display purposes (legacy)
export function formatScheduleForDisplay(schedule: string): string {
  return schedule.replace(/\s*\[Holiday\]\s*/gi, '').trim();
}

// Format new JSONB schedule for display
export function formatJsonSchedule(schedule: TimeSlot[]): string {
  if (!schedule || schedule.length === 0) return '';
  
  return schedule
    .map(slot => {
      const dayName = DAY_MAP[slot.day] || slot.day;
      return `${dayName} ${slot.start_time}-${slot.end_time}`;
    })
    .join(', ');
}

// Check if batch uses new schedule format
export function hasNewScheduleFormat(batch: any): boolean {
  return (
    (batch.math_schedule && Array.isArray(batch.math_schedule) && batch.math_schedule.length > 0) ||
    (batch.english_schedule && Array.isArray(batch.english_schedule) && batch.english_schedule.length > 0)
  );
}

// Teachers whose names should be hidden on student reveal panels
export const HIDDEN_TEACHERS = ['Enguun', 'Khulan'];

export function filterVisibleTeachers(teacherString: string | null): string {
  if (!teacherString) return '';
  const teachers = teacherString.split(', ').filter(t => 
    !HIDDEN_TEACHERS.some(hidden => t.toLowerCase().includes(hidden.toLowerCase()))
  );
  return teachers.length > 0 ? teachers.join(', ') : '';
}
