import { useState, useCallback, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { X, ArrowLeft, ArrowRight, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const createFormSchema = (courseType: 'SAT' | 'IELTS') => {
  const baseSchema = {
    phone: z.string().min(8, "Phone must be 8 digits").max(8, "Phone must be 8 digits"),
    parent_phone: z.string().min(8, "Phone must be 8 digits").max(8, "Phone must be 8 digits"),
    last_name: z.string().min(1, "Last name is required"),
    grade: z.string().min(1, "Grade is required"),
    school_name: z.string().min(1, "School name is required"),
  };

  if (courseType === 'SAT') {
    return z.object({
      ...baseSchema,
      math_level: z.enum(['bad', 'average', 'good'], { 
        required_error: "Math level is required",
        invalid_type_error: "Please select a math level" 
      }),
      english_level: z.enum(['bad', 'average', 'good'], { 
        required_error: "English level is required",
        invalid_type_error: "Please select an English level" 
      }),
    });
  } else {
    // IELTS: no math_level, english_level uses CEFR levels
    return z.object({
      ...baseSchema,
      english_level: z.enum(['B1', 'B2', 'C1', 'C2'], { 
        required_error: "English level is required",
        invalid_type_error: "Please select an English level" 
      }),
    });
  }
};

interface Student {
  id: string;
  name?: string;
  first_name: string;
  last_name: string | null;
  phone: string;
  parent_phone?: string;
  grade?: string;
  school_name?: string;
  math_level?: 'bad' | 'average' | 'good' | string;
  english_level?: 'bad' | 'average' | 'good' | 'B1' | 'B2' | 'C1' | 'C2' | string;
  first_session_completed?: boolean;
}

interface BatchFirstSessionIntakeProps {
  students: Student[];
  courseType: 'SAT' | 'IELTS';
  onClose: () => void;
  onSubmit: (studentId: string, data: any) => Promise<void>;
}

export function BatchFirstSessionIntake({ students, courseType, onClose, onSubmit }: BatchFirstSessionIntakeProps) {
  const { toast } = useToast();
  const incompleteStudents = students.filter(s => !s.first_session_completed);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [completedStudents, setCompletedStudents] = useState<Set<string>>(new Set());
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Store form data for each student to preserve changes when switching
  const [formDataCache, setFormDataCache] = useState<Map<string, Partial<any>>>(new Map());

  const currentStudent = incompleteStudents[currentIndex];

  const formSchema = createFormSchema(courseType);
  type FormData = z.infer<typeof formSchema>;

  const getValidEnglishLevel = (level: string | undefined, course: 'SAT' | 'IELTS') => {
    if (!level) return undefined;
    const satLevels = ['bad', 'average', 'good'];
    const ieltsLevels = ['B1', 'B2', 'C1', 'C2'];
    
    if (course === 'SAT') {
      return satLevels.includes(level) ? level : undefined;
    } else {
      return ieltsLevels.includes(level) ? level : undefined;
    }
  };

  const getDefaultValues = () => {
    const validEnglishLevel = getValidEnglishLevel(currentStudent?.english_level, courseType);
    
    const base = {
      phone: currentStudent?.phone || "",
      parent_phone: currentStudent?.parent_phone || "",
      last_name: currentStudent?.last_name || "",
      grade: currentStudent?.grade || "",
      school_name: currentStudent?.school_name || "",
      english_level: validEnglishLevel,
    };
    
    if (courseType === 'SAT') {
      return {
        ...base,
        math_level: currentStudent?.math_level || undefined,
      };
    }
    return base;
  };

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
    setValue,
    watch,
    reset,
    getValues,
  } = useForm<any>({
    resolver: zodResolver(formSchema),
    defaultValues: getDefaultValues(),
  });

  const mathLevel = courseType === 'SAT' ? watch("math_level") : undefined;
  const englishLevel = watch("english_level");

  // Auto-save current form data to cache when navigating
  const saveToCache = useCallback(() => {
    if (currentStudent && isDirty) {
      const currentData = getValues();
      setFormDataCache(prev => new Map(prev).set(currentStudent.id, currentData));
    }
  }, [currentStudent, isDirty, getValues]);

  // Load student data from cache or database when currentIndex changes
  useEffect(() => {
    const student = incompleteStudents[currentIndex];
    if (!student) return;

    // Check if we have cached data for this student
    const cachedData = formDataCache.get(student.id);
    
    if (cachedData) {
      // Load from cache
      reset(cachedData);
    } else {
      // Load from student object with validated english_level
      const validEnglishLevel = getValidEnglishLevel(student.english_level, courseType);
      
      const baseData = {
        phone: student.phone || "",
        parent_phone: student.parent_phone || "",
        last_name: student.last_name || "",
        grade: student.grade || "",
        school_name: student.school_name || "",
        english_level: validEnglishLevel,
      };
      
      if (courseType === 'SAT') {
        reset({
          ...baseData,
          math_level: student.math_level || undefined,
        });
      } else {
        reset(baseData);
      }
    }
  }, [currentIndex, courseType]); // Only depend on currentIndex and courseType

  const navigateToStudent = useCallback((index: number) => {
    if (index >= 0 && index < incompleteStudents.length) {
      // Auto-save current form data before navigating
      saveToCache();
      setCurrentIndex(index);
    }
  }, [incompleteStudents.length, saveToCache]);

  const handlePrevious = useCallback(() => {
    navigateToStudent(currentIndex - 1);
  }, [currentIndex, navigateToStudent]);

  const handleNext = useCallback(() => {
    navigateToStudent(currentIndex + 1);
  }, [currentIndex, navigateToStudent]);

  const onSubmitForm = async (data: any) => {
    setIsSubmitting(true);
    try {
      await onSubmit(currentStudent.id, data);
      setCompletedStudents(prev => new Set(prev).add(currentStudent.id));
      
      // Remove from cache after successful save
      setFormDataCache(prev => {
        const newCache = new Map(prev);
        newCache.delete(currentStudent.id);
        return newCache;
      });
      
      toast({
        title: "Saved",
        description: `${(currentStudent.first_name && currentStudent.first_name.trim()) ? currentStudent.first_name : currentStudent.name || "Student"}'s information saved successfully`,
      });
    } catch (error) {
      console.error("Error submitting form:", error);
      toast({
        title: "Error",
        description: "Failed to save student information",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (incompleteStudents.length === 0) {
    return (
      <div className="fixed inset-0 bg-background z-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-6 text-center">
          <Check className="h-12 w-12 text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-semibold mb-2">All Done!</h2>
          <p className="text-muted-foreground mb-6">
            All students have completed their first session intake.
          </p>
          <Button onClick={onClose} className="w-full">Close</Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-background z-50 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="border-b bg-card px-3 md:px-4 py-2 md:py-3 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2 md:gap-3">
          <h2 className="text-base md:text-lg font-semibold">First Session Intake</h2>
          <span className="text-xs md:text-sm text-muted-foreground">
            {currentIndex + 1} / {incompleteStudents.length}
          </span>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-5 w-5" />
        </Button>
      </div>

      {/* Progress Bar */}
      <div className="h-1 bg-muted">
        <div 
          className="h-full bg-primary transition-all duration-300"
          style={{ width: `${((currentIndex + 1) / incompleteStudents.length) * 100}%` }}
        />
      </div>

      {/* Student List - Horizontal Scroll */}
      <div className="border-b bg-card px-3 md:px-4 py-1.5 md:py-2 overflow-x-auto flex-shrink-0">
        <div className="flex gap-1.5 md:gap-2 min-w-max">
          {incompleteStudents.map((student, index) => {
            const displayName = (student.first_name && student.first_name.trim()) 
              ? student.first_name 
              : student.name || 'Unknown';
            
            return (
              <button
                key={student.id}
                onClick={() => navigateToStudent(index)}
                className={`px-2.5 md:px-3 py-1.5 rounded-lg text-xs md:text-sm whitespace-nowrap transition-colors ${
                  index === currentIndex
                    ? "bg-primary text-primary-foreground"
                    : completedStudents.has(student.id)
                    ? "bg-green-500/10 text-green-600"
                    : "bg-muted hover:bg-muted/80"
                }`}
              >
                {completedStudents.has(student.id) && <Check className="h-3 w-3 inline mr-1" />}
                {displayName}
              </button>
            );
          })}
        </div>
      </div>

      {/* Single Form Outside Carousel */}
      <div className="flex-1 overflow-hidden min-h-0 flex flex-col">
        {/* Student Name Header */}
        <div className="px-3 md:px-4 py-3 border-b flex-shrink-0">
          <h3 className="text-xl md:text-2xl font-semibold text-center">
            {(currentStudent.first_name && currentStudent.first_name.trim()) 
              ? `${currentStudent.first_name} ${currentStudent.last_name || ""}`
              : currentStudent.name || "Unknown"}
          </h3>
        </div>

        {/* Form Content */}
        <div className="flex-1 overflow-y-auto p-3 md:p-4 lg:p-6">
          <div className="max-w-2xl mx-auto">
            <form onSubmit={handleSubmit(onSubmitForm)} className="space-y-4 md:space-y-6">
              {/* Phone */}
              <div className="space-y-2">
                <Label htmlFor="phone">Student Phone (8 digits)</Label>
                <Input
                  id="phone"
                  {...register("phone")}
                  placeholder="99112233"
                  maxLength={8}
                  autoComplete="off"
                />
                {errors.phone && (
                  <p className="text-sm text-destructive">{errors.phone.message?.toString()}</p>
                )}
              </div>

              {/* Parent Phone */}
              <div className="space-y-2">
                <Label htmlFor="parent_phone">Parent Phone (8 digits)</Label>
                <Input
                  id="parent_phone"
                  {...register("parent_phone")}
                  placeholder="88776655"
                  maxLength={8}
                  autoComplete="off"
                />
                {errors.parent_phone && (
                  <p className="text-sm text-destructive">{errors.parent_phone.message?.toString()}</p>
                )}
              </div>

              {/* Last Name */}
              <div className="space-y-2">
                <Label htmlFor="last_name">Last Name</Label>
                <Input
                  id="last_name"
                  {...register("last_name")}
                  placeholder="Enter last name"
                  autoComplete="off"
                />
                {errors.last_name && (
                  <p className="text-sm text-destructive">{errors.last_name.message?.toString()}</p>
                )}
              </div>

              {/* Grade */}
              <div className="space-y-2">
                <Label htmlFor="grade">Grade</Label>
                <Input
                  id="grade"
                  {...register("grade")}
                  placeholder="e.g., 10th grade, 11th grade"
                  autoComplete="off"
                />
                {errors.grade && (
                  <p className="text-sm text-destructive">{errors.grade.message?.toString()}</p>
                )}
              </div>

              {/* School Name */}
              <div className="space-y-2">
                <Label htmlFor="school_name">School Name</Label>
                <Input
                  id="school_name"
                  {...register("school_name")}
                  placeholder="Enter school name"
                  autoComplete="off"
                />
                {errors.school_name && (
                  <p className="text-sm text-destructive">{errors.school_name.message?.toString()}</p>
                )}
              </div>

              {/* Math Level - SAT Only */}
              {courseType === 'SAT' && (
                <div className="space-y-3">
                  <Label>Math Level</Label>
                  <RadioGroup value={mathLevel || ""} onValueChange={(value) => setValue("math_level", value, { shouldValidate: true, shouldDirty: true })}>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="bad" id="math-bad" />
                      <Label htmlFor="math-bad" className="cursor-pointer">Bad</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="average" id="math-average" />
                      <Label htmlFor="math-average" className="cursor-pointer">Average</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="good" id="math-good" />
                      <Label htmlFor="math-good" className="cursor-pointer">Good</Label>
                    </div>
                  </RadioGroup>
                  {errors.math_level && (
                    <p className="text-sm text-destructive">{errors.math_level.message?.toString()}</p>
                  )}
                </div>
              )}

              {/* English Level */}
              <div className="space-y-3">
                <Label>English Level</Label>
                {courseType === 'SAT' ? (
                  <RadioGroup value={englishLevel || ""} onValueChange={(value) => setValue("english_level", value, { shouldValidate: true, shouldDirty: true })}>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="bad" id="english-bad" />
                      <Label htmlFor="english-bad" className="cursor-pointer">Bad</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="average" id="english-average" />
                      <Label htmlFor="english-average" className="cursor-pointer">Average</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="good" id="english-good" />
                      <Label htmlFor="english-good" className="cursor-pointer">Good</Label>
                    </div>
                  </RadioGroup>
                ) : (
                  <RadioGroup value={englishLevel || ""} onValueChange={(value) => setValue("english_level", value, { shouldValidate: true, shouldDirty: true })}>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="B1" id="english-b1" />
                      <Label htmlFor="english-b1" className="cursor-pointer">B1</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="B2" id="english-b2" />
                      <Label htmlFor="english-b2" className="cursor-pointer">B2</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="C1" id="english-c1" />
                      <Label htmlFor="english-c1" className="cursor-pointer">C1</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="C2" id="english-c2" />
                      <Label htmlFor="english-c2" className="cursor-pointer">C2</Label>
                    </div>
                  </RadioGroup>
                )}
                {errors.english_level && (
                  <p className="text-sm text-destructive">{errors.english_level.message?.toString()}</p>
                )}
              </div>

              {/* Submit Button */}
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? "Saving..." : "Save"}
              </Button>
            </form>
          </div>
        </div>
      </div>

      {/* Navigation Footer */}
      <div className="border-t bg-card px-3 md:px-4 py-2 md:py-3 flex items-center justify-between flex-shrink-0">
        <Button
          size="sm"
          variant="outline"
          onClick={handlePrevious}
          disabled={currentIndex === 0}
        >
          <ArrowLeft className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" />
          <span className="hidden sm:inline">Previous</span>
          <span className="sm:hidden">Prev</span>
        </Button>
        
        <div className="text-xs md:text-sm text-muted-foreground">
          {completedStudents.size} / {incompleteStudents.length} completed
        </div>

        <Button
          size="sm"
          variant="outline"
          onClick={handleNext}
          disabled={currentIndex === incompleteStudents.length - 1}
        >
          <span className="hidden sm:inline">Next</span>
          <span className="sm:hidden">Next</span>
          <ArrowRight className="h-3 w-3 md:h-4 md:w-4 ml-1 md:ml-2" />
        </Button>
      </div>
    </div>
  );
}
