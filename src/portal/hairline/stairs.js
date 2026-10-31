import { HL } from './kernel.js';

/**
 * Stairs: a flight of five equal steps climbing across a plate, away to the
 * upper right. The pointer aims the flight: point higher and every step rises
 * by the same larger amount, lower and the flight flattens, snapping to one,
 * two or three units per step. The steps move one after another, outwards
 * from the step under the pointer, which takes the bright stroke. At rest the
 * flight climbs two units a step and its top step is bright.
 * The slider is the stagger between steps, in ms.
 *
 * The pattern: a discrete choice. Tweens, a stagger by distance, and a hit
 * test on the stair's middle plane, which never moves: the rise is the line
 * through the tread centres that passes nearest the pointer.
 */
const {
  Cam, clamp, facing, fit, prism, proj, rings, tdone, tset, tval, tween,
  disposer, mk, pointer, put, register, solid,
} = HL;

const N = 5, RUN = 22, WD = 66, H = 7, R = 4, B = 1.6, M = 9, PB = 4, PR = 9, REST = 2, MAX = 3;

function mount({ stage, svg, read }, value) {
  const bag = disposer();
  let stag = value;

  // Fitted to the plate and the top step at its steepest, the most extreme pose.
  const X0 = -M, X1 = WD + M, Y0 = -N * RUN - M, Y1 = M, TOP = N * MAX * H;
  const C = Cam(45, 0.5, 1.6);
  fit(C, [[X0, Y0, -PB], [X1, Y1, -PB], [X1, Y0, -PB], [X0, Y1, -PB], [0, -N * RUN, TOP], [WD, -N * RUN, TOP]], 200, 166);
  const P = proj(C), front = facing(C);

  const g = mk("g", {}, svg);
  const [pr, pi] = rings(X0, Y0, X1, Y1, PR, 2);
  put(solid(g), prism(P, front, pr, pi, -PB, 0));

  // Step i stands on y from -(i + 1)·RUN to -i·RUN. The top step is farthest, so the flight is painted top down.
  const steps = [];
  for (let i = N - 1; i >= 0; i--) {
    const [ring, inner] = rings(0, -(i + 1) * RUN, WD, -i * RUN, R, B);
    steps[i] = { ring, inner, el: solid(g), r: tween(REST), dr: NaN };
  }

  const loop = register(stage, (_dt, now) => {
    let moving = false;
    steps.forEach((s, i) => {
      const r = tval(s.r, now);
      if (!tdone(s.r, now)) moving = true;
      if (r === s.dr) return;
      s.dr = r;
      put(s.el, prism(P, front, s.ring, s.inner, 0, (i + 1) * r * H));
    });
    return moving;
  });
  bag.add(loop.unregister);

  // The pointer read on the stair's middle plane, x = WD / 2, which nothing moves: [y, z] from the screen point.
  const o = P(WD / 2, 0, 0), py = P(WD / 2, 1, 0), pz = P(WD / 2, 0, 1);
  const ey = [py[0] - o[0], py[1] - o[1]], ez = [pz[0] - o[0], pz[1] - o[1]], det = ey[0] * ez[1] - ey[1] * ez[0];
  /** [rise, step]: the rise whose line through the tread centres, pivoting half a run before the first step, passes nearest the pointer; then the step whose tread, at that rise, is nearest it on screen. */
  function hit([sx, sy]) {
    const qx = sx - o[0], qy = sy - o[1];
    const y = (qx * ez[1] - qy * ez[0]) / det, z = (ey[0] * qy - ey[1] * qx) / det;
    const r = clamp(Math.round((z * RUN) / (Math.max(RUN / 2 - y, RUN / 2) * H)), 1, MAX);
    let a = 0, best = Infinity;
    for (let i = 0; i < N; i++) {
      const t = P(WD / 2, -(i + 0.5) * RUN, (i + 1) * r * H), d = (t[0] - sx) ** 2 + (t[1] - sy) ** 2;
      if (d < best) { best = d; a = i; }
    }
    return [r, a];
  }

  let cur = 0, lit = 0;
  /** Sets rise m on every step (-1 is rest), staggered outwards from step a, or from the step let go. */
  function choose(m, a) {
    const k = m < 0 ? N - 1 : a;
    if (m === cur && k === lit) return;
    const now = performance.now(), from = m < 0 ? lit : a;
    steps.forEach((s, i) => tset(s.r, m < 0 ? REST : m, now, Math.abs(i - from) * stag));
    steps[lit].el.sil.classList.remove("hi");
    steps[k].el.sil.classList.add("hi");
    cur = m; lit = k;
    read.textContent = m < 0 ? "rest" : `+${m} per step`;
    loop.wake();
  }
  choose(-1, -1);

  bag.add(pointer(stage, { move: (p) => choose(...hit(p)), leave: () => choose(-1, -1) }));
  bag.add(() => svg.replaceChildren());

  return {
    set: (v) => { stag = v; },
    destroy: bag.dispose,
  };
}

export default {
  name: "stairs",
  means: "A flight of five equal steps: point higher or lower and every step rises by the same new amount.",
  rules: [1, 2, 5, 8],
  range: [0, 45, 90],
  tour: [[175, 205], [225, 180], [250, 61], null],
  mount,
};
