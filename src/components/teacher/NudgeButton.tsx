import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { MessageSquare, Copy, Send, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface NudgeButtonProps {
  studentId: string;
  studentName: string;
  teacherId: string;
  batchId: string;
  parentPhone?: string;
  missedClasses?: number;
  missedHomework?: number;
  variant?: 'default' | 'compact';
}

const NUDGE_TEMPLATES = {
  attendance: {
    type: 'attendance_reminder',
    title: 'Attendance Reminder',
    message: (name: string, missed: number) => 
      `Hi! This is a reminder that ${name} has missed ${missed} class${missed > 1 ? 'es' : ''} recently. Regular attendance is key to SAT success. Please ensure they attend upcoming sessions. Thank you!`
  },
  homework: {
    type: 'homework_reminder', 
    title: 'Homework Reminder',
    message: (name: string, missed: number) =>
      `Hi! ${name} has ${missed} incomplete homework assignment${missed > 1 ? 's' : ''}. Completing homework reinforces classroom learning. Please encourage them to catch up. Thank you!`
  },
  general: {
    type: 'general_checkup',
    title: 'General Check-in',
    message: (name: string) =>
      `Hi! Just checking in on ${name}'s SAT preparation progress. If there are any concerns or questions, please don't hesitate to reach out. We're here to help!`
  },
  encouragement: {
    type: 'encouragement',
    title: 'Encouragement',
    message: (name: string) =>
      `Hi! ${name} has been working hard lately. Keep up the great momentum! Consistent practice will lead to excellent results. We believe in them!`
  }
};

export function NudgeButton({
  studentId,
  studentName,
  teacherId,
  batchId,
  parentPhone,
  missedClasses,
  missedHomework,
  variant = 'default'
}: NudgeButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<keyof typeof NUDGE_TEMPLATES | null>(null);
  const [customMessage, setCustomMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [copiedRecently, setCopiedRecently] = useState(false);

  const handleSelectTemplate = (templateKey: keyof typeof NUDGE_TEMPLATES) => {
    const template = NUDGE_TEMPLATES[templateKey];
    let message = '';
    
    if (templateKey === 'attendance' && missedClasses) {
      message = template.message(studentName, missedClasses);
    } else if (templateKey === 'homework' && missedHomework) {
      message = template.message(studentName, missedHomework);
    } else {
      message = template.message(studentName, 0);
    }
    
    setSelectedTemplate(templateKey);
    setCustomMessage(message);
    setIsOpen(true);
  };

  const copyToClipboard = async () => {
    if (!customMessage) return;
    
    try {
      await navigator.clipboard.writeText(customMessage);
      setCopiedRecently(true);
      toast.success('Message copied to clipboard!');
      setTimeout(() => setCopiedRecently(false), 2000);
    } catch {
      toast.error('Failed to copy message');
    }
  };

  const logNudge = async () => {
    if (!selectedTemplate || !customMessage) return;
    
    setIsSending(true);
    try {
      const { error } = await supabase
        .from('student_nudges')
        .insert({
          student_id: studentId,
          teacher_id: teacherId,
          batch_id: batchId,
          nudge_type: NUDGE_TEMPLATES[selectedTemplate].type,
          message: customMessage
        });

      if (error) throw error;

      toast.success('Nudge logged successfully!', {
        description: 'Message copied. Send via your preferred messaging app.'
      });
      
      // Copy to clipboard
      await navigator.clipboard.writeText(customMessage);
      
      setIsOpen(false);
      setSelectedTemplate(null);
      setCustomMessage('');
    } catch (error) {
      console.error('Error logging nudge:', error);
      toast.error('Failed to log nudge');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size={variant === 'compact' ? 'sm' : 'default'}
            className={variant === 'compact' ? 'h-7 px-2 gap-1' : 'gap-2'}
          >
            <MessageSquare className={variant === 'compact' ? 'h-3.5 w-3.5' : 'h-4 w-4'} />
            {variant !== 'compact' && 'Nudge'}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          {missedClasses && missedClasses >= 2 && (
            <DropdownMenuItem onClick={() => handleSelectTemplate('attendance')}>
              <span className="text-destructive">⚠️</span>
              <span className="ml-2">Attendance Reminder</span>
            </DropdownMenuItem>
          )}
          {missedHomework && missedHomework >= 2 && (
            <DropdownMenuItem onClick={() => handleSelectTemplate('homework')}>
              <span className="text-destructive">📝</span>
              <span className="ml-2">Homework Reminder</span>
            </DropdownMenuItem>
          )}
          {((missedClasses && missedClasses >= 2) || (missedHomework && missedHomework >= 2)) && (
            <DropdownMenuSeparator />
          )}
          <DropdownMenuItem onClick={() => handleSelectTemplate('general')}>
            <span>👋</span>
            <span className="ml-2">General Check-in</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleSelectTemplate('encouragement')}>
            <span>🌟</span>
            <span className="ml-2">Encouragement</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Send Nudge to {studentName}
            </DialogTitle>
            <DialogDescription>
              {parentPhone ? (
                <>Parent contact: <span className="font-mono">{parentPhone}</span></>
              ) : (
                'Edit the message below and copy to send via your messaging app.'
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <Textarea
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              placeholder="Type your message..."
              rows={5}
              className="resize-none"
            />

            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="font-medium">Template:</span>
              <span className="capitalize">
                {selectedTemplate ? NUDGE_TEMPLATES[selectedTemplate].title : 'Custom'}
              </span>
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={copyToClipboard}
              disabled={!customMessage}
              className="gap-2"
            >
              {copiedRecently ? (
                <>
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  Copy Message
                </>
              )}
            </Button>
            <Button
              onClick={logNudge}
              disabled={isSending || !customMessage}
              className="gap-2"
            >
              <Send className="h-4 w-4" />
              {isSending ? 'Logging...' : 'Log & Copy'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
