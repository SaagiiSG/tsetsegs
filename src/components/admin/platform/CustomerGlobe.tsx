import { useEffect, useRef } from 'react';
import createGlobe from 'cobe';

export type GlobeMarker = { location: [number, number]; size: number };

/** Lightweight rotating globe with one marker per customer country. */
export function CustomerGlobe({ markers }: { markers: GlobeMarker[] }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
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
      markers,
    });
    let raf = 0;
    const tick = () => {
      if (!reduce) phi += 0.003;
      globe.update({ phi, width: width * 2, height: width * 2 });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(raf); globe.destroy(); window.removeEventListener('resize', onResize); };
  }, [JSON.stringify(markers)]);
  return <canvas ref={ref} aria-label="Globe showing customer locations" className="w-full aspect-square max-w-[420px] mx-auto" />;
}
