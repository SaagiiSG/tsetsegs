import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { TopicMap, type Video } from './TopicMap';
import { topicUnits } from './videoTopics';

const v = (id: string, module: string, order_index: number): Video => ({ id, title: `Video ${id}`, description: null, module, domain: 'Math', video_url: '', subtitles_vtt: null, labels: [], duration_minutes: null, order_index });
const videosOf = (module: string, n: number, prefix = module[0].toLowerCase()) => Array.from({ length: n }, (_, i) => v(`${prefix}${i + 1}`, module, i));
const unitOf = (module: string, n: number, done: string[]) => topicUnits(videosOf(module, n), new Set(done))[0];
const moreUnit = (n: number) => topicUnits(videosOf('Extra practice', n, 'x'), new Set())[0];
const render = (unit: ReturnType<typeof unitOf>, next: string | null) => renderToStaticMarkup(<TopicMap unit={unit} nextVideoId={next} onOpen={() => {}} />);

describe('one topic map', () => {
  it('a 10-video topic shows 3 area figures, left-right-left, and padlocks on locked videos', () => {
    const html = render(unitOf('Exponents & Radicals', 10, ['e1']), 'e2');
    expect(html.match(/data-side="(left|right)"/g)).toEqual(['data-side="left"', 'data-side="right"', 'data-side="left"']);
    expect(html.match(/data-hairline="parabola"/g)).toHaveLength(1);
    expect(html.match(/data-hairline="padlock"/g)).toHaveLength(8);
    expect(html.match(/>Start</g)).toHaveLength(1);
    expect(html).toContain('Topic 1 · Exponents &amp; Radicals');
    expect(html).toContain('1/10 watched');
  });
  it('a one-video topic still shows two figures, after the chest', () => {
    const html = render(unitOf('Radians', 1, []), 'r1');
    expect(html.match(/data-side=/g)).toHaveLength(2);
    expect(html.indexOf('data-side="left"')).toBeGreaterThan(html.indexOf('viewBox="0 0 64 56"')); // after the chest
  });
  it('More videos has no figures', () => {
    expect(render(moreUnit(3), null)).not.toContain('data-side=');
  });
  it('nodes stay buttons with state labels', () => {
    const html = render(unitOf('Functions', 3, ['f1']), 'f2');
    expect(html).toMatch(/<button[^>]*aria-label="[^"]* — watched"/);
    expect(html).toMatch(/<button[^>]*aria-label="[^"]* — start"/);
    expect(html).toMatch(/<button[^>]*aria-label="[^"]* — locked"/);
  });
});
