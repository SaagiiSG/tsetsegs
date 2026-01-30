import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart3, BookOpen, Brain, TrendingUp, MessageSquare, User } from 'lucide-react';
import { StudentSelector } from './StudentSelector';
import { StudentProfileHeader } from './StudentProfileHeader';
import { StudentOverviewSubTab } from './StudentOverviewSubTab';
import { TopicMasterySubTab } from './TopicMasterySubTab';
import { LearningBehaviorSubTab } from './LearningBehaviorSubTab';
import { ProgressTimelineSubTab } from './ProgressTimelineSubTab';
import { InterventionSubTab } from './InterventionSubTab';

export function StudentDeepDiveTab() {
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      <StudentSelector 
        selectedStudentId={selectedStudentId} 
        onSelectStudent={setSelectedStudentId} 
      />

      {!selectedStudentId ? (
        <Card>
          <CardContent className="py-16">
            <div className="flex flex-col items-center justify-center text-center">
              <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
                <User className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Select a Student</h3>
              <p className="text-muted-foreground max-w-md">
                Use the search above to find a student or click on quick filters.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
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
        </>
      )}
    </div>
  );
}