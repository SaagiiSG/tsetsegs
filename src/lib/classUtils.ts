export function isOnlineClass(schedule: string): boolean {
  return schedule.includes("Online") || schedule.includes("online");
}

// Teachers whose names should be hidden on student reveal panels
export const HIDDEN_TEACHERS = ['Enguun', 'Khulan'];

export function filterVisibleTeachers(teacherString: string): string {
  const teachers = teacherString.split(', ').filter(t => 
    !HIDDEN_TEACHERS.some(hidden => t.toLowerCase().includes(hidden.toLowerCase()))
  );
  return teachers.length > 0 ? teachers.join(', ') : '';
}
