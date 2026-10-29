import { afterEach, describe, expect, it, vi } from 'vitest';
import { pollForTurn, releasePopup, screenBusy, tryClaimPopup } from './popupGate';

const doc = (busy: (sel: string) => boolean) => ({ querySelector: (sel: string) => (busy(sel) ? ({} as Element) : null) }) as Pick<Document, 'querySelector'>;
const clear = doc(() => false);

describe('popupGate', () => {
  afterEach(() => { ['a', 'b', 'c'].forEach(releasePopup); vi.useRealTimers(); });

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

  it('blocked by an alert dialog', () => {
    expect(screenBusy(doc(sel => sel.includes('[role="alertdialog"]')))).toBe(true);
  });

  it('held by a hold marker', () => {
    const held = doc(sel => sel.includes('[data-popup-hold]'));
    expect(screenBusy(held)).toBe(true);
    expect(tryClaimPopup('a', held)).toBe(false);
  });

  it('second owner waits', () => {
    expect(tryClaimPopup('a', clear)).toBe(true);
    expect(tryClaimPopup('b', clear)).toBe(false);
  });

  it('the holder can claim again over its own dialog', () => {
    expect(tryClaimPopup('a', clear)).toBe(true);
    expect(tryClaimPopup('a', doc(() => true))).toBe(true);
  });

  it('release lets the next one in', () => {
    expect(tryClaimPopup('a', clear)).toBe(true);
    releasePopup('b');
    expect(tryClaimPopup('b', clear)).toBe(false);
    releasePopup('a');
    expect(tryClaimPopup('b', clear)).toBe(true);
  });
});

describe('pollForTurn', () => {
  afterEach(() => { ['a', 'b', 'c'].forEach(releasePopup); vi.useRealTimers(); });

  it('waits while the screen is busy, then claims on the first tick after it clears', () => {
    vi.useFakeTimers();
    let busy = true;
    const onTurn = vi.fn();
    const stop = pollForTurn('a', onTurn, 1000, doc(() => busy));
    vi.advanceTimersByTime(3000);
    expect(onTurn).not.toHaveBeenCalled();
    busy = false;
    vi.advanceTimersByTime(1000);
    expect(onTurn).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(5000);
    expect(onTurn).toHaveBeenCalledTimes(1);
    stop();
  });

  it('stop lets another owner claim', () => {
    vi.useFakeTimers();
    const onTurn = vi.fn();
    const stop = pollForTurn('a', onTurn, 1000, clear);
    expect(onTurn).toHaveBeenCalledTimes(1);
    expect(tryClaimPopup('b', clear)).toBe(false);
    stop();
    expect(tryClaimPopup('b', clear)).toBe(true);
  });

  it("stop before a claim doesn't release someone else's turn", () => {
    vi.useFakeTimers();
    expect(tryClaimPopup('b', clear)).toBe(true);
    const onTurn = vi.fn();
    const stop = pollForTurn('a', onTurn, 1000, clear);
    vi.advanceTimersByTime(2000);
    stop();
    expect(onTurn).not.toHaveBeenCalled();
    expect(tryClaimPopup('c', clear)).toBe(false);
    vi.advanceTimersByTime(5000);
    expect(onTurn).not.toHaveBeenCalled();
  });
});
