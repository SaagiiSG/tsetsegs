// Rounds up so the clock reads 0 only once the deadline has really passed.
export const moduleSecondsLeft = (moduleStartedAt: string, minutes: number, now: number) =>
  Math.max(0, Math.ceil((new Date(moduleStartedAt).getTime() + minutes * 60000 - now) / 1000));
