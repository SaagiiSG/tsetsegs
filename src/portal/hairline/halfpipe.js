import { HL } from './kernel.js';

/**
 * Halfpipe: a skate ramp, a solid U-shaped trough with a flat deck at each top,
 * and a ball in it. The ramp's curve is h(x) = ½(x − 2)² + 1 in units, so the
 * lips stand at x 0 and x 4, height 3, and the lowest point is x 2, where a
 * bright mark sits on the front rim. The pointer's screen x along the ball's
 * lane (a line on the ground, which never moves) pushes the ball, snapped to
 * whole units so the read-out is exact, on a spring. Let go and a second
 * spring rolls it back: it swings past the bottom and settles there. That
 * spring's damping is the slider, the ramp's friction: the release has its own
 * constant because a ball let go in a bowl rocks before it rests.
 *
 * Paint order: the far lines, the ball, then the front face, opaque, over the
 * part of the ball behind it; its creases, the bright mark, and the outline.
 * On the left wall and at the bottom nothing stands in front of the ball, so
 * there it is moved to paint last.
 */
const {
  Cam, clamp, fillet, fit, open, poly, proj, rad, spring, stepS,
  disposer, mk, place, pointer, register,
} = HL;

const U = 16, S = 2.3; // a unit of the maths, in world units, across and up alike; the camera's scale
const XA = 0, XB = 4, VX = 2, DECK = 1.5, L = 2, LANE = 1.3, RB = 0.65, N = 24; // lips, vertex, deck, half length, lane, ball, samples
const h = (x) => 0.5 * (x - VX) ** 2 + 1, D = h(XA), XL = XA - DECK, XR = XB + DECK;
/** The ramp's top, left to right: the left deck, the curve from lip to lip, the right deck. */
const TOP = [[XL, D], ...Array.from({ length: N + 1 }, (_, i) => [XA + ((XB - XA) * i) / N, h(XA + ((XB - XA) * i) / N)]), [XR, D]];

