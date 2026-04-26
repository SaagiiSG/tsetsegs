import { useMemo } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';

interface MathTextProps {
  text: string;
  className?: string;
}

/**
 * Pre-process plain text to auto-detect math patterns and wrap them in $...$ delimiters.
 * Handles exponents, roots, function notation, fractions, and unicode math symbols.
 * Preserves dollar amounts like $96 as literal text.
 */
const CURRENCY_TOKEN = '\uE000';

function autoDetectMath(text: string): string {
  if (!text) return text;

  // Already has LaTeX delimiters — skip auto-detection
  if (/\$[^$]+\$/.test(text)) return text;

  let result = text;

  // 1. Unicode superscripts → LaTeX superscript
  const superscriptMap: Record<string, string> = {
    '⁰': '0', '¹': '1', '²': '2', '³': '3', '⁴': '4',
    '⁵': '5', '⁶': '6', '⁷': '7', '⁸': '8', '⁹': '9',
    'ⁿ': 'n', 'ⁱ': 'i',
  };
  const superscriptRegex = /([a-zA-Z0-9)])([⁰¹²³⁴⁵⁶⁷⁸⁹ⁿⁱ]+)/g;
  result = result.replace(superscriptRegex, (_, base, sups) => {
    const exponent = sups.split('').map((c: string) => superscriptMap[c] || c).join('');
    return `$${base}^{${exponent}}$`;
  });

  // 2. Unicode subscripts → LaTeX subscript
  const subscriptMap: Record<string, string> = {
    '₀': '0', '₁': '1', '₂': '2', '₃': '3', '₄': '4',
    '₅': '5', '₆': '6', '₇': '7', '₈': '8', '₉': '9',
    'ₙ': 'n', 'ₓ': 'x',
  };
  const subscriptRegex = /([a-zA-Z0-9)])([₀₁₂₃₄₅₆₇₈₉ₙₓ]+)/g;
  result = result.replace(subscriptRegex, (_, base, subs) => {
    const sub = subs.split('').map((c: string) => subscriptMap[c] || c).join('');
    return `$${base}_{${sub}}$`;
  });

  // 3. Cube root: ∛(...) or ∛X
  result = result.replace(/∛\(([^)]+)\)/g, (_, inner) => `$\\sqrt[3]{${inner}}$`);
  result = result.replace(/∛([a-zA-Z0-9]+)/g, (_, inner) => `$\\sqrt[3]{${inner}}$`);

  // 4. Square root with fraction: √A/B (e.g., √3/2)
  result = result.replace(/√([a-zA-Z0-9]+)\/([a-zA-Z0-9]+)/g, (_, num, den) => {
    return `$\\frac{\\sqrt{${num}}}{${den}}$`;
  });

  // 5. Square root: √(...) or √X
  result = result.replace(/√\(([^)]+)\)/g, (_, inner) => `$\\sqrt{${inner}}$`);
  result = result.replace(/√([a-zA-Z0-9]+)/g, (_, inner) => `$\\sqrt{${inner}}$`);

  // 6. Full function expressions: f(x) = ... with ^ (e.g., f(x) = 64(16)^x)
  result = result.replace(
    /([a-zA-Z])\(([a-zA-Z])\)\s*=\s*([^,.\n]+\^[^,.\n]+)/g,
    (match, fn, variable, expr) => {
      const latexExpr = convertExponentsToLatex(expr.trim());
      return `$${fn}(${variable}) = ${latexExpr}$`;
    }
  );

  // 7. Standalone exponents with parenthesized fractional exponent: X^(A/B)
  result = result.replace(
    /(?<!\$)([a-zA-Z0-9]+)\^\((\d+)\/(\d+)\)(?!\})/g,
    (_, base, num, den) => `$${base}^{\\frac{${num}}{${den}}}$`
  );

  // 8. Exponents with parenthesized expression: X^(expr)
  result = result.replace(
    /(?<!\$)([a-zA-Z0-9]+)\^\(([^)]+)\)(?!\})/g,
    (_, base, exp) => `$${base}^{${exp}}$`
  );

  // 9. Simple exponents: X^N where N is a single digit or variable
  result = result.replace(
    /(?<!\$)([a-zA-Z0-9]+)\^([a-zA-Z0-9])(?![{(])/g,
    (_, base, exp) => `$${base}^{${exp}}$`
  );

  // 10. Pi symbol
  result = result.replace(/π/g, '$\\pi$');

  // 11. ≤, ≥, ≠, ×, ÷
  result = result.replace(/≤/g, '$\\leq$');
  result = result.replace(/≥/g, '$\\geq$');
  result = result.replace(/≠/g, '$\\neq$');
  result = result.replace(/±/g, '$\\pm$');

  // 12. Merge adjacent LaTeX spans: $A$ $B$ → $A \; B$
  result = result.replace(/\$\s*\$\s*/g, ' \\; ');
  // Fix any broken double-dollar from merging
  result = result.replace(/\$\$/g, '$ $');

  return result;
}

/** Convert caret-based exponents within a larger expression to LaTeX */
function convertExponentsToLatex(expr: string): string {
  // Convert X^(A/B) → X^{\frac{A}{B}}
  let result = expr.replace(
    /([a-zA-Z0-9()]+)\^\((\d+)\/(\d+)\)/g,
    (_, base, num, den) => `${base}^{\\frac{${num}}{${den}}}`
  );
  // Convert X^(expr) → X^{expr}
  result = result.replace(
    /([a-zA-Z0-9()]+)\^\(([^)]+)\)/g,
    (_, base, exp) => `${base}^{${exp}}`
  );
  // Convert X^N → X^{N}
  result = result.replace(
    /([a-zA-Z0-9()]+)\^([a-zA-Z0-9])/g,
    (_, base, exp) => `${base}^{${exp}}`
  );
  return result;
}

