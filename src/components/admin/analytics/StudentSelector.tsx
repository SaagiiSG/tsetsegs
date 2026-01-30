import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, X, User, ChevronDown } from 'lucide-react';
import { useStudentSearch } from '@/hooks/useAdminAnalytics';

interface StudentSelectorProps {
  selectedStudentId: string | null;
  onSelectStudent: (studentId: string | null) => void;
}

export function StudentSelector({ selectedStudentId, onSelectStudent }: StudentSelectorProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [riskFilter, setRiskFilter] = useState<string>('all');
  const [batchFilter, setBatchFilter] = useState<string>('all');
  const [tierFilter, setTierFilter] = useState<string>('all');
  const [recentlyViewed, setRecentlyViewed] = useState<Array<{ id: string; name: string }>>([]);
  
  const { data: searchResults, isLoading } = useStudentSearch(searchQuery);

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
                  <span className="text-muted-foreground">Search students...</span>
                </div>
                <ChevronDown className="h-4 w-4 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[300px] p-0" align="start">
              <Command>
                <CommandInput 
                  placeholder="Search by name or phone..." 
                  value={searchQuery}
                  onValueChange={setSearchQuery}
                />
                <CommandList>
                  <CommandEmpty>
                    {isLoading ? 'Searching...' : 'No students found.'}
                  </CommandEmpty>
                  {searchResults && searchResults.length > 0 && (
                    <CommandGroup heading="Results">
                      {searchResults.map((student) => (
                        <CommandItem
                          key={student.id}
                          value={student.id}
                          onSelect={() => handleSelectStudent(student)}
                        >
                          <div className="flex items-center gap-2">
                            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium">
                              {student.initials}
                            </div>
                            <div>
                              <p className="font-medium">{student.name}</p>
                              <p className="text-xs text-muted-foreground">{student.batchName}</p>
                            </div>
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  )}
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>

          {/* Filters */}
          <div className="flex flex-wrap gap-2">
            <Select value={batchFilter} onValueChange={setBatchFilter}>
              <SelectTrigger className="w-[140px] h-9">
                <SelectValue placeholder="All Classes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Classes</SelectItem>
                <SelectItem value="jan2025">Jan 2025</SelectItem>
                <SelectItem value="dec2024">Dec 2024</SelectItem>
              </SelectContent>
            </Select>

            <Select value={riskFilter} onValueChange={setRiskFilter}>
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

            <Select value={tierFilter} onValueChange={setTierFilter}>
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

          {/* Quick Filters */}
          <div className="flex flex-wrap gap-2">
            <Badge 
              variant="outline" 
              className="cursor-pointer hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 transition-colors"
            >
              At Risk
            </Badge>
            <Badge 
              variant="outline" 
              className="cursor-pointer hover:bg-green-500/10 hover:text-green-500 hover:border-green-500/30 transition-colors"
            >
              Top Performers
            </Badge>
            <Badge 
              variant="outline" 
              className="cursor-pointer hover:bg-yellow-500/10 hover:text-yellow-500 hover:border-yellow-500/30 transition-colors"
            >
              Inactive 7+
            </Badge>
            <Badge 
              variant="outline" 
              className="cursor-pointer hover:bg-primary/10 hover:text-primary hover:border-primary/30 transition-colors"
            >
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
