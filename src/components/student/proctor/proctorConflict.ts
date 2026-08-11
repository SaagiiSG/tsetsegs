/* Offline recovery helpers.
   Two copies of an attempt can exist: the one saved on this device (localStorage
   snapshot, written on every keystroke) and the one on the server (synced every
   few seconds, and skipped entirely while offline). If they disagree we never
   guess — the student picks, and "combine" is always offered so no answer is
   ever thrown away. */

export type AnswerMap = Record<string, string>;

const filled = (v: string | undefined) => (v ?? '').trim() !== '';

export interface ConflictReport {
  /** Same question answered differently in the two copies. */
  conflicts: string[];
  /** Answered on the device but missing from the server copy. */
  deviceOnly: string[];
  /** Answered on the server but missing from the device copy. */
  serverOnly: string[];
  deviceCount: number;
  serverCount: number;
  /** Union of both copies; on a clash the newer copy wins. */
  combined: AnswerMap;
  /** True when the student must choose to avoid silently dropping work. */
  needsChoice: boolean;
}

export function compareAttempts(
  device: AnswerMap | null | undefined,
  server: AnswerMap | null | undefined,
  deviceIsNewer = true,
): ConflictReport {
  const d = device ?? {};
  const s = server ?? {};
  const keys = new Set([...Object.keys(d), ...Object.keys(s)]);

  const conflicts: string[] = [];
  const deviceOnly: string[] = [];
  const serverOnly: string[] = [];
  const combined: AnswerMap = {};

  keys.forEach((k) => {
    const dv = d[k];
    const sv = s[k];
    if (filled(dv) && filled(sv)) {
      if (dv !== sv) conflicts.push(k);
      combined[k] = deviceIsNewer ? dv : sv;
    } else if (filled(dv)) {
      deviceOnly.push(k);
      combined[k] = dv;
    } else if (filled(sv)) {
      serverOnly.push(k);
      combined[k] = sv;
    }
  });

  const deviceCount = Object.values(d).filter(filled).length;
  const serverCount = Object.values(s).filter(filled).length;

  return {
    conflicts,
    deviceOnly,
    serverOnly,
    deviceCount,
    serverCount,
    combined,
    // Only interrupt when picking one copy blindly would lose something.
    needsChoice: conflicts.length > 0 || (deviceOnly.length > 0 && serverOnly.length > 0),
  };
}
