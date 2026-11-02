// Pure helpers for the Bluebook practice test. Kept free of React and Supabase so they can be tested in node.

export type FlowModule = { id: string; section: string; module_number: number };

export type NextStep =
  | { kind: 'same-section'; moduleId: string }
  | { kind: 'break'; moduleId: string }
  | { kind: 'finish' };

/** Reading & Writing before Math, then by module number. */
export function sortModules<T extends FlowModule>(m: T[]): T[] {
  return [...m].sort((a, b) => {
    if (a.section !== b.section) return a.section === 'reading_writing' ? -1 : 1;
    return a.module_number - b.module_number;
  });
}

export function nextStep(modules: FlowModule[], currentId: string): NextStep {
  const sorted = sortModules(modules);
  const i = sorted.findIndex(m => m.id === currentId);
  const next = sorted[i + 1];
  if (i < 0 || !next) return { kind: 'finish' };
  return next.section === sorted[i].section
    ? { kind: 'same-section', moduleId: next.id }
    : { kind: 'break', moduleId: next.id };
}

/** "Section N, Module M: Math". N is the section's position in this test, so a Math-only test is section 1. */
export function sectionLabel(modules: FlowModule[], current: FlowModule): string {
  const sections = [...new Set(sortModules(modules).map(m => m.section))];
  const n = sections.indexOf(current.section) + 1;
  const name = current.section === 'reading_writing' ? 'Reading and Writing' : 'Math';
  return `Section ${n}, Module ${current.module_number}: ${name}`;
}

/** Seconds left from the saved start, so a refresh keeps time. Null until the clock starts. */
export function remainingSeconds(startedAt: string | null, limitMinutes: number, now: number): number | null {
  if (!startedAt) return null;
  return Math.max(0, Math.floor(limitMinutes * 60 - (now - Date.parse(startedAt)) / 1000));
}

/** Bluebook un-hides the timer for the last five minutes. */
export function timerShown(hidden: boolean, remaining: number | null): boolean {
  return !hidden || (remaining !== null && remaining <= 300);
}

export function formatClock(seconds: number): string {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

/** MathText input for a typed grid-in answer: "3/4" becomes a fraction, anything else is shown as typed. */
export function answerPreview(raw: string): string {
  const m = raw.match(/^(-?)(\d*\.?\d+)\/(\d*\.?\d+)$/);
  return m ? `$${m[1]}\\frac{${m[2]}}{${m[3]}}$` : raw;
}

export function toggleLetter(list: string[], letter: string): string[] {
  return list.includes(letter) ? list.filter(l => l !== letter) : [...list, letter];
}

export function readLocal<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw === null ? fallback : JSON.parse(raw);
  } catch {
    return fallback;
  }
}

export function writeLocal(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Private mode or full storage: cross-outs just don't persist.
  }
}

export const crossOutKey = (attemptId: string, questionId: string) => `bb:x:${attemptId}:${questionId}`;

export type SaveRow = { questionId: string; moduleId: string; answer: string | null; isMarked: boolean; timeSpent: number };

/**
 * One save in flight per question; a newer row replaces any waiting one, so the last value typed is the one saved.
 * A failed row stays pending and retries every `retryMs` until it lands. `flush` waits for everything and rejects
 * if a row still fails after one more try, so finishing never drops an answer silently.
 */
export function createSaveQueue(save: (row: SaveRow) => Promise<void>, retryMs = 2000) {
  type Slot = { inFlight: Promise<void> | null; next: SaveRow | null };
  const slots = new Map<string, Slot>();

  const run = (slot: Slot) => {
    const row = slot.next;
    slot.next = null;
    slot.inFlight = new Promise<void>(res => res(save(row))).then(
      () => {
        slot.inFlight = null;
        if (slot.next) run(slot);
      },
      () => {
        slot.inFlight = null;
        if (!slot.next) slot.next = row;
        setTimeout(() => { if (!slot.inFlight && slot.next) run(slot); }, retryMs);
      },
    );
  };

  return {
    push(row: SaveRow) {
      let slot = slots.get(row.questionId);
      if (!slot) slots.set(row.questionId, (slot = { inFlight: null, next: null }));
      slot.next = row;
      if (!slot.inFlight) run(slot);
    },
    async flush() {
      let retried = false;
      for (;;) {
        const busy = [...slots.values()].filter(s => s.inFlight);
        if (busy.length) { await Promise.all(busy.map(s => s.inFlight)); continue; }
        const waiting = [...slots.values()].filter(s => s.next);
        if (!waiting.length) return;
        if (retried) throw new Error(`${waiting.length} answer(s) did not save`);
        retried = true;
        waiting.forEach(run);
      }
    },
    pending: () => [...slots.values()].filter(s => s.inFlight || s.next).length,
  };
}

/** Figure zoom steps 25% at a time, between 50% and 200%. */
export const nextZoom = (z: number, dir: 1 | -1) => Math.min(200, Math.max(50, z + dir * 25));

/**
 * Start the module clock once the questions are on screen. Only the first writer wins (`is null`), so a
 * second tab or a refresh can't reset the time; the stored start is returned either way.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- the generated client type isn't needed for two calls
export async function startModuleClock(client: any, attemptId: string): Promise<string> {
  const { error } = await client.from('bluebook_attempts')
    .update({ module_started_at: new Date().toISOString() })
    .eq('id', attemptId)
    .is('module_started_at', null);
  if (error) throw error;
  const { data, error: readError } = await client.from('bluebook_attempts')
    .select('module_started_at').eq('id', attemptId).single();
  if (readError) throw readError;
  return data.module_started_at;
}
