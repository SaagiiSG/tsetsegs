import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, BookOpen, GraduationCap, FileText, Edit2, Trash2, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { CreateTemplateDialog } from './CreateTemplateDialog';
import { SessionEditor } from './SessionEditor';
import type { Database } from '@/integrations/supabase/types';

type CourseType = Database['public']['Enums']['course_type'];

interface CurriculumTemplate {
  id: string;
  course_type: CourseType;
  name: string;
  description: string | null;
  total_sessions: number;
  is_active: boolean;
  created_at: string;
}

export function CurriculumBuilder() {
  const [selectedCourse, setSelectedCourse] = useState<CourseType>('SAT');
  const [selectedTemplate, setSelectedTemplate] = useState<CurriculumTemplate | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: templates, isLoading } = useQuery({
    queryKey: ['curriculum-templates', selectedCourse],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('curriculum_templates')
        .select('*')
        .eq('course_type', selectedCourse)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as CurriculumTemplate[];
    },
  });

  const deleteTemplateMutation = useMutation({
    mutationFn: async (templateId: string) => {
      const { error } = await supabase
        .from('curriculum_templates')
        .delete()
        .eq('id', templateId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['curriculum-templates'] });
      setSelectedTemplate(null);
      toast.success('Template deleted');
    },
    onError: () => {
      toast.error('Failed to delete template');
    },
  });

  if (selectedTemplate) {
    return (
      <SessionEditor
        template={selectedTemplate}
        onBack={() => setSelectedTemplate(null)}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Curriculum Builder</h1>
          <p className="text-muted-foreground">Create and manage master curriculum templates</p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          New Template
        </Button>
      </div>

      <Tabs value={selectedCourse} onValueChange={(v) => setSelectedCourse(v as CourseType)}>
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="SAT" className="gap-2">
            <GraduationCap className="w-4 h-4" />
            SAT Curriculum
          </TabsTrigger>
          <TabsTrigger value="IELTS" className="gap-2">
            <BookOpen className="w-4 h-4" />
            IELTS Curriculum
          </TabsTrigger>
        </TabsList>

        <TabsContent value={selectedCourse} className="mt-6">
          {isLoading ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <Card key={i}>
                  <CardHeader>
                    <Skeleton className="h-6 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-20 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : templates?.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <FileText className="w-12 h-12 text-muted-foreground/50 mb-4" />
                <h3 className="font-semibold text-lg mb-2">No curriculum templates yet</h3>
                <p className="text-muted-foreground text-center mb-4">
                  Create your first {selectedCourse} curriculum template to get started.
                </p>
                <Button onClick={() => setIsCreateDialogOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Template
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {templates?.map((template) => (
                <Card
                  key={template.id}
                  className="cursor-pointer hover:shadow-md transition-shadow group"
                  onClick={() => setSelectedTemplate(template)}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <CardTitle className="flex items-center gap-2">
                          {template.name}
                          {template.is_active && (
                            <Badge variant="default" className="text-xs">Active</Badge>
                          )}
                        </CardTitle>
                        <CardDescription>
                          {template.total_sessions} sessions
                        </CardDescription>
                      </div>
                      <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {template.description || 'No description provided'}
                    </p>
                    <div className="flex gap-2 mt-4">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedTemplate(template);
                        }}
                      >
                        <Edit2 className="w-3 h-3 mr-1" />
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive hover:text-destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm('Delete this template? This action cannot be undone.')) {
                            deleteTemplateMutation.mutate(template.id);
                          }
                        }}
                      >
                        <Trash2 className="w-3 h-3 mr-1" />
                        Delete
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <CreateTemplateDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        courseType={selectedCourse}
      />
    </div>
  );
}
