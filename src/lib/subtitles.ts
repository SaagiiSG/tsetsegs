import { supabase } from '@/integrations/supabase/client';
import { FunctionsHttpError } from '@supabase/supabase-js';

const RATE = 16000;
const CHUNK_SEC = 20;

function wav(samples: Float32Array): Blob {
  const buf = new ArrayBuffer(44 + samples.length * 2);
  const v = new DataView(buf);
  const w = (o: number, s: string) => [...s].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
  w(0, 'RIFF'); v.setUint32(4, 36 + samples.length * 2, true); w(8, 'WAVE'); w(12, 'fmt ');
  v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
  v.setUint32(24, RATE, true); v.setUint32(28, RATE * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true);
  w(36, 'data'); v.setUint32(40, samples.length * 2, true);
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    v.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  return new Blob([buf], { type: 'audio/wav' });
}

const ts = (t: number) => {
  const h = Math.floor(t / 3600), m = Math.floor((t % 3600) / 60), s = t % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${s.toFixed(3).padStart(6, '0')}`;
};

/** Split a chunk's text into short cues spread across the chunk by character length. */
function cues(text: string, start: number, end: number): string[] {
  const parts = text.split(/(?<=[.!?])\s+/).flatMap((p) => {
    const words = p.split(/\s+/); const out: string[] = [];
    for (let i = 0; i < words.length; i += 12) out.push(words.slice(i, i + 12).join(' '));
    return out;
  }).filter(Boolean);
  const total = parts.reduce((a, p) => a + p.length, 0) || 1;
  let t = start;
  return parts.map((p) => {
    const d = ((end - start) * p.length) / total;
    const c = `${ts(t)} --> ${ts(t + d)}\n${p}`;
    t += d;
    return c;
  });
}

export async function generateSubtitles(videoSrc: string, onProgress: (pct: number) => void): Promise<string> {
  const res = await fetch(videoSrc);
  if (!res.ok) throw new Error('Could not download the video');
  const raw = await res.arrayBuffer();
  const decoded = await new AudioContext().decodeAudioData(raw);
  const off = new OfflineAudioContext(1, Math.ceil(decoded.duration * RATE), RATE);
  const node = off.createBufferSource(); node.buffer = decoded; node.connect(off.destination); node.start();
  const mono = (await off.startRendering()).getChannelData(0);

  const step = CHUNK_SEC * RATE;
  const n = Math.ceil(mono.length / step);
  const out: string[] = [];
  for (let i = 0; i < n; i++) {
    const slice = mono.subarray(i * step, Math.min(mono.length, (i + 1) * step));
    const fd = new FormData();
    fd.append('file', wav(slice), 'chunk.wav');
    const { data, error } = await supabase.functions.invoke('transcribe-video-chunk', { body: fd });
    if (error) {
      const msg = error instanceof FunctionsHttpError ? (await error.context.json().catch(() => ({})))?.error : error.message;
      throw new Error(msg || 'Transcription failed');
    }
    const text = (data?.text ?? '').trim();
    if (text) out.push(...cues(text, i * CHUNK_SEC, i * CHUNK_SEC + slice.length / RATE));
    onProgress(Math.round(((i + 1) / n) * 100));
  }
  return `WEBVTT\n\n${out.join('\n\n')}\n`;
}
