import { useMemo } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';

interface MathTextProps {
  text: string;
  className?: string;
}

/**
 * MathText — delimiter-first LaTeX renderer.
 *
 * Contract:
 *   $...$           inline math
 *   $$...$$         display math
 *   \(...\)         inline math (CB/external import style)
 *   \[...\]         display math
 *   \$              literal dollar sign (escape currency)
 *
 * Anything between delimiters is sent to KaTeX as-is. No prose-detection
 * heuristics — if you wrote $\frac{1}{2}$ it renders as math. Outside of
 * math spans we run a small auto-detect pass for unicode/caret shorthand
 * (x², √3, π, x^2) so authors can keep writing the easy stuff plainly.
 *
 * Currency: a bare `$96` with no matching closing `$` stays literal because
 * step 2 only extracts *paired* delimiters. To force literal `$` inside
 * prose that also contains real math, use `\$`.
 */

const ESCAPED_DOLLAR = '\uE000';
const PLACEHOLDER_OPEN = '\uE001';
const PLACEHOLDER_CLOSE = '\uE002';

type MathToken = { html: string; display: boolean };

/** Step 1: protect \$ so it never participates in delimiter matching. */
function protectEscapedDollars(input: string): string {
  return input.replace(/\\\$/g, ESCAPED_DOLLAR);
}

/** Render LaTeX with KaTeX. Returns KaTeX's error HTML on failure (visible, not silent). */
function renderKatex(src: string, display: boolean): string {
  try {
    return katex.renderToString(src, {
      throwOnError: false,
      strict: 'ignore',
      displayMode: display,
      output: 'html',
    });
  } catch {
    // Fallback if KaTeX itself blew up (shouldn't happen with throwOnError:false).
    const safe = src.replace(/[<>&]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c]!));
    return `<span class="text-destructive font-mono text-sm">[math error: ${safe}]</span>`;
  }
}

/**
 * Step 2: extract delimited math spans, replacing each with a placeholder
 * `\uE001<index>\uE002`. Returns the rewritten text plus the token table.
 *
 * Order matters: $$ before $, \[ before \(, so we don't mis-split.
 */
function extractMath(input: string): { text: string; tokens: MathToken[] } {
  const tokens: MathToken[] = [];
  let out = '';
  let i = 0;
  const n = input.length;

  const pushToken = (src: string, display: boolean) => {
    const idx = tokens.length;
    tokens.push({ html: renderKatex(src, display), display });
    out += `${PLACEHOLDER_OPEN}${idx}${PLACEHOLDER_CLOSE}`;
  };

  while (i < n) {
    const ch = input[i];
    const next = input[i + 1];

    // $$ ... $$  (display)
    if (ch === '$' && next === '$') {
      const close = input.indexOf('$$', i + 2);
      if (close !== -1) {
        pushToken(input.slice(i + 2, close), true);
        i = close + 2;
        continue;
      }
    }

    // \[ ... \]  (display)
    if (ch === '\\' && next === '[') {
      const close = input.indexOf('\\]', i + 2);
      if (close !== -1) {
        pushToken(input.slice(i + 2, close), true);
        i = close + 2;
        continue;
      }
    }

    // \( ... \)  (inline)
    if (ch === '\\' && next === '(') {
      const close = input.indexOf('\\)', i + 2);
      if (close !== -1) {
        pushToken(input.slice(i + 2, close), false);
        i = close + 2;
        continue;
      }
    }

    // $ ... $  (inline) — require matching close that doesn't span lines wildly.
    if (ch === '$') {
      const close = input.indexOf('$', i + 1);
      if (close !== -1) {
        const inner = input.slice(i + 1, close);
        // Reject empty $$ (already handled) or spans that look like currency
        // pairs across many sentences: only skip if inner has a newline AND
        // no LaTeX command — keeps multi-line math allowed but avoids matching
        // "$96 ... $40" across paragraphs.
        const looksLikeCurrencyPair =
          /\n/.test(inner) && !/\\[a-zA-Z]/.test(inner);
        if (!looksLikeCurrencyPair) {
          pushToken(inner, false);
          i = close + 1;
          continue;
        }
      }
    }

    out += ch;
    i++;
  }

  return { text: out, tokens };
}

/**
 * Step 3: on plain text only, auto-detect unicode + caret shorthand and
 * wrap matches with placeholders that point into the token table.
 */
