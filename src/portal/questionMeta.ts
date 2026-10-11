import { supabase } from '@/integrations/supabase/client';

export type QMeta = { id: string; subject: string | null; skill: string | null; category_id: string | null; difficulty_level?: string | null; domain: string };

/** Loads subject/domain/skill for a set of intl question ids (chunked to keep URLs short). */
export async function loadQuestionMeta(ids: string[]): Promise<Record<string, QMeta>> {
  const uniq = [...new Set(ids)];
  const [{ data: cats }, ...chunks] = await Promise.all([
    supabase.from('question_categories').select('id, name'),
    ...Array.from({ length: Math.ceil(uniq.length / 150) }, (_, i) =>
      supabase.from('intl_questions').select('id, subject, skill, category_id, difficulty_level').in('id', uniq.slice(i * 150, i * 150 + 150))),
  ]);
  const catName = Object.fromEntries((cats ?? []).map(c => [c.id, c.name]));
  const out: Record<string, QMeta> = {};
  for (const c of chunks) for (const q of (c.data ?? [])) out[q.id] = { ...q, domain: (q.category_id && catName[q.category_id]) || 'Other' };
  return out;
}

export type DomainStat = { domain: string; subject: string; n: number; c: number };
export function domainStats(attempts: { question_id: string; is_correct: boolean }[], meta: Record<string, QMeta>): DomainStat[] {
  const m: Record<string, DomainStat> = {};
  for (const a of attempts) {
    const q = meta[a.question_id]; if (!q) continue;
    const subject = (q.subject ?? 'math').toLowerCase();
    const s = (m[q.domain] ??= { domain: q.domain, subject, n: 0, c: 0 });
    s.n++; if (a.is_correct) s.c++;
  }
  return Object.values(m).sort((a, b) => a.subject.localeCompare(b.subject) || b.n - a.n);
}

export const pct = (c: number, n: number) => (n ? Math.round((100 * c) / n) : 0);
