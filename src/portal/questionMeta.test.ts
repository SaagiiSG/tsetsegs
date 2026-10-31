import { describe, expect, it, vi } from 'vitest';

const rpc = vi.fn();
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    rpc: (...a: unknown[]) => rpc(...a),
    from: () => ({ select: () => Promise.resolve({ data: [{ id: 'c1', name: 'Algebra' }] }) }),
  },
}));

import { loadQuestionMeta } from './questionMeta';

describe('loadQuestionMeta', () => {
  it('chunks ids by 150 through the rpc and shapes domain', async () => {
    rpc.mockImplementation((_n: string, { _ids }: { _ids: string[] }) =>
      Promise.resolve({ data: _ids.map(id => ({ id, subject: 'math', skill: 's', category_id: id === 'q0' ? 'c1' : null, difficulty_level: 'easy' })) }));
    const ids = Array.from({ length: 151 }, (_, i) => `q${i}`);
    const out = await loadQuestionMeta([...ids, 'q0']);
    expect(rpc).toHaveBeenCalledTimes(2);
    expect(rpc).toHaveBeenCalledWith('intl_question_meta', { _ids: ids.slice(0, 150) });
    expect(out.q0.domain).toBe('Algebra');
    expect(out.q150.domain).toBe('Other');
  });
});
