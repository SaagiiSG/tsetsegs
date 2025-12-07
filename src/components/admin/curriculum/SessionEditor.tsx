import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  ArrowLeft,
  BookOpen,
  Clock,
  Save,
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  FileText,
  ListChecks,
} from 'lucide-react';
import { toast } from 'sonner';
import { TopicEditor } from './TopicEditor';
import { HomeworkEditor } from './HomeworkEditor';
import type { Database } from '@/integrations/supabase/types';

type CourseType = Database['public']['Enums']['course_type'];

interface CurriculumTemplate {
  id: string;
  course_type: CourseType;
  name: string;
  description: string | null;
  total_sessions: number;
  is_active: boolean;
}

interface CurriculumSession {
  id: string;
  template_id: string;
  session_number: number;
  title: string;
  objectives: string | null;
  teacher_notes: string | null;
  duration_minutes: number | null;
}

interface SessionEditorProps {
  template: CurriculumTemplate;
  onBack: () => void;
}

export function SessionEditor({ template, onBack }: SessionEditorProps) {
  const [selectedSession, setSelectedSession] = useState<CurriculumSession | null>(null);
  const [expandedSessions, setExpandedSessions] = useState<Set<string>>(new Set());
  const [editingSession, setEditingSession] = useState<CurriculumSession | null>(null);
  const [activeTab, setActiveTab] = useState<'content' | 'topics' | 'homework'>('content');
  const queryClient = useQueryClient();

  const { data: sessions, isLoading } = useQuery({
    queryKey: ['curriculum-sessions', template.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('curriculum_sessions')
        .select('*')
        .eq('template_id', template.id)
        .order('session_number', { ascending: true });

      if (error) throw error;
      return data as CurriculumSession[];
    },
  });

  const updateSessionMutation = useMutation({
    mutationFn: async (session: Partial<CurriculumSession> & { id: string }) => {
      const { error } = await supabase
        .from('curriculum_sessions')
        .update({
          title: session.title,
          objectives: session.objectives,
          teacher_notes: session.teacher_notes,
          duration_minutes: session.duration_minutes,
        })
        .eq('id', session.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['curriculum-sessions', template.id] });
      toast.success('Session saved');
      setEditingSession(null);
    },
    onError: () => {
      toast.error('Failed to save session');
    },
  });

  const toggleExpanded = (sessionId: string) => {
    setExpandedSessions((prev) => {
      const next = new Set(prev);
      if (next.has(sessionId)) {
        next.delete(sessionId);
      } else {
        next.add(sessionId);
      }
      return next;
    });
  };

  const handleSaveSession = () => {
    if (!editingSession) return;
    updateSessionMutation.mutate(editingSession);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold">{template.name}</h1>
            <Badge variant={template.is_active ? 'default' : 'secondary'}>
              {template.is_active ? 'Active' : 'Inactive'}
            </Badge>
          </div>
          <p className="text-muted-foreground">
            {template.course_type} • {template.total_sessions} sessions
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sessions List */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <BookOpen className="w-5 h-5" />
              Sessions
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[600px]">
              {isLoading ? (
                <div className="p-4 space-y-2">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : (
                <div className="divide-y">
                  {sessions?.map((session) => (
                    <div
                      key={session.id}
                      className={`p-3 cursor-pointer hover:bg-muted/50 transition-colors ${
                        selectedSession?.id === session.id ? 'bg-primary/5 border-l-2 border-primary' : ''
                      }`}
                      onClick={() => {
                        setSelectedSession(session);
                        setEditingSession({ ...session });
                        setActiveTab('content');
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold bg-muted px-2 py-1 rounded">
                            {session.session_number}
                          </span>
                          <span className="font-medium text-sm truncate max-w-[180px]">
                            {session.title}
                          </span>
                        </div>
                        {session.objectives && (
                          <Badge variant="outline" className="text-xs">
                            ✓
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Session Editor */}
        <Card className="lg:col-span-2">
          {selectedSession && editingSession ? (
            <>
              <CardHeader className="pb-3 border-b">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">
                    Session {selectedSession.session_number}
                  </CardTitle>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant={activeTab === 'content' ? 'default' : 'outline'}
                      onClick={() => setActiveTab('content')}
                    >
                      <FileText className="w-4 h-4 mr-1" />
                      Content
                    </Button>
                    <Button
                      size="sm"
                      variant={activeTab === 'topics' ? 'default' : 'outline'}
                      onClick={() => setActiveTab('topics')}
                    >
                      <ListChecks className="w-4 h-4 mr-1" />
                      Topics
                    </Button>
                    <Button
                      size="sm"
                      variant={activeTab === 'homework' ? 'default' : 'outline'}
                      onClick={() => setActiveTab('homework')}
                    >
                      <BookOpen className="w-4 h-4 mr-1" />
                      Homework
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                {activeTab === 'content' && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="title">Session Title</Label>
                        <Input
                          id="title"
                          value={editingSession.title}
                          onChange={(e) =>
                            setEditingSession({ ...editingSession, title: e.target.value })
                          }
                          placeholder="e.g., Introduction to Algebra"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="duration">Duration (minutes)</Label>
                        <Input
                          id="duration"
                          type="number"
                          value={editingSession.duration_minutes || 120}
                          onChange={(e) =>
                            setEditingSession({
                              ...editingSession,
                              duration_minutes: parseInt(e.target.value) || 120,
                            })
                          }
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="objectives">Learning Objectives</Label>
                      <Textarea
                        id="objectives"
                        value={editingSession.objectives || ''}
                        onChange={(e) =>
                          setEditingSession({ ...editingSession, objectives: e.target.value })
                        }
                        placeholder="What students should learn by the end of this session..."
                        rows={4}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="notes">Teacher Notes (internal)</Label>
                      <Textarea
                        id="notes"
                        value={editingSession.teacher_notes || ''}
                        onChange={(e) =>
                          setEditingSession({ ...editingSession, teacher_notes: e.target.value })
                        }
                        placeholder="Private notes for teachers..."
                        rows={3}
                      />
                    </div>

                    <div className="flex justify-end">
                      <Button onClick={handleSaveSession} disabled={updateSessionMutation.isPending}>
                        <Save className="w-4 h-4 mr-2" />
                        {updateSessionMutation.isPending ? 'Saving...' : 'Save Changes'}
                      </Button>
                    </div>
                  </div>
                )}

                {activeTab === 'topics' && (
                  <TopicEditor sessionId={selectedSession.id} />
                )}

                {activeTab === 'homework' && (
                  <HomeworkEditor sessionId={selectedSession.id} />
                )}
              </CardContent>
            </>
          ) : (
            <CardContent className="flex flex-col items-center justify-center h-[600px] text-center">
              <BookOpen className="w-12 h-12 text-muted-foreground/50 mb-4" />
              <h3 className="font-semibold text-lg mb-2">Select a Session</h3>
              <p className="text-muted-foreground">
                Choose a session from the list to edit its content, topics, and homework.
              </p>
            </CardContent>
          )}
        </Card>
      </div>
    </div>
  );
}
