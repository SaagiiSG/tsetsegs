import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Plus, X, Save, BookOpen, Calculator, AlertTriangle, HelpCircle } from 'lucide-react';
import { ScheduleBuilderTutorial } from './ScheduleBuilderTutorial';

export interface TimeSlot {
  day: string;
  start_time: string;
  end_time: string;
}

interface ScheduleBuilderProps {
  mathSchedule: TimeSlot[];
  englishSchedule: TimeSlot[];
  onMathScheduleChange: (schedule: TimeSlot[]) => void;
  onEnglishScheduleChange: (schedule: TimeSlot[]) => void;
}

const DAYS = [
  { value: 'monday', label: 'Даваа (Mon)' },
  { value: 'tuesday', label: 'Мягмар (Tue)' },
  { value: 'wednesday', label: 'Лхагва (Wed)' },
  { value: 'thursday', label: 'Пүрэв (Thu)' },
  { value: 'friday', label: 'Баасан (Fri)' },
  { value: 'saturday', label: 'Бямба (Sat)' },
  { value: 'sunday', label: 'Ням (Sun)' },
];

// Free time options for flexible scheduling
const TIME_OPTIONS = [
  '08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
  '12:00', '12:10', '12:30', '13:00', '13:30', '14:00', '14:10', '14:20', '14:30',
  '15:00', '15:30', '16:00', '16:20', '16:30', '16:40', '17:00', '17:30',
  '18:00', '18:20', '18:30', '18:40', '19:00', '19:30', '20:00', '20:30', '21:00'
];

interface ScheduleTemplate {
  id: string;
  name: string;
  subject: string;
  schedule_data: TimeSlot[];
}

