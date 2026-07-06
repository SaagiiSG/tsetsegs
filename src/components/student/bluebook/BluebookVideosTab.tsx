import { useState, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { PlayCircle, AlertCircle, Video, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DriveVideo {
  id: string;
  name: string;
  thumbnailUrl: string | null;
  embedUrl: string;
  modifiedTime: string | null;
}
interface DriveModule {
  id: string;
  name: string;
  moduleNumber: number | null;
  videoCount: number;
  videos: DriveVideo[];
}
interface DriveTest {
  id: string;
  name: string;
  testNumber: number | null;
  modules: DriveModule[];
}
interface VideosPayload {
  tests: DriveTest[];
  generatedAt: string;
}

interface PlaylistEntry {
  video: DriveVideo;
  moduleLabel: string;
  moduleNumber: number | null;
}

export function BluebookVideosTab() {
  const [selectedTestId, setSelectedTestId] = useState<string | null>(null);
  const [currentVideoId, setCurrentVideoId] = useState<string | null>(null);

  const { data, isLoading, error } = useQuery<VideosPayload>({
    queryKey: ['bluebook-explanation-videos'],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('list-bluebook-videos');
      if (error) throw error;
      return data as VideosPayload;
    },
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  const tests = useMemo(() => {
    if (!data?.tests) return [];
    return [...data.tests].sort((a, b) => (a.testNumber ?? 999) - (b.testNumber ?? 999));
  }, [data]);

  const selectedTest = useMemo(
    () => tests.find((t) => t.id === selectedTestId) ?? null,
    [tests, selectedTestId],
  );

  // Flat ordered playlist for the selected test.
  const playlist: PlaylistEntry[] = useMemo(() => {
    if (!selectedTest) return [];
    const sortedModules = [...selectedTest.modules].sort(
      (a, b) => (a.moduleNumber ?? 999) - (b.moduleNumber ?? 999),
    );
    const entries: PlaylistEntry[] = [];
    for (const mod of sortedModules) {
      const label = mod.moduleNumber != null ? `Module ${mod.moduleNumber}` : mod.name;
      for (const v of mod.videos) {
        entries.push({ video: v, moduleLabel: label, moduleNumber: mod.moduleNumber });
      }
    }
    return entries;
  }, [selectedTest]);

  // Auto-select the first video when a test opens or changes.
  useEffect(() => {
    if (!selectedTest) {
      setCurrentVideoId(null);
      return;
    }
    if (!playlist.length) return;
    const stillExists = currentVideoId && playlist.some((p) => p.video.id === currentVideoId);
    if (!stillExists) setCurrentVideoId(playlist[0].video.id);
  }, [selectedTest?.id, playlist, currentVideoId]);

  const currentIdx = playlist.findIndex((p) => p.video.id === currentVideoId);
  const currentEntry = currentIdx >= 0 ? playlist[currentIdx] : null;
  const nextEntry = currentIdx >= 0 && currentIdx < playlist.length - 1 ? playlist[currentIdx + 1] : null;
  const prevEntry = currentIdx > 0 ? playlist[currentIdx - 1] : null;

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="aspect-video w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-10 text-center space-y-2">
          <AlertCircle className="h-10 w-10 mx-auto text-muted-foreground" />
          <p className="font-medium">Couldn't load videos</p>
          <p className="text-sm text-muted-foreground">
            The video library is temporarily unavailable. Please try again later.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (tests.length === 0) {
    return (
      <Card>
        <CardContent className="py-10 text-center space-y-2">
          <Video className="h-10 w-10 mx-auto text-muted-foreground" />
          <p className="font-medium">No videos yet</p>
          <p className="text-sm text-muted-foreground">
            Explanation videos will appear here as they're published.
          </p>
        </CardContent>
      </Card>
    );
  }

  // ---- Test selection screen ----
  if (!selectedTest) {
    const totalVideos = tests.reduce(
      (acc, t) => acc + t.modules.reduce((a, m) => a + m.videoCount, 0),
      0,
    );
    return (
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h2 className="text-lg sm:text-xl font-semibold flex items-center gap-2">
              <Video className="h-5 w-5 text-primary" />
              Practice Test Explanation Videos
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Pick a practice test to watch full walkthroughs.
            </p>
          </div>
          <Badge variant="secondary" className="tabular-nums">{totalVideos} videos</Badge>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {tests.map((test) => {
            const testLabel = test.testNumber != null ? `Practice Test ${test.testNumber}` : test.name;
            const total = test.modules.reduce((a, m) => a + m.videoCount, 0);
            const cover = test.modules.flatMap((m) => m.videos).find((v) => v.thumbnailUrl)?.thumbnailUrl ?? null;
            return (
              <button
                key={test.id}
                type="button"
                onClick={() => setSelectedTestId(test.id)}
                className="group text-left rounded-lg overflow-hidden border bg-card hover:border-primary/60 hover:shadow-md active:scale-[0.98] transition"
              >
                <div className="relative aspect-video bg-muted">
                  {cover ? (
                    <img
                      src={cover}
                      alt={`${testLabel} cover`}
                      className="w-full h-full object-cover"
                      loading="lazy"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                      <Video className="h-8 w-8" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                    <PlayCircle className="h-10 w-10 text-white drop-shadow" />
                  </div>
                  <Badge className="absolute top-2 right-2 tabular-nums text-[10px]" variant="secondary">
                    {total} videos
                  </Badge>
                </div>
                <div className="px-3 py-2">
                  <p className="text-sm font-semibold capitalize truncate">{testLabel}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {test.modules.length} module{test.modules.length === 1 ? '' : 's'}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // ---- Player screen (YouTube-like) ----
  const testLabel = selectedTest.testNumber != null
    ? `Practice Test ${selectedTest.testNumber}`
    : selectedTest.name;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setSelectedTestId(null)}
          className="gap-1 -ml-2"
        >
          <ChevronLeft className="h-4 w-4" />
          All tests
        </Button>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="capitalize">{testLabel}</Badge>
          <Badge variant="secondary" className="tabular-nums">
            {currentIdx >= 0 ? currentIdx + 1 : 0} / {playlist.length}
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_360px] gap-4">
        {/* Player column */}
        <div className="space-y-3 min-w-0">
          <div className="rounded-lg overflow-hidden border bg-black">
            <div className="aspect-video">
              {currentEntry ? (
                <iframe
                  key={currentEntry.video.id}
                  src={currentEntry.video.embedUrl}
                  className="w-full h-full"
                  allow="autoplay; encrypted-media; fullscreen"
                  allowFullScreen
                  title={`Explanation video ${currentEntry.video.name}`}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-white/60">
                  <Video className="h-10 w-10" />
                </div>
              )}
            </div>
          </div>

          {currentEntry && (
            <div className="space-y-2">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="min-w-0">
                  <h3 className="text-base sm:text-lg font-semibold tabular-nums truncate">
                    {currentEntry.video.name}
                  </h3>
                  <p className="text-xs text-muted-foreground capitalize">
                    {testLabel} · {currentEntry.moduleLabel}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => prevEntry && setCurrentVideoId(prevEntry.video.id)}
                    disabled={!prevEntry}
                    className="gap-1"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Prev
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => nextEntry && setCurrentVideoId(nextEntry.video.id)}
                    disabled={!nextEntry}
                    className="gap-1"
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Playlist column */}
        <div className="min-w-0">
          <div className="flex items-center justify-between px-1 pb-2">
            <h4 className="text-sm font-semibold">Up next</h4>
            <span className="text-xs text-muted-foreground tabular-nums">
              {playlist.length} videos
            </span>
          </div>
          <ScrollArea className="h-[320px] sm:h-[420px] lg:h-[560px] rounded-lg border bg-card">
            <ul className="divide-y">
              {playlist.map((entry, idx) => {
                const active = entry.video.id === currentVideoId;
                return (
                  <li key={entry.video.id}>
                    <button
                      type="button"
                      onClick={() => setCurrentVideoId(entry.video.id)}
                      className={cn(
                        'group w-full text-left flex gap-2.5 p-2 hover:bg-accent transition',
                        active && 'bg-accent',
                      )}
                    >
                      <div className="relative w-32 sm:w-36 shrink-0 aspect-video rounded-md overflow-hidden bg-muted">
                        {entry.video.thumbnailUrl ? (
                          <img
                            src={entry.video.thumbnailUrl}
                            alt={`Video ${entry.video.name}`}
                            className="w-full h-full object-cover"
                            loading="lazy"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                            <Video className="h-5 w-5" />
                          </div>
                        )}
                        {active && (
                          <div className="absolute inset-0 bg-primary/25 flex items-center justify-center">
                            <span className="text-[10px] font-bold uppercase tracking-wider bg-primary text-primary-foreground px-1.5 py-0.5 rounded">
                              Now
                            </span>
                          </div>
                        )}
                        <span className="absolute bottom-1 right-1 text-[10px] font-medium px-1 rounded bg-black/70 text-white tabular-nums">
                          {idx + 1}
                        </span>
                      </div>
                      <div className="min-w-0 flex-1 py-0.5">
                        <p
                          className={cn(
                            'text-xs sm:text-sm font-medium tabular-nums line-clamp-2',
                            active && 'text-primary',
                          )}
                        >
                          {entry.video.name}
                        </p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          {entry.moduleLabel}
                        </p>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          </ScrollArea>
        </div>
      </div>
    </div>
  );
}

export default BluebookVideosTab;
