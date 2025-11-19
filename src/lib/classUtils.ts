export function isOnlineClass(schedule: string): boolean {
  return schedule.includes("Online") || schedule.includes("online");
}
