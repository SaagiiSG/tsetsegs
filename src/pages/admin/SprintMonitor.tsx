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
import { Trophy, Users, Clock, Calendar, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, Crown, TrendingUp, Zap, Plus, Loader2, CalendarIcon, X, Rocket, Pencil, Save } from 'lucide-react';
import { format, differenceInSeconds, differenceInDays, differenceInHours, differenceInMinutes, addDays } from 'date-fns';
import { cn } from '@/lib/utils';

const TIER_ORDER = ['unranked', 'bronze', 'silver', 'gold', 'platinum', 'diamond', 'ruby'] as const;
const MAX_GROUP_SIZE = 40; // Aligned with sprintEnrollment.ts (target 40)
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
  const [editingSeason, setEditingSeason] = useState<number | null>(null);
  const [editStartDate, setEditStartDate] = useState<Date>(new Date());
  const [editSprintDays, setEditSprintDays] = useState(14);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  
  // Season builder state
  const [builderStartDate, setBuilderStartDate] = useState<Date>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 5);
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const [builderSprintDays, setBuilderSprintDays] = useState(14);

  const SPRINT_DURATION_DAYS = builderSprintDays;
  const SEASON_GAP_DAYS = 1;

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
      
      // NOTE: We no longer auto-seed all active students into Sprint 1.
      // Students enroll themselves the first time they correctly answer a
      // question in the active sprint (see src/lib/sprintEnrollment.ts).
      
      // Refresh data
      await queryClient.invalidateQueries({ queryKey: ['admin-sprints'] });
      await queryClient.invalidateQueries({ queryKey: ['active-sprint'] });
      await queryClient.invalidateQueries({ queryKey: ['admin-sprint-rankings'] });
      
      toast({
        title: 'Season Created',
        description: `Season ${nextSeasonNumber} scheduled with all students enrolled! Sprint 1 starts on ${format(sprint1Start, 'MMM d, yyyy')}`
      });
      
      setShowSeasonBuilder(false);
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

  // Edit upcoming season handler
  const handleStartEditSeason = (seasonNumber: number) => {
    const seasonSprintsForEdit = sprints?.filter(s => s.season_number === seasonNumber) || [];
    const sprint1 = seasonSprintsForEdit.find(s => s.sprint_number === 1);
    if (sprint1) {
      setEditStartDate(new Date(sprint1.start_date));
      const durationDays = differenceInDays(new Date(sprint1.end_date), new Date(sprint1.start_date));
      setEditSprintDays(durationDays);
    }
    setEditingSeason(seasonNumber);
  };

  const handleSaveSeasonEdit = async () => {
    if (!editingSeason) return;
    setIsSavingEdit(true);
    
    try {
      const seasonSprintsToEdit = sprints?.filter(s => s.season_number === editingSeason) || [];
      
      const s1Start = new Date(editStartDate);
      s1Start.setHours(0, 0, 0, 0);
      const s1End = addDays(s1Start, editSprintDays);
      const s2Start = new Date(s1End);
      const s2End = addDays(s2Start, editSprintDays);
      const s3Start = new Date(s2End);
      const s3End = addDays(s3Start, editSprintDays);
      
      const updates = [
        { sprint_number: 1, start_date: s1Start.toISOString(), end_date: s1End.toISOString() },
        { sprint_number: 2, start_date: s2Start.toISOString(), end_date: s2End.toISOString() },
        { sprint_number: 3, start_date: s3Start.toISOString(), end_date: s3End.toISOString() },
      ];
      
      for (const update of updates) {
        const sprint = seasonSprintsToEdit.find(s => s.sprint_number === update.sprint_number);
        if (sprint) {
          const { error } = await supabase
            .from('sprints')
            .update({ start_date: update.start_date, end_date: update.end_date })
            .eq('id', sprint.id);
          if (error) throw error;
        }
      }
      
      await queryClient.invalidateQueries({ queryKey: ['admin-sprints'] });
      toast({ title: 'Season Updated', description: `Season ${editingSeason} schedule has been updated.` });
      setEditingSeason(null);
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'Failed to update season', variant: 'destructive' });
    } finally {
      setIsSavingEdit(false);
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

  // Count of eligible active students (denominator for participation rate)
  const { data: eligibleCount = 0 } = useQuery({
    queryKey: ['active-student-account-count'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('student_accounts')
        .select('id', { count: 'exact', head: true })
        .eq('is_active', true);
      if (error) throw error;
      return count ?? 0;
    },
  });
  const participationPct = eligibleCount > 0
    ? Math.min(100, Math.round((totalParticipants / eligibleCount) * 100))
    : 0;

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
        <Button 
          onClick={() => setShowSeasonBuilder(!showSeasonBuilder)} 
          variant={showSeasonBuilder ? "outline" : "default"}
          className="gap-2"
        >
          {showSeasonBuilder ? (
            <>
              <X className="h-4 w-4" />
              Cancel
            </>
          ) : (
            <>
              <Plus className="h-4 w-4" />
              New Season
            </>
          )}
        </Button>
      </div>

      {/* Inline Season Builder */}
      {showSeasonBuilder && (() => {
        const nextSeasonNumber = sprints && sprints.length > 0 
          ? Math.max(...sprints.map(s => s.season_number)) + 1 
          : 1;
        
        const s1Start = new Date(builderStartDate);
        const s1End = addDays(s1Start, builderSprintDays);
        const s2Start = new Date(s1End);
        const s2End = addDays(s2Start, builderSprintDays);
        const s3Start = new Date(s2End);
        const s3End = addDays(s3Start, builderSprintDays);
        const totalDays = builderSprintDays * 3;
        
        return (
          <Card className="border-primary/30 bg-gradient-to-br from-primary/5 via-background to-accent/5 overflow-hidden animate-fade-in">
            <CardContent className="p-6 space-y-6">
              {/* Builder Header */}
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Rocket className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="text-lg font-bold">Design Season {nextSeasonNumber}</h3>
                  <p className="text-sm text-muted-foreground">Customize your sprint schedule</p>
                </div>
              </div>

              {/* Controls Row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Start Date Picker */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Start Date</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left font-normal">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {format(builderStartDate, 'PPP')}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarComponent
                        mode="single"
                        selected={builderStartDate}
                        onSelect={(d) => d && setBuilderStartDate(d)}
                        disabled={(date) => date < new Date()}
                        initialFocus
                        className={cn("p-3 pointer-events-auto")}
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Sprint Duration Slider */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-foreground">Sprint Duration</label>
                    <span className="text-sm font-mono font-bold text-primary">{builderSprintDays} days</span>
                  </div>
                  <Slider
                    value={[builderSprintDays]}
                    onValueChange={([v]) => setBuilderSprintDays(v)}
                    min={7}
                    max={28}
                    step={1}
                    className="py-2"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>7 days</span>
                    <span>28 days</span>
                  </div>
                </div>
              </div>

              {/* Visual Timeline */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-foreground">Timeline Preview</label>
                  <Badge variant="secondary" className="font-mono text-xs">{totalDays} days total</Badge>
                </div>
                
                <div className="flex gap-1 h-16 rounded-xl overflow-hidden border border-border/50">
                  {/* Sprint 1 */}
                  <div className="flex-1 bg-primary/15 relative group transition-colors hover:bg-primary/25 flex flex-col items-center justify-center">
                    <span className="text-xs font-bold text-primary">Sprint 1</span>
                    <span className="text-[10px] text-muted-foreground">
                      {format(s1Start, 'MMM d')} – {format(s1End, 'MMM d')}
                    </span>
                  </div>
                  {/* Sprint 2 */}
                  <div className="flex-1 bg-accent/20 relative group transition-colors hover:bg-accent/30 flex flex-col items-center justify-center">
                    <span className="text-xs font-bold text-accent-foreground">Sprint 2</span>
                    <span className="text-[10px] text-muted-foreground">
                      {format(s2Start, 'MMM d')} – {format(s2End, 'MMM d')}
                    </span>
                  </div>
                  {/* Sprint 3 */}
                  <div className="flex-1 bg-secondary/40 relative group transition-colors hover:bg-secondary/60 flex flex-col items-center justify-center">
                    <span className="text-xs font-bold text-secondary-foreground">Sprint 3</span>
                    <span className="text-[10px] text-muted-foreground">
                      {format(s3Start, 'MMM d')} – {format(s3End, 'MMM d')}
                    </span>
                  </div>
                </div>
              </div>

              {/* Info + Action */}
              <div className="flex items-center justify-between pt-2 border-t border-border/50">
                <div className="text-xs text-muted-foreground space-y-0.5">
                  <p>• Sprints run back-to-back (no gaps)</p>
                  <p>• All active students auto-enrolled</p>
                </div>
                <Button onClick={handleCreateSeason} disabled={isCreating} size="lg" className="gap-2 px-8">
                  {isCreating ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Rocket className="h-4 w-4" />
                      Launch Season
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })()}

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

                {/* Enrollment / participation */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Enrolled (solved ≥1):</span>
                    <span className="font-medium font-mono">{totalParticipants}</span>
                    <span className="text-muted-foreground">/ {eligibleCount} eligible</span>
                    <Badge variant="outline" className="ml-auto font-mono text-xs">
                      {participationPct}%
                    </Badge>
                  </div>
                  <Progress value={participationPct} className="h-1.5" />
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
        {selectedSeason && seasonSprints.every(s => getSprintStatus(s) === 'upcoming') && editingSeason !== selectedSeason && (
          <Button variant="outline" size="sm" className="gap-2" onClick={() => handleStartEditSeason(selectedSeason)}>
            <Pencil className="h-3.5 w-3.5" />
            Edit Season
          </Button>
        )}
      </div>

      {/* Sprint Cards for Selected Season */}
      {seasonSprints.length > 0 && (() => {
        const allUpcoming = seasonSprints.every(s => getSprintStatus(s) === 'upcoming');
        const isEditing = editingSeason === selectedSeason;

        return (
          <div className="space-y-4">
            {/* Edit controls for upcoming seasons */}
            {allUpcoming && isEditing && (
              <Card className="border-primary/30 bg-gradient-to-br from-primary/5 via-background to-accent/5 animate-fade-in">
                <CardContent className="p-6 space-y-6">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                      <Pencil className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold">Edit Season {selectedSeason}</h3>
                      <p className="text-sm text-muted-foreground">Adjust schedule before the season starts</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground">Start Date</label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className="w-full justify-start text-left font-normal">
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {format(editStartDate, 'PPP')}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <CalendarComponent
                            mode="single"
                            selected={editStartDate}
                            onSelect={(d) => d && setEditStartDate(d)}
                            disabled={(date) => date < new Date()}
                            initialFocus
                            className={cn("p-3 pointer-events-auto")}
                          />
                        </PopoverContent>
                      </Popover>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-sm font-medium text-foreground">Sprint Duration</label>
                        <span className="text-sm font-mono font-bold text-primary">{editSprintDays} days</span>
                      </div>
                      <Slider
                        value={[editSprintDays]}
                        onValueChange={([v]) => setEditSprintDays(v)}
                        min={7}
                        max={28}
                        step={1}
                        className="py-2"
                      />
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>7 days</span>
                        <span>28 days</span>
                      </div>
                    </div>
                  </div>

                  {/* Preview timeline */}
                  {(() => {
                    const s1S = new Date(editStartDate);
                    const s1E = addDays(s1S, editSprintDays);
                    const s2S = new Date(s1E);
                    const s2E = addDays(s2S, editSprintDays);
                    const s3S = new Date(s2E);
                    const s3E = addDays(s3S, editSprintDays);
                    return (
                      <div className="flex gap-1 h-14 rounded-xl overflow-hidden border border-border/50">
                        <div className="flex-1 bg-primary/15 flex flex-col items-center justify-center">
                          <span className="text-xs font-bold text-primary">Sprint 1</span>
                          <span className="text-[10px] text-muted-foreground">{format(s1S, 'MMM d')} – {format(s1E, 'MMM d')}</span>
                        </div>
                        <div className="flex-1 bg-accent/20 flex flex-col items-center justify-center">
                          <span className="text-xs font-bold text-accent-foreground">Sprint 2</span>
                          <span className="text-[10px] text-muted-foreground">{format(s2S, 'MMM d')} – {format(s2E, 'MMM d')}</span>
                        </div>
                        <div className="flex-1 bg-secondary/40 flex flex-col items-center justify-center">
                          <span className="text-xs font-bold text-secondary-foreground">Sprint 3</span>
                          <span className="text-[10px] text-muted-foreground">{format(s3S, 'MMM d')} – {format(s3E, 'MMM d')}</span>
                        </div>
                      </div>
                    );
                  })()}

                  <div className="flex justify-end gap-2 pt-2 border-t border-border/50">
                    <Button variant="outline" onClick={() => setEditingSeason(null)}>Cancel</Button>
                    <Button onClick={handleSaveSeasonEdit} disabled={isSavingEdit} className="gap-2">
                      {isSavingEdit ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                      {isSavingEdit ? 'Saving...' : 'Save Changes'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}




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
          </div>
        );
      })()}

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
