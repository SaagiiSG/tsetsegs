import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Trophy, Users, Clock, Calendar, ChevronDown, ChevronUp, Crown, TrendingUp, Zap } from 'lucide-react';
import { format, differenceInSeconds, differenceInDays, differenceInHours, differenceInMinutes } from 'date-fns';
import { cn } from '@/lib/utils';

const TIER_ORDER = ['unranked', 'bronze', 'silver', 'gold', 'platinum', 'diamond', 'ruby'] as const;
const MAX_GROUP_SIZE = 40;

const TIER_STYLES: Record<string, { bg: string; text: string; border: string; icon: string }> = {
  unranked: { bg: 'bg-muted/50', text: 'text-muted-foreground', border: 'border-muted', icon: '⚪' },
  bronze: { bg: 'bg-amber-500/10', text: 'text-amber-600', border: 'border-amber-500/30', icon: '🥉' },
  silver: { bg: 'bg-slate-400/10', text: 'text-slate-500', border: 'border-slate-400/30', icon: '🥈' },
  gold: { bg: 'bg-yellow-500/10', text: 'text-yellow-600', border: 'border-yellow-500/30', icon: '🥇' },
  platinum: { bg: 'bg-purple-500/10', text: 'text-purple-600', border: 'border-purple-500/30', icon: '💜' },
  diamond: { bg: 'bg-cyan-500/10', text: 'text-cyan-600', border: 'border-cyan-500/30', icon: '💎' },
  ruby: { bg: 'bg-red-500/10', text: 'text-red-600', border: 'border-red-500/30', icon: '❤️' },
};

interface Sprint {
  id: string;
  season_number: number;
  sprint_number: number;
  start_date: string;
  end_date: string;
  is_active: boolean;
}

interface SprintRanking {
  id: string;
  student_account_id: string;
  current_tier: string;
  total_points: number;
  final_rank: number | null;
  is_top_1: boolean;
  group_number: number | null;
  student_accounts?: {
    phone_number: string;
    linked_student_id: string | null;
    students?: {
      name: string;
    } | null;
  };
}

interface GroupData {
  groupNumber: number;
  studentCount: number;
  p1Winner: SprintRanking | null;
  rankings: SprintRanking[];
}

function useCountdown(endDate: string | null) {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    if (!endDate) return;

    const calculateTimeLeft = () => {
      const end = new Date(endDate);
      const now = new Date();
      const totalSeconds = Math.max(0, differenceInSeconds(end, now));

      const days = Math.floor(totalSeconds / (24 * 60 * 60));
      const hours = Math.floor((totalSeconds % (24 * 60 * 60)) / (60 * 60));
      const minutes = Math.floor((totalSeconds % (60 * 60)) / 60);
      const seconds = totalSeconds % 60;

      setTimeLeft({ days, hours, minutes, seconds });
    };

    calculateTimeLeft();
    const interval = setInterval(calculateTimeLeft, 1000);
    return () => clearInterval(interval);
  }, [endDate]);

  return timeLeft;
}

