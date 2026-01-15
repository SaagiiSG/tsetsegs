import { useState, useEffect, useRef, useTransition } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Search, User, GraduationCap, Phone, Users } from 'lucide-react';

type PhoneType = 'student' | 'parent';

interface StudentResult {
  id: string;
  name: string;
  first_name: string;
  last_name: string | null;
  phone: string;
  parent_phone: string | null;
  school_name: string | null;
  grade: string | null;
  batch: {
    id: string;
    batch_name: string | null;
    course_type: string;
    teacher: string | null;
    start_date: string;
  };
}

export default function StudentSearch() {
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [phoneType, setPhoneType] = useState<PhoneType>('student');
  const [results, setResults] = useState<StudentResult[]>([]);
  const [isPending, startTransition] = useTransition();
  const abortControllerRef = useRef<AbortController | null>(null);
  const navigate = useNavigate();

  // Smooth debounce - update debounced query after typing stops
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 400);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Perform search when debounced query or phone type changes
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
      performSearch(debouncedQuery, phoneType);
    });
  }, [debouncedQuery, phoneType]);

  const performSearch = async (query: string, type: PhoneType) => {
    try {
      const cleanedQuery = query.replace(/[-\s]/g, '');
      
      const phoneColumn = type === 'student' ? 'phone' : 'parent_phone';
      
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
          batch:batches(id, batch_name, course_type, teacher, start_date)
        `)
        .ilike(phoneColumn, `${cleanedQuery}%`)
        .order('created_at', { ascending: false })
        .limit(50);

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

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Student Search
          </CardTitle>
          <CardDescription>
            Search for students by {phoneType === 'student' ? 'student' : 'parent'} phone number
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={`Enter ${phoneType === 'student' ? 'student' : 'parent'} phone number...`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
                autoFocus
              />
            </div>
            <ToggleGroup 
              type="single" 
              value={phoneType} 
              onValueChange={(value) => value && setPhoneType(value as PhoneType)}
              className="border rounded-md"
            >
              <ToggleGroupItem value="student" aria-label="Search by student phone" className="gap-2 px-3">
                <User className="h-4 w-4" />
                <span className="hidden sm:inline">Student</span>
              </ToggleGroupItem>
              <ToggleGroupItem value="parent" aria-label="Search by parent phone" className="gap-2 px-3">
                <Users className="h-4 w-4" />
                <span className="hidden sm:inline">Parent</span>
              </ToggleGroupItem>
            </ToggleGroup>
          </div>
        </CardContent>
      </Card>

      {searchQuery.trim() && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Results</CardTitle>
              <CardDescription>
                {isPending ? 'Searching...' : `${results.length} found`}
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            {results.length === 0 && !isPending ? (
              <div className="text-center py-8 text-muted-foreground">
                <User className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No students found</p>
              </div>
            ) : (
              <div className={`transition-opacity duration-150 ${isPending ? 'opacity-60' : 'opacity-100'}`}>
                <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Parent Phone</TableHead>
                    <TableHead>School</TableHead>
                    <TableHead>Batch</TableHead>
                    <TableHead>Course</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {results.map((student) => (
                    <TableRow 
                      key={student.id} 
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleStudentClick(student.id)}
                    >
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          {student.first_name} {student.last_name || ''}
                        </div>
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
                        {student.school_name || <span className="text-muted-foreground">-</span>}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <GraduationCap className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <div className="text-sm">
                              {student.batch?.batch_name || 'Unnamed'}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {student.batch?.start_date && formatDate(student.batch.start_date)}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={student.batch?.course_type === 'SAT' ? 'default' : 'secondary'}
                          className={student.batch?.course_type === 'SAT' ? 'bg-blue-500' : 'bg-purple-500'}
                        >
                          {student.batch?.course_type || 'N/A'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
