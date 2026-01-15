import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Search, User, Phone, GraduationCap, Loader2 } from 'lucide-react';

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
  const [results, setResults] = useState<StudentResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  // Debounced real-time search
  useEffect(() => {
    if (!searchQuery.trim()) {
      setResults([]);
      return;
    }

    const debounceTimer = setTimeout(() => {
      performSearch(searchQuery);
    }, 300);

    return () => clearTimeout(debounceTimer);
  }, [searchQuery]);

  const performSearch = async (query: string) => {
    setIsLoading(true);

    try {
      // Clean the search query - remove spaces and dashes for phone search
      const cleanedQuery = query.replace(/[-\s]/g, '');
      
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
        .or(`phone.ilike.%${cleanedQuery}%,parent_phone.ilike.%${cleanedQuery}%,name.ilike.%${query}%,first_name.ilike.%${query}%,last_name.ilike.%${query}%`)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      // Transform data to flatten batch relationship
      const transformedData = (data || []).map(student => ({
        ...student,
        batch: Array.isArray(student.batch) ? student.batch[0] : student.batch
      })) as StudentResult[];

      setResults(transformedData);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setIsLoading(false);
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
            Search for students by phone number, parent phone, or name
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Start typing phone number or name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-10"
              autoFocus
            />
            {isLoading && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
            )}
          </div>
        </CardContent>
      </Card>

      {searchQuery.trim() && (
        <Card>
          <CardHeader>
            <CardTitle>Results</CardTitle>
            <CardDescription>
              Found {results.length} student{results.length !== 1 ? 's' : ''}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : results.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <User className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No students found matching "{searchQuery}"</p>
              </div>
            ) : (
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
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
