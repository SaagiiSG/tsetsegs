import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Trophy } from 'lucide-react';
import { useLeaderboard } from '@/hooks/useLeaderboard';
import { cn } from '@/lib/utils';

interface Props {
  className?: string;
}

export function SidebarRankBox({ className }: Props) {
  const navigate = useNavigate();
  const { currentUserEntry, activeSprint } = useLeaderboard();

  const rank = currentUserEntry?.rank ?? null;
  const group = currentUserEntry?.groupNumber;

  return (
    <motion.button
      type="button"
      onClick={() => navigate('/practice/leaderboard')}
      whileHover={{ y: -1 }}
      whileTap={{ scale: 0.98 }}
      className={cn(
        'w-full mt-1.5 px-3 py-2 rounded-lg border border-border/60 bg-gradient-to-br from-amber-500/5 to-yellow-500/5 hover:from-amber-500/10 hover:to-yellow-500/10 transition-all flex items-center justify-between gap-2',
        className
      )}
      aria-label="View leaderboard"
    >
      <span className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        <Trophy className="h-3 w-3 text-amber-500" />
        Position
      </span>
      <span className="font-mono font-bold text-sm text-foreground">
        {!activeSprint ? '—' : rank ? `#${rank}` : '—'}
        {group && rank && (
          <span className="ml-1 text-[9px] text-muted-foreground font-normal">G{group}</span>
        )}
      </span>
    </motion.button>
  );
}
