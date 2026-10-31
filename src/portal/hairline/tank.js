import { HL } from './kernel.js';

/**
 * Tank: a glass tank on four legs. A wide pipe pours in over the top; a small
 * tap near the floor drains out. Each stream is as wide as its rate, so the
 * pipe's stream is the wider. Five level lines are marked on the far wall,
 * one every 6 L, and the rim is the sixth; the water hides those it passes.
 *
 * The pointer's x scrubs time, snapped to whole minutes from 0 at the left to
 * 8 at the right; the water stands at (in − out) × t on the 700ms curve. At the
 * default rates (5 in, 2 out) each level line is two minutes. The water's
 * outline is the one bright stroke, at rest and when chosen. At rest the tank
 * is part full and both streams run. The slider is the tap's rate, in L/min.
 *
 * The pattern: a scrubbed choice. Time is discrete, so a tween; the hit test is
 * nine fixed bands of screen x, which nothing drawn can move.
 */
const {
  Cam, circ, clamp, facing, fit, hull, open, poly, prism, proj, ringAt, rings, run, seg,
  tdone, tset, tval, tween, disposer, mk, pointer, put, register, solid,
} = HL;

const W = 64, D = 46, RT = 5, GB = 1.4, LEG = 14, ZL = 1.35, STEP = 6, CAP = 6 * STEP, S = 2.1;
const IN = 5, REST = 10, RW = 0.55, TMAX = 8; // RW: a stream's radius per L/min
const Z0 = LEG, Z1 = LEG + CAP * ZL;
const XP0 = -12, XP1 = 30, YP = 21, RP = 4.4, ZP = Z1 + 13; // the inlet pipe, along x, its open end over the tank
const YT = 16, RTP = 2.4, XT = W + 7, ZT = Z0 + 4; // the tap: a stub out of the right-hand face, turned down at XT
const BX = 52, BW = 296 / (TMAX + 1); // nine bands of screen x, one a minute
/** A run of points ordered left to right on screen. */
const LR = (pts) => (pts[0][0] <= pts[pts.length - 1][0] ? pts : pts.slice().reverse());
/** A ring moved to stand at (x, y). */
const at = (ring, x, y) => ring.map((s) => ({ ...s, u: s.u + x, v: s.v + y }));

