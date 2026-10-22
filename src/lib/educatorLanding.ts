import type { PublicLanguage } from './publicLanguage';
const fmt = (n: number) => n.toLocaleString('en-US');
// Counts come live from the database; a missing or zero count shows the line without a number.
export const explanationsLine = (count: number | null, lang: PublicLanguage) =>
 count ? (lang === 'mon' ? `${fmt(count)} асуулт алхам алхмаар тайлбартай` : `${fmt(count)} questions with step-by-step explanations`)
  : (lang === 'mon' ? 'Манай багш нарын бичсэн алхам алхмаар тайлбар' : 'Step-by-step explanations written by our teachers');
export const videoCountLabel = (count: number | null, lang: PublicLanguage) =>
 count != null && count >= 20 ? (lang === 'mon' ? `Ижил багш нарын ${fmt(count)} видео хичээл` : `${fmt(count)} video lessons from the same teachers`) : null;
export const problemsSolvedLabel = (answers: number | null) =>
 answers == null ? null : answers < 1000 ? fmt(answers) : `${fmt(Math.floor(answers / 1000) * 1000)}+`;
export const sourceFromSearch = (search: string) => {
 const ref = new URLSearchParams(search).get('ref')?.toLowerCase();
 return ref && /^[a-z0-9_-]{1,40}$/.test(ref) ? ref : null;
};
// The request RPC rejects messages over 2000 characters, so the visitor's text gives way to the tag.
export const appendSource = (message: string, source: string | null, max = 2000) => {
 if (!source) return message;
 const tag = `Source: ${source}`;
 return message ? `${message.slice(0, max - tag.length - 2)}\n\n${tag}` : tag;
};
