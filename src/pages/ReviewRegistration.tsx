import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Loader2, CheckCircle, ArrowRight } from "lucide-react";

// Step 1: Code validation schema
const codeSchema = z.object({
  code: z
    .string()
    .min(6, "Код 6 тэмдэгттэй байх ёстой")
    .max(6, "Код 6 тэмдэгттэй байх ёстой")
    .regex(/^[A-Z0-9]+$/, "Зөвхөн том үсэг ба тоо оруулна уу"),
});

// Step 2: Registration form schema
// Generate SAT test dates for current and next year
const generateSATDates = () => {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  const satMonths = [
    { month: 2, label: "3-р сар" },
    { month: 4, label: "5-р сар" },
    { month: 5, label: "6-р сар" },
    { month: 7, label: "8-р сар" },
    { month: 8, label: "9-р сар" },
    { month: 9, label: "10-р сар" },
    { month: 10, label: "11-р сар" },
    { month: 11, label: "12-р сар" },
  ];

  const dates: { value: string; label: string }[] = [];

  [currentYear, currentYear + 1].forEach(year => {
    satMonths.forEach(({ month, label }) => {
      if (year > currentYear || (year === currentYear && month >= currentMonth)) {
        dates.push({
          value: `${year}-${String(month + 1).padStart(2, '0')}`,
          label: `${year} оны ${label}`,
        });
      }
    });
  });

  return dates;
};

const SAT_TEST_DATES = generateSATDates();

// Step 2: Registration form schema
const registrationSchema = z.object({
  firstName: z
    .string()
    .trim()
    .min(1, "Өөрийн нэрээ оруулна уу")
    .max(100, "Нэр хэт урт байна"),
  lastName: z
    .string()
    .trim()
    .min(1, "Эцэг/эхийн нэрээ (овог) оруулна уу")
    .max(100, "Овог хэт урт байна"),
  phone: z
    .string()
    .regex(/^\d{8}$/, "Утасны дугаар яг 8 оронтой байх ёстой"),
  parentPhone: z
    .string()
    .regex(/^\d{8}$/, "Эцэг/эхийн утасны дугаар яг 8 оронтой байх ёстой"),
  grade: z
    .string()
    .min(1, "Ангиа сонгоно уу"),
  schoolName: z
    .string()
    .trim()
    .min(1, "Сургуулийнхаа нэрийг оруулна уу")
    .max(200, "Сургуулийн нэр хэт урт байна"),
  mathLevel: z.enum(["bad", "average", "good"], {
    required_error: "Математикийн түвшингээ сонгоно уу",
  }),
  englishLevel: z.enum(["bad", "average", "good"], {
    required_error: "Англи хэлний түвшингээ сонгоно уу",
  }),
  teacher: z.string().min(1, "Багшаа сонгоно уу"),
  hasTakenSat: z.boolean().default(false),
  previousSatScore: z.number().min(400).max(1600).optional(),
  plannedSatDate: z.string().optional(),
});

type CodeFormData = z.infer<typeof codeSchema>;
type RegistrationFormData = z.infer<typeof registrationSchema>;

