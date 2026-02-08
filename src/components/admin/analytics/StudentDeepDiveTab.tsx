import { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  BarChart3, BookOpen, Brain, TrendingUp, MessageSquare, User,
  Search, AlertTriangle, Crown, Clock, Trophy, X, Users, Filter
} from 'lucide-react';
import { StudentProfileHeader } from './StudentProfileHeader';
import { StudentOverviewSubTab } from './StudentOverviewSubTab';
import { TopicMasterySubTab } from './TopicMasterySubTab';
import { LearningBehaviorSubTab } from './LearningBehaviorSubTab';
import { ProgressTimelineSubTab } from './ProgressTimelineSubTab';
import { InterventionSubTab } from './InterventionSubTab';
import { useFilteredStudents } from '@/hooks/useAdminAnalytics';
import { cn } from '@/lib/utils';

type QuickFilterType = 'at_risk' | 'top_performers' | 'inactive' | 'sprint_leaders' | null;

const TIER_COLORS: Record<string, string> = {
  ruby: 'bg-red-500/10 text-red-500 border-red-500/30',
  diamond: 'bg-cyan-500/10 text-cyan-500 border-cyan-500/30',
  platinum: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30',
  gold: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/30',
  silver: 'bg-slate-400/10 text-slate-400 border-slate-400/30',
  bronze: 'bg-amber-700/10 text-amber-700 border-amber-700/30',
  unranked: 'bg-muted text-muted-foreground border-border',
};

