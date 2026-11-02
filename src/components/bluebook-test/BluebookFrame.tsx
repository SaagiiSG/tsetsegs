import { useEffect, type ReactNode } from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { PopoverArrow } from '@radix-ui/react-popover';
import { ChevronDown, ChevronUp, MoreVertical } from 'lucide-react';
import { Dialog, DialogClose, DialogOverlay, DialogPortal, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useCalculatorSnap } from '@/components/student/DesmosCalculator';
import { formatClock, timerShown } from '@/lib/bluebookTest';
import { cn } from '@/lib/utils';
import './bluebook.css';

export type Tool = { key: string; label: string; icon: ReactNode; active?: boolean; onClick(): void };
export type MenuItem = { label: string; icon: ReactNode; onClick(): void };

const FONTS_HREF = 'https://fonts.googleapis.com/css2?family=Noto+Serif:ital,wght@0,400;0,700;1,400&family=Roboto:wght@400;500;700&display=swap';

/** Roboto + Noto Serif, loaded only once the test is opened; the rest of the app keeps its own fonts. */
export function useBluebookFonts() {
  useEffect(() => {
    if (document.querySelector('link[data-bluebook-fonts]')) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = FONTS_HREF;
    link.dataset.bluebookFonts = '';
    document.head.appendChild(link);
  }, []);
}

export function DotSpinner({ className }: { className?: string }) {
  return (
    <div className={cn('bb-spinner', className)} role="status" aria-label="Loading">
      {Array.from({ length: 8 }, (_, i) => (
        <span key={i} style={{ transform: `rotate(${i * 45}deg)`, ['--d' as string]: `${i * 0.12 - 0.96}s` }} />
      ))}
    </div>
  );
}

interface BluebookFrameProps {
  sectionLabel: string;
  directions: ReactNode;
  remaining: number | null;
  timerHidden: boolean;
  onToggleTimer(): void;
  tools: Tool[];
  menu: MenuItem[];
  studentName: string;
  pill?: { label: string; open: boolean; onOpenChange(o: boolean): void; content: ReactNode };
  onBack?: () => void;
  onNext?: () => void;
  dimmed?: boolean;
  bodyClassName?: string;
  /** Panel laid over the right of the body (the Reference sheet); it doesn't scroll with the question. */
  aside?: ReactNode;
  children: ReactNode;
}

