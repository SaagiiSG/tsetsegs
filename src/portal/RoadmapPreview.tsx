import { Check, Play, Lock } from 'lucide-react';

export function RoadmapPreview({ videoIds, completed }: { videoIds: string[]; completed: string[] }) {
  const done = new Set(completed);
  const current = videoIds.findIndex(id => !done.has(id));
  const start = Math.max(0, current - 2);
  const visible = videoIds.slice(start, start + 5);
  if (!visible.length) return null;
  return <div aria-label="Your video roadmap progress" className="relative h-36 overflow-hidden mt-4">
    <svg aria-hidden viewBox="0 0 240 140" className="absolute inset-0 w-full h-full fill-none stroke-border" strokeWidth="3"><path d="M32 98 C45 98 44 48 78 48 S115 105 124 105 S147 36 174 36 S198 80 216 80" strokeDasharray="5 5"/></svg>
    <div className="absolute inset-0 grid grid-cols-5 items-center px-2">{visible.map((id, i) => {
      const complete = done.has(id), active = start + i === current;
      const Icon = complete ? Check : active ? Play : Lock;
      return <div key={id} className={`flex justify-center ${i % 2 === 0 ? 'translate-y-6' : '-translate-y-5'}`}><span className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${complete ? 'bg-foreground text-background border-foreground' : active ? 'bg-background text-foreground border-foreground ring-4 ring-foreground/10' : 'bg-muted text-muted-foreground border-border'}`}><Icon className="h-4 w-4"/></span></div>;
    })}</div>
  </div>;
}