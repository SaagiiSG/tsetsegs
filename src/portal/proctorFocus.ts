// A blur into the Desmos iframe is a calculator click, not leaving the test.
export function countsAsFocusLoss(event: 'blur' | 'hidden', activeElementTag: string | undefined): boolean {
  return event === 'hidden' || activeElementTag !== 'IFRAME';
}

// Blur and hidden both fire on one tab switch: count once per away period, reset when the student is back.
export function awayStep(away: boolean, event: 'blur' | 'hidden' | 'back', activeElementTag: string | undefined): { away: boolean; counted: boolean } {
  if (event === 'back') return { away: false, counted: false };
  if (away || !countsAsFocusLoss(event, activeElementTag)) return { away, counted: false };
  return { away: true, counted: true };
}