function mount({ stage, svg, read }, value) {
  const bag = disposer();
  // Fitted to the block, which holds every pose of the ball.
  const C = Cam(45, 0.5, S), box = [];
  for (const x of [XL, XR]) for (const y of [-L, L]) for (const z of [0, D]) box.push([x * U, y * U, z * U]);
  fit(C, box, 200, 166);
  const P = proj(C), W = (x, y, z) => P(x * U, y * U, z * U), rS = RB * U * C.S;

  const back = TOP.map(([x, z]) => W(x, -L, z)), front = TOP.map(([x, z]) => W(x, L, z));
  // The back rim drops behind the right lip's line where it crosses it, on screen.
  const lb = W(XB, -L, D), lf = W(XB, L, D);
  const side = (p) => (lf[0] - lb[0]) * (p[1] - lb[1]) - (lf[1] - lb[1]) * (p[0] - lb[0]);
  let j = 2;
  while (j < N + 1 && side(back[j]) * side(back[1]) > 0) j++;
  const s0 = side(back[j - 1]), u = s0 / (s0 - side(back[j]));
  const x1 = [back[j - 1][0] + u * (back[j][0] - back[j - 1][0]), back[j - 1][1] + u * (back[j][1] - back[j - 1][1])];

  // The outline, closed: left deck's far edge, back rim down to the notch, up the right lip, round the near foot.
  const out = [[W(XL, L, D), 4], [back[0], 4], [back[1], 2], ...back.slice(2, j).map((p) => [p, 0]), [x1, 0],
    [lb, 2], [W(XR, -L, D), 4], [W(XR, -L, 0), 4], [W(XR, L, 0), 4], [W(XL, L, 0), 4]];
  // The creases: the right deck's outer edge, then the front rim from the right deck to the left one.
  const b = 0.2, cr = [W(XR, -L + b, D), ...front.slice(1).reverse(), W(XL + b, L, D)];
  const crR = cr.map((_, k) => (k === 1 ? 4 : k === 2 || k === N + 2 ? 2 : 0));

  const g = mk("g", {}, svg);
  mk("path", { d: open([W(XA, -L, D), W(XA, L, D)]), class: "nf lo" }, g); // the left lip
  mk("path", { d: open([lf, x1]), class: "nf sil" }, g); // the right lip, standing in front of the trough
  const bg = mk("g", {}, g), ball = mk("ellipse", { rx: rS, ry: rS, class: "sil" }, bg), glint = mk("path", { class: "nf lo" }, bg);
  const face = mk("path", { d: poly([W(XL, L, 0), W(XR, L, 0), ...front.slice().reverse()]), class: "fo" }, g); // the front face
  mk("path", { d: open(fillet(cr, crR)), class: "nf lo" }, g);
  const mark = mk("path", { d: open(TOP.filter(([x]) => Math.abs(x - VX) <= 0.5).map(([x, z]) => W(x, L, z))), class: "nf hi" }, g);
  mk("path", { d: poly(fillet(out.map((o) => o[0]), out.map((o) => o[1]))), class: "nf sil" }, g);

  let sp = spring(VX * U), held = false, fr = value, drawn = NaN;
  function draw() {
    const x = clamp(sp.x / U, XA, XB);
    if (x === drawn) return;
    drawn = x;
    // the ball sits on the curve: its centre is RB out along the normal, (−h′, 1)
    const s = x - VX, n = Math.hypot(s, 1), c = W(x - (RB * s) / n, LANE, h(x) + RB / n);
    place(ball, c);
    // Up the right wall the front face stands in front of the ball; on the left and at the bottom nothing
    // does, and at the left lip the ball rises past the outline, so it is painted last.
    if ((x > VX) !== (bg.nextSibling === face)) { if (x > VX) face.before(bg); else g.append(bg); }
    // the one crease a sphere has: a dim glint on its upper left
    glint.setAttribute("d", open([0, 1, 2, 3, 4].map((k) => [c[0] + 0.62 * rS * Math.cos(rad(200 + k * 14)), c[1] + 0.62 * rS * Math.sin(rad(200 + k * 14))])));
  }
  draw();

  const B = register(stage, (dt) => {
    const m = stepS(sp, dt);
    draw();
    return m;
  });
  bag.add(B.unregister);

  /** Pushes the ball to whole unit x, or lets it go (null): it rolls back on the friction's spring. */
  function push(x) {
    if (x === null && held) { sp = spring(sp.x, { c: fr }); sp.t = VX * U; held = false; }
    if (x !== null) { if (!held) { sp = spring(sp.x); held = true; } sp.t = x * U; }
    const up = x !== null && x !== VX; // up a side, the ball has the bright; at the bottom, the mark keeps it
    ball.classList.toggle("hi", up);
    mark.setAttribute("class", up ? "nf lo" : "nf hi");
    read.textContent = x === null ? "rest" : x === VX ? `lowest at x ${VX}` : `height ${h(x)} at x ${x}`;
    B.wake();
  }
  read.textContent = "rest";

  // The hit test reads the pointer's screen x against the ball's lane on the ground, which never moves.
  const o = W(0, LANE, 0)[0], per = W(1, LANE, 0)[0] - o;
  bag.add(pointer(stage, {
    move: (p) => push(clamp(Math.round((p[0] - o) / per), XA, XB)),
    leave: () => push(null),
  }));
  bag.add(() => svg.replaceChildren());

  return {
    set: (v) => { fr = v; },
    destroy: bag.dispose,
  };
}

export default {
  name: "halfpipe",
  means: "A ball in a skate ramp: push it up either side and let go, and it rolls back and settles at the lowest point.",
  rules: [1, 4, 5, 8],
  range: [12, 6, 3],
  tour: [[214, 146], [166, 180], [118, 108], null],
  mount,
};
