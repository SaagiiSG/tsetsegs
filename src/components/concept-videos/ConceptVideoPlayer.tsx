import { useEffect, useMemo, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { resolveVideo, ResolvedVideo } from '@/lib/conceptVideos';

export function ConceptVideoPlayer({ url, subtitles }: { url: string; subtitles?: string | null }) {
  const trackSrc = useMemo(() => (subtitles?.trim() ? URL.createObjectURL(new Blob([subtitles], { type: 'text/vtt' })) : null), [subtitles]);
  useEffect(() => () => { if (trackSrc) URL.revokeObjectURL(trackSrc); }, [trackSrc]);
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
        <>
          <iframe
            src={v.src}
            className="absolute inset-0 h-full w-full"
            allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            title="Concept video"
          />
          {/* Click shields: block the YouTube title bar (top) and the YouTube logo
              (bottom-right) so students can't click through to youtube.com. */}
          <div className="absolute inset-x-0 top-0 h-14" onClick={(e) => e.preventDefault()} />
          <div className="absolute bottom-0 right-0 h-12 w-28" onClick={(e) => e.preventDefault()} />
        </>
      )}
      {v?.kind === 'file' && (
        <video
          key={`${v.src}|${trackSrc ?? ''}`}
          src={v.src}
          controls
          playsInline
          preload="metadata"
          controlsList="nodownload"
          onContextMenu={(e) => e.preventDefault()}
          crossOrigin="anonymous"
          className="absolute inset-0 h-full w-full bg-background"
          onLoadedMetadata={(e) => {
            const t = e.currentTarget.textTracks[0];
            if (t) t.mode = 'showing';
          }}
        >
          {trackSrc && <track kind="subtitles" src={trackSrc} srcLang="en" label="English" default />}
        </video>
      )}
      {v?.kind === 'link' && (
        <iframe src={v.src} className="absolute inset-0 h-full w-full" allow="autoplay; fullscreen" allowFullScreen title="Concept video" />
      )}
    </div>
  );
}
