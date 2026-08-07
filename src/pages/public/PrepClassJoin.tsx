import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Flame, Loader2, Sparkles, UserPlus } from "lucide-react";
import { toast } from "sonner";

type JoinResult = {
  status: string;
  member_id: string | null;
  group_id: string;
  group_name: string;
  display_name: string | null;
  badge_awarded: boolean;
};

export default function PrepClassJoin() {
  const { joinCode } = useParams<{ joinCode: string }>();
  const navigate = useNavigate();
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<JoinResult | null>(null);
  const [groupName, setGroupName] = useState<string | null>(null);

  useEffect(() => {
    if (!joinCode) return;
    supabase
      .from("intense_prep_groups")
      .select("name")
      .ilike("join_code", joinCode)
      .eq("is_active", true)
      .maybeSingle()
      .then(({ data }) => setGroupName(data?.name ?? null));
  }, [joinCode]);

  const join = async () => {
    const digits = phone.replace(/\D/g, "");
    if (digits.length < 8) {
      toast.error("Enter your 8-digit phone number");
      return;
    }
    if (submitting) return;
    setSubmitting(true);
    const { data, error } = await supabase.rpc("prep_class_join", {
      p_join_code: joinCode ?? "",
      p_phone: digits,
    });
    setSubmitting(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    const row = (data as JoinResult[] | null)?.[0];
    if (!row) {
      toast.error("Could not register you — ask your teacher for help");
      return;
    }
    setResult(row);
  };

  if (result?.status === "needs_onboarding") {
    return (
      <Shell title={result.group_name}>
        <Card className="p-6 space-y-4 text-center">
          <UserPlus className="h-10 w-10 mx-auto text-primary" />
          <div>
            <h2 className="font-bold text-lg">We don't have you yet</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Fill in the short onboarding form, then scan this QR again to lock in your spot.
            </p>
          </div>
          <Button
            className="w-full"
            onClick={() => navigate(`/student-register?prep=${joinCode ?? ""}&phone=${phone.replace(/\D/g, "")}`)}
          >
            Start onboarding
          </Button>
          <Button variant="ghost" className="w-full" onClick={() => setResult(null)}>
            Try another number
          </Button>
        </Card>
      </Shell>
    );
  }

  if (result) {
    return (
      <Shell title={result.group_name}>
        <Card className="p-6 space-y-5 text-center">
          <div className="mx-auto h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
            <Flame className="h-8 w-8 text-orange-500" />
          </div>
          <div>
            <h2 className="font-bold text-xl">You're in, {result.display_name}</h2>
            <p className="text-sm text-muted-foreground mt-1">
              You're registered for {result.group_name}. Your teacher can now track your final week.
            </p>
          </div>

          <div className="rounded-xl border bg-gradient-to-br from-primary/10 to-orange-500/10 p-4 space-y-2">
            <Sparkles className="h-6 w-6 mx-auto text-primary" />
            <p className="font-semibold text-sm">One last dance with Tsetsegs family</p>
            <p className="text-xs text-muted-foreground">
              {result.badge_awarded
                ? "Badge unlocked — share it from your badges page."
                : "This badge is already in your collection."}
            </p>
          </div>

          <Button className="w-full" onClick={() => navigate("/practice/badges")}>
            See my badge
          </Button>
        </Card>
      </Shell>
    );
  }

  return (
    <Shell title={groupName ?? "Intense Prep"}>
      <Card className="p-6 space-y-4">
        <div className="text-center space-y-1">
          <Flame className="h-9 w-9 mx-auto text-orange-500" />
          <h2 className="font-bold text-lg">{groupName ?? "Prep class registration"}</h2>
          <p className="text-xs text-muted-foreground">
            Enter the phone number you registered with at Tsetsegs.
          </p>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Phone number</Label>
          <Input
            inputMode="numeric"
            autoFocus
            placeholder="88112233"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && join()}
            className="text-center text-lg font-mono tracking-widest"
          />
        </div>
        <Button className="w-full" onClick={join} disabled={submitting}>
          {submitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
          Join prep class
        </Button>
      </Card>
    </Shell>
  );
}

function Shell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-4">
        <p className="text-center text-xs uppercase tracking-[0.25em] text-muted-foreground">{title}</p>
        {children}
      </div>
    </div>
  );
}
