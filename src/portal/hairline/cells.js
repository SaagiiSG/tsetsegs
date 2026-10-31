import { HL } from './kernel.js';

/**
 * Cells: a shallow round dish, a petri dish, and a culture whose cells each
 * split in two every step: 1, 2, 4, 8, 16, 32. The pointer's place across the
 * dish is the time, step 0 at the left rim to step 5 at the right; cells
 * divide, or merge back, on the 700ms curve, staggered outwards from the
 * pointer. A split is even: the two halves part from where the cell sat.
 * At rest eight cells lie spread over the dish and one is mid-split, bright.
 * When a step is chosen, the pair that split nearest the pointer takes it.
 * The slider is the stagger, in ms.
 *
 * The pattern: one of many, scrubbed. The step is a choice, so a tween per
 * cell; the hit test is six fixed bands across the dish's width. Where a cell
 * sits comes from one fixed plan: 32 places in the dish, halved again and
 * again into groups; at step s a cell sits at the middle of its group.
 */
const {
  Cam, circ, clamp, facing, fit, flatDot, hull, lerp, open, poly, proj, rad, ringAt, run, r2,
  tdone, tset, tval, tween, disposer, mk, place, pointer, register,
} = HL;

const R = 6, H = 4, D = 15, RI = 57, WT = 2, WH = 5, S = 2.45, STEPS = 5;
// rest: step 3, and one cell half-way through its split (cell 6 parting from cell 14, in the middle)
const PAIR = [6, 14], REST = Array.from({ length: 32 }, (_, j) => (PAIR.includes(j) ? 3.5 : 3));
/** The step at which cell j is born: cell j's parent is j less its top bit. */
const lvl = (j) => (j ? Math.floor(Math.log2(j)) + 1 : 0);
const LR = (pts) => (pts[0][0] <= pts[pts.length - 1][0] ? pts : pts.slice().reverse());
const mid = (g) => [0, 1].map((k) => g.reduce((t, q) => t + q[k], 0) / g.length);

/** 32 places on a hex lattice, the ones nearest an off-centre point, jittered so no row reads, then centred. */
function places() {
  const pts = [];
  for (let i = -5; i <= 5; i++) for (let j = -5; j <= 5; j++) {
    const x = (i + j / 2) * D, y = ((j * Math.sqrt(3)) / 2) * D;
    pts.push([x + 0.6 * Math.sin(i * 12.99 + j * 78.23), y + 0.6 * Math.sin(i * 39.35 + j * 11.13), Math.hypot(x - 2.7, y - 1.9)]);
  }
  const p = pts.sort((a, b) => a[2] - b[2]).slice(0, 32), m = mid(p);
  return p.map((q) => [q[0] - m[0], q[1] - m[1]]);
}

/** G[s][a]: the middle of group a at step s; the half that takes the newborn is a + 2^s. A group halves across the screen, then
 * along it, turned a little each time so the middles never line up in rows. */
function plan(pts) {
  const G = [[], [], [], [], [], []];
  (function split(g, s, a) {
    G[s][a] = mid(g);
    if (s === STEPS) return;
    const th = rad(((s + 1) % 2) * 90 - 65 + ((s * 31 + a * 53) % 40)), f = (q) => q[0] * Math.cos(th) + q[1] * Math.sin(th);
    const o = g.slice().sort((p, q) => f(p) - f(q));
    split(o.slice(0, o.length / 2), s + 1, a);
    split(o.slice(o.length / 2), s + 1, a + (1 << s));
  })(pts, 0, 0);
  return G;
}

/** Cell j at time t, on the ground: between its group's middle at the step before and the step after. Unborn, it sits inside its parent. */
function at(G, j, t) {
  const s = Math.min(Math.floor(t), STEPS - 1), f = t - s;
  const a = G[s][j & ((1 << s) - 1)], b = G[s + 1][j & ((1 << (s + 1)) - 1)];
  return [lerp(a[0], b[0], f), lerp(a[1], b[1], f)];
}

/** The dish, which never moves: `far` is painted before the cells, `near` after; each entry is [d, class]. */
function dish(P, front) {
  const outer = circ(RI + WT, 96), inner = circ(RI, 96);
  const iF = LR(ringAt(P, run(inner, front), WH)), oT = LR(ringAt(P, run(outer, front), WH)), oB = LR(ringAt(P, run(outer, front), 0));
  return {
    far: [
      [poly(hull(ringAt(P, outer, 0).concat(ringAt(P, outer, WH)))), "sil"],
      [poly(ringAt(P, inner, WH)), "nf"],
      [open(ringAt(P, run(inner, (q) => !front(q)), 0.6)), "nf lo"],
    ],
    // one opaque piece from the rim's inner edge down to the foot: the near wall
    near: [
      [poly([...iF, oT[oT.length - 1], ...oB.slice().reverse(), oT[0]]), "fo"],
      [open(oT), "nf lo"],
      [open(iF), "nf"],
      [open([oT[0], ...oB, oT[oT.length - 1]]), "nf sil"],
    ],
  };
}

