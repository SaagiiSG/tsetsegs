import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, ChevronDown, AlertTriangle, Crown, Clock, Trophy } from 'lucide-react';
import { useFilteredStudents } from '@/hooks/useAdminAnalytics';

interface StudentSelectorProps {
  selectedStudentId: string | null;
  onSelectStudent: (studentId: string | null) => void;
}

type QuickFilterType = 'at_risk' | 'top_performers' | 'inactive' | 'sprint_leaders' | null;

export function StudentSelector({ selectedStudentId, onSelectStudent }: StudentSelectorProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [riskFilter, setRiskFilter] = useState<string>('all');
  const [batchFilter, setBatchFilter] = useState<string>('all');
  const [tierFilter, setTierFilter] = useState<string>('all');
  const [quickFilter, setQuickFilter] = useState<QuickFilterType>(null);
  const [recentlyViewed, setRecentlyViewed] = useState<Array<{ id: string; name: string }>>([]);
  
  const { data: allStudents, isLoading } = useFilteredStudents();

  // Get unique batches from data for dynamic filter options
  const batchOptions = useMemo(() => {
    if (!allStudents) return [];
    const batches = [...new Set(allStudents.map(s => s.batchName))];
    return batches.filter(b => b && b !== 'Unassigned').sort();
  }, [allStudents]);

  // Filter students based on all filters
  const filteredStudents = useMemo(() => {
    if (!allStudents) return [];
    
    return allStudents.filter(student => {
      // Search filter
      if (searchQuery && searchQuery.length >= 2) {
        const matchesSearch = 
          student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          student.phone.includes(searchQuery);
        if (!matchesSearch) return false;
      }
      
      // Batch filter
      if (batchFilter !== 'all' && student.batchName !== batchFilter) {
        return false;
      }
      
      // Risk filter
      if (riskFilter !== 'all' && student.riskLevel !== riskFilter) {
        return false;
      }
      
      // Tier filter
      if (tierFilter !== 'all' && student.tier.toLowerCase() !== tierFilter) {
        return false;
      }
      
      // Quick filters (badges)
      if (quickFilter === 'at_risk' && student.riskLevel !== 'high') {
        return false;
      }
      if (quickFilter === 'top_performers' && !['ruby', 'diamond'].includes(student.tier.toLowerCase())) {
        return false;
      }
      if (quickFilter === 'inactive' && student.daysSinceLogin < 7) {
        return false;
      }
      if (quickFilter === 'sprint_leaders' && !student.isSprintLeader) {
        return false;
      }
      
      return true;
    });
  }, [allStudents, searchQuery, batchFilter, riskFilter, tierFilter, quickFilter]);

  // Load recently viewed from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('analytics-recent-students');
    if (stored) {
      try {
        setRecentlyViewed(JSON.parse(stored));
      } catch (e) {
        console.error('Failed to parse recent students');
      }
    }
  }, []);

  // Save to recently viewed
  const handleSelectStudent = (student: { id: string; name: string }) => {
    onSelectStudent(student.id);
    setOpen(false);
    
    // Update recently viewed
    const updated = [
      student,
      ...recentlyViewed.filter(s => s.id !== student.id)
    ].slice(0, 5);
    setRecentlyViewed(updated);
    localStorage.setItem('analytics-recent-students', JSON.stringify(updated));
  };

  const handleQuickFilter = (filter: QuickFilterType) => {
    if (quickFilter === filter) {
      setQuickFilter(null);
    } else {
      setQuickFilter(filter);
      // Clear other filters when using quick filter
      setRiskFilter('all');
      setTierFilter('all');
    }
  };

  const getTierBadgeColor = (tier: string) => {
    switch (tier.toLowerCase()) {
      case 'ruby': return 'bg-red-500/10 text-red-500 border-red-500/30';
      case 'diamond': return 'bg-cyan-500/10 text-cyan-500 border-cyan-500/30';
      case 'gold': return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/30';
      case 'silver': return 'bg-slate-400/10 text-slate-400 border-slate-400/30';
      default: return 'bg-amber-700/10 text-amber-700 border-amber-700/30';
    }
  };

  return (
    <Card className="sticky top-0 z-10 bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
      <CardContent className="py-4">
        <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center">
          {/* Search */}
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={open}
                className="w-full lg:w-[300px] justify-between"
              >
                <div className="flex items-center gap-2">
                  <Search className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">
                    {filteredStudents.length} students match filters
                  </span>
                </div>
                <ChevronDown className="h-4 w-4 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[350px] p-0" align="start">
              <Command shouldFilter={false}>
                <CommandInput 
                  placeholder="Search by name or phone..." 
                  value={searchQuery}
                  onValueChange={setSearchQuery}
                />
                <CommandList>
                  {isLoading ? (
                    <div className="p-4 space-y-2">
                      {[1, 2, 3].map(i => <Skeleton key={i} className="h-10 w-full" />)}
                    </div>
                  ) : filteredStudents.length === 0 ? (
                    <CommandEmpty>No students match filters.</CommandEmpty>
                  ) : (
                    <CommandGroup heading={`${filteredStudents.length} Students`}>
                      <ScrollArea className="h-[300px]">
                        {filteredStudents.map((student) => (
                          <CommandItem
                            key={student.id}
                            value={student.id}
                            onSelect={() => handleSelectStudent(student)}
                            className="cursor-pointer"
                          >
                            <div className="flex items-center justify-between w-full gap-2">
                              <div className="flex items-center gap-2">
                                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium">
                                  {student.initials}
                                </div>
                                <div>
                                  <p className="font-medium text-sm">{student.name}</p>
                                  <p className="text-xs text-muted-foreground">{student.batchName}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-1">
                                {student.riskLevel === 'high' && (
                                  <AlertTriangle className="h-3 w-3 text-destructive" />
                                )}
                                {student.isSprintLeader && (
                                  <Crown className="h-3 w-3 text-yellow-500" />
                                )}
                                <Badge variant="outline" className={`text-xs ${getTierBadgeColor(student.tier)}`}>
                                  {student.tier}
                                </Badge>
                              </div>
                            </div>
                          </CommandItem>
                        ))}
                      </ScrollArea>
                    </CommandGroup>
                  )}
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>

          {/* Filters */}
          <div className="flex flex-wrap gap-2">
            <Select value={batchFilter} onValueChange={(v) => { setBatchFilter(v); setQuickFilter(null); }}>
              <SelectTrigger className="w-[140px] h-9">
                <SelectValue placeholder="All Classes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Classes</SelectItem>
                {batchOptions.map((batch: string) => (
                  <SelectItem key={batch} value={batch}>{batch}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={riskFilter} onValueChange={(v) => { setRiskFilter(v); setQuickFilter(null); }}>
              <SelectTrigger className="w-[120px] h-9">
                <SelectValue placeholder="Risk Level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Risk</SelectItem>
                <SelectItem value="high">High Risk</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low Risk</SelectItem>
              </SelectContent>
            </Select>

            <Select value={tierFilter} onValueChange={(v) => { setTierFilter(v); setQuickFilter(null); }}>
              <SelectTrigger className="w-[120px] h-9">
                <SelectValue placeholder="Rank Tier" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Tiers</SelectItem>
                <SelectItem value="ruby">Ruby</SelectItem>
                <SelectItem value="diamond">Diamond</SelectItem>
                <SelectItem value="gold">Gold</SelectItem>
                <SelectItem value="silver">Silver</SelectItem>
                <SelectItem value="bronze">Bronze</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Quick Filters (Badges) */}
          <div className="flex flex-wrap gap-2">
            <Badge 
              variant={quickFilter === 'at_risk' ? 'default' : 'outline'}
              className={`cursor-pointer transition-colors ${
                quickFilter === 'at_risk' 
                  ? 'bg-destructive text-destructive-foreground' 
                  : 'hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30'
              }`}
              onClick={() => handleQuickFilter('at_risk')}
            >
              <AlertTriangle className="h-3 w-3 mr-1" />
              At Risk
            </Badge>
            <Badge 
              variant={quickFilter === 'top_performers' ? 'default' : 'outline'}
              className={`cursor-pointer transition-colors ${
                quickFilter === 'top_performers' 
                  ? 'bg-green-600 text-white' 
                  : 'hover:bg-green-500/10 hover:text-green-500 hover:border-green-500/30'
              }`}
              onClick={() => handleQuickFilter('top_performers')}
            >
              <Trophy className="h-3 w-3 mr-1" />
              Top Performers
            </Badge>
            <Badge 
              variant={quickFilter === 'inactive' ? 'default' : 'outline'}
              className={`cursor-pointer transition-colors ${
                quickFilter === 'inactive' 
                  ? 'bg-yellow-600 text-white' 
                  : 'hover:bg-yellow-500/10 hover:text-yellow-500 hover:border-yellow-500/30'
              }`}
              onClick={() => handleQuickFilter('inactive')}
            >
              <Clock className="h-3 w-3 mr-1" />
              Inactive 7+
            </Badge>
            <Badge 
              variant={quickFilter === 'sprint_leaders' ? 'default' : 'outline'}
              className={`cursor-pointer transition-colors ${
                quickFilter === 'sprint_leaders' 
                  ? 'bg-primary text-primary-foreground' 
                  : 'hover:bg-primary/10 hover:text-primary hover:border-primary/30'
              }`}
              onClick={() => handleQuickFilter('sprint_leaders')}
            >
              <Crown className="h-3 w-3 mr-1" />
              Sprint Leaders
            </Badge>
          </div>
        </div>

        {/* Recently Viewed */}
        {recentlyViewed.length > 0 && (
          <div className="mt-4 flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Recent:</span>
            <div className="flex gap-1 flex-wrap">
              {recentlyViewed.map((student) => (
                <Badge
                  key={student.id}
                  variant={selectedStudentId === student.id ? 'default' : 'secondary'}
                  className="cursor-pointer"
                  onClick={() => onSelectStudent(student.id)}
                >
                  {student.name}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
