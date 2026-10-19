export function buildContentPatch(current: Record<string, unknown>, next: Record<string, unknown>, fields: readonly string[], preserveImage: boolean) {
  const patch: Record<string, unknown> = {};
  for (const field of fields) {
    if (field === 'rationale' && (next[field] == null || String(next[field]).trim() === '')) continue;
    if (field === 'question_image_url' && preserveImage) continue;
    if (JSON.stringify(current[field] ?? null) !== JSON.stringify(next[field] ?? null)) patch[field] = next[field] ?? null;
  }
  return patch;
}