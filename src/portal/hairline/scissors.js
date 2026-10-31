import { HL } from './kernel.js';

/**
 * Scissors: a pair of scissors lies open on a round plate, two blades crossing
 * at a pivot screw, each blade running on through the pivot to a finger loop.
 * The pointer, read on the plate (which never moves), swings the blades open
 * or shut about their middle line, snapped to whole steps; the opening tweens.
 * Two arcs on the plate mark the opposite pair of angles, the one between the
 * tips and the one between the loops: the one bright mark, equal at every
 * opening. The read-out gives the angle and its neighbour, which make 180°.
 * The slider is the step, in degrees.
 *
 * The middle line runs along world −y, so a right angle's blades lie along
 * the screen's own axes and 90° looks like 90°; any opening's vertical
 * angles stay equal on screen, as an affine view keeps them.
 */
const {
  Cam, circ, clamp, facing, fillet, fit, lerp, open, poly, prism, proj, rad, rings, unproj,
  tween, tset, tval, tdone, mk, pointer, put, register, disposer, solid,
} = HL;

const R = 66, PB = 5, T = 1; // the plate, and a blade's thickness
const LB = 62, LH = 45, RO = 12, RI = 7.5; // tip, loop centre, loop and hole radii, all from the pivot
const RA = 27, REST = 60, LO = 40, HI = 140; // the arcs' radius; the rest opening and the reach, in degrees
// Both arcs stop GAP short of the blade lines: a blade's half-width at RA, plus how far its top's outline reaches past
// its foot on screen. So no blade covers either end, and the tips' arc and the loops' always show the same length.
const GAP = 6.4;

// One blade in its own frame: u runs from the pivot to the tip, v across it.
// The tip, the back of the blade widening to the pivot boss, the shank, and the loop round its hole.
const SIDE = [[52, 2.3], [36, 3.9], [24, 4.3], [12, 5], [5, 5.8], [-6, 5.8], [-14, 4.4]];
const J = Math.asin(3.8 / RO), NL = 28;
const LOOP = Array.from({ length: NL + 1 }, (_, k) => {
  const t = J + (k / NL) * (2 * Math.PI - 2 * J);
  return [-LH + RO * Math.cos(t), RO * Math.sin(t)];
});
const OUT = [[LB, 0], ...SIDE, ...LOOP, ...SIDE.slice().reverse().map(([u, v]) => [u, -v])];
const RADII = OUT.map((_, i) => {
  if (i === 0) return 1.2; // the point stays a point
  const k = i - 1 - SIDE.length;
  return k === 0 || k === NL ? 2.5 : k > 0 && k < NL ? 0 : 8;
});
const SHAPE = fillet(OUT, RADII, 4);
// the hole winds the other way, so a path of outline + hole is filled with the hole left open
const HOLE = Array.from({ length: 28 }, (_, k) => [-LH + RI * Math.cos(-k * Math.PI / 14), RI * Math.sin(-k * Math.PI / 14)]);

function mount({ stage, svg, read }, value) {
  const bag = disposer();
  let step = value, over = null;

  // Fitted to the plate: every pose of the scissors lies inside its rim.
  const C = Cam(45, 0.5, 2.3);
  const rim = circ(R, 48);
  fit(C, [...rim.map((q) => [q.u, q.v, 0]), ...rim.map((q) => [q.u, q.v, -PB])], 200, 166);
  const P = proj(C), front = facing(C);

  // Back to front: the plate, the arcs on it, the lower blade, the upper blade over it at the pivot, the screw.
  const g = mk("g", {}, svg);
  put(solid(g), prism(P, front, circ(R, 72), circ(R - 2.2, 72), -PB, 0));
  const arcs = mk("path", { class: "nf hi" }, g);
  const blade = () => { const b = mk("g", {}, g); return { back: mk("path", { class: "lo" }, b), face: mk("path", { class: "sil" }, b) }; };
  const lower = blade(), upper = blade();
  const [sr, si] = rings(-3.2, -3.2, 3.2, 3.2, 3.2, 0.8);
  put(solid(g), prism(P, front, sr, si, T, T + 1.4));

  /** A blade whose tip points phi off the middle line: outline and hole, at its foot and its top. */
  function drawBlade(b, phi) {
    const s = Math.sin(phi), c = Math.cos(phi);
    const at = (pts, z) => poly(pts.map(([u, v]) => P(u * s + v * c, -u * c + v * s, z)));
    b.back.setAttribute("d", at(SHAPE, 0) + at(HOLE, 0));
    b.face.setAttribute("d", at(SHAPE, T) + at(HOLE, T));
  }
  /** An arc on the plate from angle a0 to a1 off the middle line. */
  const arc = (a0, a1) => open(Array.from({ length: 25 }, (_, k) => {
    const t = lerp(a0, a1, k / 24);
    return P(RA * Math.sin(t), -RA * Math.cos(t), 0);
  }));

  /** Opens the scissors to `deg`: the blades sit at ±half of it, and the arcs span the tips' angle and the loops'. */
  function draw(deg) {
    const h = rad(deg / 2), e = h - Math.asin(GAP / RA);
    drawBlade(lower, -h);
    drawBlade(upper, h);
    arcs.setAttribute("d", e > 0 ? arc(-e, e) + arc(Math.PI - e, Math.PI + e) : "");
  }

  const tw = tween(REST);
  let drawn = REST;
  draw(REST);
  const B = register(stage, (_dt, now) => {
    const a = tval(tw, now);
    if (a !== drawn) { drawn = a; draw(a); }
    return !tdone(tw, now);
  });
  bag.add(B.unregister);

  /** The opening the ground point under the pointer asks for: twice its angle off the middle line, folded so a loop asks as its tip does, snapped and clamped. */
  function opening([x, y]) {
    const f = Math.abs(Math.atan2(x, -y)) * 180 / Math.PI;
    return clamp(Math.round((2 * Math.min(f, 180 - f)) / step) * step, Math.ceil(LO / step) * step, Math.floor(HI / step) * step);
  }

  function choose() {
    const a = over ? opening(over) : REST;
    tset(tw, a, performance.now(), 0);
    read.textContent = over ? `${a}° · ${180 - a}°` : "rest";
    B.wake();
  }

  bag.add(pointer(stage, {
    move: (p) => { over = unproj(C, p[0], p[1], 0); choose(); },
    leave: () => { over = null; choose(); },
  }));
  bag.add(() => svg.replaceChildren());

  return {
    set: (v) => { step = v; if (over) choose(); },
    destroy: bag.dispose,
  };
}

export default {
  name: "scissors",
  means: "Open scissors on a plate: swing the blades and the opposite angles stay equal, while neighbours add to 180°.",
  rules: [1, 4, 5, 6, 8],
  range: [5, 10, 15],
  tour: [[200, 110], [165, 113], [235, 113], null],
  mount,
};
