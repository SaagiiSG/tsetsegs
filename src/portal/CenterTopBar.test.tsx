import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup as html } from 'react-dom/server';
vi.mock('@/integrations/supabase/client', () => ({ supabase: {} }));
import { RankChip, RingChip, StreakChip } from './CenterTopBar';
describe('top bar chips', () => {
  it('keeps rank and ring off phones, streak on', () => {
    const rank = html(<RankChip rank={{ place: 3, tier: 'platinum' }} />);
    expect(rank).toContain('#3'); expect(rank).toContain('Emerald'); expect(rank).toMatch(/<img src="[^"]*platinum/); expect(rank).toMatch(/class="max-md:!hidden student-chip/);
    const ring = html(<RingChip p={[1, 0.4, 1]} closed={2} />);
    expect(ring).toContain('2/3'); expect(ring).toMatch(/class="max-md:!hidden student-chip/);
    const streak = html(<StreakChip days={5} />);
    expect(streak).toContain('>5<'); expect(streak).not.toContain('hidden');
  });
  it('draws the mini ring with positive radii', () => {
    const radii = [...html(<RingChip p={[1, 0.4, 1]} closed={2} />).matchAll(/ r="([^"]+)"/g)].map(m => Number(m[1]));
    expect(radii).toHaveLength(6); expect(radii.every(r => r > 0)).toBe(true);
  });
  it('shows what is left to win, then what was earned', () => {
    const open = html(<RingChip p={[1, 0, 0]} closed={1} left={70} />);
    expect(open).toContain('1/3'); expect(open).toContain('+70'); expect(open).toMatch(/class="max-md:!hidden student-chip/);
    expect(html(<RingChip p={[1, 1, 1]} closed={3} earned={90} left={0} />)).toContain('+90');
  });
  it('checks only once the bonus is paid, and says the prize aloud', () => {
    expect(html(<RingChip p={[1, 1, 1]} closed={3} earned={65} />)).not.toContain('✓');
    const paid = html(<RingChip p={[1, 1, 1]} closed={3} earned={90} allPaid />);
    expect(paid).toContain('+90 ✓'); expect(paid).toContain('aria-label="3 of 3 daily rings closed, 90 points earned, all rings paid"');
    expect(html(<RingChip p={[1, 0, 0]} closed={1} left={70} />)).toContain('aria-label="1 of 3 daily rings closed, 70 points to win"');
  });
  it('shows no rank chip until the rank is real', () => expect(html(<RankChip rank={null} />)).toBe(''));
});
