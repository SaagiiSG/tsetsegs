import { useState, type ReactNode } from 'react';
import { Maximize, Maximize2, Minimize2, X, ZoomIn, ZoomOut } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { nextZoom } from '@/lib/bluebookTest';
import { cn } from '@/lib/utils';
import referenceSheetImage from '@/assets/sat-reference-sheet.jpg';

const toolBtn = 'bb-focus grid h-7 min-w-7 place-items-center rounded px-1 hover:bg-black/5 [&_svg]:h-[18px] [&_svg]:w-[18px]';

/** Bluebook's figure toolbar: zoom in/out in 25% steps, Reset, and full screen. */
export function FigureZoom({ children }: { children: ReactNode }) {
  const [zoom, setZoom] = useState(100);
  const [full, setFull] = useState(false);
  return (
    <div className="mx-auto mb-6 w-fit max-w-full overflow-hidden rounded-[4px] border border-[#b8b8b8] bg-white">
      <div className="flex items-center justify-end gap-2 border-b border-[#b8b8b8] bg-[#ececec] px-3 py-0.5 text-[14px]">
        <button type="button" className={toolBtn} aria-label="Zoom in" onClick={() => setZoom(z => nextZoom(z, 1))}><ZoomIn /></button>
        <button type="button" className={toolBtn} aria-label="Zoom out" onClick={() => setZoom(z => nextZoom(z, -1))}><ZoomOut /></button>
        <span className="w-11 text-center tabular-nums">{zoom}%</span>
        <button type="button" className={cn(toolBtn, 'text-[15px]')} onClick={() => setZoom(100)}>Reset</button>
        <span aria-hidden className="mx-1 h-5 w-px bg-[#8c8c8c]" />
        <button type="button" className={toolBtn} aria-label="Full screen" onClick={() => setFull(true)}><Maximize /></button>
      </div>
      {/* `zoom` (not transform) so the zoomed figure scrolls inside the box. */}
      <div className="max-h-[60vh] overflow-auto">
        <div style={{ zoom: zoom / 100 }}>{children}</div>
      </div>
      <Dialog open={full} onOpenChange={setFull}>
        <DialogContent className="bluebook max-h-[92dvh] w-[min(96vw,1100px)] max-w-none overflow-auto rounded-lg bg-white p-6 pt-12">
          <DialogTitle className="sr-only">Figure</DialogTitle>
          {children}
        </DialogContent>
      </Dialog>
    </div>
  );
}

/** Reference sheet as Bluebook's right-hand panel. It sits over the page, it doesn't push it. */
export function ReferencePanel({ open, onClose }: { open: boolean; onClose(): void }) {
  const [wide, setWide] = useState(false);
  if (!open) return null;
  return (
    <aside aria-label="Reference" className={cn(
      'absolute inset-y-0 right-0 z-30 flex w-full flex-col border-l border-[#9a9a9a] bg-white shadow-[-2px_0_10px_rgba(0,0,0,.12)] md:w-[480px]',
      wide && 'md:w-[60vw]',
    )}>
      <div className="flex h-[44px] shrink-0 items-center gap-4 bg-[var(--bb-ink)] px-4 text-white [&_svg]:h-5 [&_svg]:w-5">
        <h2 className="text-[18px] font-bold">Reference</h2>
        <button type="button" className="bb-focus ml-auto hidden rounded p-1 md:block" aria-label={wide ? 'Collapse' : 'Expand'} onClick={() => setWide(w => !w)}>
          {wide ? <Minimize2 /> : <Maximize2 />}
        </button>
        <button type="button" className="bb-focus ml-auto rounded p-1 md:ml-0" aria-label="Close reference" onClick={onClose}><X /></button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        <img src={referenceSheetImage} alt="SAT Math Reference Sheet" className="mx-auto w-full max-w-[720px]" />
      </div>
    </aside>
  );
}
