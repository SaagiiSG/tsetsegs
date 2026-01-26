import { useState, useEffect, useCallback } from "react";
import QRCode from "react-qr-code";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Loader2, RefreshCw, Copy, Check, QrCode, Clock, UserPlus, Users, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useTeacherAuth } from "@/contexts/TeacherAuthContext";
import { motion, AnimatePresence } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ReviewStudent {
  id: string;
  first_name: string;
  last_name: string | null;
  phone: string;
  review_teacher: string | null;
  created_at: string;
}

// Generate a random 6-character alphanumeric code
const generateCode = () => {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // Exclude confusing chars like 0/O, 1/I/L
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

export default function ReviewRegistrationAdmin() {
  const navigate = useNavigate();
  const { user: adminUser } = useAuth();
  const { teacherName } = useTeacherAuth();
  
  const [currentCode, setCurrentCode] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<Date | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [teacherId, setTeacherId] = useState<string | null>(null);
  const [recentRegistrations, setRecentRegistrations] = useState<ReviewStudent[]>([]);
  const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null);

  // QR code leads to /register without the code - students must enter it manually
  const registrationUrl = `${window.location.origin}/register`;

  // Fetch teacher ID if logged in as teacher
  useEffect(() => {
    const fetchTeacherId = async () => {
      if (teacherName) {
        const { data } = await supabase
          .from("teachers")
          .select("id")
          .eq("name", teacherName)
          .single();
        if (data) {
          setTeacherId(data.id);
        }
      }
    };
    fetchTeacherId();
  }, [teacherName]);

  // Set loading to false on mount - no pre-fetching of codes
  useEffect(() => {
    setIsLoading(false);
  }, []);

  // Real-time subscription for new review student registrations
  useEffect(() => {
    // Subscribe to new review students
    const channel = supabase
      .channel('review-registrations')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'students',
          filter: 'is_review_student=eq.true',
        },
        (payload) => {
          const newStudent = payload.new as ReviewStudent;
          // Only show if registered after session started (or within last 15 mins if no session)
          const cutoffTime = sessionStartTime || new Date(Date.now() - 15 * 60 * 1000);
          const registeredAt = new Date(newStudent.created_at);
          
          if (registeredAt >= cutoffTime) {
            setRecentRegistrations((prev) => [newStudent, ...prev]);
            toast.success(`${newStudent.first_name} ${newStudent.last_name || ''} just registered!`, {
              icon: <UserPlus className="h-4 w-4" />,
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionStartTime]);

  // Countdown timer
  useEffect(() => {
    if (!expiresAt) {
      setTimeRemaining(0);
      return;
    }

    const updateTimer = () => {
      const now = new Date();
      const remaining = Math.max(0, Math.floor((expiresAt.getTime() - now.getTime()) / 1000));
      setTimeRemaining(remaining);

      if (remaining === 0) {
        setCurrentCode(null);
        setExpiresAt(null);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [expiresAt]);

  const generateNewCode = useCallback(async () => {
    setIsGenerating(true);

    try {
      // Deactivate any existing codes first
      if (currentCode) {
        await supabase
          .from("registration_codes")
          .update({ is_active: false })
          .eq("code", currentCode);
      }

      const newCode = generateCode();
      const expiryTime = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes from now

      const insertData: any = {
        code: newCode,
        expires_at: expiryTime.toISOString(),
        is_active: true,
      };

      // Add creator info if available
      if (teacherId) {
        insertData.created_by_teacher_id = teacherId;
      } else if (adminUser?.id) {
        insertData.created_by_admin_id = adminUser.id;
      }

      const { error } = await supabase
        .from("registration_codes")
        .insert(insertData);

      if (error) {
        console.error("Error creating code:", error);
        toast.error("Failed to generate code", {
          description: "Please try again.",
        });
        return;
      }

      setCurrentCode(newCode);
      setExpiresAt(expiryTime);
      setSessionStartTime(new Date()); // Track when this session started
      setRecentRegistrations([]); // Clear previous registrations
      toast.success("New code generated!", {
        description: "Code is valid for 15 minutes.",
      });
    } catch (error) {
      console.error("Error generating code:", error);
      toast.error("Something went wrong", {
        description: "Please try again.",
      });
    } finally {
      setIsGenerating(false);
    }
  }, [currentCode, teacherId, adminUser]);

  const copyCode = async () => {
    if (!currentCode) return;

    try {
      await navigator.clipboard.writeText(currentCode);
      setIsCopied(true);
      toast.success("Code copied!");
      setTimeout(() => setIsCopied(false), 2000);
    } catch {
      toast.error("Failed to copy");
    }
  };

  const copyUrl = async () => {
    if (!registrationUrl) return;

    try {
      await navigator.clipboard.writeText(registrationUrl);
      toast.success("Registration link copied!");
    } catch {
      toast.error("Failed to copy link");
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(adminUser ? "/admin" : "/teacher")}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Button>
        </div>
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold">SAT Review Registration</h1>
          <p className="text-muted-foreground mt-2">
            Generate a code for students to register for the review session
          </p>
        </div>

        {!currentCode ? (
          <Card className="max-w-md mx-auto">
            <CardHeader className="text-center">
              <QrCode className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
              <CardTitle>No Active Code</CardTitle>
              <CardDescription>
                Generate a new code to allow students to register
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onClick={generateNewCode}
                className="w-full"
                size="lg"
                disabled={isGenerating}
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Generate Code
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 gap-6">
            {/* QR Code Section */}
            <Card>
              <CardHeader className="text-center">
                <CardTitle>Scan to Register</CardTitle>
                <CardDescription>
                  Students can scan this QR code with their phone
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col items-center gap-4">
                <div className="bg-white p-4 rounded-lg">
                  <QRCode
                    value={registrationUrl}
                    size={200}
                    level="H"
                  />
                </div>
                <Button variant="outline" size="sm" onClick={copyUrl}>
                  <Copy className="mr-2 h-4 w-4" />
                  Copy Link
                </Button>
              </CardContent>
            </Card>

            {/* Code Display Section */}
            <Card>
              <CardHeader className="text-center">
                <CardTitle>Access Code</CardTitle>
                <CardDescription>
                  Or enter this code manually
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col items-center gap-6">
                {/* Large Code Display */}
                <div className="relative">
                  <div
                    className="text-5xl md:text-6xl font-mono font-bold tracking-[0.3em] text-primary cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={copyCode}
                  >
                    {currentCode}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute -right-10 top-1/2 -translate-y-1/2"
                    onClick={copyCode}
                  >
                    {isCopied ? (
                      <Check className="h-5 w-5 text-primary" />
                    ) : (
                      <Copy className="h-5 w-5" />
                    )}
                  </Button>
                </div>

                {/* Timer */}
                <div
                  className={`flex items-center gap-2 text-lg ${
                    timeRemaining < 60 ? "text-destructive" : "text-muted-foreground"
                  }`}
                >
                  <Clock className="h-5 w-5" />
                  <span>
                    Expires in: <strong>{formatTime(timeRemaining)}</strong>
                  </span>
                </div>

                {/* Generate New Button */}
                <Button
                  onClick={generateNewCode}
                  variant="outline"
                  disabled={isGenerating}
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Generate New Code
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Real-time Registrations */}
        {currentCode && (
          <Card className="mt-8">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  <CardTitle className="text-lg">Live Registrations</CardTitle>
                </div>
                <Badge variant="secondary" className="text-sm">
                  {recentRegistrations.length} registered
                </Badge>
              </div>
              <CardDescription>
                Students will appear here as they register
              </CardDescription>
            </CardHeader>
            <CardContent>
              {recentRegistrations.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <UserPlus className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p>Waiting for students to register...</p>
                  <p className="text-sm mt-1">New registrations will appear here in real-time</p>
                </div>
              ) : (
                <ScrollArea className="h-[300px]">
                  <div className="space-y-2">
                    <AnimatePresence mode="popLayout">
                      {recentRegistrations.map((student, index) => (
                        <motion.div
                          key={student.id}
                          initial={{ opacity: 0, x: -20, scale: 0.95 }}
                          animate={{ opacity: 1, x: 0, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          transition={{ duration: 0.3, delay: index * 0.05 }}
                          className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border"
                        >
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                              <span className="text-primary font-semibold">
                                {student.first_name.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <div>
                              <p className="font-medium">
                                {student.first_name} {student.last_name || ''}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {student.phone}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            {student.review_teacher && (
                              <Badge variant="outline" className="text-xs">
                                {student.review_teacher}
                              </Badge>
                            )}
                            <p className="text-xs text-muted-foreground mt-1">
                              {new Date(student.created_at).toLocaleTimeString()}
                            </p>
                          </div>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        )}

        {/* Instructions */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="text-lg">How it works</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
              <li>Generate a new access code (valid for 15 minutes)</li>
              <li>Show the QR code on screen or share the 6-character code</li>
              <li>Students scan the QR or enter the code on their phones</li>
              <li>Students fill out their registration information</li>
              <li>Once registered, they can log in to the practice portal using their phone number</li>
            </ol>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
