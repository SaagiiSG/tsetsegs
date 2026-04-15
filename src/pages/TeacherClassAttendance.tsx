import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { MemoizedAttendanceSlider } from '@/components/teacher/MemoizedAttendanceSlider';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useToast } from '@/hooks/use-toast';
import { getErrorToast } from '@/lib/errorUtils';
import { ArrowLeft, Plus, Pencil, AlertTriangle } from 'lucide-react';
import { z } from 'zod';

const studentSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  phone: z.string().min(8, 'Phone number must be at least 8 digits').max(20),
});

interface Student {
  id: string;
  name: string;
  phone: string;
}

interface Attendance {
  id: string;
  student_id: string;
  session_1: string | null;
  session_2: string | null;
  session_3: string | null;
  session_4: string | null;
  session_5: string | null;
  session_6: string | null;
  session_7: string | null;
  session_8: string | null;
  session_9: string | null;
  session_10: string | null;
  session_11: string | null;
  session_12: string | null;
  session_13: string | null;
  session_14: string | null;
  session_15: string | null;
  total_attended: number;
}

interface Batch {
  id: string;
  batch_name: string;
}

interface DuplicateInfo {
  otherBatchName: string;
  otherBatchId: string;
  otherAttendance: number;
  currentAttendance: number;
}

