import { useEffect, useRef, useState } from 'react';
import { HL } from './hairline/kernel.js';

export type HairlineSpec = {
  name: string;
  range: number[];
  tour?: ([number, number] | null)[];
  mount: (ctx: { stage: HTMLElement; svg: SVGSVGElement; read: { textContent: string | null } }, value: number) => { destroy: () => void };
};

/** The read-out as a caption: the figure's words for what is under the pointer, blank at rest. */
export const captionText = (v: string | null | undefined): string => (!v || v === 'rest' ? '' : v);

/**
 * One hairline line figure, decorative (the caller labels the spot). It answers the pointer; with `play` it also
 * walks its own tour while on screen, unless the reader asked for less motion. Colours come from --hairline-* vars.
 * With `caption`, its read-out shows as a short line under it (Saagii, 30 Oct).
 */
export function HairlineFigure({ figure, play = false, caption = false, className }: { figure: HairlineSpec; play?: boolean; caption?: boolean; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [text, setText] = useState('');
  useEffect(() => {
    const stage = ref.current;
    if (!stage) return;
    HL.inject(document);
    const svg = HL.mk('svg', { viewBox: '0 0 400 320', 'aria-hidden': 'true' }, stage);
    // The engine writes the read-out every frame; only a change reaches React.
    let last: string | null = null;
    const read = {
      get textContent() { return last; },
      set textContent(v: string | null) { if (v === last) return; last = v; if (caption) setText(captionText(v)); },
    };
    const handle = figure.mount({ stage, svg, read }, figure.range[1]);
    let tour: { stop: () => void } | null = null;
    const io = play ? new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !tour && !HL.reducedMotion()) tour = HL.tour(stage, figure.tour || HL.LAP);
      else if (!e.isIntersecting && tour) { tour.stop(); tour = null; }
    }) : null;
    io?.observe(stage);
    return () => { io?.disconnect(); tour?.stop(); handle.destroy(); svg.remove(); };
  }, [figure, play, caption]);
  const stage = <div ref={ref} data-hairline={figure.name} aria-hidden className={className} />;
  if (!caption) return stage;
  return (
    <div className="flex flex-col items-center">
      {stage}
      <p aria-hidden data-caption="" className="mt-1 h-4 max-w-full truncate text-center text-[11px] leading-4 text-muted-foreground">{text}</p>
    </div>
  );
}
