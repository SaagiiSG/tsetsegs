import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
vi.mock('@/integrations/supabase/client', () => ({ supabase: {} }));
import { RARITY_COLORS } from '@/data/badgeDefinitions';
import { CenterBadgeGrid } from './CenterProfileView';

describe('center badge grid', () => {
  it('earned badge uses its rarity colour', () => {
    const html = renderToStaticMarkup(<CenterBadgeGrid badges={[{ key: 'master_SATMathTraining800', name: '150 master', desc: 'Solve every 150 question', got: true, prog: [2, 2], rarity: 'legendary', icon: 'Crown' }]} />);
    expect(html).toContain(RARITY_COLORS.legendary.border);
    expect(html).not.toContain('Worth:');
  });
});
