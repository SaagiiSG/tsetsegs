import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';

interface StudentActionDialogsProps {
  studentId: string;
  studentName: string;
  phone: string;
  linkedStudentId?: string | null;
  isBlocked?: boolean;
  openDialog: 'message' | 'assign' | 'resetPass' | 'account' | 'deactivate' | 'note' | null;
  onClose: () => void;
}

export function StudentActionDialogs({
  studentId,
  studentName,
  phone,
  linkedStudentId,
  isBlocked,
  openDialog,
  onClose,
}: StudentActionDialogsProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [noteContent, setNoteContent] = useState('');
  const [assignType, setAssignType] = useState<string>('');
  const [selectedBatch, setSelectedBatch] = useState<string>('');

  const handleSendMessage = () => {
    // Open WhatsApp with the student's phone number
    const formattedPhone = phone.replace(/\D/g, '');
    const whatsappUrl = `https://wa.me/976${formattedPhone}`;
    window.open(whatsappUrl, '_blank');
    toast({
      title: 'Opening WhatsApp',
      description: `Starting conversation with ${studentName}`,
    });
    onClose();
  };

  const handleResetPassword = async () => {
    setLoading(true);
    try {
      // Reset the student's device registration to allow re-login
      const { error } = await supabase
        .from('student_accounts')
        .update({
          registered_device_id: null,
          device_registered_at: null,
        })
        .eq('id', studentId);

      if (error) throw error;

      toast({
        title: 'Device Reset Successful',
        description: `${studentName} can now log in from a new device`,
      });
      queryClient.invalidateQueries({ queryKey: ['studentProfile', studentId] });
      onClose();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to reset device',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleToggleBlock = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('student_accounts')
        .update({
          is_blocked: !isBlocked,
          blocked_at: !isBlocked ? new Date().toISOString() : null,
          blocked_reason: !isBlocked ? 'Blocked by admin' : null,
        })
        .eq('id', studentId);

      if (error) throw error;

      toast({
        title: isBlocked ? 'Account Activated' : 'Account Deactivated',
        description: isBlocked 
          ? `${studentName}'s account is now active` 
          : `${studentName}'s account has been deactivated`,
      });
      queryClient.invalidateQueries({ queryKey: ['studentProfile', studentId] });
      onClose();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update account status',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveNote = async () => {
    if (!noteContent.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a note',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      // Log activity with the note
      const { error } = await supabase
        .from('student_activity_logs')
        .insert({
          student_account_id: studentId,
          activity_type: 'admin_note',
          metadata: { note: noteContent.trim(), created_by: 'admin' },
        });

      if (error) throw error;

      toast({
        title: 'Note Saved',
        description: 'Your note has been added to the student record',
      });
      setNoteContent('');
      onClose();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to save note',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAssignToBatch = async () => {
    if (!linkedStudentId) {
      toast({
        title: 'Error',
        description: 'No linked student record found',
        variant: 'destructive',
      });
      return;
    }

    if (!selectedBatch) {
      toast({
        title: 'Error',
        description: 'Please select a batch',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('students')
        .update({ batch_id: selectedBatch })
        .eq('id', linkedStudentId);

      if (error) throw error;

      toast({
        title: 'Batch Assigned',
        description: `${studentName} has been assigned to the selected batch`,
      });
      queryClient.invalidateQueries({ queryKey: ['studentProfile', studentId] });
      setSelectedBatch('');
      onClose();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to assign batch',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Message Dialog */}
      <Dialog open={openDialog === 'message'} onOpenChange={() => onClose()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Message</DialogTitle>
            <DialogDescription>
              Open WhatsApp to message {studentName}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground">
              Phone: <span className="font-medium text-foreground">{phone}</span>
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={handleSendMessage}>Open WhatsApp</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign Dialog */}
      <Dialog open={openDialog === 'assign'} onOpenChange={() => onClose()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Student</DialogTitle>
            <DialogDescription>
              Assign {studentName} to a batch or homework
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Assignment Type</Label>
              <Select value={assignType} onValueChange={setAssignType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="batch">Assign to Batch</SelectItem>
                  <SelectItem value="homework">Assign Homework</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {assignType === 'batch' && (
              <div className="space-y-2">
                <Label>Select Batch</Label>
                <BatchSelector value={selectedBatch} onChange={setSelectedBatch} />
              </div>
            )}
            {assignType === 'homework' && (
              <p className="text-sm text-muted-foreground">
                Homework assignment feature coming soon
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button 
              onClick={handleAssignToBatch} 
              disabled={loading || !assignType || (assignType === 'batch' && !selectedBatch)}
            >
              {loading ? 'Assigning...' : 'Assign'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset Pass (Device Reset) */}
      <AlertDialog open={openDialog === 'resetPass'} onOpenChange={() => onClose()}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset Device Registration?</AlertDialogTitle>
            <AlertDialogDescription>
              This will allow {studentName} to log in from a new device. 
              Their existing device will be de-registered.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleResetPassword} disabled={loading}>
              {loading ? 'Resetting...' : 'Reset Device'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Account Info */}
      <Dialog open={openDialog === 'account'} onOpenChange={() => onClose()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Account Details</DialogTitle>
            <DialogDescription>
              View account information for {studentName}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-4">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Phone</span>
              <span className="font-medium">{phone}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Account ID</span>
              <span className="font-mono text-xs">{studentId.slice(0, 8)}...</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Status</span>
              <span className={isBlocked ? 'text-destructive' : 'text-green-600'}>
                {isBlocked ? 'Blocked' : 'Active'}
              </span>
            </div>
            {linkedStudentId && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Linked Student</span>
                <span className="font-mono text-xs">{linkedStudentId.slice(0, 8)}...</span>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button onClick={onClose}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Deactivate/Activate Account */}
      <AlertDialog open={openDialog === 'deactivate'} onOpenChange={() => onClose()}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {isBlocked ? 'Activate Account?' : 'Deactivate Account?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {isBlocked 
                ? `This will allow ${studentName} to access their account again.`
                : `This will block ${studentName} from accessing the platform. They won't be able to log in until reactivated.`
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleToggleBlock} 
              disabled={loading}
              className={isBlocked ? '' : 'bg-destructive text-destructive-foreground hover:bg-destructive/90'}
            >
              {loading ? 'Processing...' : isBlocked ? 'Activate' : 'Deactivate'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Add Note */}
      <Dialog open={openDialog === 'note'} onOpenChange={() => onClose()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Note</DialogTitle>
            <DialogDescription>
              Add an admin note for {studentName}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Textarea
              value={noteContent}
              onChange={(e) => setNoteContent(e.target.value)}
              placeholder="Enter your note here..."
              className="min-h-[100px]"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={handleSaveNote} disabled={loading || !noteContent.trim()}>
              {loading ? 'Saving...' : 'Save Note'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// Simple batch selector component
function BatchSelector({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [batches, setBatches] = useState<{ id: string; batch_name: string | null }[]>([]);

  useEffect(() => {
    const fetchBatches = async () => {
      const { data } = await supabase
        .from('batches')
        .select('id, batch_name')
        .order('created_at', { ascending: false })
        .limit(50);
      if (data) setBatches(data);
    };
    fetchBatches();
  }, []);

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger>
        <SelectValue placeholder="Select batch" />
      </SelectTrigger>
      <SelectContent>
        {batches.map((batch) => (
          <SelectItem key={batch.id} value={batch.id}>
            {batch.batch_name || batch.id.slice(0, 8)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
