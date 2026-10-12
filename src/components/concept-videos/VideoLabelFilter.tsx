import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import { PRESET_LABELS } from '@/lib/conceptVideos';

type V = { title: string; description?: string | null; labels?: string[] | null };

/** Every label in use, presets first, then custom labels alphabetically. */
export function allLabels(videos: V[]): string[] {
  const used = new Set(videos.flatMap((v) => v.labels ?? []));
  const presets = PRESET_LABELS.filter((l) => used.has(l));
  const custom = [...used].filter((l) => !(PRESET_LABELS as readonly string[]).includes(l)).sort();
  return [...presets, ...custom];
}

export function filterVideos<T extends V>(videos: T[], query: string, label: string | null): T[] {
  const q = query.trim().toLowerCase();
  return videos.filter((v) => {
    if (label && !(v.labels ?? []).includes(label)) return false;
    if (!q) return true;
    return [v.title, v.description ?? '', ...(v.labels ?? [])].some((s) => s.toLowerCase().includes(q));
  });
}

export function VideoLabelFilter({ labels, query, onQuery, active, onActive }: {
  labels: string[]; query: string; onQuery: (q: string) => void; active: string | null; onActive: (l: string | null) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={query} onChange={(e) => onQuery(e.target.value)} placeholder="Search videos or labels" className="pl-9" />
      </div>
      {labels.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {[null, ...labels].map((l) => (
            <button key={l ?? 'all'} onClick={() => onActive(l)}
              className={`rounded-full border px-3 py-1 text-xs transition-colors ${active === l ? 'bg-foreground text-background' : 'text-foreground/70 hover:bg-muted'}`}>
              {l ?? 'All'}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function LabelChips({ labels }: { labels?: string[] | null }) {
  if (!labels?.length) return null;
  return <div className="mt-2 flex flex-wrap gap-1">{labels.map((l) => <span key={l} className="rounded-full border px-2 py-0.5 text-[11px] text-muted-foreground">{l}</span>)}</div>;
}
