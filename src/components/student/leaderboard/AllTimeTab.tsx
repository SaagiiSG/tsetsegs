import { useState } from 'react';
import { motion } from 'framer-motion';
import { Loader2, Crown, Star, Sparkles } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AllTimeEntry } from '@/hooks/useLeaderboard';
import { TIER_COLORS } from '@/data/badgeDefinitions';
import { cn } from '@/lib/utils';

interface AllTimeTabProps {
  leaderboard: AllTimeEntry[];
  currentUserId: string | undefined;
  isLoading: boolean;
}

export function AllTimeTab({ leaderboard, currentUserId, isLoading }: AllTimeTabProps) {
  const [filter, setFilter] = useState<'all' | 'last30' | 'lastSeason'>('all');

  // Get Ruby Legends (4+ weeks at Ruby)
  const rubyLegends = leaderboard.filter(e => e.isRubyLegend);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Hall of Fame */}
      {rubyLegends.length > 0 && (
        <Card className="border-amber-500/30 bg-gradient-to-br from-amber-500/5 to-yellow-500/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-amber-500" />
              Hall of Fame
            </CardTitle>
            <CardDescription>Ruby Legends - 4+ weeks at Ruby rank</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              {rubyLegends.map((legend, index) => (
                <motion.div
                  key={legend.userId}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-center gap-2 p-2 rounded-lg bg-gradient-to-r from-rose-500/10 to-pink-500/10 border border-rose-500/20"
                >
                  <Avatar className="h-8 w-8 border-2 border-rose-500">
                    <AvatarFallback className="bg-rose-500 text-white text-sm">
                      {legend.username.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-medium">{legend.username}</p>
                    <p className="text-xs text-rose-500">{legend.rubyWeeks} weeks</p>
                  </div>
                  <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filter */}
      <div className="flex justify-end">
        <Select value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
          <SelectTrigger className="w-[150px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Time</SelectItem>
            <SelectItem value="last30">Last 30 Days</SelectItem>
            <SelectItem value="lastSeason">Last Season</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Leaderboard */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">All-Time Rankings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {leaderboard.length > 0 ? (
            leaderboard.slice(0, 50).map((entry, index) => {
              const isCurrentUser = entry.userId === currentUserId;
              const tierColor = TIER_COLORS[entry.highestTier];

              return (
                <motion.div
                  key={entry.userId}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.02 }}
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-lg border transition-colors",
                    isCurrentUser && "bg-primary/10 border-primary/30",
                    index === 0 && "bg-gradient-to-r from-amber-500/10 to-yellow-500/10 border-amber-500/30"
                  )}
                >
                  {/* Rank */}
                  <div className="w-8 flex justify-center">
                    {index === 0 ? (
                      <Crown className="h-5 w-5 text-amber-500" />
                    ) : (
                      <span className="font-bold text-muted-foreground">{index + 1}</span>
                    )}
                  </div>

                  {/* Avatar */}
                  <Avatar className="h-10 w-10 border-2" style={{ borderColor: tierColor }}>
                    <AvatarFallback className={cn(isCurrentUser && "bg-primary text-primary-foreground")}>
                      {entry.username.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className={cn("font-medium truncate", isCurrentUser && "text-primary")}>
                        {entry.username}
                      </p>
                      {isCurrentUser && (
                        <Badge variant="secondary" className="text-xs">You</Badge>
                      )}
                      {entry.isRubyLegend && (
                        <Badge className="bg-gradient-to-r from-rose-500 to-pink-500 text-white text-xs gap-1">
                          <Star className="h-3 w-3 fill-current" />
                          Legend
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>Level {entry.level}</span>
                      <span>•</span>
                      <span className="capitalize" style={{ color: tierColor }}>
                        Peak: {entry.highestTier}
                      </span>
                    </div>
                  </div>

                  {/* Points */}
                  <div className="text-right">
                    <p className="font-bold">{entry.totalPoints.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">total pts</p>
                  </div>
                </motion.div>
              );
            })
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <p>No all-time data yet</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
