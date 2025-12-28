import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { z } from 'zod';
import { isOnlineClass } from '@/lib/classUtils';
import { ScheduleBuilder, TimeSlot, checkScheduleOverlap, formatScheduleDisplay } from './ScheduleBuilder';
import { ChevronDown, ChevronUp, Calendar } from 'lucide-react';

const studentSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100, "Name must be less than 100 characters"),
  phone: z.string().trim().regex(/^[0-9+\-\s()]+$/, "Phone must contain only numbers and valid characters").max(20, "Phone must be less than 20 characters")
});

// Legacy schedules for backward compatibility
const legacySchedules = [
  'Даваа/Лхагва/Баасан 16:40-18:30 (Math) + Бямба 14:10-16:10 (English - үнэгүй)',
  'Даваа/Лхагва/Баасан 18:40-20:30 (Math) + Бямба 16:20-18:20 (English - үнэгүй)',
  'Мягмар/Пүрэв 16:40-18:30 (Math) + Бямба 10:00-12:00 (Math) + 12:00-14:00 (English - үнэгүй)',
  'Мягмар/Пүрэв 18:40-20:30 (Math) + Бямба 12:10-14:10 (Math) + 14:10-16:10 (English - үнэгүй)',
  'Даваа/Лхагва/Баасан 18:40-20:30 (Math - Online) + Бямба 18:30-20:00 (English - үнэгүй)',
  'Мягмар/Пүрэв 16:30-18:30 + Бямба 10:00-12:00 + Ням 10:00-14:00 (Mock - үнэгүй)',
  'Мягмар/Пүрэв 16:30-18:30 + Бямба 12:00-14:00 + Ням 12:00-16:00 (Mock - үнэгүй)',
  'Даваа-Пүрэв 12:00-14:00 (Math) + Баасан 12:00-14:00 (English - үнэгүй) [Holiday]',
  'Даваа-Пүрэв 14:10-16:10 (Math) + Баасан 14:10-16:10 (English - үнэгүй) [Holiday]',
];

const rooms = ['1114 (11th floor)', '1105 (11th floor)', '905 (9th floor)', 'Online'];

type CourseType = 'SAT' | 'IELTS';

interface CreateBatchFormProps {
  onSuccess: () => void;
}

