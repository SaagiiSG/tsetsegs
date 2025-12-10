import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from '@/components/ui/table';
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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { 
  Search, Smartphone, Monitor, Laptop, 
  ChevronDown, ChevronRight, Power, PowerOff, 
  RefreshCw, Trash2, User
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';

interface StudentSession {
  id: string;
  device_id: string;
  user_agent: string | null;
  login_timestamp: string;
  expires_at: string;
  is_active: boolean;
}

interface StudentInfo {
  first_name: string;
  last_name: string | null;
  batch_name: string | null;
  course_type: string | null;
}

interface StudentAccount {
  id: string;
  phone_number: string;
  created_at: string;
  last_login: string | null;
  is_active: boolean;
  sessions: StudentSession[];
  studentInfo?: StudentInfo;
}

function parseUserAgent(userAgent: string | null): { device: string; browser: string; icon: React.ReactNode } {
  if (!userAgent) return { device: 'Unknown', browser: 'Unknown', icon: <Smartphone className="h-4 w-4" /> };
  
  const ua = userAgent.toLowerCase();
  
  // Detect device
  let device = 'Desktop';
  let icon: React.ReactNode = <Monitor className="h-4 w-4" />;
  
  if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone')) {
    device = 'Mobile';
    icon = <Smartphone className="h-4 w-4" />;
  } else if (ua.includes('ipad') || ua.includes('tablet')) {
    device = 'Tablet';
    icon = <Laptop className="h-4 w-4" />;
  }
  
  // Detect browser
  let browser = 'Unknown';
  if (ua.includes('chrome') && !ua.includes('edg')) browser = 'Chrome';
  else if (ua.includes('safari') && !ua.includes('chrome')) browser = 'Safari';
  else if (ua.includes('firefox')) browser = 'Firefox';
  else if (ua.includes('edg')) browser = 'Edge';
  else if (ua.includes('opera') || ua.includes('opr')) browser = 'Opera';
  
  // Detect OS
  let os = '';
  if (ua.includes('windows')) os = 'Windows';
  else if (ua.includes('mac')) os = 'macOS';
  else if (ua.includes('android')) os = 'Android';
  else if (ua.includes('iphone') || ua.includes('ipad')) os = 'iOS';
  else if (ua.includes('linux')) os = 'Linux';
  
  return { 
    device: os ? `${device} (${os})` : device, 
    browser, 
    icon 
  };
}

