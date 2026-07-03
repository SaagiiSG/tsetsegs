import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Sword, Calculator, BookOpen, Users, Trophy } from 'lucide-react';
import { useActiveChallenge } from '@/hooks/useActiveChallenge';
import { cn } from '@/lib/utils';

export function ActiveChallengeHUD() {
  const { challenge, myPart, opponents, participantsCount } = useActiveChallenge();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  // Hide on the play screen itself (in-page leaderboard already shows this)
  const onPlayScreen = challenge ? pathname === `/practice/challenges/${challenge.id}/play` : false;

  // Time-sprint tick
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!challenge || challenge.format !== 'time_sprint' || !challenge.started_at) return;
    const t = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(t);
  }, [challenge?.format, challenge?.started_at, challenge?.id]);

  const visible = !!challenge && !onPlayScreen;

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

  return (
    <AnimatePresence>
      <motion.button
        key={challenge.id}
        type="button"
        initial={{ y: -60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -60, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        onClick={() => navigate(`/practice/challenges/${challenge.id}/play`)}
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
        aria-label="Resume active challenge"
      >
        {/* Icon cluster */}
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
          Resume
        </span>
      </motion.button>
    </AnimatePresence>
  );
}
