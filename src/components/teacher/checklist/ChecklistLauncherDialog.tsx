import { useMemo } from "react";
import QRCodeComponent from "react-qr-code";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ChecklistView } from "./ChecklistView";
import { Smartphone, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  batchId: string | null; // null = global
  title: string;
}

export function ChecklistLauncherDialog({ open, onOpenChange, batchId, title }: Props) {
  const mobilePath = batchId ? `/teacher/checklist/${batchId}` : `/teacher/checklist`;
  const mobileUrl = useMemo(() => {
    if (typeof window === "undefined") return mobilePath;
    return `${window.location.origin}${mobilePath}`;
  }, [mobilePath]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl w-[95vw] p-0 gap-0 h-[85vh] overflow-hidden rounded-3xl">
        <div className="grid md:grid-cols-[1fr_320px] h-full">
          {/* Left — live checklist */}
          <div className="min-h-0 flex flex-col border-r">
            <DialogHeader className="px-5 pt-5 pb-2">
              <DialogTitle className="text-base">Teaching SOP · {title}</DialogTitle>
            </DialogHeader>
            <div className="flex-1 min-h-0">
              <ChecklistView batchId={batchId} compact />
            </div>
          </div>

          {/* Right — phone handoff */}
          <div className="p-5 md:p-6 bg-muted/30 flex flex-col gap-4 min-h-0 overflow-y-auto">
            <div className="flex items-center gap-2">
              <div className="h-9 w-9 rounded-full bg-primary/10 text-primary grid place-items-center">
                <Smartphone className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold">Open on your phone</h3>
                <p className="text-[11px] text-muted-foreground">Scan with your camera — your teacher session carries over.</p>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-4 grid place-items-center mx-auto">
              <QRCodeComponent value={mobileUrl} size={220} level="H" />
            </div>

            <div className="space-y-2">
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Link</div>
              <div className="text-xs bg-background rounded-lg border px-3 py-2 break-all font-mono">
                {mobileUrl}
              </div>
              <Button
                variant="outline"
                size="sm"
                className="w-full rounded-full"
                onClick={() => window.open(mobileUrl, "_blank")}
              >
                <ExternalLink className="h-3.5 w-3.5 mr-1.5" /> Open in new tab
              </Button>
            </div>

            <div className="mt-auto text-[11px] text-muted-foreground leading-relaxed">
              <p className="font-medium text-foreground mb-1">Tip</p>
              Check items off on your phone while teaching — this window updates live.
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
