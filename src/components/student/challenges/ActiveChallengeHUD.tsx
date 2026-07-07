import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion, useAnimation, useDragControls } from 'framer-motion';
import { Sword, Calculator, BookOpen, Users, Trophy, Crown, ChevronUp, ChevronDown, GripVertical, Minimize2, Maximize2, RotateCcw } from 'lucide-react';
import { useActiveChallenge } from '@/hooks/useActiveChallenge';
import { useChallenge } from '@/hooks/useChallenge';
import { useStudentAuth } from '@/contexts/StudentAuthContext';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';

// 8 anchor points: 4 corners + 4 edge-centers
type AnchorSide = 'top' | 'bottom' | 'left' | 'right';
type AnchorAlign = 'start' | 'center' | 'end';
interface Anchor { side: AnchorSide; align: AnchorAlign }

const DEFAULT_ANCHOR: Anchor = { side: 'top', align: 'center' };
// v2 bump: forces users who had a stale collapsed/hidden state from v1 to
// see a fresh, visible HUD (top-center, expanded). Uses localStorage to
// match the rest of the app's persistence.
const ANCHOR_KEY = 'challenge-hud-anchor-v5';
const COLLAPSED_KEY = 'challenge-hud-collapsed-v5';

const EDGE_PAD = 12; // px from viewport edge
const TOP_OFFSET = 68; // stay clear of top header on mobile

function loadAnchor(): Anchor {
  try {
    const raw = localStorage.getItem(ANCHOR_KEY);
    if (!raw) return DEFAULT_ANCHOR;
    const p = JSON.parse(raw);
    if (p?.side && p?.align) return p;
  } catch { /* noop */ }
  return DEFAULT_ANCHOR;
}
function saveAnchor(a: Anchor) {
  try { localStorage.setItem(ANCHOR_KEY, JSON.stringify(a)); } catch { /* noop */ }
}
function loadCollapsed(): boolean {
  try { return localStorage.getItem(COLLAPSED_KEY) === '1'; } catch { return false; }
}
function saveCollapsed(v: boolean) {
  try { localStorage.setItem(COLLAPSED_KEY, v ? '1' : '0'); } catch { /* noop */ }
}

// Snap dropped position to nearest of 8 anchors based on center point in viewport.
function nearestAnchor(cx: number, cy: number, vw: number, vh: number): Anchor {
  // Horizontal align: 3 buckets
  const hx = cx / vw;
  const hAlign: AnchorAlign = hx < 0.33 ? 'start' : hx > 0.66 ? 'end' : 'center';
  const vy = cy / vh;
  const vAlign: AnchorAlign = vy < 0.33 ? 'start' : vy > 0.66 ? 'end' : 'center';

  // Decide which side to dock. If it's a corner (both extreme), pick top/bottom.
  // If clearly near a vertical edge, dock left/right. Otherwise top/bottom.
  const distTop = cy;
  const distBottom = vh - cy;
  const distLeft = cx;
  const distRight = vw - cx;
  const minDist = Math.min(distTop, distBottom, distLeft, distRight);

  if (minDist === distTop) return { side: 'top', align: hAlign };
  if (minDist === distBottom) return { side: 'bottom', align: hAlign };
  if (minDist === distLeft) return { side: 'left', align: vAlign };
  return { side: 'right', align: vAlign };
}

function anchorStyle(a: Anchor): React.CSSProperties {
  const s: React.CSSProperties = {};
  const isSideEdge = a.side === 'left' || a.side === 'right';
  const isTopBottom = a.side === 'top' || a.side === 'bottom';

  if (a.side === 'top') s.top = `calc(env(safe-area-inset-top,0px) + ${TOP_OFFSET}px)`;
  if (a.side === 'bottom') s.bottom = `calc(env(safe-area-inset-bottom,0px) + ${EDGE_PAD}px)`;
  if (a.side === 'left') s.left = `${EDGE_PAD}px`;
  if (a.side === 'right') s.right = `${EDGE_PAD}px`;

  if (isTopBottom) {
    if (a.align === 'start') s.left = `${EDGE_PAD}px`;
    else if (a.align === 'end') s.right = `${EDGE_PAD}px`;
    else { s.left = '50%'; s.transform = 'translateX(-50%)'; }
  }
  if (isSideEdge) {
    if (a.align === 'start') s.top = `calc(env(safe-area-inset-top,0px) + ${TOP_OFFSET}px)`;
    else if (a.align === 'end') s.bottom = `calc(env(safe-area-inset-bottom,0px) + ${EDGE_PAD}px)`;
    else { s.top = '50%'; s.transform = 'translateY(-50%)'; }
  }
  return s;
}

