import { useState } from 'react';
import { MathText } from '@/components/MathText';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Lightbulb } from 'lucide-react';
import { parseExplanation, splitBody } from '@/lib/explanationFormat';
import { cn } from '@/lib/utils';

interface Props {
  text: string | null | undefined;
  className?: string;
}

/** Renders a step-by-step explanation (or a legacy plain rationale) for students and staff. */
export function ExplanationView({ text, className }: Props) {
  const [zoom, setZoom] = useState<string | null>(null);
  const blocks = parseExplanation(text);
  if (blocks.length === 0) return null;
  let stepNo = 0;

  return (
    <div className={cn('space-y-3 text-sm leading-relaxed', className)}>
      {blocks.map((b, i) => {
        const num = b.kind === 'step' ? ++stepNo : null;
        const parts = splitBody(b.body);
        return (
          <div
            key={i}
            className={cn(
              b.kind === 'intro' ? '' : 'rounded-lg border p-3',
              b.kind === 'shortcut' && 'border-primary/40 bg-primary/5',
            )}
          >
            {b.kind !== 'intro' && (
              <div className="mb-2 flex items-center gap-2">
                {num !== null ? (
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary font-mono text-xs font-semibold text-primary-foreground">
                    {num}
                  </span>
                ) : (
                  <Lightbulb className="h-4 w-4 shrink-0 text-primary" />
                )}
                <span className="font-semibold text-foreground">
                  {b.title ? <MathText text={b.title} /> : num !== null ? `Step ${num}` : 'Shortcut'}
                </span>
              </div>
            )}
            {(() => {
              const images = parts.filter((p) => p.type === 'image');
              const texts = parts.filter((p) => p.type !== 'image');
              if (images.length === 0) {
                return (
                  <div className="space-y-2 text-muted-foreground">
                    {texts.map((p, j) => (
                      <div key={j} className="min-w-0 break-words">
                        <MathText text={p.value} />
                      </div>
                    ))}
                  </div>
                );
              }
              return (
                <div className="flex flex-col gap-3 text-muted-foreground sm:flex-row sm:items-start">
                  <div className="flex shrink-0 flex-col gap-2 sm:max-w-[45%]">
                    {images.map((p, j) => (
                      <button
                        key={j}
                        type="button"
                        onClick={() => setZoom(p.value)}
                        className="block overflow-hidden rounded-md border bg-background"
                        aria-label="Enlarge picture"
                      >
                        <img src={p.value} alt="" loading="lazy" className="max-h-72 w-auto max-w-full object-contain" />
                      </button>
                    ))}
                  </div>
                  <div className="min-w-0 flex-1 space-y-2">
                    {texts.map((p, j) => (
                      <div key={j} className="min-w-0 break-words">
                        <MathText text={p.value} />
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}
          </div>
        );
      })}
      <Dialog open={!!zoom} onOpenChange={(o) => !o && setZoom(null)}>
        <DialogContent className="max-w-4xl p-2">
          {zoom && <img src={zoom} alt="" className="max-h-[85vh] w-full object-contain" />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
