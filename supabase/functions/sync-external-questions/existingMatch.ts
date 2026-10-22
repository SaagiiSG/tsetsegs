// Finds the local row for an external question. The permanent external id (ext_question_id)
// comes first: original_cb_id can change in the external bank, and when it was the only key,
// 14 questions were imported twice under new local codes (found 22 Oct 2026).

export interface ExistingRow {
  id: string;
  question_id: string;
  original_cb_id: string | null;
  ext_question_id?: string | null;
  is_active?: boolean | null;
  created_at?: string | null;
}

interface ExternalQuestion { question_id: string; original_cb_id: string | null }

// With two rows for one external id, the active one wins, then the newest.
const better = (a: ExistingRow, b: ExistingRow) =>
  !!a.is_active !== !!b.is_active ? !!a.is_active : (a.created_at ?? '') > (b.created_at ?? '');

export function existingMatcher(rows: ExistingRow[]) {
  const byExt = new Map<string, ExistingRow>();
  const byCb = new Map<string, string>();
  const add = (r: ExistingRow) => {
    const cur = r.ext_question_id ? byExt.get(r.ext_question_id) : undefined;
    if (r.ext_question_id && (!cur || better(r, cur))) byExt.set(r.ext_question_id, r);
    if (r.original_cb_id) byCb.set(r.original_cb_id, r.id);
  };
  rows.forEach(add);
  return {
    add,
    /** Local row id, or null when the question is new here. */
    find: (q: ExternalQuestion): string | null =>
      byExt.get(q.question_id)?.id ?? byCb.get(q.original_cb_id || `ext_${q.question_id}`) ?? null,
  };
}
