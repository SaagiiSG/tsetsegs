export type PublicLanguage = 'mon' | 'eng';
export const PUBLIC_LANGUAGE_KEY = 'flowersos-public-language';
export function resolvePublicLanguage(query: string | null, stored: string | null): PublicLanguage {
  if (query === 'mon' || query === 'eng') return query;
  return stored === 'eng' ? 'eng' : 'mon';
}
export function requiresDemoSignup(mode: string | null, action: string): boolean {
  return mode === 'practice' && ['Practice', 'Speed', 'attempt'].includes(action);
}