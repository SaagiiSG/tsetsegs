// PostgREST filter for the figures-only run: originals hold is_variant false or null; variants (true) are excluded.
export const ORIGINALS_ONLY = "is_variant.is.null,is_variant.eq.false";
// keepWhenBlank: fields a blank external value never wipes (local explanations; local drawings on figures-only runs).
export function buildContentPatch(current: Record<string, unknown>, next: Record<string, unknown>, fields: readonly string[], preserveImage: boolean, keepWhenBlank: readonly string[] = ['rationale']) {
  const patch: Record<string, unknown> = {};
  for (const field of fields) {
    if (keepWhenBlank.includes(field) && (next[field] == null || String(next[field]).trim() === '')) continue;
    if (field === 'question_image_url' && preserveImage) continue;
    if (JSON.stringify(current[field] ?? null) !== JSON.stringify(next[field] ?? null)) patch[field] = next[field] ?? null;
  }
  return patch;
}
