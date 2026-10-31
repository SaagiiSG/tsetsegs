import { HL } from './kernel.js';

/**
 * Stacks: two stacks of thin slabs side by side on a board. The pointer's
 * screen x is time t, from 0 on the left to 4 on the right: the left stack
 * holds 1 + t slabs, the right one 2^t. Slabs that join swell up from the top
 * of their stack and lift the ones above; slabs that leave flatten away, last
 * in first out, on the 700ms curve, staggered out from the stack's top. Five
 * dots in front of the stacks are the steps; the one for t is medium. The
 * doubling stack's top slab takes the bright stroke. At rest it is t 4: five
 * slabs beside sixteen. The slider is the stagger between slabs, in ms.
 *
 * The pattern: discrete items. t is a choice, so tweens; the hit test is five
 * fixed bands of screen x, centred on the dots, which nothing drawn moves.
 */
const {
  Cam, clamp, facing, fit, prism, proj, rings, tdone, tset, tval, tween,
  disposer, flatDot, mk, place, pointer, put, register, solid,
} = HL;

const W = 38, G = 48, T = 6, R = 5, B = 1.4, M = 12, PB = 4, E = G + W + M, ROW = 134, REST = 4;
// linear on the left (small x, large y), doubling on the right: the same depth, so neither hides the other
const STACKS = [{ x: 0, y: G, count: (t) => 1 + t }, { x: G, y: 0, count: (t) => 2 ** t }];

function mount({ stage, svg, read }, value) {
  const bag = disposer();
  let stag = value;

  // Fitted to the board and the full doubling stack, which is also the rest pose.
  const C = Cam(45, 0.5, 1.75);
  fit(C, [[-M, -M, -PB], [E, E, -PB], [E, -M, -PB], [-M, E, -PB], [G, 0, 16 * T]], 200, 166);
  const P = proj(C), front = facing(C);

  const g = mk("g", {}, svg);
  const [br, bi] = rings(-M, -M, E, E, 10, 2);
  put(solid(g), prism(P, front, br, bi, -PB, 0));

  // The five steps: a row of dots in front of the stacks, level on screen, from under the left stack to under the right.
  const dotAt = (i) => { const d = (i - 2) * (G / 2); return P((ROW + d) / 2, (ROW - d) / 2, 0); };
  const dots = [0, 1, 2, 3, 4].map((i) => { const el = flatDot(g, C, 1.8, i === REST ? "dot m" : "dot off"); place(el, dotAt(i)); return el; });

  // Slabs bottom to top, each its own solid, so a higher one covers the one under it.
  const stacks = STACKS.map((s) => {
    const [ring, inner] = rings(s.x, s.y, s.x + W, s.y + W, R, B);
    const slabs = [];
    for (let k = 0; k < s.count(4); k++) slabs.push({ el: solid(g), a: tween(k < s.count(REST) ? 1 : 0), dz: NaN, dh: NaN });
    return { ...s, ring, inner, slabs };
  });
  const top = (t) => stacks[1].count(t) - 1;
  stacks[1].slabs[top(REST)].el.sil.classList.add("hi");

  const loop = register(stage, (_dt, now) => {
    let moving = false;
    for (const st of stacks) {
      let z = 0;
      for (const sl of st.slabs) {
        const h = T * tval(sl.a, now);
        if (!tdone(sl.a, now)) moving = true;
        if (h !== sl.dh || z !== sl.dz) {
          sl.dh = h; sl.dz = z;
          // a flattened slab is not drawn
          put(sl.el, h < 0.3 ? { sil: "", crease: "" } : prism(P, front, st.ring, st.inner, z, z + h));
        }
        z += h;
      }
    }
    return moving;
  });
  bag.add(loop.unregister);

  // Five bands of screen x, centred on the dots. They never move.
  const x0 = dotAt(0)[0], step = dotAt(1)[0] - x0;
  const band = (x) => clamp(Math.round((x - x0) / step), 0, 4);

  let t = -1;
  /** Sets time m (-1 is rest, which is t 4). Each stack changes from its top: joining slabs bottom first, leaving ones top first. */
  function choose(m) {
    if (m === t) return;
    const now = performance.now(), from = t < 0 ? REST : t, to = m < 0 ? REST : m;
    t = m;
    for (const st of stacks) {
      const c0 = st.count(from), c1 = st.count(to), f = c1 > c0 ? c0 : c0 - 1;
      st.slabs.forEach((sl, k) => tset(sl.a, k < c1 ? 1 : 0, now, Math.abs(k - f) * stag));
    }
    stacks[1].slabs.forEach((sl, k) => sl.el.sil.classList.toggle("hi", k === top(to)));
    dots.forEach((el, i) => { el.classList.toggle("m", i === to); el.classList.toggle("off", i !== to); });
    read.textContent = m < 0 ? "rest" : `t ${m}: ${1 + m} vs ${2 ** m}`;
    loop.wake();
  }
  read.textContent = "rest";

  bag.add(pointer(stage, { move: (p) => choose(band(p[0])), leave: () => choose(-1) }));
  bag.add(() => svg.replaceChildren());

  return {
    set: (v) => { stag = v; },
    destroy: bag.dispose,
  };
}

export default {
  name: "stacks",
  means: "One stack gains a slab each step, the other doubles: move left to right through time and watch doubling pull ahead.",
  rules: [1, 2, 4, 8],
  range: [0, 40, 80],
  tour: [[171, 200], [200, 200], [259, 200], null],
  mount,
};
