import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Edit2, Check, X } from "lucide-react";

interface Student {
  id: string;
  first_name: string;
  last_name: string;
  phone: string;
}

interface Attendance {
  session_number: number;
  status: "present" | "absent" | "sick" | "late" | null;
}

interface Homework {
  session_number: number;
  completed: boolean;
}

interface PracticeTest {
  test_number: number;
  score: number | null;
}

interface StudentCardProps {
  student: Student;
  currentIndex: number;
  totalStudents: number;
  attendance: Attendance[];
  homework: Homework[];
  practiceTests: PracticeTest[];
  onUpdateStudent: (updates: Partial<Student>) => void;
  onAttendanceChange: (session: number, status: string) => void;
  onHomeworkChange: (session: number, completed: boolean) => void;
  onTestScoreChange: (testNumber: number, score: number | null) => void;
}

export function StudentCard({
  student,
  currentIndex,
  totalStudents,
  attendance,
  homework,
  practiceTests,
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

  // Calculate alert status
  let missedClasses = 0;
  let missedHomework = 0;

  attendance.forEach(a => {
    if (a.status === 'absent' || a.status === 'sick') {
      missedClasses++;
    }
  });

  missedHomework = homework.filter(h => !h.completed).length;
  const hasAlert = missedClasses >= 3 || missedHomework >= 3;

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

  return (
    <Card className={hasAlert ? "shadow-lg border-2 border-destructive" : "shadow-lg"}>
      <CardHeader className="border-b bg-muted/50">
        {hasAlert && (
          <div className="mb-3 p-3 bg-destructive/10 border border-destructive/30 rounded-lg">
            <p className="text-sm font-medium text-destructive">
              ⚠️ Alert: 
              {missedClasses >= 3 && ` ${missedClasses} classes missed`}
              {missedClasses >= 3 && missedHomework >= 3 && ' •'}
              {missedHomework >= 3 && ` ${missedHomework} homework incomplete`}
            </p>
          </div>
        )}
        <div className="text-center">
          <p className="text-sm font-medium text-muted-foreground">
            Student {currentIndex + 1} of {totalStudents}
          </p>
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

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label className="text-xs uppercase text-muted-foreground">First Name</Label>
              {isEditing ? (
                <Input
                  value={editForm.first_name}
                  onChange={(e) => setEditForm({ ...editForm, first_name: e.target.value })}
                  className="mt-1"
                />
              ) : (
                <p className="font-medium mt-1">{student.first_name}</p>
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
          </div>
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column: Attendance & Homework */}
          <div className="border rounded-lg p-4">
            <h3 className="text-sm font-semibold uppercase text-muted-foreground mb-4">
              Attendance & Homework
            </h3>

            <div className="space-y-3 max-h-[400px] overflow-y-auto">
              {attendance.map((session) => {
                const hw = homework.find(h => h.session_number === session.session_number);
                return (
                  <div key={session.session_number} className="pb-3 border-b last:border-0">
                    <p className="text-sm font-medium mb-2">Session {session.session_number}</p>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Select
                          value={session.status || ""}
                          onValueChange={(value) => onAttendanceChange(session.session_number, value)}
                        >
                          <SelectTrigger className="w-full h-9 text-sm pointer-events-auto">
                            <SelectValue placeholder="Class Attendance" />
                          </SelectTrigger>
                          <SelectContent className="bg-background z-50 pointer-events-auto">
                            <SelectItem value="present">✓ Present</SelectItem>
                            <SelectItem value="late">⏰ Late</SelectItem>
                            <SelectItem value="absent">✗ Absent</SelectItem>
                            <SelectItem value="sick">🤒 Sick</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id={`hw-${session.session_number}`}
                          checked={hw?.completed || false}
                          onCheckedChange={(checked) => 
                            onHomeworkChange(session.session_number, checked as boolean)
                          }
                        />
                        <Label
                          htmlFor={`hw-${session.session_number}`}
                          className="text-sm cursor-pointer"
                        >
                          Homework Done
                        </Label>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Column: Practice Tests */}
          <div className="border rounded-lg p-4">
            <h3 className="text-sm font-semibold uppercase text-muted-foreground mb-4">
              Practice Tests (Math Only)
            </h3>

            <div className="space-y-4">
              {practiceTests.map((test) => (
                <div key={test.test_number}>
                  <Label className="text-sm">Test {test.test_number}</Label>
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
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
