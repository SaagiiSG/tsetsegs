import { useEffect, useRef, useState } from 'react';
import { Droplet, StickyNote, Trash2 } from 'lucide-react';
import { MathText } from '@/components/MathText';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Textarea } from '@/components/ui/textarea';
import { addHighlight, highlightAt, highlightKey, readLocal, writeLocal, type Highlight as Mark } from '@/lib/bluebookTest';
import { cn } from '@/lib/utils';

// shortcut: no CSS Custom Highlight API (Safari < 17.2, Firefox < 140) means no highlights; wrap text nodes in <mark> if students hit it.
export const canHighlight = () => typeof CSS !== 'undefined' && 'highlights' in CSS;

const PAINTS = ['bb-yellow', 'bb-blue', 'bb-pink', 'bb-u-solid', 'bb-u-dashed', 'bb-u-dotted'];
const SWATCH: Record<Mark['color'], string> = { yellow: '#FCD400', blue: '#E2F2FC', pink: '#FCDFF5' };
const LINE: Record<Mark['underline'], string> = { none: '', solid: 'underline decoration-solid', dashed: 'underline decoration-dashed', dotted: 'underline decoration-dotted' };

/** Offsets count every text node under the root, the same set the TreeWalker below walks. */
function offsetOf(root: Node, node: Node, offset: number) {
  const r = document.createRange();
  r.setStart(root, 0);
  r.setEnd(node, offset);
  return r.toString().length;
}

function rangeFor(root: Node, start: number, end: number): Range | null {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const r = document.createRange();
  let pos = 0;
  let started = false;
  for (let n = walker.nextNode() as Text | null; n; n = walker.nextNode() as Text | null) {
    const len = n.data.length;
    if (!started && start < pos + len) { r.setStart(n, start - pos); started = true; }
    if (started && end <= pos + len) { r.setEnd(n, end - pos); return r; }
    pos += len;
  }
  return null;
}

function caretOffset(root: Node, x: number, y: number): number | null {
  const doc = document as Document & { caretPositionFromPoint?(x: number, y: number): { offsetNode: Node; offset: number } | null };
  const pos = doc.caretPositionFromPoint?.(x, y);
  if (pos) return root.contains(pos.offsetNode) ? offsetOf(root, pos.offsetNode, pos.offset) : null;
  const r = document.caretRangeFromPoint?.(x, y);
  return r && root.contains(r.startContainer) ? offsetOf(root, r.startContainer, r.startOffset) : null;
}

