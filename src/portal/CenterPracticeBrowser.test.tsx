import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
vi.mock('@/integrations/supabase/client', () => ({ supabase: {} }));
vi.mock('@tanstack/react-query', () => ({ useQuery: () => ({ isError: true, isLoading: false, data: undefined, refetch: () => {} }) }));
import { CenterPracticeBrowser } from './CenterPracticeBrowser';

describe('practice browser', () => {
  it('says it could not load, and shows no 0, when the read fails', () => {
    const html = renderToStaticMarkup(<CenterPracticeBrowser attempts={[]} subject="math" setKey="150" onSubject={() => {}} onSet={() => {}} onOpen={() => {}} onRandom={() => {}} />);
    expect(html).toContain('Couldn&#x27;t load questions.');
    expect(html).toContain('Try again');
    expect(html).not.toContain('No questions here yet');
    expect(html).not.toMatch(/>0</);
    expect(html).not.toMatch(/\(0\)|0\/0|0%/);
  });
});
