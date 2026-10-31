import { HL } from './kernel.js';

/**
 * Vending: a vending machine with a three by three keypad on its front and a
 * pickup bay at its foot. The key under the pointer sinks and takes the bright
 * stroke; after a short wait exactly one can drops into the bay, the one that
 * key always gives. The can there before rises back into the machine. Each
 * key's can has its own height, and two keys may share one. At rest one key is
 * pressed and its can stands in the bay. The slider is the wait, in ms.
 *
 * The pattern: discrete items. Which key is a choice, so tweens; the hit test
 * reads the front face's plane at rest, cell by cell, which nothing drawn moves.
 */
const {
  Cam, circ, fit, facing, hull, open, poly, prism, proj, ringAt, rings, rrect, run,
  tdone, tset, tval, tween, disposer, mk, pointer, put, register, solid,
} = HL;

const W = 72, D = 38, H = 112, CR = 6;                         // the cabinet; its front face is the plane y = D
const BX0 = 10, BX1 = 62, BZ0 = 8, BZ1 = 42, BD = 16;           // the bay's opening on the front, and its depth
const GX = 36, GZ = 96, PX = 18, PZ = 16, KW = 7, KH = 6;   // keypad: centre column, top row, pitch, half sizes
const UP = 3.6, IN = 0.4;                                       // how far a key stands out, raised and pressed
const CX = 27, CY = D - 8.5, CRAD = 6.5, HIDE = 44;              // the can's spot in the bay, and its height when up inside
const OUT = [4, 7, 2, 5, 3, 7, 1, 6, 4], REST = 5, ROWS = "ABC";

/** Signed area of a screen polygon: its winding. */
const wind = (pts) => pts.reduce((a, p, i) => { const q = pts[(i + 1) % pts.length]; return a + p[0] * q[1] - q[0] * p[1]; }, 0);
/** A ring of circ() moved to (x, y). */
const at = (ring, x, y) => ring.map((q) => ({ ...q, u: q.u + x, v: q.v + y }));

function mount({ stage, svg, read }, value) {
  const bag = disposer();
  let wait = value;

  const C = Cam(45, 0.5, 1.98);
  fit(C, [[0, 0, 0], [W, D, 0], [W, 0, 0], [0, D, 0], [0, 0, H], [W, 0, H], [0, D, H], [W, D, H]], 200, 166);
  const P = proj(C), front = facing(C);
  // A ring drawn on the front face: u runs along x, v up z. A wall of it is seen when its normal leans toward the camera.
  const o = P(0, 0, 0), zt = (P(1, 1, 0)[1] - o[1]) / (o[1] - P(0, 0, 1)[1]);
  const seen = (q) => q.nu + q.nv * zt > 0;
  const face = (ring, y) => ring.map((q) => P(q.u, y, q.v));

  const g = mk("g", {}, svg);
  const [cr, ci] = rings(0, 0, W, D, CR, 1.8);
  put(solid(g), prism(P, front, cr, ci, 0, H));

  // The bay, back to front: its floor seam, the cans, the cabinet's near faces with the opening cut out, the opening's edge.
  const bay = rrect(BX0, BZ0, BX1, BZ1, 4, 4);
  mk("path", { d: open(face(run(bay, (q) => q.nv < -0.5), D - BD)), class: "nf lo" }, g);
  const ring = at(circ(CRAD, 24), CX, CY), inner = at(circ(CRAD - 1.3, 24), CX, CY);
  const cans = OUT.map((v, i) => ({ el: solid(g), h: 6 + 2 * v, t: tween(i === REST ? 1 : 0), dt: NaN }));
  // a mask just inside the silhouette and under the crease, so it hides what lies behind the near faces and no stroke
  const near = run(ci, front), shell = ringAt(P, near, 1.2).concat(ringAt(P, near, H - 1.5).reverse());
  let hole = face(bay, D);
  if (Math.sign(wind(hole)) === Math.sign(wind(shell))) hole = hole.reverse();
  mk("path", { d: poly(shell) + poly(hole), class: "fo" }, g);
  mk("path", { d: poly(face(bay, D)), class: "nf" }, g);

  // The keys, A to C from the top, 1 to 3 along x.
  const keys = OUT.map((_, i) => {
    const x = GX + ((i % 3) - 1) * PX, z = GZ - Math.floor(i / 3) * PZ;
    return {
      out: rrect(x - KW, z - KH, x + KW, z + KH, 2.4, 4),
      in: rrect(x - KW + 1.1, z - KH + 1.1, x + KW - 1.1, z + KH - 1.1, 1.3, 4),
      el: solid(g), p: tween(i === REST ? IN : UP), dp: NaN,
    };
  });

  const B = register(stage, (_dt, now) => {
    let moving = false;
    keys.forEach((k) => {
      const p = tval(k.p, now);
      if (!tdone(k.p, now)) moving = true;
      if (p === k.dp) return;
      k.dp = p;
      put(k.el, { sil: poly(hull(face(k.out, D).concat(face(k.out, D + p)))), crease: open(face(run(k.in, seen), D + p)) });
    });
    cans.forEach((c) => {
      const t = tval(c.t, now);
      if (!tdone(c.t, now)) moving = true;
      if (t === c.dt) return;
      c.dt = t;
      const z = HIDE + (BZ0 - HIDE) * t;
      put(c.el, prism(P, front, ring, inner, z, z + c.h));
    });
    return moving;
  });
  bag.add(B.unregister);

  // The pointer read on the front face's plane at rest, and rounded to a key's cell: the cells tile the keypad.
  const O = P(0, D, 0), ex = P(1, D, 0), ez = P(0, D, 1);
  const ax = [ex[0] - O[0], ex[1] - O[1]], az = [ez[0] - O[0], ez[1] - O[1]], det = ax[0] * az[1] - ax[1] * az[0];
  function hit([sx, sy]) {
    const qx = sx - O[0], qy = sy - O[1];
    const x = (qx * az[1] - qy * az[0]) / det, z = (ax[0] * qy - ax[1] * qx) / det;
    const c = Math.round((x - GX) / PX) + 1, r = Math.round((GZ - z) / PZ);
    return c < 0 || c > 2 || r < 0 || r > 2 ? -1 : r * 3 + c;
  }

  let act;
  /** Presses key a (-1 is rest, with the rest key pressed): its can drops after the wait; the can that was there rises at once. */
  function choose(a) {
    if (a === act) return;
    act = a;
    const b = a < 0 ? REST : a, now = performance.now();
    keys.forEach((k, i) => {
      tset(k.p, i === b ? IN : UP, now, 0);
      k.el.sil.classList.toggle("hi", i === b);
      tset(cans[i].t, i === b ? 1 : 0, now, i === b ? wait : 0);
    });
    read.textContent = a < 0 ? "rest" : `${ROWS[Math.floor(a / 3)]}${(a % 3) + 1} → ${OUT[a]}`;
    B.wake();
  }
  choose(-1);

  bag.add(pointer(stage, { move: (p) => choose(hit(p)), leave: () => choose(-1) }));
  bag.add(() => svg.replaceChildren());

  return {
    set: (v) => { wait = v; },
    destroy: bag.dispose,
  };
}

export default {
  name: "vending",
  means: "A vending machine: press any key and exactly one can drops, always the same one for that key.",
  rules: [1, 4, 6, 8],
  range: [0, 160, 320],
  tour: [[148, 98], [173, 166], [199, 123], null],
  mount,
};
