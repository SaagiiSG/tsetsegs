import { HL } from './kernel.js';

/**
 * Coupler: two boxcars on a short straight track, two clauses, and the joint
 * between them is the punctuation. Which side of the stage the pointer is on
 * picks the joint: over the first car a lone hook (a comma) and the second
 * car rolls away from it; over the joint a double coupler (a semicolon) and
 * the two hold as one train; over the second car buffers come out (a period)
 * and the cars stand apart, steady. At rest the double coupler holds, lit.
 * The slider is how far the second car drifts on a comma splice.
 *
 * The pattern: a discrete choice, so tweens; the joint moves first and the
 * cars a step after it. The hit test is three fixed bands of screen x round
 * the resting joint, which no rolling car can shift. The track is turned 30°
 * off the grid: square to it, the near car hides the joint.
 */
const {
  Cam, clamp, facing, fit, open, poly, prism, proj, rad, rings, rrect, seg,
  tdone, tset, tval, tween, disposer, mk, pointer, put, register, solid,
} = HL;

const PHI = rad(-30), CO = Math.cos(PHI), SI = Math.sin(PHI);
// t runs along the track, c across it (+c is the near side), z up; the joint is t = 0
const LA = 62, LB = 54, W = 28, Z0 = 12, Z1 = 44, G = 16, DMAX = 38, PART = 9;
const ZC = 17, ZU = 27, ZB = 21, BR = 4, BX = 7, RC = 11, WR = 5;
const T0 = -(G / 2 + LA + PART + 6), T1 = G / 2 + LB + DMAX + 6;
const WHEELS = [7, 19, -19, -7];
// the comma's hook: out from the face, then curled down and back under itself
const HOOK = [[0, 0], [9, 0]];
for (let a = 45; a >= -130; a -= 35) HOOK.push([9 + 5 * Math.cos(rad(a)), -5 + 5 * Math.sin(rad(a))]);
const NONE = { sil: "", crease: "" }, SC = 1.85;
const READ = ["comma splice", "; joins two", ". two sentences"];

