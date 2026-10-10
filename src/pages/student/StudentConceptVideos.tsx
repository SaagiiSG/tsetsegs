import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, PlayCircle, CheckCircle2, Clapperboard } from 'lucide-react';
import { CONCEPT_DOMAINS, ConceptVideo } from '@/lib/conceptVideos';
import { ConceptVideoPlayer } from '@/components/concept-videos/ConceptVideoPlayer';
import { cn } from '@/lib/utils';

const WATCHED_KEY = 'concept-videos:watched';
const readWatched = (): string[] => {
  try { return JSON.parse(localStorage.getItem(WATCHED_KEY) || '[]'); } catch { return []; }
};

export default function StudentConceptVideos() {
  const [domain, setDomain] = useState<string>('All');
  const [active, setActive] = useState<ConceptVideo | null>(null);
  const [watched, setWatched] = useState<string[]>(readWatched);

  const { data: videos = [], isLoading } = useQuery({
    queryKey: ['concept-videos'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('concept_videos').select('*').eq('is_published', true).order('order_index');
      if (error) throw error;
      return data as ConceptVideo[];
    },
  });

  const domains = useMemo(() => CONCEPT_DOMAINS.filter((d) => videos.some((v) => v.domain === d)), [videos]);
  const shown = domain === 'All' ? videos : videos.filter((v) => v.domain === domain);
  const modules = useMemo(() => {
    const m = new Map<string, ConceptVideo[]>();
    for (const v of shown) {
      const k = `${v.domain} · ${v.module || 'General'}`;
      m.set(k, [...(m.get(k) || []), v]);
    }
    return [...m.entries()];
  }, [shown]);

  const open = (v: ConceptVideo) => {
    setActive(v);
    if (!watched.includes(v.id)) {
      const next = [...watched, v.id];
      setWatched(next);
      localStorage.setItem(WATCHED_KEY, JSON.stringify(next));
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const done = videos.filter((v) => watched.includes(v.id)).length;

  return (
    <div className="mx-auto max-w-5xl space-y-5 p-4 md:p-6">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold">Concept Videos</h1>
          <p className="text-sm text-muted-foreground">Short lessons on each SAT math idea.</p>
        </div>
        {videos.length > 0 && <p className="font-mono text-sm text-muted-foreground">{done}/{videos.length} watched</p>}
      </div>

      {active && (
        <Card>
          <CardContent className="space-y-2 p-3">
            <ConceptVideoPlayer url={active.video_url} />
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-semibold">{active.title}</p>
                {active.description && <p className="text-sm text-muted-foreground">{active.description}</p>}
              </div>
              <Button size="sm" variant="ghost" onClick={() => setActive(null)}>Close</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {domains.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {['All', ...domains].map((d) => (
            <Button key={d} size="sm" variant={domain === d ? 'default' : 'outline'} onClick={() => setDomain(d)}>{d}</Button>
          ))}
        </div>
      )}

      {isLoading ? (
        <Loader2 className="h-5 w-5 animate-spin" />
      ) : videos.length === 0 ? (
        <Card><CardContent className="flex flex-col items-center gap-2 p-10 text-center text-muted-foreground">
          <Clapperboard className="h-8 w-8" />
          <p>No concept videos yet. Check back soon.</p>
        </CardContent></Card>
      ) : (
        modules.map(([name, list]) => (
          <section key={name} className="space-y-2">
            <h2 className="text-sm font-semibold text-muted-foreground">{name}</h2>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {list.map((v) => {
                const seen = watched.includes(v.id);
                return (
                  <button
                    key={v.id}
                    onClick={() => open(v)}
                    className={cn(
                      'flex items-center gap-3 rounded-lg border p-3 text-left transition-colors hover:bg-accent',
                      active?.id === v.id && 'border-primary',
                    )}
                  >
                    {seen ? <CheckCircle2 className="h-6 w-6 shrink-0 text-primary" /> : <PlayCircle className="h-6 w-6 shrink-0 text-muted-foreground" />}
                    <div className="min-w-0">
                      <p className="truncate font-medium">{v.title}</p>
                      <p className="text-xs text-muted-foreground">{v.duration_minutes ? `${v.duration_minutes} min` : 'Video'}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>
        ))
      )}
    </div>
  );
}
