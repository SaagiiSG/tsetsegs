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
    .min(6, "Code must be 6 characters")
    .max(6, "Code must be 6 characters")
    .regex(/^[A-Z0-9]+$/, "Code must be uppercase letters and numbers only"),
});

// Step 2: Registration form schema
const SAT_TEST_MONTHS = [
  { value: "march", label: "March" },
  { value: "may", label: "May" },
  { value: "june", label: "June" },
  { value: "august", label: "August" },
  { value: "sep", label: "September" },
  { value: "oct", label: "October" },
  { value: "nov", label: "November" },
  { value: "dec", label: "December" },
] as const;

// Step 2: Registration form schema
const registrationSchema = z.object({
  firstName: z
    .string()
    .trim()
    .min(1, "Please enter your first name")
    .max(100, "First name is too long"),
  lastName: z
    .string()
    .trim()
    .min(1, "Please enter your last name")
    .max(100, "Last name is too long"),
  phone: z
    .string()
    .regex(/^\d{8}$/, "Phone number must be exactly 8 digits"),
  parentPhone: z
    .string()
    .regex(/^\d{8}$/, "Parent's phone number must be exactly 8 digits"),
  mathLevel: z.enum(["bad", "average", "good"], {
    required_error: "Please select your math level",
  }),
  englishLevel: z.enum(["bad", "average", "good"], {
    required_error: "Please select your English level",
  }),
  teacher: z.string().min(1, "Please select a teacher"),
  satTestMonth: z.string().optional(),
});

type CodeFormData = z.infer<typeof codeSchema>;
type RegistrationFormData = z.infer<typeof registrationSchema>;

export default function ReviewRegistration() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [step, setStep] = useState<"code" | "form" | "success">("code");
  const [validatedCode, setValidatedCode] = useState("");
  const [isValidating, setIsValidating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [teachers, setTeachers] = useState<{ id: string; name: string }[]>([]);

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
      mathLevel: undefined,
      englishLevel: undefined,
      teacher: "",
      satTestMonth: "",
    },
  });

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
          toast.error("Invalid or expired code", {
            description: "Please ask your teacher for a new code.",
          });
        } else {
          toast.error("This code has expired", {
            description: "Please ask your teacher to generate a new code.",
          });
        }
        return;
      }

      setValidatedCode(data.code.toUpperCase());
      setStep("form");
      toast.success("Code verified!", {
        description: "Please complete your registration.",
      });
    } catch (error) {
      console.error("Error validating code:", error);
      toast.error("Something went wrong", {
        description: "Please try again.",
      });
    } finally {
      setIsValidating(false);
    }
  };

  const handleRegistrationSubmit = async (data: RegistrationFormData) => {
    setIsSubmitting(true);

    try {
      // Check if phone number already exists
      const { data: existingStudent } = await supabase
        .from("students")
        .select("id")
        .eq("phone", data.phone)
        .single();

      if (existingStudent) {
        toast.error("Phone number already registered", {
          description: "This phone number is already in use. You can log in to the practice portal directly.",
        });
        setIsSubmitting(false);
        return;
      }

      // Generate unique link ID
      const uniqueLinkId = crypto.randomUUID().split("-")[0];

      // Create student record
      const { error: insertError } = await supabase.from("students").insert({
        first_name: data.firstName.trim(),
        last_name: data.lastName.trim(),
        name: `${data.firstName.trim()} ${data.lastName.trim()}`,
        phone: data.phone,
        parent_phone: data.parentPhone,
        math_level: data.mathLevel,
        english_level: data.englishLevel,
        review_teacher: data.teacher,
        sat_test_month: data.satTestMonth || null,
        is_review_student: true,
        unique_link_id: uniqueLinkId,
        first_session_completed: true,
        accessed: false,
        batch_id: null,
      });

      if (insertError) {
        console.error("Error creating student:", insertError);
        toast.error("Registration failed", {
          description: "Please try again or contact support.",
        });
        return;
      }

      // Update code usage count
      await supabase
        .from("registration_codes")
        .update({ used_count: supabase.rpc ? 1 : 1 })
        .eq("code", validatedCode);

      setStep("success");
      toast.success("Registration complete!", {
        description: "You can now access the practice portal.",
      });

      // Redirect after a short delay
      setTimeout(() => {
        navigate("/practice");
      }, 2000);
    } catch (error) {
      console.error("Error during registration:", error);
      toast.error("Something went wrong", {
        description: "Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getLevelLabel = (level: string) => {
    switch (level) {
      case "bad":
        return "Weak";
      case "average":
        return "Average";
      case "good":
        return "Strong";
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
            <CardTitle className="text-2xl">Registration Complete!</CardTitle>
            <CardDescription>
              Welcome to the SAT Review Program. Redirecting you to the practice portal...
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
          <CardTitle className="text-2xl">SAT Review Registration</CardTitle>
          <CardDescription>
            {step === "code"
              ? "Enter the code shown by your teacher to continue"
              : "Complete your registration to access the practice portal"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {step === "code" ? (
            <form onSubmit={codeForm.handleSubmit(handleCodeSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="code">Access Code</Label>
                <Input
                  id="code"
                  placeholder="Enter 6-character code"
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
                    Verifying...
                  </>
                ) : (
                  <>
                    Continue
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
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  id="firstName"
                  placeholder="Enter your first name"
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
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  placeholder="Enter your last name"
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
                <Label htmlFor="phone">Phone Number</Label>
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
                <Label htmlFor="parentPhone">Parent's Phone Number</Label>
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

              {/* Math Level */}
              <div className="space-y-2">
                <Label>Math Level</Label>
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
                <Label>English Level</Label>
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

              {/* Teacher Selection */}
              <div className="space-y-2">
                <Label>Select Teacher's Class</Label>
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
                    <SelectValue placeholder="Choose a teacher..." />
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

              {/* SAT Test Month (Optional) */}
              <div className="space-y-2">
                <Label>When are you taking the SAT? (Optional)</Label>
                <Select
                  onValueChange={(value) => registrationForm.setValue("satTestMonth", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select month..." />
                  </SelectTrigger>
                  <SelectContent>
                    {SAT_TEST_MONTHS.map((month) => (
                      <SelectItem key={month.value} value={month.value}>
                        {month.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Registering...
                  </>
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
