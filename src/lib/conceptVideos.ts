import { supabase } from '@/integrations/supabase/client';
import { getStudentToken } from '@/lib/studentToken';

export const CONCEPT_DOMAINS = [
  'Algebra',
  'Advanced Math',
  'Problem Solving & Data',
  'Geometry & Trig',
  'Desmos Skills',
] as const;

export interface ConceptVideo {
  id: string;
  title: string;
  description: string | null;
  domain: string;
  module: string | null;
  video_url: string;
  duration_minutes: number | null;
  order_index: number;
  is_published: boolean;
  subtitles_vtt?: string | null;
  labels?: string[];
}

/** The 4 big SAT math domains plus Desmos — one click to apply in the admin editor. */
export const PRESET_LABELS = ['Algebra', 'Advanced Math', 'Problem Solving & Data', 'Geometry & Trig', 'Desmos'] as const;

/** Uploaded files are stored as `storage:<path>` in the private concept-videos bucket. */
export const STORAGE_PREFIX = 'storage:';

export function youtubeId(url: string): string | null {
  const m = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/|live\/))([\w-]{11})/);
  return m ? m[1] : null;
}

export type ResolvedVideo =
  | { kind: 'youtube'; src: string }
  | { kind: 'file'; src: string }
  | { kind: 'link'; src: string };

export async function resolveVideo(url: string): Promise<ResolvedVideo> {
  if (url.startsWith(STORAGE_PREFIX)) {
    // Storage requests don't carry the student token, so signed links are
    // minted by the server, which accepts either an account session or a token.
    const token = getStudentToken();
    const { data, error } = await supabase.functions.invoke('concept-video-url', {
      body: { path: url.slice(STORAGE_PREFIX.length) },
      headers: token ? { 'x-student-token': token } : undefined,
    });
    if (error) throw error;
    return { kind: 'file', src: data.signedUrl };
  }
  const id = youtubeId(url);
  if (id) return { kind: 'youtube', src: `https://www.youtube-nocookie.com/embed/${id}?rel=0&modestbranding=1&cc_load_policy=1&cc_lang_pref=en&hl=en` };
  if (/\.(mp4|webm|mov)(\?|$)/i.test(url)) return { kind: 'file', src: url };
  return { kind: 'link', src: url };
}
