import { HL } from './kernel.js';

/**
 * Dial: a round control dial, a thick face with twelve notches cut round its
 * rim, one every π/6 (the four quarter notches longer), and a knob in its
 * middle with a grip ridge across its top and a pointer hand on its skirt.
 * The pointer's direction from the centre, read on the face's top (which
 * never moves), turns the knob; the hand clicks to the nearest notch on the
 * 700ms tween. The notch it rests on is the one bright stroke, and a faint arc
 * on the face runs from the start notch, at the right, round to the hand. At
 * rest the hand stands on 5π/6. The slider is the dial's radius: the notches
 * move out, the angles do not change.
 *
 * The dial's own angle a runs as in a textbook: 0 to the screen's right,
 * counterclockwise seen from above, so π/2 is the far side.
 */
const {
  Cam, circ, facing, fillet, fit, open, poly, prism, proj, rrect, unproj,
  tdone, tset, tval, tween, disposer, mk, pointer, put, register, solid,
} = HL;

const FH = 8, KR = 15, KH = 6, GH = 4, HT = 2.5, REST = 5, STEP = Math.PI / 6, RMAX = 70;
const NAME = ["0", "π/6", "π/3", "π/2", "2π/3", "5π/6", "π", "7π/6", "4π/3", "3π/2", "5π/3", "11π/6"];
const K = Math.SQRT1_2;

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
/** The hand: a tapered blade from the knob's skirt to a rounded point at u = L, inset by b, as a ring with outward normals. */
function blade(L, b) {
  // the root's corners sit on the knob's skirt, so no corner of it pokes out beside the knob
  const w = 5.2 - b, r0 = Math.sqrt(KR * KR - 5.2 * 5.2) + b;
  const pts = fillet([[r0, -w], [L - 7, -2.1 + b * 0.4], [L - b, 0], [L - 7, 2.1 - b * 0.4], [r0, w]], [1.6, 1.2, 1.4, 1.2, 1.6], 4);
  return pts.map((p, i) => {
    const a = pts[(i + pts.length - 1) % pts.length], c = pts[(i + 1) % pts.length];
    const tu = c[0] - a[0], tv = c[1] - a[1], m = Math.hypot(tu, tv) || 1;
    return { u: p[0], v: p[1], nu: tv / m, nv: -tu / m };
  });
}

function mount({ stage, svg, read }, value) {
  const bag = disposer();
  let R = value, act = null, aim = REST * STEP;

  // Fitted to the largest dial, so nothing leaves the frame at any radius.
  const C = Cam(45, 0.5, 2.2);
  fit(C, circ(RMAX, 48).flatMap((q) => [[q.u, q.v, 0], [q.u, q.v, FH]]).concat([[0, 0, FH + KH + GH]]), 200, 166);
  const P = proj(C), front = facing(C);
  const on = (u, v, a, z = FH) => {
    const [x, y] = W(u * Math.cos(a) - v * Math.sin(a), u * Math.sin(a) + v * Math.cos(a));
    return P(x, y, z);
  };

  // back to front: the face, its notches, the swept arc, then the hand and the knob in the order the hand's side needs
  const g = mk("g", {}, svg), face = solid(g);
  const notches = NAME.map(() => mk("path", { class: "nf lo" }, g));
  const arc = mk("path", { class: "nf" }, g);
  const hand = solid(g), knob = solid(g), grip = solid(g);
  put(knob, prism(P, front, circ(KR, 48), circ(KR - 1.4, 48), FH, FH + KH));
  const ridge = rrect(-11, -3, 11, 3, 3, 4), ridgeIn = rrect(-10, -2, 10, 2, 2, 4);

  function drawFace() {
    put(face, prism(P, front, circ(R, 120), circ(R - 1.8, 120), 0, FH));
    notches.forEach((el, k) => {
      const long = k % 3 === 0, slot = rrect(R - (long ? 15.5 : 12.5), -1.5, R - 4.5, 1.5, 1.5, 3);
      el.setAttribute("d", poly(slot.map((q) => on(q.u, q.v, k * STEP))));
    });
  }

  const tw = tween(REST * STEP);
  let drawn = "", near = null;
  function draw(a) {
    const key = a + "," + R;
    if (key === drawn) return;
    drawn = key;
    put(hand, prism(P, front, turn(blade(R - 17.5, 0), a), turn(blade(R - 17.5, 1), a), FH, FH + HT));
    put(grip, prism(P, front, turn(ridge, a), turn(ridgeIn, a), FH + KH, FH + KH + GH));
    const n = Math.ceil(a / 0.05), ra = R - 21;
    arc.setAttribute("d", n < 1 ? "" : open(Array.from({ length: n + 1 }, (_, k) => on(ra, 0, (a * k) / n))));
    // a hand on the near half stands in front of the knob's skirt; on the far half, behind it
    const nz = Math.sin(a) < -0.01;
    if (nz !== near) { near = nz; if (nz) grip.g.after(hand.g); else knob.g.before(hand.g); }
  }

  const L = register(stage, (_dt, now) => { draw(tval(tw, now)); return !tdone(tw, now); });
  bag.add(L.unregister);

  /** Turns the hand to notch k (-1 sends it back to rest); the notch it is headed for takes the bright stroke. */
  function choose(k) {
    const n = k < 0 ? REST : k;
    if (k === act) return;
    act = k;
    tset(tw, n * STEP, performance.now(), 0);
    notches.forEach((el, i) => { el.classList.toggle("hi", i === n); el.classList.toggle("lo", i !== n); });
    read.textContent = k < 0 ? "rest" : NAME[k];
    L.wake();
  }

  drawFace();
  draw(REST * STEP);
  choose(-1);

  bag.add(pointer(stage, {
    move: (p) => {
      const [x, y] = unproj(C, p[0], p[1], FH), c = (x - y) * K, s = -(x + y) * K;
      if (Math.hypot(c, s) > 8) aim = Math.atan2(s, c); // too near the centre to say a direction
      choose(Math.round(((aim + 2 * Math.PI) % (2 * Math.PI)) / STEP) % 12);
    },
    leave: () => choose(-1),
  }));
  bag.add(() => svg.replaceChildren());

  return {
    set: (v) => { R = v; drawFace(); drawn = ""; draw(tval(tw, performance.now())); L.wake(); },
    destroy: bag.dispose,
  };
}

export default {
  name: "dial",
  means: "A dial clicks round in steps of π/6: the hand rests on a notch, and the arc it swept from the start is the angle in radians.",
  rules: [1, 4, 5, 8],
  range: [54, 62, 70],
  tour: [[258, 108], [200, 100], [83, 158], null],
  mount,
};
