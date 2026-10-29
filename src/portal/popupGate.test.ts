import { afterEach, describe, expect, it } from 'vitest';
import { releasePopup, screenBusy, tryClaimPopup } from './popupGate';

const doc = (busy: (sel: string) => boolean) => ({ querySelector: (sel: string) => (busy(sel) ? ({} as Element) : null) }) as Pick<Document, 'querySelector'>;
const clear = doc(() => false);

describe('popupGate', () => {
  afterEach(() => { releasePopup('a'); releasePopup('b'); });

  it('blocked by live session', () => {
    const live = doc(sel => sel.includes('[aria-label="Live session"]'));
    expect(screenBusy(live)).toBe(true);
    expect(tryClaimPopup('a', live)).toBe(false);
  });

  it('blocked by open dialog', () => {
    const dialog = doc(sel => sel.includes('[role="dialog"]'));
    expect(screenBusy(dialog)).toBe(true);
    expect(tryClaimPopup('a', dialog)).toBe(false);
    expect(screenBusy(clear)).toBe(false);
  });

  it('second owner waits', () => {
    expect(tryClaimPopup('a', clear)).toBe(true);
    expect(tryClaimPopup('b', clear)).toBe(false);
  });

  it('release lets the next one in', () => {
    expect(tryClaimPopup('a', clear)).toBe(true);
    releasePopup('b');
    expect(tryClaimPopup('b', clear)).toBe(false);
    releasePopup('a');
    expect(tryClaimPopup('b', clear)).toBe(true);
  });
});
