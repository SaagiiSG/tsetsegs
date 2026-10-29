import { useEffect, useState } from 'react';

type Doc = Pick<Document, 'querySelector'>;

/** Pop-ups that open by themselves take turns: one at a time, never over a live class game, another dialog or a timed run. */
let holder: string | null = null;

/** `data-popup-hold` marks a screen a pop-up must not cover, like a running speed run or practice test. */
export function screenBusy(doc: Doc): boolean {
  return !!doc.querySelector('[aria-label="Live session"], [role="dialog"], [role="alertdialog"], [data-popup-hold]');
}

export function tryClaimPopup(owner: string, doc: Doc = document): boolean {
  if (holder === owner) return true;
  if (holder !== null || screenBusy(doc)) return false;
  holder = owner;
  return true;
}

export function releasePopup(owner: string): void {
  if (holder === owner) holder = null;
}

/** Claims now or on the first tick the screen is clear, then calls `onTurn` once. The returned stop clears the poll and gives the turn back (only if `owner` holds it). */
export function pollForTurn(owner: string, onTurn: () => void, everyMs: number, doc: Doc = document): () => void {
  const claim = () => { const ok = tryClaimPopup(owner, doc); if (ok) onTurn(); return ok; };
  const t = claim() ? undefined : setInterval(() => { if (claim()) clearInterval(t); }, everyMs);
  return () => { clearInterval(t); releasePopup(owner); };
}

/** True once `owner` holds the turn; asks while it wants one, and gives it back when it stops wanting it or unmounts. */
export function usePopupTurn(owner: string, wants: boolean, everyMs = 1500): boolean {
  const [turn, setTurn] = useState(false);
  useEffect(() => {
    if (!wants) return;
    const stop = pollForTurn(owner, () => setTurn(true), everyMs);
    return () => { stop(); setTurn(false); };
  }, [owner, wants, everyMs]);
  return wants && turn;
}
