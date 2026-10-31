import { HL } from './kernel.js';

/**
 * Coins: a stack of ten coins on a small square tray, inside a dashed ghost of the
 * full stack. The pointer's height on the stack is the discount, in 10% steps:
 * the coin under it and every coin above lift off and drift aside, shrinking
 * away, staggered down from the top on the 700ms curve. What stays is the
 * percent left, and the top coin left takes the bright stroke. At rest eight
 * stand and the top two are on their way off. The slider is the stagger, in ms.
 *
 * The pattern: discrete items. The discount is a choice, so tweens; the hit
 * test is ten fixed bands of screen height along the full stack's front, which
 * nothing drawn can move.
 */
const {
  Cam, circ, clamp, facing, fit, hull, open, poly, prism, proj, ringAt, rings, run,
  tdone, tset, tval, tween, disposer, mk, pointer, put, register, solid,
} = HL;

const N = 10, R = 24, T = 5, RB = 2.6, M = 33, PB = 4, LIFT = 42, DX = 52, H = N * T, S = 2.2;
// rest: eight coins stand; the top two hover above their empty place in the ghost, the higher one further along
const REST = [0, 0, 0, 0, 0, 0, 0, 0, 0.38, 0.62], KEEP = 8;
const UNIT = circ(1, 72);

/** Coin i, a share o of the way off (0 on the stack, 1 gone): it rises and drifts to screen right, then shrinks away. */
function pose(i, o) {
  return { a: (DX * o) / Math.SQRT2, zc: (i + 0.5) * T + LIFT * o, s: clamp((1 - o) / 0.4, 0, 1) };
}

function mount({ stage, svg, read }, value) {
  const bag = disposer();
  let stag = value;

  // Fitted to the tray, the ghost's top, and the top coin along its way off, the most extreme pose.
  const C = Cam(45, 0.5, S), q = R / Math.SQRT2, ext = [];
  for (const o of [0.55, 0.7, 0.85]) {
    const { a, zc, s } = pose(N - 1, o), zt = zc + (T * s) / 2;
    ext.push([a - q * s, -a - q * s, zt], [a + q * s, -a - q * s, zt]);
  }
  fit(C, [[-M, M, -PB], [M, -M, -PB], [M, M, -PB], [-q, -q, H], ...ext], 200, 166);
  const P = proj(C), front = facing(C);

  const g = mk("g", {}, svg);
  put(solid(g), prism(P, front, ...rings(-M, -M, M, M, 10, 2), -PB, 0));
  // the full stack's ghost, a dashed guide behind the coins
  const G = circ(R, 72);
  mk("path", { d: poly(hull(ringAt(P, G, 0).concat(ringAt(P, G, H)))) + open(ringAt(P, run(G, front), H)), class: "nf dash" }, g);
  const box = mk("g", {}, g);

  const coins = REST.map((o, i) => ({ i, o: tween(o), el: solid(box), d: NaN, z: 0 }));
  coins[KEEP - 1].el.sil.classList.add("hi");

  /** A ring of radius r round the coin's centre, slid a along screen right, at height z. */
  const at = (r, z, a) => UNIT.map((u) => P(a + r * u.u, -a + r * u.v, z));
  let seq = "";
  const B = register(stage, (_dt, now) => {
    let moving = false, moved = false;
    for (const cn of coins) {
      const o = tval(cn.o, now);
      if (!tdone(cn.o, now)) moving = true;
      if (o === cn.d) continue;
      cn.d = o; moved = true;
      const { a, zc, s } = pose(cn.i, o), z0 = zc - (T * s) / 2, z1 = zc + (T * s) / 2;
      cn.z = zc;
      // a coin is its edge's silhouette and, on its face, the raised rim
      put(cn.el, s < 0.12 ? { sil: "", crease: "" } : {
        sil: poly(hull(at(R * s, z0, a).concat(at(R * s, z1, a)))),
        crease: poly(at((R - RB) * s, z1, a)),
      });
    }
    if (moved) {
      // painted bottom to top by height, now: a coin drifts along screen x, so height alone orders them
      const sorted = coins.slice().sort((p, r) => p.z - r.z), key = sorted.map((cn) => cn.i).join();
      if (key !== seq) { seq = key; sorted.forEach((cn) => box.append(cn.el.g)); }
    }
    return moving;
  });
  bag.add(B.unregister);

  // Ten bands of screen height, one per coin of the full stack, measured on its front edge. They never move.
  const y0 = P(q, q, 0)[1], bh = y0 - P(q, q, T)[1];
  const level = (y) => clamp(Math.floor((y0 - y) / bh), 1, N);

  let n = -1;
  /** Keeps m coins and takes the rest off (-1 is rest). Changes spread from the stack's top: leaving coins top first, returning ones bottom first. */
  function choose(m) {
    if (m === n) return;
    const now = performance.now(), c0 = n < 0 ? KEEP : n, c1 = m < 0 ? KEEP : m, f = c1 > c0 ? c0 : c0 - 1;
    n = m;
    coins.forEach((cn, i) => {
      tset(cn.o, m < 0 ? REST[i] : i < c1 ? 0 : 1, now, Math.abs(i - f) * stag);
      cn.el.sil.classList.toggle("hi", i === c1 - 1);
    });
    const k = N - c1;
    read.textContent = m < 0 ? "rest" : k === 0 ? "−0%" : `−${k * 10}%: ` + (2 * k === N ? "half" : c1 + " left");
    B.wake();
  }
  read.textContent = "rest";

  bag.add(pointer(stage, { move: (p) => choose(level(p[1])), leave: () => choose(-1) }));
  bag.add(() => svg.replaceChildren());

  return {
    set: (v) => { stag = v; },
    destroy: bag.dispose,
  };
}

export default {
  name: "coins",
  means: "A stack of ten coins: point at one and it lifts off with every coin above it; the coins left are the percent that stays.",
  rules: [1, 2, 5, 8],
  range: [0, 45, 90],
  tour: [[191, 167], [191, 196], [191, 126], null],
  mount,
};
