import { HL } from './kernel.js';

/**
 * Jar: a glass jar with a shoulder and a short neck, holding ten marbles, three
 * of them marked with shading. The pointer picks a marble: it lifts out
 * through the neck and hangs above the mouth, and the others of its kind rise
 * a little, staggered outwards from it, so the kind you would draw stands out.
 * The read-out is the chance of drawing that kind. The slider is the stagger, in ms.
 *
 * The pattern: one of many. Tweens, a stagger by distance, kind carried by
 * geometry (the shading), and a hit test on the marbles' rest circles, so a marble
 * lifting out from under the pointer cannot flip the choice.
 */
const {
  Cam, circ, facing, fit, hull, lerp, open, poly, proj, rad, ringAt, run, r2, seg,
  tdone, tset, tval, tween, disposer, mk, place, pointer, register,
} = HL;

const R = 9, RB = 46, BR = 6, HB = 38, HN = 50, CR = 2.5, RN = 32, HT = 57, GL = 2, ZOUT = HT + 28, HOP = 5, S = 2.3;
// Ten marbles on the jar's floor, [x, y, z] at rest, loose enough that each shows; the first three are marked.
const M = [
  [17.7, 16.3, R], [-19.1, 23.3, R], [2.1, -24.7, R], [0, 28.3, R], [29, -2.1, R],
  [-3.5, 6.4, R], [11.3, -5.7, R], [21.9, -21.9, R], [-22.6, 5.7, R], [-11.3, -9.9, R],
];
const MARKED = 3, N = M.length;
/** How near the viewer a world point is: larger is nearer, so paint in ascending order. */
const depth = (p) => 0.612 * (p[0] + p[1]) + 0.5 * p[2];
const LR = (pts) => (pts[0][0] <= pts[pts.length - 1][0] ? pts : pts.slice().reverse());
const quarter = (f, n) => Array.from({ length: n + 1 }, (_, k) => f((k / n) * (Math.PI / 2)));

/** The jar, which never moves: a floor line seen through the glass (painted before the marbles), and the glass in front. */
function jar(P, front) {
  // the profile, [z, radius], mouth to floor: neck, a small round into the shoulder, the shoulder, the body, the foot's round
  const foot = quarter((t) => [BR - BR * Math.sin(t), RB - BR + BR * Math.cos(t)], 6);
  const prof = [
    [HT, RN],
    ...quarter((t) => [HN + CR - CR * Math.sin(t), RN + CR - CR * Math.cos(t)], 4),
    ...quarter((t) => [HB + (HN - HB) * Math.cos(t), RN + CR + (RB - RN - CR) * Math.sin(t)], 12),
    foot[0],
  ];
  const side = (sgn) => prof.map(([z, r]) => P((sgn * r) / Math.SQRT2, (-sgn * r) / Math.SQRT2, z));
  // under the foot, the outline is the lower edge of the hull of its rounded rings
  const h = hull(foot.flatMap(([z, r]) => ringAt(P, circ(r, 72), z)));
  const yF = P(0, 0, BR)[1] + 0.01, keep = h.map((p) => p[1] > yF);
  const s = keep.findIndex((k, i) => k && !keep[(i + h.length - 1) % h.length]), under = [];
  for (let i = 0; i < h.length && keep[(s + i) % h.length]; i++) under.push(h[(s + i) % h.length]);
  const neck = circ(RN, 72), back = (q) => !front(q);
  return {
    floor: open(ringAt(P, run(circ(RB - BR - GL, 72), back), 0)),
    glass: [
      [poly([...LR(ringAt(P, run(neck, back), HT)), ...side(1), ...LR(under).reverse(), ...side(-1).reverse()]), "nf sil"],
      [open(ringAt(P, run(neck, front), HN + CR)), "nf lo"],
      [open(ringAt(P, run(neck, front), HT)), "nf lo"],
      [poly(ringAt(P, circ(RN - GL, 72), HT)), "nf"],
    ],
  };
}

