import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { ArrowLeft, Plus, Loader2, Download, Users, BookOpen, Calculator, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { IntensePrepStudentRow } from "./IntensePrepStudentRow";
import { IntensePrepAddStudentDialog } from "./IntensePrepAddStudentDialog";

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

export function IntensePrepGroupDetail({ groupId, onBack }: Props) {
  const [group, setGroup] = useState<GroupDetails | null>(null);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
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

    // Fetch attempts for 68 questions (question_set = '68')
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

      // Get CB question attempts
      const cbQuestionIds = questions?.filter(q => q.question_set === 'CollegeBoard').map(q => q.id) || [];
      const cbAttempts = studentAttempts.filter(a => cbQuestionIds.includes(a.question_id));

      // Calculate CB categories
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

      // Build test scores map (tests 4-10)
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
      const { data, error } = await supabase
        .from("intense_prep_members")
        .insert({
          group_id: groupId,
          student_id: studentId,
          manual_name: manualName || null,
          manual_phone: manualPhone || null,
        })
        .select()
        .single();

      if (error) throw error;

      // Refresh the list
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

  const handleUpdateTracking = async (memberId: string, updates: Partial<TrackingData>) => {
    try {
      const existingTracking = members.find(m => m.id === memberId)?.tracking;

      if (existingTracking) {
        const { error } = await supabase
          .from("intense_prep_tracking")
          .update({
            ...updates,
            updated_at: new Date().toISOString(),
          })
          .eq("member_id", memberId);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("intense_prep_tracking")
          .insert({
            member_id: memberId,
            ...updates,
          });

        if (error) throw error;
      }

      // Update local state
      setMembers(prev => prev.map(m => {
        if (m.id === memberId) {
          return {
            ...m,
            tracking: {
              ...m.tracking,
              ...updates,
              member_id: memberId,
              updated_at: new Date().toISOString(),
            } as TrackingData,
          };
        }
        return m;
      }));
    } catch (error: any) {
      console.error("Error updating tracking:", error);
      toast({
        title: "Error saving",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  // Calculate quick stats
  const stats = {
    total: members.length,
    completed68: members.filter(m => {
      const solved = m.tracking?.problems_68_solved?.filter(Boolean).length || 0;
      return solved >= 68;
    }).length,
    hasAllTests: members.filter(m => {
      const scores = m.tracking?.practice_test_scores || m.practiceData?.practiceTestScores || {};
      return Object.keys(scores).length >= 7;
    }).length,
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={onBack} className="h-8 px-2">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h2 className="text-lg md:text-xl font-bold">{group?.name}</h2>
            <p className="text-xs text-muted-foreground">{members.length} students</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="h-8 gap-2">
            <Download className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Export</span>
          </Button>
          <Button size="sm" className="h-8 gap-2" onClick={() => setAddDialogOpen(true)}>
            <Plus className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Add Student</span>
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-4 gap-2 md:gap-4">
        <Card className="p-2 md:p-3 text-center">
          <Users className="h-4 w-4 mx-auto text-muted-foreground mb-1" />
          <div className="text-lg md:text-2xl font-bold">{stats.total}</div>
          <div className="text-[10px] md:text-xs text-muted-foreground">Total</div>
        </Card>
        <Card className="p-2 md:p-3 text-center">
          <BookOpen className="h-4 w-4 mx-auto text-blue-500 mb-1" />
          <div className="text-lg md:text-2xl font-bold">{stats.completed68}</div>
          <div className="text-[10px] md:text-xs text-muted-foreground">68 Done</div>
        </Card>
        <Card className="p-2 md:p-3 text-center">
          <Calculator className="h-4 w-4 mx-auto text-green-500 mb-1" />
          <div className="text-lg md:text-2xl font-bold">{stats.hasAllTests}</div>
          <div className="text-[10px] md:text-xs text-muted-foreground">All Tests</div>
        </Card>
        <Card className="p-2 md:p-3 text-center">
          <FileText className="h-4 w-4 mx-auto text-purple-500 mb-1" />
          <div className="text-lg md:text-2xl font-bold">
            {Math.round((stats.completed68 / Math.max(stats.total, 1)) * 100)}%
          </div>
          <div className="text-[10px] md:text-xs text-muted-foreground">Progress</div>
        </Card>
      </div>

      {/* Student Table */}
      {members.length === 0 ? (
        <Card className="p-8 text-center">
          <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="font-semibold mb-2">No students yet</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Add students from the database or manually enter their info
          </p>
          <Button onClick={() => setAddDialogOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Add First Student
          </Button>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <ScrollArea className="w-full">
            <div className="min-w-[900px]">
              {/* Table Header */}
              <div className="grid grid-cols-[200px_120px_140px_180px_100px_60px] gap-2 p-3 bg-muted/50 border-b text-xs font-medium text-muted-foreground">
                <div>Student</div>
                <div className="text-center">68 Problems</div>
                <div className="text-center">Practice Tests</div>
                <div className="text-center">CB 1074</div>
                <div className="text-center">Prep Notes</div>
                <div></div>
              </div>
              
              {/* Table Rows */}
              <div className="divide-y">
                {members.map((member) => (
                  <IntensePrepStudentRow
                    key={member.id}
                    member={member}
                    onRemove={() => handleRemoveMember(member.id)}
                    onUpdateTracking={(updates) => handleUpdateTracking(member.id, updates)}
                  />
                ))}
              </div>
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </Card>
      )}

      <IntensePrepAddStudentDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        onAdd={handleAddMember}
        existingMemberStudentIds={members.filter(m => m.student_id).map(m => m.student_id!)}
      />
    </div>
  );
}
