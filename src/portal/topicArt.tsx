import { cn } from '@/lib/utils';
import { AREA_COLOR, type Area } from './videoTopics';

/** One flat picture per SAT area, drawn in that area's colour family (one hue, a few opacities). */
export function AreaArt({ area, className }: { area: Area; className?: string }) {
  const c = AREA_COLOR[area];
  return (
    <svg aria-hidden viewBox="0 0 96 96" fill="none" strokeLinecap="round" strokeLinejoin="round"
      className={cn('text-[color:var(--art-light)] dark:text-[color:var(--art-dark)]', className)}
      style={{ '--art-light': c.light, '--art-dark': c.dark } as React.CSSProperties}>
      <rect width="96" height="96" rx="28" className="fill-white/70 dark:fill-transparent" />
      <rect width="96" height="96" rx="28" fill="currentColor" fillOpacity=".14" />
      {area === 'Advanced Math' && <>
        <path d="M16 72h64M48 16v64" stroke="currentColor" strokeOpacity=".35" strokeWidth="3" />
        <path d="M24 20Q48 100 72 20" stroke="currentColor" strokeWidth="6" />
        <circle cx="48" cy="60" r="5" fill="currentColor" />
      </>}
      {area === 'Algebra' && <>
        <path d="M28 16v64M48 16v64M68 16v64M16 28h64M16 48h64M16 68h64" stroke="currentColor" strokeOpacity=".3" strokeWidth="2" />
        <path d="M20 74L76 22" stroke="currentColor" strokeWidth="6" />
        <circle cx="34" cy="61" r="5" fill="currentColor" /><circle cx="62" cy="35" r="5" fill="currentColor" />
      </>}
      {area === 'Problem Solving & Data' && <>
        <path d="M18 76h60" stroke="currentColor" strokeOpacity=".35" strokeWidth="3" />
        <rect x="22" y="52" width="12" height="24" rx="4" fill="currentColor" fillOpacity=".5" />
        <rect x="42" y="28" width="12" height="48" rx="4" fill="currentColor" />
        <rect x="62" y="42" width="12" height="34" rx="4" fill="currentColor" fillOpacity=".75" />
      </>}
      {area === 'Geometry & Trig' && <>
        <circle cx="48" cy="48" r="30" stroke="currentColor" strokeOpacity=".45" strokeWidth="4" />
        <path d="M48 18L74 63H22z" fill="currentColor" fillOpacity=".25" stroke="currentColor" strokeWidth="5" />
      </>}
    </svg>
  );
}

/** Flat chest that closes a topic; drawn in currentColor, open once every video is watched. */
export function Chest({ open, className }: { open: boolean; className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 64 56" className={cn('overflow-visible', className)}>
      {open && <rect x="9" y="20" width="46" height="10" rx="3" fill="#fff" fillOpacity=".85" />}
      <path d="M6 28V22Q6 8 32 8Q58 8 58 22V28Z" fill="currentColor" fillOpacity=".7" transform={open ? 'rotate(-16 6 22) translate(0 -7)' : undefined} />
      <rect x="6" y="28" width="52" height="22" rx="5" fill="currentColor" />
      <rect x="27" y={open ? 31 : 23} width="10" height="11" rx="3" fill="#fff" fillOpacity=".9" />
    </svg>
  );
}
