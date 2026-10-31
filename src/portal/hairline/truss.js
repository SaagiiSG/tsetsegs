import { HL } from './kernel.js';

/**
 * Truss: a roof truss stands on a base plate, two rafters on a tie beam and a
 * king post hung from the peak. The pointer's x, read along the truss's base
 * (which never moves), slides the peak left or right. The peak snaps to
 * triangles whose corner angles are whole multiples of 5° and moves there on
 * the 700ms curve, the beams with it. A small arc at each corner marks its
 * angle; the peak's, the corner the hand holds, is the bright one. The read-out
 * gives the three angles, left, peak, right, and their sum. At rest the peak
 * leans left. The slider is the roof's pitch: the base angle with the peak
 * centred, in degrees.
 *
 * The truss's own frame: u along the base from the left corner, q across it
 * toward the viewer, z up. A corner is where two beams' middle lines meet; the
 * arcs turn round the opening's corners, which have the same angles, in the
 * middle plane, q = 0, so they end on the beams' inner faces.
 */
const {
  Cam, clamp, facing, fillet, fit, open, poly, prism, proj, rad, rrect, seg,
  tdone, tset, tval, tween, disposer, mk, pointer, put, register, solid,
} = HL;

const L = 120, T = 6, PW = 4, W = 6, RA = 19, RO = 2.4, RI = 1.4; // span, beam depth, post width, thickness, arc radius, corner radii
const U0 = 18, D = 13, PB = 5; // the plate: reach past the corners, half depth, thickness
const TURN = -45, S = 1.65, X0 = 30, X1 = 90, REST = 42, HI = 65; // HI is the steepest pitch, range[2]
const DEG = 180 / Math.PI, du = [Math.cos(rad(TURN)), Math.sin(rad(TURN))], dq = [-du[1], du[0]];
/** World [x, y, z] of a point in the truss's frame. */
const world = (u, q, z) => [u * du[0] + q * dq[0], u * du[1] + q * dq[1], z];
const turn = (ring) => ring.map((s) => {
  const [u, v] = world(s.u, s.v, 0), [nu, nv] = world(s.nu, s.nv, 0);
  return { u, v, nu, nv };
});
const r5 = (a) => Math.round(a / 5) * 5;
const unit = (x, y) => { const l = Math.hypot(x, y); return [x / l, y / l]; };

/** The left and right angles the peak snaps to with the pointer at u: the steeper side is rounded first and the other follows the ridge, so the two halves mirror. */
function stop(u, pitch) {
  const h = (L / 2) * Math.tan(rad(pitch)), c = clamp(u, X0, X1), m = c > L / 2, x = m ? L - c : c;
  const a = r5(Math.atan2(h, x) * DEG), b = r5(Math.atan2(h, L - h / Math.tan(rad(a))) * DEG);
  return m ? [b, a] : [a, b];
}
/** The peak [u, z], where rays at angles a and b from the two base corners meet. */
function peak([a, b]) {
  const ta = Math.tan(rad(a)), tb = Math.tan(rad(b));
  return [(L * tb) / (ta + tb), T / 2 + (L * ta * tb) / (ta + tb)];
}
/** Corners [left, right, peak]: the middle-line point, the frame's outer and inner corner (T/2 off each beam), the inward bisector and the half-angle's sine. */
function corners(p) {
  const V = [[0, T / 2], [L, T / 2], p];
  return V.map((v, i) => {
    const e = unit(V[(i + 1) % 3][0] - v[0], V[(i + 1) % 3][1] - v[1]), f = unit(V[(i + 2) % 3][0] - v[0], V[(i + 2) % 3][1] - v[1]);
    const b = unit(e[0] + f[0], e[1] + f[1]), sh = Math.sqrt((1 - e[0] * f[0] - e[1] * f[1]) / 2), k = T / 2 / sh;
    return { v, b, sh, out: [v[0] - b[0] * k, v[1] - b[1] * k], inn: [v[0] + b[0] * k, v[1] + b[1] * k] };
  });
}
/** The camera, fitted to the plate and the highest peak the steepest pitch reaches. */
function camera() {
  const C = Cam(45, 0.5, S), pts = [];
  for (const u of [-U0, L + U0]) for (const q of [-D, D]) pts.push(world(u, q, 0), world(u, q, -PB));
  for (let u = X0; u <= X1; u++) { const p = peak(stop(u, HI)); pts.push(world(p[0], -W / 2, p[1] + 9)); }
  fit(C, pts, 200, 166);
  return C;
}

