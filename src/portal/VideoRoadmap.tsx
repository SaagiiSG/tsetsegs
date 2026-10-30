import { useMemo, useState } from 'react';
import type { UseQueryResult } from '@tanstack/react-query';
import { useQueryClient } from '@tanstack/react-query';
import { Check, ChevronDown, Lock, Play } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ConceptVideoPlayer } from '@/components/concept-videos/ConceptVideoPlayer';
import { VideoLabelFilter, LabelChips, allLabels, filterVideos } from '@/components/concept-videos/VideoLabelFilter';
import cloudsFar from '@/assets/sky/05-clouds-far.svg';
import cloudsMid from '@/assets/sky/06-clouds-mid.svg';
import { cn } from '@/lib/utils';
import { useCenter } from './centerContext';
import { SkyListSkeleton } from './SkySkeleton';
import { LoadError } from './CenterPracticeBrowser';
import { CARD_WAVES } from './SkyDepth';
import { AREA_COLOR, topicUnits, upNext, type Area, type VideoState } from './videoTopics';
import { Chest } from './topicArt';
import { HairlineFigure, type HairlineSpec } from './HairlineFigure';
import parabola from './hairline/parabola.js';
import balance from './hairline/balance.js';
import unitcircle from './hairline/unitcircle.js';
import scatter from './hairline/scatter.js';
import padlock from './hairline/padlock.js';

type Video = { id: string; title: string; description: string | null; module: string | null; domain: string; video_url: string; subtitles_vtt: string | null; labels: string[]; duration_minutes: number | null; order_index: number };
type MeLite = { student: { id: string }; videosDone: string[] };

// Zig-zag offsets (in rem) like a winding path; the first four lean right, clear of the picture on the left.
const OFFSETS = [0, 3, 4, 3, 0, -3, -4, -3];
const WAVE: Record<Area, string> = { 'Advanced Math': CARD_WAVES.violet, Algebra: CARD_WAVES.blue, 'Problem Solving & Data': CARD_WAVES.orange, 'Geometry & Trig': CARD_WAVES.pink };
// "More videos" (modules outside the 26 topics) has no area: a quiet slate.
const MORE = { light: '#8C96AB', dark: '#B4BCCB' };
// One live line figure per area, beside each open topic's path (Saagii, 30 Oct: hairline only on this map).
const AREA_FIGURE: Record<Area, HairlineSpec> = { 'Advanced Math': parabola, Algebra: balance, 'Geometry & Trig': unitcircle, 'Problem Solving & Data': scatter };

/**
 * Duolingo-style roadmap: one colourful unit per College Panda topic (book order). Any topic can be
 * started; inside a topic each video unlocks the next. Only the up-next topic starts open.
 */
