import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { RefreshCw, Copy, Check, Users, Clock, QrCode } from "lucide-react";
import { toast } from "sonner";
import QRCode from "react-qr-code";
import { format } from "date-fns";

interface RegistrationCode {
  id: string;
  code: string;
  expires_at: string;
  is_active: boolean;
  used_count: number;
}

interface ReviewStudent {
  id: string;
  first_name: string;
  last_name: string | null;
  phone: string;
  parent_phone: string | null;
  math_level: string | null;
  english_level: string | null;
  review_teacher: string | null;
  created_at: string;
}

export function ReviewRegistrationContent() {
  const [activeCode, setActiveCode] = useState<RegistrationCode | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [recentStudents, setRecentStudents] = useState<ReviewStudent[]>([]);
  const [timeRemaining, setTimeRemaining] = useState<string>("");

  // Calculate time remaining for active code
  useEffect(() => {
    if (!activeCode) return;

    const updateTimer = () => {
      const expiresAt = new Date(activeCode.expires_at);
      const now = new Date();
      const diff = expiresAt.getTime() - now.getTime();

      if (diff <= 0) {
        setTimeRemaining("Expired");
        setActiveCode(null);
        return;
      }

      const minutes = Math.floor(diff / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);
      setTimeRemaining(`${minutes}:${seconds.toString().padStart(2, "0")}`);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [activeCode]);

  // Fetch active codes and recent registrations
  useEffect(() => {
    fetchActiveCode();
    fetchRecentStudents();
  }, []);

  const fetchActiveCode = async () => {
    const { data, error } = await supabase
      .from("registration_codes")
      .select("*")
      .eq("is_active", true)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (!error && data) {
      setActiveCode(data);
    }
  };

  const fetchRecentStudents = async () => {
    const { data, error } = await supabase
      .from("students")
      .select("*")
      .eq("is_review_student", true)
      .order("created_at", { ascending: false })
      .limit(10);

    if (!error && data) {
      setRecentStudents(data);
    }
  };

  const generateCode = async () => {
    setIsGenerating(true);

    // Deactivate existing codes first
    await supabase
      .from("registration_codes")
      .update({ is_active: false })
      .eq("is_active", true);

    // Generate a new 6-character code
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    const { data, error } = await supabase
      .from("registration_codes")
      .insert({
        code,
        expires_at: expiresAt.toISOString(),
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      toast.error("Failed to generate code");
      console.error(error);
    } else {
      setActiveCode(data);
      toast.success("New registration code generated!");
    }

    setIsGenerating(false);
  };

  const copyLink = () => {
    if (!activeCode) return;
    const url = `${window.location.origin}/register?code=${activeCode.code}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    toast.success("Link copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  const registrationUrl = activeCode 
    ? `${window.location.origin}/register?code=${activeCode.code}`
    : "";

  return (
    <div className="space-y-6">
      {/* Code Generator */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5" />
            Registration Code
          </CardTitle>
          <CardDescription>
            Generate a QR code for students to register for review sessions
          </CardDescription>
        </CardHeader>
        <CardContent>
          {activeCode ? (
            <div className="space-y-6">
              {/* QR Code */}
              <div className="flex flex-col items-center gap-4">
                <div className="bg-white p-4 rounded-lg shadow-inner">
                  <QRCode value={registrationUrl} size={200} />
                </div>
                
                {/* Code Display */}
                <div className="text-center">
                  <p className="text-sm text-muted-foreground mb-1">Registration Code</p>
                  <p className="text-4xl font-mono font-bold tracking-widest">{activeCode.code}</p>
                </div>

                {/* Timer */}
                <Badge 
                  variant={timeRemaining === "Expired" ? "destructive" : "secondary"}
                  className="flex items-center gap-1"
                >
                  <Clock className="h-3 w-3" />
                  {timeRemaining}
                </Badge>

                {/* Actions */}
                <div className="flex gap-2">
                  <Button variant="outline" onClick={copyLink}>
                    {copied ? <Check className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
                    {copied ? "Copied!" : "Copy Link"}
                  </Button>
                  <Button onClick={generateCode} disabled={isGenerating}>
                    <RefreshCw className={`h-4 w-4 mr-2 ${isGenerating ? "animate-spin" : ""}`} />
                    New Code
                  </Button>
                </div>

                {/* Used Count */}
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <Users className="h-4 w-4" />
                  {activeCode.used_count} students registered with this code
                </p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4 py-8">
              <QrCode className="h-16 w-16 text-muted-foreground" />
              <p className="text-muted-foreground">No active registration code</p>
              <Button onClick={generateCode} disabled={isGenerating}>
                <RefreshCw className={`h-4 w-4 mr-2 ${isGenerating ? "animate-spin" : ""}`} />
                Generate Code
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Registrations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Recent Registrations
          </CardTitle>
          <CardDescription>
            Students who recently registered for review sessions
          </CardDescription>
        </CardHeader>
        <CardContent>
          {recentStudents.length > 0 ? (
            <div className="space-y-3">
              {recentStudents.map((student) => (
                <div 
                  key={student.id}
                  className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                >
                  <div>
                    <p className="font-medium">
                      {student.first_name} {student.last_name}
                    </p>
                    <p className="text-sm text-muted-foreground">{student.phone}</p>
                  </div>
                  <div className="text-right">
                    <Badge variant="outline">{student.review_teacher || "No teacher"}</Badge>
                    <p className="text-xs text-muted-foreground mt-1">
                      {format(new Date(student.created_at), "MMM d, h:mm a")}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">
              No students have registered yet
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
