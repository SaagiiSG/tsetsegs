import { HL } from './kernel.js';

/**
 * Cubes: eight unit cubes on a build plate, snapping together into powers of
 * two. The pointer's height on the stage sets the power n, from 0 at the
 * bottom to 3 at the top: one cube, then a row of two, a square of four, a
 * cube of eight. Cubes that join fall in and grow into their slots; cubes
 * that leave lift and shrink away, last in first out, on the 700ms curve.
 * The newest cubes of the power take the bright stroke. At rest the square of
 * four sits on the plate and the next layer hovers above it, about to land.
 * The slider is the stagger between cubes, in ms.
 *
 * The pattern: discrete items. The power is a choice, so tweens; the hit test
 * is four fixed bands of screen height, which nothing drawn can move.
 */
const {
  Cam, clamp, facing, fit, prism, proj, rings, tdone, tset, tval, tween,
  disposer, mk, pointer, put, register, solid,
} = HL;

const U = 30, GAP = 5, Q = U + GAP, E = 2 * U + GAP, M = 7, PB = 4, R = 5, B = 1.8, DROP = 18;
// rest: the square of four on the plate, the next layer hovering over it, tilted so its front corner lands first
const HOV = [0, 0, 0, 0, 26, 21, 23, 19];
const SUP = "⁰¹²³";
/** The power at which cube i joins: 0 for the first, 1 for the second, 2 for the next two, 3 for the top four. */
const lvl = (i) => Math.ceil(Math.log2(i + 1));

function mount({ stage, svg, read }, value) {
  const bag = disposer();
  let stag = value;

  // Fitted to the plate and the highest hovering cube, the most extreme pose.
  const C = Cam(45, 0.5, 1.85);
  fit(C, [[-M, -M, -PB], [E + M, E + M, -PB], [E + M, -M, -PB], [-M, E + M, -PB], [0, 0, E + 26], [U, U, E + 26]], 200, 166);
  const P = proj(C), front = facing(C);

  const g = mk("g", {}, svg);
  const [pr, pi] = rings(-M, -M, E + M, E + M, 8, 2);
  put(solid(g), prism(P, front, pr, pi, -PB, 0));
  const box = mk("g", {}, g);

  // Cube i sits in slot (i & 1, i >> 1 & 1, i >> 2): x first, then y, then up.
  const cubes = [];
  for (let i = 0; i < 8; i++) {
    const x = (i & 1) * Q + U / 2, y = ((i >> 1) & 1) * Q + U / 2, z = (i >> 2) * Q;
    cubes.push({ i, x, y, z, a: tween(1), h: tween(HOV[i]), el: solid(box), da: NaN, dh: NaN, key: 0 });
  }
  cubes[7].el.sil.classList.add("hi");

  let seq = "";
  const loop = register(stage, (_dt, now) => {
    let moving = false, moved = false;
    for (const c of cubes) {
      const a = tval(c.a, now), h = tval(c.h, now);
      if (!tdone(c.a, now) || !tdone(c.h, now)) moving = true;
      if (a === c.da && h === c.dh) continue;
      c.da = a; c.dh = h; moved = true;
      if (a < 0.12) continue;
      // grows about its centre, which falls DROP into the slot as it arrives
      const s = (a * U) / 2, cz = c.z + U / 2 + (1 - a) * DROP + h;
      const [ring, inner] = rings(c.x - s, c.y - s, c.x + s, c.y + s, R * a, B * a);
      put(c.el, prism(P, front, ring, inner, cz - s, cz + s));
      c.key = c.x + c.y + cz;
    }
    if (moved) {
      // Painted back to front by x + y + z of the centres, now, as cubes fall past each other; hidden cubes leave the svg.
      const vis = cubes.filter((c) => c.da >= 0.12).sort((p, q) => p.key - q.key);
      const s = vis.map((c) => c.i).join();
      if (s !== seq) {
        seq = s;
        cubes.forEach((c) => c.el.g.remove());
        vis.forEach((c) => box.append(c.el.g));
      }
    }
    return moving;
  });
  bag.add(loop.unregister);

  // Four bands of screen height, from the top of the full cube to its nearest foot. They never move.
  const yT = P(0, 0, E)[1], yB = P(E, E, 0)[1], bh = (yB - yT) / 4;
  const band = (y) => clamp(3 - Math.floor((y - yT) / bh), 0, 3);

  let n = -1;
  /** Sets the power m (-1 is rest). Changes spread from the frontier: joining cubes in build order, leaving ones last in first out. */
  function choose(m) {
    if (m === n) return;
    const now = performance.now(), c0 = n < 0 ? 8 : 1 << n, c1 = m < 0 ? 8 : 1 << m, f = c1 > c0 ? c0 : c0 - 1;
    n = m;
    cubes.forEach((c, i) => {
      const d = Math.abs(i - f) * stag;
      tset(c.a, i < c1 ? 1 : 0, now, d);
      tset(c.h, m < 0 ? HOV[i] : 0, now, d);
      c.el.sil.classList.toggle("hi", m < 0 ? i === 7 : lvl(i) === m);
    });
    read.textContent = m < 0 ? "rest" : `2${SUP[m]} = ${c1}`;
    loop.wake();
  }
  read.textContent = "rest";

  bag.add(pointer(stage, { move: (p) => choose(band(p[1])), leave: () => choose(-1) }));
  bag.add(() => svg.replaceChildren());

  return {
    set: (v) => { stag = v; },
    destroy: bag.dispose,
  };
}

export default {
  name: "cubes",
  means: "Unit cubes snap together in powers of two: raise the pointer and one cube becomes two, then four, then eight.",
  rules: [1, 4, 5, 8],
  range: [0, 45, 90],
  tour: [[212, 203], [190, 155], [206, 108], null],
  mount,
};
