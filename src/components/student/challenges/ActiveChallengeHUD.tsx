import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Sword, Calculator, BookOpen, Users, Trophy, Crown } from 'lucide-react';
import { useActiveChallenge } from '@/hooks/useActiveChallenge';
import { useChallenge } from '@/hooks/useChallenge';
import { useStudentAuth } from '@/contexts/StudentAuthContext';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';

export function ActiveChallengeHUD() {
  const { challenge, myPart, opponents, participantsCount } = useActiveChallenge();
  const { student } = useStudentAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [sheetOpen, setSheetOpen] = useState(false);

  // Hide on the fixed_set play screen itself
  const onPlayScreen = challenge ? pathname === `/practice/challenges/${challenge.id}/play` : false;
  // Hide on the challenges hub / results / lobby to reduce visual noise
  const onChallengesPage = pathname.startsWith('/practice/challenges');

  // Auto-navigate to results when the active challenge flips to finished
  const finishedRef = useRef<string | null>(null);
  useEffect(() => {
    if (!challenge) return;
    if ((challenge.status === 'finished' || challenge.status === 'cancelled') && finishedRef.current !== challenge.id) {
      finishedRef.current = challenge.id;
      if (challenge.status === 'finished') {
        navigate(`/practice/challenges/${challenge.id}/results`);
      }
    }
  }, [challenge?.status, challenge?.id, navigate]);

  // Time-sprint tick
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!challenge || challenge.format !== 'time_sprint' || !challenge.started_at) return;
    const t = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(t);
  }, [challenge?.format, challenge?.started_at, challenge?.id]);

  const visible = !!challenge && !onPlayScreen && !onChallengesPage;

  const { targetText, progressPct } = useMemo(() => {
    if (!challenge) return { targetText: '', progressPct: 0 };
    if (challenge.format === 'first_to_points' && challenge.target_value) {
      const s = myPart?.score ?? 0;
      return {
        targetText: `${s} / ${challenge.target_value} pts`,
        progressPct: Math.min(100, (s / challenge.target_value) * 100),
      };
    }
    if (challenge.format === 'first_to_correct' && challenge.target_value) {
      const c = myPart?.correct_count ?? 0;
      return {
        targetText: `${c} / ${challenge.target_value} ✓`,
        progressPct: Math.min(100, (c / challenge.target_value) * 100),
      };
    }
    if (challenge.format === 'fixed_set' && challenge.target_value) {
      const a = myPart?.attempted_count ?? 0;
      return {
        targetText: `${a} / ${challenge.target_value}`,
        progressPct: Math.min(100, (a / challenge.target_value) * 100),
      };
    }
    if (challenge.format === 'time_sprint' && challenge.duration_seconds && challenge.started_at) {
      const end = new Date(challenge.started_at).getTime() + challenge.duration_seconds * 1000;
      const remaining = Math.max(0, Math.floor((end - now) / 1000));
      const mm = Math.floor(remaining / 60);
      const ss = String(remaining % 60).padStart(2, '0');
      return {
        targetText: `${mm}:${ss} left`,
        progressPct: Math.min(100, ((challenge.duration_seconds - remaining) / challenge.duration_seconds) * 100),
      };
    }
    return { targetText: '', progressPct: 0 };
  }, [challenge, myPart, now]);

  if (!visible || !challenge) return null;

  const SubjectIcon = challenge.subject === 'math' ? Calculator : BookOpen;
  const opponentLabel =
    opponents.length === 0
      ? 'Solo'
      : opponents.length === 1
      ? opponents[0]
      : `${opponents[0]} +${opponents.length - 1}`;

  const isFixedSet = challenge.format === 'fixed_set';

  return (
    <>
      <AnimatePresence>
        <motion.button
          key={challenge.id}
          type="button"
          initial={{ y: -60, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -60, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          onClick={() => {
            if (isFixedSet) {
              navigate(`/practice/challenges/${challenge.id}/play`);
            } else {
              setSheetOpen(true);
            }
          }}
          className={cn(
            'fixed left-1/2 -translate-x-1/2 z-40',
            'top-[calc(env(safe-area-inset-top,0px)+68px)] md:top-[calc(env(safe-area-inset-top,0px)+76px)]',
            'group flex items-center gap-3 pl-3 pr-2 py-2 rounded-full',
            'bg-gradient-to-r from-primary/95 to-primary text-primary-foreground',
            'shadow-2xl shadow-primary/30 backdrop-blur-xl',
            'border border-white/15',
            'hover:scale-[1.02] active:scale-95 transition-transform',
            'max-w-[92vw]',
          )}
          aria-label="View active challenge"
        >
          <span className="relative flex items-center justify-center">
            <motion.span
              aria-hidden
              className="absolute inset-0 rounded-full bg-white/25"
              animate={{ scale: [1, 1.6, 1], opacity: [0.6, 0, 0.6] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeOut' }}
            />
            <Sword className="w-4 h-4 relative" />
          </span>

          <div className="flex flex-col items-start min-w-0">
            <div className="flex items-center gap-1.5 text-[11px] font-medium opacity-90 leading-none">
              <SubjectIcon className="w-3 h-3" />
              <span className="truncate max-w-[38vw] md:max-w-[220px]">{opponentLabel}</span>
              {participantsCount > 2 && (
                <span className="inline-flex items-center gap-0.5 opacity-80">
                  <Users className="w-3 h-3" />
                  {participantsCount}
                </span>
              )}
            </div>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="font-bold tabular-nums text-sm leading-none">{targetText}</span>
            </div>
            <div className="mt-1.5 h-1 w-40 md:w-48 rounded-full bg-white/20 overflow-hidden">
              <motion.div
                className="h-full bg-white rounded-full"
                initial={false}
                animate={{ width: `${progressPct}%` }}
                transition={{ type: 'spring', stiffness: 120, damping: 20 }}
              />
            </div>
          </div>

          <span className="ml-1 inline-flex items-center gap-1 pl-2 pr-3 py-1.5 rounded-full bg-white/15 text-[11px] font-semibold uppercase tracking-wide">
            <Trophy className="w-3 h-3" />
            {isFixedSet ? 'Play' : 'View'}
          </span>
        </motion.button>
      </AnimatePresence>

      <ChallengeLeaderboardSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        challengeId={challenge.id}
        meAccountId={student?.id ?? null}
      />
    </>
  );
}

function ChallengeLeaderboardSheet({
  open,
  onOpenChange,
  challengeId,
  meAccountId,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  challengeId: string;
  meAccountId: string | null;
}) {
  const { challenge, participants } = useChallenge(open ? challengeId : null);

  const ranked = useMemo(
    () => [...participants].sort((a, b) => b.score - a.score || b.correct_count - a.correct_count),
    [participants],
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-2xl max-h-[75vh] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Trophy className="h-4 w-4 text-primary" />
            Live leaderboard
          </SheetTitle>
        </SheetHeader>
        <div className="mt-4 space-y-2">
          {challenge && (
            <p className="text-xs text-muted-foreground">
              Keep practicing on this page — every answer counts toward your challenge goal.
            </p>
          )}
          <div className="mt-3 space-y-1.5">
            {ranked.map((p, i) => {
              const isMe = p.student_account_id === meAccountId;
              return (
                <div
                  key={p.id}
                  className={cn(
                    'flex items-center justify-between rounded-lg px-3 py-2 text-sm',
                    isMe ? 'bg-primary/10 border border-primary/30' : 'bg-muted/40',
                  )}
                >
                  <span className="flex items-center gap-2">
                    {i === 0 ? <Crown className="h-4 w-4 text-amber-500" /> : <span className="w-4 text-center text-xs text-muted-foreground">{i + 1}</span>}
                    <span className={cn('truncate', isMe && 'font-semibold')}>{p.display_name ?? 'Player'}</span>
                    {isMe && <span className="text-[10px] text-muted-foreground">(you)</span>}
                  </span>
                  <span className="tabular-nums text-xs">
                    <span className="font-semibold">{p.score}</span> pts · {p.correct_count} ✓
                  </span>
                </div>
              );
            })}
            {ranked.length === 0 && (
              <p className="text-center text-xs text-muted-foreground py-6">No scores yet.</p>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
