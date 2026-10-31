import { HL } from './kernel.js';

/**
 * Bins: a sorting tray with two open bins at the back, one shaped for three
 * x-tiles lying side by side, one for two unit tiles, and five algebra tiles
 * lying mixed on the tray in front of them. The pointer picks a bin: the tiles
 * of its kind lift, square up and drop into it, staggered outwards from the
 * bin by distance, while the other kind settles back where it lay. At rest the
 * three x-tiles carry the bright stroke: like terms, still scattered.
 * The slider is the stagger, in ms.
 *
 * The pattern: one of many. Tweens for the choice, a stagger by distance, kind
 * carried by shape, and a hit test on the bins' footprints, which never move.
 */
const {
  Cam, facing, fit, hull, lerp, open, poly, prism, proj, rad, ringAt, rings, rrect, run, unproj,
  tdone, tset, tval, tween, disposer, mk, pointer, put, register, solid,
} = HL;

const U = 12, L = 38, T = 4, GP = 3, WT = 2.4, BR = 4, WH = 10, FL = 4, LIFT = 16, PB = 4, PX = 108, PY = 100;
const LR = (pts) => (pts[0][0] <= pts[pts.length - 1][0] ? pts : pts.slice().reverse());
/** A bin sized to hold n tiles of one kind side by side, its far corner at (x0, y0); kind 0 holds x-tiles. */
const bin = (kind, x0, y0, n, say) => {
  const len = kind ? U : L, x1 = x0 + 2 * WT + n * U + (n + 1) * GP, y1 = y0 + 2 * WT + len + 2 * GP;
  const slots = Array.from({ length: n }, (_, j) => [x0 + WT + GP + U / 2 + j * (U + GP), (y0 + y1) / 2]);
  return { kind, x0, y0, x1, y1, cx: (x0 + x1) / 2, cy: (y0 + y1) / 2, slots, say };
};
const BINS = [bin(0, 5, 5, 3, "x terms: 3x"), bin(1, 63, 5, 2, "units: 2")];
// The scatter at rest, mixed: [kind, x, y, turn in degrees]
const REST = [[0, 25, 76, 58], [1, 67, 62, 20], [0, 62, 88, 96], [1, 95, 70, -26], [0, 84, 43, 96]];

/** A ring turned by th radians about the origin, then moved to (x, y); normals turn with it. */
const turn = (ring, x, y, th) => {
  const c = Math.cos(th), s = Math.sin(th);
  return ring.map((q) => ({ u: x + q.u * c - q.v * s, v: y + q.u * s + q.v * c, nu: q.nu * c - q.nv * s, nv: q.nu * s + q.nv * c }));
};

/** A bin, which never moves: `far` is painted before what it holds, `near` after; each entry is [d, class, bright with the bin]. */
function walls(P, front, b) {
  const outer = rrect(b.x0, b.y0, b.x1, b.y1, BR, 6), inner = rrect(b.x0 + WT, b.y0 + WT, b.x1 - WT, b.y1 - WT, BR - WT, 6);
  const iF = LR(ringAt(P, run(inner, front), WH)), oT = LR(ringAt(P, run(outer, front), WH)), oB = LR(ringAt(P, run(outer, front), 0));
  return {
    far: [
      [poly(hull(ringAt(P, outer, 0).concat(ringAt(P, outer, WH)))), "sil", true],
      [poly(ringAt(P, inner, WH)), "nf", false],
      [open(ringAt(P, run(inner, (q) => !front(q)), FL)), "nf lo", false],
    ],
    // one opaque piece from the rim's inner edge down to the foot covers the near half of what the bin holds
    near: [
      [poly([...iF, oT[oT.length - 1], ...oB.slice().reverse(), oT[0]]), "fo", false],
      [open(oT), "nf lo", false],
      [open(iF), "nf", false],
      [open([oT[0], ...oB, oT[oT.length - 1]]), "nf sil", true],
    ],
  };
}

