import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
vi.mock('@/integrations/supabase/client', () => ({ supabase: {} }));
import { PerkCards } from './PremiumWelcome';

describe('Premium perk cards', () => {
  it('open on the welcome card, with six dots, Next inside the card and Skip', () => {
    const html = renderToStaticMarkup(<PerkCards onDone={() => {}} reduce />);
    expect(html).toContain('Premium unlocked');
    expect(html).toContain('Welcome to Premium');
    expect(html).toContain('what');
    expect(html.match(/aria-label="Card \d of 6"/g)).toHaveLength(6);
    expect(html).toContain('Next');
    expect(html).toContain('>Skip<');
  });
});
