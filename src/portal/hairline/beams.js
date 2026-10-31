import { HL } from './kernel.js';

/**
 * Beams: two beams of light lie on a ruled plate, each thrown by a lamp at the
 * plate's edge: two lines on a graph. The left lamp is fixed, along
 * y = 2x + 2; the right one pivots to aim at the pointer. The pointer lands on
 * the plate, which never moves, and the aim snaps to the nearest one that
 * crosses the fixed beam on a grid point, or to parallel. Where the beams
 * overlap, the patch lights up: the system's solution. Parallel beams light
 * nothing. The slider is the beams' width, in grid units.
 *
 * Light crosses light: both beams' fills are painted before either's edges,
 * so neither covers the other. The lamps stand on top of both.
 */
const {
  Cam, facing, fillet, fit, poly, prism, proj, rrect, seg, unproj,
  tween, tset, tval, tdone, flatDot, mk, place, pointer, put, register, disposer, solid,
} = HL;

const U = 12, Q = U / Math.SQRT2, L = 66, PB = 4, ED = 5.5, V = 5, END = L - 4, SP = 0.03;
const BL = 9, BW = 13, BH = 8, REST = "(0, 2)";

/** Graph (x, y) to world on the plate: x runs to the screen's right, y away from the viewer. */
const W = (gx, gy) => [(gx - gy) * Q, -(gx + gy) * Q];
const add = (a, b, s = 1) => [a[0] + b[0] * s, a[1] + b[1] * s];
const sub = (a, b) => [a[0] - b[0], a[1] - b[1]];
const crs = (a, b) => a[0] * b[1] - a[1] * b[0];
const num = (v) => (v < 0 ? "−" + -v : String(v));
// The fixed beam, y = 2x + 2, and its lamp past the plate's ruling; the pivoting lamp on the right-hand edge.
const F0 = W(0, 2), FD = [-1 / Math.sqrt(10), -3 / Math.sqrt(10)];
const LF = add(F0, FD, (57 - F0[1]) / FD[1]), LA = [57, 12];
/** An aim from the pivoting lamp: an angle off its inward normal (−1, 0), and back. Any line's angle, mod π. */
const angle = (d) => Math.atan(d[1] / d[0]);
const toward = (a) => [-Math.cos(a), -Math.sin(a)];
const gap = (a, b) => { const d = Math.abs(a - b) % Math.PI; return Math.min(d, Math.PI - d); };

/** Where the ray from p along k meets the plate's rim. */
const rim = (p, k) => add(p, k, Math.min(...[0, 1].map((i) => (k[i] ? ((k[i] > 0 ? END : -END) - p[i]) / k[i] : Infinity))));
/** The beam from o along d: w wide at the lamp, spreading as light does, to the rim. A quad on the floor, lamp end first. */
function quad(o, d, w) {
  const n = [-d[1], d[0]], a = add(o, n, w / 2), b = add(o, n, -w / 2);
  return [a, rim(a, add(d, n, SP)), rim(b, add(d, n, -SP)), b];
}

/** The part of convex polygon a inside convex polygon b: where the two beams overlap. */
function clip(a, b) {
  const s = Math.sign(crs(sub(b[1], b[0]), sub(b[2], b[1])));
  for (let i = 0; i < b.length && a.length; i++) {
    const p = b[i], e = sub(b[(i + 1) % b.length], p), side = (x) => s * crs(e, sub(x, p)), out = [];
    a.forEach((c, j) => {
      const nx = a[(j + 1) % a.length], sc = side(c), sn = side(nx);
      if (sc >= 0) out.push(c);
      if ((sc >= 0) !== (sn >= 0)) out.push(add(c, sub(nx, c), sc / (sc - sn)));
    });
    a = out;
  }
  return a;
}

/** A ring turned to face along d and set down at o. */
const turn = (ring, o, d) => ring.map(({ u, v, nu, nv }) => ({
  u: o[0] + u * d[0] - v * d[1], v: o[1] + u * d[1] + v * d[0], nu: nu * d[0] - nv * d[1], nv: nu * d[1] + nv * d[0],
}));

