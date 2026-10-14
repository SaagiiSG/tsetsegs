import { useMemo, useState } from 'react';
import type { UseQueryResult } from '@tanstack/react-query';
import { useQueryClient } from '@tanstack/react-query';
import { Check, Lock, Play, Star } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ConceptVideoPlayer } from '@/components/concept-videos/ConceptVideoPlayer';
import { VideoLabelFilter, LabelChips, allLabels, filterVideos } from '@/components/concept-videos/VideoLabelFilter';
import { cn } from '@/lib/utils';
import { useCenter } from './centerContext';

type Video = { id: string; title: string; description: string | null; module: string | null; domain: string; video_url: string; subtitles_vtt: string | null; labels: string[]; duration_minutes: number | null; order_index: number };
type MeLite = { student: { id: string }; videosDone: string[] };

// Zig-zag offsets (in rem) like a winding path.
const OFFSETS = [0, 3.5, 5, 3.5, 0, -3.5, -5, -3.5];

/**
 * Duolingo-style roadmap: videos in admin-defined order (order_index), grouped into units by
 * module. Each node unlocks once the previous one is watched.
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

  const currentIdx = list.findIndex(v => !done.has(v.id));
  const units = useMemo(() => {
    const out: { name: string; items: { v: Video; i: number }[] }[] = [];
    list.forEach((v, i) => {
      const name = v.module?.trim() || v.domain;
      const last = out[out.length - 1];
      if (last && last.name === name) last.items.push({ v, i }); else out.push({ name, items: [{ v, i }] });
    });
    return out;
  }, [list]);
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

  const state = (i: number, v: Video) => (done.has(v.id) ? 'done' : i === currentIdx ? 'current' : 'locked');

  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Concept videos</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Follow the path. Each lesson unlocks the next.</p>
        </div>
        {list.length > 0 && <p className="font-mono text-sm">{watched}<span className="text-muted-foreground">/{list.length} watched</span></p>}
      </div>
      {list.length > 0 && <div className="h-1.5 rounded-full bg-muted overflow-hidden"><div className="h-full rounded-full transition-[width] duration-700" style={{ width: `${(watched / list.length) * 100}%`, background: 'hsl(var(--section-glow))' }} /></div>}
      {list.length > 0 && <VideoLabelFilter labels={labels} query={query} onQuery={setQuery} active={label} onActive={setLabel} />}

      {videos.isLoading ? <p className="text-sm text-muted-foreground">Loading…</p> : !list.length ? <p className="text-sm text-muted-foreground">No videos yet.</p> : filtering ? (
        !filtered.length ? <p className="text-sm text-muted-foreground">No videos match.</p> : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{filtered.map(v => {
            const i = list.indexOf(v as Video), st = state(i, v as Video);
            return (
              <button key={v.id} disabled={st === 'locked'} onClick={() => setOpen(v as Video)} className={cn('text-left admin-glass-card rounded-2xl border p-4 transition-transform', st === 'locked' ? 'opacity-50' : 'hover:-translate-y-0.5')}>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">{st === 'done' ? <Check className="h-4 w-4" /> : st === 'locked' ? <Lock className="h-4 w-4" /> : <Play className="h-4 w-4" />}Lesson {i + 1}</div>
                <p className="font-medium mt-1">{v.title}</p><LabelChips labels={v.labels} />
              </button>
            );
          })}</div>
        )
      ) : (
        <div className="mx-auto max-w-md space-y-8 pb-10">
          {units.map((u, ui) => (
            <section key={ui} className="space-y-6">
              <div className="rounded-2xl border admin-glass-card px-4 py-3 flex items-center justify-between">
                <div><p className="text-[11px] uppercase tracking-wide text-muted-foreground">Unit {ui + 1}</p><p className="font-semibold">{u.name}</p></div>
                <p className="font-mono text-xs text-muted-foreground">{u.items.filter(x => done.has(x.v.id)).length}/{u.items.length}</p>
              </div>
              <div className="flex flex-col items-center gap-5">
                {u.items.map(({ v, i }) => {
                  const st = state(i, v);
                  return (
                    <div key={v.id} className="flex flex-col items-center gap-1.5" style={{ transform: `translateX(${OFFSETS[i % OFFSETS.length]}rem)` }}>
                      {st === 'current' && <span className="rounded-full border bg-background px-2.5 py-0.5 text-[11px] font-semibold shadow-sm animate-bounce">Start</span>}
                      <button
                        type="button" disabled={st === 'locked'} onClick={() => setOpen(v)} aria-label={`${v.title} — ${st === 'done' ? 'watched' : st === 'locked' ? 'locked' : 'start'}`}
                        className={cn('relative h-16 w-16 rounded-full grid place-items-center transition-transform active:translate-y-1 active:shadow-none',
                          st === 'done' && 'bg-foreground text-background shadow-[0_6px_0_hsl(var(--foreground)/0.35)]',
                          st === 'current' && 'text-background shadow-[0_6px_0_hsl(var(--section-glow)/0.45)] ring-4 ring-[hsl(var(--section-glow)/0.25)]',
                          st === 'locked' && 'bg-muted text-muted-foreground shadow-[0_6px_0_hsl(var(--border))] cursor-not-allowed')}
                        style={st === 'current' ? { background: 'hsl(var(--section-glow))' } : undefined}>
                        {st === 'done' ? <Check className="h-7 w-7" /> : st === 'locked' ? <Lock className="h-6 w-6" /> : (i === list.length - 1 ? <Star className="h-7 w-7" /> : <Play className="h-7 w-7 translate-x-0.5" />)}
                      </button>
                      <p className={cn('text-xs text-center max-w-[9rem] leading-tight', st === 'locked' ? 'text-muted-foreground' : 'font-medium')}>{v.title}</p>
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
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
