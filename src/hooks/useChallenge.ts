import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useStudentAuth } from '@/contexts/StudentAuthContext';

export interface Challenge {
  id: string;
  host_account_id: string;
  format: 'first_to_points' | 'first_to_correct' | 'time_sprint' | 'fixed_set';
  subject: 'math' | 'english';
  question_set: string;
  target_value: number | null;
  duration_seconds: number | null;
  status: 'lobby' | 'active' | 'finished' | 'cancelled';
  started_at: string | null;
  finished_at: string | null;
  winner_account_id: string | null;
  max_players: number;
  created_at: string;
}

export interface Participant {
  id: string;
  challenge_id: string;
  student_account_id: string;
  display_name: string | null;
  ready_at: string | null;
  score: number;
  correct_count: number;
  attempted_count: number;
  total_time_ms: number;
  finished_at: string | null;
  place: number | null;
}

interface CreateChallengeArgs {
  format: Challenge['format'];
  subject: Challenge['subject'];
  question_set: string;
  target_value?: number | null;
  duration_seconds?: number | null;
  invited_account_ids: string[]; // friend account ids
}

async function fetchQuestionPool(subject: string, question_set: string, limit = 60) {
  let q = supabase.from('questions').select('id').eq('is_active', true).eq('question_type', 'multiple_choice');
  if (subject === 'english' || question_set === 'English') {
    q = q.eq('subject', 'english');
  } else {
    // math: anything that isn't english
    q = q.or('subject.is.null,subject.neq.english');
  }
  if (question_set !== 'all' && question_set !== 'English') {
    q = q.eq('question_set', question_set);
  }
  const { data, error } = await q.limit(800);
  if (error) throw error;
  const ids = (data ?? []).map((r: any) => r.id);
  // shuffle
  for (let i = ids.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [ids[i], ids[j]] = [ids[j], ids[i]];
  }
  return ids.slice(0, limit);
}

