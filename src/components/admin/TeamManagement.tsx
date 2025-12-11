import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TeacherManagement } from './TeacherManagement';
import { UserManagement } from './UserManagement';
import { SetupTeacherAccounts } from './SetupTeacherAccounts';
import { Users, UserCog } from 'lucide-react';

export function TeamManagement() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Team Management</h1>
        <p className="text-muted-foreground">Manage teachers and admin users</p>
      </div>

      <Tabs defaultValue="teachers" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="teachers" className="flex items-center gap-2">
            <UserCog className="h-4 w-4" />
            Teachers
          </TabsTrigger>
          <TabsTrigger value="users" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Admin Users
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="teachers" className="mt-6 space-y-4">
          <SetupTeacherAccounts />
          <TeacherManagement />
        </TabsContent>
        
        <TabsContent value="users" className="mt-6">
          <UserManagement />
        </TabsContent>
      </Tabs>
    </div>
  );
}
