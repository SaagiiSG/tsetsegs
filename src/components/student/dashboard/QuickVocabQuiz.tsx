import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, Check, X, RotateCw, Play, Languages, ChevronRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useStudentAuth } from '@/contexts/StudentAuthContext';
import { cn } from '@/lib/utils';

type Mode = 'flashcards' | 'eng_to_mn' | 'mn_to_eng';
type Source = 'all' | 'unlearned' | 'recent';
type Length = 5 | 10 | 20;

interface Word { id: string; english: string; mongolian: string }

const PREF_KEY = 'quick_vocab_prefs_v1';

export function QuickVocabQuiz() {
  const { student } = useStudentAuth();
  const [running, setRunning] = useState(false);
  const [mode, setMode] = useState<Mode>('flashcards');
  const [source, setSource] = useState<Source>('unlearned');
  const [length, setLength] = useState<Length>(10);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(PREF_KEY);
      if (raw) {
        const p = JSON.parse(raw);
        if (p.mode) setMode(p.mode);
        if (p.source) setSource(p.source);
        if (p.length) setLength(p.length);
      }
    } catch {}
  }, []);

  useEffect(() => {
    try { localStorage.setItem(PREF_KEY, JSON.stringify({ mode, source, length })); } catch {}
  }, [mode, source, length]);

  return (
    <Card className="h-full overflow-hidden">
      <CardContent className="p-3 sm:p-4 h-full flex flex-col">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center">
              <BookOpen className="h-4 w-4 text-primary" />
            </div>
            <span className="text-sm font-semibold">Quick Vocab</span>
          </div>
          {!running && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs text-muted-foreground"
              onClick={() => window.location.assign('/practice/vocabulary')}
            >
              Full deck <ChevronRight className="h-3 w-3 ml-0.5" />
            </Button>
          )}
        </div>

        <AnimatePresence mode="wait">
          {!running ? (
            <motion.div
              key="setup"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1 flex flex-col gap-3"
            >
              <SelectorRow<Mode>
                label="Mode"
                value={mode}
                onChange={setMode}
                options={[
                  { value: 'flashcards', label: 'Flashcards' },
                  { value: 'eng_to_mn', label: 'EN → MN' },
                  { value: 'mn_to_eng', label: 'MN → EN' },
                ]}
              />
              <SelectorRow<Source>
                label="Source"
                value={source}
                onChange={setSource}
                options={[
                  { value: 'unlearned', label: 'New' },
                  { value: 'recent', label: 'Recently learned' },
                  { value: 'all', label: 'All' },
                ]}
              />
              <SelectorRow<Length>
                label="Length"
                value={length}
                onChange={(v) => setLength(v as Length)}
                options={[
                  { value: 5, label: '5' },
                  { value: 10, label: '10' },
                  { value: 20, label: '20' },
                ]}
              />
              <div className="flex-1" />
              <Button onClick={() => setRunning(true)} className="w-full" size="lg">
                <Play className="h-4 w-4 mr-2" />
                Start quiz
              </Button>
            </motion.div>
          ) : (
            <QuizRunner
              key="quiz"
              mode={mode}
              source={source}
              length={length}
              studentId={student?.id}
              onExit={() => setRunning(false)}
            />
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}

function SelectorRow<T extends string | number>({
  label, value, onChange, options,
}: {
  label: string;
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
}) {
  return (
    <div>
      <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">{label}</div>
      <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${options.length}, 1fr)` }}>
        {options.map((opt) => (
          <button
            key={String(opt.value)}
            type="button"
            onClick={() => onChange(opt.value)}
            className={cn(
              'px-2 py-2 rounded-md border text-xs font-medium transition-all',
              value === opt.value
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-border text-muted-foreground hover:border-primary/40 hover:text-foreground'
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function QuizRunner({
  mode, source, length, studentId, onExit,
}: {
  mode: Mode; source: Source; length: Length; studentId?: string; onExit: () => void;
}) {
  const { data: deck, isLoading } = useQuery({
    queryKey: ['vocab-quiz-deck', studentId, source, length],
    enabled: !!studentId,
    queryFn: async (): Promise<{ words: Word[]; pool: Word[] }> => {
      // Math vocabulary
      const { data: allWords } = await supabase
        .from('vocabulary_words')
        .select('id, english, mongolian')
        .eq('is_active', true)
        .eq('subject', 'math');
      const pool = (allWords || []) as Word[];

      // Learned words
      const { data: progress } = await supabase
        .from('student_vocabulary_progress')
        .select('word_id, learned_at')
        .eq('student_account_id', studentId!)
        .order('learned_at', { ascending: false });

      const learnedIds = new Set(progress?.map((p) => p.word_id) || []);
      let chosen: Word[] = [];
      if (source === 'unlearned') {
        chosen = pool.filter((w) => !learnedIds.has(w.id));
      } else if (source === 'recent') {
        const orderedIds = progress?.map((p) => p.word_id) || [];
        chosen = orderedIds.map((id) => pool.find((w) => w.id === id)).filter(Boolean) as Word[];
      } else {
        chosen = pool;
      }

      // Shuffle and slice
      chosen = chosen.slice().sort(() => Math.random() - 0.5).slice(0, length);
      return { words: chosen, pool };
    },
  });

  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [correct, setCorrect] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);

  const words = deck?.words ?? [];
  const pool = deck?.pool ?? [];
  const current = words[idx];

  // Build distractors for MCQ modes
  const choices = (() => {
    if (!current || mode === 'flashcards' || pool.length < 4) return [] as { id: string; text: string }[];
    const correctText = mode === 'eng_to_mn' ? current.mongolian : current.english;
    const distractors = pool
      .filter((w) => w.id !== current.id)
      .sort(() => Math.random() - 0.5)
      .slice(0, 3)
      .map((w) => ({ id: w.id, text: mode === 'eng_to_mn' ? w.mongolian : w.english }));
    return [{ id: current.id, text: correctText }, ...distractors].sort(() => Math.random() - 0.5);
  })();

  const handleAnswer = (id: string) => {
    if (picked !== null) return;
    setPicked(id);
    if (id === current.id) setCorrect((c) => c + 1);
  };

  const next = () => {
    setFlipped(false);
    setPicked(null);
    if (idx + 1 >= words.length) {
      // done
      setIdx(words.length); // triggers done state
    } else {
      setIdx((i) => i + 1);
    }
  };

  if (isLoading) {
    return (
      <motion.div
        key="loading"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        className="flex-1 flex items-center justify-center text-xs text-muted-foreground"
      >
        Loading words…
      </motion.div>
    );
  }

  if (!words.length) {
    return (
      <motion.div
        key="empty"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        className="flex-1 flex flex-col items-center justify-center text-xs text-muted-foreground gap-3"
      >
        <Languages className="h-8 w-8 opacity-40" />
        <div>No words available for this filter.</div>
        <Button variant="outline" size="sm" onClick={onExit}>Back</Button>
      </motion.div>
    );
  }

  if (idx >= words.length) {
    return (
      <motion.div
        key="done"
        initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
        className="flex-1 flex flex-col items-center justify-center gap-3"
      >
        <div className="text-4xl">🎉</div>
        <div className="font-mono font-bold text-2xl">{correct}/{words.length}</div>
        <div className="text-xs text-muted-foreground">
          {mode === 'flashcards' ? 'Nice run.' : `${Math.round((correct / words.length) * 100)}% accuracy`}
        </div>
        <div className="flex gap-2 mt-2">
          <Button variant="outline" size="sm" onClick={onExit}>Settings</Button>
          <Button size="sm" onClick={() => { setIdx(0); setCorrect(0); setPicked(null); setFlipped(false); }}>
            <RotateCw className="h-3 w-3 mr-1" />
            Again
          </Button>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      key={`q-${idx}`}
      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      className="flex-1 flex flex-col"
    >
      <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-2">
        <span>{idx + 1} / {words.length}</span>
        <button onClick={onExit} className="hover:text-foreground transition-colors">Exit</button>
      </div>

      {mode === 'flashcards' ? (
        <button
          type="button"
          onClick={() => setFlipped((f) => !f)}
          className="flex-1 min-h-[140px] rounded-xl border-2 border-dashed border-primary/30 bg-primary/5 flex flex-col items-center justify-center p-4 hover:bg-primary/10 transition-colors"
        >
          <span className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1.5">
            {flipped ? 'Mongolian' : 'English'}
          </span>
          <span className="font-bold text-xl text-center">
            {flipped ? current.mongolian : current.english}
          </span>
          <span className="text-[10px] text-muted-foreground mt-3">Tap to flip</span>
        </button>
      ) : (
        <>
          <div className="rounded-xl bg-muted/30 p-3 mb-3 text-center">
            <span className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1 block">
              {mode === 'eng_to_mn' ? 'English' : 'Mongolian'}
            </span>
            <span className="font-bold text-lg">
              {mode === 'eng_to_mn' ? current.english : current.mongolian}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2 flex-1">
            {choices.map((c) => {
              const isCorrect = c.id === current.id;
              const isPicked = picked === c.id;
              const showState = picked !== null;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => handleAnswer(c.id)}
                  className={cn(
                    'rounded-lg border p-2 text-sm transition-all flex items-center justify-center text-center min-h-[56px]',
                    !showState && 'hover:border-primary/40 hover:bg-primary/5',
                    showState && isCorrect && 'border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
                    showState && isPicked && !isCorrect && 'border-red-500 bg-red-500/10 text-red-700 dark:text-red-300',
                    showState && !isPicked && !isCorrect && 'opacity-50'
                  )}
                >
                  {c.text}
                  {showState && isCorrect && <Check className="inline h-3 w-3 ml-1.5" />}
                  {showState && isPicked && !isCorrect && <X className="inline h-3 w-3 ml-1.5" />}
                </button>
              );
            })}
          </div>
        </>
      )}

      <div className="mt-3 flex justify-end">
        <Button
          size="sm"
          onClick={next}
          disabled={mode !== 'flashcards' && picked === null}
          variant={mode === 'flashcards' ? 'outline' : 'default'}
        >
          {idx + 1 >= words.length ? 'Finish' : 'Next'}
        </Button>
      </div>
    </motion.div>
  );
}