export function ActiveChallengeHUD() {
  const { challenge, myPart, opponents, participantsCount } = useActiveChallenge();
  const { student } = useStudentAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [anchor, setAnchor] = useState<Anchor>(() => loadAnchor());
  const [collapsed, setCollapsed] = useState<boolean>(() => loadCollapsed());
  const [isOffScreen, setIsOffScreen] = useState(false);
  const [dragging, setDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const dragControls = useDragControls();
  const dragAnim = useAnimation();

  useEffect(() => saveAnchor(anchor), [anchor]);
  useEffect(() => saveCollapsed(collapsed), [collapsed]);

  // Allow external UI (e.g. Challenges page button) to reset the HUD position
  useEffect(() => {
    const onReset = () => {
      setAnchor(DEFAULT_ANCHOR);
      setCollapsed(false);
      try {
        localStorage.removeItem(ANCHOR_KEY);
        localStorage.removeItem(COLLAPSED_KEY);
      } catch { /* noop */ }
    };
    window.addEventListener('challenge-hud:reset', onReset);
    return () => window.removeEventListener('challenge-hud:reset', onReset);
  }, []);

  // Hide only on the fixed_set play screen (the play UI already shows progress).
  // Everywhere else — including lobby, results, and challenges list — the HUD stays visible.
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

  // Detect when the HUD is off-screen (e.g. stale anchor after rotation/resize)
  // and expose a small reset action so mobile users can bring it back instantly.
  useEffect(() => {
    if (!visible) return;
    const check = () => {
      const el = containerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const margin = 20;
      const off = rect.right < margin || rect.left > vw - margin || rect.bottom < margin || rect.top > vh - margin;
      setIsOffScreen(off);
    };
    check();
    const id = setInterval(check, 1000);
    const onResize = () => check();
    window.addEventListener('resize', onResize);
    return () => {
      clearInterval(id);
      window.removeEventListener('resize', onResize);
    };
  }, [visible, anchor, collapsed]);

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

  const handleDragEnd = useCallback(async () => {
    const el = containerRef.current;
    if (!el) { setDragging(false); return; }
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const next = nearestAnchor(cx, cy, window.innerWidth, window.innerHeight);
    // Animate the drag offset back to 0, then update anchor so element re-renders at new position.
    await dragAnim.start({ x: 0, y: 0, transition: { type: 'spring', stiffness: 400, damping: 30 } });
    setAnchor(next);
    // small delay to clear the drag flag so click handler doesn't fire from the release
    setTimeout(() => setDragging(false), 60);
  }, [dragAnim]);

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
    if (dragging) return; // ignore synthetic click right after drag
    if (isFixedSet) navigate(`/practice/challenges/${challenge.id}/play`);
    else setSheetOpen(true);
  };

  const resetHud = () => {
    setAnchor(DEFAULT_ANCHOR);
    setCollapsed(false);
  };

  return (
    <>
      <AnimatePresence>
        <motion.div
          key={`${challenge.id}-${anchor.side}-${anchor.align}`}
          ref={containerRef}
          drag
          dragMomentum={false}
          dragElastic={0.15}
          dragControls={dragControls}
          dragListener={false}
          onDragStart={() => setDragging(true)}
          onDragEnd={handleDragEnd}
          animate={dragAnim}
          initial={{ y: -60, opacity: 0 }}
          exit={{ y: -60, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          style={{ position: 'fixed', zIndex: 120, touchAction: 'none', ...anchorStyle(anchor) }}
          data-tour="challenge-hud"
          className={cn(
            'select-none',
            dragging && 'cursor-grabbing',
          )}
        >
          {collapsed ? (
            // Collapsed: small icon-only puck, still draggable via grip / long-press
            <div
              className={cn(
                'flex items-center gap-1 pl-1 pr-1 py-1 rounded-full min-w-[44px] min-h-[44px]',
                'bg-gradient-to-r from-primary/95 to-primary text-primary-foreground',
                'shadow-2xl shadow-primary/30 backdrop-blur-xl border border-white/15',
              )}
            >
              <button
                type="button"
                aria-label="Drag HUD"
                onPointerDown={(e) => dragControls.start(e)}
                className="p-1 rounded-full hover:bg-white/15 active:bg-white/25 cursor-grab active:cursor-grabbing touch-none"
              >
                <GripVertical className="w-3.5 h-3.5 opacity-80" />
              </button>
              <button
                type="button"
                onClick={handlePrimaryClick}
                onDoubleClick={() => { setCollapsed(false); setAnchor(DEFAULT_ANCHOR); }}
                aria-label="Open challenge (double-tap to expand)"
                className="relative flex items-center justify-center p-1.5 rounded-full hover:bg-white/15 active:scale-95 transition"
              >
                <motion.span
                  aria-hidden
                  className="absolute inset-0 rounded-full bg-white/30"
                  animate={{ scale: [1, 1.8, 1], opacity: [0.7, 0, 0.7] }}
                  transition={{ duration: 1.8, repeat: Infinity, ease: 'easeOut' }}
                />
                <Sword className="w-4 h-4 relative" />
              </button>
              <button
                type="button"
                onClick={() => setCollapsed(false)}
                aria-label="Expand HUD"
                className="p-1 rounded-full hover:bg-white/15 active:bg-white/25"
              >
                <Maximize2 className="w-3 h-3" />
              </button>
            </div>
          ) : (
            <div
              className={cn(
                'group flex items-center gap-1.5 md:gap-2 pl-1 md:pl-1.5 pr-1 md:pr-1.5 py-1 md:py-1.5 rounded-full',
                'bg-gradient-to-r from-primary/95 to-primary text-primary-foreground',
                'shadow-2xl shadow-primary/30 backdrop-blur-xl border border-white/15',
                'max-w-[92vw]',
              )}
            >
              {/* Drag handle */}
              <button
                type="button"
                aria-label="Drag HUD"
                onPointerDown={(e) => dragControls.start(e)}
                className="p-1 -mr-0.5 rounded-full hover:bg-white/15 active:bg-white/25 cursor-grab active:cursor-grabbing touch-none"
              >
                <GripVertical className="w-3.5 h-3.5 opacity-70" />
              </button>

              <button
                type="button"
                onClick={handlePrimaryClick}
                aria-label="View active challenge"
                className="group flex items-center gap-2 md:gap-3 pl-1 md:pl-1.5 pr-1.5 md:pr-2 py-0.5 md:py-1 rounded-full hover:bg-white/10 active:scale-[0.98] transition"
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

              {/* Collapse */}
              <button
                type="button"
                onClick={() => setCollapsed(true)}
                aria-label="Collapse HUD"
                className="p-1 rounded-full hover:bg-white/15 active:bg-white/25"
              >
                <Minimize2 className="w-3 h-3" />
              </button>
            </div>
          )}
        </motion.div>

        {isOffScreen && (
          <motion.button
            key="reset-hud"
            type="button"
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            onClick={resetHud}
            data-tour="challenge-hud-reset"
            className={cn(
              'fixed bottom-6 left-1/2 -translate-x-1/2 z-[70]',
              'flex items-center gap-1.5 px-3 py-2 rounded-full',
              'bg-primary text-primary-foreground shadow-2xl shadow-primary/30',
              'border border-white/15 backdrop-blur-xl',
              'text-xs font-semibold tracking-wide select-none',
              'active:scale-95 transition-transform'
            )}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset HUD
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
