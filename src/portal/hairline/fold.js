import { HL } from './kernel.js';

/**
 * Fold: a paper strip lying on a plate, folded in half again and again. The
 * pointer marks where the strip should end: it gets the fold count n, 0 to 4,
 * whose length, 1/2ⁿ of the strip, lies nearest the pointer on the ground.
 * Each fold lifts the near half up and over onto the far half, so the strip
 * halves and its sheets double; a dashed outline keeps the whole length on
 * the plate. At rest the strip is caught mid-fold, its near half standing up
 * over the far half. The slider is the sheet's thickness.
 *
 * The pattern: a discrete choice on one tween. The fold count is tweened as
 * one number f: floor(f) folds are done and the next has turned f's fraction
 * of a half turn, so folds always happen in order, and unfold in reverse.
 * The hit test reads the ground, which never moves.
 */
const {
  Cam, clamp, facing, fit, open, poly, prism, proj, ringAt, rings, run, unproj,
  tdone, tset, tval, tween, disposer, mk, pointer, put, register, solid,
} = HL;

const L = 208, WD = 26, M = 10, PB = 4, R = 4, B = 1.4, TMAX = 2.2, REST = 0.62;
const SUP = ["⁰", "⁻¹", "⁻²", "⁻³", "⁻⁴"];

function mount({ stage, svg, read }, value) {
  const bag = disposer();
  let t = value;

  // Fitted to the plate, the thickest stack, and the first fold's half standing straight up: the most extreme pose.
  const C = Cam(45, 0.5, 1.6);
  fit(C, [[-M, -M, -PB], [L + M, WD + M, -PB], [L + M, -M, -PB], [-M, WD + M, -PB],
    [L / 2, 0, L / 2 + TMAX], [L / 2, WD, L / 2 + TMAX], [0, 0, 16 * TMAX]], 200, 166);
  const P = proj(C);
  // the direction toward the viewer: the world vector the camera flattens to a point
  const o = P(0, 0, 0), e = [P(1, 0, 0), P(0, 1, 0), P(0, 0, 1)].map((p) => [p[0] - o[0], p[1] - o[1]]);
  const V = [e[1][0] * e[2][1] - e[2][0] * e[1][1], e[2][0] * e[0][1] - e[0][0] * e[2][1], e[0][0] * e[1][1] - e[1][0] * e[0][1]];

  const g = mk("g", {}, svg);
  const [pr, pi] = rings(-M, -M, L + M, WD + M, 8, 2);
  put(solid(g), prism(P, facing(C), pr, pi, -PB, 0));
  // the whole strip's footprint, a guide on the plate, painted before the strip
  mk("path", { d: poly(ringAt(P, rings(0, 0, L, WD, R, B)[0], 0)), class: "nf dash" }, g);

  // two slabs: the strip's lying part, and the half in the air while a fold turns
  const parts = [0, 1].map(() => { const s = solid(g); return { s, lines: mk("path", { class: "nf lo" }, s.g) }; });
  parts.forEach((q) => q.s.sil.classList.add("hi")); // the strip is the one thing that answers: always the bright one

  /** Slab part: len long, m sheets thick, its far end at x0, turned phi about the hinge (hx, hz). The sheets show as lines round its sides. */
  function slab(part, x0, len, m, phi, hx, hz) {
    const c = Math.cos(phi), s = Math.sin(phi), h = m * t;
    const Q = (u, v, w) => { const x = x0 + u - hx, z = w - hz; return P(hx + x * c - z * s, v, hz + x * s + z * c); };
    const front = (q) => q.nu * (c * V[0] + s * V[2]) + q.nv * V[1] > 0;
    const [ring, inner] = rings(0, 0, len, WD, R, B);
    const up = c * V[2] - s * V[0] > 0; // the top faces the viewer; turned over, the underside does
    put(part.s, prism(Q, front, ring, inner, up ? 0 : h, up ? h : 0));
    const side = run(ring, front);
    let d = "";
    for (let k = 1; k < m; k++) d += open(ringAt(Q, side, k * t));
    part.lines.setAttribute("d", d);
  }

  function draw(v) {
    const n = Math.min(Math.floor(v), 4), p = v - n, len = L / 2 ** n, m = 2 ** n;
    const [base, flap] = parts;
    if (p < 1e-4) {
      slab(base, 0, len, m, 0, 0, 0);
      put(flap.s, { sil: "", crease: "" });
      flap.lines.setAttribute("d", "");
    } else {
      // the near half turns up and over about the far half's top edge
      slab(base, 0, len / 2, m, 0, 0, 0);
      slab(flap, len / 2, len / 2, m, p * Math.PI, len / 2, m * t);
    }
  }

  const f = tween(REST);
  let drawn = NaN;
  const loop = register(stage, (_dt, now) => {
    const v = tval(f, now);
    if (v !== drawn) { drawn = v; draw(v); }
    return !tdone(f, now);
  });
  bag.add(loop.unregister);

  let n = -1;
  /** Folds to k (-1 is rest). */
  function choose(k) {
    if (k === n) return;
    n = k;
    tset(f, k < 0 ? REST : k, performance.now(), 0);
    read.textContent = k < 0 ? "rest" : `2${SUP[k]} = ${k ? "1/" + 2 ** k : 1}`;
    loop.wake();
  }
  read.textContent = "rest";

  // The fold count whose length lies nearest the pointer on the ground, which never moves.
  const pick = (p) => clamp(Math.round(Math.log2(L / Math.max(unproj(C, p[0], p[1], 0)[0], 1))), 0, 4);
  bag.add(pointer(stage, { move: (p) => choose(pick(p)), leave: () => choose(-1) }));
  bag.add(() => svg.replaceChildren());

  return {
    set: (v) => { t = v; drawn = NaN; loop.wake(); },
    destroy: bag.dispose,
  };
}

export default {
  name: "fold",
  means: "A paper strip folds in half again and again: each fold halves its length and doubles its sheets, so n folds leave 2⁻ⁿ of it.",
  rules: [1, 5, 8, 10],
  range: [1, 1.6, 2.2],
  tour: [[200, 202], [112, 158], [292, 248], null],
  mount,
};
