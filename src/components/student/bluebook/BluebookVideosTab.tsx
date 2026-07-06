import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PlayCircle, AlertCircle, Video } from 'lucide-react';

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

export function BluebookVideosTab() {
  const [selected, setSelected] = useState<DriveVideo | null>(null);

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

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-14 w-full" />
        ))}
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

  const totalVideos = tests.reduce(
    (acc, t) => acc + t.modules.reduce((a, m) => a + m.videoCount, 0),
    0,
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h2 className="text-lg sm:text-xl font-semibold flex items-center gap-2">
            <Video className="h-5 w-5 text-primary" />
            Explanation Videos
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Walkthroughs for Bluebook practice tests 4–10, grouped by test and module.
          </p>
        </div>
        <Badge variant="secondary" className="tabular-nums">
          {totalVideos} videos
        </Badge>
      </div>

      <Accordion
        type="multiple"
        defaultValue={tests.slice(0, 1).map((t) => t.id)}
        className="space-y-2"
      >
        {tests.map((test) => {
          const testLabel = test.testNumber != null ? `Practice Test ${test.testNumber}` : test.name;
          const testTotal = test.modules.reduce((a, m) => a + m.videoCount, 0);
          return (
            <AccordionItem
              key={test.id}
              value={test.id}
              className="border rounded-lg bg-card overflow-hidden"
            >
              <AccordionTrigger className="px-3 sm:px-4 py-3 hover:no-underline">
                <div className="flex items-center justify-between w-full pr-2 gap-2">
                  <span className="font-semibold text-sm sm:text-base capitalize truncate">
                    {testLabel}
                  </span>
                  <Badge variant="outline" className="tabular-nums text-xs shrink-0">
                    {testTotal}
                  </Badge>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-3 sm:px-4 pb-3 space-y-4">
                {test.modules.map((mod) => (
                  <div key={mod.id} className="space-y-2">
                    <div className="flex items-center gap-2 sticky top-0 bg-card/95 backdrop-blur py-1 -mx-1 px-1 z-10">
                      <h3 className="text-xs sm:text-sm font-medium capitalize">
                        {mod.moduleNumber != null ? `Module ${mod.moduleNumber}` : mod.name}
                      </h3>
                      <div className="h-px flex-1 bg-border" />
                      <span className="text-xs text-muted-foreground tabular-nums">
                        {mod.videoCount}
                      </span>
                    </div>
                    {mod.videos.length === 0 ? (
                      <p className="text-xs text-muted-foreground pl-1">No videos in this module.</p>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 sm:gap-3">
                        {mod.videos.map((v) => (
                          <button
                            key={v.id}
                            type="button"
                            onClick={() => setSelected(v)}
                            className="group text-left rounded-md overflow-hidden border bg-background hover:border-primary/60 active:scale-[0.98] transition"
                          >
                            <div className="relative aspect-video bg-muted">
                              {v.thumbnailUrl ? (
                                // eslint-disable-next-line jsx-a11y/img-redundant-alt
                                <img
                                  src={v.thumbnailUrl}
                                  alt={`Video ${v.name}`}
                                  className="w-full h-full object-cover"
                                  loading="lazy"
                                  referrerPolicy="no-referrer"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                                  <Video className="h-6 w-6" />
                                </div>
                              )}
                              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/25 transition flex items-center justify-center">
                                <PlayCircle className="h-8 w-8 text-white opacity-0 group-hover:opacity-100 transition" />
                              </div>
                            </div>
                            <div className="px-2 py-1.5">
                              <p className="text-xs sm:text-sm font-medium truncate tabular-nums">
                                {v.name}
                              </p>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-3xl p-0 gap-0 overflow-hidden">
          <DialogHeader className="px-4 py-3 border-b">
            <DialogTitle className="text-sm sm:text-base tabular-nums">
              {selected?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="aspect-video bg-black">
            {selected && (
              <iframe
                key={selected.id}
                src={selected.embedUrl}
                className="w-full h-full"
                allow="autoplay; encrypted-media; fullscreen"
                allowFullScreen
                title={`Explanation video ${selected.name}`}
              />
            )}
          </div>
          <div className="px-4 py-2 flex justify-end">
            <Button variant="ghost" size="sm" onClick={() => setSelected(null)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default BluebookVideosTab;
