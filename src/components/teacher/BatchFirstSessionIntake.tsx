import { useState, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { X, ArrowLeft, ArrowRight, Check } from "lucide-react";
import useEmblaCarousel from "embla-carousel-react";

const formSchema = z.object({
  phone: z.string().min(8, "Phone must be 8 digits").max(8, "Phone must be 8 digits"),
  parent_phone: z.string().min(8, "Phone must be 8 digits").max(8, "Phone must be 8 digits"),
  last_name: z.string().min(1, "Last name is required"),
  math_level: z.enum(['bad', 'average', 'good']),
  english_level: z.enum(['bad', 'average', 'good']),
});

type FormData = z.infer<typeof formSchema>;

interface Student {
  id: string;
  first_name: string;
  last_name: string | null;
  phone: string;
  parent_phone?: string;
  math_level?: 'bad' | 'average' | 'good';
  english_level?: 'bad' | 'average' | 'good';
  first_session_completed?: boolean;
}

interface BatchFirstSessionIntakeProps {
  students: Student[];
  onClose: () => void;
  onSubmit: (studentId: string, data: FormData) => Promise<void>;
}

export function BatchFirstSessionIntake({ students, onClose, onSubmit }: BatchFirstSessionIntakeProps) {
  const incompleteStudents = students.filter(s => !s.first_session_completed);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [completedStudents, setCompletedStudents] = useState<Set<string>>(new Set());
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [emblaRef, emblaApi] = useEmblaCarousel({ 
    loop: false,
    skipSnaps: false,
    duration: 20,
  });

  const currentStudent = incompleteStudents[currentIndex];

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    reset,
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      phone: currentStudent?.phone || "",
      parent_phone: currentStudent?.parent_phone || "",
      last_name: currentStudent?.last_name || "",
      math_level: currentStudent?.math_level || undefined,
      english_level: currentStudent?.english_level || undefined,
    },
  });

  const mathLevel = watch("math_level");
  const englishLevel = watch("english_level");

  const handlePrevious = useCallback(() => {
    if (currentIndex > 0) {
      const newIndex = currentIndex - 1;
      setCurrentIndex(newIndex);
      if (emblaApi) emblaApi.scrollTo(newIndex);
      
      // Reset form with previous student's data
      const prevStudent = incompleteStudents[newIndex];
      reset({
        phone: prevStudent.phone || "",
        parent_phone: prevStudent.parent_phone || "",
        last_name: prevStudent.last_name || "",
        math_level: prevStudent.math_level || undefined,
        english_level: prevStudent.english_level || undefined,
      });
    }
  }, [currentIndex, emblaApi, incompleteStudents, reset]);

  const handleNext = useCallback(() => {
    if (currentIndex < incompleteStudents.length - 1) {
      const newIndex = currentIndex + 1;
      setCurrentIndex(newIndex);
      if (emblaApi) emblaApi.scrollTo(newIndex);
      
      // Reset form with next student's data
      const nextStudent = incompleteStudents[newIndex];
      reset({
        phone: nextStudent.phone || "",
        parent_phone: nextStudent.parent_phone || "",
        last_name: nextStudent.last_name || "",
        math_level: nextStudent.math_level || undefined,
        english_level: nextStudent.english_level || undefined,
      });
    }
  }, [currentIndex, emblaApi, incompleteStudents, reset]);

  const onSubmitForm = async (data: FormData) => {
    setIsSubmitting(true);
    try {
      await onSubmit(currentStudent.id, data);
      setCompletedStudents(prev => new Set(prev).add(currentStudent.id));
      
      // Move to next student if available
      if (currentIndex < incompleteStudents.length - 1) {
        handleNext();
      }
    } catch (error) {
      console.error("Error submitting form:", error);
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
    <div className="fixed inset-0 bg-background z-50 flex flex-col">
      {/* Header */}
      <div className="border-b bg-card px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold">First Session Intake</h2>
          <span className="text-sm text-muted-foreground">
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
      <div className="border-b bg-card px-4 py-2 overflow-x-auto">
        <div className="flex gap-2 min-w-max">
          {incompleteStudents.map((student, index) => (
            <button
              key={student.id}
              onClick={() => {
                setCurrentIndex(index);
                if (emblaApi) emblaApi.scrollTo(index);
                reset({
                  phone: student.phone || "",
                  parent_phone: student.parent_phone || "",
                  last_name: student.last_name || "",
                  math_level: student.math_level || undefined,
                  english_level: student.english_level || undefined,
                });
              }}
              className={`px-3 py-1.5 rounded-lg text-sm whitespace-nowrap transition-colors ${
                index === currentIndex
                  ? "bg-primary text-primary-foreground"
                  : completedStudents.has(student.id)
                  ? "bg-green-500/10 text-green-600"
                  : "bg-muted hover:bg-muted/80"
              }`}
            >
              {completedStudents.has(student.id) && <Check className="h-3 w-3 inline mr-1" />}
              {student.first_name}
            </button>
          ))}
        </div>
      </div>

      {/* Form Carousel */}
      <div className="flex-1 overflow-hidden" ref={emblaRef}>
        <div className="flex h-full">
          {incompleteStudents.map((student) => (
            <div key={student.id} className="flex-[0_0_100%] min-w-0 p-6 overflow-y-auto">
              <div className="max-w-2xl mx-auto">
                <h3 className="text-2xl font-semibold mb-6">
                  {student.first_name} {student.last_name || ""}
                </h3>

                <form onSubmit={handleSubmit(onSubmitForm)} className="space-y-6">
                  {/* Phone */}
                  <div className="space-y-2">
                    <Label htmlFor="phone">Student Phone (8 digits)</Label>
                    <Input
                      id="phone"
                      {...register("phone")}
                      placeholder="99112233"
                      maxLength={8}
                    />
                    {errors.phone && (
                      <p className="text-sm text-destructive">{errors.phone.message}</p>
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
                    />
                    {errors.parent_phone && (
                      <p className="text-sm text-destructive">{errors.parent_phone.message}</p>
                    )}
                  </div>

                  {/* Last Name */}
                  <div className="space-y-2">
                    <Label htmlFor="last_name">Last Name</Label>
                    <Input
                      id="last_name"
                      {...register("last_name")}
                      placeholder="Enter last name"
                    />
                    {errors.last_name && (
                      <p className="text-sm text-destructive">{errors.last_name.message}</p>
                    )}
                  </div>

                  {/* Math Level */}
                  <div className="space-y-3">
                    <Label>Math Level</Label>
                    <RadioGroup value={mathLevel} onValueChange={(value) => setValue("math_level", value as any)}>
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
                      <p className="text-sm text-destructive">{errors.math_level.message}</p>
                    )}
                  </div>

                  {/* English Level */}
                  <div className="space-y-3">
                    <Label>English Level</Label>
                    <RadioGroup value={englishLevel} onValueChange={(value) => setValue("english_level", value as any)}>
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
                    {errors.english_level && (
                      <p className="text-sm text-destructive">{errors.english_level.message}</p>
                    )}
                  </div>

                  {/* Submit Button */}
                  <Button type="submit" className="w-full" disabled={isSubmitting}>
                    {isSubmitting ? "Saving..." : "Save & Next"}
                  </Button>
                </form>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Navigation Footer */}
      <div className="border-t bg-card px-4 py-3 flex items-center justify-between">
        <Button
          variant="outline"
          onClick={handlePrevious}
          disabled={currentIndex === 0}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Previous
        </Button>
        
        <div className="text-sm text-muted-foreground">
          {completedStudents.size} / {incompleteStudents.length} completed
        </div>

        <Button
          variant="outline"
          onClick={handleNext}
          disabled={currentIndex === incompleteStudents.length - 1}
        >
          Next
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}
