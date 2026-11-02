import { describe, it, expect, beforeEach } from 'vitest';
import { sortModules, nextStep, sectionLabel, remainingSeconds, timerShown, formatClock, answerPreview, toggleLetter, readLocal, writeLocal, createSaveQueue, nextZoom, startModuleClock } from './bluebookTest';

const rw1 = { id: 'r1', section: 'reading_writing', module_number: 1 };
const rw2 = { id: 'r2', section: 'reading_writing', module_number: 2 };
const m1 = { id: 'm1', section: 'math', module_number: 1 };
const m2 = { id: 'm2', section: 'math', module_number: 2 };

describe('module flow', () => {
  it('orders reading & writing before math', () => expect(sortModules([m2, rw2, m1, rw1]).map(m => m.id)).toEqual(['r1', 'r2', 'm1', 'm2']));
  it('same section goes to This Module Is Over', () => expect(nextStep([m1, m2], 'm1')).toEqual({ kind: 'same-section', moduleId: 'm2' }));
  it('reading & writing into math is a break', () => expect(nextStep([rw1, rw2, m1, m2], 'r2')).toEqual({ kind: 'break', moduleId: 'm1' }));
  it('last module finishes', () => expect(nextStep([m1, m2], 'm2')).toEqual({ kind: 'finish' }));
  it('math-only tests call math section 1', () => expect(sectionLabel([m1, m2], m2)).toBe('Section 1, Module 2: Math'));
  it('full tests call math section 2', () => expect(sectionLabel([rw1, rw2, m1, m2], m1)).toBe('Section 2, Module 1: Math'));
  it('reading & writing label', () => expect(sectionLabel([rw1, rw2, m1, m2], rw1)).toBe('Section 1, Module 1: Reading and Writing'));
});

describe('timer', () => {
  const t0 = Date.parse('2026-11-01T10:00:00Z');
  it('is not running before the clock starts', () => expect(remainingSeconds(null, 35, t0)).toBeNull());
  it('counts from the saved start, so a refresh keeps time', () => expect(remainingSeconds('2026-11-01T10:00:00Z', 35, t0 + 61_500)).toBe(2038));
  it('never goes below zero', () => expect(remainingSeconds('2026-11-01T09:00:00Z', 35, t0)).toBe(0));
  it('hidden timer shows itself at 5:00', () => { expect(timerShown(true, 301)).toBe(false); expect(timerShown(true, 300)).toBe(true); });
  it('formats like Bluebook', () => { expect(formatClock(2100)).toBe('35:00'); expect(formatClock(591)).toBe('9:51'); expect(formatClock(0)).toBe('0:00'); });
});

describe('answer preview', () => {
  it('typesets fractions', () => expect(answerPreview('3/343')).toBe('$\\frac{3}{343}$'));
  it('keeps the minus outside', () => expect(answerPreview('-7/2')).toBe('$-\\frac{7}{2}$'));
  it('leaves decimals alone', () => expect(answerPreview('3.5')).toBe('3.5'));
  it('empty stays empty', () => expect(answerPreview('')).toBe(''));
});

describe('cross-out list and storage', () => {
  it('toggles a letter', () => { expect(toggleLetter([], 'A')).toEqual(['A']); expect(toggleLetter(['A', 'C'], 'A')).toEqual(['C']); });
  beforeEach(() => { const m = new Map<string, string>(); (globalThis as any).localStorage = { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v) }; });
  it('round-trips', () => { writeLocal('k', ['B']); expect(readLocal('k', [])).toEqual(['B']); });
  it('falls back when storage throws', () => { (globalThis as any).localStorage = { getItem: () => { throw new Error('blocked'); }, setItem: () => { throw new Error('blocked'); } }; expect(readLocal('k', ['x'])).toEqual(['x']); expect(() => writeLocal('k', 1)).not.toThrow(); });
});

describe('save queue', () => {
  const row = (answer: string, q = 'q1') => ({ questionId: q, moduleId: 'm1', answer, isMarked: false, timeSpent: 1 });
  it('sends only the first and the latest value while typing fast', async () => {
    const sent: string[] = []; let release!: () => void;
    const save = (r: any) => { sent.push(r.answer); return sent.length === 1 ? new Promise<void>(res => (release = res)) : Promise.resolve(); };
    const q = createSaveQueue(save);
    q.push(row('3')); q.push(row('3/')); q.push(row('3/3'));
    release(); await q.flush();
    expect(sent).toEqual(['3', '3/3']);
  });
  it('different questions save independently', async () => {
    const sent: string[] = []; const q = createSaveQueue(async r => void sent.push(r.questionId));
    q.push(row('A', 'q1')); q.push(row('B', 'q2')); await q.flush();
    expect(sent.sort()).toEqual(['q1', 'q2']);
  });
  it('retries a failed save', async () => {
    let calls = 0; const q = createSaveQueue(async () => { if (++calls === 1) throw new Error('offline'); }, 1);
    q.push(row('A')); await q.flush();
    expect(calls).toBe(2); expect(q.pending()).toBe(0);
  });
  it('flush rejects when saving keeps failing, and keeps the row', async () => {
    const q = createSaveQueue(async () => { throw new Error('offline'); }, 1);
    q.push(row('A'));
    await expect(q.flush()).rejects.toThrow();
    expect(q.pending()).toBe(1);
  });
});

describe('figure zoom', () => {
  it('zoom steps 25% between 50 and 200', () => { expect(nextZoom(100, 1)).toBe(125); expect(nextZoom(200, 1)).toBe(200); expect(nextZoom(50, -1)).toBe(50); expect(nextZoom(75, -1)).toBe(50); });
});

describe('module clock', () => {
  // A chainable stand-in for the Supabase client that records each call.
  const fakeClient = (stored: string) => {
    const calls: Array<[string, unknown[]]> = [];
    const chain: any = new Proxy({}, {
      get: (_t, name: string) => {
        if (name === 'then') return (res: (v: unknown) => void) => res(calls.some(([n]) => n === 'single') ? { data: { module_started_at: stored }, error: null } : { error: null });
        return (...args: unknown[]) => { calls.push([name, args]); return chain; };
      },
    });
    return { client: { from: (t: string) => { calls.push(['from', [t]]); return chain; } }, calls };
  };
  it('writes the start only if nobody has, then returns the stored start', async () => {
    const { client, calls } = fakeClient('2026-11-01T10:00:00Z');
    expect(await startModuleClock(client, 'a1')).toBe('2026-11-01T10:00:00Z');
    const update = calls.find(([n]) => n === 'update');
    expect(Object.keys(update[1][0] as object)).toEqual(['module_started_at']);
    expect(calls).toContainEqual(['is', ['module_started_at', null]]);
    expect(calls).toContainEqual(['eq', ['id', 'a1']]);
  });
});
