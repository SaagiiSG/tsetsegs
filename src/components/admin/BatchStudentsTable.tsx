import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Pencil, Trash2, CheckCircle2, Circle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface BatchStudentsTableProps {
  students: any[];
  batchId: string;
  onUpdate: () => void;
}

export function BatchStudentsTable({ students, batchId, onUpdate }: BatchStudentsTableProps) {
  const [editingStudent, setEditingStudent] = useState<any>(null);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [deletingStudent, setDeletingStudent] = useState<any>(null);
  const { toast } = useToast();

  const handleEditStudent = async () => {
    if (!editingStudent) return;

    const { error } = await supabase
      .from('students')
      .update({
        name: editName,
        phone: editPhone
      })
      .eq('id', editingStudent.id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to update student",
        variant: "destructive"
      });
    } else {
      toast({
        title: "Success",
        description: "Student updated successfully"
      });
      setEditingStudent(null);
      onUpdate();
    }
  };

  const handleDeleteStudent = async () => {
    if (!deletingStudent) return;

    const { error } = await supabase
      .from('students')
      .delete()
      .eq('id', deletingStudent.id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to delete student",
        variant: "destructive"
      });
    } else {
      toast({
        title: "Success",
        description: "Student deleted successfully"
      });
      setDeletingStudent(null);
      onUpdate();
    }
  };

  const openEditDialog = (student: any) => {
    setEditingStudent(student);
    setEditName(student.name);
    setEditPhone(student.phone);
  };

  return (
    <>
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead className="text-center">Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {students.map((student) => (
              <TableRow key={student.id}>
                <TableCell className="font-medium">{student.name}</TableCell>
                <TableCell>{student.phone}</TableCell>
                <TableCell className="text-center">
                  {student.accessed ? (
                    <CheckCircle2 className="w-4 h-4 text-green-500 inline" />
                  ) : (
                    <Circle className="w-4 h-4 text-muted-foreground inline" />
                  )}
                </TableCell>
                <TableCell className="text-right space-x-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => openEditDialog(student)}
                  >
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setDeletingStudent(student)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!editingStudent} onOpenChange={(open) => !open && setEditingStudent(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Student</DialogTitle>
            <DialogDescription>
              Update student information
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Name</Label>
              <Input
                id="edit-name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-phone">Phone</Label>
              <Input
                id="edit-phone"
                value={editPhone}
                onChange={(e) => setEditPhone(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingStudent(null)}>
              Cancel
            </Button>
            <Button onClick={handleEditStudent}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deletingStudent} onOpenChange={(open) => !open && setDeletingStudent(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Student?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete {deletingStudent?.name} from this batch. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteStudent} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