export default function SprintMonitor() {
  const [selectedSeason, setSelectedSeason] = useState<number | null>(null);
  const [expandedTier, setExpandedTier] = useState<string | null>(null);

  // Fetch all sprints
  const { data: sprints, isLoading: sprintsLoading } = useQuery({
    queryKey: ['admin-sprints'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sprints')
        .select('*')
        .order('season_number', { ascending: false })
        .order('sprint_number', { ascending: true });
      
      if (error) throw error;
      return data as Sprint[];
    },
  });

  // Get unique seasons
  const seasons = sprints ? [...new Set(sprints.map(s => s.season_number))].sort((a, b) => b - a) : [];
  
  // Set default selected season
  useEffect(() => {
    if (seasons.length > 0 && selectedSeason === null) {
      setSelectedSeason(seasons[0]);
    }
  }, [seasons, selectedSeason]);

  // Get active sprint
  const activeSprint = sprints?.find(s => s.is_active);
  
  // Get sprints for selected season
  const seasonSprints = sprints?.filter(s => s.season_number === selectedSeason) || [];

  // Fetch rankings for active sprint
  const { data: rankings, isLoading: rankingsLoading } = useQuery({
    queryKey: ['admin-sprint-rankings', activeSprint?.id],
    queryFn: async () => {
      if (!activeSprint) return [];
      
      const { data, error } = await supabase
        .from('student_sprint_rankings')
        .select(`
          *,
          student_accounts (
            phone_number,
            linked_student_id,
            students (name)
          )
        `)
        .eq('sprint_id', activeSprint.id)
        .order('total_points', { ascending: false });
      
      if (error) throw error;
      return data as SprintRanking[];
    },
    enabled: !!activeSprint,
  });

  // Calculate tier breakdown with real group data
  const tierBreakdown = TIER_ORDER.map(tier => {
    const tierRankings = rankings?.filter(r => r.current_tier === tier) || [];
    const studentCount = tierRankings.length;
    
    // Group rankings by actual group_number
    const groupsMap: Record<number, SprintRanking[]> = {};
    tierRankings.forEach(r => {
      const gn = r.group_number || 1;
      if (!groupsMap[gn]) groupsMap[gn] = [];
      groupsMap[gn].push(r);
    });

    // Create group data with P1 winner per group
    const groups: GroupData[] = Object.entries(groupsMap).map(([gn, members]) => {
      const sorted = [...members].sort((a, b) => b.total_points - a.total_points);
      const p1Winner = sorted.find(r => r.is_top_1) || (sorted.length > 0 ? sorted[0] : null);
      return {
        groupNumber: parseInt(gn),
        studentCount: members.length,
        p1Winner,
        rankings: sorted,
      };
    }).sort((a, b) => a.groupNumber - b.groupNumber);

    const actualGroupCount = groups.length;
    const allP1Winners = groups.map(g => g.p1Winner).filter(Boolean) as SprintRanking[];
    
    return {
      tier,
      studentCount,
      groupCount: actualGroupCount,
      groups,
      p1Winners: allP1Winners,
      rankings: tierRankings.sort((a, b) => b.total_points - a.total_points),
    };
  }).filter(t => t.studentCount > 0);

  const totalParticipants = rankings?.length || 0;
  const countdown = useCountdown(activeSprint?.end_date || null);

  const getSprintStatus = (sprint: Sprint) => {
    const now = new Date();
    const start = new Date(sprint.start_date);
    const end = new Date(sprint.end_date);

    if (sprint.is_active) return 'active';
    if (now < start) return 'upcoming';
    if (now > end) return 'completed';
    return 'upcoming';
  };

  if (sprintsLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Trophy className="h-6 w-6 text-primary" />
            Sprint Monitor
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Track competition sprints and season progress
          </p>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Active Sprint Card */}
        <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Zap className="h-5 w-5 text-primary" />
              Active Sprint
            </CardTitle>
          </CardHeader>
          <CardContent>
            {activeSprint ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-2xl font-bold">
                      Season {activeSprint.season_number}, Sprint {activeSprint.sprint_number}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(activeSprint.start_date), 'MMM d')} - {format(new Date(activeSprint.end_date), 'MMM d, yyyy')}
                    </p>
                  </div>
                  <Badge variant="default" className="bg-green-500">Active</Badge>
                </div>
                
                {/* Countdown */}
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Ends in:</span>
                  <span className="font-mono font-medium">
                    {countdown.days}d {countdown.hours}h {countdown.minutes}m {countdown.seconds}s
                  </span>
                </div>

                {/* Participants */}
                <div className="flex items-center gap-2 text-sm">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Participants:</span>
                  <span className="font-medium">{totalParticipants}</span>
                </div>
              </div>
            ) : (
              <div className="text-center py-4 text-muted-foreground">
                <p>No active sprint</p>
                <p className="text-sm">Create a new sprint to start a competition</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Season Progress Card */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Season Progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            {selectedSeason && seasonSprints.length > 0 ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-2xl font-bold">Season {selectedSeason}</p>
                  <Badge variant="outline">
                    {seasonSprints.filter(s => getSprintStatus(s) === 'completed').length} / 3 Completed
                  </Badge>
                </div>
                
                <Progress 
                  value={(seasonSprints.filter(s => getSprintStatus(s) === 'completed').length / 3) * 100} 
                  className="h-2"
                />
                
                <p className="text-sm text-muted-foreground">
                  Started: {format(new Date(seasonSprints[0]?.start_date || new Date()), 'MMM d, yyyy')}
                </p>
              </div>
            ) : (
              <div className="text-center py-4 text-muted-foreground">
                <p>No season data available</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Season Selector */}
      <div className="flex items-center gap-4">
        <span className="text-sm font-medium">Season:</span>
        <Select 
          value={selectedSeason?.toString() || ''} 
          onValueChange={(v) => setSelectedSeason(Number(v))}
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Select season" />
          </SelectTrigger>
          <SelectContent>
            {seasons.map(season => (
              <SelectItem key={season} value={season.toString()}>
                Season {season}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Sprint Cards for Selected Season */}
      {seasonSprints.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map(sprintNum => {
            const sprint = seasonSprints.find(s => s.sprint_number === sprintNum);
            const status = sprint ? getSprintStatus(sprint) : 'upcoming';
            
            return (
              <Card 
                key={sprintNum} 
                className={cn(
                  "transition-all",
                  status === 'active' && "ring-2 ring-primary border-primary",
                  !sprint && "opacity-50"
                )}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">Sprint {sprintNum}</CardTitle>
                    <Badge 
                      variant={status === 'active' ? 'default' : status === 'completed' ? 'secondary' : 'outline'}
                      className={cn(
                        status === 'active' && "bg-green-500",
                        status === 'completed' && "bg-muted"
                      )}
                    >
                      {status === 'active' ? 'Active' : status === 'completed' ? 'Completed' : 'Upcoming'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  {sprint ? (
                    <div className="space-y-2 text-sm">
                      <p className="text-muted-foreground">
                        {format(new Date(sprint.start_date), 'MMM d')} - {format(new Date(sprint.end_date), 'MMM d')}
                      </p>
                      {status === 'active' && (
                        <p className="font-medium text-primary">
                          {totalParticipants} participants
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">Not scheduled</p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Tier Breakdown */}
      {activeSprint && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Tier Breakdown
            </CardTitle>
            <CardDescription>
              Student distribution across tiers (max {MAX_GROUP_SIZE} per group)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {rankingsLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-12" />)}
              </div>
            ) : tierBreakdown.length > 0 ? (
              <div className="space-y-2">
                {tierBreakdown.map(({ tier, studentCount, groupCount, groups, p1Winners }) => {
                  const style = TIER_STYLES[tier];
                  const isExpanded = expandedTier === tier;
                  
                  return (
                    <div key={tier} className="border rounded-lg overflow-hidden">
                      <button
                        onClick={() => setExpandedTier(isExpanded ? null : tier)}
                        className={cn(
                          "w-full flex items-center justify-between p-4 transition-colors",
                          style.bg,
                          "hover:opacity-80"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-xl">{style.icon}</span>
                          <span className={cn("font-medium capitalize", style.text)}>
                            {tier}
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-6">
                          <div className="text-right">
                            <p className="text-sm font-medium">{studentCount} students</p>
                            <p className="text-xs text-muted-foreground">
                              {groupCount} group{groupCount !== 1 ? 's' : ''} • {p1Winners.length} P1{p1Winners.length !== 1 ? 's' : ''}
                            </p>
                          </div>
                          
                          {p1Winners.length > 0 && (
                            <div className="flex items-center gap-1">
                              <Crown className="h-4 w-4 text-amber-500" />
                              <span className="text-sm font-medium">{p1Winners.length}</span>
                            </div>
                          )}
                          
                          {isExpanded ? (
                            <ChevronUp className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          )}
                        </div>
                      </button>
                      
                      {isExpanded && groups.length > 0 && (
                        <div className="border-t divide-y">
                          {groups.map((group) => (
                            <div key={group.groupNumber} className="p-4">
                              <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                  <Badge variant="outline" className="font-mono">
                                    Group {group.groupNumber}
                                  </Badge>
                                  <span className="text-sm text-muted-foreground">
                                    {group.studentCount} student{group.studentCount !== 1 ? 's' : ''}
                                  </span>
                                </div>
                                {group.p1Winner && (
                                  <div className="flex items-center gap-2 text-sm">
                                    <Crown className="h-4 w-4 text-amber-500" />
                                    <span className="font-medium">
                                      {group.p1Winner.student_accounts?.students?.name || 
                                       group.p1Winner.student_accounts?.phone_number || 
                                       'Unknown'}
                                    </span>
                                    <span className="text-muted-foreground">
                                      ({group.p1Winner.total_points.toLocaleString()} pts)
                                    </span>
                                  </div>
                                )}
                              </div>
                              
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead className="w-16">Rank</TableHead>
                                    <TableHead>Student</TableHead>
                                    <TableHead className="text-right">Points</TableHead>
                                    <TableHead className="w-20 text-center">P1</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {group.rankings.slice(0, 10).map((ranking, idx) => (
                                    <TableRow key={ranking.id}>
                                      <TableCell className="font-medium">
                                        #{idx + 1}
                                      </TableCell>
                                      <TableCell>
                                        {ranking.student_accounts?.students?.name || 
                                         ranking.student_accounts?.phone_number || 
                                         'Unknown'}
                                      </TableCell>
                                      <TableCell className="text-right font-mono">
                                        {ranking.total_points.toLocaleString()}
                                      </TableCell>
                                      <TableCell className="text-center">
                                        {(ranking.is_top_1 || idx === 0) && (
                                          <Crown className="h-4 w-4 text-amber-500 mx-auto" />
                                        )}
                                      </TableCell>
                                    </TableRow>
                                  ))}
                                  {group.rankings.length > 10 && (
                                    <TableRow>
                                      <TableCell colSpan={4} className="text-center text-muted-foreground text-sm">
                                        + {group.rankings.length - 10} more students
                                      </TableCell>
                                    </TableRow>
                                  )}
                                </TableBody>
                              </Table>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No participants yet</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {!activeSprint && sprints?.length === 0 && (
        <Card className="text-center py-12">
          <CardContent>
            <Trophy className="h-16 w-16 mx-auto mb-4 text-muted-foreground/50" />
            <h3 className="text-lg font-medium mb-2">No Sprints Yet</h3>
            <p className="text-muted-foreground mb-4">
              Create your first sprint to start the competition
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
