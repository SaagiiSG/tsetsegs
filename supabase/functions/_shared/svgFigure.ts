// Cleans a question's drawn figure (questions.figure_svg) so it is safe to store and to show.
// The app draws the result as an <img> from a data: URL, where the browser already blocks
// scripts and outside loads; this allowlist is the second lock, and it also turns HTML-style
// markup into a standalone SVG an <img> can draw. Shared by src/components/QuestionFigures.tsx
// and sync-external-questions, so it uses no DOM or Deno APIs.

const SVG_NS = 'http://www.w3.org/2000/svg';
const XLINK_NS = 'http://www.w3.org/1999/xlink';

// Drawing elements we keep, by lower-case name -> the case XML needs.
const ELEMENTS = new Map(
  ['svg', 'g', 'defs', 'symbol', 'use', 'path', 'line', 'polyline', 'polygon', 'rect', 'circle', 'ellipse',
    'text', 'tspan', 'textPath', 'title', 'desc', 'marker', 'clipPath', 'mask', 'pattern', 'linearGradient',
    'radialGradient', 'stop', 'style', 'image'].map(n => [n.toLowerCase(), n]),
);
// Dropped together with everything inside them. Any other unknown tag is unwrapped (its children stay).
const DROP_WITH_CONTENT = new Set(['script', 'foreignobject', 'iframe', 'object', 'embed', 'noscript', 'template', 'handler']);
// Attributes HTML parsing lower-cases but SVG needs in camelCase.
const ATTR_CASE = new Map(
  ['viewBox', 'preserveAspectRatio', 'gradientUnits', 'gradientTransform', 'patternUnits', 'patternContentUnits',
    'patternTransform', 'markerWidth', 'markerHeight', 'markerUnits', 'refX', 'refY', 'clipPathUnits', 'maskUnits',
    'maskContentUnits', 'textLength', 'lengthAdjust', 'startOffset', 'pathLength', 'spreadMethod'].map(n => [n.toLowerCase(), n]),
);
// HTML named entities an <img> SVG cannot read (XML only knows amp, lt, gt, quot, apos).
const NAMED: Record<string, number> = {
  nbsp: 160, times: 215, divide: 247, minus: 8722, plusmn: 177, deg: 176, middot: 183, le: 8804, ge: 8805,
  ne: 8800, asymp: 8776, pi: 960, theta: 952, alpha: 945, beta: 946, gamma: 947, delta: 948, Delta: 916,
  lambda: 955, mu: 956, sigma: 963, Sigma: 931, omega: 969, Omega: 937, infin: 8734, radic: 8730, sup2: 178,
  sup3: 179, frac12: 189, frac14: 188, frac34: 190, hellip: 8230, ndash: 8211, mdash: 8212, lsquo: 8216,
  rsquo: 8217, ldquo: 8220, rdquo: 8221, prime: 8242, Prime: 8243, ang: 8736, perp: 8869,
};
const XML_ENTITIES = new Set(['amp', 'lt', 'gt', 'quot', 'apos']);

const TOKEN = new RegExp([
  '<!--[\\s\\S]*?(?:-->|$)', // comment
  '<!\\[CDATA\\[([\\s\\S]*?)(?:\\]\\]>|$)', // 1: CDATA text
  '<!DOCTYPE[^[>]*(?:\\[[\\s\\S]*?\\])?\\s*>', // doctype, including entity definitions
  '<![^>]*>|<\\?[\\s\\S]*?(?:\\?>|$)', // other declarations, processing instructions
  '<\\/\\s*([A-Za-z][\\w:.-]*)\\s*>', // 2: closing tag
  '<([A-Za-z][\\w:.-]*)((?:\\s+[^\\s=/>]+(?:\\s*=\\s*(?:"[^"]*"|\'[^\']*\'|[^\\s"\'>]+))?)*)\\s*(\\/?)>', // 3-5: opening tag
  '([^<]+)', // 6: text
  '(<)', // 7: a stray "<"
].join('|'), 'gi');
const ATTR = /([^\s=/>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+)))?/g;

// Keep valid XML entities, turn known HTML ones into numbers, escape any other "&".
const fixEntities = (s: string) =>
  s.replace(/&(#\d+|#x[0-9a-f]+|[a-z][a-z0-9]*);|&/gi, (m, name?: string) => {
    if (!name) return '&amp;';
    if (name[0] === '#' || XML_ENTITIES.has(name)) return m;
    return name in NAMED ? `&#${NAMED[name]};` : `&amp;${name};`;
  });

