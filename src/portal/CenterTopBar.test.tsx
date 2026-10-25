import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup as html } from 'react-dom/server';
vi.mock('@/integrations/supabase/client', () => ({ supabase: {} }));
import { RankChip, RingChip, StreakChip } from './CenterTopBar';
describe('top bar chips', () => {
  it('keeps rank and ring off phones, streak on', () => {
    const rank = html(<RankChip rank={{ place: 3, tier: 'platinum' }} />);
    expect(rank).toContain('#3'); expect(rank).toContain('Emerald'); expect(rank).toMatch(/class="hidden md:inline-flex/);
    const ring = html(<RingChip p={[1, 0.4, 1]} closed={2} />);
    expect(ring).toContain('2/3'); expect(ring).toMatch(/class="hidden md:inline-flex/);
    const streak = html(<StreakChip days={5} />);
    expect(streak).toContain('>5<'); expect(streak).not.toContain('hidden');
  });
  it('draws the mini ring with positive radii', () => {
    const radii = [...html(<RingChip p={[1, 0.4, 1]} closed={2} />).matchAll(/ r="([^"]+)"/g)].map(m => Number(m[1]));
    expect(radii).toHaveLength(6); expect(radii.every(r => r > 0)).toBe(true);
  });
  it('shows no rank chip until the rank is real', () => expect(html(<RankChip rank={null} />)).toBe(''));
});
