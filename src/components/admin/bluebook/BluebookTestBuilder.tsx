import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  ArrowLeft,
  Save,
  Eye,
  Clock,
  BookOpen,
  Calculator,
  Loader2,
} from "lucide-react";
import BluebookModuleCard from "./BluebookModuleCard";
import BluebookQuestionSelector from "./BluebookQuestionSelector";

interface Module {
  id: string;
  test_id: string;
  section: "reading_writing" | "math";
  module_number: number;
  time_limit_minutes: number;
  difficulty: string;
  questions: ModuleQuestion[];
}

interface ModuleQuestion {
  id: string;
  question_id: string;
  order_index: number;
  question?: {
    id: string;
    question_id: string;
    question_text: string;
    subject: string;
  };
}

const MONTHS = [
  { value: 1, label: "January" },
  { value: 2, label: "February" },
  { value: 3, label: "March" },
  { value: 4, label: "April" },
  { value: 5, label: "May" },
  { value: 6, label: "June" },
  { value: 7, label: "July" },
  { value: 8, label: "August" },
  { value: 9, label: "September" },
  { value: 10, label: "October" },
  { value: 11, label: "November" },
  { value: 12, label: "December" },
];

const YEARS = [2024, 2025, 2026, 2027, 2028, 2029, 2030];

const SECTION_TYPES = [
  { value: "math", label: "Math Only" },
  { value: "english", label: "English Only" },
  { value: "full", label: "Full Test (Both)" },
];

const getModuleConfig = (sectionType: string) => {
  const rwModules = [
    { section: "reading_writing" as const, module_number: 1, time_limit: 32, label: "Reading & Writing Module 1", target: 27 },
    { section: "reading_writing" as const, module_number: 2, time_limit: 32, label: "Reading & Writing Module 2", target: 27 },
  ];
  const mathModules = [
    { section: "math" as const, module_number: 1, time_limit: 35, label: "Math Module 1", target: 22 },
    { section: "math" as const, module_number: 2, time_limit: 35, label: "Math Module 2", target: 22 },
  ];

  if (sectionType === "math") return mathModules;
  if (sectionType === "english") return rwModules;
  return [...rwModules, ...mathModules];
};

const generateTestName = (sectionType: string, month: number | null, year: number | null, variant: string) => {
  const sectionLabel = sectionType === "math" ? "Math" : sectionType === "english" ? "English" : "Full";
  const monthLabel = month ? MONTHS.find(m => m.value === month)?.label : "";
  const yearLabel = year || "";
  const variantLabel = variant ? ` ${variant}` : "";
  
  return `Tsetsegs SAT ${sectionLabel} ${monthLabel} ${yearLabel}${variantLabel}`.trim();
};

