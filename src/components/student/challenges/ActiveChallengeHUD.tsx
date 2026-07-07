import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, LayoutGroup, motion, PanInfo } from 'framer-motion';
import { Sword, Calculator, BookOpen, Users, Trophy, Crown, ChevronUp, ChevronDown, X } from 'lucide-react';
import { useActiveChallenge } from '@/hooks/useActiveChallenge';
import { useChallenge } from '@/hooks/useChallenge';
import { useStudentAuth } from '@/contexts/StudentAuthContext';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';

type Edge = 'top' | 'bottom' | 'left' | 'right';
interface HUDState {
  open: boolean;
  edge: Edge;
  /** 0..1 offset along the edge (used when collapsed) */
  offset: number;
  /** pixel position when open */
  openX: number;
  openY: number;
}

const STATE_KEY = 'challenge-hud-state-v2';
const EDGE_PAD = 12;
const DOCK_THRESHOLD = 60; // px from edge → auto-dock on drop
const PULL_THRESHOLD = 28; // px perpendicular pull → expand puller
const VEL_THRESHOLD = 350;

const defaultState = (): HUDState => ({
  open: true,
  edge: 'top',
  offset: 0.5,
  openX: typeof window !== 'undefined' ? Math.max(EDGE_PAD, window.innerWidth / 2 - 180) : 200,
  openY: EDGE_PAD,
});

function loadState(): HUDState {
  try {
    const raw = localStorage.getItem(STATE_KEY);
    if (!raw) return defaultState();
    const p = JSON.parse(raw) as Partial<HUDState>;
    return { ...defaultState(), ...p };
  } catch { return defaultState(); }
}
function saveState(s: HUDState) {
  try { localStorage.setItem(STATE_KEY, JSON.stringify(s)); } catch { /* noop */ }
}

function clamp(v: number, min: number, max: number) { return Math.min(Math.max(v, min), max); }

function nearestEdge(cx: number, cy: number, vw: number, vh: number): { edge: Edge; dist: number } {
  const d = {
    top: cy,
    bottom: vh - cy,
    left: cx,
    right: vw - cx,
  } as const;
  let best: Edge = 'top';
  let bestDist = d.top;
  (['bottom', 'left', 'right'] as Edge[]).forEach((e) => {
    if (d[e] < bestDist) { best = e; bestDist = d[e]; }
  });
  return { edge: best, dist: bestDist };
}

