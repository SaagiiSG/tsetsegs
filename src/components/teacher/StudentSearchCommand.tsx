import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useTeacherAuth } from '@/contexts/TeacherAuthContext';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import { Badge } from '@/components/ui/badge';
import { User, Phone, GraduationCap, Search } from 'lucide-react';

interface Student {
  id: string;
  first_name: string;
  last_name: string;
  phone: string;
  batch_id: string;
  batch_name: string;
  course_type: 'SAT' | 'IELTS';
}

interface StudentSearchCommandProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function StudentSearchCommand({ open, onOpenChange }: StudentSearchCommandProps) {
  const { teacherName } = useTeacherAuth();
  const navigate = useNavigate();
  const [students, setStudents] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (open && teacherName) {
      fetchStudents();
    }
  }, [open, teacherName]);

  // Global keyboard shortcut
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        onOpenChange(!open);
      }
    };

    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, [open, onOpenChange]);

  const fetchStudents = async () => {
    if (!teacherName) return;
    
    try {
      setIsLoading(true);
      
      // Fetch batches for this teacher
      const { data: batches, error: batchesError } = await supabase
        .from('batches')
        .select('id, batch_name, course_type')
        .ilike('teacher', `%${teacherName}%`);
      
      if (batchesError) throw batchesError;
      if (!batches || batches.length === 0) {
        setStudents([]);
        return;
      }

      const batchIds = batches.map(b => b.id);
      const batchMap = new Map(batches.map(b => [b.id, { name: b.batch_name, course: b.course_type }]));

      // Fetch all students in these batches
      const { data: studentsData, error: studentsError } = await supabase
        .from('students')
        .select('id, first_name, last_name, phone, batch_id')
        .in('batch_id', batchIds)
        .order('first_name');
      
      if (studentsError) throw studentsError;

      const enrichedStudents = (studentsData || []).map(s => ({
        ...s,
        batch_name: batchMap.get(s.batch_id)?.name || 'Unknown',
        course_type: batchMap.get(s.batch_id)?.course as 'SAT' | 'IELTS'
      }));

      setStudents(enrichedStudents);
    } catch (error) {
      console.error('Error fetching students:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelect = (studentId: string) => {
    onOpenChange(false);
    navigate(`/teacher/student/${studentId}`);
  };

  // Group students by batch
  const groupedStudents = students.reduce((acc, student) => {
    const key = student.batch_name;
    if (!acc[key]) {
      acc[key] = { students: [], course_type: student.course_type };
    }
    acc[key].students.push(student);
    return acc;
  }, {} as Record<string, { students: Student[]; course_type: 'SAT' | 'IELTS' }>);

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Search students by name or phone..." />
      <CommandList>
        <CommandEmpty>
          {isLoading ? 'Loading students...' : 'No students found.'}
        </CommandEmpty>
        
        {Object.entries(groupedStudents).map(([batchName, { students, course_type }], index) => (
          <div key={batchName}>
            {index > 0 && <CommandSeparator />}
            <CommandGroup 
              heading={
                <div className="flex items-center gap-2">
                  <GraduationCap className="h-3 w-3" />
                  <span>{batchName}</span>
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
                </div>
              }
            >
              {students.map((student) => (
                <CommandItem
                  key={student.id}
                  value={`${student.first_name} ${student.last_name} ${student.phone}`}
                  onSelect={() => handleSelect(student.id)}
                  className="flex items-center justify-between cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span>{student.first_name} {student.last_name}</span>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Phone className="h-3 w-3" />
                    <span>{student.phone}</span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </div>
        ))}
      </CommandList>
    </CommandDialog>
  );
}

// Hook to use the search command
export function useStudentSearchCommand() {
  const [open, setOpen] = useState(false);
  
  return {
    open,
    setOpen,
    SearchCommand: () => <StudentSearchCommand open={open} onOpenChange={setOpen} />
  };
}
