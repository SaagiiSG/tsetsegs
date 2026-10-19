import { describe, expect, it } from 'vitest';
import { buildContentPatch } from '../../supabase/functions/sync-external-questions/contentPatch';

describe('question sync', () => {
  it('imports an explanation while preserving the hosted image', () => {
    expect(buildContentPatch({ rationale: 'old', question_image_url: 'hosted' }, { rationale: 'new', question_image_url: 'external' }, ['rationale', 'question_image_url'], true)).toEqual({ rationale: 'new' });
  });
  it('preserves local explanations when the external copy is blank', () => {
    expect(buildContentPatch({ rationale: 'local' }, { rationale: ' ' }, ['rationale'], false)).toEqual({});
  });
});