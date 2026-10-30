import { Check, Play } from 'lucide-react';
import cloudsFar from '@/assets/sky/05-clouds-far.svg';
import cloudsMid from '@/assets/sky/06-clouds-mid.svg';
import { cn } from '@/lib/utils';
import { CARD_WAVES } from './SkyDepth';
import { AREA_COLOR, type Area, type TopicUnit } from './videoTopics';
import { Chest } from './topicArt';
import { HairlineFigure, type HairlineSpec } from './HairlineFigure';
import { figureSlots, topicFigures } from './topicFigures';
import padlock from './hairline/padlock.js';

export type Video = { id: string; title: string; description: string | null; module: string | null; domain: string; video_url: string; subtitles_vtt: string | null; labels: string[]; duration_minutes: number | null; order_index: number };

// Zig-zag offsets (in rem) like a winding path: four lean right, then four lean left.
const OFFSETS = [0, 3, 4, 3, 0, -3, -4, -3];
const WAVE: Record<Area, string> = { 'Advanced Math': CARD_WAVES.violet, Algebra: CARD_WAVES.blue, 'Problem Solving & Data': CARD_WAVES.orange, 'Geometry & Trig': CARD_WAVES.pink };
// "More videos" (modules outside the 26 topics) has no area: a quiet slate.
export const MORE = { light: '#8C96AB', dark: '#B4BCCB' };
// As wide as the free side allows (half the map + the bend's lean − half a caption), at most 280px.
const FIGURE = 'sky-hairline rounded-3xl w-[min(280px,calc(50cqw+3rem-87px))]';

const Figure = ({ figure }: { figure: HairlineSpec }) => <HairlineFigure figure={figure} play className={FIGURE} />;

/** One topic's map: its title, the winding path of videos, the chest, and hairline figures switching sides at each bend. */
export function TopicMap({ unit: u, nextVideoId, onOpen }: { unit: TopicUnit<Video>; nextVideoId: string | null; onOpen: (v: Video) => void }) {
  const c = u.area ? AREA_COLOR[u.area] : MORE;
  const figs = topicFigures(u.n, u.area);
  const slots = figs.length ? figureSlots(u.total) : [];
  // A figure that starts beside the last video would hang past the chest: leave room under the path.
  const hangs = slots.some(s => s.anchor === u.total - 1);
  return (
    <section aria-label={u.n ? `Topic ${u.n} · ${u.name}` : u.name} className="sky-unit [container-type:inline-size] relative pb-10"
      style={{ '--unit-light': c.light, '--unit-dark': c.dark, '--wave': `url(${u.area ? WAVE[u.area] : CARD_WAVES.blue})` } as React.CSSProperties}>
      <div aria-hidden className="sky-clouds-band is-top" style={{ backgroundImage: `url(${cloudsMid}), url(${cloudsFar})` }} />
      <div aria-hidden className="sky-clouds-band" style={{ backgroundImage: `url(${cloudsMid}), url(${cloudsFar})` }} />
      <header className="relative text-center pt-2 pb-5">
        {u.area && <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{u.area}</p>}
        <h2 className="text-2xl font-bold tracking-tight">{u.n ? `Topic ${u.n} · ${u.name}` : u.name}</h2>
        <p className="text-sm text-muted-foreground mt-0.5">{`${u.watched}/${u.total} watched`}</p>
      </header>
      <div className={cn('relative flex flex-col items-center gap-5', hangs && 'pb-[min(160px,32cqw)]')}>
        {u.items.map(({ video: v, state: st }, i) => (
          <div key={v.id} className="relative flex w-full flex-col items-center">
            {slots.map((s, k) => s.anchor === i && (
              <div key={k} data-side={s.side} className={cn('absolute top-0 z-10', s.side === 'left' ? 'left-0' : 'right-0')}><Figure figure={figs[k % figs.length]} /></div>
            ))}
            <div className="flex flex-col items-center gap-1.5" style={{ transform: `translateX(${OFFSETS[i % OFFSETS.length]}rem)` }}>
              {v.id === nextVideoId && <span className="rounded-full border-2 border-[color:var(--unit)] bg-card px-2.5 py-0.5 text-[11px] font-semibold shadow-sm animate-bounce motion-reduce:animate-none">Start</span>}
              <button
                type="button" disabled={st === 'locked'} onClick={() => onOpen(v)} aria-label={`${v.title} — ${st === 'done' ? 'watched' : st === 'locked' ? 'locked' : 'start'}`}
                className={cn('relative h-16 w-16 rounded-full grid place-items-center transition-transform active:translate-y-1 active:shadow-none',
                  st === 'locked' ? 'bg-muted text-muted-foreground shadow-[0_6px_0_hsl(var(--border))] cursor-not-allowed' : `sky-node sky-node-${st}`)}>
                {st === 'done' ? <Check className="h-7 w-7" strokeWidth={3} /> : st === 'locked' ? <HairlineFigure figure={padlock} className="sky-hairline-lock w-24 -translate-x-4 -translate-y-3.5" /> : <Play className="h-7 w-7 translate-x-0.5 fill-current" />}
              </button>
              <p className={cn('text-xs text-center max-w-[9rem] leading-tight', st === 'locked' ? 'text-muted-foreground' : 'font-medium')}>{v.title}</p>
            </div>
          </div>
        ))}
        <div style={{ transform: `translateX(${OFFSETS[u.items.length % OFFSETS.length]}rem)` }}>
          <Chest open={u.watched === u.total} className="h-14 w-16 text-[color:var(--unit)]" />
        </div>
        {/* A topic with fewer bends than figures puts the rest in rows of their own, still switching sides. */}
        {slots.map((s, k) => s.anchor === 'end' && (
          <div key={`end${k}`} data-side={s.side} className={cn('flex w-full', s.side === 'left' ? 'justify-start' : 'justify-end')}><Figure figure={figs[k % figs.length]} /></div>
        ))}
      </div>
    </section>
  );
}
