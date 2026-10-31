import { HL } from './kernel.js';

/**
 * Throw: a ball thrown from a dim ring on a ground plate, over a low wall, to a
 * bright ring where it lands. Its flight is a dashed trail: h(x) = 4q·x(R − x)/R,
 * so the arc meets the ground at 0 and at R, the two roots. The pointer's screen
 * x along the throw line sets the strength: R, snapped to whole units so the
 * read-out is exact, on a spring. The slider is the loft q, the arc's height
 * over its range: it raises the arc and never moves where it lands.
 *
 * Paint order is back to front for every overlap the figure can make: the trail
 * clears the wall's top before it reaches it (its launch slope is 4q, and q and
 * R are clamped so it does), so the only place they cross on screen is the
 * wall's far end behind the falling half, which is nearer; so is the ball.
 */
const {
  Cam, circ, clamp, facing, fit, open, poly, prism, proj, rad, rings, rrect, spring, stepS,
  disposer, mk, place, pointer, put, register, solid,
} = HL;

const U = 10, RMIN = 4, RMAX = 8, REST = 7; // a unit of ground; the shortest, longest and resting throw, in units
const PX0 = -9, PX1 = 88, PY = 11, PB = 4; // the ground plate: a lane
const WX = 14, WT = 4, WY = 7, HW = 7; // the wall: its middle, thickness, half length, height
const RR = 5, RB = 4, BALL = 0.8, S = 2.9; // the rings, the ball, where along its flight the ball is drawn

function mount({ stage, svg, read }, value) {
  const bag = disposer();
  // Fitted to the longest, loftiest throw, so nothing leaves the frame at intensity 1.
  const C = Cam(45, 0.5, S);
  fit(C, [[PX0, -PY, -PB], [PX1, PY, -PB], [PX1, -PY, -PB], [PX0, PY, -PB], [RMAX * U / 2, 0, RMAX * U * 0.75]], 200, 166);
  const P = proj(C), front = facing(C), rS = RB * C.S;
  const ring = (x, r) => poly(circ(r, 32).map((s) => P(x + s.u, s.v, 0)));

  const g = mk("g", {}, svg);
  // the plate's corners are large on screen, so its rings take more steps than rings() gives
  put(solid(g), prism(P, front, rrect(PX0, -PY, PX1, PY, 8, 14), rrect(PX0 + 1.8, 1.8 - PY, PX1 - 1.8, PY - 1.8, 6.2, 14), -PB, 0));
  mk("path", { d: ring(0, 3.5), class: "nf lo" }, g); // where it leaves the ground: the other root
  const [wr, wi] = rings(WX - WT / 2, -WY, WX + WT / 2, WY, 2, 0.8);
  put(solid(g), prism(P, front, wr, wi, 0, HW));
  const land = mk("path", { class: "nf sil hi" }, g); // the one bright mark, at rest and under the pointer
  const trail = mk("path", { class: "nf dash sil" }, g);
  const ball = mk("ellipse", { rx: rS, ry: rS, class: "sil" }, g);
  const glint = mk("path", { class: "nf lo" }, g);

  const sR = spring(REST * U), sQ = spring(value);
  let drawn = "";
  function draw() {
    const R = sR.x, q = sQ.x, key = R + "," + q;
    if (key === drawn) return;
    drawn = key;
    const h = (x) => (4 * q * x * (R - x)) / R;
    trail.setAttribute("d", open(Array.from({ length: 41 }, (_, k) => P((k * R) / 40, 0, h((k * R) / 40)))));
    land.setAttribute("d", ring(R, RR));
    const [bx, by] = P(BALL * R, 0, h(BALL * R));
    place(ball, [bx, by]);
    // the one crease a sphere has: a dim glint on its upper left
    glint.setAttribute("d", open([0, 1, 2, 3, 4].map((k) => [bx + 0.62 * rS * Math.cos(rad(200 + k * 14)), by + 0.62 * rS * Math.sin(rad(200 + k * 14))])));
  }

  const B = register(stage, (dt) => {
    const m = stepS(sR, dt) | stepS(sQ, dt);
    draw();
    return !!m;
  });
  bag.add(B.unregister);

  // The hit test reads the pointer's screen x against the throw line on the ground, which never moves.
  const o = P(0, 0, 0)[0], per = P(U, 0, 0)[0] - o;
  function aim(n) {
    sR.t = (n || REST) * U;
    read.textContent = n ? `lands at ${n}` : "rest";
    B.wake();
  }
  read.textContent = "rest";
  bag.add(pointer(stage, {
    move: (p) => aim(clamp(Math.round((p[0] - o) / per), RMIN, RMAX)),
    leave: () => aim(0),
  }));
  bag.add(() => svg.replaceChildren());

  return {
    set: (v) => { sQ.t = v; B.wake(); },
    destroy: bag.dispose,
  };
}

export default {
  name: "throw",
  means: "A ball thrown over a low wall: throw harder and it lands farther; the bright ring is where its arc meets the ground.",
  rules: [1, 3, 5, 6, 8],
  range: [0.45, 0.6, 0.75],
  tour: [[201, 206], [242, 227], [283, 247], null],
  mount,
};
