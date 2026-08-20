import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from "@/components/ui/drawer";
import { MathText } from "@/components/MathText";
import { QuestionFigures } from "@/components/QuestionFigures";
import { cn } from "@/lib/utils";
import {
  ArrowLeft, Clock, Flag, ChevronLeft, ChevronRight, Grid3X3, Eye, EyeOff, X,
} from "lucide-react";

interface PreviewQuestion {
  id: string;
  question_id: string;
  question_text: string;
  question_image_url: string | null;
  question_image_url_2: string | null;
  question_type: string;
  multiple_choice_options: any;
  choice_images: any;
  passage_text: string | null;
  answer: string | null;
}

interface PreviewModule {
  id: string;
  module_number: number;
  section: string;
  time_limit_minutes: number;
  questions: { id: string; order_index: number; question: PreviewQuestion | null }[];
}

const sectionLabel = (s?: string) =>
  s === "reading_writing" ? "Reading & Writing" : "Math";

const parseOptions = (raw: any): string[] => {
  if (Array.isArray(raw)) return raw as string[];
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  if (raw && typeof raw === "object") return Object.values(raw) as string[];
  return [];
};

interface StudentTestPreviewProps {
  /** When provided, the component works standalone (no route param needed). */
  testId?: string;
  /** When provided, replaces the admin back/close navigation. */
  onBack?: () => void;
  /** Hide the "Back to editor" action (e.g. teacher-side read-only preview). */
  hideEditorLink?: boolean;
}

