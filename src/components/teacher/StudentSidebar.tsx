import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { ArrowRightLeft } from "lucide-react";

interface Student {
  id: string;
  name?: string;
  first_name: string;
  last_name: string;
  phone: string;
}

interface Batch {
  schedule: string;
  start_date: string;
}

interface AttendanceStatus {
  session_number: number;
  status: "present" | "absent" | "sick" | "late" | "excused" | null;
}

interface HomeworkStatus {
  session_number: number;
  status: "completed" | "incomplete" | null;
}

interface SwitchedStudentInfo {
  otherBatchName: string;
  otherAttendance: number;
  currentAttendance: number;
}

interface StudentSidebarProps {
  students: Student[];
  currentIndex: number;
  onSelectStudent: (index: number) => void;
  batch: Batch | null;
  courseType: 'SAT' | 'IELTS';
  getStudentAlertStatus: (studentId: string) => {
    hasAlert: boolean;
    missedClasses: number;
    missedHomework: number;
  };
  getStudentAttendance?: (studentId: string) => AttendanceStatus[];
  getStudentHomework?: (studentId: string) => HomeworkStatus[];
  switchedStudents?: Record<string, SwitchedStudentInfo>;
}

const getAttendanceDotColor = (status: string | null) => {
  switch (status) {
    case 'present': return 'bg-[#03C988]/70';
    case 'late': return 'bg-[#FFDE0B]/70';
    case 'absent': return 'bg-[#FA6363]/70';
    case 'sick': return 'bg-blue-400/70';
    case 'excused': return 'bg-purple-400/70';
    default: return 'bg-muted-foreground/20';
  }
};

const getHomeworkDotColor = (status: string | null) => {
  switch (status) {
    case 'completed': return 'bg-[#03C988]/70';
    case 'incomplete': return 'bg-[#FA6363]/70';
    default: return 'bg-muted-foreground/20';
  }
};

export function StudentSidebar({ 
  students, 
  currentIndex, 
  onSelectStudent, 
  batch, 
  courseType,
  getStudentAlertStatus,
  getStudentAttendance,
  getStudentHomework,
  switchedStudents = {},
}: StudentSidebarProps) {
  // Split sessions into rows based on course type
  // SAT (15 sessions): 10 + 5
  // IELTS (24 sessions): 10 + 10 + 4
  const getSessionRows = (sessions: AttendanceStatus[] | HomeworkStatus[]) => {
    if (courseType === 'SAT') {
      return [sessions.slice(0, 10), sessions.slice(10, 15)];
    } else {
      return [sessions.slice(0, 10), sessions.slice(10, 20), sessions.slice(20, 24)];
    }
  };
  return (
    <div className="w-64 border-r bg-card h-full">
      <div className="p-4 border-b space-y-3">
        <h3 className="font-semibold text-sm uppercase text-muted-foreground">Class Info</h3>
        {batch && (
          <div className="space-y-2 text-xs">
            <div>
              <div className="text-muted-foreground">Schedule</div>
              <div className="text-foreground font-medium">{batch.schedule}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Started</div>
              <div className="text-foreground font-medium">
                {new Date(batch.start_date).toLocaleDateString()}
              </div>
            </div>
          </div>
        )}
      </div>
      <div className="px-4 py-2 border-b">
        <h3 className="font-semibold text-sm uppercase text-muted-foreground">Students</h3>
      </div>
      <ScrollArea className="h-[calc(100%-200px)]">
        <div className="p-2">
          {students.map((student, index) => {
            const displayName = (student.first_name && student.first_name.trim()) 
              ? (student.last_name 
                  ? `${student.first_name} ${student.last_name.charAt(0)}.`
                  : student.first_name)
              : student.name || 'Unknown';
            
            const alertStatus = getStudentAlertStatus(student.id);
            const attendance = getStudentAttendance?.(student.id) || [];
            const homework = getStudentHomework?.(student.id) || [];
            const switchedInfo = switchedStudents[student.id];

            return (
              <TooltipProvider key={student.id}>
                <button
                  onClick={() => onSelectStudent(index)}
                  className={cn(
                    "w-full text-left px-3 py-2 rounded-md text-sm transition-colors mb-1",
                    currentIndex === index
                      ? "bg-primary text-primary-foreground font-bold"
                      : switchedInfo
                      ? "bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30"
                      : alertStatus.hasAlert
                      ? "bg-destructive/10 hover:bg-destructive/20 text-destructive font-semibold border border-destructive/30"
                      : "hover:bg-muted"
                  )}
                >
                  <div className="flex items-start gap-2">
                    {/* Name and alerts */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <span className="truncate">{index + 1}. {displayName}</span>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          {switchedInfo && currentIndex !== index && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="text-amber-600">
                                  <ArrowRightLeft className="h-3 w-3" />
                                </span>
                              </TooltipTrigger>
                              <TooltipContent side="right" className="max-w-[200px]">
                                <p className="text-xs">
                                  Switched to {switchedInfo.otherBatchName} ({switchedInfo.otherAttendance} vs {switchedInfo.currentAttendance} here)
                                </p>
                              </TooltipContent>
                            </Tooltip>
                          )}
                          {alertStatus.hasAlert && currentIndex !== index && (
                            <span className="text-xs">⚠️</span>
                          )}
                        </div>
                      </div>
                      {switchedInfo && currentIndex !== index && (
                        <div className="text-[10px] text-amber-600 truncate">
                          → {switchedInfo.otherBatchName}
                        </div>
                      )}
                      {alertStatus.hasAlert && currentIndex !== index && !switchedInfo && (
                        <div className="text-xs opacity-90">
                          {alertStatus.missedClasses >= 3 && `${alertStatus.missedClasses} abs`}
                          {alertStatus.missedClasses >= 3 && alertStatus.missedHomework >= 3 && ' • '}
                          {alertStatus.missedHomework >= 3 && `${alertStatus.missedHomework} HW`}
                        </div>
                      )}
                    </div>
                    
                    {/* Square trackers - right of name */}
                    {(attendance.length > 0 || homework.length > 0) && (
                      <div className="flex flex-col gap-0.5 flex-shrink-0">
                        {/* Attendance rows */}
                        {attendance.length > 0 && (
                          <div className="flex flex-col gap-px">
                            {getSessionRows(attendance).map((row, rowIndex) => (
                              <div key={`att-row-${rowIndex}`} className="flex gap-px rounded overflow-hidden">
                                {row.map((a) => (
                                  <div
                                    key={`s-att-${(a as AttendanceStatus).session_number}`}
                                    className={`w-1.5 h-1.5 ${getAttendanceDotColor((a as AttendanceStatus).status)}`}
                                  />
                                ))}
                              </div>
                            ))}
                          </div>
                        )}
                        {/* Homework rows */}
                        {homework.length > 0 && (
                          <div className="flex flex-col gap-px">
                            {getSessionRows(homework).map((row, rowIndex) => (
                              <div key={`hw-row-${rowIndex}`} className="flex gap-px rounded overflow-hidden">
                                {row.map((h) => (
                                  <div
                                    key={`s-hw-${(h as HomeworkStatus).session_number}`}
                                    className={`w-1.5 h-1.5 ${getHomeworkDotColor((h as HomeworkStatus).status)}`}
                                  />
                                ))}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </button>
              </TooltipProvider>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}
