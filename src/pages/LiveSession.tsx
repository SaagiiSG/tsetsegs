import { useEffect, useState, useRef, useCallback } from "react";
import { useParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { MathText } from "@/components/MathText";
import { Gamepad2, Clock, CheckCircle, XCircle, Trophy, Loader2 } from "lucide-react";

type Phase = "join" | "waiting" | "question" | "feedback" | "finished";

interface SessionData {
  id: string;
  status: string;
  current_question_index: number;
  time_per_question: number;
  teacher_name: string;
}

interface QuestionData {
  id: string;
  question_text: string;
  multiple_choice_options: Record<string, string>;
  answer: string;
  order_index: number;
}

interface StoredSession {
  participantId: string;
  playerName: string;
  phoneNumber: string;
}

const storageKey = (joinCode: string) => `live-session:${joinCode.toUpperCase()}`;

const loadStored = (joinCode: string): StoredSession | null => {
  try {
    const raw = localStorage.getItem(storageKey(joinCode));
    return raw ? (JSON.parse(raw) as StoredSession) : null;
  } catch {
    return null;
  }
};

const saveStored = (joinCode: string, data: StoredSession) => {
  try {
    localStorage.setItem(storageKey(joinCode), JSON.stringify(data));
  } catch {
    // ignore quota errors
  }
};

const clearStored = (joinCode: string) => {
  try {
    localStorage.removeItem(storageKey(joinCode));
  } catch {
    // ignore
  }
};

export default function LiveSession() {
  const { joinCode } = useParams<{ joinCode: string }>();
  const [phase, setPhase] = useState<Phase>("join");
  const [playerName, setPlayerName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [session, setSession] = useState<SessionData | null>(null);
  const [participantId, setParticipantId] = useState<string | null>(null);
  const [questions, setQuestions] = useState<QuestionData[]>([]);
  const [answeredQuestionIds, setAnsweredQuestionIds] = useState<Set<string>>(new Set());
  const [currentIndex, setCurrentIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [pointsEarned, setPointsEarned] = useState(0);
  const [totalPoints, setTotalPoints] = useState(0);
  const [isJoining, setIsJoining] = useState(false);
  const [isRestoring, setIsRestoring] = useState(() => {
    // Synchronously check localStorage so we never flash the join form on refresh
    try {
      const code = window.location.pathname.split("/").pop();
      if (!code) return false;
      return !!localStorage.getItem(`live-session:${code.toUpperCase()}`);
    } catch {
      return false;
    }
  });
  const [error, setError] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval>>();
  const questionStartRef = useRef<number>(0);
  const hasAnsweredRef = useRef(false);

  // Use refs to avoid stale closures in realtime subscription
  const phaseRef = useRef<Phase>(phase);
  const currentIndexRef = useRef(currentIndex);
  const sessionRef = useRef<SessionData | null>(session);
  const participantIdRef = useRef<string | null>(participantId);
  const questionsRef = useRef<QuestionData[]>(questions);
  const totalPointsRef = useRef(0);
  const answeredRef = useRef<Set<string>>(new Set());

  useEffect(() => { phaseRef.current = phase; }, [phase]);
  useEffect(() => { currentIndexRef.current = currentIndex; }, [currentIndex]);
  useEffect(() => { sessionRef.current = session; }, [session]);
  useEffect(() => { participantIdRef.current = participantId; }, [participantId]);
  useEffect(() => { questionsRef.current = questions; }, [questions]);
  useEffect(() => { totalPointsRef.current = totalPoints; }, [totalPoints]);
  useEffect(() => { answeredRef.current = answeredQuestionIds; }, [answeredQuestionIds]);

  // Look up session on mount + restore from localStorage if the user refreshed
  useEffect(() => {
    if (!joinCode) return;
    const fetchSession = async () => {
      try {
        const { data, error } = await supabase
          .from("live_sessions")
          .select("*")
          .eq("join_code", joinCode.toUpperCase())
          .single();

        if (error || !data) {
          setError("Session not found. Check your code and try again.");
          return;
        }
        if (data.status === "finished") {
          // Still try to show the user's final score from a previous join
          const stored = loadStored(joinCode);
          if (stored) {
            const { data: p } = await supabase
              .from("live_session_participants")
              .select("total_points, player_name")
              .eq("id", stored.participantId)
              .maybeSingle();
            if (p) {
              setParticipantId(stored.participantId);
              setPlayerName(p.player_name || stored.playerName);
              setTotalPoints(p.total_points || 0);
              setSession(data as SessionData);
              setPhase("finished");
              return;
            }
          }
          setError("This session has already ended.");
          return;
        }
        setSession(data as SessionData);

        // Load questions
        const { data: qData } = await supabase
          .from("live_session_questions")
          .select("order_index, question_id, questions(id, question_text, multiple_choice_options, answer)")
          .eq("session_id", data.id)
          .order("order_index", { ascending: true });

        if (qData) {
          setQuestions(
            qData.map((d: any) => ({ ...d.questions, order_index: d.order_index }))
          );
        }

        // Restore prior participant if this device already joined this session
        const stored = loadStored(joinCode);
        if (stored) {
          setIsRestoring(true);
          let participant: any = null;

          // 1) Try the stored participant id
          const { data: byId } = await supabase
            .from("live_session_participants")
            .select("id, player_name, phone_number, total_points")
            .eq("id", stored.participantId)
            .maybeSingle();
          participant = byId;

          // 2) Fallback: look up by session + phone (handles cleared/stale id)
          if (!participant && stored.phoneNumber) {
            const { data: byPhone } = await supabase
              .from("live_session_participants")
              .select("id, player_name, phone_number, total_points")
              .eq("session_id", data.id)
              .eq("phone_number", stored.phoneNumber)
              .maybeSingle();
            participant = byPhone;
          }

          if (participant && participant.id) {
            setParticipantId(participant.id);
            setPlayerName(participant.player_name);
            setPhoneNumber(participant.phone_number);
            setTotalPoints(participant.total_points || 0);
            // Re-save in case the id changed (phone fallback path)
            saveStored(joinCode, {
              participantId: participant.id,
              playerName: participant.player_name,
              phoneNumber: participant.phone_number,
            });

            const { data: answers } = await supabase
              .from("live_session_answers")
              .select("question_id")
              .eq("participant_id", participant.id);
            if (answers) {
              setAnsweredQuestionIds(new Set(answers.map((a: any) => a.question_id)));
            }

            if (data.status === "active") {
              startQuestion(data.current_question_index);
            } else {
              setPhase("waiting");
            }
          } else {
            // No participant row at all — keep the entered name/phone but drop stale id
            clearStored(joinCode);
            setPlayerName(stored.playerName);
            setPhoneNumber(stored.phoneNumber);
          }
          setIsRestoring(false);
        }
      } catch (err) {
        console.error("Error fetching session:", err);
        setError("Failed to load session. Please refresh and try again.");
        setIsRestoring(false);
      }
    };
    fetchSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [joinCode]);

  const startQuestion = useCallback((index: number) => {
    const sess = sessionRef.current;
    const q = questionsRef.current[index];
    setCurrentIndex(index);
    setSelectedAnswer(null);
    setIsCorrect(null);
    setPointsEarned(0);

    // If this device already answered this question (refreshed mid-game), don't let them re-answer
    const alreadyAnswered = q ? answeredRef.current.has(q.id) : false;
    hasAnsweredRef.current = alreadyAnswered;

    questionStartRef.current = Date.now();
    const timePerQ = sess?.time_per_question || 30;
    setTimeLeft(timePerQ);

    if (alreadyAnswered) {
      // Show neutral "waiting for next question" state instead of letting them score twice
      setPhase("feedback");
      setIsCorrect(null);
      setPointsEarned(0);
      clearInterval(timerRef.current);
      return;
    }

    setPhase("question");
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          if (!hasAnsweredRef.current) {
            // Auto-submit inline to avoid stale closure
            hasAnsweredRef.current = true;
            setPhase("feedback");
            setIsCorrect(false);
            setPointsEarned(0);
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  // Subscribe to session changes — use refs to avoid stale closures
  useEffect(() => {
    if (!session?.id) return;

    const channel = supabase
      .channel(`session-${session.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "live_sessions",
          filter: `id=eq.${session.id}`,
        },
        (payload) => {
          try {
            const updated = payload.new as SessionData;
            setSession(updated);

            if (updated.status === "active" && phaseRef.current === "waiting") {
              startQuestion(updated.current_question_index);
            } else if (updated.status === "active" && updated.current_question_index !== currentIndexRef.current) {
              startQuestion(updated.current_question_index);
            } else if (updated.status === "finished") {
              clearInterval(timerRef.current);
              setPhase("finished");
            }
          } catch (err) {
            console.error("Error handling session update:", err);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session?.id, startQuestion]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      clearInterval(timerRef.current);
    };
  }, []);

  const handleJoin = async () => {
    if (!session || !joinCode || !playerName.trim() || !phoneNumber.trim()) return;
    setIsJoining(true);

    try {
      const trimmedName = playerName.trim();
      const trimmedPhone = phoneNumber.trim();

      // If this phone already joined this session (e.g. they cleared localStorage
      // but their participant row still exists), reuse the existing row instead
      // of creating a duplicate that resets points.
      const { data: existing } = await supabase
        .from("live_session_participants")
        .select("id, player_name, phone_number, total_points")
        .eq("session_id", session.id)
        .eq("phone_number", trimmedPhone)
        .maybeSingle();

      let pid: string;
      let restoredPoints = 0;

      if (existing) {
        pid = existing.id;
        restoredPoints = existing.total_points || 0;
      } else {
        const { data, error } = await supabase
          .from("live_session_participants")
          .insert({
            session_id: session.id,
            player_name: trimmedName,
            phone_number: trimmedPhone,
          })
          .select("id")
          .single();
        if (error) throw error;
        pid = data.id;
      }

      setParticipantId(pid);
      setTotalPoints(restoredPoints);
      saveStored(joinCode, { participantId: pid, playerName: trimmedName, phoneNumber: trimmedPhone });

      // Replay answered questions so they can't double-submit if they rejoined mid-game
      const { data: answers } = await supabase
        .from("live_session_answers")
        .select("question_id")
        .eq("participant_id", pid);
      if (answers) {
        setAnsweredQuestionIds(new Set(answers.map((a: any) => a.question_id)));
        answeredRef.current = new Set(answers.map((a: any) => a.question_id));
      }

      if (session.status === "active") {
        startQuestion(session.current_question_index);
      } else {
        setPhase("waiting");
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsJoining(false);
    }
  };

  const handleAnswer = async (choice: string) => {
    const sess = sessionRef.current;
    const pid = participantIdRef.current;
    if (hasAnsweredRef.current || !sess || !pid) return;
    hasAnsweredRef.current = true;
    clearInterval(timerRef.current);

    const currentQ = questionsRef.current[currentIndexRef.current];
    if (!currentQ) return;

    const timeTaken = Date.now() - questionStartRef.current;
    const correct = choice === currentQ.answer;
    const totalTime = sess.time_per_question * 1000;
    const timeRemaining = Math.max(0, totalTime - timeTaken);
    const points = correct ? Math.max(100, Math.round(1000 * (timeRemaining / totalTime))) : 0;

    setSelectedAnswer(choice);
    setIsCorrect(correct);
    setPointsEarned(points);
    setTotalPoints((prev) => prev + points);
    setAnsweredQuestionIds((prev) => {
      const next = new Set(prev);
      next.add(currentQ.id);
      answeredRef.current = next;
      return next;
    });
    setPhase("feedback");

    try {
      await supabase.from("live_session_answers").insert({
        session_id: sess.id,
        participant_id: pid,
        question_id: currentQ.id,
        answer: choice,
        is_correct: correct,
        time_taken_ms: timeTaken,
        points_earned: points,
      });

      // Update participant total — always re-read latest from server first to
      // avoid clobbering points if the same participant is open on another tab
      const { data: latest } = await supabase
        .from("live_session_participants")
        .select("total_points")
        .eq("id", pid)
        .maybeSingle();
      const serverTotal = latest?.total_points ?? totalPointsRef.current;

      await supabase
        .from("live_session_participants")
        .update({ total_points: serverTotal + points })
        .eq("id", pid);
    } catch (err) {
      console.error("Error submitting answer:", err);
    }
  };

  // Error state
  if (error && phase === "join") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="p-6 max-w-sm w-full text-center space-y-4">
          <XCircle className="h-12 w-12 text-destructive mx-auto" />
          <p className="text-sm text-muted-foreground">{error}</p>
          <Button variant="outline" onClick={() => window.location.reload()}>
            Try Again
          </Button>
        </Card>
      </div>
    );
  }

  // Restoring from refresh — show spinner instead of flashing the join form
  if (isRestoring && phase === "join") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
          <p className="text-sm text-muted-foreground">Reconnecting you to the game…</p>
        </div>
      </div>
    );
  }

  // Join form
  if (phase === "join") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="p-6 max-w-sm w-full space-y-6">
          <div className="text-center space-y-2">
            <Gamepad2 className="h-10 w-10 text-primary mx-auto" />
            <h1 className="text-xl font-bold">Join Live Quiz</h1>
            {session && (
              <p className="text-sm text-muted-foreground">
                Hosted by {session.teacher_name}
              </p>
            )}
          </div>
          <div className="space-y-3">
            <Input
              placeholder="Your name"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              className="h-12 text-center text-lg"
              autoFocus
            />
            <Input
              placeholder="Phone number"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              className="h-12 text-center text-lg"
              type="tel"
            />
            <Button
              className="w-full h-12 text-lg"
              onClick={handleJoin}
              disabled={!playerName.trim() || !phoneNumber.trim() || isJoining}
            >
              {isJoining ? <Loader2 className="h-5 w-5 animate-spin" /> : "Join Game"}
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  // Waiting lobby
  if (phase === "waiting") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center space-y-6">
          <motion.div
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ repeat: Infinity, duration: 2 }}
          >
            <Gamepad2 className="h-16 w-16 text-primary mx-auto" />
          </motion.div>
          <div>
            <h2 className="text-xl font-bold">You're in, {playerName}!</h2>
            <p className="text-muted-foreground text-sm mt-1">
              Waiting for the teacher to start...
            </p>
          </div>
          <div className="animate-pulse text-sm text-muted-foreground">
            Get ready! 🔥
          </div>
        </div>
      </div>
    );
  }

  // Question phase
  if (phase === "question") {
    const currentQ = questions[currentIndex];
    if (!currentQ) {
      // Show loading instead of returning null (which causes blank screen)
      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
          <div className="text-center space-y-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
            <p className="text-sm text-muted-foreground">Loading question...</p>
          </div>
        </div>
      );
    }

    const options = currentQ.multiple_choice_options || {};

    return (
      <div className="min-h-screen bg-background p-4 flex flex-col">
        {/* Timer bar */}
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs text-muted-foreground">
            Q{currentIndex + 1}/{questions.length}
          </span>
          <motion.div
            key={timeLeft}
            initial={{ scale: 1.2 }}
            animate={{ scale: 1 }}
            className={`flex items-center gap-1 text-lg font-bold ${
              timeLeft <= 5 ? "text-destructive" : "text-primary"
            }`}
          >
            <Clock className="h-4 w-4" />
            {timeLeft}
          </motion.div>
        </div>

        <div className="h-1.5 bg-muted rounded-full overflow-hidden mb-4">
          <motion.div
            className="h-full bg-primary"
            initial={{ width: "0%" }}
            animate={{
              width: `${((session?.time_per_question || 30) - timeLeft) / (session?.time_per_question || 30) * 100}%`,
            }}
          />
        </div>

        {/* Question */}
        <Card className="p-4 mb-4 flex-shrink-0">
          <div className="text-base font-medium leading-relaxed">
            <MathText text={currentQ.question_text} />
          </div>
        </Card>

        {/* Options */}
        <div className="flex-1 grid grid-cols-1 gap-3">
          {Object.entries(options).map(([key, value]) => (
            <Button
              key={key}
              variant="outline"
              className="h-auto min-h-[56px] text-left justify-start p-4 text-base whitespace-normal"
              onClick={() => handleAnswer(key)}
            >
              <span className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-bold mr-3 flex-shrink-0">
                {key}
              </span>
              <MathText text={String(value)} />
            </Button>
          ))}
        </div>
      </div>
    );
  }

  // Feedback phase
  if (phase === "feedback") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-center space-y-4"
        >
          {isCorrect ? (
            <>
              <motion.div
                initial={{ rotate: -20, scale: 0 }}
                animate={{ rotate: 0, scale: 1 }}
                transition={{ type: "spring" }}
              >
                <CheckCircle className="h-20 w-20 text-green-500 mx-auto" />
              </motion.div>
              <h2 className="text-2xl font-bold text-green-500">Correct!</h2>
              <p className="text-3xl font-bold text-primary">+{pointsEarned}</p>
            </>
          ) : (
            <>
              <XCircle className="h-20 w-20 text-destructive mx-auto" />
              <h2 className="text-2xl font-bold text-destructive">
                {selectedAnswer ? "Wrong!" : "Time's up!"}
              </h2>
              <p className="text-sm text-muted-foreground">
                Correct answer: {questions[currentIndex]?.answer}
              </p>
            </>
          )}
          <p className="text-sm text-muted-foreground">
            Total: {totalPoints} points
          </p>
          <p className="text-xs text-muted-foreground animate-pulse">
            Waiting for next question...
          </p>
        </motion.div>
      </div>
    );
  }

  // Finished
  if (phase === "finished") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-center space-y-4"
        >
          <Trophy className="h-16 w-16 text-yellow-500 mx-auto" />
          <h2 className="text-2xl font-bold">Game Over!</h2>
          <div>
            <p className="text-4xl font-bold text-primary">{totalPoints}</p>
            <p className="text-sm text-muted-foreground">Total Points</p>
          </div>
          <p className="text-sm text-muted-foreground">
            Great job, {playerName}! 🎉
          </p>
        </motion.div>
      </div>
    );
  }

  return null;
}
