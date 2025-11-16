import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar, Clock, MapPin, User, Sparkles, Facebook, MapPinned } from "lucide-react";
import { Button } from "@/components/ui/button";
import heroImage from "@/assets/flowers-hero.jpg";

const StudentReveal = () => {
  const { id } = useParams();
  const [batch, setBatch] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showReveal, setShowReveal] = useState(false);

  useEffect(() => {
    const fetchBatch = async () => {
      if (!id) return;

      const { data: batchData, error } = await supabase
        .from("batches")
        .select("*")
        .eq("unique_link_id", id)
        .maybeSingle();

      if (error) {
        console.error(error);
        setIsLoading(false);
        return;
      }

      setBatch(batchData);
      setIsLoading(false);
      
      // Trigger reveal animation after short delay
      setTimeout(() => setShowReveal(true), 500);
    };

    fetchBatch();
  }, [id]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/10 via-secondary/10 to-accent/10 flex items-center justify-center">
        <div className="text-center space-y-6 animate-fade-in">
          <div className="relative">
            <Sparkles className="w-20 h-20 text-primary mx-auto animate-pulse" />
            <div className="absolute inset-0 bg-primary/20 blur-xl animate-pulse" />
          </div>
          <p className="text-2xl font-medium bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            Preparing your magical reveal...
          </p>
        </div>
      </div>
    );
  }

  if (!batch) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/10 via-secondary/10 to-accent/10 flex items-center justify-center p-4">
        <Card className="max-w-md w-full shadow-2xl">
          <CardContent className="p-8 text-center space-y-4">
            <Sparkles className="w-16 h-16 text-muted-foreground mx-auto" />
            <h2 className="text-2xl font-bold">Link Not Found</h2>
            <p className="text-muted-foreground">This invitation link is invalid or has expired.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-secondary/10 to-accent/10 relative overflow-hidden">
      {/* Animated petals background */}
      <div className="absolute inset-0 pointer-events-none">
        {[...Array(12)].map((_, i) => (
          <div
            key={i}
            className="absolute w-6 h-6 bg-primary/10 rounded-full blur-sm"
            style={{
              left: `${Math.random() * 100}%`,
              animation: `float ${8 + Math.random() * 4}s ease-in-out infinite`,
              animationDelay: `${i * 1}s`,
              top: `${-20 + Math.random() * 120}%`,
            }}
          />
        ))}
      </div>

      <div className="relative z-10 min-h-screen flex items-center justify-center p-4 py-12">
        <div className="max-w-3xl w-full space-y-8">
          {/* Welcome Header with Hero Image */}
          <div className={`transition-all duration-1000 ${showReveal ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <Card className="overflow-hidden shadow-2xl border-2">
              <div className="relative h-64 md:h-80">
                <img
                  src={heroImage}
                  alt="Flowers"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent flex items-end justify-center pb-8">
                  <h1 className="text-4xl md:text-5xl font-bold text-center px-4">
                    <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent drop-shadow-lg">
                      Welcome to Family of Tsetsegs
                    </span>
                    <span className="ml-2 text-4xl">🌸</span>
                  </h1>
                </div>
              </div>
            </Card>
          </div>

          {/* Assignment Details */}
          <div className={`transition-all duration-1000 delay-300 ${showReveal ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <Card className="shadow-xl border-2">
              <CardContent className="p-8 space-y-6">
                <div className="text-center space-y-2 pb-4 border-b">
                  <p className="text-sm text-muted-foreground uppercase tracking-wide">Your Class Assignment</p>
                  <h2 className="text-2xl font-bold text-primary">Class Details</h2>
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                  <div className="flex items-start gap-4 p-4 rounded-lg bg-primary/5 border border-primary/20">
                    <div className="p-3 bg-primary/10 rounded-lg">
                      <User className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Teacher</p>
                      <p className="font-semibold text-lg">{batch.teacher}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4 p-4 rounded-lg bg-secondary/5 border border-secondary/20">
                    <div className="p-3 bg-secondary/10 rounded-lg">
                      <Clock className="w-6 h-6 text-secondary" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Schedule</p>
                      <p className="font-semibold">{batch.schedule}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4 p-4 rounded-lg bg-accent/5 border border-accent/20">
                    <div className="p-3 bg-accent/10 rounded-lg">
                      <MapPin className="w-6 h-6 text-accent" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Classroom</p>
                      <p className="font-semibold text-lg">{batch.room}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4 p-4 rounded-lg bg-primary/5 border border-primary/20">
                    <div className="p-3 bg-primary/10 rounded-lg">
                      <Calendar className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Start Date</p>
                      <p className="font-semibold">{formatDate(batch.start_date)}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Facebook Group */}
          {batch.fb_group_link && (
            <div className={`transition-all duration-1000 delay-500 ${showReveal ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
              <Card className="shadow-xl border-2 border-primary/20">
                <CardContent className="p-6">
                  <div className="flex flex-col md:flex-row items-center gap-4">
                    <div className="p-4 bg-primary/10 rounded-full">
                      <Facebook className="w-8 h-8 text-primary" />
                    </div>
                    <div className="flex-1 text-center md:text-left">
                      <h3 className="font-semibold text-lg mb-1">Join Our Class Community</h3>
                      <p className="text-sm text-muted-foreground">
                        Connect with your classmates and stay updated
                      </p>
                    </div>
                    <Button 
                      onClick={() => window.open(batch.fb_group_link, '_blank')}
                      size="lg"
                      className="shadow-lg"
                    >
                      Join Facebook Group
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Location Info */}
          <div className={`transition-all duration-1000 delay-700 ${showReveal ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <Card className="shadow-xl">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-accent/10 rounded-lg">
                    <MapPinned className="w-6 h-6 text-accent" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg mb-2">Our Location</h3>
                    <p className="text-muted-foreground mb-3">
                      Флауэрс таланд агенци хөгжлийн төв<br />
                      Эйч.Би.Си Төв, 11 давхар, Зайсан толгой, Улаанбаатар
                    </p>
                    <div className="space-y-1 text-sm">
                      <p className="text-muted-foreground">
                        <strong>Phone:</strong> 7711-0000, 8989-0000
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Footer Message */}
          <div className={`text-center transition-all duration-1000 delay-900 ${showReveal ? 'opacity-100' : 'opacity-0'}`}>
            <p className="text-muted-foreground">
              We're excited to have you join us! See you in class! ✨
            </p>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes float {
          0%, 100% {
            transform: translateY(0) rotate(0deg);
            opacity: 0.3;
          }
          50% {
            transform: translateY(100vh) rotate(360deg);
            opacity: 0.6;
          }
        }
      `}</style>
    </div>
  );
};

export default StudentReveal;

