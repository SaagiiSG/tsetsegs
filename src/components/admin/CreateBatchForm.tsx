import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { z } from 'zod';

const studentSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100, "Name must be less than 100 characters"),
  phone: z.string().trim().regex(/^[0-9+\-\s()]+$/, "Phone must contain only numbers and valid characters").max(20, "Phone must be less than 20 characters")
});

const schedules = [
  'Mon/Wed/Fri 4:40-6:30 PM',
  'Mon/Wed/Fri 6:40-8:30 PM',
  'Tue/Thu 4:40-6:30 PM + Sat 10:00 AM-12:00 PM',
  'Tue/Thu 6:40-8:30 PM + Sat 12:10-2:10 PM',
  'Mon/Wed/Fri 4:40-6:30 PM (Alt)',
  'Mon/Wed/Fri 6:40-8:30 PM (Alt)',
];

const rooms = ['1105 (11th floor)', '905 (9th floor)'];

interface CreateBatchFormProps {
  onSuccess: () => void;
}

export function CreateBatchForm({ onSuccess }: CreateBatchFormProps) {
  const [studentList, setStudentList] = useState('');
  const [teacher, setTeacher] = useState('');
  const [schedule, setSchedule] = useState('');
  const [room, setRoom] = useState('');
  const [startDate, setStartDate] = useState('');
  const [fbGroupLink, setFbGroupLink] = useState('');
  const [teachers, setTeachers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchTeachers();
  }, []);

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

  const handleCreateBatch = async () => {
    if (!studentList || !teacher || !room || !schedule || !startDate) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields",
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
            // Validate student data
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
      const teacherName = teachers.find(t => t.id === teacher)?.name || teacher;
      const batchName = generateBatchName(teacherName, startDate);

      const { data: batch, error: batchError } = await supabase
        .from('batches')
        .insert({
          teacher: teacherName,
          room,
          schedule,
          start_date: startDate,
          fb_group_link: fbGroupLink,
          unique_link_id: batchLinkId,
          batch_name: batchName,
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
      setSchedule('');
      setRoom('');
      setStartDate('');
      setFbGroupLink('');
      
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
            <Label htmlFor="teacher">Teacher</Label>
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
          </div>

          <div className="space-y-2">
            <Label htmlFor="schedule">Schedule</Label>
            <Select value={schedule} onValueChange={setSchedule}>
              <SelectTrigger>
                <SelectValue placeholder="Select schedule" />
              </SelectTrigger>
              <SelectContent>
                {schedules.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="room">Room</Label>
            <Select value={room} onValueChange={setRoom}>
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
