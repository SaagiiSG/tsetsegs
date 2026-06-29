import { useNavigate } from 'react-router-dom';
import { useStudentAuth } from '@/contexts/StudentAuthContext';
import { Button } from '@/components/ui/button';
import { Repeat } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  getEnrolledCourses,
  routeForCourse,
  setPreferredCourse,
  type CourseType,
} from '@/lib/courseRouting';

/**
 * Header chip that only renders for students enrolled in both SAT and IELTS.
 * Switches them to the other course's home and remembers the choice.
 */
export function CourseSwitcher({ current, className }: { current: CourseType; className?: string }) {
  const { student } = useStudentAuth();
  const navigate = useNavigate();
  const courses = getEnrolledCourses(student?.linked_students);
  if (!courses.isBoth) return null;

  const other: CourseType = current === 'SAT' ? 'IELTS' : 'SAT';
  const otherLabel = other === 'SAT' ? 'SAT' : 'IELTS';

  const handleSwitch = () => {
    setPreferredCourse(other);
    navigate(routeForCourse(other));
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleSwitch}
      className={cn(
        "gap-1.5 text-xs opacity-90 hover:opacity-100 hover:bg-muted/50 text-foreground",
        className
      )}
      title={`Switch to ${otherLabel}`}
    >
      <Repeat className="h-4 w-4" />
      <span className="hidden sm:inline">Switch to</span> {otherLabel}
    </Button>
  );
}
