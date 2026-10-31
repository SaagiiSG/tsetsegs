// A blur into the Desmos iframe is a calculator click, not leaving the test.
export function countsAsFocusLoss(event: 'blur' | 'hidden', activeElementTag: string | undefined): boolean {
  return event === 'hidden' || activeElementTag !== 'IFRAME';
}
