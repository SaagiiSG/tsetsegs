import { phoneDigits } from '@/lib/tenant';

export type ImportRow = { name: string; rawPhone: string; phone: string; batch: string; classId: string | null; error?: string };

/** Splits text pasted from Excel / Google Sheets (tabs) or a .csv file (commas, "quoted" cells) into trimmed cells, dropping blank lines. */
export function splitRows(text: string): string[][] {
  const s = text.replace(/^﻿/, '');
  const delim = s.includes('\t') ? '\t' : ',';
  const rows: string[][] = [];
  let row: string[] = []; let cell = ''; let quoted = false;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (quoted) {
      if (c === '"' && s[i + 1] === '"') { cell += '"'; i++; } else if (c === '"') quoted = false; else cell += c;
    } else if (c === '"' && !cell.trim()) quoted = true;
    else if (c === delim) { row.push(cell); cell = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && s[i + 1] === '\n') i++;
      row.push(cell); rows.push(row); row = []; cell = '';
    } else cell += c;
  }
  row.push(cell); rows.push(row);
  return rows.map(r => r.map(v => v.trim())).filter(r => r.some(Boolean));
}

/**
 * Columns: name, phone, batch (optional). Phones are saved as digits only, like the one-by-one form,
 * and the database keeps them unique per center on that exact value, so duplicates are compared the same way.
 */
export function checkStudentRows(
  text: string,
  { classes, students, defaultClassId }: { classes: { id: string; name: string }[]; students: { name: string; phone: string }[]; defaultClassId: string | null },
): ImportRow[] {
  const rows = splitRows(text);
  if (rows[0]?.[1] && !/\d/.test(rows[0][1])) rows.shift(); // header row, e.g. "Name, Phone"
  const taken = new Map(students.map(s => [s.phone, s.name]));
  const seen = new Map<string, number>();
  return rows.map(([name = '', rawPhone = '', batch = ''], i) => {
    const phone = phoneDigits(rawPhone);
    const cls = classes.find(c => c.name.trim().toLowerCase() === batch.toLowerCase());
    const error = !name ? 'Missing name'
      : !phone ? 'Missing phone'
      : phone.length < 6 || phone.length > 15 ? 'Bad phone number'
      : batch && !cls ? `No batch called "${batch}"`
      : taken.has(phone) ? `Already added as ${taken.get(phone)}`
      : seen.has(phone) ? `Same phone as row ${seen.get(phone)}`
      : undefined;
    if (!error) seen.set(phone, i + 1);
    return { name, rawPhone, phone, batch, classId: batch ? cls?.id ?? null : defaultClassId, error };
  });
}

/** Failed rows as tab-separated lines (name, phone, batch, problem); pasting them back in ignores the problem column. */
export const failedRowsText = (rows: ImportRow[]) => rows.map(r => [r.name, r.rawPhone, r.batch, r.error ?? ''].join('\t')).join('\n');
