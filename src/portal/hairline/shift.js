import { HL } from './kernel.js';

/**
 * Shift: a graphing plate turned square to the viewer, so the graph's x runs
 * across the screen and its y away, with a bar standing on it along an S, the
 * graph of f. A dashed copy stands where f itself sits, in the middle. The
 * pointer lands on the plate (which never moves) and snaps to the nearest grid
 * point; the bar's middle goes there on the 700ms curve, so the bar is f moved
 * right h and up k: f(x − h) + k. On the copy it is f(x) again. At rest it
 * stands right 2 and up 1, away from its copy. The slider is f's height, in units.
 *
 * The bar is a disc swept up its height and along the curve, as in parabola:
 * its outline is the curve pushed out, on each side, to that disc's farthest point.
 */
const {
  Cam, clamp, fit, facing, open, poly, prism, proj, rrect, seg, unproj,
  spring, stepS, tween, tset, tval, tdone, mk, pointer, put, register, disposer, solid,
} = HL;

const U = 12, XR = 5, YR = 4, M = 0.7, PB = 4, RW = 2.2, RH = 6, RB = 0.7;
const SP = 2.2, HX = 3, KY = 2, REST = [2, 1];
const R2 = Math.SQRT1_2;

/** f: one smooth wave with flat tails, a rise at x −1 and a dip at x 1, both of height a. It falls to the right, so the rest shift, up and right, clears it. */
const f = (x, a) => -a * x * Math.exp((1 - x * x) / 2);
/** Graph (x, y), in units, to world: x across the screen to the right, y away from the viewer. */
const W = (gx, gy) => [(gx - gy) * U * R2, (-gx - gy) * U * R2];
/** A ring laid out in graph units × U, turned onto the plate the same way. */
const turn = (ring) => ring.map((s) => ({ ...s, u: (s.u - s.v) * R2, v: (-s.u - s.v) * R2, nu: (s.nu - s.nv) * R2, nv: (-s.nu - s.nv) * R2 }));
const term = (h) => (h ? `x ${h > 0 ? "−" : "+"} ${Math.abs(h)}` : "x");
/** The shift, with minus signs that are minus signs. */
const form = (h, k) => `f(${term(h)})` + (k ? ` ${k > 0 ? "+" : "−"} ${Math.abs(k)}` : "");