export function StudentAccountsManagement() {
  const { toast } = useToast();
  const [accounts, setAccounts] = useState<StudentAccount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedAccounts, setExpandedAccounts] = useState<Set<string>>(new Set());
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    type: 'terminate_session' | 'deactivate_account' | 'activate_account';
    targetId: string;
    accountPhone?: string;
  } | null>(null);

  useEffect(() => {
    fetchAccounts();
  }, []);

  const fetchAccounts = async () => {
    try {
      setIsLoading(true);
      
      // Fetch all student accounts
      const { data: accountsData, error: accountsError } = await supabase
        .from('student_accounts')
        .select('*')
        .order('last_login', { ascending: false, nullsFirst: false });
      
      if (accountsError) throw accountsError;
      
      // Fetch all sessions
      const { data: sessionsData, error: sessionsError } = await supabase
        .from('student_sessions')
        .select('*')
        .order('login_timestamp', { ascending: false });
      
      if (sessionsError) throw sessionsError;

      // Fetch students with their batch info to match by phone
      const { data: studentsData, error: studentsError } = await supabase
        .from('students')
        .select('phone, first_name, last_name, batch_id, batches(batch_name, course_type)');
      
      if (studentsError) throw studentsError;

      // Create a map of phone -> student info
      const studentsByPhone = new Map<string, StudentInfo>();
      (studentsData || []).forEach((s: any) => {
        studentsByPhone.set(s.phone, {
          first_name: s.first_name,
          last_name: s.last_name,
          batch_name: s.batches?.batch_name || null,
          course_type: s.batches?.course_type || null,
        });
      });
      
      // Combine data
      const accountsWithSessions: StudentAccount[] = (accountsData || []).map(account => ({
        ...account,
        sessions: (sessionsData || []).filter(s => s.student_account_id === account.id),
        studentInfo: studentsByPhone.get(account.phone_number)
      }));
      
      setAccounts(accountsWithSessions);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message
      });
    } finally {
      setIsLoading(false);
    }
  };

  const terminateSession = async (sessionId: string) => {
    try {
      const { error } = await supabase
        .from('student_sessions')
        .update({ is_active: false })
        .eq('id', sessionId);
      
      if (error) throw error;
      
      toast({ title: 'Session terminated' });
      fetchAccounts();
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    }
    setConfirmDialog(null);
  };

  const toggleAccountStatus = async (accountId: string, activate: boolean) => {
    try {
      // Update account status
      const { error: accountError } = await supabase
        .from('student_accounts')
        .update({ is_active: activate })
        .eq('id', accountId);
      
      if (accountError) throw accountError;
      
      // If deactivating, also terminate all sessions
      if (!activate) {
        const { error: sessionsError } = await supabase
          .from('student_sessions')
          .update({ is_active: false })
          .eq('student_account_id', accountId);
        
        if (sessionsError) throw sessionsError;
      }
      
      toast({ title: activate ? 'Account activated' : 'Account deactivated' });
      fetchAccounts();
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    }
    setConfirmDialog(null);
  };

  const toggleExpanded = (accountId: string) => {
    const newExpanded = new Set(expandedAccounts);
    if (newExpanded.has(accountId)) {
      newExpanded.delete(accountId);
    } else {
      newExpanded.add(accountId);
    }
    setExpandedAccounts(newExpanded);
  };

  const filteredAccounts = accounts.filter(account =>
    account.phone_number.includes(searchQuery)
  );

  const activeSessionsCount = accounts.reduce(
    (sum, a) => sum + a.sessions.filter(s => s.is_active).length, 
    0
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Student Accounts</h2>
        <p className="text-muted-foreground">Manage student practice accounts and their active sessions</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <User className="h-8 w-8 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Total Accounts</p>
                <p className="text-2xl font-bold">{accounts.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <Power className="h-8 w-8 text-green-500" />
              <div>
                <p className="text-sm text-muted-foreground">Active Sessions</p>
                <p className="text-2xl font-bold">{activeSessionsCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <PowerOff className="h-8 w-8 text-red-500" />
              <div>
                <p className="text-sm text-muted-foreground">Deactivated Accounts</p>
                <p className="text-2xl font-bold">{accounts.filter(a => !a.is_active).length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Actions */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by phone number..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button variant="outline" onClick={fetchAccounts}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Accounts Table */}
      <Card>
        <div className="overflow-x-auto">
          <ScrollArea className="h-[600px]">
            <Table className="w-full table-fixed">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12"></TableHead>
                  <TableHead className="w-[200px]">Student</TableHead>
                  <TableHead className="w-[180px]">Class</TableHead>
                  <TableHead className="w-[100px]">Status</TableHead>
                  <TableHead className="w-[120px]">Last Login</TableHead>
                  <TableHead className="w-[80px]">Sessions</TableHead>
                  <TableHead className="w-[120px]">Created</TableHead>
                  <TableHead className="w-[120px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
              {filteredAccounts.map((account) => {
                const activeSessions = account.sessions.filter(s => s.is_active);
                const isExpanded = expandedAccounts.has(account.id);
                
                return (
                  <Collapsible key={account.id} open={isExpanded} onOpenChange={() => toggleExpanded(account.id)}>
                    <TableRow className="cursor-pointer hover:bg-muted/50">
                      <TableCell>
                        <CollapsibleTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-6 w-6">
                            {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                          </Button>
                        </CollapsibleTrigger>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">
                            {account.studentInfo 
                              ? `${account.studentInfo.first_name} ${account.studentInfo.last_name || ''}`.trim()
                              : 'Unknown Student'
                            }
                          </span>
                          <span className="text-xs text-muted-foreground">{account.phone_number}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {account.studentInfo?.batch_name ? (
                          <div className="flex flex-col gap-1">
                            <span className="text-sm truncate max-w-[200px]" title={account.studentInfo.batch_name}>
                              {account.studentInfo.batch_name}
                            </span>
                            <Badge variant="outline" className={`w-fit text-[10px] ${
                              account.studentInfo.course_type === 'SAT' 
                                ? 'bg-blue-500/10 text-blue-600 border-blue-500/30' 
                                : 'bg-purple-500/10 text-purple-600 border-purple-500/30'
                            }`}>
                              {account.studentInfo.course_type}
                            </Badge>
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">Not enrolled</span>
                        )}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        <Badge variant={account.is_active ? 'default' : 'destructive'}>
                          {account.is_active ? 'Active' : 'Deactivated'}
                        </Badge>
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {account.last_login 
                          ? formatDistanceToNow(new Date(account.last_login), { addSuffix: true })
                          : 'Never'
                        }
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        <Badge variant={activeSessions.length > 0 ? 'outline' : 'secondary'}>
                          {activeSessions.length}
                        </Badge>
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {format(new Date(account.created_at), 'MMM d, yyyy')}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        <Button
                          variant={account.is_active ? 'destructive' : 'default'}
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setConfirmDialog({
                              open: true,
                              type: account.is_active ? 'deactivate_account' : 'activate_account',
                              targetId: account.id,
                              accountPhone: account.phone_number
                            });
                          }}
                        >
                          {account.is_active ? (
                            <>
                              <PowerOff className="h-3 w-3 mr-1" />
                              Deactivate
                            </>
                          ) : (
                            <>
                              <Power className="h-3 w-3 mr-1" />
                              Activate
                            </>
                          )}
                        </Button>
                      </TableCell>
                    </TableRow>
                    
                    <CollapsibleContent asChild>
                      <TableRow className="bg-muted/30">
                        <TableCell colSpan={8} className="p-0">
                          <div className="px-6 py-4">
                            <h4 className="text-sm font-semibold mb-3">Sessions ({account.sessions.length})</h4>
                            {account.sessions.length === 0 ? (
                              <p className="text-sm text-muted-foreground">No sessions found</p>
                            ) : (
                              <div className="space-y-2">
                                {account.sessions.map((session) => {
                                  const { device, browser, icon } = parseUserAgent(session.user_agent);
                                  const isExpired = new Date(session.expires_at) < new Date();
                                  
                                  return (
                                    <div 
                                      key={session.id} 
                                      className={`flex items-center justify-between p-3 rounded-lg border ${
                                        session.is_active && !isExpired ? 'bg-green-500/5 border-green-500/20' : 'bg-muted/50'
                                      }`}
                                    >
                                      <div className="flex items-center gap-3">
                                        {icon}
                                        <div>
                                          <p className="text-sm font-medium">{device} • {browser}</p>
                                          <p className="text-xs text-muted-foreground">
                                            Logged in {formatDistanceToNow(new Date(session.login_timestamp), { addSuffix: true })}
                                            {' • '}
                                            Expires {format(new Date(session.expires_at), 'MMM d, yyyy')}
                                          </p>
                                        </div>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <Badge variant={session.is_active && !isExpired ? 'default' : 'secondary'}>
                                          {isExpired ? 'Expired' : session.is_active ? 'Active' : 'Terminated'}
                                        </Badge>
                                        {session.is_active && !isExpired && (
                                          <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setConfirmDialog({
                                              open: true,
                                              type: 'terminate_session',
                                              targetId: session.id
                                            })}
                                          >
                                            <Trash2 className="h-3 w-3 mr-1" />
                                            Terminate
                                          </Button>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    </CollapsibleContent>
                  </Collapsible>
                );
              })}
              
              {filteredAccounts.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    {searchQuery ? 'No accounts found matching your search' : 'No student accounts yet'}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          </ScrollArea>
        </div>
      </Card>

      {/* Confirmation Dialog */}
      <AlertDialog open={confirmDialog?.open} onOpenChange={() => setConfirmDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmDialog?.type === 'terminate_session' && 'Terminate Session'}
              {confirmDialog?.type === 'deactivate_account' && 'Deactivate Account'}
              {confirmDialog?.type === 'activate_account' && 'Activate Account'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmDialog?.type === 'terminate_session' && 
                'This will log out the student from this device. They will need to log in again.'}
              {confirmDialog?.type === 'deactivate_account' && 
                `This will deactivate the account (${confirmDialog?.accountPhone}) and terminate all active sessions. The student will not be able to log in.`}
              {confirmDialog?.type === 'activate_account' && 
                `This will reactivate the account (${confirmDialog?.accountPhone}). The student will be able to log in again.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (!confirmDialog) return;
                if (confirmDialog.type === 'terminate_session') {
                  terminateSession(confirmDialog.targetId);
                } else {
                  toggleAccountStatus(confirmDialog.targetId, confirmDialog.type === 'activate_account');
                }
              }}
            >
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