function mount({ stage, svg, read }, value) {
  const bag = disposer();
  let pitch = value, at = null;
  const C = camera(), P = proj(C), front = facing(C);
  const on = (pts, q) => pts.map(([u, z]) => P(...world(u, q, z)));
  /** An arc of radius RA round c, from f0 to f1 degrees in the truss's plane, in the middle plane. */
  const arc = (c, f0, f1) => {
    const n = Math.max(2, Math.ceil((f1 - f0) / 3));
    return open(on(Array.from({ length: n + 1 }, (_, k) => {
      const f = rad(f0 + ((f1 - f0) * k) / n);
      return [c[0] + RA * Math.cos(f), c[1] + RA * Math.sin(f)];
    }), 0));
  };

  // back to front: the plate; the backs of the post and the frame; the arcs, in the middle plane; the post's face; the frame's face and its joints
  const g = mk("g", {}, svg);
  put(solid(g), prism(P, front, turn(rrect(-U0, -D, L + U0, D, 8, 6)), turn(rrect(2 - U0, 2 - D, L + U0 - 2, D - 2, 6, 6)), -PB, 0));
  const postBack = mk("path", { class: "lo" }, g), back = mk("path", { class: "lo" }, g);
  const arcL = mk("path", { class: "nf sil" }, g), arcR = mk("path", { class: "nf sil" }, g), arcT = mk("path", { class: "nf hi" }, g);
  const postFace = mk("path", { class: "sil" }, g), face = mk("path", { class: "sil" }, g), joints = mk("path", { class: "nf lo" }, g);

  let drawn = "";
  function draw(now) {
    const p = [tval(tw[0], now), tval(tw[1], now)], key = p.join();
    if (key === drawn) return;
    drawn = key;
    const K = corners(p), out = fillet(K.map((k) => k.out), [RO, RO, RO]), inn = fillet(K.map((k) => k.inn), [RI, RI, RI]).reverse();
    const frame = (q) => poly(on(out, q)) + poly(on(inn, q));
    const post = fillet([[p[0] - PW / 2, T], [p[0] + PW / 2, T], [p[0] + PW / 2, p[1]], [p[0] - PW / 2, p[1]]], [0.8, 0.8, 0.8, 0.8]);
    postBack.setAttribute("d", poly(on(post, -W / 2)));
    back.setAttribute("d", frame(-W / 2));
    // each arc turns round the opening's corner, edge to edge; the peak's breaks round the post
    const a = Math.atan2(p[1] - T / 2, p[0]) * DEG, b = Math.atan2(p[1] - T / 2, L - p[0]) * DEG, it = K[2].inn;
    const side = (s) => 270 + Math.asin(clamp((p[0] + (s * PW) / 2 - it[0]) / RA, -1, 1)) * DEG;
    arcL.setAttribute("d", arc(K[0].inn, 0, a));
    arcR.setAttribute("d", arc(K[1].inn, 180 - b, 180));
    arcT.setAttribute("d", arc(it, 180 + a, side(-1)) + arc(it, side(1), 360 - b));
    postFace.setAttribute("d", poly(on(post, W / 2)));
    face.setAttribute("d", frame(W / 2));
    // a joint runs along each corner's bisector, from the rounded inner corner to the rounded outer one
    joints.setAttribute("d", K.map(({ b, sh, out: o, inn: i }) => {
      const ki = RI / sh - RI, ko = RO / sh - RO;
      return seg(...on([[i[0] + b[0] * ki, i[1] + b[1] * ki], [o[0] + b[0] * ko, o[1] + b[1] * ko]], W / 2));
    }).join(""));
  }

  const p0 = peak(stop(REST, pitch)), tw = [tween(p0[0]), tween(p0[1])];
  const B = register(stage, (_dt, now) => { draw(now); return !tdone(tw[0], now) || !tdone(tw[1], now); });
  bag.add(B.unregister);
  draw(performance.now());
  read.textContent = "rest";

  /** Sends the peak to the stop under the pointer, or to rest. */
  function choose() {
    const s = stop(at ?? REST, pitch), p = peak(s), now = performance.now();
    tset(tw[0], p[0], now, 0);
    tset(tw[1], p[1], now, 0);
    read.textContent = at === null ? "rest" : `${s[0]} + ${180 - s[0] - s[1]} + ${s[1]} = 180`;
    B.wake();
  }

  // the base's two ends on screen, which never move: the pointer's x between them is u
  const x0 = P(...world(0, 0, 0))[0], x1 = P(...world(L, 0, 0))[0];
  bag.add(pointer(stage, {
    move: (q) => { at = ((q[0] - x0) / (x1 - x0)) * L; choose(); },
    leave: () => { at = null; choose(); },
  }));
  bag.add(() => svg.replaceChildren());

  return {
    set: (v) => { pitch = v; choose(); },
    destroy: bag.dispose,
  };
}

export default {
  name: "truss",
  means: "A roof truss on a plate: slide its peak and the three corner angles change, but they always add to 180°.",
  rules: [1, 5, 6, 8],
  range: [45, 60, 65],
  tour: [[236, 112], [200, 106], [134, 99], null],
  mount,
};