const BluebookTestBuilder = () => {
  const navigate = useNavigate();
  const { testId } = useParams();
  const queryClient = useQueryClient();
  const isEditing = !!testId;

  const [sectionType, setSectionType] = useState<string>("math");
  const [testMonth, setTestMonth] = useState<number | null>(null);
  const [testYear, setTestYear] = useState<number | null>(2025);
  const [variant, setVariant] = useState("");
  const [description, setDescription] = useState("");
  const [selectorOpen, setSelectorOpen] = useState(false);
  const [selectedModule, setSelectedModule] = useState<Module | null>(null);

  // Auto-generate name
  const name = generateTestName(sectionType, testMonth, testYear, variant);

  // Fetch existing test data
  const { data: test, isLoading: testLoading } = useQuery({
    queryKey: ["bluebook-test", testId],
    queryFn: async () => {
      if (!testId) return null;
      const { data, error } = await supabase
        .from("bluebook_tests")
        .select("*")
        .eq("id", testId)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: isEditing,
  });

  // Fetch modules with questions
  const { data: modules, isLoading: modulesLoading } = useQuery({
    queryKey: ["bluebook-modules", testId],
    queryFn: async () => {
      if (!testId) return [];
      const { data, error } = await supabase
        .from("bluebook_modules")
        .select(`
          *,
          bluebook_module_questions(
            id,
            question_id,
            order_index,
            question:questions(id, question_id, question_text, subject)
          )
        `)
        .eq("test_id", testId)
        .order("section")
        .order("module_number");

      if (error) throw error;
      return data?.map((m) => ({
        ...m,
        questions: m.bluebook_module_questions || [],
      })) as Module[];
    },
    enabled: isEditing,
  });

  // Set initial values when editing
  useEffect(() => {
    if (test) {
      setSectionType((test as any).section_type || "full");
      setTestMonth((test as any).test_month || null);
      setTestYear((test as any).test_year || null);
      setVariant((test as any).variant || "");
      setDescription(test.description || "");
    }
  }, [test]);

  // Create test mutation
  const createTestMutation = useMutation({
    mutationFn: async () => {
      // Create test
      const { data: newTest, error: testError } = await supabase
        .from("bluebook_tests")
        .insert({
          name,
          description: description || null,
          is_published: false,
          section_type: sectionType,
          test_month: testMonth,
          test_year: testYear,
          variant: variant || null,
        } as any)
        .select()
        .single();

      if (testError) throw testError;

      // Create modules based on section type
      const moduleConfig = getModuleConfig(sectionType);
      const modulesToCreate = moduleConfig.map((config) => ({
        test_id: newTest.id,
        section: config.section,
        module_number: config.module_number,
        time_limit_minutes: config.time_limit,
        difficulty: "standard",
      }));

      const { error: modulesError } = await supabase
        .from("bluebook_modules")
        .insert(modulesToCreate);

      if (modulesError) throw modulesError;

      return newTest;
    },
    onSuccess: (newTest) => {
      toast.success("Test created successfully");
      navigate(`/admin/bluebook/edit/${newTest.id}`);
    },
    onError: () => {
      toast.error("Failed to create test");
    },
  });

  // Update test mutation
  const updateTestMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("bluebook_tests")
        .update({
          name,
          description: description || null,
          section_type: sectionType,
          test_month: testMonth,
          test_year: testYear,
          variant: variant || null,
          updated_at: new Date().toISOString(),
        } as any)
        .eq("id", testId!);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bluebook-test", testId] });
      toast.success("Test saved");
    },
    onError: () => {
      toast.error("Failed to save test");
    },
  });

  // Publish test mutation
  const publishMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("bluebook_tests")
        .update({
          is_published: true,
          updated_at: new Date().toISOString(),
        })
        .eq("id", testId!);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bluebook-test", testId] });
      toast.success("Test published");
    },
    onError: () => {
      toast.error("Failed to publish test");
    },
  });

  const handleSave = () => {
    if (!testMonth || !testYear) {
      toast.error("Please select month and year");
      return;
    }
    if (isEditing) {
      updateTestMutation.mutate();
    } else {
      createTestMutation.mutate();
    }
  };

  const handleOpenSelector = (module: Module) => {
    setSelectedModule(module);
    setSelectorOpen(true);
  };

  const getModuleByConfig = (section: string, moduleNumber: number) => {
    return modules?.find(
      (m) => m.section === section && m.module_number === moduleNumber
    );
  };

  const isSaving = createTestMutation.isPending || updateTestMutation.isPending;
  const moduleConfig = getModuleConfig(sectionType);

  if (isEditing && testLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
        <div className="grid grid-cols-2 gap-4">
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/admin/bluebook")}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">
              {isEditing ? "Edit Practice Test" : "Create Practice Test"}
            </h1>
            <p className="text-muted-foreground">
              {isEditing
                ? "Modify test details and manage questions"
                : "Set up a new Bluebook-style SAT test"}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleSave}
            disabled={isSaving}
            className="gap-2"
          >
            {isSaving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {isEditing ? "Save Changes" : "Create Test"}
          </Button>
          {isEditing && !test?.is_published && (
            <Button
              onClick={() => publishMutation.mutate()}
              disabled={publishMutation.isPending}
              className="gap-2"
            >
              <Eye className="h-4 w-4" />
              Publish
            </Button>
          )}
        </div>
      </div>

      {/* Test Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Test Configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Section Type */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Section Type *</Label>
              <Select value={sectionType} onValueChange={setSectionType} disabled={isEditing}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {SECTION_TYPES.map(type => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Month *</Label>
              <Select 
                value={testMonth?.toString() || ""} 
                onValueChange={(v) => setTestMonth(parseInt(v))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select month" />
                </SelectTrigger>
                <SelectContent>
                  {MONTHS.map(month => (
                    <SelectItem key={month.value} value={month.value.toString()}>
                      {month.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Year *</Label>
              <Select 
                value={testYear?.toString() || ""} 
                onValueChange={(v) => setTestYear(parseInt(v))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select year" />
                </SelectTrigger>
                <SelectContent>
                  {YEARS.map(year => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Variant</Label>
              <Input
                placeholder="e.g., A, B, v1"
                value={variant}
                onChange={(e) => setVariant(e.target.value)}
              />
            </div>
          </div>

          {/* Generated Name Preview */}
          <div className="p-3 bg-muted rounded-lg">
            <Label className="text-xs text-muted-foreground">Generated Test Name</Label>
            <p className="font-medium">{name || "Select options to generate name"}</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description (optional)</Label>
            <Textarea
              id="description"
              placeholder="Optional description for this test..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </div>
        </CardContent>
      </Card>

      {/* Modules */}
      {isEditing && (
        <>
          {/* Reading & Writing Section - Only show if applicable */}
          {(sectionType === "english" || sectionType === "full") && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-blue-600" />
                <h2 className="text-lg font-semibold">Reading & Writing Section</h2>
                <Badge variant="outline" className="ml-2">
                  <Clock className="h-3 w-3 mr-1" />
                  64 min total
                </Badge>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {moduleConfig.filter((c) => c.section === "reading_writing").map(
                  (config) => {
                    const module = getModuleByConfig(config.section, config.module_number);
                    return (
                      <BluebookModuleCard
                        key={`${config.section}-${config.module_number}`}
                        label={config.label}
                        timeLimit={config.time_limit}
                        targetQuestions={config.target}
                        currentQuestions={module?.questions?.length || 0}
                        onAddQuestions={() => module && handleOpenSelector(module)}
                        disabled={!module}
                        moduleId={module?.id}
                      />
                    );
                  }
                )}
              </div>
            </div>
          )}

          {/* Math Section - Only show if applicable */}
          {(sectionType === "math" || sectionType === "full") && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Calculator className="h-5 w-5 text-green-600" />
                <h2 className="text-lg font-semibold">Math Section</h2>
                <Badge variant="outline" className="ml-2">
                  <Clock className="h-3 w-3 mr-1" />
                  70 min total
                </Badge>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {moduleConfig.filter((c) => c.section === "math").map((config) => {
                  const module = getModuleByConfig(config.section, config.module_number);
                  return (
                    <BluebookModuleCard
                      key={`${config.section}-${config.module_number}`}
                      label={config.label}
                      timeLimit={config.time_limit}
                      targetQuestions={config.target}
                      currentQuestions={module?.questions?.length || 0}
                      onAddQuestions={() => module && handleOpenSelector(module)}
                      disabled={!module}
                      moduleId={module?.id}
                    />
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}

      {/* Question Selector Dialog */}
      {selectedModule && (
        <BluebookQuestionSelector
          open={selectorOpen}
          onOpenChange={setSelectorOpen}
          module={selectedModule}
          onQuestionsAdded={() => {
            queryClient.invalidateQueries({ queryKey: ["bluebook-modules", testId] });
          }}
        />
      )}
    </div>
  );
};

export default BluebookTestBuilder;
