import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Pencil, Trash2, Plus, Calendar } from 'lucide-react';
import { z } from 'zod';

const SCHEDULES = [
  "Даваа/Лхагва/Баасан 16:40-18:30 (Math) + Бямба 14:10-16:10 (English - үнэгүй)",
  "Даваа/Лхагва/Баасан 18:40-20:30 (Math) + Бямба 16:20-18:20 (English - үнэгүй)",
  "Мягмар/Пүрэв 16:40-18:30 (Math) + Бямба 10:00-12:00 (Math) + 12:00-14:00 (English - үнэгүй)",
  "Мягмар/Пүрэв 18:40-20:30 (Math) + Бямба 12:10-14:10 (Math) + 14:10-16:10 (English - үнэгүй)",
  "Даваа/Лхагва/Баасан 16:40-18:30 (Math) + Бямба 14:10-16:10 (English - үнэгүй)",
  "Даваа/Лхагва/Баасан 18:40-20:30 (Math) + Бямба 16:20-18:20 (English - үнэгүй)",
  "Даваа/Лхагва/Баасан 18:40-20:30 (Math - Online) + Бямба 18:30-20:00 (English - үнэгүй)"
];

const ROOMS = ["1105", "905", "Online"];

const studentSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  phone: z.string().min(8, 'Phone must be at least 8 digits').max(20),
});

interface Teacher {
  name: string;
}

interface Student {
  id: string;
  name: string;
  phone: string;
}

interface Batch {
  id: string;
  batch_name: string;
  teacher: string;
  schedule: string;
  room: string;
  start_date: string;
  fb_group_link: string;
}

interface EditBatchDialogProps {
  batch: Batch;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: () => void;
}