export function useChallenge(challengeId: string | null) {
  const { student } = useStudentAuth();
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!challengeId) return;
    setLoading(true);
    const [{ data: ch }, { data: parts }] = await Promise.all([
      supabase.from('challenges').select('*').eq('id', challengeId).maybeSingle(),
      supabase.from('challenge_participants').select('*').eq('challenge_id', challengeId).order('joined_at'),
    ]);
    setChallenge((ch as Challenge) ?? null);
    setParticipants((parts as Participant[]) ?? []);
    setLoading(false);
  }, [challengeId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Realtime subscriptions
  useEffect(() => {
    if (!challengeId) return;
    const channel = supabase
      .channel(`challenge-${challengeId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'challenges', filter: `id=eq.${challengeId}` },
        (payload) => {
          if (payload.eventType === 'DELETE') {
            setChallenge(null);
          } else {
            setChallenge(payload.new as Challenge);
          }
        },
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'challenge_participants', filter: `challenge_id=eq.${challengeId}` },
        () => {
          // simplest: refetch participants
          supabase
            .from('challenge_participants')
            .select('*')
            .eq('challenge_id', challengeId)
            .order('joined_at')
            .then(({ data }) => setParticipants((data as Participant[]) ?? []));
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [challengeId]);

  const setReady = useCallback(
    async (ready: boolean) => {
      if (!challengeId || !student?.id) return;
      await supabase
        .from('challenge_participants')
        .update({ ready_at: ready ? new Date().toISOString() : null })
        .eq('challenge_id', challengeId)
        .eq('student_account_id', student.id);
    },
    [challengeId, student?.id],
  );

  const startChallenge = useCallback(async () => {
    if (!challenge || !student?.id) return { error: 'no challenge' };
    if (challenge.host_account_id !== student.id) return { error: 'only the host can start' };
    const { error } = await supabase
      .from('challenges')
      .update({ status: 'active', started_at: new Date().toISOString() })
      .eq('id', challenge.id);
    return { error: error?.message ?? null };
  }, [challenge, student?.id]);

  const cancelChallenge = useCallback(async () => {
    if (!challenge || !student?.id) return;
    if (challenge.host_account_id !== student.id) return;
    await supabase.from('challenges').update({ status: 'cancelled' }).eq('id', challenge.id);
  }, [challenge, student?.id]);

  const finishTimeSprint = useCallback(async () => {
    if (!challenge) return;
    if (challenge.status !== 'active') return;
    await supabase.from('challenges').update({ status: 'finished' }).eq('id', challenge.id);
  }, [challenge]);

  return { challenge, participants, loading, refresh, setReady, startChallenge, cancelChallenge, finishTimeSprint };
}

// ---- creating a challenge ----
export async function createChallenge(
  hostAccountId: string,
  hostDisplayName: string,
  args: CreateChallengeArgs,
): Promise<{ id: string | null; error: string | null }> {
  // 0. Enforce one active challenge per student (host)
  const { data: existing } = await supabase
    .from('challenge_participants')
    .select('challenge_id, challenges!inner(status)')
    .eq('student_account_id', hostAccountId)
    .in('challenges.status', ['lobby', 'active']);
  if (existing && existing.length > 0) {
    return { id: null, error: 'You already have an active challenge. Finish or cancel it first.' };
  }

  // 1. Build question pool
  let poolIds: string[] = [];
  try {
    const desiredPool =
      args.format === 'fixed_set' ? args.target_value ?? 10 : args.format === 'first_to_correct' ? Math.max(60, (args.target_value ?? 25) * 2) : 60;
    poolIds = await fetchQuestionPool(args.subject, args.question_set, desiredPool);
  } catch (e: any) {
    return { id: null, error: e.message ?? 'Could not fetch questions' };
  }
  if (poolIds.length === 0) return { id: null, error: 'No questions found for that set' };
  if (args.format === 'fixed_set' && poolIds.length < (args.target_value ?? 10)) {
    return { id: null, error: 'Not enough questions in that set' };
  }

  // 2. Insert challenge
  const { data: ch, error: chErr } = await supabase
    .from('challenges')
    .insert({
      host_account_id: hostAccountId,
      format: args.format,
      subject: args.subject,
      question_set: args.question_set,
      target_value: args.target_value ?? null,
      duration_seconds: args.duration_seconds ?? null,
      status: 'lobby',
      max_players: 5,
    })
    .select('id')
    .single();
  if (chErr || !ch) return { id: null, error: chErr?.message ?? 'Failed to create challenge' };

  // 3. Insert host as participant
  await supabase.from('challenge_participants').insert({
    challenge_id: ch.id,
    student_account_id: hostAccountId,
    display_name: hostDisplayName,
    ready_at: new Date().toISOString(),
  });

  // 4. Insert invited friends as participants (skip any already in an active challenge)
  if (args.invited_account_ids.length > 0) {
    const { data: busy } = await supabase
      .from('challenge_participants')
      .select('student_account_id, challenges!inner(status)')
      .in('student_account_id', args.invited_account_ids)
      .in('challenges.status', ['lobby', 'active']);
    const busySet = new Set((busy ?? []).map((b: any) => b.student_account_id));
    const availableIds = args.invited_account_ids.filter((id) => !busySet.has(id));

    if (availableIds.length > 0) {
      const { data: accts } = await supabase
        .from('student_accounts')
        .select('id, phone_number')
        .in('id', availableIds);
      const phones = (accts ?? []).map((a: any) => a.phone_number);
      const { data: studs } = await supabase
        .from('students')
        .select('first_name, last_name, phone')
        .in('phone', phones);
      const nameByPhone = new Map<string, string>();
      (studs ?? []).forEach((s: any) => nameByPhone.set(s.phone, `${s.first_name ?? ''} ${s.last_name ?? ''}`.trim()));
      const rows = (accts ?? []).map((a: any) => ({
        challenge_id: ch.id,
        student_account_id: a.id,
        display_name: nameByPhone.get(a.phone_number) || a.phone_number,
      }));
      if (rows.length > 0) {
        await supabase.from('challenge_participants').insert(rows);
      }
    }
  }

  // 5. Insert question pool
  const qRows = poolIds.map((qid, i) => ({ challenge_id: ch.id, question_id: qid, order_index: i }));
  await supabase.from('challenge_questions').insert(qRows);

  return { id: ch.id, error: null };
}

// List of challenges the current student is part of (lobby or active or recent finished)
export function useMyChallenges() {
  const { student } = useStudentAuth();
  const [rows, setRows] = useState<
    Array<{ challenge: Challenge; my: Participant; participants: number }>
  >([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    if (!student?.id) return;
    setLoading(true);
    // Find participant rows for me
    const { data: myParts } = await supabase
      .from('challenge_participants')
      .select('*')
      .eq('student_account_id', student.id)
      .order('joined_at', { ascending: false })
      .limit(30);
    const chIds = (myParts ?? []).map((p: any) => p.challenge_id);
    if (chIds.length === 0) {
      setRows([]);
      setLoading(false);
      return;
    }
    const { data: chs } = await supabase.from('challenges').select('*').in('id', chIds);
    const { data: counts } = await supabase
      .from('challenge_participants')
      .select('challenge_id')
      .in('challenge_id', chIds);
    const countMap = new Map<string, number>();
    (counts ?? []).forEach((c: any) => countMap.set(c.challenge_id, (countMap.get(c.challenge_id) ?? 0) + 1));
    const chMap = new Map<string, Challenge>();
    (chs ?? []).forEach((c: any) => chMap.set(c.id, c));
    const built = (myParts ?? [])
      .map((p: any) => {
        const c = chMap.get(p.challenge_id);
        if (!c) return null;
        return { challenge: c, my: p as Participant, participants: countMap.get(p.challenge_id) ?? 1 };
      })
      .filter(Boolean) as Array<{ challenge: Challenge; my: Participant; participants: number }>;
    setRows(built);
    setLoading(false);
  }, [student?.id]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  useEffect(() => {
    if (!student?.id) return;
    const channel = supabase
      .channel(`my-challenges-${student.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'challenges' }, () => fetchAll())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'challenge_participants' }, () => fetchAll())
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [student?.id, fetchAll]);

  return { rows, loading, refresh: fetchAll };
}