const StudentTestPreview = ({ testId: testIdProp, onBack, hideEditorLink }: StudentTestPreviewProps = {}) => {
  const params = useParams();
  const testId = testIdProp ?? params.testId;
  const navigate = useNavigate();
  const goBack = () => (onBack ? onBack() : navigate("/admin/bluebook"));

  const [moduleIndex, setModuleIndex] = useState(0);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [marked, setMarked] = useState<Record<string, boolean>>({});
  const [showAnswers, setShowAnswers] = useState(false);
  const [showDrawer, setShowDrawer] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);

  const { data: test } = useQuery({
    queryKey: ["bluebook-preview-test", testId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bluebook_tests")
        .select("id, name, description, is_published")
        .eq("id", testId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!testId,
  });

  const { data: modules, isLoading } = useQuery({
    queryKey: ["bluebook-preview-modules", testId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bluebook_modules")
        .select(`
          id, module_number, section, time_limit_minutes,
          bluebook_module_questions(
            id, order_index,
            question:questions(
              id, question_id, question_text, question_image_url, question_image_url_2, question_type,
              multiple_choice_options, choice_images, passage_text, answer
            )
          )
        `)
        .eq("test_id", testId!)
        .order("section")
        .order("module_number");
      if (error) throw error;
      return (data || []).map((m: any) => ({
        ...m,
        questions: (m.bluebook_module_questions || []).sort(
          (a: any, b: any) => a.order_index - b.order_index
        ),
      })) as PreviewModule[];
    },
    enabled: !!testId,
  });

  const currentModule = modules?.[moduleIndex];
  const moduleQuestions = currentModule?.questions ?? [];
  const currentQuestion = moduleQuestions[questionIndex]?.question ?? null;

  // Reset timer when module changes
  useEffect(() => {
    if (!currentModule) return;
    setQuestionIndex(0);
    setSecondsLeft(currentModule.time_limit_minutes * 60);
  }, [currentModule?.id]);

  useEffect(() => {
    if (secondsLeft === null) return;
    const t = setInterval(() => {
      setSecondsLeft((s) => (s === null ? null : Math.max(0, s - 1)));
    }, 1000);
    return () => clearInterval(t);
  }, [secondsLeft === null]);

  const formatTime = (s: number) =>
    `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;

  const options = useMemo(
    () => parseOptions(currentQuestion?.multiple_choice_options),
    [currentQuestion]
  );
  const choiceImages: Record<string, string> =
    (currentQuestion?.choice_images as any) || {};

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!modules?.length) {
    return (
      <div className="text-center py-16 space-y-4">
        <p className="text-muted-foreground">This test has no modules yet.</p>
        <Button variant="outline" onClick={() => navigate("/admin/bluebook")}>
          Back to tests
        </Button>
      </div>
    );
  }

  const qId = currentQuestion?.id;
  const selected = qId ? answers[qId] : undefined;
  const isLastQuestion = questionIndex >= moduleQuestions.length - 1;
  const hasNextModule = !!modules && moduleIndex < modules.length - 1;
  const hasPrevModule = moduleIndex > 0;


  return (
    <div className="-m-4 md:-m-6 flex flex-col min-h-[calc(100vh-4rem)] bg-background">
      {/* Preview banner */}
      <div className="bg-amber-500/10 border-b border-amber-500/30 px-4 py-2 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm">
          <Eye className="h-4 w-4 text-amber-600" />
          <span className="font-medium">Student preview</span>
          <span className="text-muted-foreground">— nothing is saved or scored</span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => setShowAnswers((v) => !v)}
          >
            {showAnswers ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            {showAnswers ? "Hide answer key" : "Show answer key"}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="gap-2"
            onClick={() => navigate(`/admin/bluebook/edit/${testId}`)}
          >
            <ArrowLeft className="h-4 w-4" />
            Back to editor
          </Button>
        </div>
      </div>

      {/* Student-style header */}
      <header className="sticky top-0 z-40 bg-card border-b px-4 py-3">
        <div className="flex items-center justify-between gap-4 max-w-7xl mx-auto">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <Button variant="ghost" size="icon" onClick={() => navigate("/admin/bluebook")}>
              <X className="h-5 w-5" />
            </Button>
            <div className="min-w-0">
              <h1 className="font-semibold truncate">{test?.name}</h1>
              <p className="text-sm text-muted-foreground">
                {sectionLabel(currentModule?.section)} — Module {currentModule?.module_number}
              </p>
            </div>
          </div>

          <div className="flex-1 flex justify-center">
            <Badge
              variant={secondsLeft !== null && secondsLeft < 300 ? "destructive" : "secondary"}
              className="gap-1 text-lg px-3 py-1"
            >
              <Clock className="h-4 w-4" />
              {secondsLeft !== null ? formatTime(secondsLeft) : "--:--"}
            </Badge>
          </div>

          <div className="flex-1 flex justify-end">
            <Select
              value={String(moduleIndex)}
              onValueChange={(v) => setModuleIndex(parseInt(v))}
            >
              <SelectTrigger className="w-[240px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {modules.map((m, i) => (
                  <SelectItem key={m.id} value={String(i)}>
                    {sectionLabel(m.section)} — Module {m.module_number} ({m.questions.length} q)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-auto pb-24">
        <main className="p-6">
          {!currentQuestion ? (
            <div className="text-center py-16 text-muted-foreground">
              No questions in this module yet.
            </div>
          ) : (
            <div className="space-y-6 max-w-4xl mx-auto">
              {currentQuestion.passage_text && (
                <Card className="bg-muted/30">
                  <CardContent className="p-4">
                    <MathText text={currentQuestion.passage_text} />
                  </CardContent>
                </Card>
              )}

              <Card>
                <CardContent className="p-6 space-y-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-3">
                        <Badge variant="outline">Question {questionIndex + 1}</Badge>
                        <Badge variant="secondary" className="font-mono text-xs">
                          {currentQuestion.question_id}
                        </Badge>
                      </div>

                      <QuestionFigures
                        url1={currentQuestion.question_image_url}
                        url2={currentQuestion.question_image_url_2}
                        className="mb-4"
                        imgClassName={
                          currentQuestion.question_image_url_2
                            ? "max-h-72 w-auto rounded-lg"
                            : "w-[55%] h-auto rounded-lg"
                        }
                      />


                      <div className="text-lg">
                        <MathText text={currentQuestion.question_text} />
                      </div>
                    </div>

                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() =>
                        qId && setMarked((m) => ({ ...m, [qId]: !m[qId] }))
                      }
                      className={cn("shrink-0", qId && marked[qId] && "text-amber-500")}
                    >
                      <Flag className="h-5 w-5" />
                    </Button>
                  </div>

                  <div className="pt-4">
                    {currentQuestion.question_type === "multiple_choice" ? (
                      <RadioGroup
                        value={selected || ""}
                        onValueChange={(v) =>
                          qId && setAnswers((a) => ({ ...a, [qId]: v }))
                        }
                        className="space-y-3"
                      >
                        {options.map((option, idx) => {
                          const letter = String.fromCharCode(65 + idx);
                          const isCorrect =
                            showAnswers &&
                            (currentQuestion.answer || "").trim().toUpperCase() === letter;
                          return (
                            <Label
                              key={idx}
                              htmlFor={`preview-option-${idx}`}
                              className={cn(
                                "flex items-start gap-3 p-4 rounded-lg border cursor-pointer transition-colors",
                                selected === letter
                                  ? "border-primary bg-primary/5"
                                  : "hover:bg-muted/50",
                                isCorrect && "border-emerald-500 bg-emerald-500/10"
                              )}
                            >
                              <RadioGroupItem value={letter} id={`preview-option-${idx}`} />
                              <span className="font-medium mr-2">{letter}.</span>
                              <div className="space-y-2">
                                <MathText text={option} />
                                {choiceImages?.[letter] && (
                                  <img
                                    src={choiceImages[letter]}
                                    alt={`Choice ${letter} figure`}
                                    className="max-h-40 rounded-md"
                                  />
                                )}
                              </div>
                            </Label>
                          );
                        })}
                      </RadioGroup>
                    ) : (
                      <div className="space-y-2">
                        <Label htmlFor="preview-answer">Your Answer</Label>
                        <Input
                          id="preview-answer"
                          value={selected || ""}
                          onChange={(e) =>
                            qId && setAnswers((a) => ({ ...a, [qId]: e.target.value }))
                          }
                          placeholder="Enter your answer..."
                          className="max-w-xs"
                        />
                        {showAnswers && (
                          <p className="text-sm text-emerald-600">
                            Correct answer: {currentQuestion.answer || "—"}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </main>
      </div>

      {/* Footer nav */}
      <footer className="sticky bottom-0 bg-card border-t px-4 py-3 z-30">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <Button
            variant="outline"
            size="icon"
            className="h-10 w-10"
            disabled={questionIndex === 0 && !hasPrevModule}
            onClick={() => {
              if (questionIndex === 0 && hasPrevModule) {
                setModuleIndex((i) => i - 1);
              } else {
                setQuestionIndex((i) => Math.max(0, i - 1));
              }
            }}
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>


          <Drawer open={showDrawer} onOpenChange={setShowDrawer}>
            <DrawerTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Grid3X3 className="h-4 w-4" />
                Question {moduleQuestions.length ? questionIndex + 1 : 0} of {moduleQuestions.length}
              </Button>
            </DrawerTrigger>
            <DrawerContent className="max-h-[70vh]">
              <DrawerHeader className="border-b">
                <DrawerTitle>
                  {sectionLabel(currentModule?.section)} — Module {currentModule?.module_number}
                </DrawerTitle>
              </DrawerHeader>
              <ScrollArea className="p-4">
                <div className="grid grid-cols-7 sm:grid-cols-10 md:grid-cols-14 gap-2">
                  {moduleQuestions.map((mq, idx) => {
                    const id = mq.question?.id;
                    const isAnswered = !!(id && answers[id]);
                    const isMarked = !!(id && marked[id]);
                    return (
                      <Button
                        key={mq.id}
                        variant="outline"
                        size="sm"
                        className={cn(
                          "h-10 w-10 p-0 text-sm font-medium",
                          idx === questionIndex && "ring-2 ring-primary",
                          isAnswered && !isMarked && "bg-primary/20 border-primary",
                          isMarked && "bg-amber-500/20 border-amber-500"
                        )}
                        onClick={() => {
                          setQuestionIndex(idx);
                          setShowDrawer(false);
                        }}
                      >
                        {idx + 1}
                      </Button>
                    );
                  })}
                </div>
              </ScrollArea>
            </DrawerContent>
          </Drawer>

          {isLastQuestion && hasNextModule ? (
            <Button className="gap-2" onClick={() => setModuleIndex((i) => i + 1)}>
              Next module
              <ChevronRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              size="icon"
              className="h-10 w-10"
              disabled={isLastQuestion}
              onClick={() =>
                setQuestionIndex((i) => Math.min(moduleQuestions.length - 1, i + 1))
              }
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
          )}

        </div>
      </footer>
    </div>
  );
};

export default StudentTestPreview;
