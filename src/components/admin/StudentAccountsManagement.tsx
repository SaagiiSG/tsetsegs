import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
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
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import {
  Search, Smartphone, Monitor, Laptop, 
  ChevronDown, ChevronRight, Power, PowerOff, 
  RefreshCw, Trash2, User, ExternalLink, Phone, GraduationCap,
  Key, KeyRound, RotateCcw, Shield, ShieldOff
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';

const ITEMS_PER_PAGE = 15;

interface StudentSession {
  id: string;
  device_id: string;
  user_agent: string | null;
  login_timestamp: string;
  expires_at: string;
  is_active: boolean;
}

interface StudentInfo {
  student_id: string;
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
  password_hash: string | null;
  password_set_at: string | null;
  registered_device_id: string | null;
  device_registered_at: string | null;
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
  const navigate = useNavigate();
  const [accounts, setAccounts] = useState<StudentAccount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedAccounts, setExpandedAccounts] = useState<Set<string>>(new Set());
  const [searchOpen, setSearchOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    type: 'terminate_session' | 'deactivate_account' | 'activate_account' | 'reset_password' | 'reset_device';
    targetId: string;
    accountPhone?: string;
  } | null>(null);
  const [highlightedAccountId, setHighlightedAccountId] = useState<string | null>(null);
  const accountRowRefs = useRef<Record<string, HTMLTableRowElement | null>>({});

  useEffect(() => {
    fetchAccounts();
  }, []);

  // Global keyboard shortcut for search
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setSearchOpen(!searchOpen);
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, [searchOpen]);

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
        .select('id, phone, first_name, last_name, batch_id, batches(batch_name, course_type)');
      
      if (studentsError) throw studentsError;

      // Create a map of phone -> student info
      const studentsByPhone = new Map<string, StudentInfo>();
      (studentsData || []).forEach((s: any) => {
        studentsByPhone.set(s.phone, {
          student_id: s.id,
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

  const resetPassword = async (accountId: string) => {
    try {
      const { error } = await supabase
        .from('student_accounts')
        .update({
          password_hash: null,
          password_set_at: null
        })
        .eq('id', accountId);

      if (error) throw error;

      toast({ title: 'Password reset', description: 'Student will need to set a new password on next login.' });
      fetchAccounts();
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    }
    setConfirmDialog(null);
  };

  const resetDevice = async (accountId: string) => {
    try {
      const { error } = await supabase
        .from('student_accounts')
        .update({
          registered_device_id: null,
          device_registered_at: null
        })
        .eq('id', accountId);

      if (error) throw error;

      toast({ title: 'Device reset', description: 'Student can now log in from any device.' });
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
    account.phone_number.includes(searchQuery) ||
    account.studentInfo?.first_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    account.studentInfo?.last_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Pagination calculations
  const totalPages = Math.ceil(filteredAccounts.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedAccounts = filteredAccounts.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  // Reset to page 1 when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

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
        <Button 
          variant="outline" 
          className="flex-1 max-w-sm justify-start text-muted-foreground"
          onClick={() => setSearchOpen(true)}
        >
          <Search className="h-4 w-4 mr-2" />
          Search students...
          <kbd className="ml-auto pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
            <span className="text-xs">⌘</span>K
          </kbd>
        </Button>
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
                  <TableHead className="w-[180px]">Student</TableHead>
                  <TableHead className="w-[160px]">Class</TableHead>
                  <TableHead className="w-[80px]">Status</TableHead>
                  <TableHead className="w-[100px]">Last Login</TableHead>
                  <TableHead className="w-[60px]">Sessions</TableHead>
                  <TableHead className="w-[100px]">Created</TableHead>
                  <TableHead className="w-[80px]">Profile</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
              {paginatedAccounts.map((account) => {
                const activeSessions = account.sessions.filter(s => s.is_active);
                const isExpanded = expandedAccounts.has(account.id);
                const isHighlighted = highlightedAccountId === account.id;
                
                return (
                  <>
                    <TableRow 
                      key={account.id} 
                      ref={(el) => { accountRowRefs.current[account.id] = el; }}
                      className={`cursor-pointer hover:bg-muted/50 transition-colors ${
                        isHighlighted ? 'bg-primary/20 ring-2 ring-primary ring-inset' : ''
                      }`} 
                      onClick={() => toggleExpanded(account.id)}
                    >
                      <TableCell className="w-12">
                        <Button variant="ghost" size="icon" className="h-6 w-6">
                          {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        </Button>
                      </TableCell>
                      <TableCell className="w-[180px]">
                        <div className="flex flex-col">
                          <span className="font-medium truncate">
                            {account.studentInfo 
                              ? `${account.studentInfo.first_name} ${account.studentInfo.last_name || ''}`.trim()
                              : 'Unknown Student'
                            }
                          </span>
                          <span className="text-xs text-muted-foreground">{account.phone_number}</span>
                        </div>
                      </TableCell>
                      <TableCell className="w-[160px]">
                        {account.studentInfo?.batch_name ? (
                          <div className="flex flex-col gap-1">
                            <span className="text-sm truncate" title={account.studentInfo.batch_name}>
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
                      <TableCell className="w-[80px]">
                        <Badge variant={account.is_active ? 'default' : 'destructive'}>
                          {account.is_active ? 'Active' : 'Deactivated'}
                        </Badge>
                      </TableCell>
                      <TableCell className="w-[100px]">
                        {account.last_login 
                          ? formatDistanceToNow(new Date(account.last_login), { addSuffix: true })
                          : 'Never'
                        }
                      </TableCell>
                      <TableCell className="w-[60px]">
                        <Badge variant={activeSessions.length > 0 ? 'outline' : 'secondary'}>
                          {activeSessions.length}
                        </Badge>
                      </TableCell>
                      <TableCell className="w-[100px]">
                        {format(new Date(account.created_at), 'MMM d, yyyy')}
                      </TableCell>
                      <TableCell className="w-[80px]">
                        {account.studentInfo?.student_id && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/admin/student/${account.studentInfo?.student_id}`);
                            }}
                          >
                            <ExternalLink className="h-3 w-3 mr-1" />
                            View
                          </Button>
                        )}
                      </TableCell>
                      <TableCell className="w-[100px]">
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
                    
                    {isExpanded && (
                      <TableRow key={`${account.id}-expanded`} className="bg-muted/30">
                        <TableCell colSpan={9} className="p-0">
                          <div className="px-6 py-4 space-y-4">
                            {/* Security Info Section */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {/* Password Info */}
                              <div className="p-3 rounded-lg border">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <Key className="h-4 w-4 text-muted-foreground" />
                                    <span className="font-medium text-sm">Password</span>
                                  </div>
                                  {account.password_hash ? (
                                    <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">
                                      Set
                                    </Badge>
                                  ) : (
                                    <Badge variant="secondary">Not Set</Badge>
                                  )}
                                </div>
                                {account.password_set_at && (
                                  <p className="text-xs text-muted-foreground mt-1">
                                    Set {formatDistanceToNow(new Date(account.password_set_at), { addSuffix: true })}
                                  </p>
                                )}
                                {account.password_hash && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="mt-2"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setConfirmDialog({
                                        open: true,
                                        type: 'reset_password',
                                        targetId: account.id,
                                        accountPhone: account.phone_number
                                      });
                                    }}
                                  >
                                    <RotateCcw className="h-3 w-3 mr-1" />
                                    Reset Password
                                  </Button>
                                )}
                              </div>

                              {/* Device Lock Info */}
                              <div className="p-3 rounded-lg border">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <Smartphone className="h-4 w-4 text-muted-foreground" />
                                    <span className="font-medium text-sm">Device Lock (90 days)</span>
                                  </div>
                                  {account.registered_device_id ? (
                                    <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">
                                      <Shield className="h-3 w-3 mr-1" />
                                      Locked
                                    </Badge>
                                  ) : (
                                    <Badge variant="secondary">
                                      <ShieldOff className="h-3 w-3 mr-1" />
                                      Unlocked
                                    </Badge>
                                  )}
                                </div>
                                {account.device_registered_at && (
                                  <p className="text-xs text-muted-foreground mt-1">
                                    Registered {formatDistanceToNow(new Date(account.device_registered_at), { addSuffix: true })}
                                  </p>
                                )}
                                {account.registered_device_id && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="mt-2"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setConfirmDialog({
                                        open: true,
                                        type: 'reset_device',
                                        targetId: account.id,
                                        accountPhone: account.phone_number
                                      });
                                    }}
                                  >
                                    <RotateCcw className="h-3 w-3 mr-1" />
                                    Reset Device Lock
                                  </Button>
                                )}
                              </div>
                            </div>

                            {/* Sessions Section */}
                            <div>
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
                                          session.is_active && !isExpired ? 'bg-primary/5 border-primary/20' : 'bg-muted/50'
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
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </>
                );
              })}
              
              {paginatedAccounts.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                    {searchQuery ? 'No accounts found matching your search' : 'No student accounts yet'}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          </ScrollArea>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t">
            <p className="text-sm text-muted-foreground">
              Showing {startIndex + 1}-{Math.min(startIndex + ITEMS_PER_PAGE, filteredAccounts.length)} of {filteredAccounts.length} accounts
            </p>
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious 
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                  />
                </PaginationItem>
                
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum: number;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }
                  
                  return (
                    <PaginationItem key={pageNum}>
                      <PaginationLink
                        onClick={() => setCurrentPage(pageNum)}
                        isActive={currentPage === pageNum}
                        className="cursor-pointer"
                      >
                        {pageNum}
                      </PaginationLink>
                    </PaginationItem>
                  );
                })}
                
                {totalPages > 5 && currentPage < totalPages - 2 && (
                  <PaginationItem>
                    <PaginationEllipsis />
                  </PaginationItem>
                )}
                
                <PaginationItem>
                  <PaginationNext 
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    className={currentPage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        )}
      </Card>

      {/* Confirmation Dialog */}
      <AlertDialog open={confirmDialog?.open} onOpenChange={() => setConfirmDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmDialog?.type === 'terminate_session' && 'Terminate Session'}
              {confirmDialog?.type === 'deactivate_account' && 'Deactivate Account'}
              {confirmDialog?.type === 'activate_account' && 'Activate Account'}
              {confirmDialog?.type === 'reset_password' && 'Reset Password'}
              {confirmDialog?.type === 'reset_device' && 'Reset Device Lock'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmDialog?.type === 'terminate_session' && 
                'This will log out the student from this device. They will need to log in again.'}
              {confirmDialog?.type === 'deactivate_account' && 
                `This will deactivate the account (${confirmDialog?.accountPhone}) and terminate all active sessions. The student will not be able to log in.`}
              {confirmDialog?.type === 'activate_account' && 
                `This will reactivate the account (${confirmDialog?.accountPhone}). The student will be able to log in again.`}
              {confirmDialog?.type === 'reset_password' && 
                `This will reset the password for ${confirmDialog?.accountPhone}. The student will need to set a new password on next login.`}
              {confirmDialog?.type === 'reset_device' && 
                `This will reset the device lock for ${confirmDialog?.accountPhone}. The student will be able to log in from any device.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (!confirmDialog) return;
                if (confirmDialog.type === 'terminate_session') {
                  terminateSession(confirmDialog.targetId);
                } else if (confirmDialog.type === 'reset_password') {
                  resetPassword(confirmDialog.targetId);
                } else if (confirmDialog.type === 'reset_device') {
                  resetDevice(confirmDialog.targetId);
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

      {/* Student Search Command Dialog */}
      <CommandDialog open={searchOpen} onOpenChange={setSearchOpen}>
        <CommandInput placeholder="Search students by name or phone..." />
        <CommandList>
          <CommandEmpty>No students found.</CommandEmpty>
          
          {/* Group by batch */}
          {Object.entries(
            accounts.reduce((acc, account) => {
              if (!account.studentInfo) return acc;
              const key = account.studentInfo.batch_name || 'Not Enrolled';
              if (!acc[key]) {
                acc[key] = { students: [], course_type: account.studentInfo.course_type };
              }
              acc[key].students.push(account);
              return acc;
            }, {} as Record<string, { students: StudentAccount[]; course_type: string | null }>)
          ).map(([batchName, { students, course_type }], index) => (
            <div key={batchName}>
              {index > 0 && <CommandSeparator />}
              <CommandGroup 
                heading={
                  <div className="flex items-center gap-2">
                    <GraduationCap className="h-3 w-3" />
                    <span>{batchName}</span>
                    {course_type && (
                      <Badge 
                        variant="outline" 
                        className={`text-[10px] px-1 py-0 ${
                          course_type === 'SAT' 
                            ? 'bg-blue-500/10 text-blue-600 border-blue-500/30' 
                            : 'bg-purple-500/10 text-purple-600 border-purple-500/30'
                        }`}
                      >
                        {course_type}
                      </Badge>
                    )}
                  </div>
                }
              >
                {students.map((account) => (
                  <CommandItem
                    key={account.id}
                    value={`${account.studentInfo?.first_name} ${account.studentInfo?.last_name} ${account.phone_number}`}
                    onSelect={() => {
                      setSearchOpen(false);
                      // Filter to show just this student and highlight them
                      setSearchQuery(account.phone_number);
                      setCurrentPage(1);
                      setHighlightedAccountId(account.id);
                      // Expand the account row
                      setExpandedAccounts(new Set([account.id]));
                      // Scroll to the account after a short delay
                      setTimeout(() => {
                        const row = accountRowRefs.current[account.id];
                        if (row) {
                          row.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        }
                        // Clear highlight after 3 seconds
                        setTimeout(() => setHighlightedAccountId(null), 3000);
                      }, 100);
                    }}
                    className="flex items-center justify-between cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span>{account.studentInfo?.first_name} {account.studentInfo?.last_name}</span>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Phone className="h-3 w-3" />
                      <span>{account.phone_number}</span>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </div>
          ))}
        </CommandList>
      </CommandDialog>
    </div>
  );
}
