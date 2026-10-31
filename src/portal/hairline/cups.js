import { HL } from './kernel.js';

/**
 * Cups: a measuring jug, with a spout, a handle and a scale of marks, on a tray
 * beside three small cups. The pointer pours. Along the row it tips the jug
 * toward the cups, on a spring, the further the further it goes; the cups up to
 * the one under it fill and the rest empty, one after another from the first
 * that changes, on the 700ms curve. Every cup holds the same amount, and the
 * jug holds what the cups have not taken: it drops one mark for each cup filled.
 * At rest the jug stands two marks down beside two full cups and an empty one.
 * The slider is the stagger between cups, in ms.
 *
 * The pattern: one of many, with a continuous tilt. The pick is the cup whose
 * rest centre is nearest the pointer's screen x: the cups never move, only fill.
 */
const {
  Cam, circ, clamp, facing, fit, hull, lerp, open, poly, proj, prism, rad, rrect, spring, stepS,
  tdone, tset, tval, tween, disposer, mk, pointer, put, register, solid,
} = HL;

const Q = Math.SQRT1_2, NS = 64, PHI = Array.from({ length: NS }, (_, i) => (i / NS) * 2 * Math.PI);
// the jug: foot and top radius, height, foot round, spout reach, rise and flare; the liquid's floor, one cup's drop, the cups it holds
const RF = 16, RT = 19, H = 56, BR = 3, SP = 7, SPZ = 3, LS = 10, F0 = 3, TK = 10, NJ = 4, WJ = -3;
// the cups: centres along the row, how many are full at rest, foot and top radius, height, fill line
const CU = [42, 70, 98], N = CU.length, REST = 2, CW = 5, CR0 = 8, CR1 = 9.5, HC = 22, CF = 13;
// the jug's tilt in degrees over the first and the last cup; the tray; the scale
const T1 = 8, T3 = 20, U0 = -24, U1 = 114, W0 = -22, W1 = 22, TB = 4, S = 2.15;

/** The row's frame, u along the row (screen right) and w toward the viewer, as a world point. */
const wp = (u, w, z) => [(u + w) * Q, (w - u) * Q, z];
/** A ring turned into the row's frame, so prism and facing read it as a world ring. */
const turn = (ring) => ring.map((q) => ({ u: (q.u + q.v) * Q, v: (q.v - q.u) * Q, nu: (q.nu + q.nv) * Q, nv: (q.nv - q.nu) * Q }));
const rw = (s) => RF + ((RT - RF) * s) / H;
const bump = (f) => Math.exp(-((Math.atan2(Math.sin(f), Math.cos(f)) / 0.38) ** 2));
const flare = (s) => clamp((s - H + LS) / LS, 0, 1) ** 2;

/** The jug tipped t degrees onto its front foot: (a toward the spout, b toward the viewer, s up its axis) to a world point. */
function jugAt(t) {
  const c = Math.cos(rad(t)), n = Math.sin(rad(t)), ap = RF - BR, dz = BR * (1 - c);
  return (a, b, s) => wp(ap + (a - ap) * c + s * n, WJ + b, (ap - a) * n + s * c + dz);
}
/** The jug's ring at height s, of radius r0, widened and raised toward the spout near the lip. */
const jring = (J, s, r0) => PHI.map((f) => {
  const m = flare(s) * bump(f), r = r0 + SP * m;
  return J(r * Math.cos(f), r * Math.sin(f), s + SPZ * m);
});
// the outline's rings, top first: the lip and the flare; then the foot's round, whose hull gives the underside
const LV = [0, 2, 4, 6, 8, 10].map((d) => [H - d, rw(H - d)]);
const FOOT = [90, 60, 30, 0].map((p) => [BR * (1 - Math.cos(rad(p))), RF - BR + BR * Math.sin(rad(p))]);

