import { HL } from './kernel.js';

/**
 * Parabola: a graphing plate, ruled along its diagonals so the graph stands
 * upright on screen, with a bent rail standing on it along y = a(x − h)² + k.
 * The pointer is the vertex: it lands on the plate (which never moves), snaps
 * to the nearest grid point, and the turning point follows on a spring. Across,
 * the whole rail slides; up and down, the arms follow the turning point's
 * height on a second spring. The rail is cut where it meets the ruled edge.
 * The slider is a, the opening.
 *
 * The rail is a disc swept up its height and along the curve, so its outline
 * is the curve pushed out, on each side, to the farthest point of that swept
 * disc: no polygon union needed.
 */
const {
  Cam, clamp, facing, fit, lerp, open, poly, prism, proj, rings, seg, unproj,
  spring, stepS, flatDot, mk, place, pointer, put, register, disposer, solid,
} = HL;

const U = 12, Q = U / Math.SQRT2, L = 62, PB = 4, ED = 6.5, V = 5, TOP = 3;
const RW = 1.6, RH = 5, RB = 0.6, REST = [-1, -2];

/** Graph (x, y) to world on the plate: the graph's x runs to the screen's right, its y away from the viewer. */
const W = (gx, gy) => [(gx - gy) * Q, (-gx - gy) * Q];
const num = (v) => String(+v.toFixed(2));
/** The vertex form, with minus signs that are minus signs. */
const form = (a, h, k) =>
  `y = ${num(a) === "1" ? "" : num(a)}${h ? `(x ${h > 0 ? "−" : "+"} ${Math.abs(h)})` : "x"}²` +
  (k ? ` ${k > 0 ? "+" : "−"} ${Math.abs(k)}` : "");