const decode = (s: string) =>
  s.replace(/&#x([0-9a-f]+);?/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);?/g, (_, d) => String.fromCodePoint(+d))
    .replace(/&(amp|lt|gt|quot|apos);/g, (_, n) => ({ amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" }[n as string]!));

// CSS may only point inside the drawing: no @import, no url() other than url(#id).
const cleanCss = (css: string) =>
  css.replace(/@import[^;]*;?/gi, '').replace(/url\(\s*(?!['"]?#)[^)]*\)/gi, 'none');

function cleanAttrs(raw: string, onXlink: () => void): [string, string][] {
  const kept: [string, string][] = [];
  for (const m of raw.matchAll(ATTR)) {
    const value = m[2] ?? m[3] ?? m[4];
    const lower = m[1].toLowerCase();
    const [prefix, local] = lower.includes(':') ? lower.split(':', 2) : ['', lower];
    if (value === undefined || local.startsWith('on')) continue;
    // eslint-disable-next-line no-control-regex -- drop control chars so java\0script: style tricks are caught
    const plain = decode(value).replace(/[\u0000-\u0020]/g, '');
    if (/javascript:|vbscript:|data:text\/html/i.test(plain)) continue;
    if (local === 'href') {
      if (!plain.startsWith('#') || (prefix && prefix !== 'xlink')) continue;
    } else if (prefix && lower !== 'xml:space' && lower !== 'xml:lang') {
      continue; // xmlns:* and editor attributes (inkscape:...) would leave unbound prefixes
    } else if (lower === 'xmlns' || local === 'src' || !/^[a-z_][\w.-]*$/.test(local)) {
      continue;
    }
    if (prefix === 'xlink') onXlink();
    let out = fixEntities(value).replace(/"/g, '&quot;').replace(/</g, '&lt;');
    if (/url\(|@import|expression\(/i.test(plain)) {
      if (/expression\(/i.test(plain)) continue;
      out = cleanCss(out);
    }
    kept.push([prefix ? lower : (ATTR_CASE.get(lower) ?? m[1]), out]);
  }
  return kept;
}

const toNumber = (v: string | undefined) => (v && /^\s*[\d.]+\s*(px)?\s*$/.test(v) ? parseFloat(v) : NaN);

/** A standalone, script-free SVG string, or null when the input holds no drawing. */
export function sanitizeSvg(input: string | null | undefined): string | null {
  if (!input || !input.trim()) return null;
  const out: string[] = [];
  const open: string[] = [];
  let skipping: { name: string; depth: number } | null = null;
  let rootAttrs: [string, string][] | null = null;
  let rootSelfCloses = false;
  let usesXlink = false;

  for (const m of input.matchAll(TOKEN)) {
    if (rootAttrs && open.length === 0) break; // the drawing has ended
    const [, cdata, closing, tag, attrs, selfClose, text, stray] = m;

    if (closing !== undefined) {
      const name = closing.toLowerCase();
      if (skipping) {
        if (name === skipping.name && --skipping.depth === 0) skipping = null;
        continue;
      }
      const canonical = ELEMENTS.get(name);
      if (canonical && open[open.length - 1] === canonical) out.push(`</${open.pop()}>`);
    } else if (tag !== undefined) {
      const name = tag.toLowerCase();
      if (skipping) {
        if (name === skipping.name && !selfClose) skipping.depth++;
        continue;
      }
      if (DROP_WITH_CONTENT.has(name.split(':').pop()!)) {
        if (!selfClose) skipping = { name, depth: 1 };
        continue;
      }
      const canonical = ELEMENTS.get(name);
      if (!canonical || (!rootAttrs && canonical !== 'svg')) continue;
      const kept = cleanAttrs(attrs, () => (usesXlink = true));
      if (!rootAttrs) {
        rootAttrs = kept;
        rootSelfCloses = !!selfClose;
        out.push(''); // filled in at the end, once we know whether xlink is used
      } else {
        out.push(`<${canonical}${kept.map(([k, v]) => ` ${k}="${v}"`).join('')}${selfClose ? '/' : ''}>`);
      }
      if (!selfClose) open.push(canonical);
    } else if (!skipping && open.length > 0) {
      const inStyle = open[open.length - 1] === 'style';
      let chunk = cdata !== undefined
        ? cdata.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        : stray !== undefined ? '&lt;' : fixEntities(text!);
      if (inStyle) chunk = cleanCss(chunk);
      out.push(chunk);
    }
  }
  if (!rootAttrs) return null;

  const attrs = rootAttrs.filter(([k]) => k !== 'xmlns:xlink');
  const has = (k: string) => attrs.find(([name]) => name === k)?.[1];
  if (!has('viewBox')) {
    const w = toNumber(has('width')), h = toNumber(has('height'));
    if (w > 0 && h > 0) attrs.push(['viewBox', `0 0 ${w} ${h}`]);
  }
  const ns: [string, string][] = [['xmlns', SVG_NS], ...(usesXlink ? [['xmlns:xlink', XLINK_NS] as [string, string]] : [])];
  out[0] = `<svg${[...ns, ...attrs].map(([k, v]) => ` ${k}="${v}"`).join('')}${rootSelfCloses ? '/' : ''}>`;
  while (open.length > 0) out.push(`</${open.pop()}>`);
  return out.join('');
}

/** data: URL for drawing the cleaned figure with an <img>, or null when there is nothing to draw. */
export function svgDataUrl(input: string | null | undefined): string | null {
  const svg = sanitizeSvg(input);
  return svg ? `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}` : null;
}
