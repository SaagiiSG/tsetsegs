import { HL } from './kernel.js';

/**
 * Puzzle: a sentence laid out as a row of interlocking puzzle tiles, one tile
 * missing. Three loose pieces wait in front of the row, each with a different
 * tab; only the round one matches the notch the sentence leaves, the same
 * round joint the first two tiles already share. The pointer picks a piece: it
 * lifts, swings over the gap and lowers. The round one drops in flush and the
 * row lies flat; the others go in tab first and stop on the rim, tipped up,
 * unseated. At rest the round piece hangs just above the gap, dashed drops
 * under it. The slider is how far a wrong piece tips, in degrees.
 *
 * The pattern: one of many. Tweens for the choice, a stagger by distance, and
 * a hit test on fixed zones of the ground (the homes, the gap), so a piece
 * lifting out from under the pointer cannot flip the choice.
 */
const {
  Cam, extremes, fillet, fit, lerp, poly, proj, rad, rrect, seg, tdone, tset, tval, tween, unproj,
  disposer, mk, pointer, register,
} = HL;

const A = 30, T = 5, H = 18, ARC = 14, R0 = 2.5, STEP = 50, SX = 2.5 * A, SY = A / 2;
/** A bulb on a neck: the arc of radius r centred cx along the tab, from the neck's half-width h round to the other side. */
function bulb(cx, r, h, n) {
  const b = Math.PI - Math.asin(h / r), pts = [];
  for (let k = 0; k <= n; k++) { const f = -b + (k / n) * 2 * b; pts.push([cx + r * Math.cos(f), r * Math.sin(f), k === 0 || k === n ? 1 : 0]); }
  return pts;
}
// Tabs stand out along +u from an edge, centred on it: [u, v, corner radius]. Round, square, dovetail; only the round one fits.
const ROUND = [[0, -3.5, 1.2], ...bulb(8.5, 6, 3.5, 16), [0, 3.5, 1.2]];
const SQUARE = [[0, -6.5, 1.2], [11, -6.5, 2], [11, 6.5, 2], [0, 6.5, 1.2]];
const DOVE = [[0, -4.5, 1.2], [9, -8.5, 1.5], [9, 8.5, 1.5], [0, 4.5, 1.2]];
// The three loose pieces, in the order they wait from left to right: tab, home [x, y], yaw at home.
const LOOSE = [[SQUARE, 35, 92, -12], [DOVE, 112, 112, 10], [ROUND, 124, 74, -6]];
const RIGHT = 2, TIP = A / 2 + 13; // TIP: from a piece's middle past its longest wrong tab

/** An outline x0..x1 by y0..y1, corners rounded, with a tab on its right edge (+1 out, -1 a notch in, 0 straight) and on its left. */
function outline(x0, y0, x1, y1, tab, right, left) {
  const c = (y0 + y1) / 2, pts = [[x0, y0, R0], [x1, y0, R0]];
  if (right) for (const [u, v, r] of tab) pts.push([x1 + right * u, c + v, r]);
  pts.push([x1, y1, R0], [x0, y1, R0]);
  if (left) for (const [u, v, r] of tab.slice().reverse()) pts.push([x0 - left * u, c + v, r]);
  return fillet(pts.map((p) => [p[0], p[1]]), pts.map((p) => p[2]), 3);
}