function mount({ stage, svg, read }, value) {
  const bag = disposer();
  let out = clamp(Math.round(value), 1, 3), t = -1;

  // Fitted to the legs, the rim, the pipe's far end and the tap's stream, the figure's extremes.
  const C = Cam(45, 0.5, S);
  fit(C, [[0, 0, Z1], [W, 0, 0], [0, D, 0], [W, D, 0], [XP0, YP - RP, ZP + RP], [XP0, YP + RP, ZP], [XT + 4, YT, 0]], 200, 166);
  const P = proj(C), front = facing(C), back = (q) => !front(q);

  /** A horizontal tube along x from x0 to x1: its hull, and the end at x1 as its crease (a bore when `bore`). */
  const tubeX = (x0, x1, y, z, r, bore) => {
    const end = (x, rr) => Array.from({ length: 32 }, (_, k) => P(x, y + rr * Math.cos((k * Math.PI) / 16), z + rr * Math.sin((k * Math.PI) / 16)));
    return { sil: poly(hull(end(x0, r).concat(end(x1, r)))), crease: bore ? poly(end(x1, r - bore)) : "" };
  };
  /** A falling stream of radius r, thinning a quarter as it falls from z1 to z0. */
  const fall = (x, y, r, z1, z0) => poly(hull(ringAt(P, at(circ(r, 32), x, y), z1).concat(ringAt(P, at(circ(0.75 * r, 32), x, y), z0))));
  /** A vertical cylinder at (x, y) from z0 to z1, with its top's crease. */
  const post = (x, y, r, z0, z1, b = 0.7) => prism(P, front, at(circ(r, 40), x, y), at(circ(r - b, 40), x, y), z0, z1);

  const g = mk("g", {}, svg);
  // The legs, back to front; the water's floor covers their tops.
  for (const [x, y] of [[3, 3], [3, D - 9], [W - 9, 3], [W - 9, D - 9]]) {
    const [r, i] = rings(x, y, x + 6, y + 6, 1.8, 0.8);
    put(solid(g), prism(P, front, r, i, 0, Z0));
  }
  mk("path", { d: poly(ringAt(P, at(circ(4.5, 40), XT, YT), 0)), class: "nf lo" }, g); // where the tap's stream lands

  // The glass: its far rim before what is inside, the rest after.
  const [outer, inner] = rings(0, 0, W, D, RT, GB);
  mk("path", { d: open(ringAt(P, run(outer, back), Z1)), class: "nf sil" }, g);
  mk("path", { d: open(ringAt(P, run(inner, back), Z1)), class: "nf lo" }, g);

  // The level lines, one every 6 L, on the far right-hand wall, clear of the stream: the water covers those it has passed.
  const lines = [1, 2, 3, 4, 5].map((k) => seg(P(16, GB, Z0 + k * STEP * ZL), P(W - 8, GB, Z0 + k * STEP * ZL))).join("");
  mk("path", { d: lines, class: "nf lo" }, g);
  const [wr, wi] = rings(GB, GB, W - GB, D - GB, RT - GB, 1.3);
  const water = solid(g);
  water.sil.classList.add("hi"); // the one bright mark: the level
  // The pipe's stream rises from under its mouth, so the pipe, painted after, hides where it starts; its ripple is behind it.
  const rip = mk("path", { class: "nf lo" }, g), sIn = mk("path", { class: "sil" }, g), XS = XP1 - IN * RW - 0.4;
  put(solid(g), tubeX(XP0, XP1, YP, ZP, RP, 1.2));

  const oT = LR(ringAt(P, run(outer, front), Z1)), oB = LR(ringAt(P, run(outer, front), Z0));
  mk("path", { d: open([oT[0], ...oB, oT[oT.length - 1]]), class: "nf sil" }, g);
  mk("path", { d: open(oT), class: "nf sil" }, g);
  mk("path", { d: open(ringAt(P, run(inner, front), Z1)), class: "nf lo" }, g);

  // The tap: its stream first, so the nozzle covers the stream's top.
  const sOut = mk("path", { class: "sil" }, g);
  put(solid(g), tubeX(W - 1, XT, YT, ZT, RTP, 0));
  put(solid(g), post(XT, YT, RTP, ZT - 4.5, ZT + RTP));
  put(solid(g), post(XT, YT, 0.9, ZT + RTP, ZT + RTP + 2.6, 0.3));
  put(solid(g), post(XT, YT, 2.6, ZT + RTP + 2.6, ZT + RTP + 3.8, 0.8));

  const lv = tween(REST), ow = tween(out);
  let drawn = "";
  const B = register(stage, (_dt, now) => {
    const L = tval(lv, now), o = tval(ow, now), key = L + "," + o;
    if (key !== drawn) {
      drawn = key;
      const zw = Z0 + Math.max(0.6, L * ZL), ri = IN * RW, ro = o * RW;
      put(water, prism(P, front, wr, wi, Z0, zw));
      sIn.setAttribute("d", fall(XS, YP, ri, ZP, zw));
      rip.setAttribute("d", poly(ringAt(P, at(circ(ri + 3, 40), XS, YP), zw)));
      sOut.setAttribute("d", fall(XT, YT, ro, ZT - 3, 0));
    }
    return !tdone(lv, now) || !tdone(ow, now);
  });
  bag.add(B.unregister);

  const caption = () => (t < 0 ? "rest" : `${t} min: ${t * (IN - out)} L (${IN} in − ${out} out)`);
  /** Scrubs to minute m (-1 is rest): the water goes to what has come in less what has gone out. */
  function choose(m) {
    if (m === t) return;
    t = m;
    tset(lv, m < 0 ? REST : m * (IN - out), performance.now(), 0);
    read.textContent = caption();
    B.wake();
  }
  read.textContent = "rest";

  bag.add(pointer(stage, {
    move: (p) => choose(clamp(Math.floor((p[0] - BX) / BW), 0, TMAX)),
    leave: () => choose(-1),
  }));
  bag.add(() => svg.replaceChildren());

  return {
    set: (v) => {
      out = clamp(Math.round(v), 1, 3);
      const now = performance.now();
      tset(ow, out, now, 0);
      if (t >= 0) tset(lv, t * (IN - out), now, 0);
      read.textContent = caption();
      B.wake();
    },
    destroy: bag.dispose,
  };
}

export default {
  name: "tank",
  means: "A pipe fills a tank while a tap drains it: scrub time, and the water rises at the net rate, what comes in less what goes out.",
  rules: [1, 4, 6, 8, 10],
  range: [1, 2, 3],
  tour: [[134, 170], [266, 170], [331, 170], null],
  mount,
};
