import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Plus, Pencil, Check } from 'lucide-react';
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
  session_1: boolean;
  session_2: boolean;
  session_3: boolean;
  session_4: boolean;
  session_5: boolean;
  session_6: boolean;
  session_7: boolean;
  session_8: boolean;
  session_9: boolean;
  session_10: boolean;
  session_11: boolean;
  session_12: boolean;
  session_13: boolean;
  session_14: boolean;
  session_15: boolean;
  total_attended: number;
}

interface Batch {
  id: string;
  batch_name: string;
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
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to load data',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const toggleAttendance = async (studentId: string, session: number) => {
    const attendanceRecord = attendance[studentId];
    if (!attendanceRecord) return;

    const sessionKey = `session_${session}` as keyof Attendance;
    const newValue = !attendanceRecord[sessionKey];

    try {
      const { error } = await supabase
        .from('attendance')
        .update({ [sessionKey]: newValue })
        .eq('id', attendanceRecord.id);

      if (error) throw error;

      // Update local state
      setAttendance((prev) => ({
        ...prev,
        [studentId]: {
          ...prev[studentId],
          [sessionKey]: newValue,
        },
      }));

      // Show subtle saved indicator
      toast({
        title: 'Saved',
        description: `Attendance updated`,
        duration: 1500,
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to update attendance',
        variant: 'destructive',
      });
    }
  };

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
        toast({
          title: 'Error',
          description: 'Failed to add student',
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
        toast({
          title: 'Error',
          description: 'Failed to update student',
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

                    return (
                      <tr key={student.id} className="border-b hover:bg-muted/50">
                        <td className="sticky left-0 bg-background p-3 font-medium">
                          {student.name}
                        </td>
                        <td className="p-3">{student.phone}</td>
                        {Array.from({ length: 15 }, (_, i) => {
                          const sessionKey = `session_${i + 1}` as keyof Attendance;
                          const isChecked = !!studentAttendance?.[sessionKey];
                          
                          return (
                            <td key={i} className="p-2 text-center">
                              <Checkbox
                                checked={isChecked}
                                onCheckedChange={() => toggleAttendance(student.id, i + 1)}
                              />
                            </td>
                          );
                        })}
                        <td className={`p-3 text-center font-bold ${getAttendanceColor(total)}`}>
                          {total}/15
                        </td>
                        <td className="sticky right-0 bg-background p-3 text-center">
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
          <h3 className="font-semibold mb-2">Attendance Legend:</h3>
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
      </div>
    </div>
  );
}