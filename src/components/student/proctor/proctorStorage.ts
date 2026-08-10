import type { PaperRow } from './ProctorRunner';

export interface ProctorSnapshot {
  module: number;
  qIdx: number;
  answers: Record<string, string>;
  violations: number;
  savedAt: number;
  synced?: boolean;
}

const SNAP = (pid: string) => `proctor:snapshot:${pid}`;
const PAPER = (pid: string) => `proctor:paper:${pid}`;
const LEGACY_ANSWERS = (pid: string) => `proctor:answers:${pid}`;

function read<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage full or blocked — server sync is the fallback */
  }
}

export function loadSnapshot(pid: string): ProctorSnapshot | null {
  const snap = read<ProctorSnapshot>(SNAP(pid));
  if (snap && snap.answers) return snap;
  // migrate the older answers-only key so students mid-test don't lose work
  const legacy = read<Record<string, string>>(LEGACY_ANSWERS(pid));
  if (legacy) return { module: 1, qIdx: 0, answers: legacy, violations: 0, savedAt: Date.now() };
  return null;
}

export function saveSnapshot(pid: string, snap: ProctorSnapshot) {
  write(SNAP(pid), snap);
}

export function loadPaper(pid: string): PaperRow[] | null {
  const rows = read<PaperRow[]>(PAPER(pid));
  return rows && Array.isArray(rows) && rows.length > 0 ? rows : null;
}

export function savePaper(pid: string, rows: PaperRow[]) {
  if (rows.length > 0) write(PAPER(pid), rows);
}

export function clearProctorLocal(pid: string, moduleNumbers: number[] = []) {
  try {
    localStorage.removeItem(SNAP(pid));
    localStorage.removeItem(PAPER(pid));
    localStorage.removeItem(LEGACY_ANSWERS(pid));
    moduleNumbers.forEach((m) => localStorage.removeItem(`proctor:clock:${pid}:${m}`));
  } catch {
    /* ignore */
  }
}

export function answeredCount(answers: Record<string, string>) {
  return Object.values(answers ?? {}).filter((v) => (v ?? '').trim() !== '').length;
}
