// Lightweight global store for the currently-active math question context.
// Math question pages call setDesmosContext({ questionId, context }) on mount
// and clearDesmosContext() on unmount/question change. The DesmosCalculator
// reads this when the student opens it so we can attribute usage time.

export type DesmosContextValue = {
  questionId: string | null;
  context: 'practice' | 'speed' | 'bluebook' | null;
};

let current: DesmosContextValue = { questionId: null, context: null };

export function setDesmosContext(value: DesmosContextValue) {
  current = value;
}

export function clearDesmosContext() {
  current = { questionId: null, context: null };
}

export function getDesmosContext(): DesmosContextValue {
  return current;
}
