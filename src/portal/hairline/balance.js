import { HL } from './kernel.js';

/**
 * Balance: a scale on a low plinth, a post, a tapered beam and two pans hung
 * from its ends on cords. The left pan holds a tall block and one unit, the
 * right pan four units: at rest the beam is level, a solved equation. The
 * pointer's screen x, read against the rest pose, tips the beam towards the
 * nearer pan on one spring; at the centre, or away, it settles level. The
 * bright edge is the beam while it balances, the heavier pan while it leans.
 * The slider is the furthest lean, in degrees.
 */
const {
  Cam, circ, clamp, facing, fillet, fit, hull, open, poly, prism, proj, rad, ringAt, rings, run,
  spring, stepS, disposer, mk, place, pointer, put, register, solid,
} = HL;

const L = 58, E = 63, H = 74, HANG = 36, R = 19, PT = 3, A = 24, PB = 6, RP = 3.2, BT = 1.6, DZ = 0.15;
const r2 = Math.SQRT1_2;
/** World [x, y, z] from the beam's own frame: s along the beam (screen right), t towards the viewer, z up. */
const w3 = (s, t, z) => [(s + t) * r2, (t - s) * r2, z];
// The beam's outline in its own plane: u along it, w across, thick at the pivot and thin at the ends.
const BEAM = fillet(
  [[-E, -1.6], [-12, -3.8], [12, -3.8], [E, -1.6], [E, 1.6], [12, 3.8], [-12, 3.8], [-E, 1.6]],
  [1.4, 6, 6, 1.4, 1.4, 6, 6, 1.4],
);
// What each pan holds, as [x0, y0, x1, y1, height] in the pan's frame, back to front: an x and one unit; four units.
const LOAD = [
  [[-7, -6, 1, 2, 16], [3, 0, 10, 7, 7]],
  [[-8, -8, -1, -1, 7], [1, -8, 8, -1, 7], [-8, 1, -1, 8, 7], [1, 1, 8, 8, 7]],
];

function mount({ stage, svg, read }, value) {
  const bag = disposer();
  let most = value, over = false, side = 0, drawn = NaN;

  // Fitted to the furthest lean the slider allows, so nothing leaves the frame.
  const C = Cam(45, 0.5, 1.85), ext = [];
  for (const th of [-22, 22]) for (const k of [-1, 1]) {
    const sh = k * L * Math.cos(rad(th)), zh = H - k * L * Math.sin(rad(th)) - HANG;
    ext.push(w3(k * E, 0, H + 4 - k * E * Math.sin(rad(th))), w3(sh - R, R, zh - PT), w3(sh + R, -R, zh + 16));
  }
  fit(C, ext.concat([w3(0, A * 1.42, -PB), w3(-A * 1.42, 0, -PB), w3(A * 1.42, 0, -PB)]), 200, 166);
  const P = proj(C), front = facing(C);
  const W = (s, t, z) => P(...w3(s, t, z));

  const g = mk("g", {}, svg);
  const [pr, pi] = rings(-A, -A, A, A, 8, 1.8);
  put(solid(g), prism(P, front, pr, pi, -PB, 0));
  put(solid(g), prism(P, front, circ(7), circ(5.6), 0, 3));
  put(solid(g), prism(P, front, circ(RP), circ(RP - 0.8), 3, H));

  const foot = circ(R - 3), top = circ(R), rim = circ(R - 1.4);
  const pans = LOAD.map((load) => ({
    dish: solid(g),
    blocks: load.map(([x0, y0, x1, y1, h]) => ({ h, rr: rings(x0, y0, x1, y1, 1.6, 0.9), el: solid(g) })),
  }));
  const back = mk("path", { class: "lo" }, g), face = mk("path", { class: "sil" }, g);
  pans.forEach((p) => { p.cord = mk("path", { class: "nf" }, g); });
  const pins = [0, 1, 2].map(() => mk("circle", { r: 1.2, class: "dot m" }, g));

  function draw(th) {
    const c = Math.cos(rad(th)), sn = Math.sin(rad(th));
    const at = (u, v, t) => W(u * c + v * sn, t, H - u * sn + v * c);
    back.setAttribute("d", poly(BEAM.map(([u, v]) => at(u, v, -BT))));
    face.setAttribute("d", poly(BEAM.map(([u, v]) => at(u, v, BT))));
    [-L, 0, L].forEach((u, i) => place(pins[i], at(u, 0, BT)));
    pans.forEach((p, i) => {
      const k = i ? 1 : -1, sh = k * L * c, zt = H - k * L * sn - HANG, [ox, oy] = w3(sh, 0, 0);
      const Q = (x, y, z) => P(x + ox, y + oy, z + zt);
      p.dish.sil.setAttribute("d", poly(hull(ringAt(Q, foot, -PT).concat(ringAt(Q, top, 0)))));
      p.dish.cr.setAttribute("d", open(ringAt(Q, run(rim, front), 0)));
      p.blocks.forEach((b) => put(b.el, prism(Q, front, b.rr[0], b.rr[1], 0, b.h)));
      p.cord.setAttribute("d", open([W(sh - R, 0, zt), at(k * L, 0, BT), W(sh + R, 0, zt)]));
    });
  }

  const sp = spring(0);
  const B = register(stage, (dt) => {
    const m = stepS(sp, dt);
    if (sp.x !== drawn) { drawn = sp.x; draw(sp.x); }
    return m;
  });
  bag.add(B.unregister);

  // The hit test reads the rest pose: the pivot's screen x and the pans' distance from it never move.
  const cx = W(0, 0, H)[0], span = W(L, 0, H - HANG)[0] - cx;
  let lean = 0;
  function retarget() {
    sp.t = over ? lean * most : 0;
    side = over ? Math.sign(lean) : 0;
    face.classList.toggle("hi", side === 0);
    pans.forEach((p, i) => { const on = side === (i ? 1 : -1); p.dish.sil.classList.toggle("hi", on); p.cord.classList.toggle("hi", on); });
    read.textContent = !over ? "rest" : side === 0 ? "balanced" : `${side < 0 ? "left" : "right"} +${Math.ceil(Math.abs(lean) * 3)}`;
    B.wake();
  }

  bag.add(pointer(stage, {
    move: (p) => {
      const f = clamp((p[0] - cx) / span, -1, 1), a = Math.abs(f);
      over = true; lean = a < DZ ? 0 : (Math.sign(f) * (a - DZ)) / (1 - DZ);
      retarget();
    },
    leave: () => { over = false; retarget(); },
  }));
  bag.add(() => svg.replaceChildren());
  retarget();

  return {
    set: (v) => { most = v; retarget(); },
    destroy: bag.dispose,
  };
}

export default {
  name: "balance",
  means: "A balance scale holding an equation: the beam leans towards the pan nearer the pointer, and settles level when solved.",
  rules: [1, 3, 5, 8],
  range: [8, 14, 22],
  tour: [[93, 166], [307, 166], [200, 150], null],
  mount,
};
