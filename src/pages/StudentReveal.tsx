import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar, Clock, MapPin, User, Sparkles, Facebook } from "lucide-react";
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
      <div className="min-h-screen bg-gradient-soft flex items-center justify-center">
        <div className="text-center space-y-4 animate-fade-in">
          <Sparkles className="w-16 h-16 text-primary mx-auto animate-pulse" />
          <p className="text-xl text-muted-foreground">Loading your assignment...</p>
        </div>
      </div>
    );
  }

  if (!batch) {
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
              <p className="text-lg text-muted-foreground">
                SAT Math сургалтанд тавтай морил!
              </p>
            </div>
          </div>

          {/* Assignment Details Card */}
          <Card className={`shadow-glow transition-all duration-700 delay-300 ${showReveal ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            <CardContent className="p-8 space-y-6">
              <div className="text-center pb-4 border-b border-border/50">
                <h2 className="text-2xl font-bold bg-gradient-petal bg-clip-text text-transparent">
                  Таны ангийн мэдээлэл
                </h2>
              </div>

              <div className="grid gap-6">
                <div className="flex items-start gap-4 p-4 rounded-lg bg-accent/10 transition-all hover:bg-accent/20">
                  <User className="w-6 h-6 text-primary mt-1 flex-shrink-0" />
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Teacher</p>
                    <p className="text-lg font-semibold">{batch.teacher}</p>
                  </div>
                </div>

                <div className="flex items-start gap-4 p-4 rounded-lg bg-accent/10 transition-all hover:bg-accent/20">
                  <Clock className="w-6 h-6 text-primary mt-1 flex-shrink-0" />
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Schedule</p>
                    <p className="text-lg font-semibold">{batch.schedule}</p>
                  </div>
                </div>

                <div className="flex items-start gap-4 p-4 rounded-lg bg-accent/10 transition-all hover:bg-accent/20">
                  <MapPin className="w-6 h-6 text-primary mt-1 flex-shrink-0" />
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Room</p>
                    <p className="text-lg font-semibold">Room {batch.room}</p>
                    <p className="text-sm text-muted-foreground">
                      {batch.room === "1105" ? "11th floor" : "9th floor"}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4 p-4 rounded-lg bg-accent/10 transition-all hover:bg-accent/20">
                  <Calendar className="w-6 h-6 text-primary mt-1 flex-shrink-0" />
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Start Date</p>
                    <p className="text-lg font-semibold">
                      {new Date(batch.start_date).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Facebook Group Section */}
          {batch.fb_group_link && (
            <Card className={`shadow-glow transition-all duration-700 delay-500 ${showReveal ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center gap-2 text-primary">
                  <Facebook className="w-5 h-5" />
                  <h3 className="text-lg font-semibold">Facebook Group</h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  Тус групт бидний хэрэглэх ном, цээжлэх үгс, шалгалтад бүртгүүлэх заавар, 1074 бодлогын сан зэрэг байгаа тул эхний postоос эхлэн дуустал нь уншаарай.
                </p>
                <Button
                  asChild
                  className="w-full bg-gradient-petal hover:opacity-90 transition-opacity"
                >
                  <a href={batch.fb_group_link} target="_blank" rel="noopener noreferrer">
                    Групт нэгдэх
                  </a>
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Contact Information */}
          <Card className={`shadow-glow transition-all duration-700 delay-700 ${showReveal ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            <CardContent className="p-6 space-y-3">
              <h3 className="text-lg font-semibold">Холбоо барих</h3>
              <div className="space-y-2 text-sm">
                <p className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-primary" />
                  <span>Хаяг: Их Наяд Зүүн Өндөр 1114</span>
                </p>
                <p className="flex items-center gap-2">
                  <span className="text-primary">📞</span>
                  <span>Утас: 80660314, 88559876</span>
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default StudentReveal;

