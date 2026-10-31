import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { HairlineFigure, captionText } from './HairlineFigure';
import parabola from './hairline/parabola.js';

describe('figure caption', () => {
  it('shows the read-out, but nothing at rest', () => {
    expect(captionText('rest')).toBe('');
    expect(captionText(null)).toBe('');
    expect(captionText(undefined)).toBe('');
    expect(captionText('x ≥ 3')).toBe('x ≥ 3');
  });
  it('a figure with a caption has one empty caption line under it', () => {
    const html = renderToStaticMarkup(<HairlineFigure figure={parabola} caption className="w-40" />);
    expect(html.match(/data-caption=/g)).toHaveLength(1);
    expect(html).toMatch(/<p[^>]*data-caption=""[^>]*><\/p>/);
    expect(html.indexOf('data-hairline="parabola"')).toBeLessThan(html.indexOf('data-caption='));
  });
  it('a figure without a caption is just the figure', () => {
    expect(renderToStaticMarkup(<HairlineFigure figure={parabola} className="w-40" />)).not.toContain('data-caption');
  });
});