export function CreateBatchForm({ onSuccess }: CreateBatchFormProps) {
  const [studentList, setStudentList] = useState('');
  const [teacher, setTeacher] = useState('');
  const [selectedTeachers, setSelectedTeachers] = useState<string[]>([]);
  const [room, setRoom] = useState('');
  const [startDate, setStartDate] = useState('');
  const [fbGroupLink, setFbGroupLink] = useState('');
  const [courseType, setCourseType] = useState<CourseType>('SAT');
  const [teachers, setTeachers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  // New schedule builder state
  const [useScheduleBuilder, setUseScheduleBuilder] = useState(true);
  const [mathSchedule, setMathSchedule] = useState<TimeSlot[]>([]);
  const [englishSchedule, setEnglishSchedule] = useState<TimeSlot[]>([]);
  const [legacySchedule, setLegacySchedule] = useState('');
  const [scheduleBuilderOpen, setScheduleBuilderOpen] = useState(true);

  useEffect(() => {
    fetchTeachers();
  }, []);

  useEffect(() => {
    // Auto-set room to "Online" when online schedule is selected
    if (legacySchedule && isOnlineClass(legacySchedule)) {
      setRoom('Online');
    }
  }, [legacySchedule]);

  const fetchTeachers = async () => {
    const { data } = await supabase.from('teachers').select('*').order('name');
    if (data) setTeachers(data);
  };

  const generateUniqueId = () => {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  };

  const generateBatchName = (teacherName: string, startDate: string) => {
    const date = new Date(startDate);
    const month = date.toLocaleString('default', { month: 'long' });
    const year = date.getFullYear();
    return `(${month} ${year} Intake) - ${teacherName}`;
  };

  // Combine math and english schedules into a display string for the legacy 'schedule' field
  const getCombinedScheduleString = (): string => {
    if (!useScheduleBuilder) return legacySchedule;
    
    const mathStr = formatScheduleDisplay(mathSchedule);
    const englishStr = formatScheduleDisplay(englishSchedule);
    
    let combined = '';
    if (mathStr) combined += `(Math) ${mathStr}`;
    if (englishStr) combined += (combined ? ' + ' : '') + `(English) ${englishStr}`;
    
    return combined || '';
  };

  const handleCreateBatch = async () => {
    const teacherValue = courseType === 'IELTS' 
      ? selectedTeachers.join(', ')
      : teacher;
    
    const scheduleString = getCombinedScheduleString();
    
    if (!studentList || !teacherValue || !room || !startDate) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    if (useScheduleBuilder && mathSchedule.length === 0 && englishSchedule.length === 0) {
      toast({
        title: "Missing Schedule",
        description: "Please add at least one time slot for Math or English",
        variant: "destructive"
      });
      return;
    }

    if (!useScheduleBuilder && !legacySchedule) {
      toast({
        title: "Missing Schedule",
        description: "Please select a schedule",
        variant: "destructive"
      });
      return;
    }

    // Check for schedule overlap
    if (useScheduleBuilder && checkScheduleOverlap(mathSchedule, englishSchedule)) {
      toast({
        title: "Schedule Conflict",
        description: "Math and English schedules cannot overlap. Please adjust the times.",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);

    try {
      const students = studentList
        .split('\n')
        .filter(line => line.trim())
        .map(line => {
          const match = line.match(/^\d+\.\s*(.+?)\s*-\s*(.+)$/);
          if (match) {
            const studentData = { name: match[1].trim(), phone: match[2].trim() };
            const validation = studentSchema.safeParse(studentData);
            if (!validation.success) {
              toast({
                title: "Invalid Student Data",
                description: `${studentData.name}: ${validation.error.errors[0].message}`,
                variant: "destructive"
              });
              return null;
            }
            return studentData;
          }
          return null;
        })
        .filter(Boolean);

      if (students.length === 0) {
        toast({
          title: "Invalid Format",
          description: "Please use the format: 1. Name - Phone",
          variant: "destructive"
        });
        setIsLoading(false);
        return;
      }

      const batchLinkId = generateUniqueId();
      const teacherName = courseType === 'IELTS'
        ? selectedTeachers.map(id => teachers.find(t => t.id === id)?.name || id).join(', ')
        : teachers.find(t => t.id === teacher)?.name || teacher;
      const batchName = generateBatchName(teacherName, startDate);

      const { data: batch, error: batchError } = await supabase
        .from('batches')
        .insert({
          teacher: teacherName,
          room,
          schedule: scheduleString,
          start_date: startDate,
          fb_group_link: fbGroupLink,
          unique_link_id: batchLinkId,
          batch_name: batchName,
          course_type: courseType,
          math_schedule: useScheduleBuilder ? JSON.parse(JSON.stringify(mathSchedule)) : null,
          english_schedule: useScheduleBuilder ? JSON.parse(JSON.stringify(englishSchedule)) : null,
        })
        .select()
        .single();

      if (batchError) throw batchError;

      const studentsToInsert = students.map((student: any) => ({
        ...student,
        batch_id: batch.id,
        unique_link_id: generateUniqueId(),
        accessed: false,
      }));

      const { error: studentsError } = await supabase
        .from('students')
        .insert(studentsToInsert);

      if (studentsError) throw studentsError;

      toast({
        title: "Success",
        description: `Batch created with ${students.length} students`
      });

      // Reset form
      setStudentList('');
      setTeacher('');
      setSelectedTeachers([]);
      setRoom('');
      setStartDate('');
      setFbGroupLink('');
      setCourseType('SAT');
      setMathSchedule([]);
      setEnglishSchedule([]);
      setLegacySchedule('');
      
      onSuccess();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create New Batch</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="student-list">Student List</Label>
          <Textarea
            id="student-list"
            placeholder="1. John Doe - +976-1234-5678&#10;2. Jane Smith - +976-8765-4321"
            value={studentList}
            onChange={(e) => setStudentList(e.target.value)}
            rows={6}
          />
          <p className="text-sm text-muted-foreground">
            Format: 1. Name - Phone (one per line)
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="course-type">Course Type</Label>
            <Select value={courseType} onValueChange={(value: CourseType) => setCourseType(value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select course type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="SAT">SAT</SelectItem>
                <SelectItem value="IELTS">IELTS</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="teacher">Teacher{courseType === 'IELTS' ? 's' : ''}</Label>
            {courseType === 'IELTS' ? (
              <div className="space-y-2">
                {teachers.map((t) => (
                  <label key={t.id} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={selectedTeachers.includes(t.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedTeachers([...selectedTeachers, t.id]);
                        } else {
                          setSelectedTeachers(selectedTeachers.filter(id => id !== t.id));
                        }
                      }}
                      className="w-4 h-4"
                    />
                    <span>{t.name}</span>
                  </label>
                ))}
              </div>
            ) : (
              <Select value={teacher} onValueChange={setTeacher}>
                <SelectTrigger>
                  <SelectValue placeholder="Select teacher" />
                </SelectTrigger>
                <SelectContent>
                  {teachers.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="room">Room</Label>
            <Select value={room} onValueChange={setRoom} disabled={isOnlineClass(legacySchedule)}>
              <SelectTrigger>
                <SelectValue placeholder="Select room" />
              </SelectTrigger>
              <SelectContent>
                {rooms.map((r) => (
                  <SelectItem key={r} value={r}>
                    {r}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="start-date">Start Date</Label>
            <Input
              id="start-date"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
        </div>

        {/* Schedule Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label className="text-base font-semibold flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Schedule
            </Label>
            <div className="flex items-center gap-2">
              <Button
                variant={useScheduleBuilder ? "default" : "outline"}
                size="sm"
                onClick={() => setUseScheduleBuilder(true)}
              >
                Builder
              </Button>
              <Button
                variant={!useScheduleBuilder ? "default" : "outline"}
                size="sm"
                onClick={() => setUseScheduleBuilder(false)}
              >
                Preset
              </Button>
            </div>
          </div>

          {useScheduleBuilder ? (
            <Collapsible open={scheduleBuilderOpen} onOpenChange={setScheduleBuilderOpen}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" className="w-full justify-between p-0 h-auto hover:bg-transparent">
                  <span className="text-sm text-muted-foreground">
                    {mathSchedule.length + englishSchedule.length} time slots configured
                  </span>
                  {scheduleBuilderOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-2">
                <ScheduleBuilder
                  mathSchedule={mathSchedule}
                  englishSchedule={englishSchedule}
                  onMathScheduleChange={setMathSchedule}
                  onEnglishScheduleChange={setEnglishSchedule}
                />
              </CollapsibleContent>
            </Collapsible>
          ) : (
            <Select value={legacySchedule} onValueChange={setLegacySchedule}>
              <SelectTrigger>
                <SelectValue placeholder="Select schedule" />
              </SelectTrigger>
              <SelectContent>
                {legacySchedules.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="fb-link">Facebook Group Link (Optional)</Label>
          <Input
            id="fb-link"
            type="url"
            placeholder="https://facebook.com/groups/..."
            value={fbGroupLink}
            onChange={(e) => setFbGroupLink(e.target.value)}
          />
        </div>

        <Button onClick={handleCreateBatch} disabled={isLoading} className="w-full">
          {isLoading ? "Creating..." : "Create Batch"}
        </Button>
      </CardContent>
    </Card>
  );
}
