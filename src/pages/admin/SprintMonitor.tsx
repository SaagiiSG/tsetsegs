import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { FullProfileDialog } from '@/components/student/leaderboard/FullProfileDialog';

import { useToast } from '@/hooks/use-toast';
import { Trophy, Users, Clock, Calendar, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, Crown, TrendingUp, Zap, Plus, Loader2, CalendarIcon, X, Rocket } from 'lucide-react';
import { format, differenceInSeconds, differenceInDays, differenceInHours, differenceInMinutes, addDays } from 'date-fns';
import { cn } from '@/lib/utils';

const TIER_ORDER = ['unranked', 'bronze', 'silver', 'gold', 'platinum', 'diamond', 'ruby'] as const;
const MAX_GROUP_SIZE = 55; // 40 ± 15 margin, effective range 25-55
const TARGET_GROUP_SIZE = 40;

const TIER_PROMOTION_CUTOFFS: Record<string, number> = {
  unranked: 30,
  bronze: 20,
  silver: 15,
  gold: 10,
  platinum: 5,
  diamond: 1,
  ruby: 1,
};

// Calculate optimal group assignment: minimize groups, each between 25-55 students
function calculateGroupNumber(index: number, totalInTier: number): number {
  const numGroups = Math.ceil(totalInTier / MAX_GROUP_SIZE);
  const groupSize = Math.ceil(totalInTier / numGroups);
  return Math.floor(index / groupSize) + 1;
}

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
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [selectedSeason, setSelectedSeason] = useState<number | null>(null);
  const [activeTierIndex, setActiveTierIndex] = useState(0);
  const [showSeasonBuilder, setShowSeasonBuilder] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [profileDialogOpen, setProfileDialogOpen] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [selectedStudentName, setSelectedStudentName] = useState<string>('');
  
  // Season builder state
  const [builderStartDate, setBuilderStartDate] = useState<Date>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 5);
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const [builderSprintDays, setBuilderSprintDays] = useState(14);

  const SPRINT_DURATION_DAYS = builderSprintDays;
  const SEASON_GAP_DAYS = 1; // 1-day gap between seasons
  const FIRST_SPRINT_DELAY_DAYS = 5; // First sprint of new season starts 5 days from now

  // Create new season handler - creates all 3 back-to-back sprints and seeds students
  const handleCreateSeason = async () => {
    setIsCreating(true);
    
    try {
      // Determine next season number
      let nextSeasonNumber = 1;
      
      if (sprints && sprints.length > 0) {
        const maxSeason = Math.max(...sprints.map(s => s.season_number));
        nextSeasonNumber = maxSeason + 1;
      }
      
      // Deactivate any active sprints
      if (activeSprint) {
        await supabase
          .from('sprints')
          .update({ is_active: false })
          .eq('id', activeSprint.id);
      }
      
      // Use builder state for start date and duration
      const sprint1Start = new Date(builderStartDate);
      sprint1Start.setHours(0, 0, 0, 0);
      
      const sprint1End = addDays(sprint1Start, builderSprintDays);
      
      const sprint2Start = new Date(sprint1End);
      const sprint2End = addDays(sprint2Start, builderSprintDays);
      
      const sprint3Start = new Date(sprint2End);
      const sprint3End = addDays(sprint3Start, builderSprintDays);
      
      // Create all 3 sprints for the season
      const sprintsToCreate = [
        {
          season_number: nextSeasonNumber,
          sprint_number: 1,
          start_date: sprint1Start.toISOString(),
          end_date: sprint1End.toISOString(),
          is_active: false // Will be activated when it starts
        },
        {
          season_number: nextSeasonNumber,
          sprint_number: 2,
          start_date: sprint2Start.toISOString(),
          end_date: sprint2End.toISOString(),
          is_active: false
        },
        {
          season_number: nextSeasonNumber,
          sprint_number: 3,
          start_date: sprint3Start.toISOString(),
          end_date: sprint3End.toISOString(),
          is_active: false
        }
      ];
      
      const { data: createdSprints, error } = await supabase
        .from('sprints')
        .insert(sprintsToCreate)
        .select();
      
      if (error) throw error;
      
      // Auto-enroll all active students into Sprint 1 as unranked
      const sprint1Id = createdSprints?.find(s => s.sprint_number === 1)?.id;
      if (sprint1Id) {
        // Fetch all active student accounts
        const { data: activeStudents } = await supabase
          .from('student_accounts')
          .select('id')
          .eq('is_active', true);
        
        if (activeStudents && activeStudents.length > 0) {
          // Fetch previous sprint rankings to get each student's tier
          const { data: previousRankings } = await supabase
            .from('student_sprint_rankings')
            .select('student_account_id, current_tier, reserved_next_tier')
            .order('created_at', { ascending: false });
          
          // Build a map of student_account_id -> their starting tier
          const studentTierMap: Record<string, string> = {};
          if (previousRankings) {
            // Use the most recent ranking for each student
            const seen = new Set<string>();
            for (const r of previousRankings) {
              if (!seen.has(r.student_account_id)) {
                seen.add(r.student_account_id);
                studentTierMap[r.student_account_id] = r.reserved_next_tier || r.current_tier || 'unranked';
              }
            }
          }
          
          // Group students by their starting tier for proper group assignment
          const tierGroups: Record<string, string[]> = {};
          for (const student of activeStudents) {
            const tier = studentTierMap[student.id] || 'unranked';
            if (!tierGroups[tier]) tierGroups[tier] = [];
            tierGroups[tier].push(student.id);
          }
          
          // Create rankings with proper tier and group assignment
          const rankings: Array<{
            student_account_id: string;
            sprint_id: string;
            current_tier: string;
            group_number: number;
            total_points: number;
          }> = [];
          
          for (const [tier, studentIds] of Object.entries(tierGroups)) {
            studentIds.forEach((studentId, index) => {
              rankings.push({
                student_account_id: studentId,
                sprint_id: sprint1Id,
                current_tier: tier,
                group_number: calculateGroupNumber(index, studentIds.length),
                total_points: 0,
              });
            });
          }
          
          const { error: rankingsError } = await supabase
            .from('student_sprint_rankings')
            .insert(rankings);
          
          if (rankingsError) {
            console.error('Failed to seed students:', rankingsError);
          }
        }
      }
      
      // Refresh data
      await queryClient.invalidateQueries({ queryKey: ['admin-sprints'] });
      await queryClient.invalidateQueries({ queryKey: ['active-sprint'] });
      await queryClient.invalidateQueries({ queryKey: ['admin-sprint-rankings'] });
      
      toast({
        title: 'Season Created',
        description: `Season ${nextSeasonNumber} scheduled with all students enrolled! Sprint 1 starts on ${format(sprint1Start, 'MMM d, yyyy')}`
      });
      
      setIsCreateDialogOpen(false);
    } catch (err: any) {
      console.error('Failed to create season:', err);
      toast({
        title: 'Error',
        description: err.message || 'Failed to create season',
        variant: 'destructive'
      });
    } finally {
      setIsCreating(false);
    }
  };

  // Auto-transition sprints based on current time
  const autoTransitionSprints = async () => {
    const now = new Date();
    
    // Fetch all sprints to check for transitions
    const { data: allSprints, error } = await supabase
      .from('sprints')
      .select('*')
      .order('season_number', { ascending: false })
      .order('sprint_number', { ascending: true });
    
    if (error || !allSprints) return allSprints || [];
    
    let needsRefresh = false;
    
    for (const sprint of allSprints) {
      const startDate = new Date(sprint.start_date);
      const endDate = new Date(sprint.end_date);
      
      // If sprint is active but has ended, deactivate it
      if (sprint.is_active && now >= endDate) {
        console.log(`Auto-deactivating ended sprint: Season ${sprint.season_number}, Sprint ${sprint.sprint_number}`);
        await supabase
          .from('sprints')
          .update({ is_active: false })
          .eq('id', sprint.id);
        sprint.is_active = false;
        needsRefresh = true;
        
        // Trigger finalization for this sprint
        try {
          await supabase.functions.invoke('finalize-sprint', {
            body: { sprintId: sprint.id }
          });
          toast({
            title: 'Sprint Finalized',
            description: `Season ${sprint.season_number} Sprint ${sprint.sprint_number} has been automatically finalized.`
          });
        } catch (err) {
          console.error('Failed to auto-finalize sprint:', err);
        }
      }
      
      // If sprint should be active (within date range) but isn't, activate it
      if (!sprint.is_active && now >= startDate && now < endDate) {
        // First check if another sprint is still active
        const otherActiveSprint = allSprints.find(s => s.is_active && s.id !== sprint.id);
        if (!otherActiveSprint) {
          console.log(`Auto-activating sprint: Season ${sprint.season_number}, Sprint ${sprint.sprint_number}`);
          await supabase
            .from('sprints')
            .update({ is_active: true })
            .eq('id', sprint.id);
          sprint.is_active = true;
          needsRefresh = true;
          
          toast({
            title: 'New Sprint Started!',
            description: `Season ${sprint.season_number} Sprint ${sprint.sprint_number} is now active.`
          });
        }
      }
    }
    
    if (needsRefresh) {
      queryClient.invalidateQueries({ queryKey: ['admin-sprint-rankings'] });
      queryClient.invalidateQueries({ queryKey: ['active-sprint'] });
    }
    
    return allSprints as Sprint[];
  };

  // Fetch all sprints with auto-transition check
  const { data: sprints, isLoading: sprintsLoading } = useQuery({
    queryKey: ['admin-sprints'],
    queryFn: autoTransitionSprints,
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
        
        {/* Start New Season Button */}
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Start New Season
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Start New Season</DialogTitle>
              <DialogDescription>
                This will create a new season with 3 back-to-back sprints, each lasting 14 days.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              {(() => {
                const nextSeasonNumber = sprints && sprints.length > 0 
                  ? Math.max(...sprints.map(s => s.season_number)) + 1 
                  : 1;
                
                const sprint1Start = new Date();
                sprint1Start.setDate(sprint1Start.getDate() + 5);
                sprint1Start.setHours(0, 0, 0, 0);
                
                const sprint1End = new Date(sprint1Start);
                sprint1End.setDate(sprint1End.getDate() + 14);
                
                const sprint2End = new Date(sprint1End);
                sprint2End.setDate(sprint2End.getDate() + 14);
                
                const sprint3End = new Date(sprint2End);
                sprint3End.setDate(sprint3End.getDate() + 14);
                
                return (
                  <>
                    <div className="rounded-lg border p-4 bg-muted/50 space-y-3">
                      <p className="font-semibold text-lg">Season {nextSeasonNumber}</p>
                      
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between items-center">
                          <span className="font-medium">Sprint 1:</span>
                          <span className="text-muted-foreground">
                            {format(sprint1Start, 'MMM d')} - {format(sprint1End, 'MMM d, yyyy')}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="font-medium">Sprint 2:</span>
                          <span className="text-muted-foreground">
                            {format(sprint1End, 'MMM d')} - {format(sprint2End, 'MMM d, yyyy')}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="font-medium">Sprint 3:</span>
                          <span className="text-muted-foreground">
                            {format(sprint2End, 'MMM d')} - {format(sprint3End, 'MMM d, yyyy')}
                          </span>
                        </div>
                      </div>
                      
                      <div className="pt-2 border-t text-xs text-muted-foreground">
                        <p>• First sprint starts in 5 days</p>
                        <p>• Sprints run back-to-back (no gaps)</p>
                        <p>• 1-day break after season ends before next season</p>
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateSeason} disabled={isCreating}>
                {isCreating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create Season'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
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

      {/* Tier Breakdown - Horizontal Carousel */}
      {activeSprint && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Tier Breakdown
            </CardTitle>
            <CardDescription>
              Student distribution across tiers ({TARGET_GROUP_SIZE}±15 per group)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {rankingsLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-12" />)}
              </div>
            ) : tierBreakdown.length > 0 ? (
              <div className="overflow-x-auto pb-2 -mx-2 px-2">
                <div className="flex gap-4" style={{ minWidth: `${tierBreakdown.length * 400}px` }}>
                  {tierBreakdown.map(({ tier, studentCount, groupCount, groups }) => {
                    const style = TIER_STYLES[tier];
                    return (
                      <div key={tier} className={cn("border rounded-xl overflow-hidden min-h-[420px] w-[400px] shrink-0", style.border)}>
                        {/* Card Header */}
                        <div className={cn("flex items-center justify-between p-5", style.bg)}>
                          <div className="flex items-center gap-3">
                            <span className="text-2xl">{style.icon}</span>
                            <span className={cn("text-lg font-semibold capitalize", style.text)}>{tier}</span>
                            <Badge variant="secondary" className="ml-1">{studentCount} students</Badge>
                          </div>
                          <Badge variant="outline">{groupCount} group{groupCount !== 1 ? 's' : ''}</Badge>
                        </div>

                        {/* Groups via Tabs */}
                        {groups.length > 0 ? (
                          <Tabs defaultValue={`group-${groups[0].groupNumber}`} className="p-4">
                            {groups.length > 1 && (
                              <TabsList className="mb-4">
                                {groups.map(g => (
                                  <TabsTrigger key={g.groupNumber} value={`group-${g.groupNumber}`}>
                                    Group {g.groupNumber} ({g.studentCount})
                                  </TabsTrigger>
                                ))}
                              </TabsList>
                            )}

                            {groups.map((group) => (
                              <TabsContent key={group.groupNumber} value={`group-${group.groupNumber}`}>
                                {/* P1 Winner highlight */}
                                {group.p1Winner && (
                                  <div className="flex items-center gap-2 mb-3 p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20">
                                    <Crown className="h-4 w-4 text-amber-500" />
                                    <span className="text-sm font-semibold">
                                      {group.p1Winner.student_accounts?.students?.name || group.p1Winner.student_accounts?.phone_number || 'Unknown'}
                                    </span>
                                    <span className="text-xs text-muted-foreground ml-auto font-mono">
                                      {group.p1Winner.total_points.toLocaleString()} pts
                                    </span>
                                  </div>
                                )}

                                <div className="max-h-[420px] overflow-y-auto">
                                  <Table>
                                    <TableHeader>
                                      <TableRow>
                                        <TableHead className="w-14">Rank</TableHead>
                                        <TableHead>Student</TableHead>
                                        <TableHead className="text-right">Points</TableHead>
                                        <TableHead className="w-16 text-center">P1</TableHead>
                                        <TableHead className="w-8"></TableHead>
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {group.rankings.map((ranking, idx) => {
                                        const studentName = ranking.student_accounts?.students?.name || ranking.student_accounts?.phone_number || 'Unknown';
                                        const rank = idx + 1;
                                        const cutoff = TIER_PROMOTION_CUTOFFS[tier] || 30;
                                        const isPromoting = rank <= cutoff && tier !== 'ruby';
                                        const isDemoting = rank > cutoff;
                                        const isCutoffBoundary = idx === cutoff && cutoff < group.rankings.length;
                                        
                                        return (
                                          <>
                                            {isCutoffBoundary && (
                                              <TableRow key={`separator-${idx}`} className="pointer-events-none">
                                                <TableCell colSpan={5} className="py-1 px-0">
                                                  <div className="flex items-center gap-2 text-xs text-destructive/70">
                                                    <div className="flex-1 border-t border-dashed border-destructive/30" />
                                                    <span className="font-medium">▼ Demotion Zone</span>
                                                    <div className="flex-1 border-t border-dashed border-destructive/30" />
                                                  </div>
                                                </TableCell>
                                              </TableRow>
                                            )}
                                            <TableRow 
                                              key={ranking.id} 
                                              className={cn(
                                                "cursor-pointer hover:bg-muted/50",
                                                isPromoting && "bg-green-500/5",
                                                isDemoting && "bg-destructive/5"
                                              )}
                                              onClick={() => {
                                                setSelectedStudentId(ranking.student_account_id);
                                                setSelectedStudentName(studentName);
                                                setProfileDialogOpen(true);
                                              }}
                                            >
                                              <TableCell className="font-medium">#{rank}</TableCell>
                                              <TableCell>{studentName}</TableCell>
                                              <TableCell className="text-right font-mono">
                                                {ranking.total_points.toLocaleString()}
                                              </TableCell>
                                              <TableCell className="text-center">
                                                {(ranking.is_top_1 || idx === 0) && (
                                                  <Crown className="h-4 w-4 text-amber-500 mx-auto" />
                                                )}
                                              </TableCell>
                                              <TableCell className="w-8 text-center">
                                                {isPromoting ? (
                                                  <TrendingUp className="h-3.5 w-3.5 text-green-500 mx-auto" />
                                                ) : isDemoting ? (
                                                  <ChevronDown className="h-3.5 w-3.5 text-destructive mx-auto" />
                                                ) : null}
                                              </TableCell>
                                            </TableRow>
                                          </>
                                        );
                                      })}
                                    </TableBody>
                                  </Table>
                                </div>
                              </TabsContent>
                            ))}
                          </Tabs>
                        ) : (
                          <div className="p-8 text-center text-muted-foreground text-sm">No students in this tier</div>
                        )}
                      </div>
                    );
                  })}
                </div>
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

      {/* Student Profile Dialog */}
      <FullProfileDialog
        open={profileDialogOpen}
        onOpenChange={setProfileDialogOpen}
        userId={selectedStudentId}
        username={selectedStudentName}
      />
    </div>
  );
}