export default function ReviewRegistration() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const batchParam = searchParams.get('batch');
  const [step, setStep] = useState<"code" | "form" | "success">(batchParam ? "form" : "code");
  const [validatedCode, setValidatedCode] = useState("");
  const [isValidating, setIsValidating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitCooldown, setSubmitCooldown] = useState(false);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);
  const [teachers, setTeachers] = useState<{ id: string; name: string }[]>([]);
  const [batchInfo, setBatchInfo] = useState<{ id: string; batch_name: string | null; teacher: string | null } | null>(null);

  const codeForm = useForm<CodeFormData>({
    resolver: zodResolver(codeSchema),
    defaultValues: { code: "" },
  });

  const registrationForm = useForm<RegistrationFormData>({
    resolver: zodResolver(registrationSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      phone: "",
      parentPhone: "",
      grade: "",
      schoolName: "",
      mathLevel: undefined,
      englishLevel: undefined,
      teacher: "",
      hasTakenSat: false,
      previousSatScore: undefined,
      plannedSatDate: "",
    },
  });

  const hasTakenSat = registrationForm.watch("hasTakenSat");

  const startCooldown = (seconds: number) => {
    setSubmitCooldown(true);
    setCooldownSeconds(seconds);
    const interval = setInterval(() => {
      setCooldownSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setSubmitCooldown(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // Fetch teachers list
  useEffect(() => {
    const fetchTeachers = async () => {
      const { data, error } = await supabase
        .from("teachers")
        .select("id, name")
        .order("name");

      if (error) {
        console.error("Error fetching teachers:", error);
        return;
      }

      setTeachers(data || []);
    };

    fetchTeachers();
  }, []);

  // Fetch batch info if batch param is present
  useEffect(() => {
    if (!batchParam) return;
    (async () => {
      const { data, error } = await supabase
        .from("batches")
        .select("id, batch_name, teacher")
        .eq("id", batchParam)
        .single();
      if (error || !data) {
        toast.error("Холбоос буруу байна");
        setStep("code"); // Fall back to code flow
        return;
      }
      setBatchInfo(data);
      // Pre-fill teacher if batch has one
      if (data.teacher) {
        registrationForm.setValue("teacher", data.teacher);
      }
    })();
  }, [batchParam]);


  const handleCodeSubmit = async (data: CodeFormData) => {
    setIsValidating(true);

    try {
      const { data: codeData, error } = await supabase
        .from("registration_codes")
        .select("*")
        .eq("code", data.code.toUpperCase())
        .eq("is_active", true)
        .gt("expires_at", new Date().toISOString())
        .single();

      if (error || !codeData) {
        if (error?.code === "PGRST116") {
          toast.error("Код буруу эсвэл хүчингүй болсон байна", {
            description: "Багшаасаа шинэ код аваарай.",
          });
        } else {
          toast.error("Энэ код хүчингүй болсон байна", {
            description: "Багшаасаа шинэ код үүсгэхийг хүснэ үү.",
          });
        }
        return;
      }

      setValidatedCode(data.code.toUpperCase());
      setStep("form");
      toast.success("Код баталгаажлаа!", {
        description: "Бүртгэлээ үргэлжлүүлнэ үү.",
      });
    } catch (error) {
      console.error("Error validating code:", error);
      toast.error("Алдаа гарлаа", {
        description: "Дахин оролдоно уу.",
      });
    } finally {
      setIsValidating(false);
    }
  };

  const handleRegistrationSubmit = async (data: RegistrationFormData) => {
    // Prevent rapid double-clicks
    if (submitCooldown) {
      return;
    }
    
    setIsSubmitting(true);
    setSubmitCooldown(true);

    try {
      // Determine batch_id: from QR param or null
      const assignedBatchId = batchParam || null;

      // Check if phone number already exists (in the same batch for QR, or globally for code-based)
      if (assignedBatchId) {
        // QR flow: only block if already in THIS batch
        const { data: existingInBatch } = await supabase
          .from("students")
          .select("id")
          .eq("phone", data.phone)
          .eq("batch_id", assignedBatchId)
          .single();

        if (existingInBatch) {
          toast.warning("Та аль хэдийн бүртгэгдсэн байна! 🎉", {
            description: "Та энэ ангид бүртгэлтэй байна. Утасны дугаараараа нэвтэрнэ үү.",
            duration: 6000,
          });
          setIsSubmitting(false);
          startCooldown(5);
          return;
        }
      } else {
        // Code-based flow: block if phone exists anywhere
        const { data: existingStudent } = await supabase
          .from("students")
          .select("id, name")
          .eq("phone", data.phone)
          .single();

        if (existingStudent) {
          toast.warning("Та аль хэдийн бүртгэгдсэн байна! 🎉", {
            description: "Та манай системд бүртгэлтэй байна. Утасны дугаараараа нэвтэрнэ үү.",
            duration: 6000,
          });
          setIsSubmitting(false);
          startCooldown(5);
          return;
        }
      }

      // Generate unique link ID
      const uniqueLinkId = crypto.randomUUID().split("-")[0];

      // Use assignedBatchId from above

      // Create student record
      const { data: newStudent, error: insertError } = await supabase.from("students").insert({
        first_name: data.firstName.trim(),
        last_name: data.lastName.trim(),
        name: `${data.firstName.trim()} ${data.lastName.trim()}`,
        phone: data.phone,
        parent_phone: data.parentPhone,
        grade: data.grade,
        school_name: data.schoolName.trim(),
        math_level: data.mathLevel,
        english_level: data.englishLevel,
        review_teacher: data.teacher,
        sat_test_month: data.plannedSatDate || null,
        has_taken_sat: data.hasTakenSat,
        previous_sat_score: data.hasTakenSat ? data.previousSatScore : null,
        is_review_student: !assignedBatchId,
        unique_link_id: uniqueLinkId,
        first_session_completed: true,
        accessed: false,
        batch_id: assignedBatchId,
      }).select('id').single();

      if (insertError) {
        console.error("Error creating student:", insertError);
        toast.error("Бүртгэл амжилтгүй боллоо", {
          description: "Дахин оролдох эсвэл багштайгаа холбогдоно уу.",
        });
        return;
      }

      // Auto-create student_account if batch QR flow (so they can login immediately)
      if (assignedBatchId && newStudent) {
        await supabase.from("student_accounts").insert({
          phone_number: data.phone,
          is_active: true,
          onboarding_completed: !!data.plannedSatDate, // Mark complete if they already set SAT date
        });
      }

      // Update code usage count (only for code-based flow)
      if (validatedCode) {
        await supabase
          .from("registration_codes")
          .update({ used_count: supabase.rpc ? 1 : 1 })
          .eq("code", validatedCode);
      }

      setStep("success");
      toast.success("Бүртгэл амжилттай!", {
        description: "Одоо дасгалын порталд нэвтэрч болно.",
      });

      // Redirect after a short delay
      setTimeout(() => {
        navigate("/practice");
      }, 2000);
    } catch (error) {
      console.error("Error during registration:", error);
      toast.error("Алдаа гарлаа", {
        description: "Дахин оролдоно уу.",
      });
      // Reset cooldown on error so they can retry after a short wait
      startCooldown(5);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getLevelLabel = (level: string) => {
    switch (level) {
      case "bad":
        return "Сул";
      case "average":
        return "Дунд";
      case "good":
        return "Сайн";
      default:
        return level;
    }
  };

  if (step === "success") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="w-8 h-8 text-primary" />
            </div>
            <CardTitle className="text-2xl">Бүртгэл амжилттай!</CardTitle>
            <CardDescription>
              SAT хичээлд тавтай морил. Дасгалын порталруу шилжүүлж байна...
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">
            {batchInfo ? `${batchInfo.batch_name || 'SAT анги'}-д нэгдэх` : 'SAT бүртгэл'}
          </CardTitle>
          <CardDescription>
            {step === "code"
              ? "Багшийнхаа өгсөн кодыг оруулна уу"
              : batchInfo
                ? "Ангид нэгдэхийн тулд мэдээллээ бөглөнө үү"
                : "Дасгалын порталд нэвтрэхийн тулд бүртгэлээ бөглөнө үү"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {step === "code" ? (
            <form onSubmit={codeForm.handleSubmit(handleCodeSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="code">Нэвтрэх код</Label>
                <Input
                  id="code"
                  placeholder="6 оронтой кодыг оруулна уу"
                  className={`text-center text-2xl tracking-widest uppercase ${
                    codeForm.formState.errors.code ? "border-destructive" : ""
                  }`}
                  maxLength={6}
                  {...codeForm.register("code", {
                    onChange: (e) => {
                      e.target.value = e.target.value.toUpperCase();
                    },
                  })}
                />
                {codeForm.formState.errors.code && (
                  <p className="text-sm text-destructive">
                    {codeForm.formState.errors.code.message}
                  </p>
                )}
              </div>
              <Button type="submit" className="w-full" disabled={isValidating}>
                {isValidating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Шалгаж байна...
                  </>
                ) : (
                  <>
                    Үргэлжлүүлэх
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </form>
          ) : (
            <form
              onSubmit={registrationForm.handleSubmit(handleRegistrationSubmit)}
              className="space-y-4"
            >
              {/* First Name */}
              <div className="space-y-2">
                <Label htmlFor="firstName">Өөрийн нэр <span className="text-muted-foreground font-normal">(First Name)</span></Label>
                <p className="text-xs text-muted-foreground">Жишээ: <span className="font-medium">Сараа</span> — паспорт дээрх өөрийн нэр</p>
                <Input
                  id="firstName"
                  placeholder="Өөрийн нэрээ оруулна уу"
                  className={
                    registrationForm.formState.errors.firstName
                      ? "border-destructive"
                      : ""
                  }
                  {...registrationForm.register("firstName")}
                />
                {registrationForm.formState.errors.firstName && (
                  <p className="text-sm text-destructive">
                    {registrationForm.formState.errors.firstName.message}
                  </p>
                )}
              </div>

              {/* Last Name */}
              <div className="space-y-2">
                <Label htmlFor="lastName">Овог <span className="text-muted-foreground font-normal">(Last Name)</span></Label>
                <p className="text-xs text-muted-foreground">Жишээ: <span className="font-medium">Болдын</span> — эцгийн нэр</p>
                <Input
                  id="lastName"
                  placeholder="Эцэг/эхийн нэрээ оруулна уу"
                  className={
                    registrationForm.formState.errors.lastName
                      ? "border-destructive"
                      : ""
                  }
                  {...registrationForm.register("lastName")}
                />
                {registrationForm.formState.errors.lastName && (
                  <p className="text-sm text-destructive">
                    {registrationForm.formState.errors.lastName.message}
                  </p>
                )}
              </div>

              {/* Phone */}
              <div className="space-y-2">
                <Label htmlFor="phone">Утасны дугаар <span className="text-muted-foreground font-normal">(Phone)</span></Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="99112233"
                  maxLength={8}
                  className={
                    registrationForm.formState.errors.phone
                      ? "border-destructive"
                      : ""
                  }
                  {...registrationForm.register("phone")}
                />
                {registrationForm.formState.errors.phone && (
                  <p className="text-sm text-destructive">
                    {registrationForm.formState.errors.phone.message}
                  </p>
                )}
              </div>

              {/* Parent Phone */}
              <div className="space-y-2">
                <Label htmlFor="parentPhone">Эцэг/эхийн утасны дугаар <span className="text-muted-foreground font-normal">(Parent's Phone)</span></Label>
                <Input
                  id="parentPhone"
                  type="tel"
                  placeholder="99887766"
                  maxLength={8}
                  className={
                    registrationForm.formState.errors.parentPhone
                      ? "border-destructive"
                      : ""
                  }
                  {...registrationForm.register("parentPhone")}
                />
                {registrationForm.formState.errors.parentPhone && (
                  <p className="text-sm text-destructive">
                    {registrationForm.formState.errors.parentPhone.message}
                  </p>
                )}
              </div>

              {/* Grade */}
              <div className="space-y-2">
                <Label>Анги <span className="text-muted-foreground font-normal">(Grade)</span></Label>
                <Select
                  onValueChange={(value) => registrationForm.setValue("grade", value)}
                >
                  <SelectTrigger
                    className={
                      registrationForm.formState.errors.grade
                        ? "border-destructive"
                        : ""
                    }
                  >
                    <SelectValue placeholder="Ангиа сонгоно уу..." />
                  </SelectTrigger>
                  <SelectContent>
                    {["8", "9", "10", "11", "12"].map((g) => (
                      <SelectItem key={g} value={g}>
                        {g}-р анги
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {registrationForm.formState.errors.grade && (
                  <p className="text-sm text-destructive">
                    {registrationForm.formState.errors.grade.message}
                  </p>
                )}
              </div>

              {/* School Name */}
              <div className="space-y-2">
                <Label htmlFor="schoolName">Сургуулийн нэр <span className="text-muted-foreground font-normal">(School)</span></Label>
                <Input
                  id="schoolName"
                  placeholder="Сургуулийнхаа нэрийг бичнэ үү"
                  className={
                    registrationForm.formState.errors.schoolName
                      ? "border-destructive"
                      : ""
                  }
                  {...registrationForm.register("schoolName")}
                />
                {registrationForm.formState.errors.schoolName && (
                  <p className="text-sm text-destructive">
                    {registrationForm.formState.errors.schoolName.message}
                  </p>
                )}
              </div>

              {/* Math Level */}
              <div className="space-y-2">
                <Label>Математикийн түвшин <span className="text-muted-foreground font-normal">(Math Level)</span></Label>
                <RadioGroup
                  onValueChange={(value) =>
                    registrationForm.setValue("mathLevel", value as "bad" | "average" | "good")
                  }
                  className={`flex gap-4 ${
                    registrationForm.formState.errors.mathLevel
                      ? "border border-destructive rounded-md p-2"
                      : ""
                  }`}
                >
                  {["bad", "average", "good"].map((level) => (
                    <div key={level} className="flex items-center space-x-2">
                      <RadioGroupItem value={level} id={`math-${level}`} />
                      <Label htmlFor={`math-${level}`} className="cursor-pointer">
                        {getLevelLabel(level)}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
                {registrationForm.formState.errors.mathLevel && (
                  <p className="text-sm text-destructive">
                    {registrationForm.formState.errors.mathLevel.message}
                  </p>
                )}
              </div>

              {/* English Level */}
              <div className="space-y-2">
                <Label>Англи хэлний түвшин <span className="text-muted-foreground font-normal">(English Level)</span></Label>
                <RadioGroup
                  onValueChange={(value) =>
                    registrationForm.setValue("englishLevel", value as "bad" | "average" | "good")
                  }
                  className={`flex gap-4 ${
                    registrationForm.formState.errors.englishLevel
                      ? "border border-destructive rounded-md p-2"
                      : ""
                  }`}
                >
                  {["bad", "average", "good"].map((level) => (
                    <div key={level} className="flex items-center space-x-2">
                      <RadioGroupItem value={level} id={`english-${level}`} />
                      <Label htmlFor={`english-${level}`} className="cursor-pointer">
                        {getLevelLabel(level)}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
                {registrationForm.formState.errors.englishLevel && (
                  <p className="text-sm text-destructive">
                    {registrationForm.formState.errors.englishLevel.message}
                  </p>
                )}
              </div>

              {/* Teacher Selection - hidden when auto-set from QR/batch link */}
              {batchInfo?.teacher ? (
                <div className="space-y-2">
                  <Label>Багш <span className="text-muted-foreground font-normal">(Teacher)</span></Label>
                  <div className="flex items-center gap-2 rounded-md border bg-muted/50 px-3 py-2 text-sm">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span>{batchInfo.teacher}</span>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <Label>Багшийн анги сонгох <span className="text-muted-foreground font-normal">(Teacher's Class)</span></Label>
                  <Select
                    onValueChange={(value) => registrationForm.setValue("teacher", value)}
                  >
                    <SelectTrigger
                      className={
                        registrationForm.formState.errors.teacher
                          ? "border-destructive"
                          : ""
                      }
                    >
                      <SelectValue placeholder="Багш сонгоно уу..." />
                    </SelectTrigger>
                    <SelectContent>
                      {teachers.map((teacher) => (
                        <SelectItem key={teacher.id} value={teacher.name}>
                          {teacher.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {registrationForm.formState.errors.teacher && (
                    <p className="text-sm text-destructive">
                      {registrationForm.formState.errors.teacher.message}
                    </p>
                  )}
                </div>
              )}

              {/* SAT Experience */}
              <div className="space-y-2">
                <Label>Та өмнө нь SAT шалгалт өгч үзсэн үү? <span className="text-muted-foreground font-normal">(Taken SAT before?)</span></Label>
                <RadioGroup
                  defaultValue="no"
                  onValueChange={(value) => registrationForm.setValue("hasTakenSat", value === "yes")}
                  className="flex gap-4"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="no" id="sat-no" />
                    <Label htmlFor="sat-no" className="cursor-pointer">Үгүй</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="yes" id="sat-yes" />
                    <Label htmlFor="sat-yes" className="cursor-pointer">Тийм</Label>
                  </div>
                </RadioGroup>
              </div>

              {/* Previous SAT Score (conditional) */}
              {hasTakenSat && (
                <div className="space-y-2">
                  <Label htmlFor="previousScore">Previous SAT Score</Label>
                  <Input
                    id="previousScore"
                    type="number"
                    placeholder="e.g. 1200"
                    min={400}
                    max={1600}
                    className={
                      registrationForm.formState.errors.previousSatScore
                        ? "border-destructive"
                        : ""
                    }
                    onChange={(e) => {
                      const val = parseInt(e.target.value);
                      if (!isNaN(val)) {
                        registrationForm.setValue("previousSatScore", val);
                      }
                    }}
                  />
                  {registrationForm.formState.errors.previousSatScore && (
                    <p className="text-sm text-destructive">
                      Score must be between 400-1600
                    </p>
                  )}
                </div>
              )}

              {/* Planned SAT Date */}
              <div className="space-y-2">
                <Label>When are you planning to take the SAT?</Label>
                <Select
                  onValueChange={(value) => registrationForm.setValue("plannedSatDate", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select date..." />
                  </SelectTrigger>
                  <SelectContent>
                    {SAT_TEST_DATES.map((date) => (
                      <SelectItem key={date.value} value={date.value}>
                        {date.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button type="submit" className="w-full" disabled={isSubmitting || submitCooldown}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Registering...
                  </>
                ) : submitCooldown ? (
                  `Please wait... (${cooldownSeconds}s)`
                ) : (
                  "Register"
                )}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
