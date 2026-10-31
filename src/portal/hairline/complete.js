import { HL } from './kernel.js';

/**
 * Complete: completing the square, x² + 6x + 9 = (x + 3)². On a plate, an
 * x·x tile and two x·3 strips along two of its sides make an L whose near
 * corner is empty; a dashed outline on the plate marks the gap. The 3·3
 * corner piece rests beside it on the plate, bright. The pointer slides the
 * piece along its path into the gap, on a spring; inside the snap reach it
 * locks in on the 700ms curve, and the bright leaves the piece for the outline
 * of the whole square. The slider is the snap reach, in world units.
 *
 * The pattern: scrub and pick. The pointer is read against the segment between
 * the piece's two fixed poses, at rest and in the gap, never the piece on screen.
 */
const {
  Cam, clamp, facing, fit, poly, prism, proj, ringAt, rings, spring, stepS, tdone, tset, tval, tween,
  disposer, mk, pointer, put, register, solid,
} = HL;

const X = 56, W = 24, G = 1.6, Q = X + G + W, H = 8, R = 3.5, B = 1.3, M = 7, PB = 4;
const SC = X + G + W / 2; // the gap's centre, on both axes
const DX = 36, DY = 8, LEN = Math.hypot(DX, DY); // the piece at rest, from the gap: beside it, clear of it on screen

function mount({ stage, svg, read }, value) {
  const bag = disposer();
  let reach = value, cur = null;

  // Fitted to the plate, which holds the piece at rest: the most extreme pose.
  const PX = SC + DX + W / 2 + M, PY = SC + DY + W / 2 + M;
  const C = Cam(45, 0.5, 1.8);
  fit(C, [[-M, -M, -PB], [PX, PY, -PB], [PX, -M, -PB], [-M, PY, -PB], [0, 0, H], [PX, PY, H]], 200, 166);
  const P = proj(C), front = facing(C);

  const g = mk("g", {}, svg);
  const [pr, pi] = rings(-M, -M, PX, PY, 8, 2);
  put(solid(g), prism(P, front, pr, pi, -PB, 0));
  // the gap's outline on the plate, under everything that can cover it
  mk("path", { d: poly(ringAt(P, rings(X + G, X + G, Q, Q, R, B)[0], 0)), class: "nf dash" }, g);
  // back to front: x·x, then the two x·3 strips, which never overlap on screen
  for (const [x0, y0, x1, y1] of [[0, 0, X, X], [X + G, 0, Q, X], [0, X + G, X, Q]]) {
    const [ring, inner] = rings(x0, y0, x1, y1, R, B);
    put(solid(g), prism(P, front, ring, inner, 0, H));
  }
  // the 3·3 piece: always the nearest thing, so always painted last
  const piece = solid(g);
  piece.sil.classList.add("hi");
  // the whole square's outline, drawn only once the piece has landed in the gap
  const [wr, wi] = rings(0, 0, Q, Q, R, B), wholeD = prism(P, front, wr, wi, 0, H).sil;
  const whole = mk("path", { class: "nf hi" }, g);

  const sp = spring(1), lk = tween(0);
  let locked = false, shown = false, drawn = NaN;
  const loop = register(stage, (dt, now) => {
    const moving = stepS(sp, dt), s = sp.x * (1 - tval(lk, now));
    if (s !== drawn) {
      drawn = s;
      const x0 = X + G + s * DX, y0 = X + G + s * DY, [ring, inner] = rings(x0, y0, x0 + W, y0 + W, R, B);
      put(piece, prism(P, front, ring, inner, 0, H));
    }
    const done = locked && tdone(lk, now);
    if (done !== shown) {
      shown = done;
      whole.setAttribute("d", done ? wholeD : "");
      piece.sil.classList.toggle("hi", !done);
    }
    return moving || !tdone(lk, now);
  });
  bag.add(loop.unregister);

  /** t is how far along the path the pointer is, 0 in the gap and 1 at rest; null is away. */
  function slide(t) {
    cur = t;
    const on = t !== null && t * LEN <= reach;
    sp.t = t === null ? 1 : t;
    if (on !== locked) { locked = on; tset(lk, on ? 1 : 0, performance.now(), 0); }
    read.textContent = t === null ? "rest" : on ? "(x + 3)² = 16" : "x² + 6x + 9";
    loop.wake();
  }
  read.textContent = "rest";

  // The path on screen, from the gap's top to the resting piece's top: fixed poses, so it never moves.
  const A = P(SC, SC, H), Z = P(SC + DX, SC + DY, H);
  const ax = Z[0] - A[0], ay = Z[1] - A[1], L = Math.hypot(ax, ay);
  const e0 = P(SC - W / 2, SC + W / 2, H), e1 = P(SC + W / 2, SC - W / 2, H), HALF = Math.abs(e1[0] - e0[0]) * 0.7;
  function hit([x, y]) {
    const t = ((x - A[0]) * ax + (y - A[1]) * ay) / (L * L), q = Math.abs((x - A[0]) * ay - (y - A[1]) * ax) / L;
    slide(q > HALF || t < -0.8 || t > 1.6 ? null : clamp(t, 0, 1));
  }

  bag.add(pointer(stage, { move: hit, leave: () => slide(null) }));
  bag.add(() => svg.replaceChildren());

  return {
    set: (v) => { reach = v; if (cur !== null) slide(cur); },
    destroy: bag.dispose,
  };
}

export default {
  name: "complete",
  means: "An x² tile and two 3x strips make an L one corner short of a square: slide in the 9 piece and it closes into (x + 3)².",
  rules: [1, 4, 5, 8],
  range: [4, 10, 18],
  tour: [[218, 203], [202, 190], [182, 175], null],
  mount,
};
