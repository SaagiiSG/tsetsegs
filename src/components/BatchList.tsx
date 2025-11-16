import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Copy, ExternalLink, Trash2, Edit, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";

interface BatchListProps {
  batches: any[];
  onUpdate: () => void;
}

export const BatchList = ({ batches, onUpdate }: BatchListProps) => {
  const [editingStudent, setEditingStudent] = useState<any>(null);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");

  const handleDeleteBatch = async (batchId: string) => {
    const { error } = await supabase.from("batches").delete().eq("id", batchId);
    if (error) {
      toast.error("Failed to delete batch");
    } else {
      toast.success("Batch deleted successfully");
      onUpdate();
    }
  };

  const handleRegenerateBatchLink = async (batchId: string) => {
    const newLinkId = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    const { error } = await supabase
      .from("batches")
      .update({ unique_link_id: newLinkId })
      .eq("id", batchId);
    
    if (error) {
      toast.error("Failed to regenerate link");
    } else {
      toast.success("Batch link regenerated!");
      onUpdate();
    }
  };

  const handleDeleteStudent = async (studentId: string) => {
    const { error } = await supabase.from("students").delete().eq("id", studentId);
    if (error) {
      toast.error("Failed to delete student");
    } else {
      toast.success("Student deleted successfully");
      onUpdate();
    }
  };

  const handleEditStudent = async () => {
    if (!editName.trim() || !editPhone.trim()) {
      toast.error("Please fill in all fields");
      return;
    }

    const { error } = await supabase
      .from("students")
      .update({ name: editName, phone: editPhone })
      .eq("id", editingStudent.id);

    if (error) {
      toast.error("Failed to update student");
    } else {
      toast.success("Student updated successfully");
      setEditingStudent(null);
      onUpdate();
    }
  };

  return (
    <div className="space-y-4">
      {batches.map((batch) => (
        <Card key={batch.id} className="shadow-soft">
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-xl">{batch.teacher}'s Class</CardTitle>
                <CardDescription className="mt-1">
                  {batch.schedule} • Room {batch.room}
                </CardDescription>
                <p className="text-sm text-muted-foreground mt-1">
                  Starts: {new Date(batch.start_date).toLocaleDateString()}
                </p>
              </div>
              <div className="flex gap-2 items-center">
                <Badge variant="outline">
                  {batch.students?.length || 0} students
                </Badge>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="sm">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Batch</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will permanently delete this batch and all associated students. This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={() => handleDeleteBatch(batch.id)}>
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-accent/10 rounded-lg">
              <div>
                <p className="font-medium">Batch Link</p>
                <p className="text-sm text-muted-foreground">
                  Share this link with all students in this batch
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const link = `${window.location.origin}/batch/${batch.unique_link_id}`;
                    navigator.clipboard.writeText(link);
                    toast.success("Batch link copied!");
                  }}
                >
                  <Copy className="w-4 h-4 mr-2" />
                  Copy
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(`/batch/${batch.unique_link_id}`, '_blank')}
                >
                  <ExternalLink className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleRegenerateBatchLink(batch.id)}
                >
                  <RefreshCw className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div>
              <p className="font-medium mb-2">Students ({batch.students?.length || 0}):</p>
              <div className="space-y-2">
                {batch.students?.map((student: any) => (
                  <div
                    key={student.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                  >
                    <div>
                      <p className="font-medium">{student.name}</p>
                      <p className="text-sm text-muted-foreground">{student.phone}</p>
                    </div>
                    <div className="flex gap-2">
                      <Dialog open={editingStudent?.id === student.id} onOpenChange={(open) => !open && setEditingStudent(null)}>
                        <DialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setEditingStudent(student);
                              setEditName(student.name);
                              setEditPhone(student.phone);
                            }}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Edit Student</DialogTitle>
                            <DialogDescription>
                              Update student information
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div>
                              <Label htmlFor="edit-name">Name</Label>
                              <Input
                                id="edit-name"
                                value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                              />
                            </div>
                            <div>
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
                            <Button onClick={handleEditStudent}>Save</Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="destructive" size="sm">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Student</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will permanently delete {student.name} from this batch.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDeleteStudent(student.id)}>
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
