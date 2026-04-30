import { createContext, useCallback, useContext, useEffect, useState, ReactNode } from 'react';

interface CommandSheetContextValue {
  open: boolean;
  setOpen: (open: boolean) => void;
  toggle: () => void;
}

const Ctx = createContext<CommandSheetContextValue | null>(null);

export function PracticeCommandSheetProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const toggle = useCallback(() => setOpen((o) => !o), []);

  // ⌘K / Ctrl+K to toggle
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        toggle();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [toggle]);

  return <Ctx.Provider value={{ open, setOpen, toggle }}>{children}</Ctx.Provider>;
}

export function usePracticeCommandSheet() {
  const v = useContext(Ctx);
  if (!v) throw new Error('usePracticeCommandSheet must be used inside PracticeCommandSheetProvider');
  return v;
}
