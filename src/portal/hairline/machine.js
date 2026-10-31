import { HL } from './kernel.js';

/**
 * Machine: a function machine. A rounded box with a hopper on top, a glass
 * column of output discs beside it, and a rail in front holding five balls,
 * the inputs 1 to 5 in order. The pointer picks a ball: it is tossed up into
 * the hopper and settles in its throat, and the column rises disc by disc to
 * f(x) = 2x + 1, staggered out from its old top. At rest the third ball hangs
 * over the mouth, about to drop, and the column holds the one disc that is
 * always there. The slider is the stagger between discs, in ms.
 *
 * The pattern: one of many. The input is a choice, so tweens; the hit test is
 * an oblique band through the balls' rest centres on the rail, which never move.
 */
const {
  Cam, circ, clamp, facing, fit, hull, lerp, open, poly, prism, proj, rad, ringAt, rings, run, r2,
  tdone, tset, tval, tween, disposer, flatDot, mk, place, pointer, put, register, solid,
} = HL;

const BH = 26, HB = 42, BR = 8; // the body: half its side, its height, its corner radius
const Z1 = HB + 10, RF = 6, RM = 17, LIP = 1.6; // the hopper: its mouth's height, throat and mouth radii, the lip
const R = 5.5, PITCH = 12, YR = 42, ZB = 7.5; // the balls, and the rail they sit in
const ZH = Z1 + 8 + R, ZT = HB + 4, LH = 0.7; // hanging over the mouth; seated high enough that no part of it shows under the hopper
const TX = 42, TY = -16, RT = 11, HT = 66, GL = 1.4, RD = 8.5, DH = 5.5, ND = 11; // the column: tube and discs
// At rest the third ball hangs over the mouth. The column waits until the ball is through the mouth: ~200ms on the lift curve.
const REST = 2, LAG = 200, BAND = 26, S = 2.3;
const XS = [0, 1, 2, 3, 4].map((i) => (i - 2) * PITCH);
const sh = (ring, x, y) => ring.map((q) => ({ ...q, u: q.u + x, v: q.v + y }));
const LR = (pts) => (pts[0][0] <= pts[pts.length - 1][0] ? pts : pts.slice().reverse());
/** How near the viewer a world point is: larger is nearer, so paint in ascending order. */
const depth = (p) => 0.612 * (p[0] + p[1]) + 0.5 * p[2];
const inside = (q) => Math.hypot(q[0], q[1]) < RM && q[2] - R < Z1;

/** Ball i along its path: L 0 in its slot, LH hanging over the mouth, 1 seated in the throat. */
function at(i, L) {
  if (L > LH) return [0, 0, lerp(ZH, ZT, (L - LH) / (1 - LH))];
  // it rises before it swings in, so it clears the body's top edge and the hopper's rim
  const u = L / LH, p = u * u;
  return [XS[i] * (1 - p), YR * (1 - p), lerp(ZB, ZH, Math.sin((Math.PI * u) / 2))];
}

/** The hopper, which never moves: `far` is painted before a ball inside it, `near` after. */
function hopper(P, front) {
  const foot = circ(RF, 48), mouth = circ(RM, 48), lip = circ(RM - LIP, 48);
  const h = hull(ringAt(P, foot, HB).concat(ringAt(P, mouth, Z1)));
  // the near wall's lower edge: the run of the hull below the mouth's centre
  const yc = P(0, 0, Z1)[1] + 0.01, low = h.map((p) => p[1] > yc);
  const s = low.findIndex((k, i) => k && !low[(i + h.length - 1) % h.length]), under = [];
  for (let i = 0; i < h.length && low[(s + i) % h.length]; i++) under.push(h[(s + i) % h.length]);
  const iF = LR(ringAt(P, run(lip, front), Z1)), oF = LR(ringAt(P, run(mouth, front), Z1)), U = LR(under);
  return {
    far: [
      [poly(h), "sil"],
      [poly(ringAt(P, lip, Z1)), "nf"],
      [open(ringAt(P, run(foot, (q) => !front(q)), HB)), "nf lo"],
    ],
    near: [[poly([...iF, ...U.slice().reverse()]), "fo"], [open(oF), "nf lo"], [open(iF), "nf"], [open(U), "nf sil"]],
  };
}