export function ScheduleBuilder({
  mathSchedule,
  englishSchedule,
  onMathScheduleChange,
  onEnglishScheduleChange,
}: ScheduleBuilderProps) {
  const [templates, setTemplates] = useState<ScheduleTemplate[]>([]);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [savingSubject, setSavingSubject] = useState<'math' | 'english'>('math');
  const [showTutorial, setShowTutorial] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    // Check if user has seen the tutorial
    const hasSeenTutorial = localStorage.getItem('schedule-builder-tutorial-seen');
    if (!hasSeenTutorial) {
      setShowTutorial(true);
    }
  }, []);

  const handleTutorialComplete = () => {
    setShowTutorial(false);
    localStorage.setItem('schedule-builder-tutorial-seen', 'true');
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    const { data, error } = await supabase
      .from('schedule_templates')
      .select('*')
      .order('name');
    
    if (data && !error) {
      setTemplates(data.map(t => ({
        id: t.id,
        name: t.name,
        subject: t.subject,
        schedule_data: (t.schedule_data as unknown as TimeSlot[]) || []
      })));
    }
  };

  const checkOverlap = (slot1: TimeSlot, slot2: TimeSlot): boolean => {
    if (slot1.day !== slot2.day) return false;
    
    const toMinutes = (time: string) => {
      const [h, m] = time.split(':').map(Number);
      return h * 60 + m;
    };
    
    const start1 = toMinutes(slot1.start_time);
    const end1 = toMinutes(slot1.end_time);
    const start2 = toMinutes(slot2.start_time);
    const end2 = toMinutes(slot2.end_time);
    
    return start1 < end2 && start2 < end1;
  };

  const hasOverlap = (): { hasConflict: boolean; conflicts: string[] } => {
    const conflicts: string[] = [];
    
    for (const mathSlot of mathSchedule) {
      for (const englishSlot of englishSchedule) {
        if (checkOverlap(mathSlot, englishSlot)) {
          const dayLabel = DAYS.find(d => d.value === mathSlot.day)?.label || mathSlot.day;
          conflicts.push(`${dayLabel}: Math ${mathSlot.start_time}-${mathSlot.end_time} overlaps with English ${englishSlot.start_time}-${englishSlot.end_time}`);
        }
      }
    }
    
    return { hasConflict: conflicts.length > 0, conflicts };
  };

  const addSlot = (subject: 'math' | 'english') => {
    const defaultSlot = { day: 'monday', start_time: '16:40', end_time: '18:30' };
    
    if (subject === 'math') {
      onMathScheduleChange([...mathSchedule, defaultSlot]);
    } else {
      onEnglishScheduleChange([...englishSchedule, defaultSlot]);
    }
  };

  const updateSlot = (subject: 'math' | 'english', index: number, field: keyof TimeSlot, value: string) => {
    if (subject === 'math') {
      const updated = [...mathSchedule];
      updated[index] = { ...updated[index], [field]: value };
      onMathScheduleChange(updated);
    } else {
      const updated = [...englishSchedule];
      updated[index] = { ...updated[index], [field]: value };
      onEnglishScheduleChange(updated);
    }
  };

  const removeSlot = (subject: 'math' | 'english', index: number) => {
    if (subject === 'math') {
      onMathScheduleChange(mathSchedule.filter((_, i) => i !== index));
    } else {
      onEnglishScheduleChange(englishSchedule.filter((_, i) => i !== index));
    }
  };

  const applyTemplate = (template: ScheduleTemplate) => {
    if (template.subject === 'math') {
      onMathScheduleChange(template.schedule_data);
    } else {
      onEnglishScheduleChange(template.schedule_data);
    }
    toast({
      title: 'Template Applied',
      description: `${template.name} applied to ${template.subject} schedule`,
    });
  };

  const saveAsTemplate = async () => {
    if (!templateName.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a template name',
        variant: 'destructive',
      });
      return;
    }

    const scheduleData = savingSubject === 'math' ? mathSchedule : englishSchedule;
    
    if (scheduleData.length === 0) {
      toast({
        title: 'Error',
        description: 'Cannot save empty schedule as template',
        variant: 'destructive',
      });
      return;
    }

    const { error } = await supabase
      .from('schedule_templates')
      .insert([{
        name: templateName.trim(),
        subject: savingSubject,
        schedule_data: JSON.parse(JSON.stringify(scheduleData)),
        is_global: true,
      }]);

    if (error) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Success',
        description: 'Template saved successfully',
      });
      setTemplateName('');
      setSaveDialogOpen(false);
      fetchTemplates();
    }
  };

  const overlapResult = hasOverlap();

  const renderScheduleSection = (
    subject: 'math' | 'english',
    schedule: TimeSlot[],
    icon: React.ReactNode
  ) => (
    <Card className="flex-1">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            {icon}
            <span>{subject === 'math' ? 'Math Schedule' : 'English Schedule (үнэгүй)'}</span>
          </CardTitle>
          <div className="flex gap-2">
            <Dialog open={saveDialogOpen && savingSubject === subject} onOpenChange={(open) => {
              setSaveDialogOpen(open);
              if (open) setSavingSubject(subject);
            }}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" disabled={schedule.length === 0}>
                  <Save className="w-3 h-3 mr-1" />
                  Save
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Save as Template</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label>Template Name</Label>
                    <Input
                      placeholder="e.g., MWF Afternoon"
                      value={templateName}
                      onChange={(e) => setTemplateName(e.target.value)}
                    />
                  </div>
                  <Button onClick={saveAsTemplate} className="w-full">
                    Save Template
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
            <Button variant="outline" size="sm" onClick={() => addSlot(subject)}>
              <Plus className="w-3 h-3 mr-1" />
              Add
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Templates */}
        {templates.filter(t => t.subject === subject).length > 0 && (
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Quick Templates</Label>
            <div className="flex flex-wrap gap-2">
              {templates.filter(t => t.subject === subject).map((template) => (
                <Badge
                  key={template.id}
                  variant="outline"
                  className="cursor-pointer hover:bg-accent"
                  onClick={() => applyTemplate(template)}
                >
                  {template.name}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Time Slots */}
        {schedule.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No time slots added. Click "Add" to create a schedule.
          </p>
        ) : (
          <div className="space-y-2">
            {schedule.map((slot, index) => (
              <div key={index} className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg flex-wrap">
                {/* Day selector */}
                <Select
                  value={slot.day}
                  onValueChange={(value) => updateSlot(subject, index, 'day', value)}
                >
                  <SelectTrigger className="w-[140px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DAYS.map((day) => (
                      <SelectItem key={day.value} value={day.value}>
                        {day.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Start time */}
                <Select
                  value={slot.start_time}
                  onValueChange={(value) => updateSlot(subject, index, 'start_time', value)}
                >
                  <SelectTrigger className="w-[90px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TIME_OPTIONS.map((time) => (
                      <SelectItem key={time} value={time}>
                        {time}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <span className="text-muted-foreground">-</span>

                {/* End time */}
                <Select
                  value={slot.end_time}
                  onValueChange={(value) => updateSlot(subject, index, 'end_time', value)}
                >
                  <SelectTrigger className="w-[90px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TIME_OPTIONS.map((time) => (
                      <SelectItem key={time} value={time}>
                        {time}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeSlot(subject, index)}
                  className="ml-auto"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <>
      <ScheduleBuilderTutorial isOpen={showTutorial} onComplete={handleTutorialComplete} />
      
      <div className="space-y-4">
        {/* Help button */}
        <div className="flex justify-end">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowTutorial(true)}
            className="text-muted-foreground hover:text-foreground gap-1"
          >
            <HelpCircle className="w-4 h-4" />
            Help
          </Button>
        </div>

        <div className="flex flex-col lg:flex-row gap-4">
          {renderScheduleSection('math', mathSchedule, <Calculator className="w-4 h-4 text-blue-500" />)}
          {renderScheduleSection('english', englishSchedule, <BookOpen className="w-4 h-4 text-purple-500" />)}
        </div>

        {overlapResult.hasConflict && (
          <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive mt-0.5" />
              <div>
                <p className="font-medium text-destructive">Schedule Conflict Detected</p>
                <ul className="text-sm text-destructive/80 mt-1 space-y-1">
                  {overlapResult.conflicts.map((conflict, i) => (
                    <li key={i}>{conflict}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

// Helper function to format schedule for display
export function formatScheduleDisplay(schedule: TimeSlot[], isFree?: boolean): string {
  if (!schedule || schedule.length === 0) return '';
  
  const dayMap: Record<string, string> = {
    'monday': 'Даваа',
    'tuesday': 'Мягмар',
    'wednesday': 'Лхагва',
    'thursday': 'Пүрэв',
    'friday': 'Баасан',
    'saturday': 'Бямба',
    'sunday': 'Ням',
  };

  const formatted = schedule
    .map(slot => `${dayMap[slot.day] || slot.day} ${slot.start_time}-${slot.end_time}`)
    .join(', ');

  return isFree ? `${formatted} (үнэгүй)` : formatted;
}

// Helper to check for overlaps externally
export function checkScheduleOverlap(mathSchedule: TimeSlot[], englishSchedule: TimeSlot[]): boolean {
  const checkOverlap = (slot1: TimeSlot, slot2: TimeSlot): boolean => {
    if (slot1.day !== slot2.day) return false;
    
    const toMinutes = (time: string) => {
      const [h, m] = time.split(':').map(Number);
      return h * 60 + m;
    };
    
    const start1 = toMinutes(slot1.start_time);
    const end1 = toMinutes(slot1.end_time);
    const start2 = toMinutes(slot2.start_time);
    const end2 = toMinutes(slot2.end_time);
    
    return start1 < end2 && start2 < end1;
  };

  for (const mathSlot of mathSchedule) {
    for (const englishSlot of englishSchedule) {
      if (checkOverlap(mathSlot, englishSlot)) {
        return true;
      }
    }
  }
  return false;
}
