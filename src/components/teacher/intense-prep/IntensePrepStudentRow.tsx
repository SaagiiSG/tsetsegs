import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { MoreHorizontal, Trash2, Check, Video, BookOpen } from "lucide-react";
import type { GroupMember, TrackingData } from "./IntensePrepGroupDetail";

interface Props {
  member: GroupMember;
  onRemove: () => void;
  onUpdateTracking: (updates: Partial<TrackingData>) => void;
}

export function IntensePrepStudentRow({ member, onRemove, onUpdateTracking }: Props) {
  const [practiceScores, setPracticeScores] = useState<Record<string, string>>(
    member.tracking?.practice_test_scores 
      ? Object.fromEntries(Object.entries(member.tracking.practice_test_scores).map(([k, v]) => [k, String(v)]))
      : {}
  );

  const studentName = member.student?.name || member.manual_name || "Unknown";
  const studentPhone = member.student?.phone || member.manual_phone || "";

  // Calculate 68 problems progress
  const problems68Solved = member.tracking?.problems_68_solved || [];
  const problems68Notes = member.tracking?.problems_68_notes || [];
  
  // Use practice data as fallback for solved count
  const solvedCount = Math.max(
    problems68Solved.filter(Boolean).length,
    member.practiceData?.solvedProblems.length || 0
  );
  const notesCount = Math.max(
    problems68Notes.filter(Boolean).length,
    member.practiceData?.watchedVideos.length || 0
  );

  // Calculate CB progress
  const cbData = member.practiceData?.cbCategories || {
    advancedMath: { correct: 0, total: 0 },
    algebra: { correct: 0, total: 0 },
    problemSolving: { correct: 0, total: 0 },
    geometry: { correct: 0, total: 0 },
  };

  const totalCBCorrect = Object.values(cbData).reduce((sum, cat) => sum + cat.correct, 0);
  const totalCBTotal = Object.values(cbData).reduce((sum, cat) => sum + cat.total, 0);
  const cbPercentage = totalCBTotal > 0 ? Math.round((totalCBCorrect / totalCBTotal) * 100) : 0;

  // Practice test scores (merge practice data with manual tracking)
  const testScores = {
    ...member.practiceData?.practiceTestScores,
    ...member.tracking?.practice_test_scores,
  };

  // Prep session notes
  const prepNotes = member.tracking?.prep_session_notes || 0;

  const handlePracticeScoreChange = (testNum: string, value: string) => {
    const newScores = { ...practiceScores, [testNum]: value };
    setPracticeScores(newScores);
    
    // Debounce save
    const numericScores: Record<string, number> = {};
    Object.entries(newScores).forEach(([k, v]) => {
      const num = parseInt(v);
      if (!isNaN(num) && num >= 400 && num <= 1600) {
        numericScores[k] = num;
      }
    });
    onUpdateTracking({ practice_test_scores: numericScores });
  };

  const handlePrepNotesChange = (value: number[]) => {
    onUpdateTracking({ prep_session_notes: value[0] });
  };

  // Helper to render mini progress squares
  const renderProgressSquares = (count: number, total: number, color: string) => {
    const filled = Math.min(count, total);
    const segments = 10; // Show 10 segments for visual
    const filledSegments = Math.floor((filled / total) * segments);
    
    return (
      <div className="flex gap-0.5">
        {Array.from({ length: segments }).map((_, i) => (
          <div
            key={i}
            className={`w-1.5 h-3 rounded-sm ${i < filledSegments ? color : 'bg-muted'}`}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="grid grid-cols-[200px_120px_140px_180px_100px_60px] gap-2 p-3 items-center hover:bg-muted/30 transition-colors text-sm">
      {/* Student Name */}
      <div className="min-w-0">
        <div className="font-medium truncate">{studentName}</div>
        <div className="text-xs text-muted-foreground truncate">{studentPhone}</div>
        {!member.student_id && (
          <span className="text-[10px] text-orange-500">Manual entry</span>
        )}
      </div>

      {/* 68 Problems */}
      <Popover>
        <PopoverTrigger asChild>
          <button className="flex flex-col items-center gap-1 cursor-pointer hover:bg-muted/50 rounded p-1 transition-colors w-full">
            <div className="flex items-center gap-2 text-xs">
              <div className="flex items-center gap-1">
                <Check className="h-3 w-3 text-green-500" />
                <span>{solvedCount}/68</span>
              </div>
              <div className="flex items-center gap-1">
                <Video className="h-3 w-3 text-blue-500" />
                <span>{notesCount}/68</span>
              </div>
            </div>
            {renderProgressSquares(solvedCount, 68, 'bg-green-500')}
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-80">
          <div className="space-y-3">
            <h4 className="font-semibold text-sm">68 Problems Progress</h4>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-500" /> Problems Solved
                </span>
                <span className="font-medium">{solvedCount}/68</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Video className="h-4 w-4 text-blue-500" /> Videos Watched
                </span>
                <span className="font-medium">{notesCount}/68</span>
              </div>
            </div>
            {member.practiceData && (
              <p className="text-xs text-muted-foreground">
                Data pulled from student's practice history
              </p>
            )}
          </div>
        </PopoverContent>
      </Popover>

      {/* Practice Tests (4-10) */}
      <Popover>
        <PopoverTrigger asChild>
          <button className="flex flex-col items-center gap-1 cursor-pointer hover:bg-muted/50 rounded p-1 transition-colors w-full">
            <div className="text-xs">
              {Object.keys(testScores).length}/8 tests
            </div>
            <div className="flex gap-1">
              {[4, 5, 6, 7, 8, 9, 10, 11].map(num => (
                <div
                  key={num}
                  className={`w-3 h-3 rounded-sm text-[8px] flex items-center justify-center ${
                    testScores[num] ? 'bg-green-500 text-white' : 'bg-muted'
                  }`}
                >
                  {num}
                </div>
              ))}
            </div>
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-64">
          <div className="space-y-3">
            <h4 className="font-semibold text-sm">Practice Test Scores</h4>
            <div className="grid grid-cols-2 gap-2">
              {[4, 5, 6, 7, 8, 9, 10, 11].map(num => (
                <div key={num} className="flex items-center gap-2">
                  <span className="text-xs w-6">PT{num}</span>
                  <Input
                    type="number"
                    placeholder="Score"
                    className="h-7 text-xs"
                    min={400}
                    max={1600}
                    value={practiceScores[num] || testScores[num] || ''}
                    onChange={(e) => handlePracticeScoreChange(String(num), e.target.value)}
                  />
                </div>
              ))}
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {/* CB 1074 Categories */}
      <Popover>
        <PopoverTrigger asChild>
          <button className="flex flex-col items-center gap-1 cursor-pointer hover:bg-muted/50 rounded p-1 transition-colors w-full">
            <div className="text-xs font-medium">{cbPercentage}%</div>
            <div className="w-full space-y-1">
              {Object.entries(cbData).map(([cat, data]) => {
                const pct = data.total > 0 ? (data.correct / data.total) * 100 : 0;
                const colors: Record<string, string> = {
                  advancedMath: 'bg-purple-500',
                  algebra: 'bg-blue-500',
                  problemSolving: 'bg-green-500',
                  geometry: 'bg-orange-500',
                };
                return (
                  <div key={cat} className="h-1 bg-muted rounded-full overflow-hidden">
                    <div 
                      className={`h-full ${colors[cat]} transition-all`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                );
              })}
            </div>
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-72">
          <div className="space-y-3">
            <h4 className="font-semibold text-sm">CollegeBoard 1074 Progress</h4>
            <div className="space-y-2">
              {[
                { key: 'advancedMath', label: 'Advanced Math', color: 'bg-purple-500' },
                { key: 'algebra', label: 'Algebra', color: 'bg-blue-500' },
                { key: 'problemSolving', label: 'Problem Solving', color: 'bg-green-500' },
                { key: 'geometry', label: 'Geometry & Trig', color: 'bg-orange-500' },
              ].map(({ key, label, color }) => {
                const data = cbData[key as keyof typeof cbData];
                const pct = data.total > 0 ? Math.round((data.correct / data.total) * 100) : 0;
                return (
                  <div key={key} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span>{label}</span>
                      <span className="text-muted-foreground">{data.correct}/{data.total} ({pct}%)</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div 
                        className={`h-full ${color} transition-all`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {/* Prep Session Notes (0-5) */}
      <div className="px-2">
        <div className="flex gap-0.5 justify-center mb-1">
          {[1, 2, 3, 4, 5].map(n => (
            <Tooltip key={n}>
              <TooltipTrigger asChild>
                <div
                  className={`w-4 h-4 rounded-sm cursor-pointer transition-colors ${
                    n <= prepNotes ? 'bg-primary' : 'bg-muted hover:bg-muted-foreground/20'
                  }`}
                  onClick={() => onUpdateTracking({ prep_session_notes: n === prepNotes ? n - 1 : n })}
                />
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs">
                Session {n}
              </TooltipContent>
            </Tooltip>
          ))}
        </div>
        <div className="text-[10px] text-center text-muted-foreground">{prepNotes}/5 notes</div>
      </div>

      {/* Actions */}
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-36 p-1">
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={onRemove}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Remove
          </Button>
        </PopoverContent>
      </Popover>
    </div>
  );
}