function mount({ stage, svg, read }, value) {
  const bag = disposer();
  let stag = value;

  // Fitted to the tray and a tile at the top of its flight into the far bin.
  const C = Cam(45, 0.5, 2.3);
  fit(C, [[0, 0, -PB], [PX, PY, -PB], [PX, 0, -PB], [0, PY, -PB], [BINS[0].cx, BINS[0].cy + 20, LIFT + FL + T]], 200, 166);
  const P = proj(C), front = facing(C);

  const g = mk("g", {}, svg);
  // the tray's corners are large on screen, so its rings take more steps than rings() gives
  put(solid(g), prism(P, front, rrect(0, 0, PX, PY, 9, 14), rrect(2.2, 2.2, PX - 2.2, PY - 2.2, 6.8, 14), -PB, 0));

  // Bins back to front, each with a group between its far and near walls for what it holds; the scatter goes last.
  const bins = BINS.map((b) => {
    const w = walls(P, front, b), hi = [];
    const draw = ([d, cls, bright]) => { const el = mk("path", { d, class: cls }, g); if (bright) hi.push(el); };
    w.far.forEach(draw);
    const hold = mk("g", {}, g);
    w.near.forEach(draw);
    return { ...b, hold, hi };
  });
  const loose = mk("g", {}, g);

  const shapes = [rings(-U / 2, -L / 2, U / 2, L / 2, 2.2, 1.1), rings(-U / 2, -U / 2, U / 2, U / 2, 2.2, 1.1)];
  const used = [0, 0];
  const tiles = REST.map(([kind, x, y, deg], i) => {
    const b = BINS[kind], [sx, sy] = b.slots[used[kind]++];
    const el = solid(loose);
    if (kind === 0) el.sil.classList.add("hi");
    const d = BINS.map((b) => Math.hypot(x - b.cx, y - b.cy));
    return { i, kind, x, y, d, th: rad(deg), sx, sy, g: tween(0), el, drawn: NaN, key: 0, in: false };
  });

  let order = "";
  const B = register(stage, (_dt, now) => {
    let moving = false, moved = false;
    for (const t of tiles) {
      const k = tval(t.g, now);
      if (!tdone(t.g, now)) moving = true;
      if (k === t.drawn) continue;
      t.drawn = k; moved = true;
      // lift, carry and square up, then drop: over its slot at k = .75, the tile falls the rest straight down
      const h = 1 - (1 - Math.min(k / 0.75, 1)) ** 2;
      const x = lerp(t.x, t.sx, h), y = lerp(t.y, t.sy, h), z = lerp(0, FL, k) + LIFT * Math.sin(Math.PI * k);
      const [ring, inner] = shapes[t.kind], th = lerp(t.th, 0, h);
      put(t.el, prism(P, front, turn(ring, x, y, th), turn(inner, x, y, th), z, z + T));
      const b = BINS[t.kind];
      t.in = x > b.x0 && x < b.x1 && y > b.y0 && y < b.y1;
      t.key = x + y + 1.5 * z;
    }
    if (moved) {
      // back to front by depth, inside the bin once the tile is over it; groups move only when the order changes
      const sorted = tiles.slice().sort((p, q) => p.key - q.key);
      const s = sorted.map((t) => t.i + (t.in ? "b" : "")).join();
      if (s !== order) { order = s; for (const t of sorted) (t.in ? bins[t.kind].hold : loose).append(t.el.g); }
    }
    return moving;
  });
  bag.add(B.unregister);

  // Hit test on the bins' footprints at half their height, which never move: the nearest within reach.
  function hit([sx, sy]) {
    const [x, y] = unproj(C, sx, sy, WH / 2);
    let best = -1, bd = 7;
    BINS.forEach((b, i) => {
      const d = Math.hypot(Math.max(b.x0 - x, 0, x - b.x1), Math.max(b.y0 - y, 0, y - b.y1));
      if (d < bd) { bd = d; best = i; }
    });
    return best;
  }

  let act = -1;
  /** Fills bin a with its kind (-1 puts every tile back). The stagger spreads out from the bin chosen, or the one let go. */
  function choose(a) {
    if (a === act) return;
    const now = performance.now(), f = a >= 0 ? a : act;
    act = a;
    for (const t of tiles) {
      // rank among its kind by distance from the bin: the nearest tile goes first
      const delay = tiles.filter((u) => u.kind === t.kind && u.d[f] < t.d[f]).length * stag;
      tset(t.g, a >= 0 && t.kind === a ? 1 : 0, now, delay);
      t.el.sil.classList.toggle("hi", t.kind === (a < 0 ? 0 : a));
    }
    bins.forEach((b, i) => b.hi.forEach((el) => el.classList.toggle("hi", i === a)));
    read.textContent = a < 0 ? "rest" : BINS[a].say;
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
  name: "bins",
  means: "Mixed algebra tiles on a tray: point at a bin and the tiles of its kind gather into it, like terms combining.",
  rules: [1, 2, 4, 6],
  range: [0, 45, 90],
  tour: [[197, 102], [301, 133], null],
  mount,
};
