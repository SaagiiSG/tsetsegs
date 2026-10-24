import { describe, expect, it } from 'vitest';
import { buildContentPatch, ORIGINALS_ONLY } from '../../supabase/functions/sync-external-questions/contentPatch';

describe('question sync', () => {
  it('imports an explanation while preserving the hosted image', () => {
    expect(buildContentPatch({ rationale: 'old', question_image_url: 'hosted' }, { rationale: 'new', question_image_url: 'external' }, ['rationale', 'question_image_url'], true)).toEqual({ rationale: 'new' });
  });
  it('preserves local explanations when the external copy is blank', () => {
    expect(buildContentPatch({ rationale: 'local' }, { rationale: ' ' }, ['rationale'], false)).toEqual({});
  });
  it('figures-only: copies a changed drawing but never wipes a local one', () => {
    const figs = ['figure_svg', 'figure_description'];
    expect(buildContentPatch({ figure_svg: '<svg>old</svg>', figure_description: 'd' }, { figure_svg: '<svg>new</svg>', figure_description: 'd' }, figs, false, figs)).toEqual({ figure_svg: '<svg>new</svg>' });
    expect(buildContentPatch({ figure_svg: '<svg>local</svg>', figure_description: 'local' }, { figure_svg: null, figure_description: '' }, figs, false, figs)).toEqual({});
  });
  it('figures-only keeps originals (is_variant false or null) and drops variants', () => {
    expect(ORIGINALS_ONLY).toBe('is_variant.is.null,is_variant.eq.false');
  });
});
import { existingMatcher } from '../../supabase/functions/sync-external-questions/existingMatch';

describe('matching external questions to local rows', () => {
  const row = (id: string, extra: Record<string, unknown> = {}) => ({ id, question_id: id.toUpperCase(), original_cb_id: null, ...extra });

  it('finds the row by its permanent external id even after the CB id changed', () => {
    const m = existingMatcher([row('a', { ext_question_id: '01668cd6', original_cb_id: 'ext_01668cd6', is_active: true })]);
    expect(m.find({ question_id: '01668cd6', original_cb_id: 'CB-NEW' })).toBe('a');
  });

  it('prefers the active copy, then the newest, when an external id has two rows', () => {
    const m = existingMatcher([
      row('old', { ext_question_id: 'x1', is_active: true, created_at: '2026-08-01' }),
      row('new', { ext_question_id: 'x1', is_active: true, created_at: '2026-09-01' }),
      row('newest-off', { ext_question_id: 'x1', is_active: false, created_at: '2026-10-01' }),
    ]);
    expect(m.find({ question_id: 'x1', original_cb_id: null })).toBe('new');
  });

  it('falls back to the CB id, or the ext_ key, for rows saved without an external id', () => {
    const m = existingMatcher([row('cb', { original_cb_id: 'CB-7' }), row('ext', { original_cb_id: 'ext_ab12' })]);
    expect(m.find({ question_id: 'zz', original_cb_id: 'CB-7' })).toBe('cb');
    expect(m.find({ question_id: 'ab12', original_cb_id: null })).toBe('ext');
    expect(m.find({ question_id: 'nope', original_cb_id: null })).toBeNull();
  });

  it('remembers rows inserted earlier in the same run', () => {
    const m = existingMatcher([]);
    m.add(row('fresh', { ext_question_id: 'q9', original_cb_id: 'CB-9' }));
    expect(m.find({ question_id: 'q9', original_cb_id: 'CB-other' })).toBe('fresh');
  });
});
