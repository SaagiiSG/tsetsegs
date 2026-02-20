import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Plus, Loader2, Download, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { IntensePrepAddStudentDialog } from "./IntensePrepAddStudentDialog";
import { cn } from "@/lib/utils";

interface Props {
  groupId: string;
  onBack: () => void;
}

export interface GroupMember {
  id: string;
  group_id: string;
  student_id: string | null;
  manual_name: string | null;
  manual_phone: string | null;
  created_at: string;
  student?: {
    id: string;
    name: string;
    phone: string;
  };
  tracking?: TrackingData;
  practiceData?: PracticeData;
}

export interface TrackingData {
  id: string;
  member_id: string;
  problems_68_solved: boolean[];
  problems_68_notes: boolean[];
  practice_test_scores: Record<string, number>;
  prep_session_notes: number;
  updated_at: string;
  updated_by: string | null;
}

export interface PracticeData {
  solvedProblems: string[];
  watchedVideos: string[];
  cbCategories: {
    advancedMath: { correct: number; total: number };
    algebra: { correct: number; total: number };
    problemSolving: { correct: number; total: number };
    geometry: { correct: number; total: number };
  };
  practiceTestScores: Record<number, number>;
}

interface GroupDetails {
  id: string;
  name: string;
  created_at: string;
}

// Practice test numbers
const TEST_NUMBERS = [4, 5, 6, 7, 8, 9, 10, 11];

