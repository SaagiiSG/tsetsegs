import { HL } from './kernel.js';

/**
 * Scoop: a wide bin heaped with beads of two kinds, a third of them in the
 * darker stroke, and a round measuring scoop lifted above it holding a sample.
 * The pointer's x picks the scoop: small, medium or large. The cup widens and
 * more beads fill it, staggered out from the last bead in, while the bracket
 * beside it, the margin, closes. At rest the medium scoop tips toward the bin,
 * just lifted. The bracket is the one bright stroke. The slider is the stagger
 * between beads, in ms.
 *
 * The pattern: a discrete choice. Tweens for the size, the tilt and each bead;
 * the hit test is three fixed bands of screen x, which nothing drawn can move.
 */
const {
  Cam, circ, facing, fillet, fit, hull, open, poly, prism, proj, r2, ringAt, rings, rrect, run, seg,
  tdone, tset, tval, tween, disposer, mk, place, pointer, put, register, solid,
} = HL;

const R = 6.5, D = 13.5, S = 1.9; // a bead's radius, the step between beads, the scale
const BX = 104, BY = 60, BH = 24, BT = 4, BW = 2.4, BR = 9; // the bin: top footprint, height, taper, rim, corner
const SX = 40, SY = 24, Z1 = BH + 60, GL = 1.8, TAP = 1, HLEN = 19; // the scoop: centre, rim, wall, taper, handle
const TILT = -0.16, K = 1.8, BG = 11, ZC = Z1 - 7; // rest tilt (rise per unit x), bracket half-length per %, its gap, its centre
const DEEP = (rt) => 5 + 0.5 * rt; // a bigger scoop is deeper too: a cup, not a pan
const SIZES = [{ n: 10, m: 15, k: 3 }, { n: 30, m: 5, k: 6 }, { n: 100, m: 3, k: 12 }];
const LR = (pts) => (pts[0][0] <= pts[pts.length - 1][0] ? pts : pts.slice().reverse());
const at = (ring, x, y) => ring.map((s) => ({ ...s, u: s.u + x, v: s.v + y }));
const hash = (i) => { const s = Math.sin(i * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };

// The scoop's beads: a close packing round the middle of one triangle, nearest first (3, then 3, then 6).
const HT = (D * Math.sqrt(3)) / 2, CUP = [];
for (let b = -3; b <= 3; b++) for (let a = -3; a <= 3; a++) {
  const x = a * D + (b * D) / 2 - D / 2, y = b * HT - HT / 3;
  CUP.push([x, y, Math.round(Math.hypot(x, y) * 1e3) / 1e3]);
}
CUP.sort((p, q) => p[2] - q[2] || Math.atan2(p[1], p[0]) - Math.atan2(q[1], q[0]));
CUP.length = 12;
const CUP_A = [0, 4, 7, 10]; // one in three of every scoop is the darker kind, as in the bin
const RIN = SIZES.map((s) => CUP[s.k - 1][2] + R + 0.6); // each cup's inner radius, just round its beads
const rT = (i) => RIN[i] + GL;

// The bin's beads: a loose packing over its top, heaped toward the back; one in three the darker kind.
const BIN = [];
for (let j = 0, y; (y = BW + R + 1 + j * HT) <= BY - BW - R - 1; j++)
  for (let x = BW + R + 1 + (j % 2) * (D / 2); x <= BX - BW - R - 1; x += D) {
    const i = BIN.length, px = x + (hash(i) - 0.5) * 2.4, py = y + (hash(i + 50) - 0.5) * 2.4;
    BIN.push([px, py, BH - 1.5 + 5 * Math.exp(-((px - 62) ** 2 + (py - 22) ** 2) / 900), hash(i + 99) < 0.34]);
  }
BIN.sort((p, q) => p[0] + p[1] - q[0] - q[1]);

/** An open vessel from a foot ring at z0 to a top ring at z1: `far` is painted before what it holds, `near` after. */
function vessel(P, front, foot, top, inner, z0, z1) {
  const iF = LR(ringAt(P, run(inner, front), z1)), oT = LR(ringAt(P, run(top, front), z1)), oB = LR(ringAt(P, run(foot, front), z0));
  return {
    far: [[poly(hull(ringAt(P, foot, z0).concat(ringAt(P, top, z1)))), "sil"], [poly(ringAt(P, inner, z1)), "nf"]],
    near: [
      [poly([...iF, oT[oT.length - 1], ...oB.slice().reverse(), oT[0]]), "fo"],
      [open(oT), "nf lo"], [open(iF), "nf"], [open([oT[0], ...oB, oT[oT.length - 1]]), "nf sil"],
    ],
  };
}

/** A bead: its outline, in its kind's stroke, and the hole through it. */
function bead(parent, kind) {
  const g = mk("g", {}, parent);
  return { o: mk("ellipse", { class: kind ? "sil" : "" }, g), h: mk("ellipse", { class: "nf lo" }, g) };
}
function sizeBead(b, p, r) {
  const rr = r < 0.5 ? 0 : r2(r);
  place(b.o, p); place(b.h, p);
  b.o.setAttribute("rx", rr); b.o.setAttribute("ry", rr);
  b.h.setAttribute("rx", r2(rr * 0.28)); b.h.setAttribute("ry", r2(rr * 0.28));
}

function mount({ stage, svg, read }, value) {
  const bag = disposer();
  let stag = value, lv = -1;

  // Fitted to the bin, the large scoop with its handle, the tipped rest scoop and the widest bracket.
  const C = Cam(45, 0.5, S), q = Math.SQRT1_2, bx = (i) => SX + (rT(i) + BG) * q, by = (i) => SY - (rT(i) + BG) * q;
  fit(C, [
    [0, 0, BH + 6], [BX, 0, 0], [0, BY, 0], [BX, BY, 0], [0, BY, BH],
    [SX - rT(2) - HLEN, SY, Z1], [SX - rT(1) - HLEN, SY, Z1 - TILT * (rT(1) + HLEN)], [SX, SY, Z1 + 4 + R],
    [SX + rT(2) * q, SY + rT(2) * q, Z1 - DEEP(rT(2))], [bx(0), by(0), ZC + 15 * K], [bx(0), by(0), ZC - 15 * K], [bx(2), by(2), ZC],
  ], 200, 166);
  const P = proj(C), front = facing(C), rS = R * C.S;

  const g = mk("g", {}, svg);
  // The bin, which never moves, with a hand-hole in its short front face.
  const bin = vessel(P, front, rrect(BT, BT, BX - BT, BY - BT, BR - BT, 6), rrect(0, 0, BX, BY, BR, 6),
    rrect(BW, BW, BX - BW, BY - BW, BR - BW, 6), 0, BH);
  for (const [d, cls] of bin.far) mk("path", { d, class: cls }, g);
  for (const [x, y, z, kind] of BIN) sizeBead(bead(g, kind), P(x, y, z), rS);
  for (const [d, cls] of bin.near) mk("path", { d, class: cls }, g);
  const onFace = (ring) => ring.map((s) => P(BX - BT * (1 - s.v / BH), s.u, s.v));
  mk("path", { d: poly(onFace(rrect(BY / 2 - 11, BH - 10, BY / 2 + 11, BH - 4.5, 2.7, 5))), class: "nf" }, g);
  mk("path", { d: poly(onFace(rrect(BY / 2 - 9.5, BH - 8.8, BY / 2 + 9.5, BH - 5.7, 1.5, 5))), class: "nf lo" }, g);

  // The scoop, redrawn as it widens and levels: handle, far wall, beads, near wall; then the bracket.
  const handle = solid(g), hole = mk("path", { class: "nf lo" }, g);
  const far = [mk("path", { class: "sil" }, g), mk("path", { class: "nf" }, g)];
  const gb = mk("g", {}, g);
  const order = CUP.map((_, i) => i).sort((i, j) => CUP[i][0] + CUP[i][1] - CUP[j][0] - CUP[j][1]);
  const beads = [];
  for (const i of order) beads[i] = { ...bead(gb, CUP_A.includes(i)), a: tween(i < SIZES[1].k ? 1 : 0) };
  const near = ["fo", "nf lo", "nf", "nf sil"].map((cls) => mk("path", { class: cls }, g));
  const bracket = mk("path", { class: "nf hi" }, g);

  const rin = tween(RIN[1]), tilt = tween(TILT), mg = tween(SIZES[1].m * K);
  let drawn = "";
  const B = register(stage, (_dt, now) => {
    const r = tval(rin, now), t = tval(tilt, now), m = tval(mg, now), as = beads.map((b) => tval(b.a, now));
    const moving = !tdone(rin, now) || !tdone(tilt, now) || !tdone(mg, now) || beads.some((b) => !tdone(b.a, now));
    const key = [r, t, m, ...as].join();
    if (key === drawn) return moving;
    drawn = key;
    const Pt = (x, y, z) => P(x, y, z + t * (x - SX)), rt = r + GL;
    const [hr, hi] = rings(SX - rt - HLEN, SY - 4, SX - rt + 3, SY + 4, 4, 0.9);
    put(handle, prism(Pt, front, hr, hi, Z1 - 2.6, Z1));
    hole.setAttribute("d", poly(ringAt(Pt, at(circ(1.7, 16), SX - rt - HLEN + 5, SY), Z1)));
    const cup = vessel(Pt, front, at(circ(rt - TAP, 48), SX, SY), at(circ(rt, 48), SX, SY), at(circ(r, 48), SX, SY), Z1 - DEEP(rt), Z1);
    cup.far.forEach(([d], k) => far[k].setAttribute("d", d));
    cup.near.forEach(([d], k) => near[k].setAttribute("d", d));
    CUP.forEach(([x, y, rho], i) => sizeBead(beads[i], Pt(SX + x, SY + y, Z1 - 3 + 3.5 * (1 - rho / 24)), as[i] * rS));
    // the margin: a rounded bracket, its jaws turned to the scoop
    const c = [SX + (rt + BG) * q, SY - (rt + BG) * q], top = Pt(c[0], c[1], ZC + m), bot = Pt(c[0], c[1], ZC - m), w = 5;
    bracket.setAttribute("d", open(fillet([[top[0] - w, top[1]], top, bot, [bot[0] - w, bot[1]]], [0, 2.2, 2.2, 0], 4)));
    return moving;
  });
  bag.add(B.unregister);

  /** Picks scoop m (-1 is rest: the medium one, tipped). Beads join from the last one in, and leave last in first out. */
  function choose(m) {
    if (m === lv) return;
    const now = performance.now(), s = SIZES[m < 0 ? 1 : m], k0 = SIZES[lv < 0 ? 1 : lv].k, f = s.k > k0 ? k0 : k0 - 1;
    lv = m;
    beads.forEach((b, i) => tset(b.a, i < s.k ? 1 : 0, now, Math.abs(i - f) * stag));
    // a cup that narrows waits for the beads leaving it
    tset(rin, RIN[m < 0 ? 1 : m], now, s.k < k0 ? (k0 - 1 - s.k) * stag : 0);
    tset(tilt, m < 0 ? TILT : 0, now, 0);
    tset(mg, s.m * K, now, 0);
    read.textContent = m < 0 ? "rest" : `n ${s.n} · ±${s.m}%`;
    B.wake();
  }
  read.textContent = "rest";

  bag.add(pointer(stage, { move: (p) => choose(p[0] < 160 ? 0 : p[0] < 240 ? 1 : 2), leave: () => choose(-1) }));
  bag.add(() => svg.replaceChildren());

  return {
    set: (v) => { stag = v; },
    destroy: bag.dispose,
  };
}

export default {
  name: "scoop",
  means: "A scoop of beads from a bin: the bigger the scoop, the more beads in the sample, and the narrower the margin beside it.",
  rules: [1, 2, 5, 8],
  range: [0, 45, 90],
  tour: [[120, 150], [200, 150], [280, 150], null],
  mount,
};
