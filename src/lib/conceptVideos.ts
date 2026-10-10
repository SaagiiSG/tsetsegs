import { supabase } from '@/integrations/supabase/client';

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
}

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
    const { data, error } = await supabase.storage
      .from('concept-videos')
      .createSignedUrl(url.slice(STORAGE_PREFIX.length), 60 * 60 * 3);
    if (error) throw error;
    return { kind: 'file', src: data.signedUrl };
  }
  const id = youtubeId(url);
  if (id) return { kind: 'youtube', src: `https://www.youtube-nocookie.com/embed/${id}?rel=0&modestbranding=1` };
  if (/\.(mp4|webm|mov)(\?|$)/i.test(url)) return { kind: 'file', src: url };
  return { kind: 'link', src: url };
}