export function VideoRoadmap({ videos, me }: { videos: UseQueryResult<any[]>; me: MeLite }) {
  const { center, userId } = useCenter();
  const qc = useQueryClient();
  const list = (videos.data ?? []) as Video[];
  const done = useMemo(() => new Set(me.videosDone), [me.videosDone]);
  const [open, setOpen] = useState<Video | null>(null);
  const [query, setQuery] = useState('');
  const [label, setLabel] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const labels = useMemo(() => allLabels(list), [list]);
  const filtered = useMemo(() => filterVideos(list, query, label), [list, query, label]);
  const filtering = !!query.trim() || !!label;

  const units = useMemo(() => topicUnits(list, done), [list, done]);
  const next = upNext(units);
  // Per video: its state and the topic label, for the flat list shown while filtering.
  const byId = useMemo(() => new Map(units.flatMap(u => u.items.map(it => [it.video.id, { state: it.state, topic: u.n ? `Topic ${u.n}` : u.name }] as const))), [units]);
  const watched = list.filter(v => done.has(v.id)).length;

  const markDone = async (v: Video) => {
    setSaving(true);
    const { error } = await supabase.from('tenant_video_progress').upsert({ student_id: me.student.id, institution_id: center.id, video_id: v.id }, { ignoreDuplicates: true });
    setSaving(false);
    if (error) { toast.error('Could not save your progress'); return; }
    await qc.invalidateQueries({ queryKey: ['center-student', center.id, userId] });
    toast.success('Lesson complete');
    setOpen(null);
  };

  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Concept videos</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Pick any topic. Inside a topic, each video unlocks the next.</p>
        </div>
        {list.length > 0 && <p className="font-mono text-sm">{watched}<span className="text-muted-foreground">/{list.length} watched</span></p>}
      </div>
      {list.length > 0 && <div className="h-1.5 rounded-full bg-muted overflow-hidden"><div className="h-full rounded-full transition-[width] duration-700" style={{ width: `${(watched / list.length) * 100}%`, background: 'hsl(var(--section-glow))' }} /></div>}
      {list.length > 0 && <VideoLabelFilter labels={labels} query={query} onQuery={setQuery} active={label} onActive={setLabel} />}

      {videos.isLoading ? <SkyListSkeleton rows={4} /> : videos.isError && !videos.data ? <LoadError what="videos" onRetry={() => videos.refetch()} /> : !list.length ? <p className="text-sm text-muted-foreground">No videos yet.</p> : filtering ? (
        !filtered.length ? <p className="text-sm text-muted-foreground">No videos match.</p> : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{filtered.map(v => {
            const info = byId.get(v.id), st: VideoState = info?.state ?? 'locked';
            return (
              <button key={v.id} disabled={st === 'locked'} onClick={() => setOpen(v as Video)} className={cn('text-left admin-glass-card rounded-2xl border p-4 transition-transform', st === 'locked' ? 'opacity-50' : 'hover:-translate-y-0.5')}>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">{st === 'done' ? <Check className="h-4 w-4" /> : st === 'locked' ? <Lock className="h-4 w-4" /> : <Play className="h-4 w-4" />}{info?.topic}</div>
                <p className="font-medium mt-1">{v.title}</p><LabelChips labels={v.labels} />
              </button>
            );
          })}</div>
        )
      ) : (
        <div className="mx-auto max-w-md space-y-4 pb-10">
          {units.map((u, ui) => {
            const c = u.area ? AREA_COLOR[u.area] : MORE;
            return (
              <Collapsible key={u.n ?? 'more'} defaultOpen={ui === next?.unitIndex} className="sky-unit"
                style={{ '--unit-light': c.light, '--unit-dark': c.dark, '--wave': `url(${u.area ? WAVE[u.area] : CARD_WAVES.blue})` } as React.CSSProperties}>
                <CollapsibleTrigger className="sky-unit-banner sky-decor group relative overflow-hidden w-full rounded-2xl px-4 py-3.5 flex items-center gap-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background">
                  <span className="block min-w-0 flex-1">
                    {u.area && <span className="block text-[11px] font-semibold uppercase tracking-wide">{u.area}</span>}
                    <span className="block text-lg font-bold leading-snug">{u.n ? `Topic ${u.n} · ${u.name}` : u.name}</span>
                    <span className="block text-sm font-medium mt-0.5">{`${u.watched}/${u.total} watched`}</span>
                  </span>
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white/25"><ChevronDown className="h-5 w-5 transition-transform group-data-[state=open]:rotate-180" /></span>
                </CollapsibleTrigger>
                <CollapsibleContent className="relative overflow-hidden">
                  <div aria-hidden className="sky-clouds-band" style={{ backgroundImage: `url(${cloudsMid}), url(${cloudsFar})` }} />
                  {/* Below the first video's caption, beside the next ones (they lean right); the min height keeps it whole in a short topic. */}
                  {u.area && <HairlineFigure figure={AREA_FIGURE[u.area]} play className="sky-hairline absolute left-0 top-44 z-10 w-[8.5rem] rounded-3xl sm:w-48" />}
                  <div className={cn('relative flex flex-col items-center gap-5 pt-6 pb-8', u.area && 'min-h-[22rem]')}>
                    {u.items.map(({ video: v, state: st }, i) => (
                      <div key={v.id} className="flex flex-col items-center gap-1.5" style={{ transform: `translateX(${OFFSETS[i % OFFSETS.length]}rem)` }}>
                        {v.id === next?.videoId && <span className="rounded-full border-2 border-[color:var(--unit)] bg-card px-2.5 py-0.5 text-[11px] font-semibold shadow-sm animate-bounce motion-reduce:animate-none">Start</span>}
                        <button
                          type="button" disabled={st === 'locked'} onClick={() => setOpen(v)} aria-label={`${v.title} — ${st === 'done' ? 'watched' : st === 'locked' ? 'locked' : 'start'}`}
                          className={cn('relative h-16 w-16 rounded-full grid place-items-center transition-transform active:translate-y-1 active:shadow-none',
                            st === 'locked' ? 'bg-muted text-muted-foreground shadow-[0_6px_0_hsl(var(--border))] cursor-not-allowed' : `sky-node sky-node-${st}`)}>
                          {st === 'done' ? <Check className="h-7 w-7" strokeWidth={3} /> : st === 'locked' ? <HairlineFigure figure={padlock} className="sky-hairline-lock w-24 -translate-x-4 -translate-y-3.5" /> : <Play className="h-7 w-7 translate-x-0.5 fill-current" />}
                        </button>
                        <p className={cn('text-xs text-center max-w-[9rem] leading-tight', st === 'locked' ? 'text-muted-foreground' : 'font-medium')}>{v.title}</p>
                      </div>
                    ))}
                    <div style={{ transform: `translateX(${OFFSETS[u.items.length % OFFSETS.length]}rem)` }}>
                      <Chest open={u.watched === u.total} className="h-14 w-16 text-[color:var(--unit)]" />
                    </div>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            );
          })}
        </div>
      )}

      <Dialog open={!!open} onOpenChange={o => !o && setOpen(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader><DialogTitle>{open?.title}</DialogTitle></DialogHeader>
          {open && <>
            <ConceptVideoPlayer url={open.video_url} subtitles={open.subtitles_vtt} />
            {open.description && <p className="text-sm text-muted-foreground">{open.description}</p>}
            <div className="flex justify-end">
              {done.has(open.id) ? <p className="text-sm text-muted-foreground inline-flex items-center gap-1"><Check className="h-4 w-4" />Watched</p>
                : <Button onClick={() => markDone(open)} disabled={saving}><Check className="h-4 w-4" />Mark as watched</Button>}
            </div>
          </>}
        </DialogContent>
      </Dialog>
    </div>
  );
}
