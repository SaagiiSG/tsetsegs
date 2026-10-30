import { useEffect, useRef } from 'react';
import { HL } from './hairline/kernel.js';

export type HairlineSpec = {
  name: string;
  range: number[];
  tour?: ([number, number] | null)[];
  mount: (ctx: { stage: HTMLElement; svg: SVGSVGElement; read: { textContent: string | null } }, value: number) => { destroy: () => void };
};

/**
 * One hairline line figure, decorative (the caller labels the spot). It answers the pointer; with `play` it also
 * walks its own tour while on screen, unless the reader asked for less motion. Colours come from --hairline-* vars.
 */
export function HairlineFigure({ figure, play = false, className }: { figure: HairlineSpec; play?: boolean; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const stage = ref.current;
    if (!stage) return;
    HL.inject(document);
    const svg = HL.mk('svg', { viewBox: '0 0 400 320', 'aria-hidden': 'true' }, stage);
    const handle = figure.mount({ stage, svg, read: { textContent: null } }, figure.range[1]);
    let tour: { stop: () => void } | null = null;
    const io = play ? new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !tour && !HL.reducedMotion()) tour = HL.tour(stage, figure.tour || HL.LAP);
      else if (!e.isIntersecting && tour) { tour.stop(); tour = null; }
    }) : null;
    io?.observe(stage);
    return () => { io?.disconnect(); tour?.stop(); handle.destroy(); svg.remove(); };
  }, [figure, play]);
  return <div ref={ref} data-hairline={figure.name} aria-hidden className={className} />;
}
