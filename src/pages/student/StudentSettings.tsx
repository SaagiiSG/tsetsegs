import { useState, useEffect } from 'react';
import { useStudentAuth } from '@/contexts/StudentAuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { useTheme } from 'next-themes';
import { 
  Settings, Moon, Sun, LogOut, User, Phone, School, GraduationCap, Palette, Sparkles
} from 'lucide-react';
import { TIER_COLORS, TIER_DISPLAY_NAMES, TIER_THEME_HSL_LIGHT, TIER_THEME_HSL_DARK, TierType, TIER_ORDER } from '@/data/badgeDefinitions';
import { useStudentTier } from '@/hooks/useStudentTier';
import { cn } from '@/lib/utils';
import { Lock } from 'lucide-react';

type ThemeOption = 'rank' | TierType;

// Get the index of a tier in TIER_ORDER
const getTierIndex = (tier: TierType): number => TIER_ORDER.indexOf(tier);

// Check if a tier is unlocked based on current tier
const isTierUnlocked = (tier: TierType, currentTier: TierType): boolean => {
  return getTierIndex(tier) <= getTierIndex(currentTier);
};

const THEME_OPTIONS: { value: ThemeOption; label: string }[] = [
  { value: 'rank', label: 'Use My Rank' },
  { value: 'unranked', label: 'Gray' },
  { value: 'bronze', label: 'Bronze' },
  { value: 'silver', label: 'Silver' },
  { value: 'gold', label: 'Gold' },
  { value: 'platinum', label: 'Platinum' },
  { value: 'diamond', label: 'Diamond' },
  { value: 'ruby', label: 'Ruby' },
];