function mount({ stage, svg, read }, value) {
  const bag = disposer();
  let stag = value;

  // Fitted to the dish: every cell, in every pose, lies inside its rim.
  const C = Cam(45, 0.5, S), c = (RI + WT) / Math.SQRT2;
  fit(C, [[-c, c, 0], [c, -c, 0], [c, c, 0], [-c, -c, WH]], 200, 166);
  const P = proj(C), front = facing(C), o = P(0, 0, 0);
  const G = plan(places()), paths = dish(P, front);

  const g = mk("g", {}, svg);
  for (const [d, cls] of paths.far) mk("path", { d, class: cls }, g);
  const box = mk("g", {}, g);
  for (const [d, cls] of paths.near) mk("path", { d, class: cls }, g);

  // Every cell is the same low dome with its nucleus on top, so it is drawn once and moved.
  const rel = (p) => [p[0] - o[0], p[1] - o[1]];
  const dome = poly(hull([0, 1, 2, 3, 4].flatMap((k) => ringAt(P, circ(R * Math.cos((k * Math.PI) / 8), 32), H * Math.sin((k * Math.PI) / 8)).map(rel))));
  const cells = REST.map((t0, j) => {
    const el = mk("g", {}, box), sil = mk("path", { d: dome, class: PAIR.includes(j) ? "sil hi" : "sil" }, el);
    place(flatDot(el, C, 1.25, "dot off"), rel(P(0, 0, H)));
    return { j, el, sil, t: tween(t0), key: null, on: false, depth: 0 };
  });

  let order = "";
  function frame(_dt, now) {
    let moving = false, moved = false;
    for (const cl of cells) {
      const t = tval(cl.t, now);
      if (!tdone(cl.t, now)) moving = true;
      // a newborn shows once it has parted a little from its parent
      const on = cl.j === 0 || t > lvl(cl.j) - 0.93, w = at(G, cl.j, t), key = on ? r2(w[0]) + "," + r2(w[1]) : "";
      if (key === cl.key) continue;
      cl.key = key; cl.on = on; cl.depth = w[0] + w[1]; moved = true;
      const p = P(w[0], w[1], 0);
      if (on) cl.el.setAttribute("transform", `translate(${r2(p[0])} ${r2(p[1])})`);
    }
    if (moved) {
      // back to front by x + y, as cells part past each other; hidden cells leave the svg
      const vis = cells.filter((cl) => cl.on).sort((a, b) => a.depth - b.depth), k = vis.map((cl) => cl.j).join();
      if (k !== order) { order = k; cells.forEach((cl) => cl.el.remove()); vis.forEach((cl) => box.append(cl.el)); }
    }
    return moving;
  }
  const B = register(stage, frame);
  bag.add(B.unregister);
  frame(0, performance.now());

  // Six bands of screen x across the dish, step 0 at the left rim. They never move.
  const xL = P(-c, c, 0)[0], xR = P(c, -c, 0)[0];
  const band = (x) => clamp(Math.floor(((x - xL) / (xR - xL)) * (STEPS + 1)), 0, STEPS);
  const beat = (RI * C.S) / 3; // a third of the dish's radius on screen is one beat of the stagger

  let act = -1, last = [200, 166];
  /** The pair that split at step m nearest the pointer (cell 0 alone at step 0), picked on their target places, which never move. */
  function pair(m) {
    if (m < 1) return [0];
    let b = 0, bd = Infinity;
    for (let j = 1 << (m - 1); j < 1 << m; j++) {
      const q = P(...G[m][j], 0), d = Math.hypot(q[0] - last[0], q[1] - last[1]);
      if (d < bd) { bd = d; b = j; }
    }
    return [b, b - (1 << (m - 1))];
  }
  /** Sets the step m (-1 is rest). Splits and merges spread out from the pointer, by each cell's distance from it now. */
  function choose(m) {
    if (m === act) return;
    const now = performance.now(), lit = m < 0 ? PAIR : pair(m);
    act = m;
    for (const cl of cells) {
      const q = P(...at(G, cl.j, tval(cl.t, now)), 0);
      tset(cl.t, m < 0 ? REST[cl.j] : m, now, (Math.hypot(q[0] - last[0], q[1] - last[1]) / beat) * stag);
      cl.sil.classList.toggle("hi", lit.includes(cl.j));
    }
    read.textContent = m < 0 ? "rest" : `step ${m}: ${1 << m} cell${m ? "s" : ""}`;
    B.wake();
  }
  read.textContent = "rest";

  bag.add(pointer(stage, { move: (p) => { last = p; choose(band(p[0])); }, leave: () => choose(-1) }));
  bag.add(() => svg.replaceChildren());

  return {
    set: (v) => { stag = v; },
    destroy: bag.dispose,
  };
}

export default {
  name: "cells",
  means: "Cells in a dish each split in two every step: sweep across it and one cell becomes 2, 4, 8, 16, then 32.",
  rules: [1, 2, 5, 8],
  range: [0, 45, 90],
  tour: [[129, 170], [224, 166], [319, 170], null],
  mount,
};
