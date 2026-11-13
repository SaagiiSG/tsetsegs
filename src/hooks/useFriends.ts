import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useStudentAuth } from '@/contexts/StudentAuthContext';
import { normalizeCohort } from '@/lib/cohort';

export interface FriendRow {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: 'pending' | 'accepted' | 'blocked';
  created_at: string;
  // friend metadata (resolved on client)
  friend_account_id: string;
  friend_phone: string;
  friend_name: string;
  direction: 'incoming' | 'outgoing';
}

interface Raw {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: 'pending' | 'accepted' | 'blocked';
  created_at: string;
}

export function useFriends() {
  const { student } = useStudentAuth();
  const [rows, setRows] = useState<FriendRow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    if (!student?.id) return;
    setLoading(true);

    const { data: raw } = await supabase
      .from('student_friendships')
      .select('id, requester_id, addressee_id, status, created_at')
      .or(`requester_id.eq.${student.id},addressee_id.eq.${student.id}`)
      .order('created_at', { ascending: false });

    const rawRows = (raw ?? []) as Raw[];
    const otherIds = Array.from(
      new Set(rawRows.map((r) => (r.requester_id === student.id ? r.addressee_id : r.requester_id))),
    );

    let nameByAccount = new Map<string, { name: string; phone: string }>();
    if (otherIds.length > 0) {
      // A definer lookup: students read only their own account row; the phone comes back for friends and incoming requests.
      const { data: names } = await supabase.rpc('student_display_names' as any, { _ids: otherIds });
      ((names ?? []) as any[]).forEach((n) => {
        const name = `${n.first_name ?? ''} ${n.last_name ?? ''}`.trim();
        nameByAccount.set(n.id, { name: name || n.friend_phone || 'Friend', phone: n.friend_phone ?? '' });
      });
    }

    const built: FriendRow[] = rawRows.map((r) => {
      const otherId = r.requester_id === student.id ? r.addressee_id : r.requester_id;
      const meta = nameByAccount.get(otherId) ?? { name: 'Friend', phone: '' };
      return {
        ...r,
        friend_account_id: otherId,
        friend_phone: meta.phone,
        friend_name: meta.name,
        direction: r.requester_id === student.id ? 'outgoing' : 'incoming',
      };
    });

    setRows(built);
    setLoading(false);
  }, [student?.id]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // Realtime: refresh on any friendship change involving this student
  useEffect(() => {
    if (!student?.id) return;
    const channel = supabase
      .channel(`friendships-${student.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'student_friendships' }, (payload) => {
        const row: any = payload.new ?? payload.old;
        if (!row) return;
        if (row.requester_id === student.id || row.addressee_id === student.id) {
          fetchAll();
        }
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [student?.id, fetchAll]);

  const sendRequest = useCallback(
    async (phoneRaw: string): Promise<{ error: string | null }> => {
      if (!student?.id) return { error: 'Not signed in' };
      const phone = phoneRaw.trim().replace(/[^0-9+]/g, '');
      if (!phone) return { error: 'Enter a phone number' };
      if (phone === student.phone_number || phone === student.phone_number.replace(/-/g, '')) {
        return { error: "You can't add yourself" };
      }

      // Friend must exist in students table (enrolled) AND have a student_account (a definer lookup, no phones back)
      const { data: found } = await supabase.rpc('student_find_by_phone' as any, { _phone: phone });
      const hit = ((found ?? []) as any[])[0];
      if (!hit) {
        return { error: 'No student with that phone number' };
      }
      // Only SAT students can be added
      if (hit.course_type && hit.course_type !== 'SAT') {
        return { error: 'That student is not enrolled in SAT' };
      }
      if (!hit.account_id) {
        return { error: 'That student has not signed in yet' };
      }
      if (hit.account_id === student.id) return { error: "You can't add yourself" };
      // Friends stay inside their own cohort so competition worlds never mix
      if (normalizeCohort(hit.cohort) !== normalizeCohort(student.cohort)) {
        return { error: 'No student with that phone number' };
      }

      const { error } = await supabase.from('student_friendships').insert({
        requester_id: student.id,
        addressee_id: hit.account_id,
        status: 'pending',
      });
      if (error) {
        if (error.code === '23505') return { error: 'Friend request already exists' };
        return { error: error.message };
      }
      await fetchAll();
      return { error: null };
    },
    [student, fetchAll],
  );

  const respond = useCallback(
    async (rowId: string, accept: boolean) => {
      const { error } = await supabase
        .from('student_friendships')
        .update({
          status: accept ? 'accepted' : 'blocked',
          responded_at: new Date().toISOString(),
        })
        .eq('id', rowId);
      if (!error) await fetchAll();
      return { error: error?.message ?? null };
    },
    [fetchAll],
  );

  const remove = useCallback(
    async (rowId: string) => {
      await supabase.from('student_friendships').delete().eq('id', rowId);
      await fetchAll();
    },
    [fetchAll],
  );

  const accepted = rows.filter((r) => r.status === 'accepted');
  const incoming = rows.filter((r) => r.status === 'pending' && r.direction === 'incoming');
  const outgoing = rows.filter((r) => r.status === 'pending' && r.direction === 'outgoing');

  return { all: rows, accepted, incoming, outgoing, loading, sendRequest, respond, remove, refresh: fetchAll };
}
