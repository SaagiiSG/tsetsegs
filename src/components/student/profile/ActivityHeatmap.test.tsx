import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup as html } from 'react-dom/server';
import { addDays, format } from 'date-fns';
import { ActivityHeatmap } from './ActivityHeatmap';

// 371 days ending 28 Oct 2026; the first week holds only a few October days.
const days = Array.from({ length: 371 }, (_, i) => ({ date: format(addDays(new Date(2025, 9, 23), i), 'yyyy-MM-dd'), points: i === 367 ? 10 : 0, sessionsCount: 0 }));

describe('ActivityHeatmap month labels', () => {
  const out = html(<ActivityHeatmap activityData={days} currentStreak={0} longestStreak={1} totalActiveDays={1} />);
  const labels = [...out.matchAll(/style="left:([\d.]+)(px|%)"[^>]*>(\w{3})</g)].map(m => ({ left: +m[1], unit: m[2], month: m[3] }));

  it('sit on their week column in pixels, so they line up with the fixed-size grid at any card width', () => {
    expect(labels.length).toBeGreaterThan(10);
    expect(labels.every(l => l.unit === 'px' && l.left % 12 === 0)).toBe(true);
  });

  it('never overlap: a month that starts within 3 weeks of the last label replaces it', () => {
    labels.slice(1).forEach((l, i) => expect(l.left - labels[i].left).toBeGreaterThanOrEqual(36));
    expect(labels[0].month).toBe('Nov');
    expect(labels.at(-1)!.month).toBe('Oct');
  });
});
