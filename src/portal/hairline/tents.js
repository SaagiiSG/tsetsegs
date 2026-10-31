import { HL } from './kernel.js';

/**
 * Tents: two A-frame tents pitched on a ground plate, their front ends facing
 * each other across the plate. The left one is the pattern; the right one is
 * the same tent at k times its size, grown from its front corner nearest the
 * pattern, so every side of its end triangle is k times as long and every
 * angle stays the same. A dashed guide runs from apex to apex. The pointer is
 * read along the line the right tent's apex climbs as it grows, a line that
 * never moves, and picks k in steps; k tweens. At rest the right tent is twice
 * the size and the pattern is bright. The slider is the step between scales.
 *
 * Facing each other, each tent shows its end and the slope on its far side,
 * so the guide between the apexes crosses neither tent.
 */
const {
  Cam, circ, clamp, facing, fillet, fit, hull, open, poly, prism, proj, seg,
  tdone, tset, tval, tween, disposer, mk, pointer, put, register, solid,
} = HL;

const W = 22, H = 21, L = 15; // the pattern tent: its end's base and height, and its length
const X1 = 8, YA = 8, PB = 4, K0 = 2, KMAX = 3; // the feet nearest the gap; the plate's thickness; rest and largest scale
const RC = 1.1, BI = 1.1; // corner radius and crease inset, both scaled with the tent so the two stay the same shape
const SIDE = Math.hypot(W / 2, H), RIN = (W * H) / (W + 2 * SIDE), F = 1 - BI / RIN; // the end's inradius; the crease's shrink about its centre
// Each tent: its front foot nearest the gap, the way its front runs from there, and the way its ridge runs back.
const PAT = { o: [0, YA], a: [0, 1], b: [-1, 0] }, BIG = { o: [X1, 0], a: [1, 0], b: [0, -1] };
/** A point of tent t at s times the pattern: u along its front, v back along its ridge, z up, all in pattern units. */
const pt = (t, s, u, v, z) => [t.o[0] + s * (u * W * t.a[0] + v * L * t.b[0]), t.o[1] + s * (u * W * t.a[1] + v * L * t.b[1]), s * z * H];
const corners = (t, s) => [[0, 0, 0], [1, 0, 0], [0.5, 0, 1], [0, 1, 0], [1, 1, 0], [0.5, 1, 1]].map(([u, v, z]) => pt(t, s, u, v, z));
// The plate: a disc round the pattern's far back corner and the right tent's at its largest, with a margin.
const CX = (X1 + KMAX * W - L) / 2, CY = (YA + W - KMAX * L) / 2, PR = Math.hypot(X1 + KMAX * W + L, YA + W + KMAX * L) / 2 + 5;
const disc = (r) => circ(r, 96).map((q) => ({ ...q, u: q.u + CX, v: q.v + CY }));

function mount({ stage, svg, read }, value) {
  const bag = disposer();
  let step = value, over = null;

  // Fitted to the plate and the right tent at its largest, the most extreme pose.
  const C = Cam(45, 0.5, 2.3);
  const rim = disc(PR);
  fit(C, [...rim.map((q) => [q.u, q.v, 0]), ...rim.map((q) => [q.u, q.v, -PB]), ...corners(BIG, KMAX)], 200, 166);
  const P = proj(C), at = (t, s, u, z) => P(...pt(t, s, u, 0, z));

  /** Tent t at s times the pattern: outline, crease and door, as path strings. */
  function tent(t, s) {
    const out = hull(corners(t, s).map((p) => P(...p))), r = RIN / H, end = (u, z) => at(t, s, u, z);
    return {
      sil: poly(fillet(out, out.map(() => RC * s * C.S), 4)),
      // the fold between the end and the slope that shows, drawn a little inside the end
      crease: seg(end(0.5, r + (1 - r) * F), end(0.5 * (1 + F), r * (1 - F))),
      // the door: a zip down the middle, its flaps tied open at the foot
      door: seg(end(0.5, 0.74), end(0.5, 0.4)) + open([end(0.36, 0), end(0.5, 0.4), end(0.64, 0)]),
    };
  }

  // Back to front: the plate, the guide on it, the two tents, which never overlap on screen.
  const g = mk("g", {}, svg);
  put(solid(g), prism(P, facing(C), rim, disc(PR - 2.2), -PB, 0));
  const guide = mk("path", { class: "nf dash" }, g);
  const make = () => { const t = solid(g); t.door = mk("path", { class: "nf lo" }, t.g); return t; };
  const small = make(), big = make();
  const draw = (el, t, s) => { const q = tent(t, s); put(el, q); el.door.setAttribute("d", q.door); };
  draw(small, PAT, 1);

  const tw = tween(K0);
  let drawn = NaN;
  const B = register(stage, (_dt, now) => {
    const k = tval(tw, now);
    if (k !== drawn) {
      drawn = k;
      draw(big, BIG, k);
      guide.setAttribute("d", seg(at(PAT, 1, 0.5, 1), at(BIG, k, 0.5, 1)));
    }
    return !tdone(tw, now);
  });
  bag.add(B.unregister);

  // The bands: the pointer read along the line from the right tent's foot through its apex, in units of the pattern's apex. Fixed.
  const O = at(BIG, 1, 0, 0), A1 = at(BIG, 1, 0.5, 1), d = [A1[0] - O[0], A1[1] - O[1]], dd = d[0] * d[0] + d[1] * d[1];
  /** The scale the pointer asks for: snapped to the step, from one step above 1 up to KMAX. */
  function scale([x, y]) {
    const t = ((x - O[0]) * d[0] + (y - O[1]) * d[1]) / dd;
    return clamp(1 + Math.round((t - 1) / step) * step, 1 + step, KMAX);
  }
  const WORD = { 2: "double", 3: "triple" };
  const label = (k) => `× ${+k.toFixed(2)}` + (WORD[k] ? `: sides ${WORD[k]}` : "");

  function choose() {
    const k = over ? scale(over) : K0;
    tset(tw, k, performance.now(), 0);
    small.sil.classList.toggle("hi", !over);
    big.sil.classList.toggle("hi", !!over);
    read.textContent = over ? label(k) : "rest";
    B.wake();
  }
  choose();

  bag.add(pointer(stage, {
    move: (p) => { over = p; choose(); },
    leave: () => { over = null; choose(); },
  }));
  bag.add(() => svg.replaceChildren());

  return {
    set: (v) => { step = v; if (over) choose(); },
    destroy: bag.dispose,
  };
}

export default {
  name: "tents",
  means: "Two tents of one shape: scale the right one by k and every side of its end triangle is k times as long.",
  rules: [1, 4, 5, 6, 8],
  range: [0.25, 0.5, 1],
  tour: [[181, 139], [189, 122], [207, 89], null],
  mount,
};
