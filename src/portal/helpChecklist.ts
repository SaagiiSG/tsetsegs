export type ChecklistCounts = { classes?: number; teachers?: number; students?: number; attendance?: number; announcements?: number; sprints?: number };

/** Center admin "Getting started" steps. `done` is undefined while loading, or when the portal can't tell. */
export function gettingStartedSteps(c: ChecklistCounts = {}) {
  const has = (n?: number) => (n === undefined ? undefined : n > 0);
  return [
    { label: 'Create a batch (a class group)', to: '/admin/batches/new', done: has(c.classes) },
    { label: 'Add your teachers', to: '/admin/team', done: has(c.teachers) },
    { label: 'Add students (one by one, or Import students to paste a whole list)', to: '/admin/students', done: has(c.students) },
    { label: "Share a batch's sign-up link or QR code", to: '/admin/batches', done: undefined },
    { label: 'Take attendance in Teacher view', to: '/teacher', done: has(c.attendance) },
    { label: 'Post an announcement', to: '/admin/announcements', done: has(c.announcements) },
    { label: 'Start a sprint', to: '/admin/sprints', done: has(c.sprints) },
  ];
}
