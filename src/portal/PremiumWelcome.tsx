import { useEffect, useRef, type RefObject } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { motion, useReducedMotion } from 'framer-motion';
import { BookOpenCheck, Check, ClipboardList, Mountain, PlayCircle, Sparkles, Zap } from 'lucide-react';
import { Dialog, DialogDescription, DialogOverlay, DialogPortal, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { PREMIUM_PLAN } from '@/solo/plans';
import { useBillingSummary } from './SoloBilling';

// The badge unlock celebration's motion (BadgeUnlockCelebration), in Premium's sky colours.
const EASE_OUT = [0.23, 1, 0.32, 1] as const;
const IMPACT = 0.3;
const SPARKS = 14;
const SKY = { primary: '#38BDF8', secondary: '#6366F1', glow: '#7DD3FC' };
// One per PREMIUM_PLAN line, same order: explanations, every question, speed, tests, videos.
const PERK_ICONS = [BookOpenCheck, Mountain, Zap, ClipboardList, PlayCircle];

/**
 * What Premium opens, shown once right after a student pays (Saagii, 19 Nov). SoloPremium sends them to /student with
 * `premiumWelcome` in the route state; closing clears it, so a reload or Back never shows it again.
 */
export function PremiumWelcome() {
  const location = useLocation();
  const navigate = useNavigate();
  const open = !!(location.state as { premiumWelcome?: boolean } | null)?.premiumWelcome;
  const close = () => navigate(location.pathname + location.search, { replace: true, state: null });
  const start = useRef<HTMLButtonElement>(null);
  return (
    <Dialog open={open} onOpenChange={o => !o && close()}>
      <DialogPortal>
        <DialogOverlay className="z-[100] bg-slate-950/75 backdrop-blur-sm" />
        {/* m-auto on the child, not items-center: a dialog taller than a short phone then scrolls from its top. */}
        {/* Focus the button without scrolling to it, so a short phone opens on the medal, not the bottom. */}
        <DialogPrimitive.Content className="fixed inset-0 z-[100] flex overflow-y-auto p-6 outline-none"
          onOpenAutoFocus={e => { e.preventDefault(); start.current?.focus({ preventScroll: true }); }}>
          {open && <Welcome onClose={close} startRef={start} />}
        </DialogPrimitive.Content>
      </DialogPortal>
    </Dialog>
  );
}

function Welcome({ onClose, startRef }: { onClose: () => void; startRef: RefObject<HTMLButtonElement> }) {
  const reduce = useReducedMotion();
  const summary = useBillingSummary();

  useEffect(() => {
    if (reduce) return;
    const t = setTimeout(() => navigator.vibrate?.([12, 40, 18]), IMPACT * 1000);
    return () => clearTimeout(t);
  }, [reduce]);

  const rise = (delay: number) => ({
    initial: { opacity: 0, transform: reduce ? 'none' : 'translateY(10px)' },
    animate: { opacity: 1, transform: 'translateY(0px)' },
    transition: { delay: reduce ? 0 : delay, duration: 0.4, ease: EASE_OUT },
  });
  const perksAt = IMPACT + 0.3;

  return (
    <div className="m-auto flex w-full max-w-sm flex-col items-center text-center">
      <div className="relative grid h-44 w-44 place-items-center">
        <motion.div
          className="absolute inset-0 rounded-full"
          style={{ background: `radial-gradient(circle, ${SKY.glow}55 0%, ${SKY.glow}14 45%, transparent 70%)` }}
          initial={{ opacity: 0, transform: 'scale(0.6)' }}
          animate={{ opacity: 1, transform: 'scale(1)' }}
          transition={{ delay: reduce ? 0 : IMPACT - 0.05, duration: 0.9, ease: EASE_OUT }}
        />
        {!reduce && <>
          <motion.div
            className="absolute h-28 w-28 rounded-full border-2"
            style={{ borderColor: SKY.glow }}
            initial={{ opacity: 0, transform: 'scale(0.8)' }}
            animate={{ opacity: [0.9, 0], transform: 'scale(2)' }}
            transition={{ delay: IMPACT, duration: 0.8, ease: EASE_OUT }}
          />
          {Array.from({ length: SPARKS }, (_, i) => {
            const angle = (i * 360) / SPARKS + (i % 2 ? 9 : -9);
            const reach = i % 2 ? 76 : 92;
            return (
              <motion.span
                key={i}
                className="absolute h-3 w-1 rounded-full"
                style={{ background: i % 3 ? SKY.glow : '#fff' }}
                initial={{ opacity: 0, transform: `rotate(${angle}deg) translateY(-46px) scaleY(0.3)` }}
                animate={{ opacity: [0, 1, 0], transform: `rotate(${angle}deg) translateY(-${reach}px) scaleY(1)` }}
                transition={{ delay: IMPACT, duration: 0.7, ease: EASE_OUT, opacity: { delay: IMPACT, duration: 0.7, times: [0, 0.15, 1] } }}
              />
            );
          })}
        </>}
        <motion.div
          className="relative grid h-28 w-28 place-items-center overflow-hidden rounded-full border-4"
          style={{
            borderColor: SKY.glow,
            background: `linear-gradient(135deg, ${SKY.primary}, ${SKY.secondary})`,
            boxShadow: `0 0 0 8px ${SKY.glow}22, 0 24px 60px -12px ${SKY.glow}aa`,
          }}
          initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.45, rotate: -16 }}
          animate={{ opacity: 1, scale: 1, rotate: 0 }}
          transition={reduce ? { duration: 0.2 } : { type: 'spring', bounce: 0.45, duration: 0.7, delay: 0.05 }}
        >
          <Sparkles className="h-12 w-12 text-white drop-shadow-md" strokeWidth={1.75} />
          {!reduce && (
            <motion.span
              aria-hidden
              className="pointer-events-none absolute inset-y-0 left-0 w-1/2"
              style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.6), transparent)' }}
              initial={{ transform: 'translateX(-120%) skewX(-16deg)' }}
              animate={{ transform: 'translateX(320%) skewX(-16deg)' }}
              transition={{ delay: IMPACT + 0.2, duration: 0.85, ease: [0.77, 0, 0.175, 1] }}
            />
          )}
        </motion.div>
      </div>

      <motion.p {...rise(IMPACT + 0.05)} className="text-xs font-semibold uppercase tracking-[0.25em]" style={{ color: SKY.glow }}>
        Premium unlocked
      </motion.p>
      <motion.div {...rise(IMPACT + 0.12)}>
        <DialogTitle className="mt-2 text-3xl font-bold tracking-tight text-white">Welcome to Premium</DialogTitle>
      </motion.div>
      <motion.div {...rise(IMPACT + 0.18)}>
        <DialogDescription className="mt-2 max-w-xs text-sm text-white/70">
          {summary?.kind === 'trial' ? summary.line : 'Everything below is open to you now.'}
        </DialogDescription>
      </motion.div>

      {/* The perks land one by one, each with a tick that pops in after it. */}
      <ul className="mt-6 w-full space-y-2 text-left">
        {PREMIUM_PLAN.map((perk, i) => {
          const Icon = PERK_ICONS[i] ?? Sparkles;
          const at = perksAt + i * 0.09;
          return (
            <motion.li
              key={perk}
              className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-3 py-2.5"
              initial={{ opacity: 0, transform: reduce ? 'none' : 'translateY(12px)' }}
              animate={{ opacity: 1, transform: 'translateY(0px)' }}
              transition={{ delay: reduce ? 0 : at, duration: 0.4, ease: EASE_OUT }}
            >
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl" style={{ background: `${SKY.glow}26`, color: SKY.glow }}>
                <Icon className="h-[18px] w-[18px]" />
              </span>
              <span className="flex-1 text-sm text-white/90">{perk}</span>
              <motion.span
                aria-hidden
                className="grid h-5 w-5 shrink-0 place-items-center rounded-full text-slate-950"
                style={{ background: SKY.glow }}
                initial={{ opacity: 0, transform: reduce ? 'none' : 'scale(0.4)' }}
                animate={{ opacity: 1, transform: 'scale(1)' }}
                transition={reduce ? { duration: 0 } : { delay: at + 0.18, type: 'spring', bounce: 0.5, duration: 0.45 }}
              >
                <Check className="h-3 w-3" strokeWidth={3} />
              </motion.span>
            </motion.li>
          );
        })}
      </ul>

      <motion.div {...rise(perksAt + PREMIUM_PLAN.length * 0.09 + 0.1)} className="mt-7 w-full max-w-[16rem]">
        {/* Sky like the medal: the dialog sits outside the student theme, so the default primary would show. */}
        <Button ref={startRef} size="lg" onClick={onClose} className="w-full rounded-full bg-[#7DD3FC] text-base font-semibold text-slate-950 transition-transform duration-150 hover:bg-[#BAE6FD] active:scale-[0.97]">
          Start practicing
        </Button>
      </motion.div>
    </div>
  );
}
