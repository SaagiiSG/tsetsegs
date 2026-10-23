import { describe, expect, it } from 'vitest';
import { gettingStartedSteps } from './helpChecklist';

describe('gettingStartedSteps', () => {
  it('leaves every step unknown while data loads', () => {
    expect(gettingStartedSteps().every(s => s.done === undefined)).toBe(true);
  });

  it('ticks steps that have at least one record', () => {
    const done = Object.fromEntries(gettingStartedSteps({ classes: 2, teachers: 0, students: 5, attendance: 0, announcements: 1, sprints: 0 }).map(s => [s.to, s.done]));
    expect(done).toEqual({
      '/admin/batches/new': true, '/admin/team': false, '/admin/students': true, '/admin/batches': undefined,
      '/teacher': false, '/admin/announcements': true, '/admin/sprints': false,
    });
  });
});
