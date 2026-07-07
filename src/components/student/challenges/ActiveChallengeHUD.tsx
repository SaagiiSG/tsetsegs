import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion, PanInfo } from 'framer-motion';
import { Sword, Calculator, BookOpen, Users, Trophy, Crown, ChevronUp, ChevronDown, X } from 'lucide-react';
import { useActiveChallenge } from '@/hooks/useActiveChallenge';
import { useChallenge } from '@/hooks/useChallenge';
import { useStudentAuth } from '@/contexts/StudentAuthContext';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';

const OPEN_KEY = 'challenge-hud-open-v1';
const TOP_OFFSET = 12; // clear of top edge

function loadOpen(): boolean {
  try {
    const raw = localStorage.getItem(OPEN_KEY);
    if (raw === null) return true; // default: open
    return raw === '1';
  } catch { return true; }
}
function saveOpen(v: boolean) {
  try { localStorage.setItem(OPEN_KEY, v ? '1' : '0'); } catch { /* noop */ }
}

export function ActiveChallengeHUD() {
  const { challenge, myPart, opponents, participantsCount } = useActiveChallenge();
  const { student } = useStudentAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [open, setOpen] = useState<boolean>(() => loadOpen());

  useEffect(() => saveOpen(open), [open]);

  // Allow external UI (Challenges page button) to reset/open the HUD
  useEffect(() => {
    const onReset = () => setOpen(true);
    window.addEventListener('challenge-hud:reset', onReset);
    return () => window.removeEventListener('challenge-hud:reset', onReset);
  }, []);

  const onPlayScreen = challenge ? pathname === `/practice/challenges/${challenge.id}/play` : false;

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

  const visible = !!challenge && !onPlayScreen;

  const { targetText, progressPct } = useMemo(() => {
    if (!challenge) return { targetText: '', progressPct: 0 };
    if (challenge.format === 'first_to_points' && challenge.target_value) {
      const s = myPart?.score ?? 0;
      return { targetText: `${s} / ${challenge.target_value} pts`, progressPct: Math.min(100, (s / challenge.target_value) * 100) };
    }
    if (challenge.format === 'first_to_correct' && challenge.target_value) {
      const c = myPart?.correct_count ?? 0;
      return { targetText: `${c} / ${challenge.target_value} ✓`, progressPct: Math.min(100, (c / challenge.target_value) * 100) };
    }
    if (challenge.format === 'fixed_set' && challenge.target_value) {
      const a = myPart?.attempted_count ?? 0;
      return { targetText: `${a} / ${challenge.target_value}`, progressPct: Math.min(100, (a / challenge.target_value) * 100) };
    }
    if (challenge.format === 'time_sprint' && challenge.duration_seconds && challenge.started_at) {
      const end = new Date(challenge.started_at).getTime() + challenge.duration_seconds * 1000;
      const remaining = Math.max(0, Math.floor((end - now) / 1000));
      const mm = Math.floor(remaining / 60);
      const ss = String(remaining % 60).padStart(2, '0');
      return { targetText: `${mm}:${ss} left`, progressPct: Math.min(100, ((challenge.duration_seconds - remaining) / challenge.duration_seconds) * 100) };
    }
    return { targetText: '', progressPct: 0 };
  }, [challenge, myPart, now]);

  if (!visible || !challenge) return null;

  const SubjectIcon = challenge.subject === 'math' ? Calculator : BookOpen;
  const isFixedSet = challenge.format === 'fixed_set';

  const metricOf = (p: { score: number; correct_count: number; attempted_count: number }) => {
    if (challenge.format === 'first_to_correct') return p.correct_count;
    if (challenge.format === 'fixed_set') return p.attempted_count;
    return p.score;
  };
  const unit = challenge.format === 'first_to_correct' ? '✓' : challenge.format === 'fixed_set' ? 'q' : 'pts';

  const myMetric = myPart ? metricOf(myPart) : 0;
  const mySelf = { id: 'me', name: 'You', metric: myMetric, isMe: true };
  const allRanked = [mySelf, ...opponents.map((o) => ({ id: o.id, name: o.name, metric: metricOf(o), isMe: false }))]
    .sort((a, b) => b.metric - a.metric);
  const leader = allRanked[0];
  const second = allRanked[1];

  const opponentLine = (() => {
    if (opponents.length === 0) return null;
    if (opponents.length === 1) {
      const opp = opponents[0];
      const oppMetric = metricOf(opp);
      const diff = myMetric - oppMetric;
      const leading = diff > 0 ? 'you' : diff < 0 ? 'opp' : 'tie';
      return (
        <div className="flex items-center gap-1.5 text-[11px] font-medium opacity-95 leading-none">
          <span className="truncate max-w-[26vw] md:max-w-[140px]">{opp.name}</span>
          <span className="tabular-nums opacity-80">{oppMetric}</span>
          <span className="opacity-60">·</span>
          {leading === 'tie' ? (
            <span className="opacity-90">Tied</span>
          ) : (
            <span className={cn('inline-flex items-center gap-0.5 font-semibold px-1.5 py-0.5 rounded-full',
              leading === 'you' ? 'bg-emerald-400/25 text-emerald-50' : 'bg-red-400/25 text-red-50')}>
              {leading === 'you' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              {leading === 'you' ? `You +${diff}` : `-${Math.abs(diff)}`}
            </span>
          )}
        </div>
      );
    }
    const gap = second ? leader.metric - second.metric : leader.metric;
    return (
      <div className="flex items-center gap-1.5 text-[11px] font-medium opacity-95 leading-none">
        <Crown className="w-3 h-3 text-amber-200" />
        <span className="truncate max-w-[28vw] md:max-w-[150px]">{leader.isMe ? 'You lead' : leader.name}</span>
        <span className="tabular-nums opacity-80">{leader.metric} {unit}</span>
        {second && <span className="opacity-80">· +{gap} ahead</span>}
      </div>
    );
  })();

  const handlePrimaryClick = () => {
    if (isFixedSet) navigate(`/practice/challenges/${challenge.id}/play`);
    else setSheetOpen(true);
  };

  // iOS-style: drag DOWN on the puller to open, drag UP on the HUD to close.
  const onPullerDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.y > 20 || info.velocity.y > 200) setOpen(true);
  };
  const onHudDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.y < -20 || info.velocity.y < -200) setOpen(false);
  };

  return (
    <>
      <div
        className="fixed left-1/2 -translate-x-1/2 select-none"
        style={{
          top: `calc(env(safe-area-inset-top,0px) + ${TOP_OFFSET}px)`,
          zIndex: 120,
          touchAction: 'none',
        }}
      >
        <AnimatePresence mode="wait" initial={false}>
          {open ? (
            <motion.div
              key="hud-open"
              initial={{ y: -40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -40, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 380, damping: 32 }}
              drag="y"
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={{ top: 0.6, bottom: 0 }}
              dragMomentum={false}
              onDragEnd={onHudDragEnd}
              data-tour="challenge-hud"
              className={cn(
                'group flex items-center gap-1.5 md:gap-2 pl-2 md:pl-3 pr-1 md:pr-1.5 py-1 md:py-1.5 rounded-full',
                'bg-gradient-to-r from-primary/95 to-primary text-primary-foreground',
                'shadow-2xl shadow-primary/30 backdrop-blur-xl border border-white/15',
                'max-w-[92vw] cursor-grab active:cursor-grabbing',
              )}
            >
              {/* Grabber pill (iOS style) */}
              <div className="flex items-center justify-center pr-1.5 border-r border-white/15">
                <div className="w-1 h-4 rounded-full bg-white/40" />
              </div>

              <button
                type="button"
                onClick={handlePrimaryClick}
                aria-label="View active challenge"
                className="flex items-center gap-2 md:gap-3 pl-1 md:pl-1.5 pr-1.5 md:pr-2 py-0.5 md:py-1 rounded-full hover:bg-white/10 active:scale-[0.98] transition"
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
                    <SubjectIcon className="w-3 h-3 hidden md:inline" />
                    {participantsCount > 2 && (
                      <span className="inline-flex items-center gap-0.5 opacity-90">
                        <Users className="w-3 h-3" />
                        {participantsCount}
                      </span>
                    )}
                    <span className="tabular-nums opacity-90">{targetText}</span>
                  </div>
                  {opponentLine}
                  <div className="mt-1 h-0.5 md:h-1 w-24 md:w-56 rounded-full bg-white/20 overflow-hidden">
                    <motion.div
                      className="h-full bg-white rounded-full"
                      initial={false}
                      animate={{ width: `${progressPct}%` }}
                      transition={{ type: 'spring', stiffness: 120, damping: 20 }}
                    />
                  </div>
                </div>

                <span className="ml-0.5 md:ml-1 inline-flex items-center gap-1 pl-1.5 md:pl-2 pr-2 md:pr-3 py-1 md:py-1.5 rounded-full bg-white/15 text-[11px] font-semibold uppercase tracking-wide">
                  <Trophy className="w-3 h-3" />
                  <span className="hidden md:inline">{isFixedSet ? 'Play' : 'View'}</span>
                </span>
              </button>

              {/* Close (iOS-style ×) */}
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Hide HUD"
                className="p-1.5 rounded-full hover:bg-white/15 active:bg-white/25"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </motion.div>
          ) : (
            <motion.button
              key="hud-puller"
              type="button"
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -20, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 380, damping: 32 }}
              drag="y"
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={{ top: 0, bottom: 0.6 }}
              dragMomentum={false}
              onDragEnd={onPullerDragEnd}
              onClick={() => setOpen(true)}
              aria-label="Show active challenge HUD (pull down to expand)"
              data-tour="challenge-hud"
              className={cn(
                'flex flex-col items-center gap-1 px-6 py-1.5 rounded-b-2xl rounded-t-none',
                'bg-gradient-to-b from-primary/95 to-primary/85 text-primary-foreground',
                'shadow-lg shadow-primary/25 backdrop-blur-xl border border-t-0 border-white/15',
                'cursor-grab active:cursor-grabbing',
              )}
            >
              <div className="w-10 h-1 rounded-full bg-white/60" />
              <div className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider opacity-90">
                <Sword className="w-2.5 h-2.5" />
                <span>Live</span>
              </div>
            </motion.button>
          )}
        </AnimatePresence>
      </div>

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
