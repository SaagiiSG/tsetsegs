import { useState, useEffect } from "react";
import { useTheme } from "next-themes";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Palette, Moon, Sun, Check, FileText, Save } from "lucide-react";
import { cn } from "@/lib/utils";
import { FeatureFlagsManager } from "@/components/admin/FeatureFlagsManager";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const colorThemes = [
  { id: "rose", name: "Rose", color: "hsl(345 75% 65%)" },
  { id: "blue", name: "Ocean", color: "hsl(217 91% 60%)" },
  { id: "green", name: "Forest", color: "hsl(142 76% 45%)" },
  { id: "purple", name: "Violet", color: "hsl(270 70% 60%)" },
  { id: "orange", name: "Sunset", color: "hsl(25 95% 55%)" },
  { id: "gold", name: "Gold", color: "hsl(43 88% 50%)" },
];

export default function AdminSettings() {
  const { theme, setTheme } = useTheme();

  const [colorTheme, setColorTheme] = useState(() => {
    return localStorage.getItem("color-theme") || "rose";
  });

  const handleColorThemeChange = (newTheme: string) => {
    const root = document.documentElement;
    colorThemes.forEach((t) => root.classList.remove(`theme-${t.id}`));
    root.classList.add(`theme-${newTheme}`);
    localStorage.setItem("color-theme", newTheme);
    setColorTheme(newTheme);
  };

  const isDarkMode = theme === "dark";

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground">Customize your admin dashboard</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Palette className="h-5 w-5" />
            Appearance
          </CardTitle>
          <CardDescription>Customize how the dashboard looks</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Dark Mode Toggle */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {isDarkMode ? (
                <Moon className="h-5 w-5 text-primary" />
              ) : (
                <Sun className="h-5 w-5 text-primary" />
              )}
              <div>
                <Label htmlFor="dark-mode" className="text-base font-medium cursor-pointer">
                  Dark Mode
                </Label>
                <p className="text-sm text-muted-foreground">
                  Switch between light and dark themes
                </p>
              </div>
            </div>
            <Switch
              id="dark-mode"
              checked={isDarkMode}
              onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
            />
          </div>

          {/* Color Theme Selector */}
          <div className="space-y-3">
            <div>
              <Label className="text-base font-medium">Accent Color</Label>
              <p className="text-sm text-muted-foreground">
                Choose your preferred accent color
              </p>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
              {colorThemes.map((t) => (
                <button
                  key={t.id}
                  onClick={() => handleColorThemeChange(t.id)}
                  className={cn(
                    "relative flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-all",
                    colorTheme === t.id
                      ? "border-primary bg-primary/10"
                      : "border-border hover:border-primary/50"
                  )}
                >
                  <div
                    className="w-8 h-8 rounded-full shadow-md flex items-center justify-center"
                    style={{ backgroundColor: t.color }}
                  >
                    {colorTheme === t.id && (
                      <Check className="h-4 w-4 text-white" />
                    )}
                  </div>
                  <span className="text-xs font-medium">{t.name}</span>
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <ClosingReportSettingsEditor />

      <Card className="mt-6">
        <CardContent className="pt-6">
          <FeatureFlagsManager />
        </CardContent>
      </Card>
    </div>
  );
}

function ClosingReportSettingsEditor() {
  const [heading, setHeading] = useState("Thank You, {name}!");
  const [body, setBody] = useState("Your hard work and dedication throughout this program have been incredible. Keep pushing toward your goals — we believe in you!");
  const [signOff, setSignOff] = useState("See you on the review session! 🚀");
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('closing_report_settings')
        .select('*')
        .limit(1)
        .maybeSingle();
      if (data) {
        setHeading((data as any).heading || heading);
        setBody((data as any).body || body);
        setSignOff((data as any).sign_off || signOff);
      }
      setLoaded(true);
    })();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      // Check if row exists
      const { data: existing } = await supabase
        .from('closing_report_settings')
        .select('id')
        .limit(1)
        .maybeSingle();

      if (existing) {
        await supabase
          .from('closing_report_settings')
          .update({ heading, body, sign_off: signOff, updated_at: new Date().toISOString() } as any)
          .eq('id', existing.id);
      } else {
        await supabase
          .from('closing_report_settings')
          .insert({ heading, body, sign_off: signOff } as any);
      }
      toast.success('Closing report message saved!');
    } catch {
      toast.error('Failed to save');
    } finally {
      setSaving(false);
    }
  };

  if (!loaded) return null;

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <FileText className="h-5 w-5" />
          Closing Report Message
        </CardTitle>
        <CardDescription>
          Customize the final slide of student closing reports. Use <code className="bg-muted px-1 rounded text-xs">{'{name}'}</code> as a placeholder for the student's first name.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Heading</Label>
          <Input value={heading} onChange={e => setHeading(e.target.value)} placeholder="Thank You, {name}!" />
        </div>
        <div className="space-y-2">
          <Label>Body Message</Label>
          <Textarea value={body} onChange={e => setBody(e.target.value)} rows={3} placeholder="Your hard work..." />
        </div>
        <div className="space-y-2">
          <Label>Sign-off Line</Label>
          <Input value={signOff} onChange={e => setSignOff(e.target.value)} placeholder="See you on the review session! 🚀" />
        </div>
        <Button onClick={handleSave} disabled={saving} className="gap-2">
          <Save className="h-4 w-4" />
          {saving ? 'Saving...' : 'Save Message'}
        </Button>
      </CardContent>
    </Card>
  );
}
