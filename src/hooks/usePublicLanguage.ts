import { useEffect, useState } from 'react';
import { PUBLIC_LANGUAGE_KEY, resolvePublicLanguage, type PublicLanguage } from '@/lib/publicLanguage';

export function usePublicLanguage() {
  const [lang, update] = useState<PublicLanguage>(() => resolvePublicLanguage(new URLSearchParams(window.location.search).get('lang'), localStorage.getItem(PUBLIC_LANGUAGE_KEY)));
  useEffect(() => { const sync = () => update(resolvePublicLanguage(null, localStorage.getItem(PUBLIC_LANGUAGE_KEY))); window.addEventListener('public-language-change', sync); return () => window.removeEventListener('public-language-change', sync); }, []);
  const setLang = (next: PublicLanguage) => { localStorage.setItem(PUBLIC_LANGUAGE_KEY, next); update(next); window.dispatchEvent(new Event('public-language-change')); };
  return { lang, setLang, text: (mn: string, en: string) => lang === 'mon' ? mn : en };
}