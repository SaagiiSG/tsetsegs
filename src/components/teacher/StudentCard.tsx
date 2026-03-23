import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AttendanceSlider } from "@/components/teacher/AttendanceSlider";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Edit2, Check, X, ExternalLink, StickyNote, Send, Trash2, Pencil, ChevronDown, ChevronUp, ClipboardList, Trophy, ArrowRightLeft } from "lucide-react";
import { NudgeButton } from './NudgeButton';
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { getErrorToast } from "@/lib/errorUtils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface Student {
  id: string;
  name?: string;
  first_name: string;
  last_name: string;
  phone: string;
  parent_phone?: string;
  grade?: string;
  school_name?: string;
  math_level?: 'bad' | 'average' | 'good' | 'B1' | 'B2' | 'C1' | 'C2' | string;
  english_level?: 'bad' | 'average' | 'good' | 'B1' | 'B2' | 'C1' | 'C2' | string;
}

interface Attendance {
  session_number: number;
  status: "present" | "absent" | "sick" | "late" | "excused" | null;
}

interface Homework {
  session_number: number;
  status: "completed" | "incomplete" | null;
}

interface PracticeTest {
  test_number: number;
  score: number | null;
  listening?: number | null;
  reading?: number | null;
  writing?: number | null;
  speaking?: number | null;
}

interface StudentNote {
  id: string;
  content: string;
  created_by: string;
  created_at: string;
}

interface StudentCardProps {
  student: Student;
  currentIndex: number;
  totalStudents: number;
  attendance: Attendance[];
  homework: Homework[];
  practiceTests: PracticeTest[];
  hasAlert?: boolean;
  missedClasses?: number;
  missedHomework?: number;
  courseType: 'SAT' | 'IELTS';
  batchId: string;
  teacherName: string;
  teacherId?: string;
  switchedInfo?: {
    otherBatchName: string;
    otherAttendance: number;
    currentAttendance: number;
  };
  onUpdateStudent: (updates: Partial<Student>) => void;
  onAttendanceChange: (session: number, status: string) => void;
  onHomeworkChange: (session: number, status: string) => void;
  onTestScoreChange: (testNumber: number, score: number | null, skills?: { listening?: number | null; reading?: number | null; writing?: number | null; speaking?: number | null }) => void;
  onRemoveFromClass?: (permanentDelete: boolean) => void;
}

