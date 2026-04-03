import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTeacherAuth } from "@/contexts/TeacherAuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Gamepad2, Zap, Clock, Hash } from "lucide-react";
import { LiveLobby } from "./LiveLobby";
import { LiveQuestionControl } from "./LiveQuestionControl";
import { LiveLeaderboard } from "./LiveLeaderboard";

type SessionPhase = "setup" | "lobby" | "playing" | "results";

const QUESTION_SETS = [
  { value: "68", label: "68 Problems" },
  { value: "CollegeBoard", label: "CollegeBoard" },
  { value: "SATMathTraining800", label: "150 Hard" },
  { value: "English", label: "English" },
  { value: "all", label: "All Questions" },
];

const QUESTION_COUNTS = [5, 10, 15, 20];
const TIME_OPTIONS = [15, 30, 45, 60];

function generateJoinCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export function LivePracticeContent() {
  const { teacherName } = useTeacherAuth();
  const { toast } = useToast();
  const [phase, setPhase] = useState<SessionPhase>("setup");
  const [questionSet, setQuestionSet] = useState("68");
  const [questionCount, setQuestionCount] = useState(10);
  const [timePerQuestion, setTimePerQuestion] = useState(30);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [joinCode, setJoinCode] = useState<string>("");
  const [isCreating, setIsCreating] = useState(false);

  const handleCreateSession = async () => {
    if (!teacherName) return;
    setIsCreating(true);

    try {
      // Fetch random questions from the selected set
      let query = supabase
        .from("questions")
        .select("id")
        .eq("is_active", true)
        .eq("question_type", "multiple_choice");

      if (questionSet !== "all") {
        if (questionSet === "English") {
          query = query.eq("subject", "english");
        } else {
          query = query.eq("question_set", questionSet);
        }
      }

      const { data: questions, error: qError } = await query;
      if (qError) throw qError;

      if (!questions || questions.length === 0) {
        toast({ title: "No questions found", description: "No multiple choice questions available in this set.", variant: "destructive" });
        setIsCreating(false);
        return;
      }

      // Shuffle and pick
      const shuffled = questions.sort(() => Math.random() - 0.5);
      const selected = shuffled.slice(0, Math.min(questionCount, shuffled.length));

      const code = generateJoinCode();

      const { data: session, error: sError } = await supabase
        .from("live_sessions")
        .insert({
          teacher_name: teacherName,
          join_code: code,
          question_set: questionSet,
          time_per_question: timePerQuestion,
          status: "waiting",
        })
        .select("id")
        .single();

      if (sError) throw sError;

      // Insert questions
      const questionRows = selected.map((q, i) => ({
        session_id: session.id,
        question_id: q.id,
        order_index: i,
      }));

      const { error: qiError } = await supabase
        .from("live_session_questions")
        .insert(questionRows);

      if (qiError) throw qiError;

      setSessionId(session.id);
      setJoinCode(code);
      setPhase("lobby");
    } catch (error: any) {
      console.error("Error creating session:", error);
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setIsCreating(false);
    }
  };

  const handleStartGame = async () => {
    if (!sessionId) return;
    await supabase
      .from("live_sessions")
      .update({ status: "active", current_question_index: 0 })
      .eq("id", sessionId);
    setPhase("playing");
  };

  const handleShowResults = () => {
    setPhase("results");
  };

  const handleNewSession = () => {
    setPhase("setup");
    setSessionId(null);
    setJoinCode("");
  };

  if (phase === "setup") {
    return (
      <div className="space-y-4 max-w-md mx-auto">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 mb-2">
            <Gamepad2 className="h-7 w-7 text-primary" />
          </div>
          <h2 className="text-xl font-bold">Live Practice</h2>
          <p className="text-sm text-muted-foreground">
            Create a live quiz session. Students scan the QR to join and compete!
          </p>
        </div>

        <Card>
          <CardContent className="pt-6 space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <Zap className="h-4 w-4 text-primary" />
                Question Set
              </label>
              <Select value={questionSet} onValueChange={setQuestionSet}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {QUESTION_SETS.map((qs) => (
                    <SelectItem key={qs.value} value={qs.value}>
                      {qs.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <Hash className="h-4 w-4 text-primary" />
                Number of Questions
              </label>
              <div className="grid grid-cols-4 gap-2">
                {QUESTION_COUNTS.map((c) => (
                  <Button
                    key={c}
                    variant={questionCount === c ? "default" : "outline"}
                    size="sm"
                    onClick={() => setQuestionCount(c)}
                  >
                    {c}
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <Clock className="h-4 w-4 text-primary" />
                Time per Question
              </label>
              <div className="grid grid-cols-4 gap-2">
                {TIME_OPTIONS.map((t) => (
                  <Button
                    key={t}
                    variant={timePerQuestion === t ? "default" : "outline"}
                    size="sm"
                    onClick={() => setTimePerQuestion(t)}
                  >
                    {t}s
                  </Button>
                ))}
              </div>
            </div>

            <Button
              className="w-full mt-4"
              size="lg"
              onClick={handleCreateSession}
              disabled={isCreating}
            >
              {isCreating ? "Creating..." : "Create Session"}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (phase === "lobby" && sessionId) {
    return (
      <LiveLobby
        sessionId={sessionId}
        joinCode={joinCode}
        onStart={handleStartGame}
      />
    );
  }

  if (phase === "playing" && sessionId) {
    return (
      <LiveQuestionControl
        sessionId={sessionId}
        timePerQuestion={timePerQuestion}
        onFinish={handleShowResults}
      />
    );
  }

  if (phase === "results" && sessionId) {
    return (
      <LiveLeaderboard
        sessionId={sessionId}
        onNewSession={handleNewSession}
      />
    );
  }

  return null;
}