function mount({ stage, svg, read }, value) {
  const bag = disposer();
  let stag = value;

  // Fitted to the body, the rail, the full tube and the ball hanging over the mouth.
  const C = Cam(45, 0.5, S);
  fit(C, [
    [-BH, -BH, HB], [BH, BH, 0], [-31, 48, 0], [31, 48, 0], [-31, 36, 0],
    [TX + RT, TY - RT, 0], [TX - RT, TY + RT, HT], [TX - RT, TY - RT, HT], [0, 0, ZH + R],
  ], 200, 166);
  const P = proj(C), front = facing(C), rS = R * C.S;

  const g = mk("g", {}, svg);
  const [br, bi] = rings(-BH, -BH, BH, BH, BR, 2);
  put(solid(g), prism(P, front, br, bi, 0, HB));
  const H = hopper(P, front);
  for (const [d, cls] of H.far) mk("path", { d, class: cls }, g);
  const gIn = mk("g", {}, g);
  for (const [d, cls] of H.near) mk("path", { d, class: cls }, g);

  // the rail: a low plate with five dimples, one per input
  const [rr, ri] = rings(-31, 36, 31, 48, 5, 1.4);
  put(solid(g), prism(P, front, rr, ri, 0, 3));
  for (const x of XS) place(flatDot(g, C, 2.2, "dot off"), P(x, YR, 3));

  // the column: a glass tube, filled behind so the body does not show through, the discs, then the rim
  const tr = sh(circ(RT, 48), TX, TY);
  mk("path", { d: poly(hull(ringAt(P, tr, 0).concat(ringAt(P, tr, HT)))), class: "sil" }, g);
  const dg = mk("g", {}, g);
  mk("path", { d: open(ringAt(P, run(tr, front), HT)), class: "nf lo" }, g);
  mk("path", { d: poly(ringAt(P, sh(circ(RT - GL, 48), TX, TY), HT)), class: "nf" }, g);
  const gOut = mk("g", {}, g);

  const dr = sh(circ(RD, 48), TX, TY), di = sh(circ(RD - 1.6, 48), TX, TY);
  const discs = Array.from({ length: ND }, (_, j) => ({ el: solid(dg), s: tween(j < 1 ? 1 : 0), d: "" }));

  const balls = XS.map((_, i) => {
    const grp = mk("g", {}, gOut);
    const c = mk("ellipse", { rx: r2(rS), ry: r2(rS), class: i === REST ? "sil hi" : "sil" }, grp);
    return { i, grp, c, gl: mk("path", { class: "nf lo" }, grp), L: tween(i === REST ? LH : 0), q: at(i, 0), d: NaN };
  });
  /** A ball's one crease: a dim glint on its upper left. */
  const glint = ([x, y]) => open([0, 1, 2, 3, 4].map((k) => [x + 0.62 * rS * Math.cos(rad(200 + k * 14)), y + 0.62 * rS * Math.sin(rad(200 + k * 14))]));

  let order = "";
  const B = register(stage, (_dt, now) => {
    let moving = false;
    for (const b of balls) {
      const L = tval(b.L, now);
      if (!tdone(b.L, now)) moving = true;
      if (L === b.d) continue;
      b.d = L; b.q = at(b.i, L);
      const sp = P(...b.q);
      place(b.c, sp);
      b.gl.setAttribute("d", glint(sp));
    }
    // the stack: each disc stands on the ones under it, as tall as its tween says
    let z = 0;
    for (const dk of discs) {
      const s = tval(dk.s, now), z0 = z;
      if (!tdone(dk.s, now)) moving = true;
      z += s * DH;
      const key = s < 0.05 ? "" : z0 + "," + z;
      if (key === dk.d) continue;
      dk.d = key;
      put(dk.el, key ? prism(P, front, dr, di, z0, z) : { sil: "", crease: "" });
    }
    // back to front; a ball dropping into the mouth moves behind the hopper's near wall
    const sorted = balls.slice().sort((a, b) => depth(a.q) - depth(b.q));
    const key = sorted.map((b) => b.i + (inside(b.q) ? "v" : "")).join();
    if (key !== order) { order = key; for (const b of sorted) (inside(b.q) ? gIn : gOut).append(b.grp); }
    return moving;
  });
  bag.add(B.unregister);

  // Hit band: an oblique strip through the balls' rest centres on the rail. It never moves, and nothing draws it.
  const c0 = P(XS[0], YR, ZB), c4 = P(XS[4], YR, ZB), dx = (c4[0] - c0[0]) / 4, dy = (c4[1] - c0[1]) / 4;
  function hit([x, y]) {
    const s = (x - c0[0]) / dx;
    if (Math.abs(y - c0[1] - s * dy) > BAND || s < -0.7 || s > 4.7) return -1;
    return clamp(Math.round(s), 0, 4);
  }

  let act = -1, count = 1;
  /** Tosses ball a into the hopper (-1 puts it back). The column grows or shrinks from its old top. */
  function choose(a) {
    if (a === act) return;
    const now = performance.now(), c1 = a < 0 ? 1 : 2 * (a + 1) + 1, f = c1 > count ? count : count - 1;
    act = a; count = c1;
    balls.forEach((b, i) => {
      tset(b.L, i === a ? 1 : a < 0 && i === REST ? LH : 0, now, 0);
      b.c.classList.toggle("hi", a < 0 ? i === REST : i === a);
    });
    discs.forEach((dk, j) => tset(dk.s, j < c1 ? 1 : 0, now, (a < 0 ? 0 : LAG) + Math.abs(j - f) * stag));
    read.textContent = a < 0 ? "rest" : `f(${a + 1}) = ${c1}`;
    B.wake();
  }
  read.textContent = "rest";

  bag.add(pointer(stage, { move: (p) => choose(hit(p)), leave: () => choose(-1) }));
  bag.add(() => svg.replaceChildren());

  return {
    set: (v) => { stag = v; },
    destroy: bag.dispose,
  };
}

export default {
  name: "machine",
  means: "A function machine: toss an input into the hopper and the column of discs rises to its output, 2x + 1.",
  rules: [1, 5, 6, 8],
  range: [0, 40, 80],
  tour: [[92, 204], [131, 224], [170, 243], null],
  mount,
};
