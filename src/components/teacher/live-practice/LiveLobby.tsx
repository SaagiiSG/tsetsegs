import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Users, Play, Copy, Check } from "lucide-react";
import QRCodeComponent from "react-qr-code";

interface Participant {
  id: string;
  player_name: string;
  joined_at: string;
}

interface LiveLobbyProps {
  sessionId: string;
  joinCode: string;
  onStart: () => void;
}

export function LiveLobby({ sessionId, joinCode, onStart }: LiveLobbyProps) {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    // Fetch existing
    const fetchParticipants = async () => {
      const { data } = await supabase
        .from("live_session_participants")
        .select("id, player_name, joined_at")
        .eq("session_id", sessionId)
        .order("joined_at", { ascending: true });
      if (data) setParticipants(data);
    };
    fetchParticipants();

    // Subscribe to new joins
    const channel = supabase
      .channel(`lobby-${sessionId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "live_session_participants",
          filter: `session_id=eq.${sessionId}`,
        },
        (payload) => {
          const p = payload.new as Participant;
          setParticipants((prev) => {
            if (prev.some((x) => x.id === p.id)) return prev;
            return [...prev, p];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId]);

  const joinUrl = `${window.location.origin}/live/${joinCode}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(joinCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6 max-w-lg mx-auto text-center">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold">Join the Game!</h2>
        <p className="text-sm text-muted-foreground">
          Scan the QR code or enter the code below
        </p>
      </div>

      {/* QR Code */}
      <Card className="inline-block p-6">
        <div className="bg-white p-4 rounded-xl">
          <QRCodeComponent value={joinUrl} size={200} level="H" />
        </div>
      </Card>

      {/* Join Code */}
      <div className="space-y-2">
        <div className="flex items-center justify-center gap-2">
          <span className="text-4xl font-mono font-bold tracking-[0.3em] text-primary">
            {joinCode}
          </span>
          <Button variant="ghost" size="icon" onClick={handleCopy}>
            {copied ? (
              <Check className="h-5 w-5 text-green-500" />
            ) : (
              <Copy className="h-5 w-5" />
            )}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Go to <span className="font-mono text-foreground">{window.location.origin}/live/{joinCode}</span>
        </p>
      </div>

      {/* Players */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Users className="h-4 w-4" />
            Players Joined
          </div>
          <motion.span
            key={participants.length}
            initial={{ scale: 1.5 }}
            animate={{ scale: 1 }}
            className="text-2xl font-bold text-primary"
          >
            {participants.length}
          </motion.span>
        </div>
        <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto">
          <AnimatePresence>
            {participants.map((p) => (
              <motion.span
                key={p.id}
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                className="px-3 py-1.5 bg-primary/10 text-primary text-sm font-medium rounded-full"
              >
                {p.player_name}
              </motion.span>
            ))}
          </AnimatePresence>
        </div>
      </Card>

      <Button
        size="lg"
        className="w-full text-lg h-14"
        onClick={onStart}
        disabled={participants.length === 0}
      >
        <Play className="h-5 w-5 mr-2" />
        Start Game ({participants.length} players)
      </Button>
    </div>
  );
}