function mount({ stage, svg, read }, value) {
  const bag = disposer();
  const C = Cam(45, 0.5, 1.6);
  fit(C, [[-L, -L, 0], [L, L, -PB], [L, -L, -PB], [-L, L, -PB]], 200, 166);
  const P = proj(C), front = facing(C), flat = (pts) => pts.map(([x, y]) => P(x, y, 0));
  const at = (gx, gy) => P(...W(gx, gy), 0);
  let w = value * U;

  // The aims that cross the fixed beam on a grid point, clear of its lamp; then parallel, which crosses nowhere.
  const aims = [];
  for (let gx = -V; gx <= V; gx++) {
    const gy = 2 * gx + 2, X = W(gx, gy);
    if (Math.abs(gx) + Math.abs(gy) > V || Math.hypot(...sub(X, LF)) < 16) continue;
    aims.push({ a: angle(sub(X, LA)), say: `(${num(gx)}, ${num(gy)})` });
  }
  aims.push({ a: angle(FD), say: "no crossing" });
  const rest = aims.find((m) => m.say === REST);

  // The plate, its ruling and its two axes.
  const g = mk("g", {}, svg);
  // the plate's corners are large on screen: more steps round each, so no facet shows
  put(solid(g), prism(P, front, rrect(-L, -L, L, L, 10, 10), rrect(2.2 - L, 2.2 - L, L - 2.2, L - 2.2, 7.8, 10), -PB, 0));
  let grid = "", axes = "";
  for (let c = -V; c <= V; c++) {
    const e = ED - Math.abs(c), s = seg(at(c, -e), at(c, e)) + seg(at(-e, c), at(e, c));
    if (c) grid += s; else axes = s;
  }
  mk("path", { d: grid, class: "nf lo" }, g);
  mk("path", { d: axes, class: "nf lo" }, g);

  // Fills first, then edges: light on the floor washes out the ruling, and crosses the other beam's light.
  const fill = [mk("path", { class: "fo" }, g), mk("path", { class: "fo" }, g)];
  const edge = [mk("path", { class: "nf sil" }, g), mk("path", { class: "nf sil" }, g)];
  const mark = mk("g", {}, g), patch = mk("path", { class: "nf hi" }, mark), dot = flatDot(mark, C, 1.4, "dot");
  // The lamps, the farther first.
  const lamps = [LA, LF].map(() => solid(g));
  const ring = rrect(-BL / 2, -BW / 2, BL / 2, BW / 2, 3, 4), inner = rrect(1.2 - BL / 2, 1.2 - BW / 2, BL / 2 - 1.2, BW / 2 - 1.2, 1.8, 4);
  const lamp = (el, o, d) => put(el, prism(P, front, turn(ring, o, d), turn(inner, o, d), 0, BH));
  // A beam has no far end to draw: its two edges run out to the rim.
  const beam = (i, q) => {
    const s = flat(q);
    fill[i].setAttribute("d", poly(s));
    edge[i].setAttribute("d", seg(s[0], s[1]) + seg(s[3], s[2]));
  };
  lamp(lamps[1], LF, FD);

  const th = tween(rest.a);
  let drawn = "";
  function draw(now) {
    const a = tval(th, now), key = a + "," + w;
    if (key === drawn) return;
    drawn = key;
    const d = toward(a), qf = quad(LF, FD, w), qa = quad(LA, d, w);
    beam(0, qf);
    beam(1, qa);
    lamp(lamps[0], LA, d);
    // The lit patch: where the two beams overlap on the plate. Parallel, or crossing off it, lights nothing.
    const o = clip(qa, qf), on = o.length > 2;
    if (on !== mark.isConnected) on ? lamps[0].g.before(mark) : mark.remove();
    if (!on) return;
    patch.setAttribute("d", poly(flat(fillet(o, o.map(() => 1.2), 3))));
    place(dot, P(...add(LA, d, crs(FD, sub(LF, LA)) / crs(FD, d)), 0));
  }
  draw(performance.now());

  const B = register(stage, (_dt, now) => { draw(now); return !tdone(th, now); });
  bag.add(B.unregister);

  /** Aims the lamp at the ground point under p, read on the plate, which never moves; null sends it home. */
  function aim(p) {
    let m = rest;
    if (p) {
      const a = angle(sub(unproj(C, p[0], p[1], 0), LA));
      if (!Number.isNaN(a)) m = aims.reduce((b, c) => (gap(c.a, a) < gap(b.a, a) ? c : b));
    }
    tset(th, m.a, performance.now(), 0);
    read.textContent = p ? m.say : "rest";
    B.wake();
  }

  bag.add(pointer(stage, { move: aim, leave: () => aim(null) }));
  bag.add(() => svg.replaceChildren());

  return {
    set: (v) => { w = v * U; B.wake(); },
    destroy: bag.dispose,
  };
}

export default {
  name: "beams",
  means: "Two beams of light cross on a ruled plate; aim one lamp and the lit crossing is the system's solution, or parallel, none.",
  rules: [1, 4, 5, 6],
  range: [0.35, 0.6, 0.9],
  tour: [[219, 125], [181, 163], [162, 182], [280, 174], null],
  mount,
};
