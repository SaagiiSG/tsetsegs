import { useEffect, useMemo, useRef, useState } from 'react';
import type { UseQueryResult } from '@tanstack/react-query';
import { useQueryClient } from '@tanstack/react-query';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Check, Lock, Play } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ConceptVideoPlayer } from '@/components/concept-videos/ConceptVideoPlayer';
import { VideoLabelFilter, LabelChips, filterVideos } from '@/components/concept-videos/VideoLabelFilter';
import { cn } from '@/lib/utils';
import { useCenter } from './centerContext';
import { SkyListSkeleton } from './SkySkeleton';
import { LoadError } from './CenterPracticeBrowser';
import { topicUnits, upNext, type VideoState } from './videoTopics';
import { TopicMap, type Video } from './TopicMap';
import { TopicList, unitKey } from './TopicList';
import { useIsWide } from './useIsWide';

type MeLite = { student: { id: string }; videosDone: string[] };

/**
 * Concept videos by College Panda topic (book order): the topics as cards on the left, the chosen topic's map in the
 * space on the right (on a phone the map slides in over the list). Any topic can be started; inside a topic each video
 * unlocks the next. The chosen topic lives in the address (?topic=N) so refresh and the phone's back button work.
 */
export function VideoRoadmap({ videos, me }: { videos: UseQueryResult<any[]>; me: MeLite }) {
  const { center, userId } = useCenter();
  const qc = useQueryClient();
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const reduce = useReducedMotion();
  const wide = useIsWide();
  const list = (videos.data ?? []) as Video[];
  const done = useMemo(() => new Set(me.videosDone), [me.videosDone]);
  const [open, setOpen] = useState<Video | null>(null);
  const [query, setQuery] = useState('');
  const [saving, setSaving] = useState(false);
  const filtered = useMemo(() => filterVideos(list, query, null), [list, query]);
  const filtering = !!query.trim();

  const units = useMemo(() => topicUnits(list, done), [list, done]);
  const next = upNext(units);
  // Per video: its state and the topic label, for the flat list shown while searching.
  const byId = useMemo(() => new Map(units.flatMap(u => u.items.map(it => [it.video.id, { state: it.state, topic: u.n ? `Topic ${u.n}` : u.name }] as const))), [units]);
  const watched = list.filter(v => done.has(v.id)).length;

  // A topic named in the address counts only if we have it; otherwise the laptop shows the up-next topic as it was when
  // the videos loaded, so finishing that topic keeps its map (and the opening chest) on screen.
  const asked = params.get('topic');
  const picked = asked !== null && units.some(u => unitKey(u) === asked) ? asked : null;
  const firstDefault = useRef<string | null>(null);
  if (firstDefault.current === null && units.length) firstDefault.current = next ? unitKey(units[next.unitIndex]) : unitKey(units[0]);
  const fallback = units.some(u => unitKey(u) === firstDefault.current) ? firstDefault.current : units.length ? unitKey(units[0]) : null;
  const selected = picked ?? fallback;
  const unit = units.find(u => unitKey(u) === selected);
  // A phone mounts a map only once a topic is picked, so a tap never shows another topic's map on the way in.
  const showMap = !!unit && (!!picked || wide !== false);

  // The portal scrolls inside #root. A phone remembers where the list was, to come back to it.
  const mapRef = useRef<HTMLDivElement>(null);
  const listTop = useRef(0);
  const wasPicked = useRef(picked);
  useEffect(() => {
    const root = document.getElementById('root');
    if (picked && picked !== wasPicked.current) {
      // A newly picked map opens at its top: always on a phone; on a laptop only when its top is above the screen.
      const el = mapRef.current;
      if (el && (wide === false || el.getBoundingClientRect().top < 0)) el.scrollIntoView({ block: 'start' });
    } else if (!picked && wasPicked.current && wide === false && root) root.scrollTop = listTop.current;
    wasPicked.current = picked;
  }, [picked, wide]);

  // On a laptop picking swaps the map in place; on a phone it opens the map as a new page, so back returns to the list.
  const pick = (key: string) => {
    if (wide === false) listTop.current = document.getElementById('root')?.scrollTop ?? 0;
    setParams({ topic: key }, { replace: wide !== false });
  };
  const back = () => (location.key !== 'default' ? navigate(-1) : setParams({}, { replace: true }));

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
      {/* No labels: the search box stays, the filter pills under it are gone (Saagii, 30 Oct). */}
      {list.length > 0 && <VideoLabelFilter labels={[]} query={query} onQuery={setQuery} active={null} onActive={() => {}} />}

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
        <div className="lg:grid lg:grid-cols-[minmax(17rem,20rem)_1fr] lg:gap-7 lg:items-start">
          <div data-column="list" className={cn('lg:sticky lg:top-24 lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto', picked && 'max-lg:hidden')}>
            <TopicList units={units} selected={selected} onPick={pick} />
          </div>
          <div ref={mapRef} data-column="map" className={cn('min-w-0 scroll-mt-24', !picked && 'max-lg:hidden')}>
            <Button variant="ghost" className="lg:hidden -ml-2 mb-1" onClick={back}>‹ Topics</Button>
            <AnimatePresence mode="wait" initial={false}>
              {showMap && unit && (
                <motion.div key={selected} className="mx-auto w-full max-w-3xl"
                  initial={reduce ? false : { x: 48, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={reduce ? undefined : { opacity: 0 }}
                  transition={{ duration: 0.45, ease: [0.32, 0.72, 0, 1] }}>
                  <TopicMap unit={unit} nextVideoId={next?.videoId ?? null} onOpen={setOpen} />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
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
