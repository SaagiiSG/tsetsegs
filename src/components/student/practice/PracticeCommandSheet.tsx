import { useNavigate, useLocation } from 'react-router-dom';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from '@/components/ui/command';
import {
  PlayCircle, BookOpen, Zap, Brain, BarChart3, Trophy, Languages, Armchair,
  User, Settings, FileText, Calculator, Bookmark, Home, RotateCcw, Star, Swords,
} from 'lucide-react';
import { usePracticeCommandSheet } from './PracticeCommandSheetContext';
import { usePracticeRecents } from '@/hooks/usePracticeRecents';
import { useHaptics } from '@/hooks/useHaptics';
import {
  toggleCalculator,
} from '@/components/student/DesmosCalculator';
import { toggleReferenceSheet } from '@/components/student/ReferenceSheet';

interface QuickRoute {
  path: string;
  label: string;
  icon: any;
  hint?: string;
  group: 'jump' | 'tools' | 'account';
}

const QUICK_ROUTES: QuickRoute[] = [
  { path: '/practice/home', label: 'Home', icon: Home, group: 'jump' },
  { path: '/practice/dashboard', label: 'Practice', icon: BookOpen, hint: 'Math + English sets', group: 'jump' },
  { path: '/practice/bluebook', label: 'Practice Tests', icon: FileText, group: 'jump' },
  { path: '/practice/speed', label: 'Speed Mode', icon: Zap, group: 'jump' },
  { path: '/practice/review', label: 'Review Queue', icon: Brain, hint: 'Spaced repetition', group: 'jump' },
  { path: '/practice/smart', label: 'Smart Practice', icon: Star, group: 'jump' },
  { path: '/practice/vocabulary', label: 'Vocabulary', icon: Languages, group: 'jump' },
  { path: '/practice/leaderboard', label: 'Leaderboard', icon: Trophy, group: 'jump' },
  { path: '/practice/booking', label: 'Book a Seat', icon: Armchair, group: 'tools' },
  { path: '/practice/stats', label: 'Statistics', icon: BarChart3, group: 'tools' },
  { path: '/practice/badges', label: 'Badges', icon: Star, group: 'tools' },
  { path: '/practice/profile', label: 'Profile', icon: User, group: 'account' },
  { path: '/practice/settings', label: 'Settings', icon: Settings, group: 'account' },
];

export function PracticeCommandSheet() {
  const { open, setOpen } = usePracticeCommandSheet();
  const navigate = useNavigate();
  const location = useLocation();
  const { recents, recordRoute } = usePracticeRecents();
  const haptics = useHaptics();

  const isOnQuestion = /\/practice\/(english\/)?question\//.test(location.pathname);

  const go = (path: string, label: string) => {
    haptics('light');
    recordRoute(path, label);
    setOpen(false);
    navigate(path);
  };

  const runTool = (fn: () => void) => {
    haptics('light');
    setOpen(false);
    // Defer so the dialog finishes closing before opening another overlay
    setTimeout(fn, 80);
  };

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Search practice, tools, questions…" />
      <CommandList className="max-h-[70vh]">
        <CommandEmpty>No matches.</CommandEmpty>

        {(recents.lastQuestionId || recents.lastSet) && (
          <>
            <CommandGroup heading="Resume">
              {recents.lastQuestionId && (
                <CommandItem
                  onSelect={() =>
                    go(`/practice/question/${recents.lastQuestionId}`, 'Last question')
                  }
                >
                  <PlayCircle className="mr-2 h-4 w-4" />
                  <span>Last question</span>
                  {recents.lastQuestionLabel && (
                    <span className="ml-auto text-xs text-muted-foreground">
                      {recents.lastQuestionLabel}
                    </span>
                  )}
                </CommandItem>
              )}
              {recents.lastCategoryName && (
                <CommandItem
                  onSelect={() => go('/practice/dashboard', 'Practice')}
                >
                  <BookOpen className="mr-2 h-4 w-4" />
                  <span>Continue {recents.lastCategoryName}</span>
                </CommandItem>
              )}
            </CommandGroup>
            <CommandSeparator />
          </>
        )}

        <CommandGroup heading="Quick Jump">
          {QUICK_ROUTES.filter((r) => r.group === 'jump').map((r) => (
            <CommandItem key={r.path} onSelect={() => go(r.path, r.label)}>
              <r.icon className="mr-2 h-4 w-4" />
              <span>{r.label}</span>
              {r.hint && (
                <span className="ml-auto text-xs text-muted-foreground">{r.hint}</span>
              )}
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Tools">
          {isOnQuestion && (
            <>
              <CommandItem onSelect={() => runTool(toggleCalculator)}>
                <Calculator className="mr-2 h-4 w-4" />
                <span>Toggle Calculator</span>
                <CommandShortcut>⌥C</CommandShortcut>
              </CommandItem>
              <CommandItem onSelect={() => runTool(toggleReferenceSheet)}>
                <Bookmark className="mr-2 h-4 w-4" />
                <span>Reference Sheet</span>
              </CommandItem>
            </>
          )}
          {QUICK_ROUTES.filter((r) => r.group === 'tools').map((r) => (
            <CommandItem key={r.path} onSelect={() => go(r.path, r.label)}>
              <r.icon className="mr-2 h-4 w-4" />
              <span>{r.label}</span>
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Account">
          {QUICK_ROUTES.filter((r) => r.group === 'account').map((r) => (
            <CommandItem key={r.path} onSelect={() => go(r.path, r.label)}>
              <r.icon className="mr-2 h-4 w-4" />
              <span>{r.label}</span>
            </CommandItem>
          ))}
        </CommandGroup>

        {recents.recentRoutes && recents.recentRoutes.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Recent">
              {recents.recentRoutes.map((r) => (
                <CommandItem key={r.path} onSelect={() => go(r.path, r.label)}>
                  <RotateCcw className="mr-2 h-4 w-4 text-muted-foreground" />
                  <span>{r.label}</span>
                  <span className="ml-auto text-xs text-muted-foreground">{r.path}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}
      </CommandList>
    </CommandDialog>
  );
}
