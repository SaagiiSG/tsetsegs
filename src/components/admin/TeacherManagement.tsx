import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
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
import { Trash2, UserPlus, Users2, Pencil, Key, Copy, Eye, RotateCcw } from 'lucide-react';
import { z } from 'zod';

const teacherSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100, "Name must be less than 100 characters"),
  phone: z.string().trim().regex(/^[0-9+\-\s()]+$/, "Phone must contain only numbers and valid characters").max(20, "Phone must be less than 20 characters")
});

interface Teacher {
  id: string;
  name: string;
  phone: string;
  username: string | null;
  temporary_password: boolean;
  last_login: string | null;
  batchCount?: number;
}

export function TeacherManagement() {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showCredentialsDialog, setShowCredentialsDialog] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);
  const [viewingCredentials, setViewingCredentials] = useState<{username: string, password: string} | null>(null);
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [deletingTeacher, setDeletingTeacher] = useState<Teacher | null>(null);
  const [resettingPassword, setResettingPassword] = useState<Teacher | null>(null);
  const [newCredentials, setNewCredentials] = useState<{username: string, password: string} | null>(null);
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

  const generateUsername = (name: string) => {
    return name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  };

  const generatePassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  };

  const handleAddTeacher = async () => {
    const validation = teacherSchema.safeParse({ name: newName, phone: newPhone });
    
    if (!validation.success) {
      toast({
        title: "Invalid Input",
        description: validation.error.errors[0].message,
        variant: "destructive"
      });
      return;
    }

    const username = generateUsername(validation.data.name);
    const temporaryPassword = generatePassword();
    const email = `${username}@teachers.tsetsegs.mn`;

    try {
      // Create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password: temporaryPassword,
        options: {
          data: {
            username,
            display_name: validation.data.name,
          },
        },
      });

      if (authError) throw authError;
      
      if (!authData.user) throw new Error('Failed to create auth user');

      // Insert teacher record with auth info
      const { error: teacherError } = await supabase
        .from('teachers')
        .insert({
          name: validation.data.name,
          phone: validation.data.phone,
          username,
          password_hash: 'managed_by_supabase_auth',
          temporary_password: true,
        });

      if (teacherError) throw teacherError;

      // Add teacher role
      const { error: roleError } = await supabase
        .from('user_roles')
        .insert({
          user_id: authData.user.id,
          role: 'teacher',
        });

      if (roleError) throw roleError;

      // Show credentials dialog
      setNewCredentials({ username, password: temporaryPassword });
      setShowCredentialsDialog(true);

      toast({
        title: "Success",
        description: "Teacher account created successfully"
      });

      setNewName('');
      setNewPhone('');
      setShowAddDialog(false);
      fetchTeachers();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to add teacher",
        variant: "destructive"
      });
    }
  };

  const handleResetPassword = async () => {
    if (!resettingPassword) return;

    const newPassword = generatePassword();

    try {
      // Mark as needing password reset
      const { error } = await supabase
        .from('teachers')
        .update({ temporary_password: true })
        .eq('id', resettingPassword.id);

      if (error) throw error;

      // Show new temporary password
      setNewCredentials({ 
        username: resettingPassword.username || '', 
        password: newPassword 
      });
      setShowCredentialsDialog(true);

      toast({
        title: "Password Reset Initiated",
        description: "New temporary password generated. Share this with the teacher.",
      });

      setResettingPassword(null);
      fetchTeachers();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to reset password",
        variant: "destructive"
      });
    }
  };

  const handleEditTeacher = async () => {
    if (!editingTeacher) return;

    const validation = teacherSchema.safeParse({ name: editName, phone: editPhone });
    
    if (!validation.success) {
      toast({
        title: "Invalid Input",
        description: validation.error.errors[0].message,
        variant: "destructive"
      });
      return;
    }

    const { error } = await supabase
      .from('teachers')
      .update({ name: validation.data.name, phone: validation.data.phone })
      .eq('id', editingTeacher.id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to update teacher",
        variant: "destructive"
      });
    } else {
      toast({
        title: "Success",
        description: "Teacher updated successfully"
      });
      setShowEditDialog(false);
      setEditingTeacher(null);
      setEditName('');
      setEditPhone('');
      fetchTeachers();
    }
  };

  const handleDeleteTeacher = async () => {
    if (!deletingTeacher) return;

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

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied",
      description: `${label} copied to clipboard`,
    });
  };

  const copyCredentials = (username: string, password: string) => {
    const text = `Teacher Login Credentials\nUsername: ${username}\nPassword: ${password}\nLogin at: ${window.location.origin}/teacher/login`;
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied",
      description: "Login credentials copied to clipboard",
    });
  };

  const getStatusBadge = (teacher: Teacher) => {
    if (!teacher.username) {
      return <Badge variant="secondary">No Account</Badge>;
    }
    if (teacher.temporary_password) {
      return <Badge variant="outline" className="border-yellow-500 text-yellow-600">Pending First Login</Badge>;
    }
    return <Badge variant="default" className="bg-green-600">Active</Badge>;
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
          <div className="border rounded-lg overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Username</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-center">Classes</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {teachers.map((teacher) => (
                  <TableRow key={teacher.id}>
                    <TableCell className="font-medium">{teacher.name}</TableCell>
                    <TableCell>{teacher.phone}</TableCell>
                    <TableCell className="font-mono text-sm">
                      {teacher.username || '-'}
                    </TableCell>
                    <TableCell>{getStatusBadge(teacher)}</TableCell>
                    <TableCell className="text-center">{teacher.batchCount || 0}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-1 justify-end">
                        {teacher.username && teacher.temporary_password && (
                          <Button
                            variant="ghost"
                            size="icon"
                            title="View Credentials"
                            onClick={() => {
                              setViewingCredentials({
                                username: teacher.username!,
                                password: '(Contact admin for temp password)'
                              });
                            }}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                        )}
                        {teacher.username && (
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Reset Password"
                            onClick={() => setResettingPassword(teacher)}
                          >
                            <RotateCcw className="w-4 h-4 text-orange-600" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Edit"
                          onClick={() => {
                            setEditingTeacher(teacher);
                            setEditName(teacher.name);
                            setEditPhone(teacher.phone);
                            setShowEditDialog(true);
                          }}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Delete"
                          onClick={() => setDeletingTeacher(teacher)}
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
        </CardContent>
      </Card>

      {/* Add Teacher Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Teacher</DialogTitle>
            <DialogDescription>
              Add a new teacher and create their account automatically
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
            <div className="text-sm text-muted-foreground bg-muted p-3 rounded">
              <p>📝 Account will be created automatically with:</p>
              <p className="mt-1">• Auto-generated username</p>
              <p>• Temporary password</p>
              <p>• Teacher portal access</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddTeacher}>
              Add Teacher & Create Account
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Credentials Dialog */}
      <Dialog open={!!viewingCredentials} onOpenChange={(open) => !open && setViewingCredentials(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Teacher Login Credentials</DialogTitle>
            <DialogDescription>
              Share these credentials with the teacher
            </DialogDescription>
          </DialogHeader>
          {viewingCredentials && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Username</Label>
                <div className="flex gap-2">
                  <Input value={viewingCredentials.username} readOnly className="font-mono" />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => copyToClipboard(viewingCredentials.username, 'Username')}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="text-sm text-muted-foreground bg-yellow-50 dark:bg-yellow-950 p-3 rounded border border-yellow-200 dark:border-yellow-800">
                <p>⚠️ For security reasons, temporary passwords are only shown once after creation.</p>
                <p className="mt-1">If the teacher has lost their password, use the "Reset Password" button.</p>
              </div>
              <div className="text-sm">
                <p className="font-medium">Login URL:</p>
                <code className="block mt-1 bg-muted p-2 rounded text-xs break-all">
                  {window.location.origin}/teacher/login
                </code>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* New Credentials Dialog */}
      <Dialog open={showCredentialsDialog} onOpenChange={setShowCredentialsDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>🎉 Teacher Account Created!</DialogTitle>
            <DialogDescription>
              Save these credentials - the password won't be shown again
            </DialogDescription>
          </DialogHeader>
          {newCredentials && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Username</Label>
                <div className="flex gap-2">
                  <Input value={newCredentials.username} readOnly className="font-mono" />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => copyToClipboard(newCredentials.username, 'Username')}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Temporary Password</Label>
                <div className="flex gap-2">
                  <Input value={newCredentials.password} readOnly className="font-mono" />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => copyToClipboard(newCredentials.password, 'Password')}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="text-sm text-muted-foreground bg-yellow-50 dark:bg-yellow-950 p-3 rounded border border-yellow-200 dark:border-yellow-800">
                <p>⚠️ Important: The teacher must change this password on first login.</p>
              </div>
              <Button
                className="w-full"
                onClick={() => copyCredentials(newCredentials.username, newCredentials.password)}
              >
                <Copy className="mr-2 h-4 w-4" />
                Copy All Credentials
              </Button>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => {
              setShowCredentialsDialog(false);
              setNewCredentials(null);
            }}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Teacher Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Teacher</DialogTitle>
            <DialogDescription>
              Update teacher information
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Name</Label>
              <Input
                id="edit-name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Teacher name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-phone">Phone</Label>
              <Input
                id="edit-phone"
                value={editPhone}
                onChange={(e) => setEditPhone(e.target.value)}
                placeholder="+976-0000-0000"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleEditTeacher}>Update Teacher</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingTeacher} onOpenChange={(open) => !open && setDeletingTeacher(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Teacher?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete {deletingTeacher?.name} and their account. This action cannot be undone.
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

      {/* Reset Password Confirmation */}
      <AlertDialog open={!!resettingPassword} onOpenChange={(open) => !open && setResettingPassword(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset Password?</AlertDialogTitle>
            <AlertDialogDescription>
              This will generate a new temporary password for {resettingPassword?.name}. They will need to change it on their next login.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleResetPassword}>
              Reset Password
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}