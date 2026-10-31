import { HL } from './kernel.js';

/**
 * Spinner: a board-game spinner, a round dial on a square base, split by
 * raised dividers into a half, a quarter and two eighths, with an arrow on a
 * pivot in its middle. The pointer's direction from the centre, read on the
 * dial's top (which never moves), aims the arrow; it swings there on a
 * spring, coasting past and settling back as the friction allows. The slice
 * the arrow is headed for (the spring's target, never its position) takes
 * the bright stroke on its two dividers and its stretch of the rim track,
 * and the read-out gives its chance. At rest the arrow lies in the quarter.
 * The slider is the friction on the arrow's spring.
 *
 * The dial's angle a runs as in a textbook: 0 to the screen's right,
 * counterclockwise seen from above, so π/2 is the far side.
 */
const {
  Cam, circ, fillet, facing, fit, open, poly, prism, proj, rad, rrect, unproj,
  spring, stepS, disposer, mk, pointer, put, register, solid,
} = HL;

const R = 62, BW = 64, BT = 4, DH = 6, RH = 3.5, AZ = 12, AT = 2, CH = 2.5, RA = R - 3.2, TAU = 2 * Math.PI;
const K = Math.SQRT1_2, REST = rad(196), EPS = 0.002;
const D = [150, 240, 285, 330]; // the dividers, in degrees; slice i runs from D[i] to D[i + 1]
const SEC = [[150, 240, "1/4"], [240, 285, "1/8"], [285, 330, "1/8"], [330, 510, "1/2"]];
// the arrow, flat, along +u: a broad head, a shaft, and a short rounded tail past the pivot
const ARROW = fillet(
  [[54, 0], [31, 11.5], [35, 3.4], [-24, 3.4], [-24, -3.4], [35, -3.4], [31, -11.5]],
  [1.8, 1.6, 1.2, 3.3, 3.3, 1.2, 1.6],
);

/** World x, y of the dial-plane point (c, s): c to the screen's right, s away from the viewer. */
const W = (c, s) => [(c - s) * K, -(c + s) * K];
/** A ring of samples in a radial frame (u out along the radius, v across it), turned to angle a on the dial. */
function turn(ring, a) {
  const d = W(Math.cos(a), Math.sin(a)), e = W(-Math.sin(a), Math.cos(a));
  return ring.map((q) => ({
    u: q.u * d[0] + q.v * e[0], v: q.u * d[1] + q.v * e[1],
    nu: q.nu * d[0] + q.nv * e[0], nv: q.nu * d[1] + q.nv * e[1],
  }));
}
/** The slice an angle falls in. */
const sliceOf = (a) => {
  const d = ((((a * 180) / Math.PI - D[0]) % 360) + 360) % 360 + D[0];
  return SEC.findIndex(([s0, s1]) => d >= s0 && d < s1);
};

