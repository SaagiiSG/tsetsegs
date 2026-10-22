export type PublicLanguage = 'mon' | 'eng';
export const PUBLIC_LANGUAGE_KEY = 'flowersos-public-language';
export function resolvePublicLanguage(query: string | null, stored: string | null, pageDefault?: PublicLanguage): PublicLanguage {
  if (query === 'mon' || query === 'eng') return query;
  if (pageDefault) return pageDefault;
  return stored === 'eng' ? 'eng' : 'mon';
}
export function requiresDemoSignup(mode: string | null, action: string): boolean {
  return mode === 'practice' && ['attempt', 'practice', 'video', 'speed', 'goals'].includes(action);
}