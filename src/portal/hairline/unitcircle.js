import { HL } from './kernel.js';

/**
 * Unitcircle: the unit circle as a thing on a desk. A thin round plate lies on
 * a low square base, its top cut with two axes and the sixteen graduations of
 * the special angles. A radius arm, riveted at the centre, stands on it, and
 * under the arm a right triangle is drawn on the plate: the arm, the axis, and
 * a bright drop line between them, the sine. The pointer is projected onto the
 * plate's top, which never moves, and the arm turns toward it on its spring;
 * the triangle follows. Near a graduation the arm catches on it. The read-out
 * is the angle, with the exact sine at 30, 45, 60 and 90 degrees. The slider
 * is the catch, in degrees either side of a graduation.
 *
 * The unit circle's own axes are the screen's: cos runs to the right and sin
 * away from the viewer, so the drop line stands upright, as in a textbook.
 */
const {
  Cam, circ, facing, fit, open, prism, proj, rad, rrect, seg, unproj, spring, stepS,
  flatDot, mk, place, pointer, put, register, disposer, solid,
} = HL;

const R = 60, RU = 54, T = 4, B = 65, BH = 6, AW = 3.4, AH = 6.5, PIN = 5.4, REST = 35;
const TICKS = [0, 30, 45, 60, 90, 120, 135, 150, 180, 210, 225, 240, 270, 300, 315, 330];
const SIN = { 30: "1/2", 45: "√2/2", 60: "√3/2", 90: "1" };
const K = Math.SQRT1_2;

/** World x, y of the unit circle's point (c, s): cos to the screen's right, sin away from the viewer. */
const W = (c, s) => [(c - s) * K, -(c + s) * K];
/** A ring of samples in the arm's own frame (u along it), turned by a radians onto the plate. */
function turn(ring, a) {
  const d = W(Math.cos(a), Math.sin(a)), e = W(-Math.sin(a), Math.cos(a));
  return ring.map((q) => ({
    u: q.u * d[0] + q.v * e[0], v: q.u * d[1] + q.v * e[1],
    nu: q.nu * d[0] + q.nv * e[0], nv: q.nu * d[1] + q.nv * e[1],
  }));
}
/** The signed gap from angle t to angle d, in degrees, in (-180, 180]. */
const off = (d, t) => ((d - t + 540) % 360) - 180;

function mount({ stage, svg, read }, value) {
  const bag = disposer();
  let snap = value, over = false, aimed = rad(REST);

  const base = rrect(-B, -B, B, B, 12, 8), baseIn = rrect(-B + 2, -B + 2, B - 2, B - 2, 10, 8);
  const C = Cam(45, 0.5, 1.72);
  fit(C, base.flatMap((q) => [[q.u, q.v, 0], [q.u, q.v, -BH]]), 200, 166);
  const P = proj(C), front = facing(C), at = (c, s, z = T) => P(...W(c, s), z);

  // back to front: base, plate, what is cut into the plate's top, the triangle, the arm, its rivet
  const g = mk("g", {}, svg);
  put(solid(g), prism(P, front, base, baseIn, -BH, 0));
  put(solid(g), prism(P, front, circ(R, 120), circ(R - 1.6, 120), 0, T));
  mk("path", { d: seg(at(-R + 4, 0), at(R - 4, 0)) + seg(at(0, -R + 4), at(0, R - 4)), class: "nf lo" }, g);
  for (const t of TICKS) place(flatDot(g, C, 1, "dot off"), at(RU * Math.cos(rad(t)), RU * Math.sin(rad(t))));
  const leg = mk("path", { class: "nf sil" }, g), mark = mk("path", { class: "nf lo" }, g), drop = mk("path", { class: "nf hi" }, g);
  const arm = solid(g), pin = solid(g);
  const bar = rrect(-AW - 1.5, -AW, RU + AW, AW, AW, 4), barIn = rrect(-AW - 0.5, -AW + 1, RU + AW - 1, AW - 1, AW - 1, 4);
  put(pin, prism(P, front, circ(PIN, 16), circ(PIN - 1, 16), T + AH, T + AH + 2.5));

  const sp = spring(rad(REST));
  let drawn = NaN;
  function draw() {
    const a = sp.x;
    if (a === drawn) return;
    drawn = a;
    const c = Math.cos(a) * RU, s = Math.sin(a) * RU;
    put(arm, prism(P, front, turn(bar, a), turn(barIn, a), T, T + AH));
    leg.setAttribute("d", seg(at(0, 0), at(c, 0)));
    drop.setAttribute("d", seg(at(c, s), at(c, 0)));
    // the right angle at the drop line's foot, shrinking away as a leg goes to nothing
    const q = Math.min(4, Math.abs(c) * 0.3, Math.abs(s) * 0.3), u = -Math.sign(c) * q, v = Math.sign(s) * q;
    mark.setAttribute("d", q < 1 ? "" : open([at(c + u, 0), at(c + u, v), at(c, v)]));
  }

  const L = register(stage, (dt) => { const m = stepS(sp, dt); draw(); return m; });
  bag.add(L.unregister);
  draw();
  read.textContent = "rest";

  /** Sets the arm's target from the pointer's angle, caught by a graduation within `snap` degrees; at rest, 35°. */
  function retarget() {
    let d = REST;
    if (over) {
      d = ((aimed * 180) / Math.PI + 360) % 360;
      const k = TICKS.reduce((b, t) => (Math.abs(off(d, t)) < Math.abs(off(d, b)) ? t : b));
      if (Math.abs(off(d, k)) <= snap) d = k;
      const n = Math.round(d) % 360;
      read.textContent = `θ = ${n}°` + (SIN[n] ? ` · sin = ${SIN[n]}` : "");
    } else read.textContent = "rest";
    // the short way round, from where the arm is headed
    const t = rad(d);
    sp.t += Math.atan2(Math.sin(t - sp.t), Math.cos(t - sp.t));
    L.wake();
  }

  bag.add(pointer(stage, {
    move: (p) => {
      const [x, y] = unproj(C, p[0], p[1], T), c = (x - y) * K, s = -(x + y) * K;
      if (Math.hypot(c, s) > 6) aimed = Math.atan2(s, c); // too near the rivet to say a direction
      over = true;
      retarget();
    },
    leave: () => { over = false; retarget(); },
  }));
  bag.add(() => svg.replaceChildren());

  return {
    set: (v) => { snap = v; if (over) retarget(); },
    destroy: bag.dispose,
  };
}

export default {
  name: "unitcircle",
  means: "A radius arm turns toward the pointer on a unit circle, and the right triangle under it shows the angle's sine.",
  rules: [1, 4, 5, 8],
  range: [0, 3, 6],
  tour: [[280, 132], [246, 115], [154, 115], [266, 123], null],
  mount,
};
