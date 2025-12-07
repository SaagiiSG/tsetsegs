import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import type { Database } from '@/integrations/supabase/types';

type CourseType = Database['public']['Enums']['course_type'];

interface CreateTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  courseType: CourseType;
}

export function CreateTemplateDialog({ open, onOpenChange, courseType }: CreateTemplateDialogProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isActive, setIsActive] = useState(true);
  const queryClient = useQueryClient();

  const totalSessions = courseType === 'IELTS' ? 24 : 15;

  const createMutation = useMutation({
    mutationFn: async () => {
      // Create the template
      const { data: template, error: templateError } = await supabase
        .from('curriculum_templates')
        .insert({
          name,
          description: description || null,
          course_type: courseType,
          total_sessions: totalSessions,
          is_active: isActive,
        })
        .select()
        .single();

      if (templateError) throw templateError;

      // Auto-create empty sessions
      const sessions = Array.from({ length: totalSessions }, (_, i) => ({
        template_id: template.id,
        session_number: i + 1,
        title: `Session ${i + 1}`,
        objectives: '',
        teacher_notes: '',
        duration_minutes: 120,
      }));

      const { error: sessionsError } = await supabase
        .from('curriculum_sessions')
        .insert(sessions);

      if (sessionsError) throw sessionsError;

      return template;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['curriculum-templates'] });
      toast.success('Curriculum template created!');
      resetForm();
      onOpenChange(false);
    },
    onError: (error) => {
      console.error('Error creating template:', error);
      toast.error('Failed to create template');
    },
  });

  const resetForm = () => {
    setName('');
    setDescription('');
    setIsActive(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Please enter a template name');
      return;
    }
    createMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create {courseType} Curriculum Template</DialogTitle>
          <DialogDescription>
            Create a new curriculum template with {totalSessions} sessions.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Template Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={`e.g., ${courseType} Core Curriculum 2025`}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description (optional)</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the focus and goals of this curriculum..."
              rows={3}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="active">Active Template</Label>
              <p className="text-xs text-muted-foreground">
                Teachers can only see active templates
              </p>
            </div>
            <Switch
              id="active"
              checked={isActive}
              onCheckedChange={setIsActive}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Creating...' : 'Create Template'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
