import { useCallback, useEffect, useState } from 'react';

const KEY = 'practice:recents:v1';

export interface PracticeRecents {
  lastQuestionId?: string;
  lastQuestionLabel?: string;
  lastSet?: 'CB' | '68' | '150' | 'english';
  lastCategoryId?: string;
  lastCategoryName?: string;
  recentRoutes?: { path: string; label: string; at: number }[];
}

const read = (): PracticeRecents => {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '{}');
  } catch {
    return {};
  }
};

const write = (val: PracticeRecents) => {
  try {
    localStorage.setItem(KEY, JSON.stringify(val));
    window.dispatchEvent(new CustomEvent('practice:recents:changed'));
  } catch {
    /* ignore */
  }
};

export function usePracticeRecents() {
  const [state, setState] = useState<PracticeRecents>(() => read());

  useEffect(() => {
    const onChange = () => setState(read());
    window.addEventListener('practice:recents:changed', onChange);
    window.addEventListener('storage', onChange);
    return () => {
      window.removeEventListener('practice:recents:changed', onChange);
      window.removeEventListener('storage', onChange);
    };
  }, []);

  const recordQuestion = useCallback((id: string, label?: string) => {
    const cur = read();
    write({ ...cur, lastQuestionId: id, lastQuestionLabel: label });
  }, []);

  const recordSet = useCallback((set: PracticeRecents['lastSet']) => {
    const cur = read();
    write({ ...cur, lastSet: set });
  }, []);

  const recordCategory = useCallback((id: string, name: string) => {
    const cur = read();
    write({ ...cur, lastCategoryId: id, lastCategoryName: name });
  }, []);

  const recordRoute = useCallback((path: string, label: string) => {
    const cur = read();
    const filtered = (cur.recentRoutes || []).filter((r) => r.path !== path);
    const next = [{ path, label, at: Date.now() }, ...filtered].slice(0, 6);
    write({ ...cur, recentRoutes: next });
  }, []);

  return { recents: state, recordQuestion, recordSet, recordCategory, recordRoute };
}
