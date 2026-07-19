import { useState, useEffect, useRef, useTransition } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from '@/components/ui/context-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Search, User, GraduationCap, ChevronLeft, ChevronRight, Loader2, Trash2, RefreshCw } from 'lucide-react';
import { InlineScorePrediction } from '@/components/admin/InlineScorePrediction';
import { toast } from 'sonner';



interface StudentResult {
  id: string;
  name: string;
  first_name: string;
  last_name: string | null;
  phone: string;
  parent_phone: string | null;
  school_name: string | null;
  grade: string | null;
  math_level: string | null;
  english_level: string | null;
  sat_test_month: string | null;
  created_at: string;
  batch: {
    id: string;
    batch_name: string | null;
    course_type: string;
    teacher: string | null;
    start_date: string;
  } | null;
}

const PAGE_SIZE = 20;

export default function StudentSearch() {
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [results, setResults] = useState<StudentResult[]>([]);
  const [isPending, startTransition] = useTransition();
  const abortControllerRef = useRef<AbortController | null>(null);
  const navigate = useNavigate();

  // All students state
  const [allStudents, setAllStudents] = useState<StudentResult[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoadingAll, setIsLoadingAll] = useState(true);

  // Delete confirmation dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [studentToDelete, setStudentToDelete] = useState<{ id: string; name: string; data?: StudentResult } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Fetch all students with pagination
  useEffect(() => {
    fetchAllStudents();
  }, [currentPage]);

  const fetchAllStudents = async () => {
    setIsLoadingAll(true);
    try {
      // Get total count
      const { count } = await supabase
        .from('students')
        .select('*', { count: 'exact', head: true })
        .eq('is_ghost', false);

      setTotalCount(count || 0);

      // Get paginated data
      const from = (currentPage - 1) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      const { data, error } = await supabase
        .from('students')
        .select(`
          id,
          name,
          first_name,
          last_name,
          phone,
          parent_phone,
          school_name,
          grade,
          math_level,
          english_level,
          sat_test_month,
          created_at,
          batch:batches(id, batch_name, course_type, teacher, start_date)
        `)
        .eq('is_ghost', false)
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) throw error;

      const transformedData = (data || []).map(student => ({
        ...student,
        batch: Array.isArray(student.batch) ? student.batch[0] : student.batch
      })) as StudentResult[];

      setAllStudents(transformedData);
    } catch (error) {
      console.error('Error fetching students:', error);
    } finally {
      setIsLoadingAll(false);
    }
  };

  // Fast debounce - 200ms for quick search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 200);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Perform search when debounced query changes
  useEffect(() => {
    if (!debouncedQuery.trim()) {
      setResults([]);
      return;
    }

    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    startTransition(() => {
      performSearch(debouncedQuery);
    });
  }, [debouncedQuery]);

  const performSearch = async (query: string) => {
    try {
      const trimmedQuery = query.trim();
      const isNumeric = /^\d+$/.test(trimmedQuery.replace(/[-\s]/g, ''));
      
      let data;
      let error;
      
      if (isNumeric) {
        // Phone number search - prefix match
        const cleanedQuery = trimmedQuery.replace(/[-\s]/g, '');
        const result = await supabase
          .from('students')
          .select(`
            id, name, first_name, last_name, phone, parent_phone,
            school_name, grade, math_level, english_level, sat_test_month, created_at,
            batch:batches(id, batch_name, course_type, teacher, start_date)
          `)
          .ilike('phone', `${cleanedQuery}%`)
          .order('created_at', { ascending: false })
          .limit(30);
        data = result.data;
        error = result.error;
      } else {
        // Name search - match first_name or last_name
        const result = await supabase
          .from('students')
          .select(`
            id, name, first_name, last_name, phone, parent_phone,
            school_name, grade, math_level, english_level, sat_test_month, created_at,
            batch:batches(id, batch_name, course_type, teacher, start_date)
          `)
          .or(`first_name.ilike.%${trimmedQuery}%,last_name.ilike.%${trimmedQuery}%,name.ilike.%${trimmedQuery}%`)
          .order('created_at', { ascending: false })
          .limit(30);
        data = result.data;
        error = result.error;
      }

      if (error) throw error;

      const transformedData = (data || []).map(student => ({
        ...student,
        batch: Array.isArray(student.batch) ? student.batch[0] : student.batch
      })) as StudentResult[];

      setResults(transformedData);
    } catch (error) {
      if ((error as Error).name !== 'AbortError') {
        console.error('Search error:', error);
      }
    }
  };

  const handleStudentClick = (studentId: string) => {
    navigate(`/admin/student/${studentId}`);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', { 
      month: 'short', 
      year: 'numeric' 
    });
  };

  const formatFullDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric' 
    });
  };

  const openDeleteDialog = (student: StudentResult) => {
    setStudentToDelete({
      id: student.id,
      name: `${student.first_name} ${student.last_name || ''}`.trim(),
      data: student
    });
    setDeleteDialogOpen(true);
  };

  const handleDeleteStudent = async () => {
    if (!studentToDelete) return;

    setIsDeleting(true);
    const deletedStudent = studentToDelete.data;

    try {
      const { error } = await supabase
        .from('students')
        .delete()
        .eq('id', studentToDelete.id);

      if (error) throw error;

      // Update UI immediately
      setAllStudents(prev => prev.filter(s => s.id !== studentToDelete.id));
      setResults(prev => prev.filter(s => s.id !== studentToDelete.id));
      setTotalCount(prev => prev - 1);

      // Show undo toast
      toast.success(`"${studentToDelete.name}" deleted`, {
        action: deletedStudent ? {
          label: 'Undo',
          onClick: async () => {
            await handleUndoDelete(deletedStudent);
          }
        } : undefined,
        duration: 8000,
      });

      setDeleteDialogOpen(false);
      setStudentToDelete(null);
    } catch (error) {
      console.error('Error deleting student:', error);
      toast.error('Failed to delete student');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleUndoDelete = async (student: StudentResult) => {
    try {
      const { error } = await supabase
        .from('students')
        .insert({
          id: student.id,
          name: student.name,
          first_name: student.first_name,
          last_name: student.last_name,
          phone: student.phone,
          parent_phone: student.parent_phone,
          school_name: student.school_name,
          grade: student.grade,
          math_level: student.math_level,
          english_level: student.english_level,
          sat_test_month: student.sat_test_month,
          batch_id: student.batch?.id || null,
          unique_link_id: crypto.randomUUID(),
        });

      if (error) throw error;

      toast.success(`"${student.first_name} ${student.last_name || ''}" restored`);
      fetchAllStudents();
    } catch (error) {
      console.error('Error restoring student:', error);
      toast.error('Failed to restore student');
    }
  };

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  const renderStudentTable = (students: StudentResult[], showPagination: boolean = false) => (
    <div className="overflow-x-auto">
      <Table className="min-w-[1200px]">
        <TableHeader>
          <TableRow>
            <TableHead className="sticky left-0 bg-background z-10 min-w-[180px]">Name</TableHead>
            <TableHead className="min-w-[100px]">Predicted</TableHead>
            <TableHead className="min-w-[120px]">Phone</TableHead>
            <TableHead className="min-w-[120px]">Parent Phone</TableHead>
            <TableHead className="min-w-[150px]">School</TableHead>
            <TableHead className="min-w-[80px]">Grade</TableHead>
            <TableHead className="min-w-[80px]">Math</TableHead>
            <TableHead className="min-w-[80px]">English</TableHead>
            <TableHead className="min-w-[100px]">SAT Month</TableHead>
            <TableHead className="min-w-[180px]">Batch</TableHead>
            <TableHead className="min-w-[80px]">Course</TableHead>
            <TableHead className="min-w-[120px]">Teacher</TableHead>
            <TableHead className="min-w-[120px]">Registered</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {students.map((student) => (
            <ContextMenu key={student.id}>
              <ContextMenuTrigger asChild>
                <TableRow 
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => handleStudentClick(student.id)}
                >
                  <TableCell className="font-medium sticky left-0 bg-background z-10">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <span className="truncate">{student.first_name} {student.last_name || ''}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <InlineScorePrediction studentId={student.id} courseType={student.batch?.course_type} />
                  </TableCell>
                  <TableCell>
                    <span className="font-mono text-sm">{student.phone}</span>
                  </TableCell>
                  <TableCell>
                    {student.parent_phone ? (
                      <span className="font-mono text-sm">{student.parent_phone}</span>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <span className="truncate block max-w-[150px]">
                      {student.school_name || <span className="text-muted-foreground">-</span>}
                    </span>
                  </TableCell>
                  <TableCell>
                    {student.grade || <span className="text-muted-foreground">-</span>}
                  </TableCell>
                  <TableCell>
                    {student.math_level ? (
                      <Badge variant="outline" className="text-xs">{student.math_level}</Badge>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {student.english_level ? (
                      <Badge variant="outline" className="text-xs">{student.english_level}</Badge>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {student.sat_test_month || <span className="text-muted-foreground">-</span>}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <GraduationCap className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <div className="min-w-0">
                        <div className="text-sm truncate">
                          {student.batch?.batch_name || <span className="text-muted-foreground">No batch</span>}
                        </div>
                        {student.batch?.start_date && (
                          <div className="text-xs text-muted-foreground">
                            {formatDate(student.batch.start_date)}
                          </div>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {student.batch?.course_type ? (
                      <Badge 
                        variant={student.batch.course_type === 'SAT' ? 'default' : 'secondary'}
                        className={student.batch.course_type === 'SAT' ? 'bg-blue-500' : 'bg-purple-500'}
                      >
                        {student.batch.course_type}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <span className="truncate block max-w-[120px]">
                      {student.batch?.teacher || <span className="text-muted-foreground">-</span>}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground">
                      {formatFullDate(student.created_at)}
                    </span>
                  </TableCell>
                </TableRow>
              </ContextMenuTrigger>
              <ContextMenuContent>
                <ContextMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={(e) => {
                    e.stopPropagation();
                    openDeleteDialog(student);
                  }}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Student
                </ContextMenuItem>
              </ContextMenuContent>
            </ContextMenu>
          ))}
        </TableBody>
      </Table>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header with search */}
      <div>
        <h2 className="text-2xl font-bold">Student Search</h2>
        <p className="text-muted-foreground">Search and manage all registered students</p>
      </div>

      {/* Search Bar */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
            autoFocus
          />
        </div>
        <Button variant="outline" onClick={fetchAllStudents} disabled={isLoadingAll}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoadingAll ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
        <div className="text-sm text-muted-foreground">
          {searchQuery.trim() 
            ? (isPending ? 'Searching...' : `${results.length} found`)
            : `${totalCount.toLocaleString()} total`
          }
        </div>
      </div>

      {/* Students Table */}
      <Card>
        <CardContent className="pt-6">
          {(isLoadingAll && !searchQuery.trim()) ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (searchQuery.trim() ? results : allStudents).length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <User className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>{searchQuery.trim() ? 'No students found matching your search' : 'No students found'}</p>
            </div>
          ) : (
            <>
              <div className={`transition-opacity duration-150 ${isPending ? 'opacity-60' : 'opacity-100'}`}>
                {renderStudentTable(searchQuery.trim() ? results : allStudents)}
              </div>
              
              {/* Pagination - only show when not searching */}
              {!searchQuery.trim() && (
                <div className="flex flex-col items-center gap-3 mt-4 pt-4 border-t">
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1 || isLoadingAll}
                    >
                      <ChevronLeft className="h-4 w-4 mr-1" />
                      Previous
                    </Button>
                    <div className="flex items-center gap-1 px-2">
                      <span className="text-sm font-medium">{currentPage}</span>
                      <span className="text-sm text-muted-foreground">of</span>
                      <span className="text-sm font-medium">{totalPages}</span>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages || isLoadingAll}
                    >
                      Next
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Showing {((currentPage - 1) * PAGE_SIZE) + 1} to {Math.min(currentPage * PAGE_SIZE, totalCount)} of {totalCount.toLocaleString()}
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Student</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <span className="font-semibold text-foreground">"{studentToDelete?.name}"</span>? 
              This will remove all their data including attendance and homework records.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteStudent}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
