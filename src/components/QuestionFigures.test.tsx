import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { QuestionFigures } from './QuestionFigures';

const SVG = '<svg width="200" height="100"><line x1="0" y1="0" x2="200" y2="100" stroke="black"/></svg>';
const render = (props: Parameters<typeof QuestionFigures>[0]) => renderToStaticMarkup(<QuestionFigures {...props} />);
const imgs = (html: string) => [...html.matchAll(/<img [^>]*src="([^"]+)"[^>]*alt="([^"]*)"/g)].map(m => ({ src: m[1], alt: m[2] }));

describe('QuestionFigures', () => {
  it('shows only the drawing when there is just an SVG', () => {
    const shown = imgs(render({ svg: SVG }));
    expect(shown).toHaveLength(1);
    expect(shown[0].src).toMatch(/^data:image\/svg\+xml/);
    expect(shown[0].alt).toBe('Question figure');
  });

  it('shows the images as before when there is no SVG', () => {
    expect(imgs(render({ url1: 'a.png', url2: 'b.png' })).map(i => i.src)).toEqual(['a.png', 'b.png']);
  });

  it('prefers the drawing when a question has both', () => {
    const shown = imgs(render({ svg: SVG, url1: 'a.png' }));
    expect(shown).toHaveLength(1);
    expect(shown[0].src).toMatch(/^data:image\/svg\+xml/);
  });

  it('renders nothing at all when there is no figure', () => {
    expect(render({})).toBe('');
    expect(render({ svg: '<div>not a drawing</div>' })).toBe('');
  });

  it('falls back to the images when the SVG is unusable', () => {
    expect(imgs(render({ svg: '<script>alert(1)</script>', url1: 'a.png' })).map(i => i.src)).toEqual(['a.png']);
  });

  it('uses the figure description as alt text, for images too', () => {
    expect(imgs(render({ svg: SVG, description: 'A line through the origin' }))[0].alt).toBe('A line through the origin');
    expect(imgs(render({ url1: 'a.png', description: 'Bar chart of sales' }))[0].alt).toBe('Bar chart of sales');
    expect(imgs(render({ url1: 'a.png', url2: 'b.png', description: 'Graphs' })).map(i => i.alt)).toEqual(['Graphs 1', 'Graphs 2']);
  });

  it('never puts SVG markup straight into the page', () => {
    expect(render({ svg: SVG })).not.toMatch(/<svg|<line/);
  });
});
