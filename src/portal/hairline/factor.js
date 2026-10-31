import { HL } from './kernel.js';

/**
 * Factor: a slab of twelve round studs that regroup into equal rows. Where the
 * pointer is across the stage picks the number of rows, six at the left to one
 * at the right; the studs slide into their new rows on the 700ms curve, each
 * one hopping up and pressing home in a wave that spreads from the pointer, and
 * the slab stretches to hold them. The front row takes the bright stroke: one
 * row, the size of each group. At rest three rows of four sit on the slab, the
 * front row still landing, nearest stud first. Each stud goes to the slot that
 * keeps the paths short and they slide together, so none passes through another;
 * a staggered slide would let one land in a lane another has yet to cross.
 * The slider is the stagger of the hop, in ms per stud pitch.
 *
 * The pattern: one of many. Tweens for the choice, a stagger by distance, and a
 * hit test on five fixed bands of screen x, which nothing drawn can move.
 */
const {
  Cam, clamp, facing, fit, prism, proj, rings, tdone, tset, tval, tween, unproj,
  disposer, mk, pointer, put, register, solid,
} = HL;

const N = 12, Q = 16, RS = 5, HS = 4, T = 6, W = Q / 2, X0 = 80, BW = 48, HOP = 5;
const ROWS = [6, 4, 3, 2, 1]; // the bands, left to right
const HOV = [11, 8.5, 6, 3.5]; // rest: the front row of four still landing
/** Stud k's place, [x, y], when the twelve stand in r rows: each row runs along x, centred on the origin. */
const slot = (k, r) => {
  const c = N / r;
  return [((k % c) - (c - 1) / 2) * Q, (Math.floor(k / c) - (r - 1) / 2) * Q];
};
const d2 = (p, q) => (p[0] - q[0]) ** 2 + (p[1] - q[1]) ** 2;
/** The slots of r rows handed to studs now at `from`: swap any two that shorten the squared paths, until none does.
 *  Then any two studs moving together stay at least Q / √2 apart, more than a stud is wide. */
function assign(from, r) {
  const a = Array.from({ length: N }, (_, k) => slot(k, r));
  for (let again = true; again;) {
    again = false;
    for (let i = 0; i < N; i++) for (let j = i + 1; j < N; j++) {
      if (d2(from[i], a[j]) + d2(from[j], a[i]) < d2(from[i], a[i]) + d2(from[j], a[j]) - 1e-6) { [a[i], a[j]] = [a[j], a[i]]; again = true; }
    }
  }
  return a;
}
/** The front row of r rows, and how high its stud at x hovers at rest. */
const inFront = (y, r) => y > (r - 2) * Q / 2;
const hov = (x) => HOV[Math.round(x / Q + 1.5)];

function mount({ stage, svg, read }, value) {
  const bag = disposer();
  let stag = value;

  // Fitted to the two longest poses, one row of twelve and six rows of two, and the landing row at rest.
  const C = Cam(45, 0.5, 2.45);
  fit(C, [
    [-96, -W, -T], [96, W, -T], [96, -W, HS], [-96, W, HS],
    [-16, -48, HS], [16, 48, -T], [16, -48, HS], [-16, 48, -T], [-24, Q, HOV[0] + HS],
  ], 200, 166);
  const P = proj(C), front = facing(C);

  const g = mk("g", {}, svg);
  const slab = solid(g), box = mk("g", {}, g);
  const st = Array.from({ length: N }, (_, k) => {
    const [x, y] = slot(k, 3), el = solid(box);
    el.sil.classList.toggle("hi", inFront(y, 3));
    // p runs 0 to 1, or back, once per regroup; the hop is its bump, 4p(1 - p)
    return { k, el, x: tween(x), y: tween(y), h: tween(inFront(y, 3) ? hov(x) : 0), p: tween(0), pt: 0, key: "", d: 0 };
  });

  let seq = "", sb = "";
  const loop = register(stage, (_dt, now) => {
    let moving = false, x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    for (const s of st) {
      const x = tval(s.x, now), y = tval(s.y, now), e = tval(s.p, now), h = tval(s.h, now) + HOP * 4 * e * (1 - e);
      if (!tdone(s.x, now) || !tdone(s.y, now) || !tdone(s.h, now) || !tdone(s.p, now)) moving = true;
      x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
      s.d = x + y;
      const key = x + "," + y + "," + h;
      if (key === s.key) continue;
      s.key = key;
      const [ring, inner] = rings(x - RS, y - RS, x + RS, y + RS, RS, 1.2);
      put(s.el, prism(P, front, ring, inner, h, h + HS));
    }
    // the slab holds the studs wherever they are: their box, half a pitch out
    const kb = [x0, x1, y0, y1].join();
    if (kb !== sb) {
      sb = kb;
      const [ring, inner] = rings(x0 - W, y0 - W, x1 + W, y1 + W, 4, 1.8);
      put(slab, prism(P, front, ring, inner, -T, 0));
    }
    // back to front by x + y, as the rows change; the svg moves only when the order changes
    const vis = st.slice().sort((a, b) => a.d - b.d), o = vis.map((v) => v.k).join();
    if (o !== seq) { seq = o; vis.forEach((v) => box.append(v.el.g)); }
    return moving;
  });
  bag.add(loop.unregister);

  // Five bands of screen x, never moved by anything drawn: six rows at the left, one at the right.
  const band = (x) => ROWS[clamp(Math.floor((x - X0) / BW), 0, ROWS.length - 1)];

  let rows = 0, at = [0, 0];
  /** Regroups into r rows (0 is rest). The slide is shared; the hop's stagger spreads from the pointer's place on the slab. */
  function choose(r, p) {
    if (p) at = unproj(C, p[0], p[1], 0);
    if (r === rows) return;
    rows = r;
    const now = performance.now(), m = r || 3;
    const from = st.map((s) => [tval(s.x, now), tval(s.y, now)]), to = assign(from, m);
    st.forEach((s, i) => {
      const [x, y] = to[i], f = inFront(y, m), dl = (Math.hypot(from[i][0] - at[0], from[i][1] - at[1]) / Q) * stag;
      tset(s.x, x, now, 0); tset(s.y, y, now, 0);
      tset(s.h, !r && f ? hov(x) : 0, now, dl);
      s.pt = 1 - s.pt; tset(s.p, s.pt, now, dl);
      s.el.sil.classList.toggle("hi", f);
    });
    read.textContent = r ? `12 = ${r} × ${N / r}` : "rest";
    loop.wake();
  }
  read.textContent = "rest";

  bag.add(pointer(stage, { move: (p) => choose(band(p[0]), p), leave: () => choose(0) }));
  bag.add(() => svg.replaceChildren());

  return {
    set: (v) => { stag = v; },
    destroy: bag.dispose,
  };
}

export default {
  name: "factor",
  means: "Twelve studs regroup into equal rows on a slab: move across it to pick how many rows, and the slab reshapes to hold them.",
  rules: [1, 2, 5, 8],
  range: [0, 35, 70],
  tour: [[296, 166], [248, 166], [104, 166], null],
  mount,
};