export function StudentDeepDiveTab() {
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [quickFilter, setQuickFilter] = useState<QuickFilterType>(null);
  const [tierFilter, setTierFilter] = useState<string | null>(null);
  
  const { data: allStudents, isLoading } = useFilteredStudents();

  // Filter students in real-time
  const filteredStudents = useMemo(() => {
    if (!allStudents) return [];
    
    return allStudents.filter(student => {
      // Search filter (name or phone)
      if (searchQuery.length >= 2) {
        const query = searchQuery.toLowerCase();
        const matchesSearch = 
          student.name.toLowerCase().includes(query) ||
          student.phone.includes(query);
        if (!matchesSearch) return false;
      }
      
      // Quick filters
      if (quickFilter === 'at_risk' && student.riskLevel !== 'high') return false;
      if (quickFilter === 'top_performers' && !['ruby', 'diamond', 'platinum'].includes(student.tier.toLowerCase())) return false;
      if (quickFilter === 'inactive' && student.daysSinceLogin < 7) return false;
      if (quickFilter === 'sprint_leaders' && !student.isSprintLeader) return false;
      
      // Tier filter
      if (tierFilter && student.tier.toLowerCase() !== tierFilter) return false;
      
      return true;
    });
  }, [allStudents, searchQuery, quickFilter, tierFilter]);

  // Get tier counts for badges
  const tierCounts = useMemo(() => {
    if (!allStudents) return {};
    const counts: Record<string, number> = {};
    allStudents.forEach(s => {
      const tier = s.tier.toLowerCase();
      counts[tier] = (counts[tier] || 0) + 1;
    });
    return counts;
  }, [allStudents]);

  // Get filter counts
  const filterCounts = useMemo(() => {
    if (!allStudents) return { atRisk: 0, topPerformers: 0, inactive: 0, sprintLeaders: 0 };
    return {
      atRisk: allStudents.filter(s => s.riskLevel === 'high').length,
      topPerformers: allStudents.filter(s => ['ruby', 'diamond', 'platinum'].includes(s.tier.toLowerCase())).length,
      inactive: allStudents.filter(s => s.daysSinceLogin >= 7).length,
      sprintLeaders: allStudents.filter(s => s.isSprintLeader).length,
    };
  }, [allStudents]);

  const handleQuickFilter = (filter: QuickFilterType) => {
    setQuickFilter(prev => prev === filter ? null : filter);
    setTierFilter(null);
    setSelectedStudentId(null);
  };

  const handleTierFilter = (tier: string) => {
    setTierFilter(prev => prev === tier ? null : tier);
    setQuickFilter(null);
    setSelectedStudentId(null);
  };

  const clearFilters = () => {
    setSearchQuery('');
    setQuickFilter(null);
    setTierFilter(null);
  };

  const hasActiveFilters = searchQuery.length > 0 || quickFilter !== null || tierFilter !== null;

  return (
    <div className="space-y-4">
      {/* Filter Island */}
      <Card className="border-border/50 bg-card/50 backdrop-blur">
        <CardContent className="p-4 space-y-4">
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search students by name or phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-11 bg-background/50"
            />
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Quick Filter Badges */}
          <div className="flex flex-wrap gap-2">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mr-2">
              <Filter className="h-3.5 w-3.5" />
              <span>Quick Filters</span>
            </div>
            
            <Badge 
              variant="outline"
              className={cn(
                "cursor-pointer transition-all px-3 py-1.5",
                quickFilter === 'at_risk' 
                  ? 'bg-destructive text-destructive-foreground border-destructive shadow-sm shadow-destructive/25' 
                  : 'hover:bg-destructive/10 hover:text-destructive hover:border-destructive/50'
              )}
              onClick={() => handleQuickFilter('at_risk')}
            >
              <AlertTriangle className="h-3.5 w-3.5 mr-1.5" />
              At Risk
              <span className="ml-1.5 opacity-70">({filterCounts.atRisk})</span>
            </Badge>
            
            <Badge 
              variant="outline"
              className={cn(
                "cursor-pointer transition-all px-3 py-1.5",
                quickFilter === 'top_performers' 
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm shadow-emerald-600/25' 
                  : 'hover:bg-emerald-500/10 hover:text-emerald-500 hover:border-emerald-500/50'
              )}
              onClick={() => handleQuickFilter('top_performers')}
            >
              <Trophy className="h-3.5 w-3.5 mr-1.5" />
              Top Performers
              <span className="ml-1.5 opacity-70">({filterCounts.topPerformers})</span>
            </Badge>
            
            <Badge 
              variant="outline"
              className={cn(
                "cursor-pointer transition-all px-3 py-1.5",
                quickFilter === 'inactive' 
                  ? 'bg-amber-600 text-white border-amber-600 shadow-sm shadow-amber-600/25' 
                  : 'hover:bg-amber-500/10 hover:text-amber-500 hover:border-amber-500/50'
              )}
              onClick={() => handleQuickFilter('inactive')}
            >
              <Clock className="h-3.5 w-3.5 mr-1.5" />
              Inactive 7+ Days
              <span className="ml-1.5 opacity-70">({filterCounts.inactive})</span>
            </Badge>
            
            <Badge 
              variant="outline"
              className={cn(
                "cursor-pointer transition-all px-3 py-1.5",
                quickFilter === 'sprint_leaders' 
                  ? 'bg-primary text-primary-foreground border-primary shadow-sm shadow-primary/25' 
                  : 'hover:bg-primary/10 hover:text-primary hover:border-primary/50'
              )}
              onClick={() => handleQuickFilter('sprint_leaders')}
            >
              <Crown className="h-3.5 w-3.5 mr-1.5" />
              Sprint Leaders
              <span className="ml-1.5 opacity-70">({filterCounts.sprintLeaders})</span>
            </Badge>
          </div>

          {/* Tier Filter Badges */}
          <div className="flex flex-wrap gap-2">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mr-2">
              <Users className="h-3.5 w-3.5" />
              <span>By Tier</span>
            </div>
            
            {['ruby', 'diamond', 'platinum', 'gold', 'silver', 'bronze', 'unranked'].map((tier) => (
              <Badge 
                key={tier}
                variant="outline"
                className={cn(
                  "cursor-pointer transition-all px-3 py-1.5 capitalize",
                  tierFilter === tier 
                    ? `${TIER_COLORS[tier]} shadow-sm` 
                    : `hover:${TIER_COLORS[tier]}`
                )}
                onClick={() => handleTierFilter(tier)}
              >
                {tier}
                <span className="ml-1.5 opacity-70">({tierCounts[tier] || 0})</span>
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Results Count */}
      <div className="flex items-center justify-between px-1">
        <p className="text-sm text-muted-foreground">
          {isLoading ? (
            'Loading students...'
          ) : (
            <>
              Showing <span className="font-medium text-foreground">{filteredStudents.length}</span> of{' '}
              <span className="font-medium text-foreground">{allStudents?.length || 0}</span> students
            </>
          )}
        </p>
        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors underline"
          >
            Clear all filters
          </button>
        )}
      </div>

      {/* Student Grid / Selected Student View */}
      {selectedStudentId ? (
        <div className="space-y-4">
          {/* Back Button */}
          <button
            onClick={() => setSelectedStudentId(null)}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
          >
            ← Back to student list
          </button>

          <StudentProfileHeader studentId={selectedStudentId} />

          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="overview" className="flex items-center gap-1">
                <BarChart3 className="h-3 w-3" />
                <span className="hidden sm:inline">Overview</span>
              </TabsTrigger>
              <TabsTrigger value="mastery" className="flex items-center gap-1">
                <BookOpen className="h-3 w-3" />
                <span className="hidden sm:inline">Mastery</span>
              </TabsTrigger>
              <TabsTrigger value="behavior" className="flex items-center gap-1">
                <Brain className="h-3 w-3" />
                <span className="hidden sm:inline">Behavior</span>
              </TabsTrigger>
              <TabsTrigger value="progress" className="flex items-center gap-1">
                <TrendingUp className="h-3 w-3" />
                <span className="hidden sm:inline">Progress</span>
              </TabsTrigger>
              <TabsTrigger value="intervention" className="flex items-center gap-1">
                <MessageSquare className="h-3 w-3" />
                <span className="hidden sm:inline">Intervention</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="mt-6">
              <StudentOverviewSubTab studentId={selectedStudentId} />
            </TabsContent>
            <TabsContent value="mastery" className="mt-6">
              <TopicMasterySubTab studentId={selectedStudentId} />
            </TabsContent>
            <TabsContent value="behavior" className="mt-6">
              <LearningBehaviorSubTab studentId={selectedStudentId} />
            </TabsContent>
            <TabsContent value="progress" className="mt-6">
              <ProgressTimelineSubTab studentId={selectedStudentId} />
            </TabsContent>
            <TabsContent value="intervention" className="mt-6">
              <InterventionSubTab studentId={selectedStudentId} />
            </TabsContent>
          </Tabs>
        </div>
      ) : (
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 p-4">
                {[...Array(8)].map((_, i) => (
                  <Skeleton key={i} className="h-24 rounded-lg" />
                ))}
              </div>
            ) : filteredStudents.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
                  <User className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold mb-2">No students match your filters</h3>
                <p className="text-muted-foreground max-w-md mb-4">
                  Try adjusting your search or filter criteria.
                </p>
                <button
                  onClick={clearFilters}
                  className="text-sm text-primary hover:underline"
                >
                  Clear all filters
                </button>
              </div>
            ) : (
              <ScrollArea className="h-[600px]">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 p-4">
                  {filteredStudents.map((student) => (
                    <button
                      key={student.id}
                      onClick={() => setSelectedStudentId(student.id)}
                      className={cn(
                        "flex items-start gap-3 p-3 rounded-lg border text-left transition-all",
                        "hover:border-primary/50 hover:bg-accent/50 hover:shadow-sm",
                        "focus:outline-none focus:ring-2 focus:ring-primary/20"
                      )}
                    >
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold shrink-0">
                        {student.initials}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-medium text-sm truncate">{student.name}</p>
                          {student.riskLevel === 'high' && (
                            <AlertTriangle className="h-3.5 w-3.5 text-destructive shrink-0" />
                          )}
                          {student.isSprintLeader && (
                            <Crown className="h-3.5 w-3.5 text-yellow-500 shrink-0" />
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground truncate mb-1.5">
                          {student.batchName || 'No class'}
                        </p>
                        <div className="flex items-center gap-2">
                          <Badge 
                            variant="outline" 
                            className={cn("text-xs px-1.5 py-0", TIER_COLORS[student.tier.toLowerCase()] || TIER_COLORS.unranked)}
                          >
                            {student.tier}
                          </Badge>
                          {student.daysSinceLogin >= 7 && (
                            <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                              <Clock className="h-3 w-3" />
                              {student.daysSinceLogin}d
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