function mount({ stage, svg, read }, value) {
  const bag = disposer();
  const C = Cam(45, 0.5, 2.25);
  fit(C, [[...W(-XR - M, -YR - M), -PB], [...W(XR + M, YR + M), -PB], [...W(XR + M, -YR - M), -PB], [...W(-XR - M, YR + M), -PB], [...W(0, YR + 0.2), RH]], 200, 166);
  const P = proj(C), front = facing(C);
  const at = (gx, gy, z) => P(...W(gx, gy), z);
  const o = P(0, 0, 0), d = (q) => [q[0] - o[0], q[1] - o[1]];
  const ex = d(P(1, 0, 0)), ey = d(P(0, 1, 0)), ez = d(P(0, 0, 1));

  // The plate and its ruling (inner lines only: the plate's own edge closes it), then the copy and the bar; the two swap places when the bar stands behind the copy.
  const g = mk("g", {}, svg);
  // a round of 10 is over 20 viewBox units on screen, so both rings take 14 steps a corner (rule 09)
  const px = (XR + M) * U, py = (YR + M) * U;
  put(solid(g), prism(P, front, turn(rrect(-px, -py, px, py, 10, 14)), turn(rrect(2.2 - px, 2.2 - py, px - 2.2, py - 2.2, 7.8, 14)), -PB, 0));
  let grid = "";
  for (let i = 1 - XR; i < XR; i++) grid += seg(at(i, -YR, 0), at(i, YR, 0));
  for (let j = 1 - YR; j < YR; j++) grid += seg(at(-XR, j, 0), at(XR, j, 0));
  mk("path", { d: grid, class: "nf lo" }, g);
  const ghost = mk("path", { class: "nf dash" }, g), bar = solid(g);
  bar.sil.classList.add("hi");

  /** The screen offset, from the foot of the bar's centre, of its cross-section's farthest point along n: a disc of radius r, lifted to RH when n looks up. */
  function reach(n, r, lift) {
    const dx = n[0] * ex[0] + n[1] * ex[1], dy = n[0] * ey[0] + n[1] * ey[1], m = Math.hypot(dx, dy) || 1;
    const up = lift && n[0] * ez[0] + n[1] * ez[1] > 0 ? RH : 0;
    return [(r * (dx * ex[0] + dy * ey[0])) / m + up * ez[0], (r * (dx * ex[1] + dy * ey[1])) / m + up * ez[1]];
  }
  const add = (p, v) => [p[0] + v[0], p[1] + v[1]];

  /** The bar along screen points c, left end to right end: {sil, crease}, as prism gives. */
  function rail(c) {
    const n = c.length, out = [], inn = [], cr = [];
    const nrm = c.map((_, i) => {
      const p = c[Math.max(0, i - 1)], q = c[Math.min(n - 1, i + 1)], m = Math.hypot(q[0] - p[0], q[1] - p[1]) || 1;
      return [-(q[1] - p[1]) / m, (q[0] - p[0]) / m]; // the near side: down on screen
    });
    const cap = (p, nn) => {
      const a0 = Math.atan2(nn[1], nn[0]), r = [];
      for (let j = 0; j <= 10; j++) r.push(add(p, reach([Math.cos(a0 - (Math.PI * j) / 10), Math.sin(a0 - (Math.PI * j) / 10)], RW, true)));
      return r;
    };
    c.forEach((p, i) => {
      const m = nrm[i];
      out.push(add(p, reach(m, RW, true)));
      inn.push(add(p, reach([-m[0], -m[1]], RW, true)));
      cr.push(add(add(p, reach(m, RW - RB, false)), [RH * ez[0], RH * ez[1]]));
    });
    const sil = out.concat(cap(c[n - 1], nrm[n - 1]), inn.reverse(), cap(c[0], [-nrm[0][0], -nrm[0][1]]));
    return { sil: poly(sil), crease: open(cr) };
  }
  /** f moved right h and up k, as screen points on the plate. */
  const curve = (h, k, a) => {
    const c = [];
    for (let x = -SP; x <= SP + 1e-9; x += 0.1) c.push(at(h + x, k + f(x, a), 0));
    return c;
  };

  const H = tween(REST[0]), K = tween(REST[1]), A = spring(value);
  let last = "", lastA = NaN, behind = null;
  function draw(h, k, a) {
    if (a !== lastA) { lastA = a; ghost.setAttribute("d", rail(curve(0, 0, a)).sil); }
    const key = [h, k, a].join();
    if (key === last) return;
    last = key;
    put(bar, rail(curve(h, k, a)));
    // the copy is glass: painted over the bar while the bar stands behind it, under it otherwise
    if (k > 0.01 !== behind) { behind = k > 0.01; if (behind) bar.g.after(ghost); else ghost.after(bar.g); }
  }
  draw(REST[0], REST[1], value);

  const B = register(stage, (dt, now) => {
    const m = stepS(A, dt);
    draw(tval(H, now), tval(K, now), A.x);
    return m || !tdone(H, now) || !tdone(K, now);
  });
  bag.add(B.unregister);

  /** Moves the bar's middle to the grid point under p, read on the plate's top, which never moves; null sends it to rest. */
  function aim(p) {
    let h = REST[0], k = REST[1];
    if (p) {
      const [X, Y] = unproj(C, p[0], p[1], 0);
      h = clamp(Math.round(((X - Y) * R2) / U), -HX, HX);
      k = clamp(Math.round(((-X - Y) * R2) / U), -KY, KY);
    }
    const now = performance.now();
    tset(H, h, now, 0);
    tset(K, k, now, 0);
    read.textContent = p ? form(h, k) : "rest";
    B.wake();
  }
  read.textContent = "rest";

  bag.add(pointer(stage, { move: aim, leave: () => aim(null) }));
  bag.add(() => svg.replaceChildren());

  return {
    set: (v) => { A.t = v; B.wake(); },
    destroy: bag.dispose,
  };
}

export default {
  name: "shift",
  means: "A bar shaped like f stands on a grid beside a dashed copy of f: slide it and it becomes f(x − h) + k.",
  rules: [1, 3, 6, 8],
  range: [1, 1.5, 2],
  tour: [[119, 165], [200, 192], [200, 165], null],
  mount,
};
