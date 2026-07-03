import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useStudentAuth } from '@/contexts/StudentAuthContext';
import type { Challenge, Participant } from './useChallenge';

export interface HUDOpponent {
  id: string;
  name: string;
  score: number;
  correct_count: number;
  attempted_count: number;
}

interface ActiveChallengeState {
  challenge: Challenge | null;
  myPart: Participant | null;
  participantsCount: number;
  opponents: HUDOpponent[];
  loading: boolean;
}

/**
 * Finds the current student's currently-active (or lobby) challenge and keeps
 * it in sync via realtime. Used by the global HUD so an ongoing challenge is
 * visible from any page.
 */
export function useActiveChallenge() {
  const { student } = useStudentAuth();
  const [state, setState] = useState<ActiveChallengeState>({
    challenge: null,
    myPart: null,
    participantsCount: 0,
    opponents: [],
    loading: true,
  });

  const fetchActive = useCallback(async () => {
    if (!student?.id) {
      setState({ challenge: null, myPart: null, participantsCount: 0, opponents: [], loading: false });
      return;
    }
    // Find latest participant row where the joined challenge is active/lobby.
    const { data: partRows } = await supabase
      .from('challenge_participants')
      .select('*, challenges!inner(*)')
      .eq('student_account_id', student.id)
      .in('challenges.status', ['active'])
      .order('joined_at', { ascending: false })
      .limit(1);

    const row: any = partRows?.[0];
    if (!row) {
      setState({ challenge: null, myPart: null, participantsCount: 0, opponents: [], loading: false });
      return;
    }
    const challenge = row.challenges as Challenge;
    const myPart: Participant = { ...row };
    delete (myPart as any).challenges;

    const { data: allParts } = await supabase
      .from('challenge_participants')
      .select('id, display_name, student_account_id, score, correct_count, attempted_count')
      .eq('challenge_id', challenge.id);

    const opponents: HUDOpponent[] = (allParts ?? [])
      .filter((p: any) => p.student_account_id !== student.id)
      .map((p: any) => ({
        id: p.student_account_id,
        name: p.display_name || 'Player',
        score: p.score ?? 0,
        correct_count: p.correct_count ?? 0,
        attempted_count: p.attempted_count ?? 0,
      }));

    setState({
      challenge,
      myPart,
      participantsCount: allParts?.length ?? 1,
      opponents,
      loading: false,
    });

    setState({
      challenge,
      myPart,
      participantsCount: allParts?.length ?? 1,
      opponents,
      loading: false,
    });
  }, [student?.id]);

  useEffect(() => {
    fetchActive();
  }, [fetchActive]);

  // Realtime: refetch on any change to participants / challenges / attempts
  useEffect(() => {
    if (!student?.id) return;
    const channel = supabase
      .channel(`active-challenge-${student.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'challenge_participants' },
        () => fetchActive(),
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'challenges' },
        () => fetchActive(),
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'challenge_attempts' },
        () => fetchActive(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [student?.id, fetchActive]);

  // Instant local refresh when this student records an ambient attempt
  useEffect(() => {
    const handler = () => fetchActive();
    window.addEventListener('challenge:attempt-recorded', handler);
    return () => window.removeEventListener('challenge:attempt-recorded', handler);
  }, [fetchActive]);

  // Polling fallback while a challenge is active (covers dropped sockets)
  useEffect(() => {
    if (state.challenge?.status !== 'active') return;
    const t = setInterval(fetchActive, 4000);
    return () => clearInterval(t);
  }, [state.challenge?.status, fetchActive]);

  return { ...state, refresh: fetchActive };
}
