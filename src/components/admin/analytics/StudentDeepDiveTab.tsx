import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Search, User, BarChart3, BookOpen, Brain, TrendingUp, MessageSquare } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export function StudentDeepDiveTab() {
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <div className="space-y-6">
      {/* Sticky Student Selector */}
      <Card className="sticky top-0 z-10 bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
        <CardContent className="py-4">
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Quick Filters */}
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline" className="cursor-pointer hover:bg-destructive/10 hover:text-destructive">
                At Risk
              </Badge>
              <Badge variant="outline" className="cursor-pointer hover:bg-green-500/10 hover:text-green-500">
                Top Performers
              </Badge>
              <Badge variant="outline" className="cursor-pointer hover:bg-yellow-500/10 hover:text-yellow-500">
                Inactive 7+
              </Badge>
              <Badge variant="outline" className="cursor-pointer hover:bg-primary/10 hover:text-primary">
                Sprint Leaders
              </Badge>
            </div>
          </div>

          {/* Recently Viewed */}
          <div className="mt-4 flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Recent:</span>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-6 w-20 rounded-full" />
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Student Profile or Empty State */}
      {!selectedStudent ? (
        <Card>
          <CardContent className="py-16">
            <div className="flex flex-col items-center justify-center text-center">
              <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
                <User className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Select a Student</h3>
              <p className="text-muted-foreground max-w-md">
                Use the search above to find a student or click on quick filters to see students matching specific criteria.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Profile Header */}
          <Card>
            <CardContent className="py-6">
              <div className="flex flex-col md:flex-row gap-6 items-start md:items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-2xl font-bold text-primary">JD</span>
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">John Doe</h2>
                    <p className="text-muted-foreground">+976 9999 1234</p>
                    <Badge variant="secondary" className="mt-1">January 2025 SAT</Badge>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground">Rank</p>
                    <p className="text-lg font-bold text-yellow-500">Gold</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground">Level</p>
                    <p className="text-lg font-bold">12</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground">Hours</p>
                    <p className="text-lg font-bold">24.5</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground">Risk</p>
                    <Badge variant="outline" className="text-green-500 border-green-500">Low</Badge>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline">Message</Button>
                  <Button size="sm" variant="outline">Assign</Button>
                  <Button size="sm" variant="outline">View Account</Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Sub-Tabs */}
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
              <div className="h-[400px] flex items-center justify-center border-2 border-dashed rounded-lg">
                <p className="text-muted-foreground">Student overview coming in Phase 4</p>
              </div>
            </TabsContent>

            <TabsContent value="mastery" className="mt-6">
              <div className="h-[400px] flex items-center justify-center border-2 border-dashed rounded-lg">
                <p className="text-muted-foreground">Topic mastery grid coming in Phase 4</p>
              </div>
            </TabsContent>

            <TabsContent value="behavior" className="mt-6">
              <div className="h-[400px] flex items-center justify-center border-2 border-dashed rounded-lg">
                <p className="text-muted-foreground">Learning behavior charts coming in Phase 4</p>
              </div>
            </TabsContent>

            <TabsContent value="progress" className="mt-6">
              <div className="h-[400px] flex items-center justify-center border-2 border-dashed rounded-lg">
                <p className="text-muted-foreground">Progress timeline coming in Phase 4</p>
              </div>
            </TabsContent>

            <TabsContent value="intervention" className="mt-6">
              <div className="h-[400px] flex items-center justify-center border-2 border-dashed rounded-lg">
                <p className="text-muted-foreground">Intervention panel coming in Phase 4</p>
              </div>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}