export function EditBatchDialog({ batch, open, onOpenChange, onUpdate }: EditBatchDialogProps) {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedTeacher, setSelectedTeacher] = useState(batch.teacher);
  const [selectedSchedule, setSelectedSchedule] = useState(batch.schedule);
  const [selectedRoom, setSelectedRoom] = useState(batch.room);
  const [startDate, setStartDate] = useState(batch.start_date);
  const [fbGroupLink, setFbGroupLink] = useState(batch.fb_group_link || '');
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [isAddingStudent, setIsAddingStudent] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [removingStudent, setRemovingStudent] = useState<Student | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      fetchTeachers();
      fetchStudents();
      // Reset to current batch values
      setSelectedTeacher(batch.teacher);
      setSelectedSchedule(batch.schedule);
      setSelectedRoom(batch.room);
      setStartDate(batch.start_date);
      setFbGroupLink(batch.fb_group_link || '');
    }
  }, [open, batch]);

  useEffect(() => {
    // Auto-set room to "Online" if online schedule selected
    if (selectedSchedule.toLowerCase().includes('online')) {
      setSelectedRoom('Online');
    }
  }, [selectedSchedule]);

  const fetchTeachers = async () => {
    const { data } = await supabase
      .from('teachers')
      .select('name')
      .order('name');
    if (data) setTeachers(data);
  };

  const fetchStudents = async () => {
    const { data } = await supabase
      .from('students')
      .select('id, name, phone')
      .eq('batch_id', batch.id)
      .order('name');
    if (data) setStudents(data);
  };

  const handleAddStudent = async () => {
    try {
      const validated = studentSchema.parse({ name: newName, phone: newPhone });
      
      const { error } = await supabase
        .from('students')
        .insert({
          batch_id: batch.id,
          name: validated.name,
          phone: validated.phone,
          unique_link_id: batch.id, // Use batch's unique link
        });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Student added successfully',
      });

      setNewName('');
      setNewPhone('');
      setIsAddingStudent(false);
      fetchStudents();
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
      const validated = studentSchema.parse({ name: editName, phone: editPhone });
      
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
      setEditName('');
      setEditPhone('');
      fetchStudents();
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

  const handleRemoveStudent = async () => {
    if (!removingStudent) return;

    const { error } = await supabase
      .from('students')
      .delete()
      .eq('id', removingStudent.id);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to remove student',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Success',
        description: 'Student removed from batch',
      });
      fetchStudents();
    }
    setRemovingStudent(null);
  };

  const handleSaveChanges = async () => {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('batches')
        .update({
          teacher: selectedTeacher,
          schedule: selectedSchedule,
          room: selectedRoom,
          start_date: startDate,
          fb_group_link: fbGroupLink,
        })
        .eq('id', batch.id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Batch updated successfully',
      });

      onUpdate();
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to update batch',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const getChangeSummary = () => {
    const changes: string[] = [];
    if (selectedTeacher !== batch.teacher) {
      changes.push(`Teacher: ${batch.teacher} → ${selectedTeacher}`);
    }
    if (selectedSchedule !== batch.schedule) {
      changes.push(`Schedule changed`);
    }
    if (selectedRoom !== batch.room) {
      changes.push(`Room: ${batch.room} → ${selectedRoom}`);
    }
    if (startDate !== batch.start_date) {
      changes.push(`Start date changed`);
    }
    if (fbGroupLink !== (batch.fb_group_link || '')) {
      changes.push(`Facebook group link updated`);
    }
    return changes;
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Batch: {batch.batch_name}</DialogTitle>
          </DialogHeader>

          <Tabs defaultValue="details" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="details">Batch Details</TabsTrigger>
              <TabsTrigger value="students">Students ({students.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="details" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Teacher</Label>
                <Select value={selectedTeacher} onValueChange={setSelectedTeacher}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {teachers.map((teacher) => (
                      <SelectItem key={teacher.name} value={teacher.name}>
                        {teacher.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Schedule</Label>
                <Select value={selectedSchedule} onValueChange={setSelectedSchedule}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SCHEDULES.map((schedule, idx) => (
                      <SelectItem key={idx} value={schedule}>
                        {schedule}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Room</Label>
                <Select value={selectedRoom} onValueChange={setSelectedRoom}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ROOMS.map((room) => (
                      <SelectItem key={room} value={room}>
                        {room}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Start Date</Label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Facebook Group Link</Label>
                <Input
                  value={fbGroupLink}
                  onChange={(e) => setFbGroupLink(e.target.value)}
                  placeholder="https://facebook.com/groups/..."
                />
              </div>

              {getChangeSummary().length > 0 && (
                <div className="bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded p-4">
                  <h4 className="font-semibold mb-2">Pending Changes:</h4>
                  <ul className="list-disc list-inside text-sm space-y-1">
                    {getChangeSummary().map((change, idx) => (
                      <li key={idx}>{change}</li>
                    ))}
                  </ul>
                </div>
              )}
            </TabsContent>

            <TabsContent value="students" className="space-y-4 mt-4">
              <div className="flex justify-between items-center">
                <h3 className="font-semibold">Current Students ({students.length})</h3>
                <Button
                  size="sm"
                  onClick={() => setIsAddingStudent(true)}
                  disabled={isAddingStudent}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Student
                </Button>
              </div>

              {isAddingStudent && (
                <div className="border rounded-lg p-4 bg-muted/50 space-y-3">
                  <h4 className="font-semibold">Add New Student</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Name</Label>
                      <Input
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        placeholder="Student name"
                      />
                    </div>
                    <div>
                      <Label>Phone</Label>
                      <Input
                        value={newPhone}
                        onChange={(e) => setNewPhone(e.target.value)}
                        placeholder="Phone number"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={handleAddStudent}>Add</Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setIsAddingStudent(false);
                        setNewName('');
                        setNewPhone('');
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}

              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {students.map((student) => (
                      <TableRow key={student.id}>
                        <TableCell className="font-medium">{student.name}</TableCell>
                        <TableCell>{student.phone}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex gap-1 justify-end">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setEditingStudent(student);
                                setEditName(student.name);
                                setEditPhone(student.phone);
                              }}
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setRemovingStudent(student)}
                            >
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveChanges} disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Student Dialog */}
      <Dialog open={!!editingStudent} onOpenChange={(open) => !open && setEditingStudent(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Student</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Name</Label>
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Student name"
              />
            </div>
            <div>
              <Label>Phone</Label>
              <Input
                value={editPhone}
                onChange={(e) => setEditPhone(e.target.value)}
                placeholder="Phone number"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingStudent(null)}>
              Cancel
            </Button>
            <Button onClick={handleEditStudent}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove Student Confirmation */}
      <AlertDialog open={!!removingStudent} onOpenChange={(open) => !open && setRemovingStudent(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Student?</AlertDialogTitle>
            <AlertDialogDescription>
              Remove {removingStudent?.name} from this batch? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRemoveStudent} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}