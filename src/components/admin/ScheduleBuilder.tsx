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
import { Plus, X, Save, BookOpen, Calculator, AlertTriangle, HelpCircle, Download } from 'lucide-react';
import { ScheduleBuilderTutorial } from './ScheduleBuilderTutorial';
import { formatJsonSchedule } from '@/lib/classUtils';

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
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [existingBatches, setExistingBatches] = useState<any[]>([]);
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
    fetchExistingBatches();
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

  const fetchExistingBatches = async () => {
    const { data, error } = await supabase
      .from('batches')
      .select('id, batch_name, start_date, math_schedule, english_schedule, schedule')
      .order('start_date', { ascending: false })
      .limit(30);
    
    if (data && !error) {
      // Include ALL batches - either with new format or legacy text schedule
      const batchesWithSchedules = data.filter(b => 
        (b.math_schedule && Array.isArray(b.math_schedule) && b.math_schedule.length > 0) ||
        (b.english_schedule && Array.isArray(b.english_schedule) && b.english_schedule.length > 0) ||
        (b.schedule && b.schedule.trim().length > 0)
      );
      setExistingBatches(batchesWithSchedules);
    }
  };

  // Parse legacy text schedule into TimeSlot array
  const parseLegacySchedule = (scheduleText: string): TimeSlot[] => {
    const slots: TimeSlot[] = [];
    if (!scheduleText) return slots;

    // Common patterns: "Mon-Wed-Fri 14:20-16:10" or "MWF 14:20-16:10" or "Даваа, Лхагва 16:40-18:30"
    const dayMappings: Record<string, string> = {
      'mon': 'monday', 'monday': 'monday', 'даваа': 'monday',
      'tue': 'tuesday', 'tuesday': 'tuesday', 'мягмар': 'tuesday',
      'wed': 'wednesday', 'wednesday': 'wednesday', 'лхагва': 'wednesday',
      'thu': 'thursday', 'thursday': 'thursday', 'пүрэв': 'thursday',
      'fri': 'friday', 'friday': 'friday', 'баасан': 'friday',
      'sat': 'saturday', 'saturday': 'saturday', 'бямба': 'saturday',
      'sun': 'sunday', 'sunday': 'sunday', 'ням': 'sunday',
      'm': 'monday', 'w': 'wednesday', 'f': 'friday',
    };

    // Try to extract time pattern (HH:MM-HH:MM)
    const timeMatch = scheduleText.match(/(\d{1,2}:\d{2})\s*[-–]\s*(\d{1,2}:\d{2})/);
    const startTime = timeMatch ? timeMatch[1].padStart(5, '0') : '16:40';
    const endTime = timeMatch ? timeMatch[2].padStart(5, '0') : '18:30';

    // Extract days from the text
    const lowerText = scheduleText.toLowerCase();
    
    // Handle MWF pattern
    if (/\bmwf\b/.test(lowerText)) {
      ['monday', 'wednesday', 'friday'].forEach(day => {
        slots.push({ day, start_time: startTime, end_time: endTime });
      });
      return slots;
    }

    // Handle TTH pattern
    if (/\btth\b/.test(lowerText) || /\btt\b/.test(lowerText)) {
      ['tuesday', 'thursday'].forEach(day => {
        slots.push({ day, start_time: startTime, end_time: endTime });
      });
      return slots;
    }

    // Try to find individual day names
    for (const [key, value] of Object.entries(dayMappings)) {
      if (key.length > 1 && lowerText.includes(key)) {
        if (!slots.find(s => s.day === value)) {
          slots.push({ day: value, start_time: startTime, end_time: endTime });
        }
      }
    }

    // If no days found, default to common pattern
    if (slots.length === 0) {
      slots.push({ day: 'monday', start_time: startTime, end_time: endTime });
    }

    return slots;
  };

  const hasNewFormatSchedule = (batch: any): boolean => {
    return (batch.math_schedule && Array.isArray(batch.math_schedule) && batch.math_schedule.length > 0) ||
           (batch.english_schedule && Array.isArray(batch.english_schedule) && batch.english_schedule.length > 0);
  };

  const importFromBatch = (batch: any) => {
    let imported = false;

    // Check for new format first
    if (batch.math_schedule && Array.isArray(batch.math_schedule) && batch.math_schedule.length > 0) {
      onMathScheduleChange(batch.math_schedule as TimeSlot[]);
      imported = true;
    }
    if (batch.english_schedule && Array.isArray(batch.english_schedule) && batch.english_schedule.length > 0) {
      onEnglishScheduleChange(batch.english_schedule as TimeSlot[]);
      imported = true;
    }

    // Fall back to legacy text schedule
    if (!imported && batch.schedule) {
      const parsedSchedule = parseLegacySchedule(batch.schedule);
      if (parsedSchedule.length > 0) {
        // Apply to math by default for legacy schedules
        onMathScheduleChange(parsedSchedule);
        imported = true;
      }
    }

    setImportDialogOpen(false);
    toast({
      title: 'Schedule Imported',
      description: `Imported schedule from ${batch.batch_name || 'batch'}${!hasNewFormatSchedule(batch) ? ' (parsed from legacy format)' : ''}`,
    });
  };

  const saveScheduleAsTemplate = async (batch: any) => {
    const batchName = batch.batch_name || 'Imported';
    let savedCount = 0;

    // Save math schedule as template if exists
    if (batch.math_schedule && Array.isArray(batch.math_schedule) && batch.math_schedule.length > 0) {
      const { error } = await supabase
        .from('schedule_templates')
        .insert([{
          name: `${batchName} - Math`,
          subject: 'math',
          schedule_data: JSON.parse(JSON.stringify(batch.math_schedule)),
          is_global: true,
        }]);
      if (!error) savedCount++;
    }

    // Save english schedule as template if exists
    if (batch.english_schedule && Array.isArray(batch.english_schedule) && batch.english_schedule.length > 0) {
      const { error } = await supabase
        .from('schedule_templates')
        .insert([{
          name: `${batchName} - English`,
          subject: 'english',
          schedule_data: JSON.parse(JSON.stringify(batch.english_schedule)),
          is_global: true,
        }]);
      if (!error) savedCount++;
    }

    if (savedCount > 0) {
      toast({
        title: 'Templates Saved',
        description: `Saved ${savedCount} template(s) from ${batchName}`,
      });
      fetchTemplates();
    } else {
      toast({
        title: 'No Templates Saved',
        description: 'No valid schedules found to save',
        variant: 'destructive',
      });
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
    <Card className="flex-1" data-tutorial={`${subject}-section`}>
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
                <Button 
                  variant="outline" 
                  size="sm" 
                  disabled={schedule.length === 0}
                  data-tutorial={`save-${subject}`}
                >
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
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => addSlot(subject)}
              data-tutorial={`add-${subject}`}
            >
              <Plus className="w-3 h-3 mr-1" />
              Add
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Templates */}
        {templates.filter(t => t.subject === subject).length > 0 ? (
          <div className="space-y-2" data-tutorial={`templates-${subject}`}>
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
        ) : (
          <div data-tutorial={`templates-${subject}`} className="text-xs text-muted-foreground">
            No templates saved yet
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
        {/* Top actions */}
        <div className="flex justify-between items-center">
          <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
            <DialogTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="gap-1"
              >
                <Download className="w-4 h-4" />
                Import from Existing Class
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Import Schedule from Existing Class</DialogTitle>
              </DialogHeader>
              <div className="space-y-3 pt-4 max-h-[400px] overflow-y-auto">
                {existingBatches.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-sm text-muted-foreground mb-2">
                      No existing classes with the new schedule format found.
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Only classes created with the new schedule builder will appear here.
                    </p>
                  </div>
                ) : (
                  existingBatches.map((batch) => (
                    <div
                      key={batch.id}
                      className="p-3 border border-border rounded-lg hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{batch.batch_name || 'Unnamed Batch'}</p>
                          {!hasNewFormatSchedule(batch) && (
                            <Badge variant="secondary" className="text-xs">Legacy</Badge>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {new Date(batch.start_date).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="space-y-1 text-xs text-muted-foreground mb-3">
                        {hasNewFormatSchedule(batch) ? (
                          <>
                            {batch.math_schedule && Array.isArray(batch.math_schedule) && batch.math_schedule.length > 0 && (
                              <p>
                                <span className="text-blue-500">Math:</span>{' '}
                                {formatJsonSchedule(batch.math_schedule as TimeSlot[])}
                              </p>
                            )}
                            {batch.english_schedule && Array.isArray(batch.english_schedule) && batch.english_schedule.length > 0 && (
                              <p>
                                <span className="text-purple-500">English:</span>{' '}
                                {formatJsonSchedule(batch.english_schedule as TimeSlot[])}
                              </p>
                            )}
                          </>
                        ) : (
                          <p>
                            <span className="text-orange-500">Schedule:</span>{' '}
                            {batch.schedule}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="default"
                          className="flex-1"
                          onClick={() => importFromBatch(batch)}
                        >
                          Use This Schedule
                        </Button>
                        {hasNewFormatSchedule(batch) && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => saveScheduleAsTemplate(batch)}
                          >
                            <Save className="w-3 h-3 mr-1" />
                            Save as Template
                          </Button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </DialogContent>
          </Dialog>

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
