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

    // Protect literal currency ($5, $96, $1,200.50) from being mis-parsed as math delimiters.
    // Skip strings that contain LaTeX commands (e.g. "$20\left(p+r+s\right)$") — those are real math.
    const hasLatexCommand = /\\[a-zA-Z]+/.test(text);
    const currencyProtected = hasLatexCommand
      ? text
      : text.replace(/\$(\d[\d,]*(?:\.\d+)?)/g, `${CURRENCY_TOKEN}$1`);

    // Pre-process: auto-detect math patterns
    const processed = autoDetectMath(currencyProtected);
    
    // Split by math delimiters $ ... $ (but not dollar amounts like $96)
    // Dollar amounts: $ followed by digits then space/punctuation/end
    const parts = processed.split(/(\$[^$]+\$)/g);
    
    return parts.map((part, index) => {
      if (part.startsWith('$') && part.endsWith('$')) {
        const mathContent = part.slice(1, -1);
        
        // Skip if it looks like a dollar amount (pure number, possibly with commas)
        if (/^\d[\d,]*\.?\d*$/.test(mathContent.trim())) {
          return <span key={index}>${mathContent}</span>;
        }
        
        try {
          const html = katex.renderToString(mathContent, {
            throwOnError: false,
            displayMode: false,
          });
          return (
            <span 
              key={index} 
              dangerouslySetInnerHTML={{ __html: html }}
              className="math-inline"
            />
          );
        } catch (e) {
          return <span key={index} className="text-destructive">{part}</span>;
        }
      }
      
      // Handle basic formatting
      let formatted = part;
      // Restore protected currency tokens (e.g., $5, $96)
      formatted = formatted.replace(/\uE000/g, '$');
      // Bold **text**
      formatted = formatted.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
      // Italic *text*
      formatted = formatted.replace(/\*([^*]+)\*/g, '<em>$1</em>');
      // Subscript ~text~
      formatted = formatted.replace(/~([^~]+)~/g, '<sub>$1</sub>');
      // Superscript ^text^
      formatted = formatted.replace(/\^([^^]+)\^/g, '<sup>$1</sup>');
      // Line breaks
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
