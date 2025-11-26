import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Edit2, Check, X } from "lucide-react";

interface Student {
  id: string;
  name?: string;
  first_name: string;
  last_name: string;
  phone: string;
  parent_phone?: string;
  math_level?: 'bad' | 'average' | 'good' | 'B1' | 'B2' | 'C1' | 'C2' | string;
  english_level?: 'bad' | 'average' | 'good' | 'B1' | 'B2' | 'C1' | 'C2' | string;
  first_session_completed?: boolean;
}

interface Attendance {
  session_number: number;
  status: "present" | "absent" | "sick" | "late" | null;
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
  onUpdateStudent,
  onAttendanceChange,
  onHomeworkChange,
  onTestScoreChange,
}: StudentCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    first_name: student.first_name,
    last_name: student.last_name,
    phone: student.phone,
  });
  const [testInputs, setTestInputs] = useState<Record<number, string>>({});

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

  return (
    <Card className="shadow-lg">
      <CardHeader className="border-b bg-background sticky top-0 z-10 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          {/* Left side: Student name and count */}
          <div className="flex flex-col gap-1">
            <h2 className="text-lg font-bold">
              {(student.first_name && student.first_name.trim()) || student.name || 'Unknown'} {student.last_name && student.last_name.trim() ? student.last_name.charAt(0) + '.' : ''}
            </h2>
            <p className="text-sm font-medium text-muted-foreground">
              Student {currentIndex + 1} of {totalStudents}
            </p>
          </div>
          
          {/* Right side: Warnings */}
          <div className="flex flex-wrap items-center gap-2 justify-end">
            {!student.first_session_completed && (
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20">
                <span className="text-xs font-medium text-amber-600">⚠️ First Session Incomplete</span>
              </div>
            )}
            {hasAlert && (
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-destructive/10 border border-destructive/20">
                <span className="text-xs font-medium text-destructive">
                  ⚠️ Alert: 
                  {missedClasses && missedClasses >= 3 && ` ${missedClasses} classes missed`}
                  {missedClasses && missedClasses >= 3 && missedHomework && missedHomework >= 3 && ' •'}
                  {missedHomework && missedHomework >= 3 && ` ${missedHomework} homework incomplete`}
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
                <p className="font-medium mt-1">{student.phone}</p>
              )}
            </div>

            <div>
              <Label className="text-xs uppercase text-muted-foreground">Parent Phone</Label>
              <p className="font-medium mt-1">{student.parent_phone || "-"}</p>
            </div>

            {courseType === 'SAT' && (
              <div>
                <Label className="text-xs uppercase text-muted-foreground">Math Level</Label>
                <p className="font-medium mt-1">{getLevelDisplay(student.math_level)}</p>
              </div>
            )}

            <div>
              <Label className="text-xs uppercase text-muted-foreground">English Level</Label>
              <p className="font-medium mt-1">{getLevelDisplay(student.english_level)}</p>
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
                        <SelectTrigger className="h-9 text-sm pointer-events-auto">
                          <SelectValue placeholder="Attendance" />
                        </SelectTrigger>
                        <SelectContent className="bg-background z-50 pointer-events-auto">
                          <SelectItem value="present">✓ Present</SelectItem>
                          <SelectItem value="late">⏰ Late</SelectItem>
                          <SelectItem value="absent">✗ Absent</SelectItem>
                          <SelectItem value="sick">🤒 Sick</SelectItem>
                        </SelectContent>
                      </Select>

                      {/* Homework Dropdown */}
                      <Select
                        value={hw?.status || ""}
                        onValueChange={(value) => onHomeworkChange(session.session_number, value)}
                      >
                        <SelectTrigger className="h-9 text-sm pointer-events-auto">
                          <SelectValue placeholder="Homework" />
                        </SelectTrigger>
                        <SelectContent className="bg-background z-50 pointer-events-auto">
                          <SelectItem value="completed">✓ Done</SelectItem>
                          <SelectItem value="incomplete">✗ Incomplete</SelectItem>
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
                  // Map test numbers 1-7 to display as 4-10, with test 7 being "Real SAT mock"
                  const getTestLabel = (testNum: number) => {
                    if (testNum === 7) return "Real SAT mock";
                    return `Test ${testNum + 3}`; // 1→4, 2→5, 3→6, 4→7, 5→8, 6→9
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
      </CardContent>
    </Card>
  );
}
