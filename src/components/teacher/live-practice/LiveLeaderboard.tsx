import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Trophy, Medal, RotateCcw, Crown } from "lucide-react";

interface Player {
  id: string;
  player_name: string;
  total_points: number;
}

interface LiveLeaderboardProps {
  sessionId: string;
  onNewSession: () => void;
}

export function LiveLeaderboard({ sessionId, onNewSession }: LiveLeaderboardProps) {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchResults = async () => {
      // Calculate totals from answers
      const { data: answers } = await supabase
        .from("live_session_answers")
        .select("participant_id, points_earned")
        .eq("session_id", sessionId);

      const { data: participants } = await supabase
        .from("live_session_participants")
        .select("id, player_name, total_points")
        .eq("session_id", sessionId);

      if (participants) {
        // Calculate real totals from answers
        const pointsMap: Record<string, number> = {};
        answers?.forEach((a) => {
          pointsMap[a.participant_id] = (pointsMap[a.participant_id] || 0) + a.points_earned;
        });

        const sorted = participants
          .map((p) => ({
            ...p,
            total_points: pointsMap[p.id] || p.total_points,
          }))
          .sort((a, b) => b.total_points - a.total_points);

        setPlayers(sorted);
      }
      setLoading(false);
    };
    fetchResults();
  }, [sessionId]);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  const podium = players.slice(0, 3);
  const rest = players.slice(3);

  const podiumColors = [
    "from-yellow-400 to-amber-500",
    "from-gray-300 to-gray-400",
    "from-amber-600 to-amber-700",
  ];

  const podiumIcons = [Crown, Medal, Medal];

  return (
    <div className="space-y-6 max-w-lg mx-auto">
      <div className="text-center space-y-2">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 200 }}
        >
          <Trophy className="h-12 w-12 text-yellow-500 mx-auto" />
        </motion.div>
        <h2 className="text-2xl font-bold">Final Results</h2>
      </div>

      {/* Podium */}
      {podium.length > 0 && (
        <div className="flex items-end justify-center gap-3 h-48">
          {/* 2nd place */}
          {podium[1] && (
            <motion.div
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="flex flex-col items-center"
            >
              <span className="text-sm font-medium mb-1 truncate max-w-[80px]">
                {podium[1].player_name}
              </span>
              <div className={`w-20 h-24 rounded-t-lg bg-gradient-to-b ${podiumColors[1]} flex flex-col items-center justify-center`}>
                <span className="text-lg font-bold text-white">2nd</span>
                <span className="text-xs text-white/80">{podium[1].total_points}pts</span>
              </div>
            </motion.div>
          )}
          {/* 1st place */}
          {podium[0] && (
            <motion.div
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="flex flex-col items-center"
            >
              <Crown className="h-6 w-6 text-yellow-500 mb-1" />
              <span className="text-sm font-bold mb-1 truncate max-w-[80px]">
                {podium[0].player_name}
              </span>
              <div className={`w-24 h-32 rounded-t-lg bg-gradient-to-b ${podiumColors[0]} flex flex-col items-center justify-center`}>
                <span className="text-xl font-bold text-white">1st</span>
                <span className="text-xs text-white/80">{podium[0].total_points}pts</span>
              </div>
            </motion.div>
          )}
          {/* 3rd place */}
          {podium[2] && (
            <motion.div
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="flex flex-col items-center"
            >
              <span className="text-sm font-medium mb-1 truncate max-w-[80px]">
                {podium[2].player_name}
              </span>
              <div className={`w-20 h-20 rounded-t-lg bg-gradient-to-b ${podiumColors[2]} flex flex-col items-center justify-center`}>
                <span className="text-lg font-bold text-white">3rd</span>
                <span className="text-xs text-white/80">{podium[2].total_points}pts</span>
              </div>
            </motion.div>
          )}
        </div>
      )}

      {/* Rest of leaderboard */}
      {rest.length > 0 && (
        <Card className="divide-y">
          {rest.map((player, i) => (
            <motion.div
              key={player.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.6 + i * 0.05 }}
              className="flex items-center justify-between p-3"
            >
              <div className="flex items-center gap-3">
                <span className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-sm font-bold text-muted-foreground">
                  {i + 4}
                </span>
                <span className="font-medium text-sm">{player.player_name}</span>
              </div>
              <span className="text-sm font-bold text-primary">{player.total_points} pts</span>
            </motion.div>
          ))}
        </Card>
      )}

      <Button variant="outline" size="lg" className="w-full" onClick={onNewSession}>
        <RotateCcw className="h-4 w-4 mr-2" />
        New Session
      </Button>
    </div>
  );
}
