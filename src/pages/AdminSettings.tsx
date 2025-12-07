import { useState } from "react";
import { useTheme } from "next-themes";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Palette, Moon, Sun, Check } from "lucide-react";
import { cn } from "@/lib/utils";

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
    </div>
  );
}
