import { useEffect, useState } from 'react';
import { ArrowDown, ArrowUp, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import type { ConceptVideo } from '@/lib/conceptVideos';

/** Admin editor for the student roadmap: one global order; consecutive videos with the same module form a unit. */
export function RoadmapOrderDialog({ open, onOpenChange, videos, onSaved }: { open: boolean; onOpenChange: (o: boolean) => void; videos: ConceptVideo[]; onSaved: () => void }) {
  const [list, setList] = useState<ConceptVideo[]>([]);
  const [saving, setSaving] = useState(false);
  useEffect(() => { if (open) setList([...videos].sort((a, b) => a.order_index - b.order_index)); }, [open, videos]);
  const move = (i: number, d: number) => setList(l => { const n = [...l]; const j = i + d; if (j < 0 || j >= n.length) return l; [n[i], n[j]] = [n[j], n[i]]; return n; });
  const save = async () => {
    setSaving(true);
    await Promise.all(list.map((v, i) => v.order_index === i + 1 ? null : supabase.from('concept_videos').update({ order_index: i + 1 }).eq('id', v.id)));
    setSaving(false); onSaved(); onOpenChange(false);
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Student roadmap</DialogTitle>
          <DialogDescription>Students watch top to bottom; each lesson unlocks the next. Videos next to each other with the same module become one unit. Drafts are hidden from students.</DialogDescription>
        </DialogHeader>
        <ol className="space-y-1.5">
          {list.map((v, i) => {
            const newUnit = i === 0 || (list[i - 1].module || list[i - 1].domain) !== (v.module || v.domain);
            return (
              <li key={v.id}>
                {newUnit && <p className="text-[11px] uppercase tracking-wide text-muted-foreground mt-3 mb-1">{v.module || v.domain}</p>}
                <div className="flex items-center gap-2 rounded-xl border p-2">
                  <span className="w-6 font-mono text-xs text-muted-foreground">{i + 1}</span>
                  <p className={`flex-1 truncate text-sm ${v.is_published ? '' : 'text-muted-foreground'}`}>{v.title}{!v.is_published && ' (draft)'}</p>
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Move up"><ArrowUp className="h-3.5 w-3.5" /></Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => move(i, 1)} disabled={i === list.length - 1} aria-label="Move down"><ArrowDown className="h-3.5 w-3.5" /></Button>
                </div>
              </li>
            );
          })}
        </ol>
        <DialogFooter><Button onClick={save} disabled={saving}>{saving && <Loader2 className="h-4 w-4 animate-spin" />}Save order</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
