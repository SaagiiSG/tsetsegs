import { useRef, useState } from 'react';
import html2canvas from 'html2canvas';
import { Award, Download, Instagram, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { StudentBadge } from '@/hooks/useBadges';
import { RARITY_COLORS } from '@/data/badgeDefinitions';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

interface Props {
  badge: StudentBadge | null;
  studentName?: string | null;
  open: boolean;
  onClose: () => void;
}

/**
 * 9:16 story card for a badge, exported as a PNG that students can
 * share straight to an Instagram story (native share sheet on mobile,
 * download fallback on desktop).
 */
export function BadgeStoryShare({ badge, studentName, open, onClose }: Props) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false);

  if (!badge) return null;
  const { badge: def, unlockedAt } = badge;
  const colors = RARITY_COLORS[def.rarity];

  const render = async (): Promise<File | null> => {
    if (!cardRef.current) return null;
    const canvas = await html2canvas(cardRef.current, {
      backgroundColor: null,
      scale: 3,
      useCORS: true,
    });
    const blob: Blob | null = await new Promise((res) => canvas.toBlob(res, 'image/png'));
    if (!blob) return null;
    return new File([blob], `${def.name.replace(/\s+/g, '-').toLowerCase()}-story.png`, {
      type: 'image/png',
    });
  };

  const handleShare = async () => {
    setBusy(true);
    try {
      const file = await render();
      if (!file) throw new Error('render failed');
      const nav = navigator as Navigator & {
        canShare?: (data: { files: File[] }) => boolean;
        share?: (data: { files: File[]; title?: string; text?: string }) => Promise<void>;
      };
      if (nav.canShare?.({ files: [file] }) && nav.share) {
        await nav.share({ files: [file], title: def.name, text: `${def.name} — Tsetsegs SAT` });
      } else {
        const url = URL.createObjectURL(file);
        const a = document.createElement('a');
        a.href = url;
        a.download = file.name;
        a.click();
        URL.revokeObjectURL(url);
        toast.success('Story image saved — upload it to your Instagram story');
      }
    } catch {
      toast.error('Could not create the story image');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Share to your story</DialogTitle>
        </DialogHeader>

        <div className="flex justify-center">
          <div
            ref={cardRef}
            className="relative w-[270px] h-[480px] rounded-2xl overflow-hidden bg-gradient-to-br from-primary via-primary/70 to-accent flex flex-col items-center justify-center px-6 text-center"
          >
            <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_20%_20%,white,transparent_55%)]" />
            <div
              className={cn(
                'relative w-24 h-24 rounded-full border-4 flex items-center justify-center bg-background/15 backdrop-blur-sm',
                colors.border,
              )}
            >
              <Award className={cn('h-12 w-12', colors.text)} />
            </div>
            <p className="relative mt-6 text-xs uppercase tracking-[0.25em] text-primary-foreground/80">
              Badge unlocked
            </p>
            <h3 className="relative mt-2 text-2xl font-bold leading-tight text-primary-foreground">
              {def.name}
            </h3>
            <p className="relative mt-3 text-sm text-primary-foreground/85">{def.description}</p>
            {studentName && (
              <p className="relative mt-6 text-sm font-semibold text-primary-foreground">
                {studentName}
              </p>
            )}
            {unlockedAt && (
              <p className="relative mt-1 text-xs text-primary-foreground/70">
                {format(new Date(unlockedAt), 'MMM d, yyyy')}
              </p>
            )}
            <p className="absolute bottom-6 text-xs font-medium tracking-wide text-primary-foreground/80">
              flowersos.co
            </p>
          </div>
        </div>

        <Button className="w-full gap-2" onClick={handleShare} disabled={busy}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Instagram className="h-4 w-4" />}
          Share to Instagram story
        </Button>
        <p className="text-center text-xs text-muted-foreground flex items-center justify-center gap-1">
          <Download className="h-3 w-3" /> On desktop the image downloads instead
        </p>
      </DialogContent>
    </Dialog>
  );
}
