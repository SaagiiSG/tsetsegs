import { useState } from 'react';
import { PUBLIC_LANGUAGE_KEY, resolvePublicLanguage, type PublicLanguage } from '@/lib/publicLanguage';

export function usePublicLanguage() {
  const [lang, update] = useState<PublicLanguage>(() => resolvePublicLanguage(new URLSearchParams(window.location.search).get('lang'), localStorage.getItem(PUBLIC_LANGUAGE_KEY)));
  const setLang = (next: PublicLanguage) => { localStorage.setItem(PUBLIC_LANGUAGE_KEY, next); update(next); window.dispatchEvent(new Event('public-language-change')); };
  return { lang, setLang, text: (mn: string, en: string) => lang === 'mon' ? mn : en };
}