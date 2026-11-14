export type PublicLanguage = 'mon' | 'eng';
export const PUBLIC_LANGUAGE_KEY = 'flowersos-public-language';
const MONGOLIA_ZONES = ['Asia/Ulaanbaatar', 'Asia/Hovd', 'Asia/Choibalsan'];
/** English everywhere in the world; Mongolian only for a device set to Mongolian or on Mongolia time (Saagii, 6 Nov). */
export function deviceLanguage(
  languages: readonly string[] = typeof navigator === 'undefined' ? [] : navigator.languages ?? [navigator.language],
  zone: string = Intl.DateTimeFormat().resolvedOptions().timeZone ?? '',
): PublicLanguage {
  return languages.some(l => /^mn\b/i.test(l)) || MONGOLIA_ZONES.includes(zone) ? 'mon' : 'eng';
}
export function resolvePublicLanguage(query: string | null, stored: string | null, pageDefault?: PublicLanguage, device?: PublicLanguage): PublicLanguage {
  if (query === 'mon' || query === 'eng') return query;
  if (pageDefault) return pageDefault;
  return stored === 'eng' || stored === 'mon' ? stored : device ?? deviceLanguage();
}