function mount({ stage, svg, read }, value) {
  const bag = disposer();
  let stag = value;

  // Fitted to the jar with a marble drawn out above the mouth, so nothing leaves the frame in any pose.
  const C = Cam(45, 0.5, S), c = RB / Math.SQRT2;
  fit(C, [[-c, c, HB], [c, -c, HB], [c, c, 0], [-c, -c, HT], [0, 0, ZOUT + R / 0.866]], 200, 166);
  const P = proj(C), front = facing(C), rS = R * C.S;
  const J = jar(P, front);

  const g = mk("g", {}, svg);
  mk("path", { d: J.floor, class: "nf lo" }, g);
  const gIn = mk("g", {}, g);
  for (const [d, cls] of J.glass) mk("path", { d, class: cls }, g);
  const gOut = mk("g", {}, g); // a marble wholly above the mouth is nearer than any glass under it

  const ms = M.map((p, i) => {
    const grp = mk("g", {}, gIn), kind = i < MARKED;
    const m = { p, i, kind, grp, at: P(...p), d0: depth(p), l: tween(0), h: tween(0), q: p, drawn: "" };
    m.c = mk("ellipse", { rx: r2(rS), ry: r2(rS), class: kind ? "sil hi" : "sil" }, grp);
    m.in = mk("path", { class: kind ? "nf" : "nf lo" }, grp);
    return m;
  });

  /** Inside a plain marble, a dim glint on its upper left, the one crease a sphere has; inside a marked one, three bands of shading. */
  const glint = ([x, y]) => open([0, 1, 2, 3, 4].map((k) => [x + 0.62 * rS * Math.cos(rad(200 + k * 14)), y + 0.62 * rS * Math.sin(rad(200 + k * 14))]));
  const shade = ([x, y]) => [-0.46, 0, 0.46].map((o) => {
    const c = [x + o * rS * Math.SQRT1_2, y + o * rS * Math.SQRT1_2], h = 0.74 * rS * Math.sqrt(1 - o * o) * Math.SQRT1_2;
    return seg([c[0] - h, c[1] + h], [c[0] + h, c[1] - h]);
  }).join("");

  let order = "";
  const B = register(stage, (_dt, now) => {
    let moving = false;
    for (const m of ms) {
      // drawn out: up and in along one line, which clears the shoulder and the neck
      const L = tval(m.l, now), k = 1 - L;
      m.q = [m.p[0] * k, m.p[1] * k, lerp(m.p[2], ZOUT, L) + tval(m.h, now)];
      if (!tdone(m.l, now) || !tdone(m.h, now)) moving = true;
      const key = m.q.join();
      if (key === m.drawn) continue;
      m.drawn = key;
      const sp = P(...m.q);
      place(m.c, sp);
      m.in.setAttribute("d", m.kind ? shade(sp) : glint(sp));
    }
    // back to front; a move between groups only when the order changes
    const sorted = ms.slice().sort((a, b) => depth(a.q) - depth(b.q));
    const key = sorted.map((m) => m.i + (m.q[2] - R > HT ? "^" : "")).join();
    if (key !== order) { order = key; for (const m of sorted) (m.q[2] - R > HT ? gOut : gIn).append(m.grp); }
    return moving;
  });
  bag.add(B.unregister);

  // Hit test on the rest circles, which never move: the nearest marble under the pointer,
  // else the closest one just beside it; over the drawn marble's target, the choice holds.
  const top = P(0, 0, ZOUT);
  let act = -1;
  function hit([x, y]) {
    let best = -1, near = -1, nd = 1.35 * rS;
    for (const m of ms) {
      const d = Math.hypot(x - m.at[0], y - m.at[1]);
      if (d <= rS && (best < 0 || m.d0 > ms[best].d0)) best = m.i;
      if (d < nd) { nd = d; near = m.i; }
    }
    if (best >= 0) return best;
    if (act >= 0 && Math.hypot(x - top[0], y - top[1]) <= rS) return act;
    return near;
  }

  /** Draws marble a out (-1 puts it back). Its kind rises a little, the stagger spreading from it. */
  function choose(a) {
    if (a === act) return;
    const now = performance.now(), from = ms[a >= 0 ? a : act].p, kind = a >= 0 && ms[a].kind;
    act = a;
    for (const m of ms) {
      const delay = (Math.hypot(m.p[0] - from[0], m.p[1] - from[1], m.p[2] - from[2]) / (2 * R)) * stag;
      tset(m.l, m.i === a ? 1 : 0, now, m.i === a ? 0 : delay);
      tset(m.h, a >= 0 && m.i !== a && m.kind === kind ? HOP : 0, now, delay);
      m.c.classList.toggle("hi", a < 0 ? m.kind : m.i === a);
    }
    read.textContent = a < 0 ? "rest" : (kind ? MARKED : N - MARKED) + " of " + N;
    B.wake();
  }

  bag.add(pointer(stage, { move: (p) => choose(hit(p)), leave: () => choose(-1) }));
  bag.add(() => svg.replaceChildren());

  return {
    set: (v) => { stag = v; },
    destroy: bag.dispose,
  };
}

export default {
  name: "jar",
  means: "Ten marbles in a jar, three marked: draw one out, its kind stirs, and the read-out gives the chance of drawing that kind.",
  rules: [1, 2, 4, 10],
  range: [0, 45, 90],
  tour: [[202, 244], [251, 239], null],
  mount,
};
