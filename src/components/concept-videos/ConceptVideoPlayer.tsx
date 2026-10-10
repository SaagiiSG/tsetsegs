import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { resolveVideo, ResolvedVideo } from '@/lib/conceptVideos';

export function ConceptVideoPlayer({ url }: { url: string }) {
  const [v, setV] = useState<ResolvedVideo | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    setV(null);
    setErr(null);
    resolveVideo(url)
      .then((r) => alive && setV(r))
      .catch(() => alive && setErr('This video could not be loaded. Please try again.'));
    return () => {
      alive = false;
    };
  }, [url]);

  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-muted">
      {!v && !err && (
        <div className="absolute inset-0 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}
      {err && <div className="absolute inset-0 flex items-center justify-center p-4 text-center text-sm text-muted-foreground">{err}</div>}
      {v?.kind === 'youtube' && (
        <iframe
          src={v.src}
          className="absolute inset-0 h-full w-full"
          allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          title="Concept video"
        />
      )}
      {v?.kind === 'file' && (
        <video
          src={v.src}
          controls
          playsInline
          preload="metadata"
          controlsList="nodownload"
          onContextMenu={(e) => e.preventDefault()}
          className="absolute inset-0 h-full w-full bg-background"
        />
      )}
      {v?.kind === 'link' && (
        <iframe src={v.src} className="absolute inset-0 h-full w-full" allow="autoplay; fullscreen" allowFullScreen title="Concept video" />
      )}
    </div>
  );
}