function mount({ stage, svg, read }, value) {
  const bag = disposer();
  let tilt = value;

  // Fitted to the row, the pieces at home, a wrong piece at full tilt and one mid-flight, so nothing leaves the frame.
  const C = Cam(45, 0.5, 2.1);
  fit(C, [[0, 0, T], [4 * A, 0, T], [15, 110, 0], [150, 59, 0], [128, 124, 0], [60, 0, H + T], [60, 15, 30], [90, 50, 34]], 200, 166);
  const P = proj(C);
  const flat = (shape, z) => poly(shape.map(([x, y]) => P(x, y, z)));

  const g = mk("g", {}, svg);
  const gBase = mk("g", {}, g), gTop = mk("g", {}, g), guide = mk("path", { class: "nf dash" }, g), gOver = mk("g", {}, g);

  // The sentence: two tiles joined by a round knob, the gap, and a tile with the gap's round notch. It never moves.
  for (const shape of [outline(0, 0, A, A, ROUND, 1, 0), outline(A, 0, 2 * A, A, ROUND, 0, -1), outline(3 * A, 0, 4 * A, A, ROUND, 0, -1)]) {
    mk("path", { d: flat(shape, 0), class: "lo" }, gBase);
    mk("path", { d: flat(shape, T), class: "sil" }, gTop);
  }

  const pcs = LOOSE.map(([tab, hx, hy, yaw], i) => {
    const right = i === RIGHT;
    return {
      i, hx, hy, yaw, shape: outline(-A / 2, -A / 2, A / 2, A / 2, tab, 1, 0),
      base: mk("path", { class: "lo" }, gBase), top: mk("path", { class: right ? "sil hi" : "sil" }, gTop),
      p: tween(right ? 1 : 0), z: tween(right ? H : 0), tl: tween(0), drawn: "", over: false, key: 0,
    };
  });
  const sock = extremes(P, rrect(2 * A, 0, 3 * A, A, R0, 4));

  let stack = "";
  /** Back to front: pieces on the table split into the base and top passes; pieces wholly above the row go last, lowest first. */
  function restack() {
    const sorted = pcs.slice().sort((a, b) => (a.over - b.over) || (a.key - b.key));
    const s = sorted.map((pc) => pc.i + (pc.over ? "^" : "")).join();
    if (s === stack) return;
    stack = s;
    for (const pc of sorted) {
      if (pc.over) gOver.append(pc.base, pc.top);
      else { gBase.append(pc.base); gTop.append(pc.top); }
    }
  }

  const B = register(stage, (_dt, now) => {
    let moving = false;
    for (const pc of pcs) {
      const p = tval(pc.p, now), z = tval(pc.z, now), tl = tval(pc.tl, now);
      if (!tdone(pc.p, now) || !tdone(pc.z, now) || !tdone(pc.tl, now)) moving = true;
      const key = p + "," + z + "," + tl;
      if (key === pc.drawn) continue;
      pc.drawn = key;
      // lifts in an arc on the way, turns square to the row, and tips about its middle, tab end down
      const cx = lerp(pc.hx, SX, p), cy = lerp(pc.hy, SY, p), cz = z + ARC * Math.sin(Math.PI * p);
      const yw = rad(lerp(pc.yaw, 0, p)), ty = rad(tl), cw = Math.cos(yw), sw = Math.sin(yw), ct = Math.cos(ty), st = Math.sin(ty);
      const W = (u, v, w) => { const a = u * ct - w * st; return P(cx + a * cw - v * sw, cy + a * sw + v * cw, cz + u * st + w * ct); };
      pc.base.setAttribute("d", poly(pc.shape.map(([u, v]) => W(u, v, 0))));
      pc.top.setAttribute("d", poly(pc.shape.map(([u, v]) => W(u, v, T))));
      pc.over = cz - TIP * Math.abs(st) >= T - 0.01;
      pc.key = cz; // a camera ray falls as it goes, so of two flat pieces it meets the higher first
      // the dashed drops say where the round piece goes, while it hangs square over the gap
      if (pc.i === RIGHT) guide.setAttribute("d", pc.over && p > 0.99 ? sock.map((q) => seg(P(q.u, q.v, cz), P(q.u, q.v, T))).join("") : "");
    }
    restack();
    return moving;
  });
  bag.add(B.unregister);

  let act = -1;
  /** Retargets every piece for the choice act (-1 is rest), spreading from the piece picked, or the one let go. */
  function aim(from) {
    // a wrong piece goes in tab first and stops on the rim: tab tip just over the row, its back end up
    const now = performance.now(), lift = T + 2 + TIP * Math.sin(rad(tilt));
    for (const pc of pcs) {
      const d = Math.abs(pc.i - from) * STEP, here = pc.i === act, right = pc.i === RIGHT;
      tset(pc.p, here || (act < 0 && right) ? 1 : 0, now, d);
      tset(pc.z, here ? (right ? 0 : lift) : act < 0 && right ? H : 0, now, d);
      tset(pc.tl, here && !right ? -tilt : 0, now, d);
      pc.top.classList.toggle("hi", act < 0 ? right : here);
    }
    read.textContent = act < 0 ? "rest" : act === RIGHT ? "fits the gap" : "doesn't fit";
    B.wake();
  }
  function choose(a) {
    if (a === act) return;
    const from = a >= 0 ? a : act;
    act = a;
    aim(from);
  }

  // Fixed zones on the table, never the pieces on screen: the gap (or the piece hanging over it) holds the
  // choice, or drops the round piece at rest; the strip in front of the row picks the nearest home.
  const inGap = (q) => q[0] > 2 * A - 2 && q[0] < 3 * A + 14 && q[1] > -4 && q[1] < A + 4;
  function hit([x, y]) {
    const q = unproj(C, x, y, 0);
    if (inGap(q) || inGap(unproj(C, x, y, H + T))) return act >= 0 ? act : RIGHT;
    if (q[1] < A + 4) return -1;
    let best = -1, bd = 34;
    for (const pc of pcs) { const d = Math.hypot(q[0] - pc.hx, q[1] - pc.hy); if (d < bd) { bd = d; best = pc.i; } }
    return best;
  }
  read.textContent = "rest";

  bag.add(pointer(stage, { move: (p) => choose(hit(p)), leave: () => choose(-1) }));
  bag.add(() => svg.replaceChildren());

  return {
    set: (v) => { tilt = v; if (act >= 0) aim(act); },
    destroy: bag.dispose,
  };
}

export default {
  name: "puzzle",
  means: "A sentence of puzzle tiles with one gap: try a loose piece and only the one whose tab matches drops in flush.",
  rules: [1, 5, 6, 10],
  range: [6, 14, 22],
  tour: [[97, 162], [181, 234], [256, 215], null],
  mount,
};
