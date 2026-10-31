import { HL } from './kernel.js';

/**
 * Foil: (x + a)(x + b) as a plate holding four raised cells: a big x·x at
 * the back, two strips x·a and x·b down its sides, and a small a·b in the
 * near corner. The plate hugs the cells, so its outline is the whole product. The pointer drags that near corner: past the x·x cell along one
 * side it sets a, along the other it sets b, one to four units each. The cells
 * resize on the 700ms curve, staggered out from the cell under the pointer,
 * which rises and takes the bright stroke. At rest the plate holds
 * (x + 2)(x + 3) with the a·b corner raised. The slider is the stagger, in ms.
 *
 * The pattern: one of many, the choice being two whole numbers, so tweens. The
 * hit test reads the pointer on the cells' rest top plane, and the choice is a
 * function of where it lands alone, never of the cells on screen.
 */
const {
  Cam, clamp, facing, fit, prism, proj, rings, unproj, tdone, tset, tval, tween,
  disposer, mk, pointer, put, register, solid,
} = HL;

const X = 64, U = 11, AMAX = 4, G = 3, H = 7, RISE = 7, M = 5, PB = 4, R = 3.5, B = 1.4;
const A0 = 2, B0 = 3, REST = 3; // rest: (x + 2)(x + 3), the a·b corner raised
const L = X + AMAX * U; // the far end of a stretch

function mount({ stage, svg, read }, value) {
  const bag = disposer();
  let stag = value;

  // Fitted to the plate at its far end and the x·x cell raised, the most extreme pose.
  const C = Cam(45, 0.5, 2.05);
  fit(C, [[-M, -M, -PB], [L + M, L + M, -PB], [L + M, -M, -PB], [-M, L + M, -PB], [0, 0, H + RISE]], 200, 166);
  const P = proj(C), front = facing(C);

  const g = mk("g", {}, svg), plate = solid(g);
  let pk = "";

  // Back to front: x·x, x·a, x·b, a·b. c and r are 1 on the a side and the b side.
  const cells = [[0, 0], [1, 0], [0, 1], [1, 1]].map(([c, r], i) => ({
    c, r, a: tween(A0), b: tween(B0), h: tween(i === REST ? H + RISE : H), el: solid(g), key: "",
  }));
  cells[REST].el.sil.classList.add("hi");

  const loop = register(stage, (_dt, now) => {
    let moving = false;
    for (const k of cells) {
      const a = tval(k.a, now), b = tval(k.b, now), h = tval(k.h, now);
      if (!tdone(k.a, now) || !tdone(k.b, now) || !tdone(k.h, now)) moving = true;
      // a cell redraws only when a number it is built from moved
      const key = `${k.c ? a : 0},${k.r ? b : 0},${h}`;
      if (key === k.key) continue;
      k.key = key;
      const x0 = k.c ? X + G / 2 : 0, x1 = k.c ? X + a * U : X - G / 2;
      const y0 = k.r ? X + G / 2 : 0, y1 = k.r ? X + b * U : X - G / 2;
      const [ring, inner] = rings(x0, y0, x1, y1, R, B);
      put(k.el, prism(P, front, ring, inner, 0, h));
    }
    // the plate's near edges follow the outermost cell on each side, so no cell overhangs it mid-stagger
    const pa = X + Math.max(tval(cells[1].a, now), tval(cells[3].a, now)) * U + M;
    const pb = X + Math.max(tval(cells[2].b, now), tval(cells[3].b, now)) * U + M;
    if (`${pa},${pb}` !== pk) {
      pk = `${pa},${pb}`;
      const [pr, pi] = rings(-M, -M, pa, pb, 7, 2);
      put(plate, prism(P, front, pr, pi, -PB, 0));
    }
    return moving;
  });
  bag.add(loop.unregister);

  let act = -1, A = A0, Bn = B0;
  /** Cell i (-1 is rest) with a and b. The change spreads out from the cell chosen, or the one let go. */
  function choose(i, a, b) {
    if (i === act && a === A && b === Bn) return;
    const now = performance.now(), f = cells[i >= 0 ? i : act], on = i >= 0 ? i : REST;
    act = i; A = a; Bn = b;
    cells.forEach((k, j) => {
      const d = (Math.abs(k.c - f.c) + Math.abs(k.r - f.r)) * stag;
      tset(k.a, a, now, d); tset(k.b, b, now, d); tset(k.h, j === on ? H + RISE : H, now, d);
      k.el.sil.classList.toggle("hi", j === on);
    });
    read.textContent = i < 0 ? "rest" : `(x + ${a})(x + ${b})`;
    loop.wake();
  }
  read.textContent = "rest";

  /** The pointer on the plane of the cells' rest tops: which side of x it is on, and how many units past x, rounded up, so it is always inside the cell it sizes. */
  function hit(p) {
    const [wx, wy] = unproj(C, p[0], p[1], H);
    const a = clamp(Math.ceil((wx - X) / U), 1, AMAX), b = clamp(Math.ceil((wy - X) / U), 1, AMAX);
    choose((wx >= X ? 1 : 0) + (wy >= X ? 2 : 0), a, b);
  }

  bag.add(pointer(stage, { move: hit, leave: () => choose(-1, A0, B0) }));
  bag.add(() => svg.replaceChildren());

  return {
    set: (v) => { stag = v; },
    destroy: bag.dispose,
  };
}

export default {
  name: "foil",
  means: "A square in four cells, x·x, x·a, x·b and a·b: stretch a one way and b the other, and the area of (x + a)(x + b) follows.",
  rules: [1, 2, 5, 8],
  range: [0, 40, 80],
  tour: [[302, 178], [216, 221], [130, 162], null],
  mount,
};
