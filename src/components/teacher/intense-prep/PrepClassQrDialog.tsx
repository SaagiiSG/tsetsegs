import { useState } from "react";
import QRCode from "react-qr-code";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Copy, Loader2, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  groupId: string;
  groupName: string;
  joinCode: string | null;
  onCodeCreated: (code: string) => void;
}

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function makePrepJoinCode() {
  let out = "";
  for (let i = 0; i < 6; i += 1) {
    out += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  }
  return out;
}

export function PrepClassQrDialog({ open, onOpenChange, groupId, groupName, joinCode, onCodeCreated }: Props) {
  const { toast } = useToast();
  const [working, setWorking] = useState(false);

  const url = joinCode ? `${window.location.origin}/prep/${joinCode}` : "";

  const generate = async () => {
    setWorking(true);
    const code = makePrepJoinCode();
    const { error } = await supabase.from("intense_prep_groups").update({ join_code: code }).eq("id", groupId);
    setWorking(false);
    if (error) {
      toast({ title: "Could not create code", description: error.message, variant: "destructive" });
      return;
    }
    onCodeCreated(code);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{groupName}</DialogTitle>
          <DialogDescription>
            Students scan this, enter their phone number, and land straight on the roster.
          </DialogDescription>
        </DialogHeader>

        {joinCode ? (
          <div className="space-y-4">
            <div className="bg-white p-5 rounded-xl mx-auto w-fit">
              <QRCode value={url} size={220} />
            </div>
            <div className="text-center space-y-1">
              <p className="text-3xl font-mono font-bold tracking-[0.3em]">{joinCode}</p>
              <p className="text-xs text-muted-foreground break-all">{url}</p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1 gap-2"
                onClick={() => {
                  navigator.clipboard?.writeText(url);
                  toast({ title: "Link copied" });
                }}
              >
                <Copy className="h-4 w-4" />
                Copy link
              </Button>
              <Button variant="outline" className="gap-2" onClick={generate} disabled={working}>
                {working ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                New code
              </Button>
            </div>
          </div>
        ) : (
          <Button className="w-full" onClick={generate} disabled={working}>
            {working ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
            Create registration code
          </Button>
        )}
      </DialogContent>
    </Dialog>
  );
}
