import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { OverviewTab } from '@/components/admin/analytics/OverviewTab';
import { QuestionPerformanceTab } from '@/components/admin/analytics/QuestionPerformanceTab';
import { StudentDeepDiveTab } from '@/components/admin/analytics/StudentDeepDiveTab';
import { ClassComparisonTab } from '@/components/admin/analytics/ClassComparisonTab';
import { QuestionHealthTab } from '@/components/admin/analytics/QuestionHealthTab';
import { BarChart3, FileQuestion, Users, GitCompare, Stethoscope } from 'lucide-react';

const AnalyticsDashboard = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'overview';

  const handleTabChange = (value: string) => {
    setSearchParams({ tab: value });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Analytics Dashboard</h1>
        <p className="text-muted-foreground">
          Comprehensive insights for SAT prep platform performance and student progress.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="grid w-full grid-cols-5 lg:w-auto lg:inline-grid">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            <span className="hidden sm:inline">Overview</span>
          </TabsTrigger>
          <TabsTrigger value="questions" className="flex items-center gap-2">
            <FileQuestion className="h-4 w-4" />
            <span className="hidden sm:inline">Questions</span>
          </TabsTrigger>
          <TabsTrigger value="health" className="flex items-center gap-2">
            <Stethoscope className="h-4 w-4" />
            <span className="hidden sm:inline">Health</span>
          </TabsTrigger>
          <TabsTrigger value="students" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">Students</span>
          </TabsTrigger>
          <TabsTrigger value="comparison" className="flex items-center gap-2">
            <GitCompare className="h-4 w-4" />
            <span className="hidden sm:inline">Compare</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          <OverviewTab />
        </TabsContent>

        <TabsContent value="questions" className="mt-6">
          <QuestionPerformanceTab />
        </TabsContent>

        <TabsContent value="health" className="mt-6">
          <QuestionHealthTab />
        </TabsContent>

        <TabsContent value="students" className="mt-6">
          <StudentDeepDiveTab />
        </TabsContent>

        <TabsContent value="comparison" className="mt-6">
          <ClassComparisonTab />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AnalyticsDashboard;