export default function StudentSettings() {
  const { student, logout } = useStudentAuth();
  const { theme, setTheme } = useTheme();
  const { tier: currentTier } = useStudentTier();
  
  const [selectedTheme, setSelectedTheme] = useState<ThemeOption>(() => {
    const saved = localStorage.getItem('student_color_theme');
    return (saved as ThemeOption) || 'rank';
  });

  const linkedStudent = student?.linked_student as {
    first_name: string;
    last_name: string;
    school_name?: string;
    grade?: string;
  } | null;

  // Apply theme when selection changes
  useEffect(() => {
    localStorage.setItem('student_color_theme', selectedTheme);
    
    const tierToApply = selectedTheme === 'rank' ? currentTier : selectedTheme;
    const isDark = theme === 'dark';
    const themeSource = isDark ? TIER_THEME_HSL_DARK : TIER_THEME_HSL_LIGHT;
    const themeColors = themeSource[tierToApply];
    
    if (themeColors) {
      const root = document.documentElement;
      root.style.setProperty('--primary', themeColors.primary);
      root.style.setProperty('--ring', themeColors.primary);
      root.style.setProperty('--background', themeColors.background);
      root.style.setProperty('--card', themeColors.card);
      root.style.setProperty('--muted', themeColors.muted);
      root.style.setProperty('--border', themeColors.border);
      root.style.setProperty('--input', themeColors.border);
      
      // Update tier class
      TIER_ORDER.forEach(t => root.classList.remove(`tier-${t}`));
      root.classList.add(`tier-${tierToApply}`);
    }
  }, [selectedTheme, currentTier, theme]);

  const handleThemeSelect = (value: ThemeOption) => {
    setSelectedTheme(value);
  };

  const getDisplayColor = (option: ThemeOption): string => {
    if (option === 'rank') return TIER_COLORS[currentTier];
    return TIER_COLORS[option];
  };

  return (
    <div className="p-4 md:p-6 space-y-6 select-none">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Settings className="h-6 w-6" />
          Settings
        </h1>
        <p className="text-muted-foreground">
          Manage your account preferences
        </p>
      </div>

      {/* Profile Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <User className="h-4 w-4" />
            Profile
          </CardTitle>
          <CardDescription>Your account information</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">
                {linkedStudent 
                  ? `${linkedStudent.first_name} ${linkedStudent.last_name || ''}`
                  : 'Student'}
              </h3>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>Current Rank:</span>
                <span 
                  className="font-semibold"
                  style={{ color: TIER_COLORS[currentTier] }}
                >
                  {TIER_DISPLAY_NAMES[currentTier]}
                </span>
              </div>
            </div>
          </div>
          
          <Separator />
          
          <div className="space-y-3">
            <div className="flex items-center gap-3 text-sm">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <span>{student?.phone_number}</span>
            </div>
            {linkedStudent?.school_name && (
              <div className="flex items-center gap-3 text-sm">
                <School className="h-4 w-4 text-muted-foreground" />
                <span>{linkedStudent.school_name}</span>
              </div>
            )}
            {linkedStudent?.grade && (
              <div className="flex items-center gap-3 text-sm">
                <GraduationCap className="h-4 w-4 text-muted-foreground" />
                <span>Grade {linkedStudent.grade}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Appearance */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Palette className="h-4 w-4" />
            Appearance
          </CardTitle>
          <CardDescription>Customize how the app looks</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Dark Mode Toggle */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {theme === 'dark' ? (
                <Moon className="h-5 w-5" />
              ) : (
                <Sun className="h-5 w-5" />
              )}
              <div>
                <Label htmlFor="dark-mode">Dark Mode</Label>
                <p className="text-xs text-muted-foreground">
                  Use dark theme for better night visibility
                </p>
              </div>
            </div>
            <Switch
              id="dark-mode"
              checked={theme === 'dark'}
              onCheckedChange={(checked) => setTheme(checked ? 'dark' : 'light')}
            />
          </div>

          <Separator />

          {/* Color Theme Picker */}
          <div className="space-y-3">
            <div>
              <Label>Color Theme</Label>
              <p className="text-xs text-muted-foreground">
                Choose your preferred color scheme
              </p>
            </div>
            
            <div className="grid grid-cols-4 gap-2">
              {THEME_OPTIONS.map((option) => {
                const isSelected = selectedTheme === option.value;
                const color = getDisplayColor(option.value);
                const isLocked = option.value !== 'rank' && !isTierUnlocked(option.value as TierType, currentTier);
                
                return (
                  <button
                    key={option.value}
                    onClick={() => !isLocked && handleThemeSelect(option.value)}
                    disabled={isLocked}
                    className={cn(
                      "flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all relative",
                      isLocked && "opacity-50 cursor-not-allowed",
                      isSelected 
                        ? "border-primary bg-primary/5 ring-2 ring-primary/20" 
                        : !isLocked && "border-border hover:border-primary/50 hover:bg-muted/50",
                      isLocked && "border-border"
                    )}
                  >
                    <div className="relative">
                      <div 
                        className={cn(
                          "w-8 h-8 rounded-full shadow-md",
                          isLocked && "grayscale"
                        )}
                        style={{ backgroundColor: color }}
                      />
                      {option.value === 'rank' && (
                        <Sparkles 
                          className="absolute -top-1 -right-1 h-4 w-4 text-amber-500" 
                        />
                      )}
                      {isLocked && (
                        <Lock 
                          className="absolute -top-1 -right-1 h-4 w-4 text-muted-foreground" 
                        />
                      )}
                    </div>
                    <span className="text-[10px] font-medium text-center leading-tight">
                      {option.label}
                    </span>
                  </button>
                );
              })}
            </div>

            {selectedTheme === 'rank' && (
              <p className="text-xs text-muted-foreground text-center bg-muted/50 rounded-lg p-2">
                Theme will automatically change as you rank up! 🚀
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* About */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">About</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>SAT Practice Portal</p>
          <p>Tsetsegs Talent Agency</p>
          <p>Version 1.0.0</p>
        </CardContent>
      </Card>

      {/* Logout */}
      <Button 
        variant="destructive" 
        className="w-full"
        onClick={logout}
      >
        <LogOut className="h-4 w-4 mr-2" />
        Logout
      </Button>
    </div>
  );
}