/** Bluebook's highlight toolbar: colour, underline style, delete, and a note. */
function Toolbar({ mark, onChange, onDelete }: { mark: Mark; onChange(patch: Partial<Mark>): void; onDelete(): void }) {
  const [noteOpen, setNoteOpen] = useState(!!mark.note);
  const btn = 'bb-focus grid h-[34px] w-[34px] place-items-center rounded-full';
  return (
    <div data-bb-toolbar className="w-max" onMouseDown={e => e.stopPropagation()}>
      <div className="flex items-center gap-2 rounded-full bg-white px-2 py-1.5 shadow-[0_2px_10px_rgba(0,0,0,.25)]">
        {(['yellow', 'blue', 'pink'] as const).map(c => (
          <button key={c} type="button" aria-label={`Highlight ${c}`} aria-pressed={mark.color === c} onClick={() => onChange({ color: c })}
            className={cn(btn, 'border border-[#9a9a9a]', mark.color === c && 'border-2 border-[var(--bb-ink)]')} style={{ background: SWATCH[c] }}>
            {mark.color === c && <Droplet className="h-4 w-4" />}
          </button>
        ))}
        <DropdownMenu>
          <DropdownMenuTrigger aria-label="Underline style" className={cn(btn, 'flex-col gap-0 text-[14px] font-bold leading-none')}>
            <span className={cn(LINE[mark.underline], 'underline-offset-4')}>U</span>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="bluebook min-w-0 rounded-md border-0 bg-white p-1 shadow-[0_2px_10px_rgba(0,0,0,.25)]">
            {(['solid', 'dashed', 'dotted', 'none'] as const).map(u => (
              <DropdownMenuItem key={u} onSelect={() => onChange({ underline: u })} aria-label={`Underline ${u}`} className="justify-center px-3 py-1.5 text-[15px]">
                {u === 'none' ? 'None' : <span className={cn('font-bold underline-offset-4', LINE[u])}>U</span>}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        <button type="button" aria-label="Delete highlight" onClick={onDelete} className={cn(btn, 'border border-[var(--bb-ink)]')}><Trash2 className="h-4 w-4" /></button>
        <span aria-hidden className="h-6 w-px bg-[#c4c4c4]" />
        <button type="button" aria-label="Add a note" aria-pressed={noteOpen} onClick={() => setNoteOpen(o => !o)} className={cn(btn, 'border border-[var(--bb-ink)]')}>
          <StickyNote className="h-4 w-4 fill-[#FCD400]" />
        </button>
      </div>
      {noteOpen && (
        <Textarea
          autoFocus aria-label="Note" defaultValue={mark.note} placeholder="Add a note"
          // Saved on every keystroke: a click elsewhere closes the toolbar before a blur would fire.
          onChange={e => onChange({ note: e.target.value })}
          className="bb-serif mt-2 h-24 w-[300px] resize-none rounded-md border border-[#9a9a9a] bg-white text-[15px] shadow-[0_2px_10px_rgba(0,0,0,.2)]"
        />
      )}
    </div>
  );
}

/** The Reading & Writing passage, left of the question, with Bluebook's highlights and notes. */
export function Passage({ text, attemptId, questionId, highlightMode }: { text: string; attemptId: string; questionId: string; highlightMode: boolean }) {
  const key = highlightKey(attemptId, questionId);
  const [marks, setMarks] = useState<Mark[]>(() => readLocal<Mark[]>(key, []));
  const [open, setOpen] = useState<number | null>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const wrap = useRef<HTMLDivElement>(null);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => { setMarks(readLocal<Mark[]>(key, [])); setOpen(null); }, [key]);
  const save = (next: Mark[]) => { setMarks(next); writeLocal(key, next); };

  // Paint with the Custom Highlight API, so the passage DOM (and MathText's KaTeX) is never rewritten.
  useEffect(() => {
    if (!canHighlight() || !root.current) return;
    const groups: Record<string, Range[]> = Object.fromEntries(PAINTS.map(p => [p, []]));
    for (const m of marks) {
      const r = rangeFor(root.current, m.start, m.end);
      if (!r) continue;
      groups[`bb-${m.color}`].push(r);
      if (m.underline !== 'none') groups[`bb-u-${m.underline}`].push(r);
    }
    for (const p of PAINTS) CSS.highlights.set(p, new Highlight(...groups[p]));
    return () => { for (const p of PAINTS) CSS.highlights.delete(p); };
  }, [marks, text]);

  // Place the toolbar just above the open highlight.
  useEffect(() => {
    if (open === null || !marks[open] || !root.current || !wrap.current) { setPos(null); return; }
    const rect = rangeFor(root.current, marks[open].start, marks[open].end)?.getClientRects()[0];
    if (!rect) return;
    const box = wrap.current.getBoundingClientRect();
    // Above the highlight when the pane has room, else just below it (the pane clips anything above its top).
    const above = rect.top - box.top - 54;
    setPos({ top: above >= -24 ? above : rect.bottom - box.top + 8, left: Math.max(0, Math.min(rect.left - box.left, box.width - 300)) });
  }, [open, marks]);

  // A click anywhere else closes the toolbar.
  useEffect(() => {
    if (open === null) return;
    const close = (e: MouseEvent) => { if (!(e.target as Element).closest?.('[data-bb-toolbar], [role=menu]')) setOpen(null); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  const onPointerUp = (e: React.MouseEvent | React.TouchEvent) => {
    if (!canHighlight() || !root.current) return;
    const sel = window.getSelection();
    if (highlightMode && sel && !sel.isCollapsed && root.current.contains(sel.anchorNode) && root.current.contains(sel.focusNode)) {
      const r = sel.getRangeAt(0);
      const start = offsetOf(root.current, r.startContainer, r.startOffset);
      const end = offsetOf(root.current, r.endContainer, r.endOffset);
      sel.removeAllRanges();
      if (end <= start) return;
      const next = addHighlight(marks, start, end);
      save(next);
      setOpen(highlightAt(next, start));
      return;
    }
    if ('clientX' in e) {
      const at = caretOffset(root.current, e.clientX, e.clientY);
      const i = at === null ? -1 : highlightAt(marks, at);
      setOpen(i >= 0 ? i : null);
    }
  };

  const mark = open !== null ? marks[open] : null;
  return (
    <div ref={wrap} className="relative">
      <div ref={root} onMouseUp={onPointerUp} onTouchEnd={onPointerUp}
        className={cn('bb-serif text-[16px] leading-[1.5]', highlightMode && 'cursor-text selection:bg-[#FCD400]/70')}>
        <MathText text={text} />
      </div>
      {mark && pos && (
        <div className="absolute z-20" style={{ top: pos.top, left: pos.left }}>
          <Toolbar key={`${open}-${mark.start}`} mark={mark}
            onChange={patch => save(marks.map((m, i) => (i === open ? { ...m, ...patch } : m)))}
            onDelete={() => { save(marks.filter((_, i) => i !== open)); setOpen(null); }} />
        </div>
      )}
    </div>
  );
}

const LINE_PX = 24; // 16px text at 1.5 line height

/**
 * Bluebook's Line Reader: dims the screen except a three-line band that follows the pointer.
 * ↑/↓ move it a line, Esc closes it. It never takes clicks, so the test stays usable underneath.
 */
export function LineReader({ onClose }: { onClose(): void }) {
  const [y, setY] = useState(() => (typeof window === 'undefined' ? 300 : window.innerHeight / 2));
  useEffect(() => {
    const move = (e: PointerEvent) => setY(e.clientY);
    const key = (e: KeyboardEvent) => {
      // Typing, menus, dialogs and the calculator keep their own keys; Esc closes an open menu or dialog first.
      if ((e.target as Element).closest?.('input, textarea, [contenteditable], [role=menu], [role=dialog], .dcg-container')) return;
      if (e.key === 'Escape') { if (!document.querySelector('[role=menu], [role=dialog]')) onClose(); }
      else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        // Caught first (capture) so the focused More button doesn't reopen its menu on ↓.
        e.preventDefault();
        e.stopPropagation();
        setY(v => Math.min(window.innerHeight, Math.max(0, v + (e.key === 'ArrowUp' ? -LINE_PX : LINE_PX))));
      }
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('keydown', key, true);
    return () => { window.removeEventListener('pointermove', move); window.removeEventListener('keydown', key, true); };
  }, [onClose]);
  const half = (LINE_PX * 3) / 2;
  return (
    <div data-bb-line-reader aria-hidden className="pointer-events-none fixed inset-0 z-[45]">
      <div className="absolute inset-x-0 top-0 bg-black/55" style={{ height: Math.max(0, y - half) }} />
      <div className="absolute inset-x-0 bottom-0 bg-black/55" style={{ top: y + half }} />
    </div>
  );
}
