import { Navigate, useNavigate } from 'react-router-dom';
import { useStudentAuth } from '@/contexts/StudentAuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { GraduationCap, Languages, ArrowRight, LogOut, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  getEnrolledCourses,
  setPreferredCourse,
  routeForCourse,
  type CourseType,
} from '@/lib/courseRouting';
import { motion } from 'framer-motion';

/**
 * Course chooser shown after login for students enrolled in both SAT and IELTS.
 * SAT-only or IELTS-only students are auto-redirected to their section.
 */
export default function ChooseCourse() {
  const { student, isLoading, logout } = useStudentAuth();
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!student) return <Navigate to="/practice" replace />;

  const courses = getEnrolledCourses(student.linked_students);
  if (courses.isSATOnly) return <Navigate to="/practice/home" replace />;
  if (courses.isIELTSOnly) return <Navigate to="/ielts/dashboard" replace />;
  if (!courses.isBoth) return <Navigate to="/practice/home" replace />;

  const handlePick = (course: CourseType) => {
    setPreferredCourse(course);
    navigate(routeForCourse(course), { replace: true });
  };

  const firstName =
    student.linked_student?.first_name ?? student.linked_students?.[0]?.first_name ?? '';

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center p-4">
      <div className="w-full max-w-3xl space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
            {firstName ? `Welcome back, ${firstName}` : 'Welcome back'}
          </h1>
          <p className="text-muted-foreground">
            You're enrolled in both courses. Which one are you here for today?
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <CourseCard
            title="SAT Practice"
            subtitle="Questions, speed mode, Bluebook, stats"
            icon={GraduationCap}
            tone="from-rose-500/15 to-pink-500/10 border-rose-500/30 text-rose-600 dark:text-rose-300"
            onClick={() => handlePick('SAT')}
          />
          <CourseCard
            title="IELTS Prep"
            subtitle="Your IELTS dashboard and tools"
            icon={Languages}
            tone="from-indigo-500/15 to-blue-500/10 border-indigo-500/30 text-indigo-600 dark:text-indigo-300"
            onClick={() => handlePick('IELTS')}
          />
        </div>

        <div className="text-center">
          <Button variant="ghost" size="sm" onClick={logout} className="text-muted-foreground">
            <LogOut className="h-4 w-4 mr-2" />
            Log out
          </Button>
          <p className="text-xs text-muted-foreground mt-2">
            You can switch courses anytime from the header.
          </p>
        </div>
      </div>
    </div>
  );
}

function CourseCard({
  title,
  subtitle,
  icon: Icon,
  tone,
  onClick,
}: {
  title: string;
  subtitle: string;
  icon: React.ElementType;
  tone: string;
  onClick: () => void;
}) {
  return (
    <motion.button
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="text-left"
    >
      <Card className={`border-2 bg-gradient-to-br ${tone} shadow-md hover:shadow-xl transition-shadow`}>
        <CardContent className="p-6 md:p-8 space-y-4">
          <div className="flex items-center justify-between">
            <div className="h-14 w-14 rounded-2xl bg-background/60 flex items-center justify-center">
              <Icon className="h-7 w-7" />
            </div>
            <ArrowRight className="h-5 w-5 opacity-60" />
          </div>
          <div className="space-y-1">
            <h2 className="text-2xl font-bold text-foreground">{title}</h2>
            <p className="text-sm text-muted-foreground">{subtitle}</p>
          </div>
        </CardContent>
      </Card>
    </motion.button>
  );
}
