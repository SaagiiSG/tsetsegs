import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useStudentAuth } from '@/contexts/StudentAuthContext';
import type { Challenge, Participant } from './useChallenge';

interface ActiveChallengeState {
  challenge: Challenge | null;
  myPart: Participant | null;
  participantsCount: number;
  opponents: string[];
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
      .select('display_name, student_account_id')
      .eq('challenge_id', challenge.id);

    const opponents = (allParts ?? [])
      .filter((p: any) => p.student_account_id !== student.id)
      .map((p: any) => p.display_name || 'Player');

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

  // Realtime: refetch on any change to my participant rows or challenges I'm in
  useEffect(() => {
    if (!student?.id) return;
    const channel = supabase
      .channel(`active-challenge-${student.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'challenge_participants',
          filter: `student_account_id=eq.${student.id}`,
        },
        () => fetchActive(),
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'challenges' },
        (payload) => {
          const ch = payload.new as Challenge;
          setState((s) => {
            // If it's our current challenge, patch it inline for snappy updates
            if (s.challenge && ch.id === s.challenge.id) {
              return { ...s, challenge: ch };
            }
            return s;
          });
          // Also refetch to catch status transitions (finished/cancelled)
          fetchActive();
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [student?.id, fetchActive]);

  return { ...state, refresh: fetchActive };
}
