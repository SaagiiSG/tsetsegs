import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  ArrowLeft,
  Plus,
  Trash2,
  Search,
  Loader2,
  Filter,
  RefreshCw,
  Sparkles,
  Library,
} from "lucide-react";
import { MathText } from "@/components/MathText";
import { cn } from "@/lib/utils";
import CustomQuestionForm from "@/components/admin/bluebook/CustomQuestionForm";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";

type ModuleRow = {
  id: string;
  test_id: string;
  section: "reading_writing" | "math";
  module_number: number;
};

const BluebookModuleEditor = () => {
  const { testId, moduleId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [tab, setTab] = useState<"create" | "browse">("create");

  // Browse filters
  const [search, setSearch] = useState("");
  const [filterQuestionSet, setFilterQuestionSet] = useState<string>("any");

  const { data: moduleRow, isLoading: moduleLoading } = useQuery({
    queryKey: ["bluebook-module", moduleId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bluebook_modules")
        .select("id, test_id, section, module_number")
        .eq("id", moduleId!)
        .maybeSingle();
      if (error) throw error;
      return data as ModuleRow | null;
    },
    enabled: !!moduleId,
  });

  const subjectFilter = moduleRow?.section === "reading_writing" ? "english" : "math";

  const { data: currentQuestions, isLoading: currentLoading } = useQuery({
    queryKey: ["bluebook-module-questions", moduleId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bluebook_module_questions")
        .select(`
          id, order_index, question_id,
          question:questions(id, question_id, question_text, subject, difficulty_level)
        `)
        .eq("module_id", moduleId!)
        .order("order_index");
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!moduleId,
  });

  const addedQuestionIds = useMemo(
    () => new Set((currentQuestions ?? []).map((q: any) => q.question_id)),
    [currentQuestions]
  );

  const { data: availableQuestionSets } = useQuery({
    queryKey: ["bluebook-available-question-sets", subjectFilter],
    queryFn: async () => {
      if (!subjectFilter) return [] as string[];
      const { data, error } = await supabase
        .from("questions")
        .select("question_set")
        .eq("is_active", true)
        .ilike("subject", `%${subjectFilter}%`)
        .not("question_set", "is", null)
        .limit(5000);
      if (error) throw error;
      const sets = Array.from(
        new Set((data ?? []).map((r: any) => r.question_set).filter(Boolean))
      ) as string[];
      sets.sort((a, b) => a.localeCompare(b));
      return sets;
    },
    enabled: !!subjectFilter && tab === "browse",
  });

  const { data: pool, isLoading: poolLoading } = useQuery({
    queryKey: [
      "bluebook-question-pool",
      subjectFilter,
      search,
      filterQuestionSet,
    ],
    queryFn: async () => {
      if (!subjectFilter) return [];
      let q = supabase
        .from("questions")
        .select("id, question_id, question_text, subject, difficulty_level, question_set, passage_text, question_image_url, multiple_choice_options, answer, question_type")
        .eq("is_active", true)
        .ilike("subject", `%${subjectFilter}%`)
        .order("question_id", { ascending: false })
        .limit(300);

      if (search.trim()) {
        q = q.or(
          `question_id.ilike.%${search.trim()}%,question_text.ilike.%${search.trim()}%`
        );
      }
      if (filterQuestionSet !== "any") {
        q = q.eq("question_set", filterQuestionSet);
      }

      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!subjectFilter && tab === "browse",
  });

  const addMutation = useMutation({
    mutationFn: async (qid: string) => {
      const orderIndex = currentQuestions?.length ?? 0;
      const { error } = await supabase
        .from("bluebook_module_questions")
        .insert({ module_id: moduleId!, question_id: qid, order_index: orderIndex });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bluebook-module-questions", moduleId] });
    },
    onError: (e: any) => toast.error(e?.message || "Failed to add question"),
  });

  const removeMutation = useMutation({
    mutationFn: async (moduleQuestionId: string) => {
      const { error } = await supabase
        .from("bluebook_module_questions")
        .delete()
        .eq("id", moduleQuestionId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bluebook-module-questions", moduleId] });
    },
    onError: (e: any) => toast.error(e?.message || "Failed to remove"),
  });

  const resetFilters = () => {
    setFilterQuestionSet("any");
    setSearch("");
  };

  if (moduleLoading) {
    return (
      <div className="space-y-4 p-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!moduleRow) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">Module not found.</p>
        <Button variant="ghost" onClick={() => navigate(`/admin/bluebook/edit/${testId}`)}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Back
        </Button>
      </div>
    );
  }

  const sectionLabel =
    moduleRow.section === "reading_writing" ? "Reading & Writing" : "Math";

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(`/admin/bluebook/edit/${testId}`)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-xl font-bold leading-tight">
              {sectionLabel} — Module {moduleRow.module_number}
            </h1>
            <p className="text-xs text-muted-foreground">
              Create custom questions for this module, or browse the existing bank.
            </p>
          </div>
        </div>
        <Badge variant="outline" className="gap-1">
          {currentQuestions?.length ?? 0} in module
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px] gap-3">
        {/* Right sidebar: current module questions */}
        <Card className="min-h-[60vh] order-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center justify-between">
              <span>In this module</span>
              <Badge variant="secondary">{currentQuestions?.length ?? 0}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[65vh] pr-3">
              {currentLoading ? (
                <div className="space-y-2">
                  {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
                </div>
              ) : (currentQuestions ?? []).length === 0 ? (
                <div className="text-center py-16 text-muted-foreground text-sm">
                  No questions yet — use the creator on the left to add one.
                </div>
              ) : (
                <div className="space-y-2">
                  {currentQuestions!.map((mq: any, idx: number) => (
                    <div
                      key={mq.id}
                      className="flex items-center gap-3 p-3 rounded-lg bg-muted/40 hover:bg-muted transition-colors group"
                    >
                      <span className="text-xs font-mono text-muted-foreground w-6">
                        {idx + 1}.
                      </span>
                      <span className="font-mono text-xs font-medium shrink-0 w-24">
                        #{mq.question?.question_id}
                      </span>
                      <div className="flex-1 text-sm text-muted-foreground truncate">
                        <MathText text={(mq.question?.question_text ?? "").slice(0, 120)} />
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => removeMutation.mutate(mq.id)}
                        disabled={removeMutation.isPending}
                      >
                        {removeMutation.isPending ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        )}
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Main: Create (default) + Browse bank tabs */}
        <Card className="order-1">
          <CardHeader className="pb-3">
            <Tabs value={tab} onValueChange={(v) => setTab(v as "create" | "browse")}>
              <TabsList className="grid grid-cols-2 w-full">
                <TabsTrigger value="create" className="gap-2">
                  <Sparkles className="h-4 w-4" /> Create
                </TabsTrigger>
                <TabsTrigger value="browse" className="gap-2">
                  <Library className="h-4 w-4" /> Browse bank
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </CardHeader>
          <CardContent>
            {tab === "create" ? (
              <ScrollArea className="h-[65vh] pr-3">
                <CustomQuestionForm
                  moduleId={moduleId!}
                  section={moduleRow.section}
                  currentCount={currentQuestions?.length ?? 0}
                  onAdded={() => {
                    // stay on create for rapid entry
                  }}
                />
              </ScrollArea>
            ) : (
              <div className="space-y-4">
                {/* Filters */}
                <div className="space-y-3 rounded-lg border p-3">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Filter className="h-3.5 w-3.5" /> Filters
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Section</Label>
                    <div className="text-sm p-2 rounded-md bg-muted/50">
                      {sectionLabel} <span className="text-muted-foreground">(locked)</span>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Question set</Label>
                    <Select value={filterQuestionSet} onValueChange={setFilterQuestionSet}>
                      <SelectTrigger>
                        <SelectValue placeholder="Any set" />
                      </SelectTrigger>
                      <SelectContent className="max-h-72">
                        <SelectItem value="any">Any set</SelectItem>
                        {(availableQuestionSets ?? []).map((s) => (
                          <SelectItem key={s} value={s}>
                            {s.replace(/_/g, " ")}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button variant="outline" size="sm" className="w-full gap-2" onClick={resetFilters}>
                    <RefreshCw className="h-3.5 w-3.5" /> Reset
                  </Button>
                </div>

                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by ID or text…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>

                {/* Pool list */}
                <ScrollArea className="h-[42vh] pr-2">
                  {poolLoading ? (
                    <div className="space-y-2">
                      {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
                    </div>
                  ) : (pool ?? []).length === 0 ? (
                    <div className="text-center py-10 text-muted-foreground text-sm">
                      No questions match these filters.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {pool!.map((q: any) => {
                        const added = addedQuestionIds.has(q.id);
                        const choices = [
                          { k: "A", v: q.choice_a },
                          { k: "B", v: q.choice_b },
                          { k: "C", v: q.choice_c },
                          { k: "D", v: q.choice_d },
                        ].filter((c) => c.v);
                        return (
                          <HoverCard key={q.id} openDelay={150} closeDelay={80}>
                            <div
                              className={cn(
                                "flex items-start gap-2 p-2 rounded-lg border transition-colors",
                                added ? "bg-emerald-500/5 border-emerald-500/30" : "bg-muted/40 hover:bg-muted"
                              )}
                            >
                              <span className="font-mono text-[11px] font-medium shrink-0 w-16 truncate pt-0.5">
                                #{q.question_id}
                              </span>
                              <HoverCardTrigger asChild>
                                <div className="flex-1 text-xs text-muted-foreground line-clamp-3 cursor-help">
                                  <MathText text={q.question_text ?? ""} />
                                </div>
                              </HoverCardTrigger>
                              {added ? (
                                <Badge className="bg-emerald-500/20 text-emerald-700 border-emerald-500/30 text-[10px] shrink-0">
                                  Added
                                </Badge>
                              ) : (
                                <Button
                                  size="sm"
                                  variant="default"
                                  className="gap-1 h-7 shrink-0"
                                  disabled={addMutation.isPending}
                                  onClick={() => addMutation.mutate(q.id)}
                                >
                                  <Plus className="h-3 w-3" /> Add
                                </Button>
                              )}
                            </div>
                            <HoverCardContent side="left" align="start" className="w-[520px] max-h-[70vh] overflow-y-auto p-4">
                              <div className="space-y-3 text-sm">
                                <div className="flex items-center justify-between">
                                  <span className="font-mono text-xs font-semibold">#{q.question_id}</span>
                                  <div className="flex gap-1">
                                    {q.question_set && (
                                      <Badge variant="outline" className="text-[10px]">{q.question_set}</Badge>
                                    )}
                                    {q.difficulty_level && (
                                      <Badge variant="secondary" className="text-[10px]">{q.difficulty_level}</Badge>
                                    )}
                                  </div>
                                </div>
                                {q.passage_text && (
                                  <div className="text-xs bg-muted/50 rounded p-2 max-h-40 overflow-y-auto">
                                    <MathText text={q.passage_text} />
                                  </div>
                                )}
                                {q.image_url && (
                                  <img src={q.image_url} alt="" className="max-h-48 rounded border object-contain" />
                                )}
                                <div className="text-sm">
                                  <MathText text={q.question_text ?? ""} />
                                </div>
                                {choices.length > 0 && (
                                  <div className="space-y-1">
                                    {choices.map((c) => {
                                      const isCorrect = q.correct_answer === c.k;
                                      return (
                                        <div
                                          key={c.k}
                                          className={cn(
                                            "flex gap-2 text-xs rounded px-2 py-1 border",
                                            isCorrect ? "bg-emerald-500/10 border-emerald-500/40" : "border-transparent"
                                          )}
                                        >
                                          <span className="font-mono font-semibold shrink-0">{c.k}.</span>
                                          <div className="flex-1"><MathText text={c.v} /></div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                                {choices.length === 0 && q.correct_answer && (
                                  <div className="text-xs">
                                    <span className="text-muted-foreground">Answer: </span>
                                    <span className="font-mono font-semibold text-emerald-700">{q.correct_answer}</span>
                                  </div>
                                )}
                              </div>
                            </HoverCardContent>
                          </HoverCard>
                        );
                      })}
                    </div>
                  )}
                </ScrollArea>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default BluebookModuleEditor;
