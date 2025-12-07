import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Trash2, GripVertical, Save, Clock, Link as LinkIcon } from 'lucide-react';
import { toast } from 'sonner';

interface SessionTopic {
  id: string;
  session_id: string;
  title: string;
  description: string | null;
  duration_minutes: number | null;
  order_index: number;
  resources: { url: string; label: string }[];
}

interface TopicEditorProps {
  sessionId: string;
}

export function TopicEditor({ sessionId }: TopicEditorProps) {
  const [newTopic, setNewTopic] = useState({ title: '', description: '', duration: 30 });
  const [editingTopic, setEditingTopic] = useState<SessionTopic | null>(null);
  const queryClient = useQueryClient();

  const { data: topics, isLoading } = useQuery({
    queryKey: ['session-topics', sessionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('session_topics')
        .select('*')
        .eq('session_id', sessionId)
        .order('order_index', { ascending: true });

      if (error) throw error;
      return data.map((t) => ({
        ...t,
        resources: (t.resources as { url: string; label: string }[]) || [],
      })) as SessionTopic[];
    },
  });

  const addTopicMutation = useMutation({
    mutationFn: async () => {
      const maxOrder = topics?.length ? Math.max(...topics.map((t) => t.order_index)) + 1 : 0;

      const { error } = await supabase.from('session_topics').insert({
        session_id: sessionId,
        title: newTopic.title,
        description: newTopic.description || null,
        duration_minutes: newTopic.duration,
        order_index: maxOrder,
        resources: [],
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['session-topics', sessionId] });
      setNewTopic({ title: '', description: '', duration: 30 });
      toast.success('Topic added');
    },
    onError: () => {
      toast.error('Failed to add topic');
    },
  });

  const updateTopicMutation = useMutation({
    mutationFn: async (topic: SessionTopic) => {
      const { error } = await supabase
        .from('session_topics')
        .update({
          title: topic.title,
          description: topic.description,
          duration_minutes: topic.duration_minutes,
          resources: topic.resources,
        })
        .eq('id', topic.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['session-topics', sessionId] });
      setEditingTopic(null);
      toast.success('Topic updated');
    },
    onError: () => {
      toast.error('Failed to update topic');
    },
  });

  const deleteTopicMutation = useMutation({
    mutationFn: async (topicId: string) => {
      const { error } = await supabase.from('session_topics').delete().eq('id', topicId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['session-topics', sessionId] });
      toast.success('Topic deleted');
    },
    onError: () => {
      toast.error('Failed to delete topic');
    },
  });

  const handleAddTopic = () => {
    if (!newTopic.title.trim()) {
      toast.error('Please enter a topic title');
      return;
    }
    addTopicMutation.mutate();
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Add new topic */}
      <Card className="p-4 border-dashed">
        <h4 className="font-medium mb-3 flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Add New Topic
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Input
            placeholder="Topic title"
            value={newTopic.title}
            onChange={(e) => setNewTopic({ ...newTopic, title: e.target.value })}
          />
          <Input
            placeholder="Brief description"
            value={newTopic.description}
            onChange={(e) => setNewTopic({ ...newTopic, description: e.target.value })}
          />
          <div className="flex gap-2">
            <Input
              type="number"
              placeholder="Duration (min)"
              value={newTopic.duration}
              onChange={(e) => setNewTopic({ ...newTopic, duration: parseInt(e.target.value) || 30 })}
              className="w-24"
            />
            <Button onClick={handleAddTopic} disabled={addTopicMutation.isPending}>
              <Plus className="w-4 h-4 mr-1" />
              Add
            </Button>
          </div>
        </div>
      </Card>

      {/* Topics list */}
      {topics?.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          No topics added yet. Add your first topic above.
        </div>
      ) : (
        <div className="space-y-3">
          {topics?.map((topic, index) => (
            <Card
              key={topic.id}
              className={`p-4 ${editingTopic?.id === topic.id ? 'ring-2 ring-primary' : ''}`}
            >
              {editingTopic?.id === topic.id ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Title</Label>
                      <Input
                        value={editingTopic.title}
                        onChange={(e) =>
                          setEditingTopic({ ...editingTopic, title: e.target.value })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Duration (minutes)</Label>
                      <Input
                        type="number"
                        value={editingTopic.duration_minutes || 30}
                        onChange={(e) =>
                          setEditingTopic({
                            ...editingTopic,
                            duration_minutes: parseInt(e.target.value) || 30,
                          })
                        }
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Textarea
                      value={editingTopic.description || ''}
                      onChange={(e) =>
                        setEditingTopic({ ...editingTopic, description: e.target.value })
                      }
                      rows={2}
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setEditingTopic(null)}>
                      Cancel
                    </Button>
                    <Button
                      onClick={() => updateTopicMutation.mutate(editingTopic)}
                      disabled={updateTopicMutation.isPending}
                    >
                      <Save className="w-4 h-4 mr-1" />
                      Save
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <GripVertical className="w-4 h-4 cursor-grab" />
                      <span className="text-xs font-bold bg-muted px-2 py-1 rounded">
                        {index + 1}
                      </span>
                    </div>
                    <div>
                      <h4 className="font-medium">{topic.title}</h4>
                      {topic.description && (
                        <p className="text-sm text-muted-foreground mt-1">{topic.description}</p>
                      )}
                      {topic.duration_minutes && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground mt-2">
                          <Clock className="w-3 h-3" />
                          {topic.duration_minutes} min
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setEditingTopic(topic)}
                    >
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive hover:text-destructive"
                      onClick={() => {
                        if (confirm('Delete this topic?')) {
                          deleteTopicMutation.mutate(topic.id);
                        }
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
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
