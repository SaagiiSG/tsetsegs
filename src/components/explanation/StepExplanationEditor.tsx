import { useEffect, useRef, useState, type DragEvent } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { ArrowDown, ArrowUp, Calculator, ImagePlus, Lightbulb, Loader2, Plus, Trash2 } from 'lucide-react';
import { ExplanationBlock, parseExplanation, serializeExplanation } from '@/lib/explanationFormat';
import { ExplanationView } from './ExplanationView';
import { DesmosCalculator, toggleCalculator } from '@/components/student/DesmosCalculator';

interface Props {
  value: string;
  onChange: (v: string) => void;
}

/** Math shortcuts: same typing system as questions ($...$ for KaTeX, or x^2 / √ shorthand). */
const MATH_KEYS: Array<{ label: string; insert: string; caret?: number }> = [
  { label: '$x$', insert: '$$', caret: 1 },
  { label: 'a/b', insert: '$\\frac{}{}$', caret: 7 },
  { label: '√', insert: '$\\sqrt{}$', caret: 7 },
  { label: 'x²', insert: '^2' },
  { label: 'xⁿ', insert: '^{}', caret: 2 },
  { label: '≤', insert: '≤' },
  { label: '≥', insert: '≥' },
  { label: '≠', insert: '≠' },
  { label: '±', insert: '±' },
  { label: '×', insert: '×' },
  { label: 'π', insert: 'π' },
  { label: '°', insert: '°' },
  { label: '\\$', insert: '\\$' },
];

const blank = (kind: ExplanationBlock['kind'] = 'step'): ExplanationBlock => ({ kind, title: '', body: '' });

