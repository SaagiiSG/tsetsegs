import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Pencil, Plus, Trash2, Upload, PlayCircle } from 'lucide-react';
import { CONCEPT_DOMAINS, ConceptVideo, STORAGE_PREFIX } from '@/lib/conceptVideos';
import { ConceptVideoPlayer } from '@/components/concept-videos/ConceptVideoPlayer';

type Draft = Omit<ConceptVideo, 'id'> & { id?: string };
const empty: Draft = {
  title: '', description: '', domain: CONCEPT_DOMAINS[0], module: '', video_url: '',
  duration_minutes: null, order_index: 0, is_published: false,
};

export default function ConceptVideosAdmin() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [uploadPct, setUploadPct] = useState<number | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const { data: videos = [], isLoading } = useQuery({
    queryKey: ['concept-videos-admin'],
    queryFn: async () => {
      const { data, error } = await supabase.from('concept_videos').select('*').order('domain').order('order_index');
      if (error) throw error;
      return data as ConceptVideo[];
    },
  });

  const save = useMutation({
    mutationFn: async (d: Draft) => {
      const row = {
        title: d.title.trim(), description: d.description?.trim() || null, domain: d.domain,
        module: d.module?.trim() || null, video_url: d.video_url.trim(),
        duration_minutes: d.duration_minutes || null, order_index: d.order_index || 0, is_published: d.is_published,
      };
      const q = d.id
        ? supabase.from('concept_videos').update({ ...row, updated_at: new Date().toISOString() }).eq('id', d.id)
        : supabase.from('concept_videos').insert(row);
      const { error } = await q;
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['concept-videos-admin'] });
      qc.invalidateQueries({ queryKey: ['concept-videos'] });
      setDraft(null);
      toast({ title: 'Video saved' });
    },
    onError: (e: any) => toast({ title: 'Could not save', description: e.message, variant: 'destructive' }),
  });

  const remove = useMutation({
    mutationFn: async (v: ConceptVideo) => {
      const { error } = await supabase.from('concept_videos').delete().eq('id', v.id);
      if (error) throw error;
      if (v.video_url.startsWith(STORAGE_PREFIX)) {
        await supabase.storage.from('concept-videos').remove([v.video_url.slice(STORAGE_PREFIX.length)]);
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['concept-videos-admin'] }),
  });

  const togglePublish = async (v: ConceptVideo) => {
    await supabase.from('concept_videos').update({ is_published: !v.is_published }).eq('id', v.id);
    qc.invalidateQueries({ queryKey: ['concept-videos-admin'] });
  };

  const uploadFile = async (file: File) => {
    if (!draft) return;
    setUploadPct(5);
    const ext = (file.name.split('.').pop() || 'mp4').toLowerCase();
    const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const tick = setInterval(() => setUploadPct((p) => (p !== null && p < 90 ? p + 3 : p)), 800);
    const { error } = await supabase.storage.from('concept-videos').upload(path, file, { contentType: file.type });
    clearInterval(tick);
    setUploadPct(null);
    if (error) {
      toast({ title: 'Upload failed', description: error.message, variant: 'destructive' });
      return;
    }
    // Read duration from the file when possible.
    const url = URL.createObjectURL(file);
    const el = document.createElement('video');
    el.preload = 'metadata';
    el.onloadedmetadata = () => {
      setDraft((d) => (d ? { ...d, duration_minutes: d.duration_minutes || Math.max(1, Math.round(el.duration / 60)) } : d));
      URL.revokeObjectURL(url);
    };
    el.src = url;
    setDraft((d) => (d ? { ...d, video_url: STORAGE_PREFIX + path, title: d.title || file.name.replace(/\.[^.]+$/, '') } : d));
  };

  const grouped = CONCEPT_DOMAINS.map((dom) => ({ dom, list: videos.filter((v) => v.domain === dom) }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Concept Videos</h1>
          <p className="text-sm text-muted-foreground">Short math concept lessons, grouped by topic. Students only see published videos.</p>
        </div>
        <Button onClick={() => setDraft({ ...empty, order_index: videos.length + 1 })}>
          <Plus className="mr-1 h-4 w-4" /> Add video
        </Button>
      </div>

      {isLoading ? (
        <Loader2 className="h-5 w-5 animate-spin" />
      ) : (
        grouped.map(({ dom, list }) => (
          <section key={dom} className="space-y-2">
            <h2 className="text-sm font-semibold text-muted-foreground">{dom} <span className="font-mono">({list.length})</span></h2>
            {list.length === 0 ? (
              <p className="text-xs text-muted-foreground">No videos yet.</p>
            ) : (
              <div className="space-y-2">
                {list.map((v) => (
                  <Card key={v.id}>
                    <CardContent className="flex flex-wrap items-center gap-3 p-3">
                      <span className="w-8 font-mono text-xs text-muted-foreground">#{v.order_index}</span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">{v.title}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {v.module || 'No module'} · {v.duration_minutes ? `${v.duration_minutes} min` : '—'} · {v.video_url.startsWith(STORAGE_PREFIX) ? 'Uploaded file' : 'Link'}
                        </p>
                      </div>
                      <Badge variant={v.is_published ? 'default' : 'secondary'}>{v.is_published ? 'Published' : 'Draft'}</Badge>
                      <Switch checked={v.is_published} onCheckedChange={() => togglePublish(v)} aria-label="Published" />
                      <Button size="icon" variant="ghost" onClick={() => setPreview(v.video_url)} aria-label="Preview"><PlayCircle className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost" onClick={() => setDraft(v)} aria-label="Edit"><Pencil className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost" onClick={() => confirm(`Delete "${v.title}"?`) && remove.mutate(v)} aria-label="Delete"><Trash2 className="h-4 w-4" /></Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </section>
        ))
      )}

      <Dialog open={!!draft} onOpenChange={(o) => !o && uploadPct === null && setDraft(null)}>
        <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
          <DialogHeader><DialogTitle>{draft?.id ? 'Edit video' : 'Add video'}</DialogTitle></DialogHeader>
          {draft && (
            <div className="space-y-3">
              <div className="space-y-1">
                <Label>Video</Label>
                <div className="flex gap-2">
                  <Input
                    value={draft.video_url.startsWith(STORAGE_PREFIX) ? 'Uploaded file ✓' : draft.video_url}
                    readOnly={draft.video_url.startsWith(STORAGE_PREFIX)}
                    onChange={(e) => setDraft({ ...draft, video_url: e.target.value })}
                    placeholder="Paste a YouTube link, or upload"
                  />
                  <Button asChild variant="outline" disabled={uploadPct !== null}>
                    <label className="cursor-pointer">
                      <Upload className="mr-1 h-4 w-4" /> Upload
                      <input type="file" accept="video/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadFile(f); e.target.value = ''; }} />
                    </label>
                  </Button>
                </div>
                {draft.video_url.startsWith(STORAGE_PREFIX) && (
                  <button type="button" className="text-xs text-muted-foreground underline" onClick={() => setDraft({ ...draft, video_url: '' })}>Use a link instead</button>
                )}
                {uploadPct !== null && <Progress value={uploadPct} className="h-1.5" />}
              </div>
              <div className="space-y-1"><Label>Title</Label><Input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} placeholder="Completing the square" /></div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label>Topic</Label>
                  <Select value={draft.domain} onValueChange={(v) => setDraft({ ...draft, domain: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{CONCEPT_DOMAINS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1"><Label>Module</Label><Input value={draft.module ?? ''} onChange={(e) => setDraft({ ...draft, module: e.target.value })} placeholder="Quadratics" /></div>
                <div className="space-y-1"><Label>Order</Label><Input type="number" value={draft.order_index} onChange={(e) => setDraft({ ...draft, order_index: Number(e.target.value) })} /></div>
                <div className="space-y-1"><Label>Minutes</Label><Input type="number" value={draft.duration_minutes ?? ''} onChange={(e) => setDraft({ ...draft, duration_minutes: e.target.value ? Number(e.target.value) : null })} /></div>
              </div>
              <div className="space-y-1"><Label>Description</Label><Textarea value={draft.description ?? ''} onChange={(e) => setDraft({ ...draft, description: e.target.value })} className="min-h-[60px]" /></div>
              <div className="flex items-center gap-2"><Switch checked={draft.is_published} onCheckedChange={(c) => setDraft({ ...draft, is_published: c })} /><Label>Visible to students</Label></div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDraft(null)} disabled={uploadPct !== null}>Cancel</Button>
            <Button
              onClick={() => draft && save.mutate(draft)}
              disabled={!draft?.title.trim() || !draft?.video_url.trim() || uploadPct !== null || save.isPending}
            >
              {save.isPending && <Loader2 className="mr-1 h-4 w-4 animate-spin" />} Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!preview} onOpenChange={(o) => !o && setPreview(null)}>
        <DialogContent className="max-w-3xl">{preview && <ConceptVideoPlayer url={preview} />}</DialogContent>
      </Dialog>
    </div>
  );
}
