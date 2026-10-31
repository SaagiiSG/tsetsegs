import { HL } from './kernel.js';

/**
 * Pegs: a square peg board of 7 × 7 holes. The pointer drags one corner of a
 * square of raised pegs along the board's long diagonal: n × n pegs stand, the
 * rest sink into their holes, and the row along the square's front side, n
 * pegs long, takes the bright stroke: the side is the root of the count. Pegs
 * rise and sink on the 700ms curve, staggered out from the dragged corner. At
 * rest a square of sixteen stands in the left corner, its side of four bright,
 * and the empty holes beside it leave room to grow. The slider is the stagger, in ms.
 *
 * The pattern: discrete items. The side n is a choice, so tweens; the hit test
 * is seven fixed bands of screen x, one per corner, which nothing drawn moves.
 */
const {
  Cam, clamp, facing, fit, prism, proj, rings, tdone, tset, tval, tween,
  disposer, flatDot, mk, place, pointer, put, register, solid,
} = HL;

const N = 7, PITCH = 20, R = 7, B = 1.4, PH = 9, M = 9, PB = 4, E = N * PITCH, REST = 4, HOLE = 2.2;

/** The square of side n stands in the board's left corner: columns i < n, rows j ≥ N - n. */
const side = (i, j) => Math.max(i + 1, N - j); // the smallest square that holds peg (i, j)
const corner = (n) => [n - 1, N - n]; // the peg the pointer drags
/** Rest: the square of sixteen up, every other peg down in its hole. */
const restH = (i, j) => (side(i, j) <= REST ? PH : 0);

function mount({ stage, svg, read }, value) {
  const bag = disposer();
  let stag = value;

  // Fitted to the board with all 49 pegs up, the most extreme pose.
  const C = Cam(45, 0.5, 1.36);
  fit(C, [[-M, -M, -PB], [E + M, E + M, -PB], [E + M, -M, -PB], [-M, E + M, -PB], [PITCH / 2 - R, PITCH / 2 - R, PH]], 200, 166);
  const P = proj(C), front = facing(C);

  const g = mk("g", {}, svg);
  const [br, bi] = rings(-M, -M, E + M, E + M, 10, 2);
  put(solid(g), prism(P, front, br, bi, -PB, 0));

  // Holes lie on the board, under every peg; pegs go diagonal by diagonal from the far corner, back to front.
  const holes = mk("g", {}, g), pegs = [];
  for (let s = 0; s <= 2 * (N - 1); s++) for (let i = 0; i < N; i++) {
    const j = s - i;
    if (j < 0 || j >= N) continue;
    const cx = (i + 0.5) * PITCH, cy = (j + 0.5) * PITCH, h0 = restH(i, j);
    place(flatDot(holes, C, HOLE, "dot off"), P(cx, cy, 0));
    const [ring, inner] = rings(cx - R, cy - R, cx + R, cy + R, R, B);
    const el = solid(g);
    el.sil.classList.toggle("hi", j === N - 1 && i < REST);
    pegs.push({ i, j, h0, ring, inner, el, h: tween(h0), d: NaN });
  }

  const B2 = register(stage, (_dt, now) => {
    let moving = false;
    for (const pg of pegs) {
      const h = tval(pg.h, now);
      if (!tdone(pg.h, now)) moving = true;
      if (h === pg.d) continue;
      pg.d = h;
      // a sunk peg is only its hole
      put(pg.el, h < 0.4 ? { sil: "", crease: "" } : prism(P, front, pg.ring, pg.inner, 0, h));
    }
    return moving;
  });
  bag.add(B2.unregister);

  // Seven bands of screen x, centred on the corner peg of each square. They never move.
  const sx = (n) => P(...corner(n).map((k) => (k + 0.5) * PITCH), 0)[0];
  const x1 = sx(1), step = sx(2) - x1;
  const band = (x) => clamp(Math.round((x - x1) / step) + 1, 1, N);

  let n = 0; // 0 is rest
  /** Raises the square of side m (0 puts the rest back). The change spreads out from the dragged corner. */
  function choose(m) {
    if (m === n) return;
    const now = performance.now(), [ci, cj] = corner(m || n);
    n = m;
    for (const pg of pegs) {
      const to = m ? (side(pg.i, pg.j) <= m ? PH : 0) : pg.h0;
      tset(pg.h, to, now, Math.hypot(pg.i - ci, pg.j - cj) * stag);
      pg.el.sil.classList.toggle("hi", pg.j === N - 1 && pg.i < (m || REST));
    }
    read.textContent = m ? `√${m * m} = ${m}` : "rest";
    B2.wake();
  }
  read.textContent = "rest";

  bag.add(pointer(stage, { move: (p) => choose(band(p[0])), leave: () => choose(0) }));
  bag.add(() => svg.replaceChildren());

  return {
    set: (v) => { stag = v; },
    destroy: bag.dispose,
  };
}

export default {
  name: "pegs",
  means: "A square of pegs on a peg board: drag its corner and n × n pegs stand, n along each side, the square root of the count.",
  rules: [1, 2, 4, 8],
  range: [0, 40, 80],
  tour: [[123, 150], [238, 150], [315, 150], null],
  mount,
};
