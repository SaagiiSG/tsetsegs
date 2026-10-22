import { describe, expect, it } from 'vitest';
import { sanitizeSvg, svgDataUrl } from '../../supabase/functions/_shared/svgFigure';

const evil = `<svg width="200" height="100" onload="alert(1)">
  <script>alert('x')</script>
  <foreignObject width="10" height="10"><div xmlns="http://www.w3.org/1999/xhtml"><img src="x" onerror="alert(2)"/></div></foreignObject>
  <image href="https://evil.example/track.png" width="10" height="10"/>
  <use xlink:href="https://evil.example/s.svg#a"/>
  <a href="javascript:alert(3)"><text x="1" y="20">Label</text></a>
  <rect x="0" y="0" width="10" height="10" style="fill:url(https://evil.example/p)" onclick="alert(4)"/>
  <set attributeName="href" to="javascript:alert(5)"/>
</svg>`;

describe('sanitizeSvg', () => {
  it('removes scripts, handlers, foreignObject and outside links', () => {
    const out = sanitizeSvg(evil)!;
    expect(out).not.toMatch(/<script/i);
    expect(out).not.toMatch(/alert/);
    expect(out).not.toMatch(/\son\w+=/i);
    expect(out).not.toMatch(/foreignObject|xhtml|<div|<img/i);
    expect(out).not.toMatch(/evil\.example/);
    expect(out).not.toMatch(/javascript:/i);
    expect(out).not.toMatch(/<set\b/);
  });

  it('keeps the drawing itself', () => {
    const out = sanitizeSvg(evil)!;
    expect(out).toContain('<text x="1" y="20">Label</text>');
    expect(out).toContain('<rect x="0" y="0" width="10" height="10"');
  });

  it('keeps local #fragment links', () => {
    const out = sanitizeSvg('<svg><defs><path id="p" d="M0 0L5 5"/></defs><use href="#p"/><use xlink:href="#p"/></svg>')!;
    expect(out).toContain('<use href="#p"/>');
    expect(out).toContain('<use xlink:href="#p"/>');
    expect(out).toContain('xmlns:xlink="http://www.w3.org/1999/xlink"');
  });

  it('makes the svg standalone so it draws as an image', () => {
    const out = sanitizeSvg('<svg width="300px" height="150"><line x1="0" y1="0" x2="300" y2="150" stroke="black"/></svg>')!;
    expect(out).toMatch(/^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg"/);
    expect(out).toContain('viewBox="0 0 300 150"');
  });

  it('keeps an existing viewBox and fixes element case from HTML-style markup', () => {
    const out = sanitizeSvg('<svg viewBox="0 0 10 10"><clippath id="c"><rect width="5" height="5"/></clippath></svg>')!;
    expect(out).toContain('viewBox="0 0 10 10"');
    expect(out).toContain('<clipPath id="c">');
  });

  it('keeps CSS in style blocks but drops outside urls and imports', () => {
    const out = sanitizeSvg('<svg><style><![CDATA[@import url(https://evil.example/a.css); .a{fill:url(#g)} .b{fill:url(https://evil.example/x)}]]></style></svg>')!;
    expect(out).toContain('.a{fill:url(#g)}');
    expect(out).not.toMatch(/evil\.example|@import/);
  });

  it('turns HTML entities into ones an image can parse', () => {
    expect(sanitizeSvg('<svg><text>5&nbsp;&times;&nbsp;3 &amp; x &lt; 2 & y</text></svg>'))
      .toContain('<text>5&#160;&#215;&#160;3 &amp; x &lt; 2 &amp; y</text>');
  });

  it('drops doctype, comments and processing instructions', () => {
    const out = sanitizeSvg('<?xml version="1.0"?><!DOCTYPE svg [<!ENTITY x "boom">]><!-- hi --><svg><text>&x;</text></svg>')!;
    expect(out).not.toMatch(/DOCTYPE|ENTITY|<!--|<\?/);
    expect(out).toContain('<text>&amp;x;</text>');
  });

  it('writes well-formed markup', () => {
    const NS = 'xmlns="http://www.w3.org/2000/svg"';
    expect(sanitizeSvg('<svg><rect/></svg>')).toBe(`<svg ${NS}><rect/></svg>`);
    expect(sanitizeSvg('<svg><g><rect/>')).toBe(`<svg ${NS}><g><rect/></g></svg>`);
    expect(sanitizeSvg('<svg width="2" height="1"/>')).toBe(`<svg ${NS} width="2" height="1" viewBox="0 0 2 1"/>`);
    expect(sanitizeSvg('<p>x</p><svg><text>a < b</text></svg><p>after</p>')).toBe(`<svg ${NS}><text>a &lt; b</text></svg>`);
  });

  it('returns null when there is no drawing', () => {
    expect(sanitizeSvg(null)).toBeNull();
    expect(sanitizeSvg('   ')).toBeNull();
    expect(sanitizeSvg('<div>not an svg</div>')).toBeNull();
    expect(sanitizeSvg('<script>alert(1)</script>')).toBeNull();
  });

  it('builds a data URL for an <img>', () => {
    expect(svgDataUrl('<svg><rect width="1" height="1"/></svg>')).toMatch(/^data:image\/svg\+xml;charset=utf-8,%3Csvg%20xmlns/);
    expect(svgDataUrl('nope')).toBeNull();
  });
});
