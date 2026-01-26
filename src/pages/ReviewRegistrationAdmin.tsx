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
import { Loader2, RefreshCw, Copy, Check, QrCode, Clock } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useTeacherAuth } from "@/contexts/TeacherAuthContext";

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
  const { user: adminUser } = useAuth();
  const { teacherName } = useTeacherAuth();
  
  const [currentCode, setCurrentCode] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<Date | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [teacherId, setTeacherId] = useState<string | null>(null);

  const registrationUrl = currentCode
    ? `${window.location.origin}/register?code=${currentCode}`
    : "";

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
