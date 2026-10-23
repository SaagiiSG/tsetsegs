/**
 * Running points total for each sprint day, from the same rows the sprint board sums
 * (practice attempts + speed runs). Days are UTC dates, like the board's sprint window.
 */
export function sprintPointsByDay(rows: { created_at: string; points: number }[], startsOn: string, endsOn: string, now = new Date()) {
  const perDay = new Map<string, number>();
  for (const r of rows) {
    const d = new Date(r.created_at).toISOString().slice(0, 10);
    perDay.set(d, (perDay.get(d) ?? 0) + r.points);
  }
  const today = now.toISOString().slice(0, 10);
  const last = today < endsOn ? today : endsOn;
  const out: { day: number; points: number }[] = [];
  let total = 0;
  for (let d = new Date(`${startsOn}T00:00:00Z`); d.toISOString().slice(0, 10) <= last; d.setUTCDate(d.getUTCDate() + 1)) {
    total += perDay.get(d.toISOString().slice(0, 10)) ?? 0;
    out.push({ day: out.length + 1, points: total });
  }
  return out;
}
