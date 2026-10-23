import { supabase } from '@/integrations/supabase/client';

export async function centerAccounts<T = any>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke('tenant-accounts', { body });
  if (error) {
    const msg = await (error as any).context?.json?.().then((j: any) => j.error).catch(() => null);
    throw new Error(msg || 'Something went wrong. Please try again.');
  }
  return data as T;
}

export function localDate(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * The API returns at most 1,000 rows per request, so read page by page until a short page.
 * `page(from)` must end in `.range(from, from + 999)` after an order with a unique tiebreaker (e.g. `.order('id')`)
 * so pages don't overlap; `max` keeps big reads bounded.
 */
export async function allPages<T>(page: (from: number) => PromiseLike<{ data: T[] | null; error: unknown }>, max = Infinity) {
  const rows: T[] = [];
  for (let from = 0; from < max; from += 1000) {
    const { data, error } = await page(from);
    if (error) throw error;
    rows.push(...(data ?? []));
    if ((data?.length ?? 0) < 1000) break;
  }
  return rows.slice(0, max);
}