function autoDetectMath(text: string, tokens: MathToken[]): string {
  if (!text) return text;

  const pushInline = (latex: string): string => {
    const idx = tokens.length;
    tokens.push({ html: renderKatex(latex, false), display: false });
    return `${PLACEHOLDER_OPEN}${idx}${PLACEHOLDER_CLOSE}`;
  };

  let result = text;

  // Unicode superscripts
  const supMap: Record<string, string> = {
    '⁰': '0', '¹': '1', '²': '2', '³': '3', '⁴': '4',
    '⁵': '5', '⁶': '6', '⁷': '7', '⁸': '8', '⁹': '9',
    'ⁿ': 'n', 'ⁱ': 'i',
  };
  result = result.replace(/([a-zA-Z0-9)])([⁰¹²³⁴⁵⁶⁷⁸⁹ⁿⁱ]+)/g, (_, base, sups) => {
    const exp = (sups as string).split('').map((c) => supMap[c] ?? c).join('');
    return pushInline(`${base}^{${exp}}`);
  });

  // Unicode subscripts
  const subMap: Record<string, string> = {
    '₀': '0', '₁': '1', '₂': '2', '₃': '3', '₄': '4',
    '₅': '5', '₆': '6', '₇': '7', '₈': '8', '₉': '9',
    'ₙ': 'n', 'ₓ': 'x',
  };
  result = result.replace(/([a-zA-Z0-9)])([₀₁₂₃₄₅₆₇₈₉ₙₓ]+)/g, (_, base, subs) => {
    const sub = (subs as string).split('').map((c) => subMap[c] ?? c).join('');
    return pushInline(`${base}_{${sub}}`);
  });

  // Cube roots
  result = result.replace(/∛\(([^)]+)\)/g, (_, inner) => pushInline(`\\sqrt[3]{${inner}}`));
  result = result.replace(/∛([a-zA-Z0-9]+)/g, (_, inner) => pushInline(`\\sqrt[3]{${inner}}`));

  // Square root over fraction: √A/B
  result = result.replace(/√([a-zA-Z0-9]+)\/([a-zA-Z0-9]+)/g, (_, num, den) =>
    pushInline(`\\frac{\\sqrt{${num}}}{${den}}`),
  );

  // Square root
  result = result.replace(/√\(([^)]+)\)/g, (_, inner) => pushInline(`\\sqrt{${inner}}`));
  result = result.replace(/√([a-zA-Z0-9]+)/g, (_, inner) => pushInline(`\\sqrt{${inner}}`));

  // Caret exponents: X^(A/B), X^(expr), X^N
  result = result.replace(/([a-zA-Z0-9)]+)\^\((\d+)\/(\d+)\)/g, (_, base, num, den) =>
    pushInline(`${base}^{\\frac{${num}}{${den}}}`),
  );
  result = result.replace(/([a-zA-Z0-9)]+)\^\(([^)]+)\)/g, (_, base, exp) =>
    pushInline(`${base}^{${exp}}`),
  );
  result = result.replace(/([a-zA-Z0-9)]+)\^([a-zA-Z0-9])(?![{(])/g, (_, base, exp) =>
    pushInline(`${base}^{${exp}}`),
  );

  // Symbols
  const symbolMap: Array<[RegExp, string]> = [
    [/π/g, '\\pi'],
    [/≤/g, '\\leq'],
    [/≥/g, '\\geq'],
    [/≠/g, '\\neq'],
    [/±/g, '\\pm'],
    [/×/g, '\\times'],
    [/÷/g, '\\div'],
    [/·/g, '\\cdot'],
  ];
  for (const [re, latex] of symbolMap) {
    result = result.replace(re, () => pushInline(latex));
  }

  return result;
}

/** Step 4 helpers: light markdown for the remaining prose. */
function renderMarkdown(text: string): string {
  let out = text;
  // Escape HTML first so user content can't inject tags.
  out = out.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  // Restore our internal placeholders (they were ASCII before escaping, safe).
  // Markdown
  out = out.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  out = out.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  out = out.replace(/~([^~]+)~/g, '<sub>$1</sub>');
  out = out.replace(/\^([^^]+)\^/g, '<sup>$1</sup>');
  out = out.replace(/\n/g, '<br/>');
  // Restore literal dollar sentinel.
  out = out.replace(new RegExp(ESCAPED_DOLLAR, 'g'), '$');
  return out;
}

export function MathText({ text, className = '' }: MathTextProps) {
  const html = useMemo(() => {
    if (!text) return '';

    const protectedText = protectEscapedDollars(text);
    const { text: afterExtract, tokens } = extractMath(protectedText);
    const afterAutoDetect = autoDetectMath(afterExtract, tokens);

    // Split on placeholders and weave math HTML back in.
    const placeholderRe = new RegExp(`${PLACEHOLDER_OPEN}(\\d+)${PLACEHOLDER_CLOSE}`, 'g');
    let out = '';
    let last = 0;
    let m: RegExpExecArray | null;
    while ((m = placeholderRe.exec(afterAutoDetect)) !== null) {
      const prose = afterAutoDetect.slice(last, m.index);
      if (prose) out += renderMarkdown(prose);
      const tok = tokens[Number(m[1])];
      if (tok) {
        out += tok.display
          ? `<span class="math-display">${tok.html}</span>`
          : `<span class="math-inline">${tok.html}</span>`;
      }
      last = m.index + m[0].length;
    }
    const tail = afterAutoDetect.slice(last);
    if (tail) out += renderMarkdown(tail);

    return out;
  }, [text]);

  return (
    <span
      className={`math-text-container ${className}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
