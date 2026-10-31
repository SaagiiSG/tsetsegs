import { HL } from './kernel.js';

/**
 * Fan: a folding fan lying on a plate, seven slats pivoting on one rivet, a
 * paper leaf across their outer half. The right guard stays put along the
 * plate's front; the pointer's direction from the rivet, read on the plate's
 * top (which never moves), sets the opening, snapped to 15° steps from 15° to
 * 180°. The far guard swings there first and the slats follow it, spreading
 * evenly, staggered from the pointer's side; a guard that closes pushes the
 * slats it meets. A thin bright arc at the rivet marks the opening, and turns
 * into a square corner at 90°. At rest the fan stands open 120°. The slider is
 * the stagger, in ms.
 *
 * The fan's own frame: c along the fixed guard (the screen's right), s away
 * from the viewer, so 90° stands straight up the screen and 180° lies flat
 * along the plate's front edge.
 */
const {
  Cam, circ, clamp, facing, fit, open, poly, prism, proj, rad, rrect, seg, unproj,
  tdone, tset, tval, tween, disposer, mk, pointer, put, register, solid,
} = HL;

const N = 7, L = 80, RO = 78, R1 = 42, RS = 50, RA = 24, SQ = 15, GW = 2.2, SW = 1.7, PIN = 4.6, REST = 120;
const PX = L + 8, PF = 12, PK = L + 8, PB = 5; // the plate: half width, front and back reach, thickness
const ZS = 0.8, ZL = 1, ZG = 2; // the tops of the inner slats, the leaf, the guards; every slat stands on the plate
const K = Math.SQRT1_2;

/** World x, y of the fan-frame point (c, s). */
const W = (c, s) => [(c - s) * K, -(c + s) * K];
/** A ring drawn in a slat's own frame (u along it), turned d degrees about the rivet and set in the world. */
function turn(ring, d) {
  const co = Math.cos(rad(d)), si = Math.sin(rad(d)), f = (u, v) => W(u * co - v * si, u * si + v * co);
  return ring.map((q) => {
    const [u, v] = f(q.u, q.v), [nu, nv] = f(q.nu, q.nv);
    return { u, v, nu, nv };
  });
}
/** A slat reaching from just behind the rivet to u1, half width w, and its crease ring. */
const bar = (u1, w) => [rrect(-4, -w, u1, w, w, 4), rrect(-3.4, -w + 0.6, u1 - 0.6, w - 0.6, w - 0.6, 4)];
const guard = (i) => i === 0 || i === N - 1;

function mount({ stage, svg, read }, value) {
  const bag = disposer();
  let stag = value, sel = -1;

  const plate = turn(rrect(-PX, -PF, PX, PK, 10, 6), 0), plateIn = turn(rrect(-PX + 2, -PF + 2, PX - 2, PK - 2, 8, 6), 0);
  const C = Cam(45, 0.5, 1.95);
  fit(C, plate.flatMap((q) => [[q.u, q.v, 0], [q.u, q.v, -PB]]), 200, 166);
  const P = proj(C), front = facing(C);
  const at = (c, s, z) => P(...W(c, s), z), pt = (r, d, z) => at(r * Math.cos(rad(d)), r * Math.sin(rad(d)), z);

  // back to front: plate, the inner slats, the arc lying on them, the leaf and its pleats, the guards over it, the rivet through all
  const g = mk("g", {}, svg);
  put(solid(g), prism(P, front, plate, plateIn, -PB, 0));
  const slats = [];
  for (let i = 0; i < N; i++) slats.push({ tw: tween((REST * i) / (N - 1)), shape: guard(i) ? bar(L, GW) : bar(RS, SW), drawn: NaN });
  for (let i = 1; i < N - 1; i++) slats[i].el = solid(g);
  const arc = mk("path", { class: "nf hi" }, g), leaf = mk("path", { class: "sil" }, g), pleats = mk("path", { class: "nf lo" }, g);
  slats[0].el = solid(g);
  slats[N - 1].el = solid(g);
  put(solid(g), prism(P, front, circ(PIN, 16), circ(PIN - 1, 16), 0, ZG + 1.2));

  let lastSq = null;
  function draw(now) {
    // each slat stops at the one outside it, so a closing guard gathers the slats instead of passing them
    const ang = [];
    let a = 180, changed = false;
    for (let i = N - 1; i >= 0; i--) ang[i] = a = Math.min(tval(slats[i].tw, now), a);
    slats.forEach((sl, i) => {
      if (ang[i] === sl.drawn) return;
      sl.drawn = ang[i];
      changed = true;
      const [ring, inner] = sl.shape, q = prism(P, front, turn(ring, ang[i]), turn(inner, ang[i]), 0, guard(i) ? ZG : ZS);
      // the inner slats are thin enough that a crease only crowds the rivet: they keep their silhouette
      put(sl.el, guard(i) ? q : { sil: q.sil, crease: "" });
    });
    const th = ang[N - 1], sq = sel === 90 && tdone(slats[N - 1].tw, now);
    if (!changed && sq === lastSq) return;
    lastSq = sq;
    const n = Math.max(2, Math.ceil(th / 4)), outer = [], inner = [], bow = [];
    for (let k = 0; k <= n; k++) {
      const d = (th * k) / n;
      outer.push(pt(RO, d, ZL)); inner.push(pt(R1, d, ZL)); bow.push(pt(RA, d, ZS));
    }
    leaf.setAttribute("d", poly(outer.concat(inner.reverse())));
    pleats.setAttribute("d", ang.slice(1, N - 1).map((d) => seg(pt(R1, d, ZL), pt(RO, d, ZL))).join(""));
    arc.setAttribute("d", open(sq ? [at(SQ, 0, ZS), at(SQ, SQ, ZS), at(0, SQ, ZS)] : bow));
  }

  const B = register(stage, (_dt, now) => { draw(now); return slats.some((sl) => !tdone(sl.tw, now)); });
  bag.add(B.unregister);
  draw(performance.now());
  read.textContent = "rest";

  /** Opens the fan to d degrees (-1 is rest). The guard on the pointer's side leads; each slat inwards starts one step later. */
  function choose(d) {
    if (d === sel) return;
    sel = d;
    const th = d < 0 ? REST : d, now = performance.now();
    slats.forEach((sl, i) => tset(sl.tw, (th * i) / (N - 1), now, (N - 1 - i) * stag));
    read.textContent = d < 0 ? "rest" : d === 90 ? "90° right angle" : d === 180 ? "180° straight" : `${d}°`;
    B.wake();
  }

  bag.add(pointer(stage, {
    move: (p) => {
      const [x, y] = unproj(C, p[0], p[1], 0), c = (x - y) * K, s = -(x + y) * K;
      if (Math.hypot(c, s) < 8) return; // too near the rivet to say a direction
      const d = (Math.atan2(s, c) * 180) / Math.PI;
      choose(d < -90 ? 180 : clamp(Math.round(d / 15) * 15, 15, 180));
    },
    leave: () => choose(-1),
  }));
  bag.add(() => svg.replaceChildren());

  return {
    set: (v) => { stag = v; },
    destroy: bag.dispose,
  };
}

export default {
  name: "fan",
  means: "A folding fan opens on its rivet: the pointer sets the angle between its outer slats, in 15° steps, and the arc marks it.",
  rules: [1, 2, 5, 8],
  range: [0, 45, 90],
  tour: [[268, 140], [200, 131], [60, 199], null],
  mount,
};
