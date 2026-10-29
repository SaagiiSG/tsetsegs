import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { TOPICS, topicUnits, upNext } from './videoTopics';

type J = { topic: number; name: string; area: string; videos: { id: string; order_index: number }[] }[];
const json: J = JSON.parse(readFileSync('docs/superpowers/specs/2026-10-28-center-student-portal-part2/topics.json', 'utf8'));
const v = (id: string, module: string | null, order_index: number) => ({ id, module, order_index });
const states = (u: { items: { state: string }[] }) => u.items.map(i => i.state);

describe('videoTopics', () => {
  it('TOPICS matches topics.json', () => {
    expect(TOPICS.map(t => [t.n, t.name, t.area])).toEqual(json.map(t => [t.topic, t.name, t.area]));
  });
  it('units follow book number, not order_index', () => {
    const units = topicUnits([v('a', 'Quadratic Functions', 1), v('b', 'Systems of Equations', 2)], new Set());
    expect(units.map(u => u.n)).toEqual([13, 16]);
  });
  it('skips topics without videos', () => {
    const all = json.flatMap(t => t.videos.map(x => v(x.id, t.name, x.order_index)));
    const ns = topicUnits(all, new Set()).map(u => u.n);
    expect(ns).not.toContain(7);
    expect(ns).not.toContain(23);
  });
  it('state per unit', () => {
    const units = topicUnits([v('a', 'Percent', 1), v('b', 'Percent', 2), v('c', 'Percent', 3), v('d', 'Angles', 4)], new Set(['a']));
    expect(states(units.find(u => u.name === 'Percent')!)).toEqual(['done', 'open', 'locked']);
    expect(states(units.find(u => u.name === 'Angles')!)).toEqual(['open']);
  });
  it('keeps old next open', () => {
    const all = json.flatMap(t => t.videos.map(x => v(x.id, t.name, x.order_index))).sort((a, b) => a.order_index - b.order_index);
    const k = Math.floor(all.length / 2);
    const done = new Set(all.slice(0, k).map(x => x.id));
    const items = topicUnits(all, done).flatMap(u => u.items);
    expect(items.find(i => i.video.id === all[k].id)!.state).toBe('open');
    expect(items.filter(i => done.has(i.video.id)).every(i => i.state === 'done')).toBe(true);
  });
  it('unknown module goes to More videos', () => {
    const units = topicUnits([v('a', 'Percent', 1), v('b', 'Quadratic Equationz', 2), v('c', null, 3)], new Set());
    const last = units[units.length - 1];
    expect(last).toMatchObject({ n: null, name: 'More videos', area: null });
    expect(last.items.map(i => i.video.id)).toEqual(['b', 'c']);
    expect(units).toHaveLength(2);
  });
  it('upNext is in the lowest unfinished topic', () => {
    const vids = [v('a', 'Exponents & Radicals', 1), v('b', 'Expressions', 2), v('c', 'Expressions', 3)];
    expect(upNext(topicUnits(vids, new Set(['a', 'b'])))).toEqual({ unitIndex: 1, videoId: 'c' });
    expect(upNext(topicUnits(vids, new Set(['a', 'b', 'c'])))).toBeNull();
  });
});
