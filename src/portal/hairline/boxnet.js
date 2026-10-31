import { HL } from './kernel.js';

/**
 * Boxnet: the net of a 4 × 3 × 2 box, six card panels lying in a cross on a
 * plate: the base in the middle, a wall on each of its edges, and the lid on
 * the far end of the back-right wall. The pointer's height on the stage sets
 * how far the net is folded, on a spring: low lays it flat, high shuts the
 * box. The four walls hinge up together, and the lid swings over last, once
 * they stand. A panel takes the bright stroke when it stands in its place in
 * the box: the base always, a wall upright, the lid shut. At rest the far
 * walls are half up and the near flaps barely lifted, so the cross still shows;
 * a second spring carries the figure between that pose and the fold. The
 * slider is the share of the fold the lid takes.
 *
 * Paint order never changes: far walls, base, near walls, lid. While the lid
 * is behind, nothing shares its part of the screen; once it swings over the
 * open top it is in front of all it covers.
 */
const {
  Cam, clamp, facing, fit, hull, lerp, open, poly, prism, proj, rad, rings, run, spring, stepS,
  disposer, mk, pointer, put, register, solid,
} = HL;

const U = 12, L = 4 * U, W = 3 * U, H = 2 * U; // the box: 4 by 3 across, 2 tall, in units of U
const T = 1.4, RC = 3, BI = 0.9, PB = 4, M = 8; // card thickness, corner radius, crease inset; the plate's thickness and margin
const REST = [40, 56, 9, 4]; // walls −x, −y, +x, +y at rest, in degrees: near flaps under 12°, where they still read as flat
const RF = 0.4; // the fold held at rest, as a share of the walls' travel: near the rest pose, so arriving and leaving move each panel one way
const V = [1, 1, Math.sqrt(2 / 3)]; // toward the eye at Cam(45, 0.5), which looks down 30°
const X = [1, 0, 0], Y = [0, 1, 0], Z = [0, 0, 1];
const WALLS = [
  { o: [0, 0, T], eu: Y, d: [-1, 0, 0], size: [W, H] },
  { o: [0, 0, T], eu: X, d: [0, -1, 0], size: [L, H] },
  { o: [L, 0, T], eu: Y, d: X, size: [W, H] },
  { o: [0, W, T], eu: X, d: Y, size: [L, H] },
];
const SIZES = [WALLS[0].size, WALLS[1].size, [L, W], WALLS[2].size, WALLS[3].size, [L, W]]; // in paint order
const ss = (t) => t * t * (3 - 2 * t);
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
/** A panel's world point: u along its hinge, v away from it, w along its normal (the card runs from w −T to 0). */
const at = (p, u, v, w) => [0, 1, 2].map((i) => p.o[i] + u * p.eu[i] + v * p.ev[i] + w * p.n[i]);

/** A panel hinged at o along eu, lying out along d, turned deg about the hinge toward up. */
function hinge(o, eu, d, up, deg) {
  const c = Math.cos(rad(deg)), s = Math.sin(rad(deg));
  return { o, eu, deg, ev: d.map((x, i) => x * c + up[i] * s), n: up.map((x, i) => x * c - d[i] * s) };
}

/** The six panels in paint order, at fold f and presence p (0 is the rest pose). The walls rise over the first 1 − lag of the fold, the lid over the rest. */
function pose(f, lag, p = 1) {
  const w = 1 - lag, up = 90 * ss(clamp(f / w, 0, 1));
  const [wx, wy, px, py] = WALLS.map((s, i) => hinge(s.o, s.eu, s.d, Z, lerp(REST[i], up, p)));
  const lid = hinge(at(wy, 0, H, 0), X, wy.ev, wy.n, p * 90 * ss(clamp((f - w) / lag, 0, 1)));
  return [wx, wy, { o: [0, 0, T], eu: X, ev: Y, n: Z, deg: 90 }, px, py, lid];
}

function mount({ stage, svg, read }, value) {
  const bag = disposer();
  let lag = value, over = null;

  // Fitted to the plate, the rest pose and every pose of the fold: the lid is highest on screen with the walls at 68°.
  const C = Cam(45, 0.5, 1.84);
  const [pr, pi] = rings(-H - M, -H - W - M, L + H + M, W + H + M, 9, 2);
  const pts = pr.flatMap((q) => [[q.u, q.v, 0], [q.u, q.v, -PB]]);
  const poses = [pose(0, 0.4, 0)];
  for (let k = 0; k <= 50; k++) poses.push(pose(k / 50, 0.4));
  poses.forEach((ps) => ps.forEach((p, i) => { const [a, b] = SIZES[i]; pts.push(at(p, 0, 0, 0), at(p, a, 0, 0), at(p, 0, b, 0), at(p, a, b, 0)); }));
  fit(C, pts, 200, 166);
  const P = proj(C);

  const g = mk("g", {}, svg);
  put(solid(g), prism(P, facing(C), pr, pi, -PB, 0));
  const els = SIZES.map(() => solid(g)), RINGS = SIZES.map(([a, b]) => rings(0, 0, a, b, RC, BI));

  /** One card: the hull of its two faces, and a crease just inside the face the eye sees, along the edges it sees. */
  function draw(el, p, [ring, inner]) {
    const scr = (q, w) => P(...at(p, q.u, q.v, w));
    const wv = dot(p.n, V) > 0 ? 0 : -T;
    const seen = (q) => dot(p.eu.map((x, i) => q.nu * x + q.nv * p.ev[i]), V) > 0;
    put(el, {
      sil: poly(hull(ring.map((q) => scr(q, 0)).concat(ring.map((q) => scr(q, -T))))),
      crease: open(run(inner, seen).map((q) => scr(q, wv))),
    });
    el.sil.classList.toggle("hi", p.deg > 88);
  }

  // eps scaled down: both run 0 to 1
  const sp = spring(RF * (1 - lag), { eps: 0.0005 }), here = spring(0, { eps: 0.0005 });
  let drawn = "";
  const B = register(stage, (dt) => {
    const moving = [stepS(sp, dt), stepS(here, dt)].some(Boolean), key = [sp.x, here.x, lag].join();
    if (key !== drawn) { drawn = key; pose(sp.x, lag, here.x).forEach((p, i) => draw(els[i], p, RINGS[i])); }
    return moving;
  });
  bag.add(B.unregister);

  // The pointer's height between two fixed lines: below the base's near corner the net lies flat; a box's height above the shut box, where the lid stands at rest, it is closed.
  const y0 = P(L, W, 0)[1], y1 = P(0, 0, T + 2 * H)[1];
  function retarget() {
    const f = over === null ? RF * (1 - lag) : clamp((y0 - over) / (y0 - y1), 0, 1);
    sp.t = f;
    here.t = over === null ? 0 : 1;
    read.textContent = over === null ? "rest" : f === 0 ? "net: 6 faces" : f === 1 ? "volume 24 (2 × 3 × 4)" : "surface area 52";
    B.wake();
  }
  retarget();

  bag.add(pointer(stage, {
    move: (p) => { over = p[1]; retarget(); },
    leave: () => { over = null; retarget(); },
  }));
  bag.add(() => svg.replaceChildren());

  return {
    set: (v) => { lag = v; retarget(); },
    destroy: bag.dispose,
  };
}

export default {
  name: "boxnet",
  means: "A flat net of six faces folds into a box: raise the pointer and the walls hinge up, then the lid shuts.",
  rules: [1, 4, 5, 6, 9],
  range: [0.25, 0.4, 0.55],
  tour: [[150, 232], [177, 164], [244, 84], null],
  mount,
};