function mount({ stage, svg, read }, value) {
  const bag = disposer();
  let D = clamp(value, 0, DMAX);

  const C = Cam(45, 0.5, SC);
  const w3 = (t, c, z) => [t * CO - c * SI, t * SI + c * CO, z];
  // fitted to the whole track and the cars' roofs at their farthest: A parted left, B drifted right
  fit(C, [w3(T0, -17, 0), w3(T0, 17, 0), w3(T1, -17, 0), w3(T1, 17, 0), w3(T0 + 6, -W / 2, Z1), w3(T1 - 6, -W / 2, Z1)], 200, 166);
  const P = proj(C), front = facing(C);
  // everything is built in track coordinates and turned on the way to the screen
  const Pr = (t, c, z) => P(t * CO - c * SI, t * SI + c * CO, z);
  const fr = (q) => front({ u: q.u * CO - q.v * SI, v: q.u * SI + q.v * CO, nu: q.nu * CO - q.nv * SI, nv: q.nu * SI + q.nv * CO });
  const box = (t0, t1, c0, c1, z0, z1, r, b) => { const [ring, inner] = rings(t0, c0, t1, c1, r, b); return prism(Pr, fr, ring, inner, z0, z1); };
  /** A round outline of radius r, from a map of its two in-plane offsets to the screen. */
  const disc = (f, r, n) => { const pts = []; for (let k = 0; k < n; k++) pts.push(f(r * Math.cos((k / n) * 2 * Math.PI), r * Math.sin((k / n) * 2 * Math.PI))); return poly(pts); };
  // a buffer's domed head is round from any side, so it is a circle on the screen
  const ball = ([x, y], r) => disc((u, v) => [x + u, y + v], r, 16);

  // the track, which never moves: sleepers flat on the ground, then the far rail and the near one
  const g = mk("g", {}, svg);
  for (let t = T0 + 5; t <= T1 - 4; t += 12) mk("path", { d: poly(rrect(t - 2.5, -17, t + 2.5, 17, 1.2, 3).map((q) => Pr(q.u, q.v, 0))), class: "lo" }, g);
  for (const c of [-RC, RC]) put(solid(g), box(T0, T1, c - 1.5, c + 1.5, 0, 3, 1.5, 0.6));

  /** A boxcar: near wheels, then the body over them, then the sliding door on its near side. */
  function car(L) {
    const grp = mk("g", {}, g);
    const wheels = WHEELS.map(() => [mk("path", { class: "sil" }, grp), mk("path", { class: "nf lo" }, grp)]);
    return { L, wheels, body: solid(grp), door: mk("path", { class: "nf lo" }, grp) };
  }
  function drawCar(cr, t0) {
    cr.wheels.forEach(([rim, hub], i) => {
      const tc = t0 + (WHEELS[i] < 0 ? cr.L + WHEELS[i] : WHEELS[i]), f = (a, b) => Pr(tc + a, RC + 1.5, 3 + WR + b);
      rim.setAttribute("d", disc(f, WR, 16));
      hub.setAttribute("d", disc(f, 1.6, 8));
    });
    put(cr.body, box(t0, t0 + cr.L, -W / 2, W / 2, Z0, Z1, 4, 1.6));
    const m = t0 + cr.L / 2;
    cr.door.setAttribute("d", poly(rrect(m - 10, Z0 + 4, m + 10, Z1 - 4, 1.5, 3).map((q) => Pr(q.u, W / 2, q.v))));
  }

  // back to front: car A, A's half of the joint, B's half, car B
  const A = car(LA);
  const J = mk("g", {}, g);
  const barsA = [solid(J), solid(J)], hook = mk("path", { class: "nf" }, J);
  // one buffer on each face: A's stalk is behind its head, B's in front of it
  const bufA = { stalk: mk("path", { class: "nf" }, J), pad: mk("path", { class: "sil" }, J) };
  const bufB = { pad: mk("path", { class: "sil" }, J), stalk: mk("path", { class: "nf" }, J) };
  const barsB = [solid(J), solid(J)];
  const B = car(LB);

  function drawJoint(fa, fb, s, k, b) {
    // the double coupler: two arms of fixed length out of each face, meeting mid-gap only when the cars sit G apart
    const h = (s * G) / 2;
    [ZC, ZU].forEach((z, i) => {
      put(barsA[i], h > 0.4 ? box(fa - 1, fa + h, -2.5, 2.5, z - 2.5, z + 2.5, 1.2, 0.7) : NONE);
      put(barsB[i], h > 0.4 ? box(fb - h, fb + 1, -2.5, 2.5, z - 2.5, z + 2.5, 1.2, 0.7) : NONE);
    });
    hook.setAttribute("d", k > 0.03 ? open(HOOK.map(([dt, dz]) => Pr(fa + dt * k, 0, ZC + dz * k))) : "");
    const r = BR * b, x = BX * b;
    for (const [p, f, dir] of [[bufA, fa, 1], [bufB, fb, -1]]) {
      const tp = f + dir * x;
      p.stalk.setAttribute("d", b > 0.05 ? seg(Pr(f, 0, ZB), Pr(tp, 0, ZB)) : "");
      p.pad.setAttribute("d", b > 0.05 ? ball(Pr(tp, 0, ZB), r * SC) : "");
    }
  }

  const tw = { s: tween(1), k: tween(0), b: tween(0), a: tween(0), o: tween(0) };
  let last = "";
  const loop = register(stage, (_dt, now) => {
    const v = {};
    let moving = false;
    for (const key in tw) { v[key] = tval(tw[key], now); if (!tdone(tw[key], now)) moving = true; }
    const sig = [v.s, v.k, v.b, v.a, v.o].join();
    if (sig !== last) {
      last = sig;
      const fa = -G / 2 + v.a, fb = G / 2 + v.o;
      drawCar(A, fa - LA);
      drawJoint(fa, fb, v.s, v.k, v.b);
      drawCar(B, fb);
    }
    return moving;
  });
  bag.add(loop.unregister);

  let cur = null;
  /** Picks the joint: 0 comma, 1 semicolon, 2 period, -1 rest. The joint goes first, the cars one step after. */
  function choose(m, force) {
    if (m === cur && !force) return;
    cur = m;
    const now = performance.now(), step = 50;
    tset(tw.s, m < 0 || m === 1 ? 1 : 0, now, 0);
    tset(tw.k, m === 0 ? 1 : 0, now, 0);
    tset(tw.b, m === 2 ? 1 : 0, now, 0);
    tset(tw.a, m === 2 ? -PART : 0, now, step);
    tset(tw.o, m === 0 ? D : m === 2 ? PART : 0, now, step);
    // one highlight: the coupler at rest; the coupled train, the hook, or the buffers when chosen
    barsA.concat(barsB).forEach((el) => el.sil.classList.toggle("hi", m < 0 || m === 1));
    [A, B].forEach((cr) => cr.body.sil.classList.toggle("hi", m === 1));
    hook.classList.toggle("hi", m === 0);
    [bufA, bufB].forEach((p) => p.pad.classList.toggle("hi", m === 2));
    read.textContent = m < 0 ? "rest" : READ[m];
    loop.wake();
  }

  // three bands of screen x round the resting joint; nothing drawn can move them
  const jx = Pr(0, 0, ZC)[0], HB = 24;
  const pick = ([x]) => (x < jx - HB ? 0 : x > jx + HB ? 2 : 1);
  choose(-1);

  bag.add(pointer(stage, { move: (p) => choose(pick(p)), leave: () => choose(-1) }));
  bag.add(() => svg.replaceChildren());

  return {
    set: (v) => { D = clamp(v, 0, DMAX); if (cur === 0) choose(cur, true); },
    destroy: bag.dispose,
  };
}

export default {
  name: "coupler",
  means: "Two boxcars are two clauses and the joint is the punctuation: a lone hook lets one drift, a double coupler holds, buffers part them.",
  rules: [1, 4, 5, 6],
  range: [14, 26, 38],
  tour: [[112, 139], [183, 152], [244, 157], null],
  mount,
};
