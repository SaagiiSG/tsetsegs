import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Trash2, UserPlus, Users2 } from 'lucide-react';

export function TeacherManagement() {
  const [teachers, setTeachers] = useState<any[]>([]);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [deletingTeacher, setDeletingTeacher] = useState<any>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchTeachers();
  }, []);

  const fetchTeachers = async () => {
    const { data: teachersData } = await supabase
      .from('teachers')
      .select('*')
      .order('name');
    
    if (teachersData) {
      // Count batches for each teacher
      const teachersWithCount = await Promise.all(
        teachersData.map(async (teacher) => {
          const { count } = await supabase
            .from('batches')
            .select('*', { count: 'exact', head: true })
            .eq('teacher', teacher.name);
          
          return { ...teacher, batchCount: count || 0 };
        })
      );
      setTeachers(teachersWithCount);
    }
  };

  const handleAddTeacher = async () => {
    if (!newName || !newPhone) {
      toast({
        title: "Missing Information",
        description: "Please fill in all fields",
        variant: "destructive"
      });
      return;
    }

    const { error } = await supabase
      .from('teachers')
      .insert({ name: newName, phone: newPhone });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to add teacher",
        variant: "destructive"
      });
    } else {
      toast({
        title: "Success",
        description: "Teacher added successfully"
      });
      setNewName('');
      setNewPhone('');
      setShowAddDialog(false);
      fetchTeachers();
    }
  };

  const handleDeleteTeacher = async () => {
    if (!deletingTeacher) return;

    // Check if teacher has active batches
    const { data: batches } = await supabase
      .from('batches')
      .select('id')
      .eq('teacher', deletingTeacher.name);

    if (batches && batches.length > 0) {
      toast({
        title: "Cannot Delete",
        description: "This teacher has assigned classes. Please reassign students first.",
        variant: "destructive"
      });
      setDeletingTeacher(null);
      return;
    }

    const { error } = await supabase
      .from('teachers')
      .delete()
      .eq('id', deletingTeacher.id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to delete teacher",
        variant: "destructive"
      });
    } else {
      toast({
        title: "Success",
        description: "Teacher deleted successfully"
      });
      fetchTeachers();
    }
    setDeletingTeacher(null);
  };

  const getBatchCount = (teacher: any) => {
    return teacher.batchCount || 0;
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="flex items-center gap-2">
            <Users2 className="w-5 h-5" />
            Teacher Management
          </CardTitle>
          <Button onClick={() => setShowAddDialog(true)} size="sm">
            <UserPlus className="w-4 h-4 mr-2" />
            Add Teacher
          </Button>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead className="text-center">Active Classes</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {teachers.map((teacher) => (
                  <TableRow key={teacher.id}>
                    <TableCell className="font-medium">{teacher.name}</TableCell>
                    <TableCell>{teacher.phone}</TableCell>
                    <TableCell className="text-center">{getBatchCount(teacher)}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeletingTeacher(teacher)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Teacher</DialogTitle>
            <DialogDescription>
              Add a new teacher to the system
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="teacher-name">Name</Label>
              <Input
                id="teacher-name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Teacher Name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="teacher-phone">Phone</Label>
              <Input
                id="teacher-phone"
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
                placeholder="+976-XXXX-XXXX"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddTeacher}>
              Add Teacher
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deletingTeacher} onOpenChange={(open) => !open && setDeletingTeacher(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Teacher?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete {deletingTeacher?.name}. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteTeacher} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
