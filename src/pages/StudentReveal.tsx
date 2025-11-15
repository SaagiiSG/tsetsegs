import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar, Clock, MapPin, User, Sparkles } from "lucide-react";
import heroImage from "@/assets/flowers-hero.jpg";

const StudentReveal = () => {
  const { id } = useParams();
  const [student, setStudent] = useState<any>(null);
  const [batch, setBatch] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showReveal, setShowReveal] = useState(false);

  useEffect(() => {
    const fetchStudent = async () => {
      if (!id) return;

      const { data: studentData, error } = await supabase
        .from("students")
        .select(`
          *,
          batches (*)
        `)
        .eq("unique_link_id", id)
        .single();

      if (error) {
        console.error(error);
        setIsLoading(false);
        return;
      }

      setStudent(studentData);
      setBatch(studentData.batches);

      // Mark as accessed
      if (!studentData.accessed) {
        await supabase
          .from("students")
          .update({ accessed: true, accessed_at: new Date().toISOString() })
          .eq("id", studentData.id);
      }

      setIsLoading(false);
      
      // Trigger reveal animation after short delay
      setTimeout(() => setShowReveal(true), 500);
    };

    fetchStudent();
  }, [id]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-soft flex items-center justify-center">
        <div className="text-center space-y-4 animate-fade-in">
          <Sparkles className="w-16 h-16 text-primary mx-auto animate-pulse" />
          <p className="text-xl text-muted-foreground">Loading your assignment...</p>
        </div>
      </div>
    );
  }

  if (!student || !batch) {
    return (
      <div className="min-h-screen bg-gradient-soft flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-6 text-center">
            <h2 className="text-2xl font-bold mb-2">Link Not Found</h2>
            <p className="text-muted-foreground">This invitation link is invalid or has expired.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-soft relative overflow-hidden">
      {/* Animated petals background */}
      <div className="absolute inset-0 pointer-events-none">
        {[...Array(8)].map((_, i) => (
          <div
            key={i}
            className="absolute w-4 h-4 bg-primary/20 rounded-full animate-petal-fall"
            style={{
              left: `${Math.random() * 100}%`,
              animationDelay: `${i * 1.5}s`,
              animationDuration: `${8 + Math.random() * 4}s`,
            }}
          />
        ))}
      </div>

      <div className="relative z-10 min-h-screen flex items-center justify-center p-4">
        <div className="max-w-2xl w-full space-y-8">
          {/* Welcome Header */}
          <div className={`text-center space-y-4 transition-all duration-700 ${showReveal ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            <div className="relative w-full h-48 rounded-2xl overflow-hidden shadow-glow mb-6">
              <img
                src={heroImage}
                alt="Flowers"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background/90 to-transparent flex items-end justify-center pb-6">
                <h1 className="text-3xl md:text-4xl font-bold text-white drop-shadow-lg">
                  Welcome to Family of Tsetsegs 🌸
                </h1>
              </div>
            </div>
            
            <div className="space-y-2">
              <p className="text-2xl md:text-3xl font-semibold text-foreground">
                {student.name}
              </p>
              <p className="text-muted-foreground">
                Your class assignment is ready!
              </p>
            </div>
          </div>

          {/* Reveal Cards */}
          <div className="grid gap-4">
            {[
              { icon: User, label: "Teacher", value: batch.teacher, delay: "delay-100" },
              { icon: Clock, label: "Schedule", value: batch.schedule, delay: "delay-200" },
              { icon: MapPin, label: "Classroom", value: `Room ${batch.room}`, delay: "delay-300" },
              { icon: Calendar, label: "Start Date", value: new Date(batch.start_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }), delay: "delay-500" },
            ].map((item, index) => (
              <Card
                key={index}
                className={`shadow-soft transition-all duration-700 ${showReveal ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4'} ${item.delay}`}
              >
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-gradient-petal flex items-center justify-center flex-shrink-0">
                      <item.icon className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">{item.label}</p>
                      <p className="text-xl font-semibold">{item.value}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Footer Message */}
          <div className={`text-center transition-all duration-700 delay-700 ${showReveal ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            <p className="text-lg text-muted-foreground">
              We're excited to have you join us! 🎉
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              See you on your first day!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentReveal;
