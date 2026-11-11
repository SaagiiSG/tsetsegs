import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup as html } from 'react-dom/server';
import { DailyRing } from './DailyRing';
const base = { speed: { current: 1, goal: 2 }, hard: { current: 5, goal: 5 }, medium: { current: 0, goal: 10 } };
describe('DailyRing prizes', () => {
  it('shows what each ring pays, what was earned and the bonus', () => {
    const out = html(<DailyRing {...base} prizes={{ speed: { points: 20, paid: false }, hard: { points: 25, paid: true }, medium: { points: 20, paid: false }, all: { points: 25, paid: false } }} />);
    expect(out).toContain('+20'); expect(out).toContain('+25 earned'); expect(out).toContain('+25 bonus');
  });
  it('shows no prize for a ring with no goal, and no bonus', () => {
    const out = html(<DailyRing {...base} speed={{ current: 0, goal: 0 }} prizes={{ speed: { points: 0, paid: false }, hard: { points: 25, paid: false }, medium: { points: 20, paid: false }, all: { points: 25, paid: false } }} />);
    expect(out).not.toContain('bonus'); expect(out).toContain('+25');
  });
  it('renders as before without prizes', () => expect(html(<DailyRing {...base} />)).not.toContain('+'));
});
