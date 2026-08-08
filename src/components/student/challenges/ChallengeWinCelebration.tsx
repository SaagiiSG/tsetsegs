import { useEffect, useRef, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import Confetti from 'react-confetti';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Trophy, Swords, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useStudentAuth } from '@/contexts/StudentAuthContext';

interface WinPayload {
  challengeId: string;
  winnerName: string;
  winnerScore: number;
  isMe: boolean;
  runnerUpName: string | null;
  myPlace: number | null;
  totalPlayers: number;
}

const seenKey = (id: string) => `challenge:win-seen:${id}`;

/**
 * Global listener: whenever a challenge the student took part in finishes,
 * everyone in that challenge gets a celebration popup announcing the winner.
 */
export function ChallengeWinCelebration() {
  const { student } = useStudentAuth();
  const navigate = useNavigate();
  const [win, setWin] = useState<WinPayload | null>(null);
  const inflight = useRef<Set<string>>(new Set());

  const handleFinished = useCallback(
    async (challengeId: string) => {
      if (!student?.id) return;
      if (inflight.current.has(challengeId)) return;
      if (localStorage.getItem(seenKey(challengeId))) return;
      inflight.current.add(challengeId);

      const { data: parts } = await supabase
        .from('challenge_participants')
        .select('student_account_id, display_name, score, correct_count, total_time_ms, place')
        .eq('challenge_id', challengeId);

      if (!parts || parts.length === 0) return;
      // Only notify actual competitors
      if (!parts.some((p: any) => p.student_account_id === student.id)) return;
      if (parts.length < 2) return; // solo run — nothing to celebrate socially

      const sorted = [...parts].sort((a: any, b: any) => {
        if (a.place && b.place) return a.place - b.place;
        return (
          (b.score ?? 0) - (a.score ?? 0) ||
          (b.correct_count ?? 0) - (a.correct_count ?? 0) ||
          (a.total_time_ms ?? 0) - (b.total_time_ms ?? 0)
        );
      });
      const winner: any = sorted[0];
      const me: any = parts.find((p: any) => p.student_account_id === student.id);

      localStorage.setItem(seenKey(challengeId), '1');
      setWin({
        challengeId,
        winnerName: winner.display_name || 'Player',
        winnerScore: winner.score ?? 0,
        isMe: winner.student_account_id === student.id,
        runnerUpName: sorted[1]?.display_name ?? null,
        myPlace: me?.place ?? sorted.findIndex((p: any) => p.student_account_id === student.id) + 1,
        totalPlayers: parts.length,
      });
    },
    [student?.id],
  );

  // Realtime: any challenge flipping to finished
  useEffect(() => {
    if (!student?.id) return;
    const channel = supabase
      .channel(`challenge-wins-${student.id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'challenges' },
        (payload: any) => {
          if (payload.new?.status === 'finished') handleFinished(payload.new.id);
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [student?.id, handleFinished]);

  // Safety net: on mount, catch a challenge that finished while offline
  useEffect(() => {
    if (!student?.id) return;
    (async () => {
      const since = new Date(Date.now() - 1000 * 60 * 30).toISOString();
      const { data } = await supabase
        .from('challenge_participants')
        .select('challenge_id, challenges!inner(id, status, finished_at)')
        .eq('student_account_id', student.id)
        .eq('challenges.status', 'finished')
        .gte('challenges.finished_at', since)
        .order('joined_at', { ascending: false })
        .limit(3);
      (data ?? []).forEach((row: any) => handleFinished(row.challenge_id));
    })();
  }, [student?.id, handleFinished]);

  const close = () => setWin(null);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {win && (
        <motion.div
          className="fixed inset-0 z-[200] flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={close} />
          <Confetti
            width={window.innerWidth}
            height={window.innerHeight}
            numberOfPieces={win.isMe ? 320 : 140}
            recycle={false}
            gravity={0.25}
            className="pointer-events-none"
          />
          <motion.div
            initial={{ scale: 0.85, y: 24, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 22 }}
            className="relative w-full max-w-sm rounded-3xl border bg-card p-6 text-center shadow-2xl"
          >
            <button
              onClick={close}
              aria-label="Close"
              className="absolute right-3 top-3 rounded-full p-1.5 text-muted-foreground hover:bg-muted"
            >
              <X className="h-4 w-4" />
            </button>

            <motion.div
              animate={{ rotate: [0, -8, 8, -4, 0] }}
              transition={{ duration: 0.8, delay: 0.15 }}
              className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/15"
            >
              <Trophy className="h-9 w-9 text-amber-500" />
            </motion.div>

            <h2 className="text-2xl font-bold">
              {win.isMe ? 'You won! 🎉' : `${win.winnerName} won!`}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {win.isMe
                ? `You took 1st out of ${win.totalPlayers}${win.runnerUpName ? ` — ${win.runnerUpName} came second.` : '.'}`
                : `Challenge finished — you placed #${win.myPlace} of ${win.totalPlayers}.`}
            </p>

            <div className="mt-4 rounded-2xl bg-muted/50 p-3">
              <div className="text-xs uppercase tracking-wide text-muted-foreground">Winning score</div>
              <div className="font-mono text-3xl font-bold tabular-nums">{win.winnerScore}</div>
            </div>

            <div className="mt-5 flex gap-2">
              <Button variant="outline" className="flex-1" onClick={close}>
                Nice
              </Button>
              <Button
                className="flex-1"
                onClick={() => {
                  const id = win.challengeId;
                  close();
                  navigate(`/practice/challenges/${id}/results`);
                }}
              >
                <Swords className="h-4 w-4" /> See results
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
