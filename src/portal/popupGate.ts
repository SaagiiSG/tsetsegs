import { useEffect, useState } from 'react';

/** Pop-ups that open by themselves take turns: one at a time, never over a live class game or another dialog. */
let holder: string | null = null;

export function screenBusy(doc: Pick<Document, 'querySelector'>): boolean {
  return !!doc.querySelector('[aria-label="Live session"], [role="dialog"], [role="alertdialog"]');
}

export function tryClaimPopup(owner: string, doc: Pick<Document, 'querySelector'> = document): boolean {
  if (holder === owner) return true;
  if (holder !== null || screenBusy(doc)) return false;
  holder = owner;
  return true;
}

export function releasePopup(owner: string): void {
  if (holder === owner) holder = null;
}

/** True once `owner` holds the turn; asks again every `everyMs` while it wants one, and gives it back when it stops wanting it or unmounts. */
export function usePopupTurn(owner: string, wants: boolean, everyMs = 1500): boolean {
  const [turn, setTurn] = useState(false);
  useEffect(() => {
    if (!wants) return;
    const claim = () => { const ok = tryClaimPopup(owner); if (ok) setTurn(true); return ok; };
    const t = claim() ? undefined : setInterval(() => { if (claim()) clearInterval(t); }, everyMs);
    return () => { clearInterval(t); releasePopup(owner); setTurn(false); };
  }, [owner, wants, everyMs]);
  return wants && turn;
}