/** A C-shaped handle in a plane through the axis, [a, s] points: from s0 to s1, leaving a0 toward dir, reaching r, bw wide. */
function grip(a0, dir, s0, s1, r, bw) {
  const sm = (s0 + s1) / 2, hh = (s1 - s0) / 2;
  const at = (k, d) => { const f = -Math.PI / 2 + (k * Math.PI) / 12; return [a0 + dir * (r - d) * Math.max(0, Math.cos(f)) ** 0.6, sm + (hh - d) * Math.sin(f)]; };
  return [...Array.from({ length: 13 }, (_, k) => at(k, 0)), ...Array.from({ length: 13 }, (_, k) => at(12 - k, bw))];
}
const JH = grip(2 - rw(31), -1, 15, 47, 13, 4.2), CH = grip(7.2, 1, 5, 17, 7, 2.4);

const dot = (p, d) => p[0] * d[0] + p[1] * d[1];
/** The outline of rings that tip: each ring's two extremes across the axis on screen, joined over the top ring's far side and under the foot's hull. */
function outline(rs, foot) {
  const mid = (r) => r.reduce((m, p) => [m[0] + p[0] / r.length, m[1] + p[1] / r.length], [0, 0]);
  const t = mid(rs[0]), b = mid(foot), L = Math.hypot(t[0] - b[0], t[1] - b[1]);
  const ax = [(t[0] - b[0]) / L, (t[1] - b[1]) / L], nx = [-ax[1], ax[0]];
  const ext = (r) => r.reduce((e, p, i) => [dot(p, nx) < dot(r[e[0]], nx) ? i : e[0], dot(p, nx) > dot(r[e[1]], nx) ? i : e[1]], [0, 0]);
  const arc = (r, i, j) => { const o = [r[i]]; for (let q = i; q !== j; ) { q = (q + 1) % r.length; o.push(r[q]); } return o; };
  const lift = (x) => x.reduce((s, p) => s + dot(p, ax), 0) / x.length;
  const pick = (r, i, j, up) => { const a = arc(r, i, j), z = arc(r, j, i).reverse(); return (lift(a) > lift(z)) === up ? a : z; };
  const e0 = ext(rs[0]), h = hull(foot), eh = ext(h), side = (k) => rs.slice(1).map((r) => r[ext(r)[k]]);
  return [...pick(rs[0], e0[0], e0[1], true), ...side(1), ...pick(h, eh[1], eh[0], false), ...side(0).reverse()];
}

/** The camera, fitted to the tray and to the jug both standing and tipped all the way. */
function camera() {
  const C = Cam(45, 0.5, S), pts = [wp(CU[N - 1] + 18, CW, HC)];
  for (const t of [0, T3]) { const J = jugAt(t); pts.push(...jring(J, H, RT), ...JH.map(([a, s]) => J(a, 0, s))); }
  for (const u of [U0, U1]) for (const w of [W0, W1]) pts.push(wp(u, w, -TB));
  fit(C, pts, 200, 166);
  return { C, P: proj(C) };
}