function mount({ stage, svg, read }, value) {
  const bag = disposer();
  const C = Cam(45, 0.5, 1.7);
  fit(C, [[-L, -L, RH], [L, L, -PB], [L, -L, -PB], [-L, L, -PB]], 200, 166);
  const P = proj(C), front = facing(C);
  const at = (gx, gy, z) => P(...W(gx, gy), z);
  const o = P(0, 0, 0), d = (q) => [q[0] - o[0], q[1] - o[1]];
  const ex = d(P(1, 0, 0)), ey = d(P(0, 1, 0)), ez = d(P(0, 0, 1));

  // The plate, its ruling and its two axes, then the rail on top of them.
  const g = mk("g", {}, svg);
  const [pr, pi] = rings(-L, -L, L, L, 10, 2.2);
  put(solid(g), prism(P, front, pr, pi, -PB, 0));
  let grid = "", axes = "";
  for (let c = -6; c <= 6; c++) {
    const e = ED - Math.abs(c), s = seg(at(c, -e, 0), at(c, e, 0)) + seg(at(-e, c, 0), at(e, c, 0));
    if (c) grid += s; else axes = s;
  }
  mk("path", { d: grid, class: "nf lo" }, g);
  mk("path", { d: axes, class: "nf" }, g);
  const rod = solid(g), dot = flatDot(g, C, 1.3, "dot");

  /** The screen offset, from the foot of the rail's centre, of its cross-section's farthest point along n: a disc of radius r, lifted to RH when n looks up. */
  function reach(n, r, lift) {
    const dx = n[0] * ex[0] + n[1] * ex[1], dy = n[0] * ey[0] + n[1] * ey[1], m = Math.hypot(dx, dy) || 1;
    const up = lift && n[0] * ez[0] + n[1] * ez[1] > 0 ? RH : 0;
    return [(r * (dx * ex[0] + dy * ey[0])) / m + up * ez[0], (r * (dx * ex[1] + dy * ey[1])) / m + up * ez[1]];
  }
  const add = (p, v) => [p[0] + v[0], p[1] + v[1]];

  /** One arm, from the vertex outwards: near the vertex at height k, far out at k2; it stops at the ruled edge. */
  function arm(s, h, k, k2, a) {
    const pts = [];
    for (let t = 0; t <= 9; t += 0.1) {
      const q = [h + s * t, lerp(k, k2, (t * t) / (t * t + 1)) + a * t * t];
      const f = Math.abs(q[0]) + Math.abs(q[1]), p = pts[pts.length - 1];
      if (f > ED && p) {
        const fp = Math.abs(p[0]) + Math.abs(p[1]), u = (ED - fp) / (f - fp);
        if (u < 0.5 && pts.length > 1) pts.pop(); // no near-zero last step: the tip's normal comes from it
        pts.push([lerp(p[0], q[0], u), lerp(p[1], q[1], u)]);
        break;
      }
      pts.push(q);
    }
    return pts;
  }

  /** The rail along screen points c, left tip to right tip: {sil, crease}, as prism gives. */
  function rail(c) {
    const n = c.length, out = [], inn = [], cr = [];
    const nrm = c.map((_, i) => {
      const p = c[Math.max(0, i - 1)], q = c[Math.min(n - 1, i + 1)], m = Math.hypot(q[0] - p[0], q[1] - p[1]) || 1;
      return [-(q[1] - p[1]) / m, (q[0] - p[0]) / m]; // the outer side: down on screen at the vertex
    });
    const cap = (p, nn) => {
      const a0 = Math.atan2(nn[1], nn[0]), r = [];
      for (let j = 0; j <= 10; j++) r.push(add(p, reach([Math.cos(a0 - (Math.PI * j) / 10), Math.sin(a0 - (Math.PI * j) / 10)], RW, true)));
      return r;
    };
    c.forEach((p, i) => {
      const m = nrm[i], back = [-m[0], -m[1]];
      out.push(add(p, reach(m, RW, true)));
      inn.push(add(p, reach(back, RW, true)));
      cr.push(add(add(p, reach(m, RW - RB, false)), [RH * ez[0], RH * ez[1]]));
    });
    const sil = out.concat(cap(c[n - 1], nrm[n - 1]), inn.reverse(), cap(c[0], [-nrm[0][0], -nrm[0][1]]));
    return { sil: poly(sil), crease: open(cr) };
  }

  const H = spring(REST[0]), K = spring(REST[1]), K2 = spring(REST[1]), A = spring(value);
  let last = "", over = false;
  function draw() {
    const key = [H.x, K.x, K2.x, A.x].join();
    if (key === last) return;
    last = key;
    const left = arm(-1, H.x, K.x, K2.x, A.x).reverse(), right = arm(1, H.x, K.x, K2.x, A.x);
    put(rod, rail(left.concat(right.slice(1)).map(([x, y]) => at(x, y, 0))));
    place(dot, at(H.x, K.x, RH));
  }
  draw();

  const B = register(stage, (dt) => {
    let m = stepS(H, dt) | stepS(K, dt);
    K2.t = K.x; // the arms chase the turning point, not the pointer
    m |= stepS(K2, dt) | stepS(A, dt);
    draw();
    return !!m;
  });
  bag.add(B.unregister);

  const say = () => { read.textContent = over ? form(A.t, H.t, K.t) : "rest"; };
  /** Aims the vertex at the grid point under p, read on the plate's top, which never moves; null sends it home. */
  function aim(p) {
    over = !!p;
    if (p) {
      const [X, Y] = unproj(C, p[0], p[1], 0), h = clamp(Math.round((X - Y) / (2 * Q)), -V, V), e = V - Math.abs(h);
      H.t = h; K.t = clamp(Math.round(-(X + Y) / (2 * Q)), -e, Math.min(TOP, e));
    } else { H.t = REST[0]; K.t = REST[1]; }
    rod.sil.classList.toggle("hi", over);
    say();
    B.wake();
  }

  bag.add(pointer(stage, { move: aim, leave: () => aim(null) }));
  bag.add(() => svg.replaceChildren());

  return {
    set: (v) => { A.t = v; say(); B.wake(); },
    destroy: bag.dispose,
  };
}

export default {
  name: "parabola",
  means: "A bent rail stands on a graphing plate; the pointer is its vertex, and the arms follow it on a spring.",
  rules: [1, 3, 8, 9],
  range: [0.5, 1, 2],
  tour: [[241, 157], [139, 177], [200, 208], null],
  mount,
};
