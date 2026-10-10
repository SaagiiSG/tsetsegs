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
