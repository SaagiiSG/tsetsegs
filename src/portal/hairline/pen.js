import { HL } from './kernel.js';

/**
 * Pen: a rectangular animal pen on a round grass plate, made from one length
 * of fence: eight posts and a rail all round. The sides are a and b units,
 * with a + b = 12, so the fence is always 24 units long. The pointer's
 * left-right place picks a, snapped to the step, and the near corner post
 * follows it: one side stretches, the other shrinks. The ground inside is
 * ruled in unit squares, so the area is what you see. When the pen is square
 * the area is largest and the whole fence goes bright. At rest the pen is
 * 8 × 4 and the near corner post, the handle, is the bright mark. The slider
 * is the step, in units.
 *
 * The pen stays centred, so its four corners slide along fixed lines on
 * screen: the near corner moves straight across, under the pointer.
 */
const {
  Cam, circ, clamp, facing, fit, prism, proj, rings, seg, unproj,
  tdone, tset, tval, tween, disposer, mk, pointer, put, register, solid,
} = HL;

const U = 12, SUM = 12, A0 = 2, A1 = 10, REST = 8, SQ = SUM / 2; // a unit of ground; a + b; the side's range; rest; the square
const PR = 68, PB = 4; // the grass plate: radius and thickness
const PS = 1.8, FH = 15, RZ = 9, RT = 3, RW = 0.6; // posts: half-size and height; the rail: its foot, height and half-width
// Back to front, a post [sx, sy] or a run of rail from one post to the next: the far corner,
// the two far sides, the left and right corners, the two near sides, the near corner (the handle).
const ITEMS = [
  [-1, -1], [-1, -1, 0, -1], [0, -1], [0, -1, 1, -1], [-1, -1, -1, 0], [-1, 0], [-1, 0, -1, 1],
  [1, -1], [-1, 1], [1, -1, 1, 0], [1, 0], [1, 0, 1, 1], [-1, 1, 0, 1], [0, 1], [0, 1, 1, 1], [1, 1],
];
/** Post [sx, sy] of the pen a units long: its centre on the ground. */
const at = (sx, sy, a) => [(sx * a * U) / 2, (sy * (SUM - a) * U) / 2];
const num = (n) => String(+n.toFixed(2));

function mount({ stage, svg, read }, value) {
  const bag = disposer();
  let step = value, over = null;

  // Fitted to the plate and the post tops at both extreme pens, 10 × 2 and 2 × 10.
  const C = Cam(45, 0.5, 2.1);
  const rim = circ(PR, 96), tops = [];
  for (const a of [A0, A1]) for (const sx of [-1, 1]) for (const sy of [-1, 1]) tops.push([...at(sx, sy, a), FH]);
  fit(C, [...rim.map((q) => [q.u, q.v, 0]), ...rim.map((q) => [q.u, q.v, -PB]), ...tops], 200, 166);
  const P = proj(C), front = facing(C);

  // Back to front: the plate, the ruled ground inside the pen, then the fence.
  const g = mk("g", {}, svg);
  put(solid(g), prism(P, front, rim, circ(PR - 2.2, 96), -PB, 0));
  const grid = mk("path", { class: "nf lo" }, g);
  const items = ITEMS.map((s) => ({ s, el: solid(g) }));
  const handle = items[items.length - 1].el;

  /** The ground ruled in unit squares, from the far corner; a part square at the edge while the pen moves. */
  function ruled(a) {
    const [x0, y0] = at(-1, -1, a), [x1, y1] = at(1, 1, a), b = SUM - a;
    const cuts = (n) => [...Array(Math.floor(n + 1e-9) + 1).keys(), n];
    return cuts(a).map((i) => seg(P(x0 + i * U, y0, 0), P(x0 + i * U, y1, 0))).join("")
      + cuts(b).map((j) => seg(P(x0, y0 + j * U, 0), P(x1, y0 + j * U, 0))).join("");
  }

  /** Every post and run of rail for the pen a units long. A run starts at its far post's face and ends inside its near post, which covers it. */
  function draw(a) {
    grid.setAttribute("d", ruled(a));
    for (const { s, el } of items) {
      const [x0, y0] = at(s[0], s[1], a);
      if (s.length === 2) {
        const [r, i] = rings(x0 - PS, y0 - PS, x0 + PS, y0 + PS, 1.1, 0.7);
        put(el, prism(P, front, r, i, 0, FH));
        continue;
      }
      const [x1, y1] = at(s[2], s[3], a), dx = s[2] - s[0], dy = s[3] - s[1];
      const xa = x0 + dx * (PS + RW), ya = y0 + dy * (PS + RW);
      const [r, i] = rings(Math.min(xa, x1) - RW, Math.min(ya, y1) - RW, Math.max(xa, x1) + RW, Math.max(ya, y1) + RW, RW, 0.3);
      put(el, prism(P, front, r, i, RZ, RZ + RT));
    }
  }

  const tw = tween(REST);
  let drawn = NaN;
  const B = register(stage, (_dt, now) => {
    const a = tval(tw, now);
    if (a !== drawn) { drawn = a; draw(a); }
    return !tdone(tw, now);
  });
  bag.add(B.unregister);

  /** The side the pointer asks for: its left-right place on the ground plane, which never moves, is where the near corner goes. */
  function side([sx, sy]) {
    const [x, y] = unproj(C, sx, sy, 0);
    return clamp(SQ + Math.round((x - y) / U / step) * step, A0, A1);
  }

  function choose() {
    const a = over ? side(over) : REST, square = !!over && a === SQ;
    tset(tw, a, performance.now(), 0);
    for (const { el } of items) el.sil.classList.toggle("hi", square || el === handle);
    read.textContent = over ? `${num(a)} × ${num(SUM - a)}: area ${num(a * (SUM - a))}${square ? " (biggest)" : ""}` : "rest";
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
  name: "pen",
  means: "One length of fence makes the pen: stretch one side and the other shrinks, and the ground inside is biggest when the pen is square.",
  rules: [1, 4, 6, 8],
  range: [0.5, 1, 2],
  tour: [[200, 193], [271, 193], [164, 193], null],
  mount,
};