export default function TeacherClassAttendance() {
  const { batchId } = useParams<{ batchId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [batch, setBatch] = useState<Batch | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [attendance, setAttendance] = useState<Record<string, Attendance>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newStudent, setNewStudent] = useState({ name: '', phone: '' });
  const [duplicateWarnings, setDuplicateWarnings] = useState<Record<string, DuplicateInfo>>({});

  useEffect(() => {
    if (batchId) {
      fetchData();
    }
  }, [batchId]);

  const fetchData = async () => {
    try {
      // Fetch batch info
      const { data: batchData, error: batchError } = await supabase
        .from('batches')
        .select('id, batch_name')
        .eq('id', batchId)
        .single();

      if (batchError) throw batchError;
      setBatch(batchData);

      // Fetch students
      const { data: studentsData, error: studentsError } = await supabase
        .from('students')
        .select('id, name, phone')
        .eq('batch_id', batchId)
        .order('name');

      if (studentsError) throw studentsError;
      setStudents(studentsData || []);

      // Fetch attendance records
      const { data: attendanceData, error: attendanceError } = await supabase
        .from('attendance')
        .select('*')
        .eq('batch_id', batchId);

      if (attendanceError) throw attendanceError;

      // Create attendance map
      const attendanceMap: Record<string, Attendance> = {};
      attendanceData?.forEach((record) => {
        attendanceMap[record.student_id] = record;
      });
      setAttendance(attendanceMap);

      // Initialize attendance for students without records
      const studentsWithoutAttendance = studentsData?.filter(
        (s) => !attendanceMap[s.id]
      ) || [];

      for (const student of studentsWithoutAttendance) {
        const { data, error } = await supabase
          .from('attendance')
          .insert({
            student_id: student.id,
            batch_id: batchId,
          })
          .select()
          .single();

        if (!error && data) {
          attendanceMap[student.id] = data;
        }
      }

      setAttendance(attendanceMap);

      // Check for duplicate students (same name + phone in other batches)
      if (studentsData && studentsData.length > 0) {
        await checkForDuplicates(studentsData, attendanceMap);
      }
    } catch (error: any) {
      const errorToast = getErrorToast(error, "load attendance");
      toast({
        ...errorToast,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const checkForDuplicates = async (currentStudents: Student[], currentAttendanceMap: Record<string, Attendance>) => {
    try {
      // Get all phone numbers from current batch
      const phoneNumbers = currentStudents.map(s => s.phone);
      
      // Find all students with matching phone numbers in OTHER batches
      const { data: allMatchingStudents, error } = await supabase
        .from('students')
        .select(`
          id,
          name,
          phone,
          batch_id,
          batches(batch_name)
        `)
        .in('phone', phoneNumbers)
        .neq('batch_id', batchId);

      if (error) throw error;

      if (!allMatchingStudents || allMatchingStudents.length === 0) {
        setDuplicateWarnings({});
        return;
      }

      // Get attendance for all matching students
      const matchingStudentIds = allMatchingStudents.map(s => s.id);
      const { data: matchingAttendance, error: attError } = await supabase
        .from('attendance')
        .select('student_id, total_attended')
        .in('student_id', matchingStudentIds);

      if (attError) throw attError;

      // Create attendance lookup
      const otherAttendanceLookup: Record<string, number> = {};
      matchingAttendance?.forEach(a => {
        otherAttendanceLookup[a.student_id] = a.total_attended || 0;
      });

      // Build duplicate warnings
      const warnings: Record<string, DuplicateInfo> = {};

      currentStudents.forEach(currentStudent => {
        const normalizedName = currentStudent.name.toLowerCase().trim();
        const normalizedPhone = currentStudent.phone.trim();
        
        // Find matching students in other batches
        const matches = allMatchingStudents.filter(other => {
          const otherName = other.name.toLowerCase().trim();
          const otherPhone = other.phone.trim();
          return otherName === normalizedName && otherPhone === normalizedPhone && other.batch_id;
        });

        if (matches.length > 0) {
          // Find the match with the highest attendance
          let bestMatch = matches[0];
          let bestAttendance = otherAttendanceLookup[bestMatch.id] || 0;

          matches.forEach(match => {
            const matchAtt = otherAttendanceLookup[match.id] || 0;
            if (matchAtt > bestAttendance) {
              bestMatch = match;
              bestAttendance = matchAtt;
            }
          });

          const currentAttendance = currentAttendanceMap[currentStudent.id]?.total_attended || 0;

          // Only show warning if current batch has FEWER attendance than another batch
          if (currentAttendance < bestAttendance) {
            const batchInfo = bestMatch.batches as { batch_name: string } | null;
            warnings[currentStudent.id] = {
              otherBatchName: batchInfo?.batch_name || 'Another class',
              otherBatchId: bestMatch.batch_id || '',
              otherAttendance: bestAttendance,
              currentAttendance: currentAttendance,
            };
          }
        }
      });

      setDuplicateWarnings(warnings);
    } catch (error) {
      console.error('Error checking for duplicates:', error);
    }
  };

  const pendingUpdatesRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const updateAttendance = useCallback(async (studentId: string, session: number, status: string) => {
    const sessionKey = `session_${session}` as keyof Attendance;

    // Optimistic update
    setAttendance((prev) => {
      const record = prev[studentId];
      if (!record) return prev;
      return {
        ...prev,
        [studentId]: { ...record, [sessionKey]: status },
      };
    });

    // Debounce the API call per student+session combo
    const key = `${studentId}-${session}`;
    const existing = pendingUpdatesRef.current.get(key);
    if (existing) clearTimeout(existing);

    pendingUpdatesRef.current.set(key, setTimeout(async () => {
      pendingUpdatesRef.current.delete(key);
      try {
        const record = attendance[studentId];
        if (!record) return;
        const { error } = await supabase
          .from('attendance')
          .update({ [sessionKey]: status })
          .eq('id', record.id);

        if (error) throw error;
      } catch (error: any) {
        const errorToast = getErrorToast(error, "update attendance");
        toast({ ...errorToast, variant: 'destructive' });
      }
    }, 300));
  }, [attendance, toast]);

  const handleAddStudent = async () => {
    try {
      const validated = studentSchema.parse(newStudent);
      
      const { data, error } = await supabase
        .from('students')
        .insert({
          batch_id: batchId,
          name: validated.name,
          phone: validated.phone,
          unique_link_id: '',
        })
        .select()
        .single();

      if (error) throw error;

      // Create attendance record
      await supabase
        .from('attendance')
        .insert({
          student_id: data.id,
          batch_id: batchId,
        });

      toast({
        title: 'Success',
        description: 'Student added successfully',
      });

      setIsAddDialogOpen(false);
      setNewStudent({ name: '', phone: '' });
      fetchData();
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        toast({
          title: 'Validation Error',
          description: error.errors[0].message,
          variant: 'destructive',
        });
      } else {
        const errorToast = getErrorToast(error, "add student");
        toast({
          ...errorToast,
          variant: 'destructive',
        });
      }
    }
  };

  const handleEditStudent = async () => {
    if (!editingStudent) return;

    try {
      const validated = studentSchema.parse(editingStudent);
      
      const { error } = await supabase
        .from('students')
        .update({
          name: validated.name,
          phone: validated.phone,
        })
        .eq('id', editingStudent.id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Student updated successfully',
      });

      setEditingStudent(null);
      fetchData();
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        toast({
          title: 'Validation Error',
          description: error.errors[0].message,
          variant: 'destructive',
        });
      } else {
        const errorToast = getErrorToast(error, "update student");
        toast({
          ...errorToast,
          variant: 'destructive',
        });
      }
    }
  };

  const getAttendanceColor = (total: number) => {
    if (total >= 13) return 'text-green-600';
    if (total >= 8) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-gradient-to-br from-background to-muted p-4 md:p-8">
        <div className="container mx-auto max-w-7xl">
          <Button
            variant="ghost"
            onClick={() => navigate('/teacher/dashboard')}
            className="mb-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to My Classes
          </Button>

          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-3xl font-bold">{batch?.batch_name}</h1>
              <p className="text-muted-foreground">
                Total Students: {students.length} | Tracking 15 sessions
              </p>
            </div>
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Student
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Student</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Name</Label>
                    <Input
                      value={newStudent.name}
                      onChange={(e) => setNewStudent({ ...newStudent, name: e.target.value })}
                      placeholder="Student name"
                    />
                  </div>
                  <div>
                    <Label>Phone</Label>
                    <Input
                      value={newStudent.phone}
                      onChange={(e) => setNewStudent({ ...newStudent, phone: e.target.value })}
                      placeholder="Phone number"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={handleAddStudent} className="flex-1">Add Student</Button>
                    <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Cancel</Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted">
                    <tr>
                      <th className="sticky left-0 bg-muted p-3 text-left font-semibold min-w-[200px]">
                        Student Name
                      </th>
                      <th className="p-3 text-left font-semibold min-w-[120px]">Phone</th>
                      {Array.from({ length: 15 }, (_, i) => (
                        <th key={i} className="p-2 text-center font-semibold min-w-[50px]">
                          <span className="hidden md:inline">S{i + 1}</span>
                          <span className="md:hidden">{i + 1}</span>
                        </th>
                      ))}
                      <th className="p-3 text-center font-semibold min-w-[80px]">Total</th>
                      <th className="sticky right-0 bg-muted p-3 text-center font-semibold min-w-[100px]">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.map((student) => {
                      const studentAttendance = attendance[student.id];
                      const total = studentAttendance?.total_attended || 0;
                      const duplicateInfo = duplicateWarnings[student.id];

                      return (
                        <tr key={student.id} className={`border-b hover:bg-muted/50 ${duplicateInfo ? 'bg-amber-50/50 dark:bg-amber-900/10' : ''}`}>
                          <td className={`sticky left-0 p-3 font-medium ${duplicateInfo ? 'bg-amber-50/50 dark:bg-amber-900/10' : 'bg-background'}`}>
                            <div className="flex items-center gap-2">
                              <span>{student.name}</span>
                              {duplicateInfo && (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <div className="flex items-center gap-1 text-amber-600 cursor-help">
                                      <AlertTriangle className="h-4 w-4" />
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent side="right" className="max-w-[280px]">
                                    <div className="space-y-1">
                                      <p className="font-semibold text-amber-600">Student enrolled in another class</p>
                                      <p className="text-sm">
                                        This student has more attendance in <span className="font-medium">{duplicateInfo.otherBatchName}</span> ({duplicateInfo.otherAttendance} sessions) vs this class ({duplicateInfo.currentAttendance} sessions).
                                      </p>
                                      <p className="text-xs text-muted-foreground">
                                        They may have switched classes.
                                      </p>
                                    </div>
                                  </TooltipContent>
                                </Tooltip>
                              )}
                            </div>
                            {duplicateInfo && (
                              <div className="text-xs text-amber-600 mt-0.5">
                                → Switched to: {duplicateInfo.otherBatchName}
                              </div>
                            )}
                          </td>
                          <td className="p-3">{student.phone}</td>
                          {Array.from({ length: 15 }, (_, i) => {
                            const sessionKey = `session_${i + 1}` as keyof Attendance;
                            const status = studentAttendance?.[sessionKey] as string | null;
                            
                            return (
                              <td key={i} className="p-1 text-center">
                                <MemoizedAttendanceSlider
                                  studentId={student.id}
                                  sessionNumber={i + 1}
                                  value={(status as "present" | "late" | "absent" | "sick" | "excused" | "") || ""}
                                  onUpdate={updateAttendance}
                                />
                              </td>
                            );
                          })}
                          <td className={`p-3 text-center font-bold ${getAttendanceColor(total)}`}>
                            {total}/15
                          </td>
                          <td className={`sticky right-0 p-3 text-center ${duplicateInfo ? 'bg-amber-50/50 dark:bg-amber-900/10' : 'bg-background'}`}>
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setEditingStudent(student)}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>Edit Student</DialogTitle>
                                </DialogHeader>
                                {editingStudent?.id === student.id && (
                                  <div className="space-y-4">
                                    <div>
                                      <Label>Name</Label>
                                      <Input
                                        value={editingStudent.name}
                                        onChange={(e) =>
                                          setEditingStudent({
                                            ...editingStudent,
                                            name: e.target.value,
                                          })
                                        }
                                      />
                                    </div>
                                    <div>
                                      <Label>Phone</Label>
                                      <Input
                                        value={editingStudent.phone}
                                        onChange={(e) =>
                                          setEditingStudent({
                                            ...editingStudent,
                                            phone: e.target.value,
                                          })
                                        }
                                      />
                                    </div>
                                    <div className="flex gap-2">
                                      <Button onClick={handleEditStudent} className="flex-1">
                                        Save Changes
                                      </Button>
                                      <Button
                                        variant="outline"
                                        onClick={() => setEditingStudent(null)}
                                      >
                                        Cancel
                                      </Button>
                                    </div>
                                  </div>
                                )}
                              </DialogContent>
                            </Dialog>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <div className="mt-4 p-4 bg-muted/50 rounded-lg">
            <h3 className="font-semibold mb-2">Attendance Status Options:</h3>
            <div className="flex flex-wrap gap-4 text-sm">
              <div className="flex items-center gap-2">
                <span className="font-bold">✓ Present:</span>
                <span>Student attended (counts toward total)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-bold">⏰ Late:</span>
                <span>Student arrived late (counts toward total)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-bold">✗ Absent:</span>
                <span>Student did not attend</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-bold">🤒 Sick:</span>
                <span>Student was sick/excused</span>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-border">
              <h4 className="font-semibold mb-2">Attendance Legend:</h4>
              <div className="flex flex-wrap gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-green-600 font-bold">Green (13-15):</span>
                  <span>Excellent attendance</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-yellow-600 font-bold">Yellow (8-12):</span>
                  <span>Good attendance</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-red-600 font-bold">Red (&lt;8):</span>
                  <span>Needs improvement</span>
                </div>
              </div>
            </div>
            {Object.keys(duplicateWarnings).length > 0 && (
              <div className="mt-4 pt-4 border-t border-border">
                <div className="flex items-center gap-2 text-amber-600">
                  <AlertTriangle className="h-4 w-4" />
                  <span className="font-semibold">Duplicate Warning:</span>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  Students highlighted in amber are enrolled in multiple classes. The warning indicates they have switched to or are more active in another class.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
