/**
 * Step-by-step explanation format, stored in questions.rationale (plain text, backwards compatible).
 *
 *   ### Step 1: Set up the equation
 *   Body text with $math$ and Desmos-style shorthand (x^2, √3).
 *   ![](https://.../desmos.png)
 *
 *   ### Shortcut: Use Desmos
 *   ...
 *
 * Text before the first heading (e.g. legacy plain rationales) becomes an untitled intro block.
 */
export type ExplanationKind = 'step' | 'shortcut' | 'intro';

export interface ExplanationBlock {
  kind: ExplanationKind;
  title: string;
  body: string; // text with inline image lines
}

const HEADING_RE = /^###\s+(Step\s+\d+|Shortcut|Takeaway)\s*:?\s*(.*)$/i;
export const IMAGE_LINE_RE = /^!\[[^\]]*\]\((https?:\/\/[^\s)]+)\)\s*$/;

export function parseExplanation(raw: string | null | undefined): ExplanationBlock[] {
  if (!raw || !raw.trim()) return [];
  const lines = raw.replace(/\r\n/g, '\n').split('\n');
  const blocks: ExplanationBlock[] = [];
  let current: ExplanationBlock | null = null;
  const push = () => {
    if (current) {
      current.body = current.body.replace(/^\n+|\n+$/g, '');
      if (current.kind !== 'intro' || current.body) blocks.push(current);
    }
  };
  for (const line of lines) {
    const m = line.match(HEADING_RE);
    if (m) {
      push();
      const label = m[1].toLowerCase();
      current = {
        kind: label.startsWith('step') ? 'step' : 'shortcut',
        title: m[2].trim(),
        body: '',
      };
    } else {
      if (!current) current = { kind: 'intro', title: '', body: '' };
      current.body += (current.body ? '\n' : '') + line;
    }
  }
  push();
  return blocks;
}

export function serializeExplanation(blocks: ExplanationBlock[]): string {
  let n = 0;
  return blocks
    .map((b) => {
      const body = b.body.replace(/^\n+|\n+$/g, '');
      if (b.kind === 'intro') return body;
      const label = b.kind === 'step' ? `Step ${++n}` : 'Shortcut';
      return `### ${label}: ${b.title.trim()}\n${body}`;
    })
    .filter((s) => s.trim())
    .join('\n\n');
}

/** Split a block body into text and image segments for rendering. */
export function splitBody(body: string): Array<{ type: 'text' | 'image'; value: string }> {
  const out: Array<{ type: 'text' | 'image'; value: string }> = [];
  let buf: string[] = [];
  const flush = () => {
    const t = buf.join('\n').replace(/^\n+|\n+$/g, '');
    if (t) out.push({ type: 'text', value: t });
    buf = [];
  };
  for (const line of body.split('\n')) {
    const m = line.trim().match(IMAGE_LINE_RE);
    if (m) {
      flush();
      out.push({ type: 'image', value: m[1] });
    } else buf.push(line);
  }
  flush();
  return out;
}
