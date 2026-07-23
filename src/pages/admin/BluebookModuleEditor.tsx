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
} from "lucide-react";
import { MathText } from "@/components/MathText";
import { cn } from "@/lib/utils";

const MONTHS = [
  { value: 1, label: "January" }, { value: 2, label: "February" },
  { value: 3, label: "March" }, { value: 4, label: "April" },
  { value: 5, label: "May" }, { value: 6, label: "June" },
  { value: 7, label: "July" }, { value: 8, label: "August" },
  { value: 9, label: "September" }, { value: 10, label: "October" },
  { value: 11, label: "November" }, { value: 12, label: "December" },
];

const YEARS = [2024, 2025, 2026, 2027, 2028, 2029, 2030];

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

  // Filters
  const [search, setSearch] = useState("");
  const [filterMonth, setFilterMonth] = useState<string>("any");
  const [filterYear, setFilterYear] = useState<string>("any");
  const [filterVariant, setFilterVariant] = useState<string>("");
  const [filterDifficulty, setFilterDifficulty] = useState<string>("any");

  // Load the module + its section
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

  // Current questions in this module
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

  // Restrict pool by month/year/variant via join through bluebook_tests when set
  const { data: restrictedPool } = useQuery({
    queryKey: ["bluebook-filter-pool", filterMonth, filterYear, filterVariant],
    queryFn: async () => {
      const noFilter =
        filterMonth === "any" && filterYear === "any" && !filterVariant.trim();
      if (noFilter) return null; // null = no restriction

      let testQuery = supabase.from("bluebook_tests").select("id");
      if (filterMonth !== "any") testQuery = testQuery.eq("test_month", parseInt(filterMonth));
      if (filterYear !== "any") testQuery = testQuery.eq("test_year", parseInt(filterYear));
      if (filterVariant.trim()) testQuery = testQuery.ilike("variant", `%${filterVariant.trim()}%`);

      const { data: tests, error: te } = await testQuery;
      if (te) throw te;
      const testIds = (tests ?? []).map((t) => t.id);
      if (testIds.length === 0) return [] as string[];

      const { data: mods, error: me } = await supabase
        .from("bluebook_modules")
        .select("id")
        .in("test_id", testIds);
      if (me) throw me;
      const modIds = (mods ?? []).map((m) => m.id);
      if (modIds.length === 0) return [] as string[];

      const { data: mqs, error: qe } = await supabase
        .from("bluebook_module_questions")
        .select("question_id")
        .in("module_id", modIds);
      if (qe) throw qe;
      return Array.from(new Set((mqs ?? []).map((r: any) => r.question_id)));
    },
  });

  // Full prepared-question list (subject-scoped)
  const { data: pool, isLoading: poolLoading } = useQuery({
    queryKey: [
      "bluebook-question-pool",
      subjectFilter,
      search,
      filterDifficulty,
      restrictedPool?.length ?? "all",
    ],
    queryFn: async () => {
      if (!subjectFilter) return [];
      let q = supabase
        .from("questions")
        .select("id, question_id, question_text, subject, difficulty_level")
        .eq("is_active", true)
        .ilike("subject", `%${subjectFilter}%`)
        .order("question_id", { ascending: false })
        .limit(300);

      if (filterDifficulty !== "any") q = q.eq("difficulty_level", filterDifficulty);
      if (search.trim()) {
        q = q.or(
          `question_id.ilike.%${search.trim()}%,question_text.ilike.%${search.trim()}%`
        );
      }
      if (Array.isArray(restrictedPool)) {
        if (restrictedPool.length === 0) return [];
        q = q.in("id", restrictedPool);
      }

      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!subjectFilter,
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
    setFilterMonth("any");
    setFilterYear("any");
    setFilterVariant("");
    setFilterDifficulty("any");
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(`/admin/bluebook/edit/${testId}`)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">
              {sectionLabel} — Module {moduleRow.module_number}
            </h1>
            <p className="text-sm text-muted-foreground">
              Add prepared questions from your bank, filtered by section / month / year / variant.
            </p>
          </div>
        </div>
        <Badge variant="outline" className="gap-1">
          {currentQuestions?.length ?? 0} in module
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
        {/* Main: pool of prepared questions */}
        <Card className="min-h-[60vh]">
          <CardHeader className="space-y-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Prepared questions</CardTitle>
              <Badge variant="secondary">{pool?.length ?? 0} shown</Badge>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by ID or text…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[55vh] pr-3">
              {poolLoading ? (
                <div className="space-y-2">
                  {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
                </div>
              ) : (pool ?? []).length === 0 ? (
                <div className="text-center py-12 text-muted-foreground text-sm">
                  No questions match these filters.
                </div>
              ) : (
                <div className="space-y-2">
                  {pool!.map((q: any) => {
                    const added = addedQuestionIds.has(q.id);
                    return (
                      <div
                        key={q.id}
                        className={cn(
                          "flex items-center gap-3 p-3 rounded-lg border transition-colors",
                          added ? "bg-emerald-500/5 border-emerald-500/30" : "bg-muted/40 hover:bg-muted"
                        )}
                      >
                        <span className="font-mono text-xs font-medium shrink-0 w-20">
                          #{q.question_id}
                        </span>
                        <div className="flex-1 text-sm text-muted-foreground truncate">
                          <MathText text={(q.question_text ?? "").slice(0, 120)} />
                        </div>
                        {q.difficulty_level && (
                          <Badge variant="outline" className="text-xs capitalize shrink-0">
                            {q.difficulty_level}
                          </Badge>
                        )}
                        {added ? (
                          <Badge className="bg-emerald-500/20 text-emerald-700 border-emerald-500/30">
                            Added
                          </Badge>
                        ) : (
                          <Button
                            size="sm"
                            variant="default"
                            className="gap-1"
                            disabled={addMutation.isPending}
                            onClick={() => addMutation.mutate(q.id)}
                          >
                            <Plus className="h-3.5 w-3.5" /> Add
                          </Button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Right sidebar: filters + current list */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Filter className="h-4 w-4" /> Filters
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Section</Label>
                <div className="text-sm p-2 rounded-md bg-muted/50">
                  {sectionLabel} <span className="text-muted-foreground">(locked)</span>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Month</Label>
                <Select value={filterMonth} onValueChange={setFilterMonth}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any">Any month</SelectItem>
                    {MONTHS.map(m => (
                      <SelectItem key={m.value} value={String(m.value)}>{m.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Year</Label>
                <Select value={filterYear} onValueChange={setFilterYear}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any">Any year</SelectItem>
                    {YEARS.map(y => (
                      <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Variant</Label>
                <Input
                  placeholder="e.g. A, B, v1"
                  value={filterVariant}
                  onChange={(e) => setFilterVariant(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Difficulty</Label>
                <Select value={filterDifficulty} onValueChange={setFilterDifficulty}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any">Any</SelectItem>
                    <SelectItem value="easy">Easy</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="hard">Hard</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button variant="outline" size="sm" className="w-full gap-2" onClick={resetFilters}>
                <RefreshCw className="h-3.5 w-3.5" /> Reset filters
              </Button>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Month / Year / Variant scope to questions used in matching Bluebook tests.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center justify-between">
                <span>In this module</span>
                <Badge variant="secondary">{currentQuestions?.length ?? 0}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[40vh] pr-2">
                {currentLoading ? (
                  <div className="space-y-2">
                    {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
                  </div>
                ) : (currentQuestions ?? []).length === 0 ? (
                  <p className="text-xs text-muted-foreground py-6 text-center">
                    No questions yet — add from the list.
                  </p>
                ) : (
                  <div className="space-y-1.5">
                    {currentQuestions!.map((mq: any, idx: number) => (
                      <div key={mq.id} className="flex items-center gap-2 p-2 rounded-md bg-muted/40 group">
                        <span className="text-xs font-mono text-muted-foreground w-6">{idx + 1}.</span>
                        <span className="text-xs font-mono font-medium truncate flex-1">
                          #{mq.question?.question_id}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => removeMutation.mutate(mq.id)}
                          disabled={removeMutation.isPending}
                        >
                          {removeMutation.isPending ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Trash2 className="h-3 w-3 text-destructive" />
                          )}
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default BluebookModuleEditor;