export function BluebookFrame({
  sectionLabel, directions, remaining, timerHidden, onToggleTimer, tools, menu, studentName,
  pill, onBack, onNext, dimmed, bodyClassName, aside, children,
}: BluebookFrameProps) {
  useBluebookFonts();
  const snap = useCalculatorSnap();
  // The docked calculator takes 40vw; the test reflows beside it, as the page did before.
  const push = cn('transition-[margin] duration-300', snap === 'left' && 'md:ml-[40vw]', snap === 'right' && 'md:mr-[40vw]');
  const showClock = remaining !== null && timerShown(timerHidden, remaining);

  return (
    <div className="bluebook fixed inset-0 flex flex-col overflow-hidden">
      <header className={cn('bb-bar shrink-0', push)}>
        <div className="grid h-[64px] grid-cols-[1fr_auto_1fr] items-center gap-2 px-4 md:h-[78px] md:px-10">
          <div className="min-w-0">
            <h1 className="truncate text-[15px] font-medium leading-tight md:text-[21px]">{sectionLabel}</h1>
            <Dialog>
              <DialogTrigger className="bb-focus mt-1 inline-flex items-center gap-1 rounded text-[14px] font-medium md:mt-2 md:text-[15px]">
                Directions <ChevronDown className="h-4 w-4" />
              </DialogTrigger>
              <DialogPortal>
                <DialogOverlay className="bg-black/40" />
                <DialogPrimitive.Content
                  aria-describedby={undefined}
                  className="bluebook fixed left-1/2 top-4 z-50 flex max-h-[calc(100dvh-32px)] w-[min(calc(100vw-32px),1080px)] -translate-x-1/2 flex-col rounded-lg bg-white shadow-xl outline-none md:top-[86px] md:max-h-[calc(100dvh-120px)]"
                >
                  <DialogTitle className="sr-only">Directions</DialogTitle>
                  <div className="bb-serif overflow-y-auto px-6 pb-2 pt-6 text-[16px] leading-[1.6] md:px-10 md:pt-8">{directions}</div>
                  <div className="flex justify-end px-6 py-4 md:px-10">
                    <DialogClose className="bb-pill-yellow">Close</DialogClose>
                  </div>
                </DialogPrimitive.Content>
              </DialogPortal>
            </Dialog>
          </div>

          <div className="flex flex-col items-center">
            <span className="h-[28px] text-[20px] font-bold leading-[28px] tabular-nums md:h-[30px] md:text-[24px] md:leading-[30px]" aria-live="off">
              {showClock ? formatClock(remaining) : ''}
            </span>
            <button
              type="button"
              onClick={onToggleTimer}
              className="bb-focus mt-1 rounded-full border-[1.5px] border-[var(--bb-ink)] px-3 text-[12px] font-bold leading-[16px] hover:bg-white/60"
            >
              {timerHidden ? 'Show' : 'Hide'}
            </button>
          </div>

          <div className="flex items-center justify-end gap-1 md:gap-3">
            {tools.map(t => (
              <button key={t.key} type="button" onClick={t.onClick} aria-pressed={!!t.active}
                className="bb-focus hidden flex-col items-center gap-1 rounded px-1.5 pt-1 text-[13px] font-medium md:flex [&_svg]:h-5 [&_svg]:w-5">
                {t.icon}
                <span className={cn('border-b-[3px] pb-0.5', t.active ? 'border-[var(--bb-ink)]' : 'border-transparent')}>{t.label}</span>
              </button>
            ))}
            <DropdownMenu>
              <DropdownMenuTrigger className="bb-focus flex flex-col items-center gap-1 rounded px-1.5 pt-1 text-[13px] font-medium [&_svg]:h-5 [&_svg]:w-5">
                <MoreVertical />
                <span className="border-b-[3px] border-transparent pb-0.5">More</span>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bluebook min-w-[200px] rounded-md border-0 bg-white p-1 shadow-[0_2px_12px_rgba(0,0,0,.25)]">
                {tools.map(t => (
                  <DropdownMenuItem key={t.key} onSelect={t.onClick} className="gap-3 px-3 py-2.5 text-[15px] md:hidden [&_svg]:h-5 [&_svg]:w-5">
                    {t.icon}{t.label}
                  </DropdownMenuItem>
                ))}
                {menu.map(m => (
                  <DropdownMenuItem key={m.label} onSelect={m.onClick} className="gap-3 px-3 py-2.5 text-[15px] [&_svg]:h-5 [&_svg]:w-5">
                    {m.icon}{m.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        <div className="bb-rule" />
      </header>

      <div className={cn('shrink-0 px-4 md:px-10', push)}>
        <div className="rounded-b-[10px] bg-[var(--bb-navy)] py-[7px] text-center text-[12px] font-bold tracking-[0.01em] text-white md:text-[13px]">
          THIS IS A PRACTICE TEST
        </div>
      </div>

      <div className={cn('relative min-h-0 flex-1', push)}>
        <main className={cn('absolute inset-0 overflow-y-auto', bodyClassName)}>
          {dimmed ? (
            <div className="grid h-full place-items-center bg-black/[0.06] text-[var(--bb-ink)]"><DotSpinner /></div>
          ) : children}
        </main>
        {!dimmed && aside}
      </div>

      <footer className={cn('bb-bar shrink-0', push)}>
        <div className="bb-rule" />
        <div className="grid h-[60px] grid-cols-[auto_1fr_auto] items-center gap-2 px-3 md:h-[62px] md:grid-cols-[1fr_auto_1fr] md:px-10">
          <div className="hidden min-w-0 truncate text-[19px] font-medium md:block">{studentName}</div>
          <div className="flex justify-start md:justify-center">
            {pill && (
              <Popover open={pill.open} onOpenChange={pill.onOpenChange}>
                <PopoverTrigger className="bb-focus inline-flex h-[37px] items-center gap-1.5 whitespace-nowrap rounded-[5px] bg-[var(--bb-ink)] px-3 text-[15px] font-bold text-white md:px-4 md:text-[16px]">
                  {pill.label}
                  {pill.open ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
                </PopoverTrigger>
                <PopoverContent side="top" sideOffset={14} collisionPadding={8}
                  className="bluebook w-[min(calc(100vw-16px),640px)] rounded-lg border-0 bg-white p-0 shadow-[0_4px_24px_rgba(0,0,0,.28)]">
                  {pill.content}
                  <PopoverArrow className="fill-white" width={22} height={11} />
                </PopoverContent>
              </Popover>
            )}
          </div>
          <div className="flex justify-end gap-2 md:gap-3">
            {onBack && <button type="button" className="bb-pill-blue" onClick={onBack}>Back</button>}
            {onNext && <button type="button" className="bb-pill-blue" onClick={onNext}>Next</button>}
          </div>
        </div>
      </footer>
    </div>
  );
}