export function IntensePrepGroupDetail({ groupId, onBack }: Props) {
  const [group, setGroup] = useState<GroupDetails | null>(null);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editingCell, setEditingCell] = useState<{ memberId: string; field: string } | null>(null);
  const [localScores, setLocalScores] = useState<Record<string, Record<string, string>>>({});
  const { toast } = useToast();

  const fetchGroupDetails = useCallback(async () => {
    try {
      setIsLoading(true);

      // Fetch group info
      const { data: groupData, error: groupError } = await supabase
        .from("intense_prep_groups")
        .select("id, name, created_at")
        .eq("id", groupId)
        .single();

      if (groupError) throw groupError;
      setGroup(groupData);

      // Fetch members with their linked students
      const { data: membersData, error: membersError } = await supabase
        .from("intense_prep_members")
        .select(`
          id,
          group_id,
          student_id,
          manual_name,
          manual_phone,
          created_at
        `)
        .eq("group_id", groupId)
        .order("created_at", { ascending: true });

      if (membersError) throw membersError;

      if (!membersData || membersData.length === 0) {
        setMembers([]);
        return;
      }

      // Fetch linked students
      const studentIds = membersData.filter(m => m.student_id).map(m => m.student_id);
      let studentsMap: Record<string, { id: string; name: string; phone: string }> = {};
      
      if (studentIds.length > 0) {
        const { data: students } = await supabase
          .from("students")
          .select("id, name, phone")
          .in("id", studentIds);

        if (students) {
          students.forEach(s => {
            studentsMap[s.id] = s;
          });
        }
      }

      // Fetch tracking data
      const memberIds = membersData.map(m => m.id);
      const { data: trackingData } = await supabase
        .from("intense_prep_tracking")
        .select("*")
        .in("member_id", memberIds);

      const trackingMap: Record<string, TrackingData> = {};
      trackingData?.forEach(t => {
        trackingMap[t.member_id] = t as TrackingData;
      });

      // Fetch practice data for linked students
      const practiceDataMap = await fetchPracticeData(studentIds.filter(Boolean) as string[]);

      // Combine all data
      const enrichedMembers: GroupMember[] = membersData.map(m => ({
        ...m,
        student: m.student_id ? studentsMap[m.student_id] : undefined,
        tracking: trackingMap[m.id],
        practiceData: m.student_id ? practiceDataMap[m.student_id] : undefined,
      }));

      setMembers(enrichedMembers);
      
      // Initialize local scores from tracking data
      const scores: Record<string, Record<string, string>> = {};
      enrichedMembers.forEach(m => {
        scores[m.id] = {};
        TEST_NUMBERS.forEach(t => {
          const score = m.tracking?.practice_test_scores?.[t] || m.practiceData?.practiceTestScores?.[t];
          if (score) scores[m.id][t] = String(score);
        });
        scores[m.id]['prep'] = String(m.tracking?.prep_session_notes || 0);
      });
      setLocalScores(scores);
    } catch (error: any) {
      console.error("Error fetching group details:", error);
      toast({
        title: "Error loading group",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [groupId, toast]);

  useEffect(() => {
    fetchGroupDetails();
  }, [fetchGroupDetails]);

  const fetchPracticeData = async (studentIds: string[]): Promise<Record<string, PracticeData>> => {
    if (studentIds.length === 0) return {};

    const practiceDataMap: Record<string, PracticeData> = {};

    // Get student accounts by phone
    const { data: students } = await supabase
      .from("students")
      .select("id, phone")
      .in("id", studentIds);

    if (!students) return {};

    const phones = students.map(s => s.phone);
    const { data: accounts } = await supabase
      .from("student_accounts")
      .select("id, phone_number, linked_student_id")
      .in("phone_number", phones);

    if (!accounts || accounts.length === 0) return {};

    const accountIds = accounts.map(a => a.id);
    const studentToAccountMap: Record<string, string> = {};
    accounts.forEach(a => {
      const student = students.find(s => s.phone === a.phone_number);
      if (student) {
        studentToAccountMap[student.id] = a.id;
      }
    });

    // Fetch attempts
    const { data: attempts68 } = await supabase
      .from("student_attempts")
      .select("student_account_id, question_id, is_correct")
      .in("student_account_id", accountIds);

    // Fetch progress for video watched
    const { data: progressData } = await supabase
      .from("student_progress")
      .select("student_account_id, question_id, video_watched")
      .in("student_account_id", accountIds)
      .eq("video_watched", true);

    // Fetch CB questions categories
    const { data: questions } = await supabase
      .from("questions")
      .select("id, question_set, subtopic")
      .or("question_set.eq.68,question_set.eq.CollegeBoard");

    // Fetch practice tests
    const { data: practiceTests } = await supabase
      .from("practice_tests")
      .select("student_id, test_number, score")
      .in("student_id", studentIds);

    // Build practice data for each student
    studentIds.forEach(studentId => {
      const accountId = studentToAccountMap[studentId];
      
      const studentAttempts = attempts68?.filter(a => a.student_account_id === accountId) || [];
      const studentProgress = progressData?.filter(p => p.student_account_id === accountId) || [];
      const studentTests = practiceTests?.filter(t => t.student_id === studentId) || [];

      const cbQuestionIds = questions?.filter(q => q.question_set === 'CollegeBoard').map(q => q.id) || [];
      const cbAttempts = studentAttempts.filter(a => cbQuestionIds.includes(a.question_id));

      const categoryMap = {
        advancedMath: { correct: 0, total: 0 },
        algebra: { correct: 0, total: 0 },
        problemSolving: { correct: 0, total: 0 },
        geometry: { correct: 0, total: 0 },
      };

      cbAttempts.forEach(attempt => {
        const question = questions?.find(q => q.id === attempt.question_id);
        if (question?.subtopic) {
          const subtopic = question.subtopic.toLowerCase();
          let category = 'problemSolving';
          if (subtopic.includes('advanced') || subtopic.includes('quadratic') || subtopic.includes('polynomial')) {
            category = 'advancedMath';
          } else if (subtopic.includes('algebra') || subtopic.includes('linear') || subtopic.includes('equation')) {
            category = 'algebra';
          } else if (subtopic.includes('geometry') || subtopic.includes('trig') || subtopic.includes('circle') || subtopic.includes('angle')) {
            category = 'geometry';
          }
          categoryMap[category].total++;
          if (attempt.is_correct) {
            categoryMap[category].correct++;
          }
        }
      });

      const testScoresMap: Record<number, number> = {};
      studentTests.forEach(t => {
        if (t.score !== null) {
          testScoresMap[t.test_number] = t.score;
        }
      });

      practiceDataMap[studentId] = {
        solvedProblems: [...new Set(studentAttempts.map(a => a.question_id))],
        watchedVideos: studentProgress.map(p => p.question_id),
        cbCategories: categoryMap,
        practiceTestScores: testScoresMap,
      };
    });

    return practiceDataMap;
  };

  const handleAddMember = async (studentId: string | null, manualName?: string, manualPhone?: string) => {
    try {
      const { error } = await supabase
        .from("intense_prep_members")
        .insert({
          group_id: groupId,
          student_id: studentId,
          manual_name: manualName || null,
          manual_phone: manualPhone || null,
        });

      if (error) throw error;

      await fetchGroupDetails();
      setAddDialogOpen(false);

      toast({
        title: "Student added",
        description: "Student has been added to the group.",
      });
    } catch (error: any) {
      console.error("Error adding member:", error);
      toast({
        title: "Error adding student",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    try {
      const { error } = await supabase
        .from("intense_prep_members")
        .delete()
        .eq("id", memberId);

      if (error) throw error;

      setMembers(prev => prev.filter(m => m.id !== memberId));

      toast({
        title: "Student removed",
        description: "Student has been removed from the group.",
      });
    } catch (error: any) {
      console.error("Error removing member:", error);
      toast({
        title: "Error removing student",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleCellChange = (memberId: string, field: string, value: string) => {
    setLocalScores(prev => ({
      ...prev,
      [memberId]: {
        ...prev[memberId],
        [field]: value,
      },
    }));
  };

  const handleCellBlur = async (memberId: string, field: string) => {
    setEditingCell(null);
    
    const value = localScores[memberId]?.[field] || '';
    const existingTracking = members.find(m => m.id === memberId)?.tracking;
    
    try {
      if (field === 'prep') {
        const prepNotes = Math.min(5, Math.max(0, parseInt(value) || 0));
        
        if (existingTracking) {
          await supabase
            .from("intense_prep_tracking")
            .update({ prep_session_notes: prepNotes, updated_at: new Date().toISOString() })
            .eq("member_id", memberId);
        } else {
          await supabase
            .from("intense_prep_tracking")
            .insert({ member_id: memberId, prep_session_notes: prepNotes });
        }
        
        setMembers(prev => prev.map(m => {
          if (m.id === memberId) {
            return {
              ...m,
              tracking: { ...m.tracking, prep_session_notes: prepNotes, member_id: memberId, updated_at: new Date().toISOString() } as TrackingData,
            };
          }
          return m;
        }));
      } else {
        // Practice test score
        const testNum = field;
        const score = parseInt(value);
        
        if (!isNaN(score) && score >= 400 && score <= 1600) {
          const newScores = { ...existingTracking?.practice_test_scores, [testNum]: score };
          
          if (existingTracking) {
            await supabase
              .from("intense_prep_tracking")
              .update({ practice_test_scores: newScores, updated_at: new Date().toISOString() })
              .eq("member_id", memberId);
          } else {
            await supabase
              .from("intense_prep_tracking")
              .insert({ member_id: memberId, practice_test_scores: newScores });
          }
          
          setMembers(prev => prev.map(m => {
            if (m.id === memberId) {
              return {
                ...m,
                tracking: { ...m.tracking, practice_test_scores: newScores, member_id: memberId, updated_at: new Date().toISOString() } as TrackingData,
              };
            }
            return m;
          }));
        }
      }
    } catch (error: any) {
      console.error("Error saving:", error);
      toast({
        title: "Error saving",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const getStudentName = (member: GroupMember) => {
    return member.student?.name || member.manual_name || "Unknown";
  };

  const get68Progress = (member: GroupMember) => {
    const solved = Math.max(
      member.tracking?.problems_68_solved?.filter(Boolean).length || 0,
      member.practiceData?.solvedProblems.length || 0
    );
    const videos = Math.max(
      member.tracking?.problems_68_notes?.filter(Boolean).length || 0,
      member.practiceData?.watchedVideos.length || 0
    );
    return { solved, videos };
  };

  const getCBProgress = (member: GroupMember) => {
    const cbData = member.practiceData?.cbCategories;
    if (!cbData) return { percentage: 0, correct: 0, total: 0 };
    
    const correct = Object.values(cbData).reduce((sum, cat) => sum + cat.correct, 0);
    const total = Object.values(cbData).reduce((sum, cat) => sum + cat.total, 0);
    const percentage = total > 0 ? Math.round((correct / total) * 100) : 0;
    
    return { percentage, correct, total };
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={onBack} className="h-8 w-8">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h2 className="text-lg font-bold">{group?.name}</h2>
            <p className="text-xs text-muted-foreground">{members.length} students</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="h-8">
            <Download className="h-3.5 w-3.5 mr-1.5" />
            Export
          </Button>
          <Button size="sm" className="h-8" onClick={() => setAddDialogOpen(true)}>
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            Add
          </Button>
        </div>
      </div>

      {/* Spreadsheet Table */}
      {members.length === 0 ? (
        <div className="border rounded-lg p-8 text-center bg-muted/20">
          <p className="text-muted-foreground mb-4">No students yet. Add your first student to get started.</p>
          <Button onClick={() => setAddDialogOpen(true)} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Add Student
          </Button>
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <ScrollArea className="w-full">
            <Table className="min-w-[1000px]">
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50">
                  <TableHead className="w-[40px] text-center font-bold">#</TableHead>
                  <TableHead className="w-[180px] font-bold">Name</TableHead>
                  <TableHead className="w-[80px] text-center font-bold">68✓</TableHead>
                  <TableHead className="w-[80px] text-center font-bold">68📹</TableHead>
                  {TEST_NUMBERS.map(num => (
                    <TableHead key={num} className="w-[70px] text-center font-bold">PT{num}</TableHead>
                  ))}
                  <TableHead className="w-[80px] text-center font-bold">CB%</TableHead>
                  <TableHead className="w-[60px] text-center font-bold">Notes</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.map((member, index) => {
                  const { solved, videos } = get68Progress(member);
                  const cb = getCBProgress(member);
                  
                  return (
                    <TableRow key={member.id} className="hover:bg-muted/30">
                      <TableCell className="text-center text-muted-foreground font-mono text-xs">
                        {index + 1}
                      </TableCell>
                      <TableCell className="font-medium">
                        <div className="truncate">{getStudentName(member)}</div>
                        {!member.student_id && (
                          <span className="text-[10px] text-destructive">manual</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <span className={cn(
                          "font-mono text-sm",
                          solved >= 68 ? "text-primary font-bold" : solved > 0 ? "text-foreground" : "text-muted-foreground"
                        )}>
                          {solved}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className={cn(
                          "font-mono text-sm",
                          videos >= 68 ? "text-primary font-bold" : videos > 0 ? "text-foreground" : "text-muted-foreground"
                        )}>
                          {videos}
                        </span>
                      </TableCell>
                      {TEST_NUMBERS.map(num => {
                        const isEditing = editingCell?.memberId === member.id && editingCell?.field === String(num);
                        const value = localScores[member.id]?.[num] || '';
                        const hasScore = !!value;
                        
                        return (
                          <TableCell key={num} className="p-1">
                            {isEditing ? (
                              <Input
                                type="number"
                                className="h-7 w-full text-center text-xs"
                                value={value}
                                onChange={(e) => handleCellChange(member.id, String(num), e.target.value)}
                                onBlur={() => handleCellBlur(member.id, String(num))}
                                onKeyDown={(e) => e.key === 'Enter' && handleCellBlur(member.id, String(num))}
                                autoFocus
                                min={400}
                                max={1600}
                              />
                            ) : (
                              <div
                                className={cn(
                                  "h-7 flex items-center justify-center cursor-pointer rounded border border-transparent hover:border-border hover:bg-muted/50 text-xs font-mono",
                                  hasScore ? "text-foreground" : "text-muted-foreground/50"
                                )}
                                onClick={() => setEditingCell({ memberId: member.id, field: String(num) })}
                              >
                                {hasScore ? value : "—"}
                              </div>
                            )}
                          </TableCell>
                        );
                      })}
                      <TableCell className="text-center">
                        <span className={cn(
                          "font-mono text-sm",
                          cb.percentage >= 80 ? "text-primary font-bold" : cb.percentage > 0 ? "text-foreground" : "text-muted-foreground"
                        )}>
                          {cb.percentage}%
                        </span>
                      </TableCell>
                      <TableCell className="p-1">
                        {editingCell?.memberId === member.id && editingCell?.field === 'prep' ? (
                          <Input
                            type="number"
                            className="h-7 w-full text-center text-xs"
                            value={localScores[member.id]?.['prep'] || '0'}
                            onChange={(e) => handleCellChange(member.id, 'prep', e.target.value)}
                            onBlur={() => handleCellBlur(member.id, 'prep')}
                            onKeyDown={(e) => e.key === 'Enter' && handleCellBlur(member.id, 'prep')}
                            autoFocus
                            min={0}
                            max={5}
                          />
                        ) : (
                          <div
                            className="h-7 flex items-center justify-center cursor-pointer rounded border border-transparent hover:border-border hover:bg-muted/50 text-xs font-mono"
                            onClick={() => setEditingCell({ memberId: member.id, field: 'prep' })}
                          >
                            {localScores[member.id]?.['prep'] || '0'}/5
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="p-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          onClick={() => handleRemoveMember(member.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </div>
      )}

      <IntensePrepAddStudentDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        onAdd={handleAddMember}
        existingMemberStudentIds={members.map(m => m.student_id).filter(Boolean) as string[]}
      />
    </div>
  );
}