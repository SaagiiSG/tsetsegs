import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Edit2, Check, X, ExternalLink, StickyNote, Send, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

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
  first_session_completed?: boolean;
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
  onUpdateStudent: (updates: Partial<Student>) => void;
  onAttendanceChange: (session: number, status: string) => void;
  onHomeworkChange: (session: number, status: string) => void;
  onTestScoreChange: (testNumber: number, score: number | null, skills?: { listening?: number | null; reading?: number | null; writing?: number | null; speaking?: number | null }) => void;
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
  onUpdateStudent,
  onAttendanceChange,
  onHomeworkChange,
  onTestScoreChange,
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
  const [showNotes, setShowNotes] = useState(true);

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
      toast({ variant: "destructive", title: "Error", description: error.message });
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
      toast({ variant: "destructive", title: "Error", description: error.message });
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
    <Card className="shadow-lg">
      <CardHeader className="border-b bg-background sticky top-0 z-10 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          {/* Left side: Student name and count */}
          <div className="flex flex-col gap-1">
            <button 
              onClick={() => navigate(`/teacher/student/${student.id}`)}
              className="text-lg font-bold text-left hover:text-primary transition-colors flex items-center gap-2 group"
            >
              {(student.first_name && student.first_name.trim()) || student.name || 'Unknown'} {student.last_name && student.last_name.trim() ? student.last_name.charAt(0) + '.' : ''}
              <ExternalLink className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
            <p className="text-sm font-medium text-muted-foreground">
              Student {currentIndex + 1} of {totalStudents}
            </p>
          </div>
          
          {/* Right side: Square trackers and alerts */}
          <div className="flex flex-col items-end gap-1.5">
            {/* Square trackers */}
            <div className="flex flex-col gap-px">
              <div className="flex gap-px rounded overflow-hidden border border-border/50">
                {attendance.map((session) => (
                  <div
                    key={`att-${session.session_number}`}
                    className={`w-2.5 h-2.5 ${getAttendanceDotColor(session.status)}`}
                    title={`S${session.session_number}: ${session.status || 'unmarked'}`}
                  />
                ))}
              </div>
              <div className="flex gap-px rounded overflow-hidden border border-border/50">
                {homework.map((hw) => (
                  <div
                    key={`hw-${hw.session_number}`}
                    className={`w-2.5 h-2.5 ${getHomeworkDotColor(hw.status)}`}
                    title={`S${hw.session_number}: ${hw.status || 'unmarked'}`}
                  />
                ))}
              </div>
            </div>
            
            {/* Alert badge */}
            {hasAlert && (
              <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-destructive/10 border border-destructive/20">
                <span className="text-[10px] font-medium text-destructive">
                  ⚠️ {missedClasses && missedClasses >= 3 && `${missedClasses} abs`}
                  {missedClasses && missedClasses >= 3 && missedHomework && missedHomework >= 3 && ' • '}
                  {missedHomework && missedHomework >= 3 && `${missedHomework} HW`}
                </span>
              </div>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-6">
        {/* Student Info Section */}
        <div className="mb-6 pb-6 border-b">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Student Information</h3>
            {!isEditing ? (
              <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                <Edit2 className="h-4 w-4 mr-2" />
                Edit Info
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button variant="default" size="sm" onClick={handleSave}>
                  <Check className="h-4 w-4 mr-2" />
                  Save
                </Button>
                <Button variant="outline" size="sm" onClick={handleCancel}>
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <Label className="text-xs uppercase text-muted-foreground">First Name</Label>
              {isEditing ? (
                <Input
                  value={editForm.first_name}
                  onChange={(e) => setEditForm({ ...editForm, first_name: e.target.value })}
                  className="mt-1"
                />
              ) : (
                <p className="font-medium mt-1">{student.first_name || student.name || "-"}</p>
              )}
            </div>

            <div>
              <Label className="text-xs uppercase text-muted-foreground">Last Name</Label>
              {isEditing ? (
                <Input
                  value={editForm.last_name}
                  onChange={(e) => setEditForm({ ...editForm, last_name: e.target.value })}
                  className="mt-1"
                />
              ) : (
                <p className="font-medium mt-1">{student.last_name || "-"}</p>
              )}
            </div>

            <div>
              <Label className="text-xs uppercase text-muted-foreground">Phone</Label>
              {isEditing ? (
                <Input
                  value={editForm.phone}
                  onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                  className="mt-1"
                />
              ) : (
                <a href={`tel:+976${student.phone}`} className="font-medium mt-1 block text-primary hover:underline">
                  {student.phone}
                </a>
              )}
            </div>

            <div>
              <Label className="text-xs uppercase text-muted-foreground">Parent Phone</Label>
              {isEditing ? (
                <Input
                  value={editForm.parent_phone}
                  onChange={(e) => setEditForm({ ...editForm, parent_phone: e.target.value.replace(/\D/g, '') })}
                  maxLength={8}
                  placeholder="8-digit number"
                  className="mt-1"
                />
              ) : student.parent_phone ? (
                <a href={`tel:+976${student.parent_phone}`} className="font-medium mt-1 block text-primary hover:underline">
                  {student.parent_phone}
                </a>
              ) : (
                <p className="font-medium mt-1">-</p>
              )}
            </div>

            <div>
              <Label className="text-xs uppercase text-muted-foreground">Grade</Label>
              {isEditing ? (
                <Input
                  value={editForm.grade}
                  onChange={(e) => setEditForm({ ...editForm, grade: e.target.value })}
                  className="mt-1"
                />
              ) : (
                <p className="font-medium mt-1">{student.grade || "-"}</p>
              )}
            </div>

            <div>
              <Label className="text-xs uppercase text-muted-foreground">School Name</Label>
              {isEditing ? (
                <Input
                  value={editForm.school_name}
                  onChange={(e) => setEditForm({ ...editForm, school_name: e.target.value })}
                  className="mt-1"
                />
              ) : (
                <p className="font-medium mt-1">{student.school_name || "-"}</p>
              )}
            </div>

            {courseType === 'SAT' && (
              <div>
                <Label className="text-xs uppercase text-muted-foreground">Math Level</Label>
                {isEditing ? (
                  <Select
                    value={editForm.math_level}
                    onValueChange={(value) => setEditForm({ ...editForm, math_level: value })}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select level" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bad">Needs Work</SelectItem>
                      <SelectItem value="average">Average</SelectItem>
                      <SelectItem value="good">Good</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <p className="font-medium mt-1">{getLevelDisplay(student.math_level)}</p>
                )}
              </div>
            )}

            <div>
              <Label className="text-xs uppercase text-muted-foreground">English Level</Label>
              {isEditing ? (
                <Select
                  value={editForm.english_level}
                  onValueChange={(value) => setEditForm({ ...editForm, english_level: value })}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select level" />
                  </SelectTrigger>
                  <SelectContent>
                    {courseType === 'IELTS' ? (
                      <>
                        <SelectItem value="B1">B1</SelectItem>
                        <SelectItem value="B2">B2</SelectItem>
                        <SelectItem value="C1">C1</SelectItem>
                        <SelectItem value="C2">C2</SelectItem>
                      </>
                    ) : (
                      <>
                        <SelectItem value="bad">Needs Work</SelectItem>
                        <SelectItem value="average">Average</SelectItem>
                        <SelectItem value="good">Good</SelectItem>
                      </>
                    )}
                  </SelectContent>
                </Select>
              ) : (
                <p className="font-medium mt-1">{getLevelDisplay(student.english_level)}</p>
              )}
            </div>
          </div>
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column: Attendance & Homework */}
          <div className="border rounded-lg p-4">
            <h3 className="text-sm font-semibold uppercase text-muted-foreground mb-4">
              Attendance & Homework
            </h3>

            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {attendance.map((session) => {
                const hw = homework.find(h => h.session_number === session.session_number);
                return (
                  <div key={session.session_number} className="pb-2 border-b last:border-0">
                    <p className="text-xs font-medium text-muted-foreground mb-2">Session {session.session_number}</p>
                    <div className="grid grid-cols-2 gap-3">
                      {/* Attendance Dropdown */}
                      <Select
                        value={session.status || ""}
                        onValueChange={(value) => onAttendanceChange(session.session_number, value)}
                      >
                        <SelectTrigger className={`h-9 text-sm pointer-events-auto ${getAttendanceBgColor(session.status)}`}>
                          <SelectValue placeholder="Attendance" />
                        </SelectTrigger>
                        <SelectContent className="bg-background z-50 pointer-events-auto">
                          <SelectItem value="present" className="text-[#03C988]">✓ Present</SelectItem>
                          <SelectItem value="late" className="text-[#FFDE0B]">⏰ Late</SelectItem>
                          <SelectItem value="absent" className="text-[#FA6363]">✗ Absent</SelectItem>
                          <SelectItem value="sick" className="text-blue-400">🤒 Sick</SelectItem>
                          <SelectItem value="excused" className="text-purple-400">🆓 Excused</SelectItem>
                        </SelectContent>
                      </Select>

                      {/* Homework Dropdown */}
                      <Select
                        value={hw?.status || ""}
                        onValueChange={(value) => onHomeworkChange(session.session_number, value)}
                      >
                        <SelectTrigger className={`h-9 text-sm pointer-events-auto ${getHomeworkBgColor(hw?.status || null)}`}>
                          <SelectValue placeholder="Homework" />
                        </SelectTrigger>
                        <SelectContent className="bg-background z-50 pointer-events-auto">
                          <SelectItem value="completed" className="text-[#03C988]">✓ Done</SelectItem>
                          <SelectItem value="incomplete" className="text-[#FA6363]">✗ Incomplete</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Column: Practice Tests */}
          <div className="border rounded-lg p-4">
            <h3 className="text-sm font-semibold uppercase text-muted-foreground mb-4">
              {courseType === 'IELTS' ? 'IELTS Mock Tests' : 'Practice Tests (Math Only)'}
            </h3>

            <div className="space-y-4 max-h-[400px] overflow-y-auto">
              {courseType === 'SAT' ? (
                // SAT: Show single score input
                practiceTests.map((test) => {
                  // Map test numbers to display: Test 4-10, then Real SAT mock
                  const getTestLabel = (testNum: number) => {
                    if (testNum === 8) return "Real SAT mock";
                    return `Test ${testNum + 3}`; // 1→4, 2→5, 3→6, 4→7, 5→8, 6→9, 7→10
                  };
                  
                  return (
                    <div key={test.test_number}>
                      <Label className="text-sm">{getTestLabel(test.test_number)}</Label>
                      <div className="flex items-center gap-2 mt-1">
                        <Input
                          type="number"
                          min="0"
                          max="800"
                          placeholder="___"
                          value={testInputs[test.test_number] ?? test.score ?? ""}
                          onChange={(e) => {
                            const val = e.target.value;
                            // Allow typing and validate range
                            if (val === "" || (parseInt(val) >= 0 && parseInt(val) <= 800)) {
                              setTestInputs(prev => ({ ...prev, [test.test_number]: val }));
                            }
                          }}
                          onBlur={(e) => handleTestScoreBlur(test.test_number, e.target.value)}
                          className="w-24"
                        />
                        <span className="text-sm text-muted-foreground">/ 800</span>
                      </div>
                    </div>
                  );
                })
              ) : (
                // IELTS: Show single overall band score input per test
                practiceTests.map((test) => (
                  <div key={test.test_number}>
                    <Label className="text-sm">Mock {test.test_number}</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <Input
                        type="number"
                        min="0"
                        max="9"
                        step="0.5"
                        placeholder="___"
                        value={testInputs[test.test_number] ?? test.score ?? ""}
                        onChange={(e) => {
                          const val = e.target.value;
                          // Allow typing and validate range
                          if (val === "" || (parseFloat(val) >= 0 && parseFloat(val) <= 9)) {
                            setTestInputs(prev => ({ ...prev, [test.test_number]: val }));
                          }
                        }}
                        onBlur={(e) => handleIELTSScoreBlur(test.test_number, e.target.value)}
                        className="w-24"
                      />
                      <span className="text-sm text-muted-foreground">/ 9.0</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Notes Section */}
        <div className="mt-6 border-t pt-6">
          <div className="flex items-center justify-between mb-3">
            <button
              onClick={() => setShowNotes(!showNotes)}
              className="flex items-center gap-2 text-sm font-semibold uppercase text-muted-foreground hover:text-foreground transition-colors"
            >
              <StickyNote className="h-4 w-4" />
              Notes {notes.length > 0 && `(${notes.length})`}
            </button>
          </div>

          {showNotes && (
            <div className="space-y-3">
              {/* Add Note */}
              <div className="flex gap-2">
                <Textarea
                  placeholder="Add a note..."
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  rows={2}
                  className="resize-none flex-1"
                />
                <Button 
                  onClick={handleAddNote} 
                  disabled={!newNote.trim() || isAddingNote}
                  size="sm"
                  className="self-end"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>

              {/* Notes List */}
              {notes.length > 0 && (
                <ScrollArea className="h-[200px]">
                  <div className="space-y-2 pr-2">
                    {notes.map((note) => (
                      <div 
                        key={note.id} 
                        className="p-3 bg-muted/50 rounded-lg text-sm group relative"
                      >
                        <p className="whitespace-pre-wrap pr-8">{note.content}</p>
                        <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                          <span>{note.created_by}</span>
                          <span>•</span>
                          <span>
                            {new Date(note.created_at).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                            })}
                          </span>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                          onClick={() => handleDeleteNote(note.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
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
  );
}
