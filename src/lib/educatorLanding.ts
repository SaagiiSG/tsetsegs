import type { PublicLanguage } from './publicLanguage';
const fmt = (n: number) => n.toLocaleString('en-US');
// Counts come live from the database and hide below a floor, so a missing or small count never shows.
// Math only: the English explanations are College Board's own, not the teachers'.
export const mathExplanationsLabel = (count: number | null, lang: PublicLanguage) =>
 count != null && count >= 100 ? (lang === 'mon' ? `Манай багш нарын бичсэн ${fmt(count)} математикийн тайлбар` : `${fmt(count)} math explanations written by our teachers`) : null;
export const videoCountLabel = (count: number | null, lang: PublicLanguage) =>
 count != null && count >= 20 ? (lang === 'mon' ? `Ижил багш нарын ${fmt(count)} видео хичээл` : `${fmt(count)} video lessons from the same teachers`) : null;
export const problemsSolvedLabel = (answers: number | null) =>
 answers == null ? null : answers < 1000 ? fmt(answers) : `${fmt(Math.floor(answers / 1000) * 1000)}+`;
export const sourceFromSearch = (search: string) => {
 const ref = new URLSearchParams(search).get('ref')?.toLowerCase();
 return ref && /^[a-z0-9_-]{1,40}$/.test(ref) ? ref : null;
};
// Carries the lead source between /educators and /demo; the ref is already cleaned by sourceFromSearch.
export const withSource = (href: string, source: string | null) => source ? `${href}&ref=${source}` : href;
// The request RPC rejects messages over 2000 characters, so the visitor's text gives way to the tag.
export const appendSource = (message: string, source: string | null, max = 2000) => {
 if (!source) return message;
 const tag = `Source: ${source}`;
 return message ? `${message.slice(0, max - tag.length - 2)}\n\n${tag}` : tag;
};
