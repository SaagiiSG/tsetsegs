import { useEffect, useRef, useState } from 'react';
import createGlobe from 'cobe';

export type GlobePin = {
  id: string;
  location: [number, number];
  /** 0..1 relative weight, used for dot size. */
  weight: number;
  label: string;
  customers: { id: string; name: string; students: number }[];
};

/**
 * Rotating globe with glowing, hoverable pins. Pins are HTML overlays that follow
 * cobe's per-marker anchor elements, so they can show a popup and be clicked.
 */
export function CustomerGlobe({ pins, onSelect }: { pins: GlobePin[]; onSelect: (customerId: string) => void }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pinRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const pausedRef = useRef(false);
  const [open, setOpen] = useState<string | null>(null);
  pausedRef.current = open !== null;

  useEffect(() => {
    const canvas = canvasRef.current, wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const dark = document.documentElement.classList.contains('dark');
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let phi = 1.8;
    let width = canvas.offsetWidth;
    const onResize = () => { width = canvas.offsetWidth; };
    window.addEventListener('resize', onResize);
    const globe = createGlobe(canvas, {
      devicePixelRatio: Math.min(window.devicePixelRatio, 2),
      width: width * 2, height: width * 2,
      phi, theta: 0.3, dark: dark ? 1 : 0, diffuse: 1.2,
      mapSamples: 16000, mapBrightness: dark ? 4 : 1.4,
      baseColor: dark ? [0.25, 0.25, 0.28] : [0.95, 0.95, 0.96],
      markerColor: [0.98, 0.45, 0.45],
      glowColor: dark ? [0.15, 0.15, 0.18] : [0.9, 0.9, 0.92],
      markers: pins.map(p => ({ location: p.location, size: 0.02, id: p.id })),
    });
    const root = document.documentElement;
    let raf = 0;
    const tick = () => {
      if (!reduce && !pausedRef.current) phi += 0.003;
      globe.update({ phi, width: width * 2, height: width * 2 });
      for (const p of pins) {
        const el = pinRefs.current[p.id];
        if (!el) continue;
        const anchor = [...wrap.querySelectorAll<HTMLElement>('div[style*="anchor-name"]')].find(c => (c.getAttribute('style') ?? '').includes(`--cobe-${p.id}`));
        const visible = !!getComputedStyle(root).getPropertyValue(`--cobe-visible-${p.id}`).trim();
        if (anchor) { el.style.left = anchor.style.left; el.style.top = anchor.style.top; }
        el.style.opacity = visible ? '1' : '0';
        el.style.pointerEvents = visible ? 'auto' : 'none';
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(raf); globe.destroy(); window.removeEventListener('resize', onResize); };
  }, [JSON.stringify(pins.map(p => [p.id, p.location]))]);

  return (
    <div ref={wrapRef} className="relative w-full aspect-square max-w-[420px] mx-auto" onMouseLeave={() => setOpen(null)}>
      <canvas ref={canvasRef} aria-label="Globe showing customer locations" className="w-full h-full" />
      {pins.map(p => {
        const size = 10 + Math.round(p.weight * 10);
        return (
          <div
            key={p.id}
            ref={el => { pinRefs.current[p.id] = el; }}
            className="absolute -translate-x-1/2 -translate-y-1/2 transition-opacity duration-200"
            style={{ opacity: 0, zIndex: open === p.id ? 20 : 10 }}
            onMouseEnter={() => setOpen(p.id)}
          >
            <button
              type="button"
              aria-label={`${p.label}: ${p.customers.map(c => c.name).join(', ')}`}
              onFocus={() => setOpen(p.id)}
              onClick={() => (p.customers.length === 1 ? onSelect(p.customers[0].id) : setOpen(p.id))}
              className="globe-pin relative block rounded-full"
              style={{ width: size, height: size }}
            />
            {open === p.id && (
              <div className="absolute left-1/2 bottom-full mb-2 -translate-x-1/2 min-w-44 rounded-xl border bg-popover text-popover-foreground shadow-lg p-1.5 text-sm">
                <p className="px-2 pt-1 pb-1.5 text-xs text-muted-foreground">{p.label}</p>
                {p.customers.map(c => (
                  <button key={c.id} type="button" onClick={() => onSelect(c.id)}
                    className="w-full flex items-center justify-between gap-3 rounded-lg px-2 py-1.5 text-left hover:bg-muted focus-visible:bg-muted outline-none">
                    <span className="truncate font-medium">{c.name}</span>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">{c.students} students</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
