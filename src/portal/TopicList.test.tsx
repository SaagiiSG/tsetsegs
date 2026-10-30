import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { TopicList } from './TopicList';
import type { Video } from './TopicMap';
import { topicUnits } from './videoTopics';

const v = (id: string, module: string, order_index: number): Video => ({ id, title: `Video ${id}`, description: null, module, domain: 'Math', video_url: '', subtitles_vtt: null, labels: [], duration_minutes: null, order_index });
const units = topicUnits([v('e1', 'Exponents & Radicals', 1), v('e2', 'Exponents & Radicals', 2), v('f1', 'Functions', 3), v('q1', 'Quadratic Functions', 4)], new Set(['e1']));
const render = (selected: string | null) => renderToStaticMarkup(<TopicList units={units} selected={selected} onPick={() => {}} />);

describe('topic list', () => {
  it('shows every topic as a card, in book order, with its watched count', () => {
    const html = render('1');
    const at = ['Topic 1 · Exponents &amp; Radicals', 'Topic 5 · Functions', 'Topic 16 · Quadratic Functions'].map(t => html.indexOf(t));
    expect(at.every(i => i >= 0)).toBe(true);
    expect([...at].sort((a, b) => a - b)).toEqual(at);
    expect(html).toContain('1/2 watched');
    expect(html.match(/data-topic="/g)).toHaveLength(3);
  });
  it('marks only the chosen topic', () => {
    const html = render('5');
    expect(html.match(/aria-current="true"/g)).toHaveLength(1);
    expect(html.match(/data-active="true"/g)).toHaveLength(1);
    expect(html.slice(html.indexOf('aria-current="true"'))).toMatch(/^[^<]*>[\s\S]*?Topic 5 · Functions/);
    expect(render(null)).not.toContain('aria-current="true"');
  });
  it('colours each card by area', () => {
    const html = render(null);
    const before = html.slice(0, html.indexOf('Topic 5 · Functions'));
    expect(before.slice(before.lastIndexOf('style="'))).toContain('#7B6CF6');
  });
  it('no emoji', () => expect(render('1')).not.toMatch(/\p{Extended_Pictographic}/u));
});
