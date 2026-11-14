import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { MathText } from './MathText';

const render = (text: string) => renderToStaticMarkup(<MathText text={text} />);
const plain = (html: string) => html.replace(/<annotation[\s\S]*?<\/annotation>/g, '').replace(/<[^>]+>/g, '');

describe('MathText dollars', () => {
  it('shows \\$ inside math as a dollar sign, not a KaTeX error (EXT0372, live game 6 Nov)', () => {
    const html = render('A ticket sold for $\\$15$, and choice $\\$19 + r$.');
    expect(html).not.toContain('katex-error');
    expect(html).not.toContain('');
    expect(plain(html)).toContain('$15');
    expect(plain(html)).toContain('$19+r');
  });

  it('still shows \\$ in plain text as a dollar sign', () => {
    expect(plain(render('It costs \\$96 in total.'))).toBe('It costs $96 in total.');
  });
});
