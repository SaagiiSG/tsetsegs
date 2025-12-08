import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Pencil, Trash2, ArrowRight } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { z } from 'zod';

const studentSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100, "Name must be less than 100 characters"),
  phone: z.string().trim().regex(/^[0-9+\-\s()]+$/, "Phone must contain only numbers and valid characters").max(20, "Phone must be less than 20 characters")
});

interface BatchStudentsTableProps {
  students?: any[];
  batchId: string;
  onUpdate: () => void;
}

export function BatchStudentsTable({ students: propStudents, batchId, onUpdate }: BatchStudentsTableProps) {
  const [students, setStudents] = useState<any[]>(propStudents || []);
  const [editingStudent, setEditingStudent] = useState<any>(null);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [deletingStudent, setDeletingStudent] = useState<any>(null);
  const [showMoveDialog, setShowMoveDialog] = useState(false);
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [destinationBatchId, setDestinationBatchId] = useState('');
  const [batches, setBatches] = useState<any[]>([]);
  const [showConfirmTransfer, setShowConfirmTransfer] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchBatches();
    if (!propStudents) {
      fetchStudents();
    }
  }, [batchId]);

  useEffect(() => {
    if (propStudents) {
      setStudents(propStudents);
    }
  }, [propStudents]);

  const fetchStudents = async () => {
    const { data } = await supabase
      .from('students')
      .select('*')
      .eq('batch_id', batchId)
      .order('created_at', { ascending: true });
    
    if (data) {
      setStudents(data);
    }
  };

  const fetchBatches = async () => {
    const { data } = await supabase
      .from('batches')
      .select('*')
      .neq('id', batchId)
      .order('created_at', { ascending: false });
    
    if (data) {
      setBatches(data);
    }
  };

  const handleEditStudent = async () => {
    if (!editingStudent) return;

    const validation = studentSchema.safeParse({ name: editName, phone: editPhone });
    
    if (!validation.success) {
      toast({
        title: "Invalid Input",
        description: validation.error.errors[0].message,
        variant: "destructive"
      });
      return;
    }

    const { error } = await supabase
      .from('students')
      .update({
        name: validation.data.name,
        phone: validation.data.phone
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
      fetchStudents();
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
      fetchStudents();
      onUpdate();
    }
  };

  const openEditDialog = (student: any) => {
    setEditingStudent(student);
    setEditName(student.name);
    setEditPhone(student.phone);
  };

  const toggleStudentSelection = (studentId: string) => {
    setSelectedStudents(prev => 
      prev.includes(studentId) 
        ? prev.filter(id => id !== studentId)
        : [...prev, studentId]
    );
  };

  const handleOpenMoveDialog = () => {
    setSelectedStudents([]);
    setDestinationBatchId('');
    setShowMoveDialog(true);
  };

  const handleTransferStudents = async () => {
    const { error } = await supabase
      .from('students')
      .update({ batch_id: destinationBatchId })
      .in('id', selectedStudents);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to transfer students",
        variant: "destructive"
      });
    } else {
      const destinationBatch = batches.find(b => b.id === destinationBatchId);
      toast({
        title: "Success",
        description: `Transferred ${selectedStudents.length} student(s) to ${destinationBatch?.batch_name}`
      });
      setShowMoveDialog(false);
      setShowConfirmTransfer(false);
      setSelectedStudents([]);
      setDestinationBatchId('');
      fetchStudents();
      onUpdate();
    }
  };

  const handleConfirmTransfer = () => {
    if (selectedStudents.length === 0 || !destinationBatchId) {
      toast({
        title: "Invalid Selection",
        description: "Please select students and a destination batch",
        variant: "destructive"
      });
      return;
    }
    setShowConfirmTransfer(true);
  };

  const getDestinationBatchName = () => {
    return batches.find(b => b.id === destinationBatchId)?.batch_name || '';
  };

  return (
    <>
      <div className="space-y-3">
        <Button variant="outline" size="sm" onClick={handleOpenMoveDialog}>
          <ArrowRight className="w-4 h-4 mr-2" />
          Move Students
        </Button>

        <div className="rounded-md border overflow-auto max-h-[calc(100vh-300px)]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {students.map((student) => (
                <TableRow key={student.id}>
                  <TableCell className="font-medium">{student.name}</TableCell>
                  <TableCell>{student.phone}</TableCell>
                  <TableCell>
                    {student.accessed ? (
                      <span className="text-green-600 text-sm">✓ Accessed</span>
                    ) : (
                      <span className="text-muted-foreground text-sm">Not accessed</span>
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
      </div>

      {/* Edit Student Dialog */}
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
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
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

      {/* Delete Student Dialog */}
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

      {/* Move Students Dialog */}
      <Dialog open={showMoveDialog} onOpenChange={setShowMoveDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Move Students to Another Batch</DialogTitle>
            <DialogDescription>
              Select students to transfer and choose the destination batch
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Student Selection */}
            <div className="border rounded-lg p-4 max-h-60 overflow-y-auto">
              <Label className="text-sm font-medium mb-3 block">Select Students</Label>
              <div className="space-y-2">
                {students.map((student) => (
                  <div key={student.id} className="flex items-center space-x-2 p-2 hover:bg-muted/50 rounded">
                    <Checkbox
                      id={`student-${student.id}`}
                      checked={selectedStudents.includes(student.id)}
                      onCheckedChange={() => toggleStudentSelection(student.id)}
                    />
                    <label
                      htmlFor={`student-${student.id}`}
                      className="text-sm flex-1 cursor-pointer"
                    >
                      {student.name} - {student.phone}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            {/* Batch Selection */}
            <div className="space-y-2">
              <Label>Destination Batch</Label>
              <Select value={destinationBatchId} onValueChange={setDestinationBatchId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a batch" />
                </SelectTrigger>
                <SelectContent>
                  {batches.map((batch) => (
                    <SelectItem key={batch.id} value={batch.id}>
                      {batch.batch_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedStudents.length > 0 && (
              <p className="text-sm text-muted-foreground">
                {selectedStudents.length} student(s) selected
              </p>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowMoveDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleConfirmTransfer}
              disabled={selectedStudents.length === 0 || !destinationBatchId}
            >
              Transfer Students
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm Transfer Dialog */}
      <AlertDialog open={showConfirmTransfer} onOpenChange={setShowConfirmTransfer}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Transfer</AlertDialogTitle>
            <AlertDialogDescription>
              Transfer {selectedStudents.length} student(s) to {getDestinationBatchName()}?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleTransferStudents}>
              Confirm Transfer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