function mount({ stage, svg, read }, value) {
  const bag = disposer();

  // Fitted to the base and the pivot's cap: the arrow turns inside the dial, so no pose leaves this box.
  const C = Cam(45, 0.5, 1.82);
  fit(C, [[-BW, -BW, -BT], [BW, BW, -BT], [BW, -BW, -BT], [-BW, BW, -BT], [-BW, -BW, 0], [0, 0, AZ + AT + CH]], 200, 166);
  const P = proj(C), front = facing(C);
  const on = (u, v, a, z) => P(...W(u * Math.cos(a) - v * Math.sin(a), u * Math.sin(a) + v * Math.cos(a)), z);

  // back to front: base, dial, the rim track, far dividers, the pivot's post, near dividers, the arrow, its cap
  const g = mk("g", {}, svg);
  // the base is the square card the dial is set in; its corners take more steps than rings' four, so they stay round
  put(solid(g), prism(P, front, rrect(-BW, -BW, BW, BW, 16, 8), rrect(1.8 - BW, 1.8 - BW, BW - 1.8, BW - 1.8, 14.2, 8), -BT, 0));
  // the dial's top edge is drawn as the rim track below, split at the dividers, so its own crease is left out
  put(solid(g), { sil: prism(P, front, circ(R, 120), circ(R - 1.8, 120), 0, DH).sil, crease: "" });
  const track = SEC.map(([s0, s1]) => {
    const n = Math.ceil((s1 - s0) / 3);
    const pts = Array.from({ length: n + 1 }, (_, k) => on(RA, 0, rad(s0 + ((s1 - s0) * k) / n), DH));
    return mk("path", { d: open(pts), class: "nf lo" }, g);
  });
  const ribs = [];
  let post = null;
  for (const j of D.map((_, j) => j).sort((i, j) => Math.sin(rad(D[j])) - Math.sin(rad(D[i])))) {
    if (!post && Math.sin(rad(D[j])) < 0) post = solid(g);
    const a = rad(D[j]);
    ribs[j] = solid(g);
    put(ribs[j], prism(P, front, turn(rrect(12, -1.2, R - 1.5, 1.2, 1.2, 4), a), turn(rrect(12.6, -0.6, R - 2.1, 0.6, 0.6, 4), a), DH, DH + RH));
  }
  put(post, prism(P, front, circ(6.5, 48), circ(5.3, 48), DH, AZ));
  const back = mk("path", { class: "lo" }, g), face = mk("path", { class: "sil" }, g);
  put(solid(g), prism(P, front, circ(5, 40), circ(3.8, 40), AZ + AT, AZ + AT + CH));

  let drawn = NaN;
  /** The arrow at angle a: its underside first, for the plate's thickness, then its top. */
  function draw(a) {
    if (a === drawn) return;
    drawn = a;
    back.setAttribute("d", poly(ARROW.map(([u, v]) => on(u, v, a, AZ))));
    face.setAttribute("d", poly(ARROW.map(([u, v]) => on(u, v, a, AZ + AT))));
  }

  // The slider is the friction (c) on k 100, m 1: at 18 the arrow just aims, below it coasts past and swings back.
  let sp = spring(REST, { c: value, eps: EPS }), aim = REST, act = -2;
  const L = register(stage, (dt) => { const m = stepS(sp, dt); draw(sp.x); return m; });
  bag.add(L.unregister);

  /** Heads the arrow for angle a, the short way round from where it is headed; the slice it will land in goes bright. */
  function head(a, rest) {
    sp.t = a + TAU * Math.round((sp.t - a) / TAU);
    const i = sliceOf(sp.t), key = rest ? -1 : i;
    if (key !== act) {
      act = key;
      track.forEach((el, j) => { el.classList.toggle("hi", j === i); el.classList.toggle("lo", j !== i); });
      ribs.forEach((r, j) => r.sil.classList.toggle("hi", j === i || j === (i + 1) % D.length));
      read.textContent = rest ? "rest" : SEC[i][2] + " chance";
    }
    L.wake();
  }

  draw(REST);
  head(REST, true);

  bag.add(pointer(stage, {
    move: (p) => {
      const [x, y] = unproj(C, p[0], p[1], DH), c = (x - y) * K, s = -(x + y) * K;
      if (Math.hypot(c, s) > 8) aim = Math.atan2(s, c); // too near the pivot to say a direction
      head(aim, false);
    },
    leave: () => head(REST, true),
  }));
  bag.add(() => svg.replaceChildren());

  return {
    set: (v) => { const t = sp.t; sp = spring(sp.x, { c: v, eps: EPS }); sp.t = t; L.wake(); },
    destroy: bag.dispose,
  };
}

export default {
  name: "spinner",
  means: "A game spinner cut into a half, a quarter and two eighths: aim the arrow, and the slice it lands in is your chance.",
  rules: [1, 4, 5, 8],
  range: [18, 11, 6],
  tour: [[236, 122], [244, 182], [140, 174], null],
  mount,
};