export function MathText({ text, className = '' }: MathTextProps) {
  const renderedContent = useMemo(() => {
    if (!text) return null;

    // Pre-process: auto-detect unicode/notational math patterns first.
    const processed = autoDetectMath(text);

    // ---------- Stateful tokenizer ----------
    // Walk through `processed` and decide for every `$` whether it opens a math span
    // (paired with the next `$`) or is a literal dollar sign (currency).
    //
    // A `$` is treated as literal currency when ANY of these hold for the candidate
    // span $X$:
    //   (a) X looks like a pure currency amount (\d[\d,]*(\.\d+)?) AND the opening `$`
    //       is at a currency-ish boundary (start / whitespace / punctuation before),
    //       AND the closing `$` is at a currency-ish boundary (whitespace / punctuation
    //       / end after).
    //   (b) KaTeX fails to render X with throwOnError: true.
    // Otherwise the span is rendered as math.
    //
    // Special case: if X starts with `\$` (CB-escaped currency like "$\$5$"), KaTeX
    // renders it cleanly as a literal "$" + content — that path Just Works through (b).

    type Token =
      | { kind: 'text'; value: string }
      | { kind: 'math'; value: string };
    const tokens: Token[] = [];

    const isCurrencyBoundaryBefore = (s: string, i: number): boolean => {
      if (i <= 0) return true;
      const c = s[i - 1];
      return /[\s(\[\>\-—–:;,]/.test(c);
    };
    const isCurrencyBoundaryAfter = (s: string, i: number): boolean => {
      if (i >= s.length) return true;
      const c = s[i];
      return /[\s.,;:!\?\)\]\<\-—–]/.test(c);
    };
    const PURE_CURRENCY = /^\d{1,3}(?:,\d{3})*(?:\.\d+)?$|^\d+(?:\.\d+)?$/;

    let buf = '';
    let i = 0;
    const n = processed.length;
    while (i < n) {
      const ch = processed[i];
      if (ch !== '$') {
        buf += ch;
        i++;
        continue;
      }
      // Found a `$`. Look for a closing `$`.
      const close = processed.indexOf('$', i + 1);
      if (close === -1) {
        // Unmatched — treat as literal.
        buf += '$';
        i++;
        continue;
      }
      const inner = processed.slice(i + 1, close);

      // Heuristic (a): pure currency amount with currency boundaries on the OPENING `$`.
      // We only need the opening boundary to look like currency; the closing `$` may be
      // followed by another currency span ("$36 and $68").
      if (
        PURE_CURRENCY.test(inner.trim()) &&
        isCurrencyBoundaryBefore(processed, i)
      ) {
        // Opening `$` is literal currency. Consume `$` + the number, leave the closing
        // `$` for the next iteration to evaluate independently.
        const m = inner.match(/^(\s*)(\d[\d,]*(?:\.\d+)?)/);
        if (m) {
          buf += '$' + m[1] + m[2];
          i = i + 1 + m[1].length + m[2].length;
          continue;
        }
      }

      // Heuristic (b): trial-render with KaTeX. If it parses, it's math.
      let html: string | null = null;
      try {
        html = katex.renderToString(inner, {
          throwOnError: true,
          displayMode: false,
        });
      } catch {
        html = null;
      }

      if (html !== null) {
        // Pure-number math wrap like "$-4$" or "$4$" (CB MC choice convention) —
        // render the number bare so it doesn't look italicized.
        if (/^-?\d[\d,]*\.?\d*$/.test(inner.trim())) {
          if (buf) tokens.push({ kind: 'text', value: buf });
          buf = '';
          tokens.push({ kind: 'text', value: inner.trim() });
        } else {
          if (buf) tokens.push({ kind: 'text', value: buf });
          buf = '';
          tokens.push({ kind: 'math', value: html });
        }
        i = close + 1;
        continue;
      }

      // KaTeX failed → opening `$` is literal.
      buf += '$';
      i++;
    }
    if (buf) tokens.push({ kind: 'text', value: buf });

    return tokens.map((tok, index) => {
      if (tok.kind === 'math') {
        return (
          <span
            key={index}
            dangerouslySetInnerHTML={{ __html: tok.value }}
            className="math-inline"
          />
        );
      }
      let formatted = tok.value;
      formatted = formatted.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
      formatted = formatted.replace(/\*([^*]+)\*/g, '<em>$1</em>');
      formatted = formatted.replace(/~([^~]+)~/g, '<sub>$1</sub>');
      formatted = formatted.replace(/\^([^^]+)\^/g, '<sup>$1</sup>');
      formatted = formatted.replace(/\n/g, '<br/>');
      return (
        <span
          key={index}
          dangerouslySetInnerHTML={{ __html: formatted }}
        />
      );
    });
  }, [text]);

  return <span className={`math-text-container ${className}`}>{renderedContent}</span>;
}