export function ActiveChallengeHUD() {
  const { challenge, myPart, opponents, participantsCount } = useActiveChallenge();
  const { student } = useStudentAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [state, setState] = useState<HUDState>(() => loadState());
  const [viewport, setViewport] = useState(() => ({
    w: typeof window !== 'undefined' ? window.innerWidth : 1024,
    h: typeof window !== 'undefined' ? window.innerHeight : 768,
  }));
  const openEl = useRef<HTMLDivElement | null>(null);
  const pullerEl = useRef<HTMLButtonElement | null>(null);

  useEffect(() => saveState(state), [state]);

  // Track viewport
  useEffect(() => {
    const onResize = () => setViewport({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Reset event
  useEffect(() => {
    const onReset = () => setState(defaultState());
    window.addEventListener('challenge-hud:reset', onReset);
    return () => window.removeEventListener('challenge-hud:reset', onReset);
  }, []);

  const onPlayScreen = challenge ? pathname === `/practice/challenges/${challenge.id}/play` : false;

  // Auto-navigate to results
  const finishedRef = useRef<string | null>(null);
  useEffect(() => {
    if (!challenge) return;
    if ((challenge.status === 'finished' || challenge.status === 'cancelled') && finishedRef.current !== challenge.id) {
      finishedRef.current = challenge.id;
      if (challenge.status === 'finished') navigate(`/practice/challenges/${challenge.id}/results`);
    }
  }, [challenge?.status, challenge?.id, navigate]);

  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!challenge || challenge.format !== 'time_sprint' || !challenge.started_at) return;
    const t = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(t);
  }, [challenge?.format, challenge?.started_at, challenge?.id]);

  const visible = !!challenge && !onPlayScreen;

  // Clamp open position when viewport changes / on mount
  useLayoutEffect(() => {
    if (!state.open) return;
    const el = openEl.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const maxX = Math.max(EDGE_PAD, viewport.w - rect.width - EDGE_PAD);
    const maxY = Math.max(EDGE_PAD, viewport.h - rect.height - EDGE_PAD);
    const nx = clamp(state.openX, EDGE_PAD, maxX);
    const ny = clamp(state.openY, EDGE_PAD, maxY);
    if (nx !== state.openX || ny !== state.openY) {
      setState((s) => ({ ...s, openX: nx, openY: ny }));
    }
  }, [viewport.w, viewport.h, state.open]);

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

  // Puller pixel position based on edge + offset
  const pullerPos = useCallback((): React.CSSProperties => {
    const { edge, offset } = state;
    if (edge === 'top' || edge === 'bottom') {
      const x = clamp(offset * viewport.w, EDGE_PAD + 40, viewport.w - EDGE_PAD - 40);
      const s: React.CSSProperties = { left: x, transform: 'translateX(-50%)' };
      if (edge === 'top') s.top = 0;
      else s.bottom = 0;
      return s;
    }
    const y = clamp(offset * viewport.h, EDGE_PAD + 40, viewport.h - EDGE_PAD - 40);
    const s: React.CSSProperties = { top: y, transform: 'translateY(-50%)' };
    if (edge === 'left') s.left = 0;
    else s.right = 0;
    return s;
  }, [state, viewport]);

  const collapseToEdge = useCallback((cx: number, cy: number, edge?: Edge) => {
    const { edge: nearest } = nearestEdge(cx, cy, viewport.w, viewport.h);
    const finalEdge: Edge = edge ?? nearest;
    const offset = (finalEdge === 'top' || finalEdge === 'bottom')
      ? clamp(cx / viewport.w, 0.05, 0.95)
      : clamp(cy / viewport.h, 0.05, 0.95);
    setState((s) => ({ ...s, open: false, edge: finalEdge, offset }));
  }, [viewport]);

  const onOpenDragEnd = useCallback((_: unknown, info: PanInfo) => {
    const el = openEl.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;

    // Flick detection toward an edge
    const { vx, vy } = { vx: info.velocity.x, vy: info.velocity.y };
    const flickEdge: Edge | null =
      Math.abs(vy) > VEL_THRESHOLD && Math.abs(vy) > Math.abs(vx)
        ? (vy < 0 ? 'top' : 'bottom')
        : Math.abs(vx) > VEL_THRESHOLD
          ? (vx < 0 ? 'left' : 'right')
          : null;

    const { edge, dist } = nearestEdge(cx, cy, viewport.w, viewport.h);
    if (flickEdge) return collapseToEdge(cx, cy, flickEdge);
    if (dist < DOCK_THRESHOLD) return collapseToEdge(cx, cy, edge);

    // Otherwise: clamp and stay open at new position
    const maxX = Math.max(EDGE_PAD, viewport.w - rect.width - EDGE_PAD);
    const maxY = Math.max(EDGE_PAD, viewport.h - rect.height - EDGE_PAD);
    setState((s) => ({
      ...s,
      openX: clamp(rect.left, EDGE_PAD, maxX),
      openY: clamp(rect.top, EDGE_PAD, maxY),
    }));
  }, [viewport, collapseToEdge]);

  const onPullerDragEnd = useCallback((_: unknown, info: PanInfo) => {
    const el = pullerEl.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const { edge } = state;

    // Perpendicular pull → open
    const perpendicular =
      edge === 'top' ? info.offset.y :
      edge === 'bottom' ? -info.offset.y :
      edge === 'left' ? info.offset.x :
      -info.offset.x;
    const perpendicularV =
      edge === 'top' ? info.velocity.y :
      edge === 'bottom' ? -info.velocity.y :
      edge === 'left' ? info.velocity.x :
      -info.velocity.x;

    if (perpendicular > PULL_THRESHOLD || perpendicularV > VEL_THRESHOLD) {
      // open at the puller location, positioned so the pill roughly appears from that edge
      let openX = state.openX;
      let openY = state.openY;
      const est = { w: 320, h: 60 };
      if (edge === 'top') { openX = cx - est.w / 2; openY = EDGE_PAD; }
      else if (edge === 'bottom') { openX = cx - est.w / 2; openY = viewport.h - est.h - EDGE_PAD; }
      else if (edge === 'left') { openX = EDGE_PAD; openY = cy - est.h / 2; }
      else { openX = viewport.w - est.w - EDGE_PAD; openY = cy - est.h / 2; }
      openX = clamp(openX, EDGE_PAD, viewport.w - est.w - EDGE_PAD);
      openY = clamp(openY, EDGE_PAD, viewport.h - est.h - EDGE_PAD);
      setState((s) => ({ ...s, open: true, openX, openY }));
      return;
    }

    // Otherwise re-snap along the same edge at the parallel offset
    const offset = (edge === 'top' || edge === 'bottom')
      ? clamp(cx / viewport.w, 0.05, 0.95)
      : clamp(cy / viewport.h, 0.05, 0.95);
    setState((s) => ({ ...s, offset }));
  }, [state, viewport]);

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

  const collapseFromButton = () => {
    const el = openEl.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    collapseToEdge(rect.left + rect.width / 2, rect.top + rect.height / 2);
  };

  // Puller variants per edge
  const pullerShape = (() => {
    const { edge } = state;
    const base = 'flex items-center justify-center bg-gradient-to-b from-primary/95 to-primary/85 text-primary-foreground shadow-lg shadow-primary/25 backdrop-blur-xl border border-white/15 cursor-grab active:cursor-grabbing';
    if (edge === 'top') return `${base} flex-col gap-1 px-6 py-1.5 rounded-b-2xl border-t-0`;
    if (edge === 'bottom') return `${base} flex-col-reverse gap-1 px-6 py-1.5 rounded-t-2xl border-b-0`;
    if (edge === 'left') return `${base} flex-row gap-1 px-1.5 py-6 rounded-r-2xl border-l-0`;
    return `${base} flex-row-reverse gap-1 px-1.5 py-6 rounded-l-2xl border-r-0`;
  })();

  const handleBar = (state.edge === 'top' || state.edge === 'bottom')
    ? <div className="w-10 h-1 rounded-full bg-white/60" />
    : <div className="h-10 w-1 rounded-full bg-white/60" />;

  const pullerLabel = (
    <div className={cn(
      'flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider opacity-90',
      (state.edge === 'left' || state.edge === 'right') && 'flex-col gap-0.5 [writing-mode:vertical-rl]',
    )}>
      <Sword className="w-2.5 h-2.5" />
      <span>Live</span>
    </div>
  );

  return (
    <>
      <AnimatePresence mode="wait" initial={false}>
        {state.open ? (
          <motion.div
            key="hud-open"
            ref={openEl}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 380, damping: 32 }}
            drag
            dragMomentum={false}
            dragElastic={0.15}
            onDragEnd={onOpenDragEnd}
            data-tour="challenge-hud"
            style={{
              position: 'fixed',
              top: state.openY,
              left: state.openX,
              zIndex: 120,
              touchAction: 'none',
            }}
            className={cn(
              'group flex items-center gap-1.5 md:gap-2 pl-2 md:pl-3 pr-1 md:pr-1.5 py-1 md:py-1.5 rounded-full select-none',
              'bg-gradient-to-r from-primary/95 to-primary text-primary-foreground',
              'shadow-2xl shadow-primary/30 backdrop-blur-xl border border-white/15',
              'max-w-[92vw] cursor-grab active:cursor-grabbing',
            )}
          >
            {/* Grabber */}
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

            <button
              type="button"
              onClick={collapseFromButton}
              aria-label="Collapse HUD"
              className="p-1.5 rounded-full hover:bg-white/15 active:bg-white/25"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        ) : (
          <motion.button
            key={`hud-puller-${state.edge}`}
            ref={pullerEl}
            type="button"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 380, damping: 32 }}
            drag
            dragMomentum={false}
            dragElastic={0.4}
            onDragEnd={onPullerDragEnd}
            onClick={(e) => {
              // Only treat as click if not part of a drag (framer suppresses click after drag)
              e.stopPropagation();
              setState((s) => ({ ...s, open: true }));
            }}
            aria-label="Expand active challenge HUD"
            data-tour="challenge-hud"
            style={{
              position: 'fixed',
              zIndex: 120,
              touchAction: 'none',
              ...pullerPos(),
            }}
            className={cn(pullerShape, 'select-none')}
          >
            {handleBar}
            {pullerLabel}
          </motion.button>
        )}
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
