export type Area = 'Advanced Math' | 'Algebra' | 'Problem Solving & Data' | 'Geometry & Trig';

export const TOPICS: readonly { n: number; name: string; area: Area }[] = [
  { n: 1, name: 'Exponents & Radicals', area: 'Advanced Math' },
  { n: 2, name: 'Expressions', area: 'Advanced Math' },
  { n: 3, name: 'Manipulating & Solving Equations', area: 'Algebra' },
  { n: 4, name: 'Other Types of Equation Questions', area: 'Algebra' },
  { n: 5, name: 'Functions', area: 'Advanced Math' },
  { n: 6, name: 'Lines & Linear Relationships', area: 'Algebra' },
  { n: 7, name: 'Interpreting Linear Equations & Models', area: 'Algebra' },
  { n: 8, name: 'Percent', area: 'Problem Solving & Data' },
  { n: 9, name: 'Exponential vs. Linear Growth', area: 'Advanced Math' },
  { n: 10, name: 'Rates, Conversions, & Ratios', area: 'Problem Solving & Data' },
  { n: 11, name: 'Word Problems', area: 'Problem Solving & Data' },
  { n: 12, name: 'Quadratic Equations', area: 'Advanced Math' },
  { n: 13, name: 'Systems of Equations', area: 'Algebra' },
  { n: 14, name: 'Inequalities', area: 'Algebra' },
  { n: 15, name: 'Function Transformations', area: 'Advanced Math' },
  { n: 16, name: 'Quadratic Functions', area: 'Advanced Math' },
  { n: 17, name: 'Angles', area: 'Geometry & Trig' },
  { n: 18, name: 'Triangles', area: 'Geometry & Trig' },
  { n: 19, name: 'Circles', area: 'Geometry & Trig' },
  { n: 20, name: 'Radians', area: 'Geometry & Trig' },
  { n: 21, name: 'Trigonometry', area: 'Geometry & Trig' },
  { n: 22, name: 'Area, Perimeter, & Volume', area: 'Geometry & Trig' },
  { n: 23, name: 'Reading Data', area: 'Problem Solving & Data' },
  { n: 24, name: 'Probability', area: 'Problem Solving & Data' },
  { n: 25, name: 'Statistics I', area: 'Problem Solving & Data' },
  { n: 26, name: 'Statistics II', area: 'Problem Solving & Data' },
];

export const AREA_COLOR: Record<Area, { light: string; dark: string }> = {
  'Advanced Math': { light: '#7B6CF6', dark: '#A39AF9' },
  Algebra: { light: '#3B8DF5', dark: '#73AEF8' },
  'Problem Solving & Data': { light: '#FB8A4C', dark: '#FCA97C' },
  'Geometry & Trig': { light: '#E07CC8', dark: '#EBA3DA' },
};

export type VideoState = 'done' | 'open' | 'locked';
export type TopicUnit<V> = { n: number | null; name: string; area: Area | null; items: { video: V; state: VideoState }[]; watched: number; total: number };

export function topicUnits<V extends { id: string; module: string | null; order_index: number }>(videos: V[], done: Set<string>): TopicUnit<V>[] {
  const sorted = [...videos].sort((a, b) => a.order_index - b.order_index);
  const unit = (n: number | null, name: string, area: Area | null, vs: V[]): TopicUnit<V> => {
    let opened = false;
    const items = vs.map(video => {
      if (done.has(video.id)) return { video, state: 'done' as VideoState };
      const state: VideoState = opened ? 'locked' : 'open';
      opened = true;
      return { video, state };
    });
    return { n, name, area, items, watched: vs.filter(x => done.has(x.id)).length, total: vs.length };
  };
  const known = new Set(TOPICS.map(t => t.name));
  const units = TOPICS.map(t => unit(t.n, t.name, t.area, sorted.filter(x => (x.module ?? '').trim() === t.name))).filter(u => u.total > 0);
  const rest = sorted.filter(x => !known.has((x.module ?? '').trim()));
  return rest.length ? [...units, unit(null, 'More videos', null, rest)] : units;
}

export function upNext<V extends { id: string }>(units: TopicUnit<V>[]): { unitIndex: number; videoId: string } | null {
  for (let i = 0; i < units.length; i++) {
    const it = units[i].items.find(x => x.state === 'open');
    if (it) return { unitIndex: i, videoId: it.video.id };
  }
  return null;
}
