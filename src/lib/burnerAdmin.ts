import { supabase } from '@/integrations/supabase/client';
import type { User } from '@supabase/supabase-js';

export const BURNER_DOMAIN = 'burner.tsetsegs.mn';

export interface BurnerAccount {
  id: string;
  email: string;
  label: string | null;
  created_at: string;
  expires_at: string | null;
  is_self: boolean;
}

export function isBurnerUser(user: User | null | undefined): boolean {
  return !!user?.email?.endsWith(`@${BURNER_DOMAIN}`);
}

export function burnerExpiresAt(user: User | null | undefined): number | null {
  const raw = (user?.user_metadata as any)?.expires_at;
  if (!raw) return null;
  const ts = Date.parse(raw);
  return Number.isNaN(ts) ? null : ts;
}

export function isBurnerExpired(user: User | null | undefined): boolean {
  if (!isBurnerUser(user)) return false;
  const ts = burnerExpiresAt(user);
  return ts === null || ts <= Date.now();
}

async function call<T>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke('burner-admin', { body });
  if (error) throw error;
  if ((data as any)?.error) throw new Error((data as any).error);
  return data as T;
}

export function listBurners() {
  return call<{ burners: BurnerAccount[]; purged: number }>({ action: 'list' });
}

export function createBurner(ttlMinutes: number, label?: string) {
  return call<{ burner: BurnerAccount & { password: string } }>({
    action: 'create',
    ttlMinutes,
    label,
  });
}

export function burnBurner(userId?: string) {
  return call<{ burned?: string; alreadyGone?: boolean }>({ action: 'burn', userId });
}

/** Fire-and-forget self destruct — used when a burner session ends. */
export async function selfDestructBurner() {
  try {
    await burnBurner();
  } catch {
    // The scheduled purge will remove it anyway.
  }
}