function mount({ stage, svg, read }, value) {
  const bag = disposer();
  let stag = value, cur = REST, drawn = "";
  const { C, P } = camera(), pp = (p) => P(...p);
  const g = mk("g", {}, svg);
  put(solid(g), prism(P, facing(C), turn(rrect(U0, W0, U1, W1, 10, 6)), turn(rrect(U0 + 2, W0 + 2, U1 - 2, W1 - 2, 8, 6)), -TB, 0));

  // the jug, behind the cups: its handle's far edge and near face, the glass, the marks, the liquid, the lip
  const jg = mk("g", {}, g);
  const hb = mk("path", { class: "lo" }, jg), hf = mk("path", { class: "sil" }, jg), body = mk("path", { class: "sil" }, jg);
  const marks = mk("path", { class: "nf lo" }, jg), level = mk("path", { class: "nf" }, jg), lip = mk("path", { class: "nf" }, jg);

  const cring = (u, r, z) => circ(r, 48).map((q) => P(...wp(u + q.u, CW + q.v, z)));
  const cups = CU.map((u, i) => {
    const grp = mk("g", {}, g);
    mk("path", { d: poly(CH.map(([a, s]) => P(...wp(u + a, CW, s)))), class: "sil" }, grp);
    const sil = mk("path", { d: poly(hull([...cring(u, CR0 - 1.2, 0), ...cring(u, CR0, 1.2), ...cring(u, CR1, HC)])), class: "sil" }, grp);
    const liq = mk("path", { class: "nf" }, grp);
    mk("path", { d: poly(cring(u, CR1, HC)), class: "nf" }, grp);
    return { u, sil, liq, f: tween(i < REST ? 1 : 0), drawn: NaN };
  });

  function drawJug(t, full) {
    const J = jugAt(t), q = (a, b, s) => P(...J(a, b, s));
    const rs = LV.map(([s, r]) => jring(J, s, r).map(pp));
    body.setAttribute("d", poly(outline(rs, FOOT.flatMap(([s, r]) => jring(J, s, r).map(pp)))));
    lip.setAttribute("d", poly(rs[0]));
    hb.setAttribute("d", poly(JH.map(([a, s]) => q(a, -1.4, s))));
    hf.setAttribute("d", poly(JH.map(([a, s]) => q(a, 1.4, s))));
    marks.setAttribute("d", [1, 2, 3, 4].map((k) => {
      const s = F0 + k * TK, r = rw(s);
      return open([0, 1, 2, 3, 4].map((i) => q(r * Math.cos(rad(98 + 7 * i)), r * Math.sin(rad(98 + 7 * i)), s)));
    }).join(""));
    // the surface stays level as the jug tips: up each line of the wall, where it meets the plane through the axis at hL
    const hL = F0 + (NJ - full) * TK, tn = Math.tan(rad(t));
    level.setAttribute("d", poly(PHI.map((f) => {
      let s = hL;
      for (let k = 0; k < 2; k++) s = clamp(hL + (rw(s) - 0.6) * Math.cos(f) * tn, 0.6, H - 2);
      const r = rw(s) - 0.6;
      return q(r * Math.cos(f), r * Math.sin(f), s);
    })));
  }

  const tilt = spring(0);
  const B = register(stage, (dt, now) => {
    let moving = stepS(tilt, dt), full = 0;
    for (const c of cups) {
      const f = tval(c.f, now);
      if (!tdone(c.f, now)) moving = true;
      full += f;
      if (f === c.drawn) continue;
      c.drawn = f;
      const z = lerp(1.2, CF, f);
      c.liq.setAttribute("d", f < 0.03 ? "" : poly(cring(c.u, lerp(CR0, CR1, z / HC) - 0.5, z)));
    }
    const key = tilt.x + "," + full;
    if (key !== drawn) { drawn = key; drawJug(tilt.x, full); }
    return moving;
  });
  bag.add(B.unregister);

  // the cups' rest centres on screen, which never move
  const X = CU.map((u) => P(...wp(u, CW, HC / 2))[0]);
  const near = (x) => X.reduce((b, v, i) => (Math.abs(x - v) < Math.abs(x - X[b]) ? i : b), 0);
  /** Pours n cups: the cups that change fill or empty one after another, from the first that changes. */
  function choose(n, rest) {
    const now = performance.now();
    if (n !== cur) {
      const from = n > cur ? cur : cur - 1;
      cups.forEach((c, i) => tset(c.f, i < n ? 1 : 0, now, Math.abs(i - from) * stag));
      cur = n;
    }
    cups.forEach((c, i) => { c.sil.classList.toggle("hi", i === n - 1); c.liq.classList.toggle("hi", i === n - 1); });
    read.textContent = rest ? "rest" : n === 1 ? "1 cup = 8 oz" : `1 cup = 8 oz: ${n} cups → ${8 * n} oz`;
    B.wake();
  }
  choose(REST, true);

  bag.add(pointer(stage, {
    move: ([x]) => { tilt.t = lerp(T1, T3, clamp((x - X[0]) / (X[N - 1] - X[0]), 0, 1)); choose(near(x) + 1, false); },
    leave: () => { tilt.t = 0; choose(REST, true); },
  }));
  bag.add(() => svg.replaceChildren());

  return {
    set: (v) => { stag = v; },
    destroy: bag.dispose,
  };
}

export default {
  name: "cups",
  means: "A measuring jug pours into small cups that each hold the same amount, and its level drops one mark for every cup filled.",
  rules: [1, 2, 5, 8],
  range: [0, 50, 100],
  tour: [[196, 182], [317, 182], [257, 182], null],
  mount,
};
