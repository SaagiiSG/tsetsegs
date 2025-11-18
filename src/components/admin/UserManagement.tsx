import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { Shield, ShieldOff } from 'lucide-react';

interface User {
  id: string;
  email: string;
  created_at: string;
  isAdmin: boolean;
}

export function UserManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    userId: string;
    email: string;
    action: 'make-admin' | 'remove-admin';
  } | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setIsLoading(true);
      
      // Fetch all users with their admin status
      const { data: authUsers, error: authError } = await supabase
        .rpc('get_all_users') as { data: Array<{ id: string; email: string; created_at: string }> | null; error: any };
      
      if (authError) {
        console.error('Error fetching users:', authError);
        toast({
          title: 'Error',
          description: 'Failed to fetch users. Make sure you have admin privileges.',
          variant: 'destructive',
        });
        return;
      }

      // Fetch all admin roles
      const { data: adminRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'admin');

      if (rolesError) throw rolesError;

      const adminUserIds = new Set(adminRoles?.map(r => r.user_id) || []);

      // Combine data
      const usersWithRoles: User[] = (authUsers || []).map((authUser) => ({
        id: authUser.id,
        email: authUser.email,
        created_at: authUser.created_at,
        isAdmin: adminUserIds.has(authUser.id),
      }));

      setUsers(usersWithRoles);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast({
        title: 'Error',
        description: 'Failed to load users',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleMakeAdmin = async (userId: string) => {
    try {
      const { error } = await supabase
        .from('user_roles')
        .insert({ user_id: userId, role: 'admin' });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'User promoted to admin',
      });

      await fetchUsers();
    } catch (error) {
      console.error('Error making admin:', error);
      toast({
        title: 'Error',
        description: 'Failed to promote user to admin',
        variant: 'destructive',
      });
    } finally {
      setConfirmDialog(null);
    }
  };

  const handleRemoveAdmin = async (userId: string) => {
    try {
      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId)
        .eq('role', 'admin');

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Admin role removed',
      });

      await fetchUsers();
    } catch (error) {
      console.error('Error removing admin:', error);
      toast({
        title: 'Error',
        description: 'Failed to remove admin role',
        variant: 'destructive',
      });
    } finally {
      setConfirmDialog(null);
    }
  };

  const openConfirmDialog = (userId: string, email: string, action: 'make-admin' | 'remove-admin') => {
    setConfirmDialog({ open: true, userId, email, action });
  };

  const handleConfirm = () => {
    if (!confirmDialog) return;

    if (confirmDialog.action === 'make-admin') {
      handleMakeAdmin(confirmDialog.userId);
    } else {
      handleRemoveAdmin(confirmDialog.userId);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>User Management</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Registered</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((userData) => (
                <TableRow key={userData.id}>
                  <TableCell className="font-medium">{userData.email}</TableCell>
                  <TableCell>
                    {new Date(userData.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    {userData.isAdmin ? (
                      <Badge variant="default">
                        <Shield className="w-3 h-3 mr-1" />
                        Admin
                      </Badge>
                    ) : (
                      <Badge variant="secondary">User</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {userData.id === user?.id ? (
                      <span className="text-sm text-muted-foreground">You</span>
                    ) : userData.isAdmin ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openConfirmDialog(userData.id, userData.email, 'remove-admin')}
                      >
                        <ShieldOff className="w-4 h-4 mr-1" />
                        Remove Admin
                      </Button>
                    ) : (
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => openConfirmDialog(userData.id, userData.email, 'make-admin')}
                      >
                        <Shield className="w-4 h-4 mr-1" />
                        Make Admin
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <AlertDialog open={confirmDialog?.open || false} onOpenChange={(open) => !open && setConfirmDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmDialog?.action === 'make-admin' ? 'Promote to Admin?' : 'Remove Admin Role?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmDialog?.action === 'make-admin' 
                ? `Are you sure you want to make ${confirmDialog?.email} an admin? They will have full access to manage batches, students, and teachers.`
                : `Are you sure you want to remove admin role from ${confirmDialog?.email}? They will lose access to the admin dashboard.`
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirm}>
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
