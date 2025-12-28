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

// Format new JSONB schedule for display - groups days with same time
export function formatJsonSchedule(schedule: TimeSlot[]): string {
  if (!schedule || schedule.length === 0) return '';
  
  // Group slots by time (start_time-end_time)
  const timeGroups: Record<string, string[]> = {};
  
  schedule.forEach(slot => {
    const timeKey = `${slot.start_time}-${slot.end_time}`;
    const dayName = DAY_MAP[slot.day] || slot.day;
    if (!timeGroups[timeKey]) {
      timeGroups[timeKey] = [];
    }
    timeGroups[timeKey].push(dayName);
  });
  
  // Format each group: "Mon,Wed,Fri 16:40-18:30"
  return Object.entries(timeGroups)
    .map(([time, days]) => `${days.join('/')} ${time}`)
    .join(' + ');
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
