import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Plus,
  Trash2,
  Save,
  FileText,
  CheckCircle,
  Circle,
  PenLine,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { toast } from 'sonner';
import { QuestionEditor } from './QuestionEditor';

interface HomeworkAssignment {
  id: string;
  session_id: string;
  title: string;
  description: string | null;
  submission_type: 'digital' | 'offline' | 'flexible';
  is_published: boolean;
  due_session_number: number | null;
}

interface HomeworkEditorProps {
  sessionId: string;
}

export function HomeworkEditor({ sessionId }: HomeworkEditorProps) {
  const [newAssignment, setNewAssignment] = useState({ title: '', description: '' });
  const [expandedAssignment, setExpandedAssignment] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data: assignments, isLoading } = useQuery({
    queryKey: ['homework-assignments', sessionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('homework_assignments')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data as HomeworkAssignment[];
    },
  });

  const addAssignmentMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('homework_assignments').insert({
        session_id: sessionId,
        title: newAssignment.title,
        description: newAssignment.description || null,
        submission_type: 'flexible',
        is_published: false,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['homework-assignments', sessionId] });
      setNewAssignment({ title: '', description: '' });
      toast.success('Assignment added');
    },
    onError: () => {
      toast.error('Failed to add assignment');
    },
  });

  const updateAssignmentMutation = useMutation({
    mutationFn: async (assignment: Partial<HomeworkAssignment> & { id: string }) => {
      const { error } = await supabase
        .from('homework_assignments')
        .update({
          title: assignment.title,
          description: assignment.description,
          submission_type: assignment.submission_type,
          is_published: assignment.is_published,
        })
        .eq('id', assignment.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['homework-assignments', sessionId] });
      toast.success('Assignment updated');
    },
    onError: () => {
      toast.error('Failed to update assignment');
    },
  });

  const deleteAssignmentMutation = useMutation({
    mutationFn: async (assignmentId: string) => {
      const { error } = await supabase.from('homework_assignments').delete().eq('id', assignmentId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['homework-assignments', sessionId] });
      toast.success('Assignment deleted');
    },
    onError: () => {
      toast.error('Failed to delete assignment');
    },
  });

  const handleAddAssignment = () => {
    if (!newAssignment.title.trim()) {
      toast.error('Please enter an assignment title');
      return;
    }
    addAssignmentMutation.mutate();
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2].map((i) => (
          <Skeleton key={i} className="h-32 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Add new assignment */}
      <Card className="p-4 border-dashed">
        <h4 className="font-medium mb-3 flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Add Homework Assignment
        </h4>
        <div className="space-y-3">
          <Input
            placeholder="Assignment title (e.g., Practice Problems Set 1)"
            value={newAssignment.title}
            onChange={(e) => setNewAssignment({ ...newAssignment, title: e.target.value })}
          />
          <Textarea
            placeholder="Description or instructions (optional)"
            value={newAssignment.description}
            onChange={(e) => setNewAssignment({ ...newAssignment, description: e.target.value })}
            rows={2}
          />
          <Button onClick={handleAddAssignment} disabled={addAssignmentMutation.isPending}>
            <Plus className="w-4 h-4 mr-1" />
            Add Assignment
          </Button>
        </div>
      </Card>

      {/* Assignments list */}
      {assignments?.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          No homework assignments yet. Add your first assignment above.
        </div>
      ) : (
        <div className="space-y-4">
          {assignments?.map((assignment) => (
            <Card key={assignment.id} className="overflow-hidden">
              <div
                className="p-4 cursor-pointer hover:bg-muted/30 transition-colors"
                onClick={() =>
                  setExpandedAssignment(
                    expandedAssignment === assignment.id ? null : assignment.id
                  )
                }
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {expandedAssignment === assignment.id ? (
                      <ChevronDown className="w-5 h-5 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="w-5 h-5 text-muted-foreground" />
                    )}
                    <FileText className="w-5 h-5 text-primary" />
                    <div>
                      <h4 className="font-medium">{assignment.title}</h4>
                      {assignment.description && (
                        <p className="text-sm text-muted-foreground truncate max-w-md">
                          {assignment.description}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={assignment.is_published ? 'default' : 'secondary'}
                    >
                      {assignment.is_published ? 'Published' : 'Draft'}
                    </Badge>
                    <Badge variant="outline">
                      {assignment.submission_type === 'digital'
                        ? 'Digital'
                        : assignment.submission_type === 'offline'
                        ? 'Offline'
                        : 'Flexible'}
                    </Badge>
                  </div>
                </div>
              </div>

              {expandedAssignment === assignment.id && (
                <div className="border-t p-4 bg-muted/20 space-y-4">
                  {/* Assignment settings */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Submission Type</Label>
                      <Select
                        value={assignment.submission_type}
                        onValueChange={(value) =>
                          updateAssignmentMutation.mutate({
                            id: assignment.id,
                            submission_type: value as 'digital' | 'offline' | 'flexible',
                          })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="digital">Digital (online)</SelectItem>
                          <SelectItem value="offline">Offline (in class)</SelectItem>
                          <SelectItem value="flexible">Flexible (either)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-center justify-between md:col-span-2">
                      <div className="space-y-0.5">
                        <Label>Published</Label>
                        <p className="text-xs text-muted-foreground">
                          Students can see published assignments
                        </p>
                      </div>
                      <Switch
                        checked={assignment.is_published}
                        onCheckedChange={(checked) =>
                          updateAssignmentMutation.mutate({
                            id: assignment.id,
                            is_published: checked,
                          })
                        }
                      />
                    </div>
                  </div>

                  {/* Questions section */}
                  <div className="pt-4 border-t">
                    <QuestionEditor assignmentId={assignment.id} />
                  </div>

                  {/* Delete button */}
                  <div className="pt-4 border-t flex justify-end">
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => {
                        if (confirm('Delete this assignment and all its questions?')) {
                          deleteAssignmentMutation.mutate(assignment.id);
                        }
                      }}
                    >
                      <Trash2 className="w-4 h-4 mr-1" />
                      Delete Assignment
                    </Button>
                  </div>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