export function StepExplanationEditor({ value, onChange }: Props) {
  const { toast } = useToast();
  const [blocks, setBlocks] = useState<ExplanationBlock[]>(() => {
    const p = parseExplanation(value);
    return p.length ? p : [blank()];
  });
  const [uploading, setUploading] = useState<number | null>(null);
  // Which step a picture is currently hovering over, so the card can light up.
  const [dropTarget, setDropTarget] = useState<number | null>(null);
  const areas = useRef<Record<number, HTMLTextAreaElement | null>>({});
  const lastFocus = useRef(0);
  const lastEmitted = useRef(value);
  const blocksRef = useRef(blocks);
  const dragDepth = useRef<Record<number, number>>({});

  // Re-sync when the form loads a different question.
  useEffect(() => {
    if (value !== lastEmitted.current) {
      const p = parseExplanation(value);
      const next = p.length ? p : [blank()];
      blocksRef.current = next;
      setBlocks(next);
      lastEmitted.current = value;
    }
  }, [value]);

  const commit = (next: ExplanationBlock[] | ((prev: ExplanationBlock[]) => ExplanationBlock[])) => {
    const resolved = typeof next === 'function' ? next(blocksRef.current) : next;
    blocksRef.current = resolved;
    setBlocks(resolved);
    const s = serializeExplanation(resolved);
    lastEmitted.current = s;
    onChange(s);
  };
  const update = (i: number, patch: Partial<ExplanationBlock>) =>
    commit((prev) => prev.map((b, j) => (j === i ? { ...b, ...patch } : b)));

  /** Adds a picture to a step: at the cursor when known, otherwise at the end. */
  const addPicture = (i: number, url: string, at: number | null) =>
    commit((prev) =>
      prev.map((b, j) => {
        if (j !== i) return b;
        const pos = at ?? b.body.length;
        const before = b.body.slice(0, pos);
        const line = `${before && !before.endsWith('\n') ? '\n' : ''}![](${url})\n`;
        return { ...b, body: before + line + b.body.slice(pos) };
      })
    );

  const insertAt = (i: number, text: string, caret?: number) => {
    const el = areas.current[i];
    const body = blocks[i].body;
    const start = el?.selectionStart ?? body.length;
    const end = el?.selectionEnd ?? body.length;
    update(i, { body: body.slice(0, start) + text + body.slice(end) });
    requestAnimationFrame(() => {
      if (!el) return;
      el.focus();
      const pos = start + (caret ?? text.length);
      el.setSelectionRange(pos, pos);
    });
  };

  const uploadImage = async (i: number, file: File, at: number | null) => {
    if (!file.type.startsWith('image/')) return;
    if (file.size > 8 * 1024 * 1024) {
      toast({ title: 'Picture too large', description: 'Please use a picture under 8 MB.', variant: 'destructive' });
      return;
    }
    setUploading(i);
    try {
      const ext = (file.name.split('.').pop() || 'png').toLowerCase();
      const path = `explanations/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error } = await supabase.storage.from('question-images').upload(path, file, { contentType: file.type });
      if (error) throw error;
      const { data } = supabase.storage.from('question-images').getPublicUrl(path);
      addPicture(i, data.publicUrl, at);
    } catch (e: any) {
      toast({ title: 'Upload failed', description: e?.message ?? 'Try again', variant: 'destructive' });
    } finally {
      setUploading(null);
    }
  };

  /** One picture or many — each lands in the step it was dropped on. */
  const uploadPictures = async (i: number, files: File[]) => {
    const at = files.length === 1 ? areas.current[i]?.selectionStart ?? null : null;
    for (const f of files) await uploadImage(i, f, at);
  };

  const hasFiles = (e: DragEvent) => Array.from(e.dataTransfer.types).includes('Files');

  const onDragEnter = (i: number) => (e: DragEvent) => {
    if (!hasFiles(e)) return;
    e.preventDefault();
    dragDepth.current[i] = (dragDepth.current[i] ?? 0) + 1;
    setDropTarget(i);
  };

  const onDragOver = (i: number) => (e: DragEvent) => {
    if (!hasFiles(e)) return;
    // Without this the browser never fires drop — it opens the picture instead.
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    setDropTarget(i);
  };

  const onDragLeave = (i: number) => (e: DragEvent) => {
    if (!hasFiles(e)) return;
    dragDepth.current[i] = Math.max(0, (dragDepth.current[i] ?? 1) - 1);
    if (!dragDepth.current[i]) setDropTarget((t) => (t === i ? null : t));
  };

  const onDropStep = (i: number) => (e: DragEvent) => {
    if (!hasFiles(e)) return;
    e.preventDefault();
    dragDepth.current[i] = 0;
    setDropTarget(null);
    const files = Array.from(e.dataTransfer.files).filter((f) => f.type.startsWith('image/'));
    if (!files.length) {
      toast({ title: 'Only pictures', description: 'Drop a PNG or JPG photo here.', variant: 'destructive' });
      return;
    }
    uploadPictures(i, files);
  };

  const move = (i: number, d: -1 | 1) => {
    const j = i + d;
    if (j < 0 || j >= blocks.length) return;
    const next = [...blocks];
    [next[i], next[j]] = [next[j], next[i]];
    commit(next);
  };

  let stepNo = 0;
  const serialized = serializeExplanation(blocks);

  return (
    <div className="space-y-3">
      <div className="sticky top-0 z-10 flex flex-wrap gap-1 rounded-md border bg-background p-1.5">
        {MATH_KEYS.map((k) => (
          <Button
            key={k.label}
            type="button"
            size="sm"
            variant="ghost"
            className="h-7 px-2 font-mono text-xs"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => insertAt(lastFocus.current, k.insert, k.caret)}
          >
            {k.label}
          </Button>
        ))}
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="ml-auto h-7 gap-1 px-2 text-xs"
          onClick={toggleCalculator}
          title="Open the graphing calculator — drag it to either screen edge to snap it, then screenshot your graph and paste it into a step"
        >
          <Calculator className="h-3.5 w-3.5" /> Calculator
        </Button>
      </div>
      <DesmosCalculator />

      {blocks.map((b, i) => {
        const num = b.kind === 'step' ? ++stepNo : null;
        return (
          <div key={i} className="space-y-2 rounded-lg border p-3">
            <div className="flex items-center gap-2">
              {b.kind === 'intro' ? (
                <span className="text-xs font-medium text-muted-foreground">Intro</span>
              ) : num !== null ? (
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary font-mono text-xs text-primary-foreground">
                  {num}
                </span>
              ) : (
                <Lightbulb className="h-4 w-4 text-primary" />
              )}
              {b.kind !== 'intro' && (
                <Input
                  value={b.title}
                  onChange={(e) => update(i, { title: e.target.value })}
                  placeholder={num !== null ? 'Step title (e.g. Set up the equation)' : 'Shortcut title (e.g. Use Desmos)'}
                  className="h-8"
                />
              )}
              <div className="ml-auto flex shrink-0">
                <Button type="button" size="icon" variant="ghost" className="h-7 w-7" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Move up">
                  <ArrowUp className="h-3.5 w-3.5" />
                </Button>
                <Button type="button" size="icon" variant="ghost" className="h-7 w-7" onClick={() => move(i, 1)} disabled={i === blocks.length - 1} aria-label="Move down">
                  <ArrowDown className="h-3.5 w-3.5" />
                </Button>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7"
                  onClick={() => commit(blocks.length > 1 ? blocks.filter((_, j) => j !== i) : [blank()])}
                  aria-label="Delete step"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
            <Textarea
              ref={(el) => (areas.current[i] = el)}
              value={b.body}
              onFocus={() => (lastFocus.current = i)}
              onChange={(e) => update(i, { body: e.target.value })}
              onPaste={(e) => {
                const file = Array.from(e.clipboardData.files).find((f) => f.type.startsWith('image/'));
                if (file) {
                  e.preventDefault();
                  uploadImage(i, file);
                }
              }}
              onDrop={(e) => {
                const file = Array.from(e.dataTransfer.files).find((f) => f.type.startsWith('image/'));
                if (file) {
                  e.preventDefault();
                  uploadImage(i, file);
                }
              }}
              placeholder="Type the explanation. Use $\frac{1}{2}$ or x^2, √3. Paste or drop a Desmos screenshot / handwritten photo."
              className="min-h-[80px] font-mono text-sm"
            />
            <label className="inline-flex cursor-pointer items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
              {uploading === i ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ImagePlus className="h-3.5 w-3.5" />}
              Add picture
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) uploadImage(i, f);
                  e.target.value = '';
                }}
              />
            </label>
          </div>
        );
      })}

      <div className="flex gap-2">
        <Button type="button" size="sm" variant="outline" onClick={() => commit([...blocks, blank('step')])}>
          <Plus className="mr-1 h-3.5 w-3.5" /> Add step
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={() => commit([...blocks, blank('shortcut')])}>
          <Lightbulb className="mr-1 h-3.5 w-3.5" /> Add shortcut
        </Button>
      </div>

      {serialized.trim() && (
        <div className="rounded-lg border border-dashed p-3">
          <p className="mb-2 text-xs font-medium text-muted-foreground">Student preview</p>
          <ExplanationView text={serialized} />
        </div>
      )}
    </div>
  );
}
