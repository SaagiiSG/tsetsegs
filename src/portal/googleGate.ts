export type GateState = 'off' | 'ask' | 'required';

export function gateState(row: { google_email: string | null; google_due_on: string } | null, today: string, laterThisSession: boolean): GateState {
  if (!row || row.google_email) return 'off';
  if (today >= row.google_due_on) return 'required';
  return laterThisSession ? 'off' : 'ask';
}

export function daysLeft(dueOn: string, today: string): number {
  return Math.round((Date.parse(dueOn) - Date.parse(today)) / 864e5);
}