export function StudentCard({
  student,
  currentIndex,
  totalStudents,
  attendance,
  homework,
  practiceTests,
  hasAlert,
  missedClasses,
  missedHomework,
  courseType,
  batchId,
  teacherName,
  teacherId,
  switchedInfo,
  onUpdateStudent,
  onAttendanceChange,
  onHomeworkChange,
  onTestScoreChange,
  onRemoveFromClass,
}: StudentCardProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    first_name: student.first_name,
    last_name: student.last_name,
    phone: student.phone,
    parent_phone: student.parent_phone || '',
    grade: student.grade || '',
    school_name: student.school_name || '',
    math_level: student.math_level || '',
    english_level: student.english_level || '',
  });
  const [testInputs, setTestInputs] = useState<Record<number, string>>({});
  
  // Notes state
  const [notes, setNotes] = useState<StudentNote[]>([]);
  const [newNote, setNewNote] = useState("");
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [showNotes, setShowNotes] = useState(false); // Collapsed by default on mobile
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editingNoteContent, setEditingNoteContent] = useState("");
  const [showStudentInfo, setShowStudentInfo] = useState(false); // Collapsed by default

  // Fetch notes when student changes
  useEffect(() => {
    if (student.id && batchId) {
      fetchNotes();
    }
  }, [student.id, batchId]);

  const fetchNotes = async () => {
    const { data } = await supabase
      .from("student_notes")
      .select("id, content, created_by, created_at")
      .eq("student_id", student.id)
      .eq("batch_id", batchId)
      .order("created_at", { ascending: false });
    setNotes(data || []);
  };

  const handleAddNote = async () => {
    if (!newNote.trim() || !teacherName) return;
    setIsAddingNote(true);
    try {
      const { data, error } = await supabase
        .from("student_notes")
        .insert({
          student_id: student.id,
          batch_id: batchId,
          content: newNote.trim(),
          created_by: teacherName,
        })
        .select()
        .single();
      if (error) throw error;
      setNotes([data, ...notes]);
      setNewNote("");
      toast({ title: "Note saved" });
    } catch (error: any) {
      const errorToast = getErrorToast(error, "save note");
      toast({ variant: "destructive", ...errorToast });
    } finally {
      setIsAddingNote(false);
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    try {
      const { error } = await supabase.from("student_notes").delete().eq("id", noteId);
      if (error) throw error;
      setNotes(notes.filter(n => n.id !== noteId));
      toast({ title: "Note deleted" });
    } catch (error: any) {
      const errorToast = getErrorToast(error, "delete note");
      toast({ variant: "destructive", ...errorToast });
    }
  };

  const handleEditNote = async (noteId: string) => {
    if (!editingNoteContent.trim()) return;
    try {
      const { error } = await supabase
        .from("student_notes")
        .update({ content: editingNoteContent.trim() })
        .eq("id", noteId);
      if (error) throw error;
      setNotes(notes.map(n => n.id === noteId ? { ...n, content: editingNoteContent.trim() } : n));
      setEditingNoteId(null);
      setEditingNoteContent("");
      toast({ title: "Note updated" });
    } catch (error: any) {
      const errorToast = getErrorToast(error, "update note");
      toast({ variant: "destructive", ...errorToast });
    }
  };

  // Note: Alert calculation is now done in parent component based on current week

  const handleSave = () => {
    onUpdateStudent(editForm);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditForm({
      first_name: student.first_name,
      last_name: student.last_name,
      phone: student.phone,
      parent_phone: student.parent_phone || '',
      grade: student.grade || '',
      school_name: student.school_name || '',
      math_level: student.math_level || '',
      english_level: student.english_level || '',
    });
    setIsEditing(false);
  };

  const handleTestScoreBlur = (testNumber: number, value: string) => {
    const parsed = parseInt(value);
    if (value === "") {
      onTestScoreChange(testNumber, null);
    } else if (!isNaN(parsed) && parsed >= 0 && parsed <= 800) {
      onTestScoreChange(testNumber, parsed);
    }
    // Clear local input state after save
    setTestInputs(prev => {
      const next = { ...prev };
      delete next[testNumber];
      return next;
    });
  };

  const handleIELTSScoreBlur = (testNumber: number, value: string) => {
    const parsed = parseFloat(value);
    if (value === "") {
      onTestScoreChange(testNumber, null);
    } else if (!isNaN(parsed) && parsed >= 0 && parsed <= 9) {
      // Round to nearest 0.5
      const rounded = Math.round(parsed * 2) / 2;
      onTestScoreChange(testNumber, rounded);
    }
    // Clear local input state after save
    setTestInputs(prev => {
      const next = { ...prev };
      delete next[testNumber];
      return next;
    });
  };

  const getLevelDisplay = (level?: 'bad' | 'average' | 'good' | 'B1' | 'B2' | 'C1' | 'C2' | string) => {
    if (!level) return '-';
    
    // CEFR levels for IELTS
    if (['B1', 'B2', 'C1', 'C2'].includes(level)) {
      return level;
    }
    
    // SAT levels
    const levelMap: Record<string, string> = {
      'bad': 'Needs Work',
      'average': 'Average',
      'good': 'Good'
    };
    return levelMap[level] || level;
  };

  // Dot color helper functions - using dimmed custom colors
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

  // Background color for select triggers
  const getAttendanceBgColor = (status: string | null) => {
    switch (status) {
      case 'present': return 'bg-[#03C988]/20 border-[#03C988]/40';
      case 'late': return 'bg-[#FFDE0B]/20 border-[#FFDE0B]/40';
      case 'absent': return 'bg-[#FA6363]/20 border-[#FA6363]/40';
      case 'sick': return 'bg-blue-400/20 border-blue-400/40';
      case 'excused': return 'bg-purple-400/20 border-purple-400/40';
      default: return '';
    }
  };

  const getHomeworkBgColor = (status: string | null) => {
    switch (status) {
      case 'completed': return 'bg-[#03C988]/20 border-[#03C988]/40';
      case 'incomplete': return 'bg-[#FA6363]/20 border-[#FA6363]/40';
      default: return '';
    }
  };

  return (
    <TooltipProvider>
    <Card className={`shadow-lg ${switchedInfo ? 'ring-2 ring-amber-500/50' : ''}`}>
      <CardHeader className="border-b bg-background sticky top-0 z-10 shadow-sm p-3 md:p-4">
        <div className="flex items-center justify-between gap-2">
          {/* Left side: Student name and count */}
          <div className="flex flex-col gap-0.5 min-w-0">
            <div className="flex items-center gap-2">
              <button 
                onClick={() => navigate(`/teacher/student/${student.id}`)}
                className="text-sm md:text-lg font-bold text-left hover:text-primary transition-colors flex items-center gap-1.5 group truncate"
              >
                <span className="truncate">
                  {(student.first_name && student.first_name.trim()) || student.name || 'Unknown'} {student.last_name && student.last_name.trim() ? student.last_name.charAt(0) + '.' : ''}
                </span>
                <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
              </button>
              {switchedInfo && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 cursor-help">
                      <ArrowRightLeft className="h-3 w-3 text-amber-600" />
                      <span className="text-[10px] font-medium text-amber-600">Switched</span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="max-w-[280px]">
                    <div className="space-y-1">
                      <p className="font-semibold text-amber-600">Student enrolled in another class</p>
                      <p className="text-xs">
                        More active in <span className="font-medium">{switchedInfo.otherBatchName}</span> ({switchedInfo.otherAttendance} sessions) vs this class ({switchedInfo.currentAttendance} sessions).
                      </p>
                    </div>
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {currentIndex + 1} of {totalStudents}
            </p>
          </div>
          
          {/* Right side: actions + compact trackers and alerts */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Nudge Button - shows when student has alerts */}
            {teacherId && hasAlert && (
              <NudgeButton
                studentId={student.id}
                studentName={`${student.first_name} ${student.last_name || ''}`.trim()}
                teacherId={teacherId}
                batchId={batchId}
                parentPhone={student.parent_phone}
                missedClasses={missedClasses}
                missedHomework={missedHomework}
                variant="compact"
              />
            )}

            {onRemoveFromClass && (
              <RemoveStudentDialog
                studentId={student.id}
                studentName={`${student.first_name} ${student.last_name}`}
                batchId={batchId}
                onRemoveFromClass={onRemoveFromClass}
              />
            )}

            {/* Square trackers - split into rows based on course type */}
            {/* SAT (15): 10 + 5, IELTS (24): 10 + 10 + 4 */}
            <div className="flex flex-col gap-1">
              {/* Attendance rows */}
              <div className="flex flex-col gap-px">
                {(courseType === 'SAT' 
                  ? [attendance.slice(0, 10), attendance.slice(10, 15)]
                  : [attendance.slice(0, 10), attendance.slice(10, 20), attendance.slice(20, 24)]
                ).map((row, rowIndex) => (
                  <div key={`att-row-${rowIndex}`} className="flex gap-px rounded overflow-hidden border border-border/50">
                    {row.map((session) => (
                      <div
                        key={`att-${session.session_number}`}
                        className={`w-1.5 h-1.5 md:w-2 md:h-2 ${getAttendanceDotColor(session.status)}`}
                        title={`S${session.session_number}: ${session.status || 'unmarked'}`}
                      />
                    ))}
                  </div>
                ))}
              </div>
              {/* Homework rows */}
              <div className="flex flex-col gap-px">
                {(courseType === 'SAT' 
                  ? [homework.slice(0, 10), homework.slice(10, 15)]
                  : [homework.slice(0, 10), homework.slice(10, 20), homework.slice(20, 24)]
                ).map((row, rowIndex) => (
                  <div key={`hw-row-${rowIndex}`} className="flex gap-px rounded overflow-hidden border border-border/50">
                    {row.map((hw) => (
                      <div
                        key={`hw-${hw.session_number}`}
                        className={`w-1.5 h-1.5 md:w-2 md:h-2 ${getHomeworkDotColor(hw.status)}`}
                        title={`S${hw.session_number}: ${hw.status || 'unmarked'}`}
                      />
                    ))}
                  </div>
                ))}
              </div>
            </div>
            
            {/* Alert badge - compact */}
            {hasAlert && (
              <div className="inline-flex items-center px-1.5 py-0.5 rounded-full bg-destructive/10 border border-destructive/20">
                <span className="text-[9px] md:text-[10px] font-medium text-destructive whitespace-nowrap">
                  ⚠️ {missedClasses !== undefined && missedClasses >= 3 ? `${missedClasses}A` : ''}
                  {missedClasses !== undefined && missedClasses >= 3 && missedHomework !== undefined && missedHomework >= 3 ? '/' : ''}
                  {missedHomework !== undefined && missedHomework >= 3 ? `${missedHomework}H` : ''}
                </span>
              </div>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-3 md:p-6">
        {/* Collapsible Student Info Section */}
        <div className="mb-3 md:mb-6 pb-3 md:pb-6 border-b">
          <button
            onClick={() => setShowStudentInfo(!showStudentInfo)}
            className="flex items-center justify-between w-full text-left"
          >
            <h3 className="text-xs md:text-sm font-semibold uppercase text-muted-foreground">
              Student Info
            </h3>
            <div className="flex items-center gap-2">
              {!showStudentInfo && (
                <span className="text-xs text-muted-foreground hidden sm:inline">
                  {student.phone} • {student.grade || 'No grade'}
                </span>
              )}
              {showStudentInfo ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </div>
          </button>

          {showStudentInfo && (
            <div className="mt-3 space-y-3">
              <div className="flex justify-end">
                {!isEditing ? (
                  <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setIsEditing(true)}>
                    <Edit2 className="h-3 w-3 mr-1" />
                    Edit
                  </Button>
                ) : (
                  <div className="flex gap-1.5">
                    <Button variant="default" size="sm" className="h-7 text-xs" onClick={handleSave}>
                      <Check className="h-3 w-3 mr-1" />
                      Save
                    </Button>
                    <Button variant="outline" size="sm" className="h-7 text-xs" onClick={handleCancel}>
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 md:gap-3">
                <div>
                  <Label className="text-[10px] md:text-xs uppercase text-muted-foreground">First Name</Label>
                  {isEditing ? (
                    <Input value={editForm.first_name} onChange={(e) => setEditForm({ ...editForm, first_name: e.target.value })} className="mt-0.5 h-8 text-sm" />
                  ) : (
                    <p className="text-sm font-medium mt-0.5 truncate">{student.first_name || "-"}</p>
                  )}
                </div>
                <div>
                  <Label className="text-[10px] md:text-xs uppercase text-muted-foreground">Last Name</Label>
                  {isEditing ? (
                    <Input value={editForm.last_name} onChange={(e) => setEditForm({ ...editForm, last_name: e.target.value })} className="mt-0.5 h-8 text-sm" />
                  ) : (
                    <p className="text-sm font-medium mt-0.5 truncate">{student.last_name || "-"}</p>
                  )}
                </div>
                <div>
                  <Label className="text-[10px] md:text-xs uppercase text-muted-foreground">Phone</Label>
                  {isEditing ? (
                    <Input value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} className="mt-0.5 h-8 text-sm" />
                  ) : (
                    <a href={`tel:+976${student.phone}`} className="text-sm font-medium mt-0.5 block text-primary">{student.phone}</a>
                  )}
                </div>
                <div>
                  <Label className="text-[10px] md:text-xs uppercase text-muted-foreground">Parent Phone</Label>
                  {isEditing ? (
                    <Input value={editForm.parent_phone} onChange={(e) => setEditForm({ ...editForm, parent_phone: e.target.value.replace(/\D/g, '') })} maxLength={8} className="mt-0.5 h-8 text-sm" />
                  ) : student.parent_phone ? (
                    <a href={`tel:+976${student.parent_phone}`} className="text-sm font-medium mt-0.5 block text-primary">{student.parent_phone}</a>
                  ) : (
                    <p className="text-sm font-medium mt-0.5">-</p>
                  )}
                </div>
                <div>
                  <Label className="text-[10px] md:text-xs uppercase text-muted-foreground">Grade</Label>
                  {isEditing ? (
                    <Input value={editForm.grade} onChange={(e) => setEditForm({ ...editForm, grade: e.target.value })} className="mt-0.5 h-8 text-sm" />
                  ) : (
                    <p className="text-sm font-medium mt-0.5">{student.grade || "-"}</p>
                  )}
                </div>
                <div>
                  <Label className="text-[10px] md:text-xs uppercase text-muted-foreground">School</Label>
                  {isEditing ? (
                    <Input value={editForm.school_name} onChange={(e) => setEditForm({ ...editForm, school_name: e.target.value })} className="mt-0.5 h-8 text-sm" />
                  ) : (
                    <p className="text-sm font-medium mt-0.5 truncate">{student.school_name || "-"}</p>
                  )}
                </div>
                {courseType === 'SAT' && (
                  <div>
                    <Label className="text-[10px] md:text-xs uppercase text-muted-foreground">Math Level</Label>
                    {isEditing ? (
                      <Select value={editForm.math_level} onValueChange={(value) => setEditForm({ ...editForm, math_level: value })}>
                        <SelectTrigger className="mt-0.5 h-8 text-sm"><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="bad">Needs Work</SelectItem>
                          <SelectItem value="average">Average</SelectItem>
                          <SelectItem value="good">Good</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <p className="text-sm font-medium mt-0.5">{getLevelDisplay(student.math_level)}</p>
                    )}
                  </div>
                )}
                <div>
                  <Label className="text-[10px] md:text-xs uppercase text-muted-foreground">English Level</Label>
                  {isEditing ? (
                    <Select value={editForm.english_level} onValueChange={(value) => setEditForm({ ...editForm, english_level: value })}>
                      <SelectTrigger className="mt-0.5 h-8 text-sm"><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>
                        {courseType === 'IELTS' ? (
                          <><SelectItem value="B1">B1</SelectItem><SelectItem value="B2">B2</SelectItem><SelectItem value="C1">C1</SelectItem><SelectItem value="C2">C2</SelectItem></>
                        ) : (
                          <><SelectItem value="bad">Needs Work</SelectItem><SelectItem value="average">Average</SelectItem><SelectItem value="good">Good</SelectItem></>
                        )}
                      </SelectContent>
                    </Select>
                  ) : (
                    <p className="text-sm font-medium mt-0.5">{getLevelDisplay(student.english_level)}</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Mobile: Tabs | Desktop/Tablet: Side-by-side */}
        
        {/* Mobile view - Tabs */}
        <div className="md:hidden">
          <Tabs defaultValue="tracking" className="w-full">
            <TabsList className="grid w-full grid-cols-2 h-8 mb-3">
              <TabsTrigger value="tracking" className="text-xs">
                <ClipboardList className="h-3.5 w-3.5 mr-1.5" />
                Attendance
              </TabsTrigger>
              <TabsTrigger value="tests" className="text-xs">
                <Trophy className="h-3.5 w-3.5 mr-1.5" />
                Tests
              </TabsTrigger>
            </TabsList>

            <TabsContent value="tracking" className="mt-0">
              <div className="border rounded-lg p-2">
              <div className="space-y-1.5 max-h-[280px] overflow-y-auto">
                  {attendance.map((session) => {
                    const hw = homework.find(h => h.session_number === session.session_number);
                    return (
                      <div key={session.session_number} className="pb-1.5 border-b last:border-0">
                        <p className="text-[10px] font-medium text-muted-foreground mb-1">S{session.session_number}</p>
                        <div className="flex items-center gap-2">
                          <AttendanceSlider
                            value={(session.status as "present" | "late" | "absent" | "sick" | "excused" | "") || ""}
                            onChange={(value) => onAttendanceChange(session.session_number, value)}
                          />
                          <Select value={hw?.status || ""} onValueChange={(value) => onHomeworkChange(session.session_number, value)}>
                            <SelectTrigger className={`h-7 text-[11px] w-[70px] ${getHomeworkBgColor(hw?.status || null)}`}>
                              <SelectValue placeholder="HW" />
                            </SelectTrigger>
                            <SelectContent className="bg-background z-50">
                              <SelectItem value="completed" className="text-[#03C988] text-xs">✓ Done</SelectItem>
                              <SelectItem value="incomplete" className="text-[#FA6363] text-xs">✗ Not</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="tests" className="mt-0">
              <div className="border rounded-lg p-2">
                <div className="grid grid-cols-2 gap-2 max-h-[280px] overflow-y-auto">
                  {courseType === 'SAT' ? (
                    practiceTests.map((test) => {
                  const getTestLabel = (testNum: number) => testNum === 9 ? "SAT Mock" : `Test ${testNum + 3}`;
                      return (
                        <div key={test.test_number} className="space-y-1">
                          <Label className="text-[10px]">{getTestLabel(test.test_number)}</Label>
                          <div className="flex items-center gap-1">
                            <Input
                              type="number"
                              min="0"
                              max="800"
                              placeholder="—"
                              value={testInputs[test.test_number] ?? test.score ?? ""}
                              onChange={(e) => {
                                const val = e.target.value;
                                if (val === "" || (parseInt(val) >= 0 && parseInt(val) <= 800)) {
                                  setTestInputs(prev => ({ ...prev, [test.test_number]: val }));
                                }
                              }}
                              onBlur={(e) => handleTestScoreBlur(test.test_number, e.target.value)}
                              className="w-16 h-7 text-xs"
                            />
                            <span className="text-[10px] text-muted-foreground">/800</span>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    practiceTests.map((test) => (
                      <div key={test.test_number} className="space-y-1">
                        <Label className="text-[10px]">Mock {test.test_number}</Label>
                        <div className="flex items-center gap-1">
                          <Input
                            type="number"
                            min="0"
                            max="9"
                            step="0.5"
                            placeholder="—"
                            value={testInputs[test.test_number] ?? test.score ?? ""}
                            onChange={(e) => {
                              const val = e.target.value;
                              // Allow intermediate typing states (e.g., "7.", "7.5")
                              if (val === "" || /^\d*\.?\d*$/.test(val)) {
                                const num = parseFloat(val);
                                if (val === "" || val === "." || isNaN(num) || (num >= 0 && num <= 9)) {
                                  setTestInputs(prev => ({ ...prev, [test.test_number]: val }));
                                }
                              }
                            }}
                            onBlur={(e) => handleIELTSScoreBlur(test.test_number, e.target.value)}
                            className="w-14 h-7 text-xs"
                          />
                          <span className="text-[10px] text-muted-foreground">/9</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* Desktop/Tablet view - Side by side */}
        <div className="hidden md:grid md:grid-cols-2 gap-4">
          {/* Attendance & Homework Column */}
          <div className="border rounded-lg p-4">
            <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-3 flex items-center gap-1.5">
              <ClipboardList className="h-3.5 w-3.5" />
              Attendance & Homework
            </h4>
            <div className="space-y-2 max-h-[350px] overflow-y-auto">
              {attendance.map((session) => {
                const hw = homework.find(h => h.session_number === session.session_number);
                return (
                  <div key={session.session_number} className="pb-2 border-b last:border-0">
                    <p className="text-xs font-medium text-muted-foreground mb-1">Session {session.session_number}</p>
                    <div className="flex items-center gap-3">
                      <AttendanceSlider
                        value={(session.status as "present" | "late" | "absent" | "sick" | "excused" | "") || ""}
                        onChange={(value) => onAttendanceChange(session.session_number, value)}
                      />
                      <Select value={hw?.status || ""} onValueChange={(value) => onHomeworkChange(session.session_number, value)}>
                        <SelectTrigger className={`h-8 text-xs w-[90px] ${getHomeworkBgColor(hw?.status || null)}`}>
                          <SelectValue placeholder="Homework" />
                        </SelectTrigger>
                        <SelectContent className="bg-background z-50">
                          <SelectItem value="completed" className="text-[#03C988] text-xs">✓ Done</SelectItem>
                          <SelectItem value="incomplete" className="text-[#FA6363] text-xs">✗ Incomplete</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Tests Column */}
          <div className="border rounded-lg p-4">
            <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-3 flex items-center gap-1.5">
              <Trophy className="h-3.5 w-3.5" />
              Practice Tests
            </h4>
            <div className="grid grid-cols-2 gap-3 max-h-[350px] overflow-y-auto">
              {courseType === 'SAT' ? (
                practiceTests.map((test) => {
                  const getTestLabel = (testNum: number) => testNum === 9 ? "SAT Mock" : `Test ${testNum + 3}`;
                  return (
                    <div key={test.test_number} className="space-y-1">
                      <Label className="text-xs">{getTestLabel(test.test_number)}</Label>
                      <div className="flex items-center gap-1">
                        <Input
                          type="number"
                          min="0"
                          max="800"
                          placeholder="—"
                          value={testInputs[test.test_number] ?? test.score ?? ""}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val === "" || (parseInt(val) >= 0 && parseInt(val) <= 800)) {
                              setTestInputs(prev => ({ ...prev, [test.test_number]: val }));
                            }
                          }}
                          onBlur={(e) => handleTestScoreBlur(test.test_number, e.target.value)}
                          className="w-20 h-8 text-sm"
                        />
                        <span className="text-xs text-muted-foreground">/800</span>
                      </div>
                    </div>
                  );
                })
              ) : (
                practiceTests.map((test) => (
                  <div key={test.test_number} className="space-y-1">
                    <Label className="text-xs">Mock {test.test_number}</Label>
                    <div className="flex items-center gap-1">
                      <Input
                        type="number"
                        min="0"
                        max="9"
                        step="0.5"
                        placeholder="—"
                        value={testInputs[test.test_number] ?? test.score ?? ""}
                        onChange={(e) => {
                          const val = e.target.value;
                          // Allow intermediate typing states (e.g., "7.", "7.5")
                          if (val === "" || /^\d*\.?\d*$/.test(val)) {
                            const num = parseFloat(val);
                            if (val === "" || val === "." || isNaN(num) || (num >= 0 && num <= 9)) {
                              setTestInputs(prev => ({ ...prev, [test.test_number]: val }));
                            }
                          }
                        }}
                        onBlur={(e) => handleIELTSScoreBlur(test.test_number, e.target.value)}
                        className="w-16 h-8 text-sm"
                      />
                      <span className="text-xs text-muted-foreground">/9</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Collapsible Notes Section */}
        <div className="mt-3 md:mt-6 border-t pt-3 md:pt-4">
          <button
            onClick={() => setShowNotes(!showNotes)}
            className="flex items-center justify-between w-full text-left"
          >
            <span className="flex items-center gap-1.5 text-xs md:text-sm font-semibold uppercase text-muted-foreground">
              <StickyNote className="h-3.5 w-3.5" />
              Notes {notes.length > 0 && `(${notes.length})`}
            </span>
            {showNotes ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>

          {showNotes && (
            <div className="mt-2 space-y-2">
              <div className="flex gap-1.5">
                <Textarea
                  placeholder="Add a note..."
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  rows={2}
                  className="resize-none flex-1 text-sm"
                />
                <Button onClick={handleAddNote} disabled={!newNote.trim() || isAddingNote} size="sm" className="self-end h-8 w-8 p-0">
                  <Send className="h-3.5 w-3.5" />
                </Button>
              </div>

              {notes.length > 0 && (
                <ScrollArea className="h-[120px] md:h-[160px]">
                  <div className="space-y-1.5 pr-2">
                    {notes.map((note) => (
                      <div key={note.id} className="p-2 bg-muted/50 rounded-lg text-xs group relative">
                        {editingNoteId === note.id ? (
                          <div className="space-y-1.5">
                            <Textarea value={editingNoteContent} onChange={(e) => setEditingNoteContent(e.target.value)} rows={2} className="resize-none text-xs" autoFocus />
                            <div className="flex gap-1 justify-end">
                              <Button size="sm" variant="ghost" className="h-6 text-[10px]" onClick={() => { setEditingNoteId(null); setEditingNoteContent(""); }}>Cancel</Button>
                              <Button size="sm" className="h-6 text-[10px]" onClick={() => handleEditNote(note.id)}>Save</Button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <p className="whitespace-pre-wrap pr-12 text-xs">{note.content}</p>
                            <div className="flex items-center gap-1.5 mt-1 text-[10px] text-muted-foreground">
                              <span>{note.created_by}</span>
                              <span>•</span>
                              <span>{new Date(note.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                            </div>
                            <div className="absolute top-1.5 right-1.5 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => { setEditingNoteId(note.id); setEditingNoteContent(note.content); }}>
                                <Pencil className="h-2.5 w-2.5" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-5 w-5 hover:text-destructive" onClick={() => handleDeleteNote(note.id)}>
                                <Trash2 className="h-2.5 w-2.5" />
                              </Button>
                            </div>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
    </TooltipProvider>
  );
}
