import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, FileQuestion, Users, Flag, Brain } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { QuestionForm } from '@/components/admin/questions/QuestionForm';
import { QuestionList } from '@/components/admin/questions/QuestionList';

export default function QuestionBank() {
  const [activeTab, setActiveTab] = useState('questions');
  const [formOpen, setFormOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<any>(null);

  // Fetch questions count
  const { data: questionsCount } = useQuery({
    queryKey: ['questions-count'],
    queryFn: async () => {
      const { count } = await supabase
        .from('questions')
        .select('*', { count: 'exact', head: true })
        .eq('is_original', true);
      return count || 0;
    }
  });

  // Fetch pending variations count
  const { data: pendingVariationsCount } = useQuery({
    queryKey: ['pending-variations-count'],
    queryFn: async () => {
      const { count } = await supabase
        .from('ai_variations')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending_review');
      return count || 0;
    }
  });

  // Fetch student accounts count
  const { data: studentsCount } = useQuery({
    queryKey: ['student-accounts-count'],
    queryFn: async () => {
      const { count } = await supabase
        .from('student_accounts')
        .select('*', { count: 'exact', head: true });
      return count || 0;
    }
  });

  // Fetch flagged questions count
  const { data: flaggedCount } = useQuery({
    queryKey: ['flagged-questions-count'],
    queryFn: async () => {
      const { count } = await supabase
        .from('question_flags')
        .select('*', { count: 'exact', head: true })
        .eq('admin_reviewed', false);
      return count || 0;
    }
  });

  const handleEdit = (question: any) => {
    setEditingQuestion(question);
    setFormOpen(true);
  };

  const handleFormClose = (open: boolean) => {
    setFormOpen(open);
    if (!open) {
      setEditingQuestion(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Question Bank</h1>
          <p className="text-muted-foreground">Manage SAT practice questions and variations</p>
        </div>
        <Button className="gap-2" onClick={() => setFormOpen(true)}>
          <Plus className="h-4 w-4" />
          Add Question
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Questions</CardTitle>
            <FileQuestion className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{questionsCount ?? 0}/68</div>
            <p className="text-xs text-muted-foreground">Original questions added</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Review</CardTitle>
            <Brain className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingVariationsCount ?? 0}</div>
            <p className="text-xs text-muted-foreground">AI variations to review</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Practice Students</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{studentsCount ?? 0}</div>
            <p className="text-xs text-muted-foreground">Registered students</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Flagged Questions</CardTitle>
            <Flag className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{flaggedCount ?? 0}</div>
            <p className="text-xs text-muted-foreground">Need attention</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="questions">Questions</TabsTrigger>
          <TabsTrigger value="variations">
            AI Variations
            {(pendingVariationsCount ?? 0) > 0 && (
              <Badge variant="destructive" className="ml-2 h-5 px-1.5">
                {pendingVariationsCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="students">Students</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="flags">
            Flags
            {(flaggedCount ?? 0) > 0 && (
              <Badge variant="destructive" className="ml-2 h-5 px-1.5">
                {flaggedCount}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="questions" className="space-y-4">
          <QuestionList onEdit={handleEdit} />
        </TabsContent>

        <TabsContent value="variations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>AI-Generated Variations</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12 text-muted-foreground">
                <Brain className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No pending variations</p>
                <p className="text-sm">Variations will appear here when generated</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="students" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Practice Students</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No students registered yet</p>
                <p className="text-sm">Students will appear here after they log in at /practice</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Performance Analytics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12 text-muted-foreground">
                <p>Analytics will be available once students start practicing</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="flags" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Flagged Questions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12 text-muted-foreground">
                <Flag className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No flagged questions</p>
                <p className="text-sm">Questions flagged by students will appear here</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Question Form Dialog */}
      <QuestionForm 
        open={formOpen} 
        onOpenChange={handleFormClose}
        editingQuestion={editingQuestion}
      />
    </div>
  );
}
