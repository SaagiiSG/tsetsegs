import { describe, it, expect } from 'vitest';
import { alertLabel, alertOf, sessionDates } from './CenterStudentCards';

describe('sessionDates', () => {
  it('joins attendance and homework dates with the picked date, oldest first, once each', () => {
    const marks = [{ session_date: '2026-10-28' }, { session_date: '2026-10-21' }, { session_date: '2026-10-28' }];
    expect(sessionDates(marks, '2026-10-30')).toEqual(['2026-10-21', '2026-10-28', '2026-10-30']);
  });
  it('a picked date in the middle sits in order', () =>
    expect(sessionDates([{ session_date: '2026-10-01' }, { session_date: '2026-10-30' }], '2026-10-15')).toEqual(['2026-10-01', '2026-10-15', '2026-10-30']));
  it('a new class has just the picked date', () => expect(sessionDates([], '2026-10-30')).toEqual(['2026-10-30']));
});

describe('alertOf', () => {
  it('3 absent or sick raise it; late and excused do not count', () => {
    const a = alertOf(['absent', 'sick', 'late', 'excused', 'absent', 'present'], []);
    expect(a).toEqual({ hasAlert: true, missedClasses: 3, missedHomework: 0 });
    expect(alertLabel(a)).toBe('3A');
  });
  it('3 incomplete homework raise it', () => {
    const a = alertOf(['absent', 'absent'], ['incomplete', 'completed', 'incomplete', 'incomplete']);
    expect(a).toEqual({ hasAlert: true, missedClasses: 2, missedHomework: 3 });
    expect(alertLabel(a)).toBe('3H');
  });
  it('both counts show when both tripped', () => expect(alertLabel(alertOf(['absent', 'sick', 'sick', 'absent'], ['incomplete', 'incomplete', 'incomplete']))).toBe('4A/3H'));
  it('two of each is fine', () => expect(alertOf(['absent', 'sick'], ['incomplete', 'incomplete']).hasAlert).toBe(false));
});
