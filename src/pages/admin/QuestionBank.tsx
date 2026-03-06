import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, FileQuestion, Users, Flag, Brain, Settings, Upload, RefreshCw, Database } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { QuestionForm } from '@/components/admin/questions/QuestionForm';
import { CBQuestionForm } from '@/components/admin/questions/CBQuestionForm';
import { QuestionList } from '@/components/admin/questions/QuestionList';
import { VariationsReview } from '@/components/admin/questions/VariationsReview';
import { FlaggedQuestions } from '@/components/admin/questions/FlaggedQuestions';
import { AnalyticsDashboard } from '@/components/admin/questions/AnalyticsDashboard';
import { StudentsTab } from '@/components/admin/questions/StudentsTab';
import { CategoryManager } from '@/components/admin/questions/CategoryManager';
import { CBQuestionImport } from '@/components/admin/questions/CBQuestionImport';
import { CBImportReviewSessions } from '@/components/admin/questions/CBImportReviewSessions';
import { EnglishQuestionImport } from '@/components/admin/questions/EnglishQuestionImport';
import { toast } from '@/hooks/use-toast';

export default function QuestionBank() {
  const [activeTab, setActiveTab] = useState('questions-68');
  const [formOpen, setFormOpen] = useState(false);
  const [cbFormOpen, setCbFormOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<any>(null);
  const [editingCBQuestion, setEditingCBQuestion] = useState<any>(null);
  const [syncDialogOpen, setSyncDialogOpen] = useState(false);
  const [syncSubject, setSyncSubject] = useState<string>('all');
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<any>(null);

  // Fetch 68 questions count (excluding bluebook questions)
  const { data: questions68Count } = useQuery({
    queryKey: ['questions-68-count'],
    queryFn: async () => {
      // Get bluebook question IDs to exclude
      const { data: bluebookQuestionIds } = await supabase
        .from('bluebook_module_questions')
        .select('question_id');
      
      const excludeIds = bluebookQuestionIds?.map(q => q.question_id).filter(Boolean) || [];

      let query = supabase
        .from('questions')
        .select('*', { count: 'exact', head: true })
        .eq('is_original', true)
        .eq('question_set', '68');
      
      if (excludeIds.length > 0) {
        query = query.not('id', 'in', `(${excludeIds.join(',')})`);
      }
      
      const { count } = await query;
      return count || 0;
    }
  });

  // Fetch CB questions count (excluding bluebook questions)
  const { data: questionsCBCount } = useQuery({
    queryKey: ['questions-cb-count'],
    queryFn: async () => {
      // Get bluebook question IDs to exclude
      const { data: bluebookQuestionIds } = await supabase
        .from('bluebook_module_questions')
        .select('question_id');
      
      const excludeIds = bluebookQuestionIds?.map(q => q.question_id).filter(Boolean) || [];

      let query = supabase
        .from('questions')
        .select('*', { count: 'exact', head: true })
        .eq('is_original', true)
        .eq('question_set', 'CollegeBoard');
      
      if (excludeIds.length > 0) {
        query = query.not('id', 'in', `(${excludeIds.join(',')})`);
      }
      
      const { count } = await query;
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
    if (question.question_set === 'CollegeBoard') {
      setEditingCBQuestion(question);
      setCbFormOpen(true);
    } else {
      setEditingQuestion(question);
      setFormOpen(true);
    }
  };

  const handleFormClose = (open: boolean) => {
    setFormOpen(open);
    if (!open) {
      setEditingQuestion(null);
    }
  };

  const handleCBFormClose = (open: boolean) => {
    setCbFormOpen(open);
    if (!open) {
      setEditingCBQuestion(null);
    }
  };

  const handleAddQuestion = () => {
    if (activeTab === 'questions-cb') {
      setCbFormOpen(true);
    } else {
      setFormOpen(true);
    }
  };

  const getAddButtonText = () => {
    if (activeTab === 'questions-68') return 'Add 68 Question';
    if (activeTab === 'questions-cb') return 'Add CB Question';
    return null;
  };

  const handleSync = async (dryRun = false) => {
    setSyncing(true);
    setSyncResult(null);
    try {
      const { data, error } = await supabase.functions.invoke('sync-external-questions', {
        body: {
          subject: syncSubject === 'all' ? undefined : syncSubject,
          dry_run: dryRun,
        },
      });
      if (error) throw error;
      setSyncResult(data);
      if (!dryRun && data?.success) {
        toast({
          title: 'Sync Complete',
          description: `Imported ${data.imported} questions, skipped ${data.skipped} duplicates.`,
        });
      }
    } catch (err: any) {
      toast({
        title: 'Sync Failed',
        description: err.message || 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="space-y-4 md:space-y-6 px-2 md:px-0">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Question Bank</h1>
          <p className="text-sm text-muted-foreground">Manage SAT practice questions</p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <Button
            variant="outline"
            className="gap-2"
            onClick={() => { setSyncResult(null); setSyncDialogOpen(true); }}
          >
            <Database className="h-4 w-4" />
            <span className="hidden sm:inline">Sync External</span>
            <span className="sm:hidden">Sync</span>
          </Button>
          {getAddButtonText() && (
            <Button 
              className={`gap-2 flex-1 sm:flex-initial ${activeTab === 'questions-cb' ? 'bg-purple-600 hover:bg-purple-700' : ''}`}
              onClick={handleAddQuestion}
            >
              <Plus className="h-4 w-4" />
              {getAddButtonText()}
            </Button>
          )}
        </div>
        {getAddButtonText() && (
          <Button 
            className={`gap-2 w-full sm:w-auto ${activeTab === 'questions-cb' ? 'bg-purple-600 hover:bg-purple-700' : ''}`}
            onClick={handleAddQuestion}
          >
            <Plus className="h-4 w-4" />
            {getAddButtonText()}
          </Button>
        )}
      </div>

      {/* Sync External DB Dialog */}
      <Dialog open={syncDialogOpen} onOpenChange={setSyncDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Sync External Questions
            </DialogTitle>
            <DialogDescription>
              Fetch questions from the external database and import them into your question bank.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Subject Filter</label>
              <Select value={syncSubject} onValueChange={setSyncSubject}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Subjects</SelectItem>
                  <SelectItem value="math">Math Only</SelectItem>
                  <SelectItem value="english">English Only</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {syncResult && (
              <Card>
                <CardContent className="pt-4 space-y-2 text-sm">
                  {syncResult.preview ? (
                    <>
                      <p className="font-medium">Preview: {syncResult.total_found} questions found</p>
                      {syncResult.sample?.map((s: any, i: number) => (
                        <div key={i} className="text-muted-foreground text-xs border-l-2 border-primary pl-2">
                          <span className="font-mono">{s.question_id}</span> ({s.subject}) — {s.question_text}
                        </div>
                      ))}
                    </>
                  ) : (
                    <>
                      <p className="font-medium text-green-600">✓ Sync Complete</p>
                      <p>Found: {syncResult.total_found}</p>
                      <p>Imported: {syncResult.imported}</p>
                      <p>Skipped (duplicates): {syncResult.skipped}</p>
                      {syncResult.errors > 0 && (
                        <p className="text-destructive">Errors: {syncResult.errors}</p>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          <DialogFooter className="flex gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => handleSync(true)}
              disabled={syncing}
            >
              {syncing ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : null}
              Preview
            </Button>
            <Button
              onClick={() => handleSync(false)}
              disabled={syncing}
            >
              {syncing ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : <Database className="h-4 w-4 mr-2" />}
              Import Now
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <div className="flex gap-3 overflow-x-auto pb-2 md:grid md:grid-cols-4 md:gap-4 md:overflow-visible -mx-2 px-2 md:mx-0 md:px-0">
        <Card className="cursor-pointer hover:shadow-md transition-shadow min-w-[140px] flex-shrink-0 md:min-w-0" onClick={() => setActiveTab('questions-68')}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 md:p-6 md:pb-2">
            <CardTitle className="text-xs font-medium">68 Questions</CardTitle>
            <FileQuestion className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
            <div className="text-xl md:text-2xl font-bold">{questions68Count ?? 0}/68</div>
            <p className="text-xs text-muted-foreground hidden sm:block">Original questions</p>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow min-w-[140px] flex-shrink-0 md:min-w-0" onClick={() => setActiveTab('questions-cb')}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 md:p-6 md:pb-2">
            <CardTitle className="text-xs font-medium">CollegeBoard</CardTitle>
            <FileQuestion className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
            <div className="text-xl md:text-2xl font-bold">{questionsCBCount ?? 0}</div>
            <p className="text-xs text-muted-foreground hidden sm:block">Imported CB</p>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow min-w-[140px] flex-shrink-0 md:min-w-0" onClick={() => setActiveTab('students')}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 md:p-6 md:pb-2">
            <CardTitle className="text-xs font-medium">Students</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
            <div className="text-xl md:text-2xl font-bold">{studentsCount ?? 0}</div>
            <p className="text-xs text-muted-foreground hidden sm:block">Registered</p>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow min-w-[140px] flex-shrink-0 md:min-w-0" onClick={() => setActiveTab('flags')}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 md:p-6 md:pb-2">
            <CardTitle className="text-xs font-medium">Flagged</CardTitle>
            <Flag className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
            <div className="text-xl md:text-2xl font-bold">{flaggedCount ?? 0}</div>
            <p className="text-xs text-muted-foreground hidden sm:block">Need attention</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <div className="overflow-x-auto -mx-2 px-2 md:mx-0 md:px-0">
          <TabsList className="inline-flex w-max md:w-auto md:flex-wrap h-auto gap-1 p-1">
            <TabsTrigger value="questions-68" className="text-xs md:text-sm px-2 md:px-3">68 Q's</TabsTrigger>
            <TabsTrigger value="questions-cb" className="text-xs md:text-sm px-2 md:px-3">CB ({questionsCBCount ?? 0})</TabsTrigger>
            <TabsTrigger value="import" className="text-xs md:text-sm px-2 md:px-3">
              <Upload className="h-3 w-3 md:h-4 md:w-4 mr-1" />
              <span className="hidden sm:inline">Import </span>Math
            </TabsTrigger>
            <TabsTrigger value="import-english" className="text-xs md:text-sm px-2 md:px-3">
              <Upload className="h-3 w-3 md:h-4 md:w-4 mr-1" />
              <span className="hidden sm:inline">Import </span>Eng
            </TabsTrigger>
            <TabsTrigger value="variations" className="text-xs md:text-sm px-2 md:px-3">
              AI
              {(pendingVariationsCount ?? 0) > 0 && (
                <Badge variant="destructive" className="ml-1 h-4 px-1 text-[10px]">
                  {pendingVariationsCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="students" className="text-xs md:text-sm px-2 md:px-3">Students</TabsTrigger>
            <TabsTrigger value="analytics" className="text-xs md:text-sm px-2 md:px-3">Analytics</TabsTrigger>
            <TabsTrigger value="flags" className="text-xs md:text-sm px-2 md:px-3">
              Flags
              {(flaggedCount ?? 0) > 0 && (
                <Badge variant="destructive" className="ml-1 h-4 px-1 text-[10px]">
                  {flaggedCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="settings" className="text-xs md:text-sm px-2 md:px-3">
              <Settings className="h-3 w-3 md:h-4 md:w-4" />
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="questions-68" className="space-y-4">
          <QuestionList onEdit={handleEdit} questionSet="68" />
        </TabsContent>

        <TabsContent value="questions-cb" className="space-y-4">
          <QuestionList onEdit={handleEdit} questionSet="CB" />
        </TabsContent>

        <TabsContent value="import" className="space-y-4">
          <CBQuestionImport />
          <CBImportReviewSessions />
        </TabsContent>

        <TabsContent value="import-english" className="space-y-4">
          <EnglishQuestionImport />
        </TabsContent>

        <TabsContent value="variations" className="space-y-4">
          <VariationsReview />
        </TabsContent>

        <TabsContent value="students" className="space-y-4">
          <StudentsTab />
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <AnalyticsDashboard />
        </TabsContent>

        <TabsContent value="flags" className="space-y-4">
          <FlaggedQuestions />
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <CategoryManager />
        </TabsContent>
      </Tabs>

      {/* Question Form Dialog */}
      <QuestionForm 
        open={formOpen} 
        onOpenChange={handleFormClose}
        editingQuestion={editingQuestion}
      />

      {/* CB Question Form Dialog */}
      <CBQuestionForm
        open={cbFormOpen}
        onOpenChange={handleCBFormClose}
        editingQuestion={editingCBQuestion}
      />
    </div>
  );
}
