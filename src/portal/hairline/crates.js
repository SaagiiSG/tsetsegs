import { HL } from './kernel.js';

/**
 * Crates: three open crates nested on a plate, a small block, x, at the core.
 * The pointer reaches in: over a layer, every crate outside it opens, so the
 * layer it points at is the outermost left. Opened crates lift off and shrink
 * away, staggered from the outside in; closing puts them back inside out. Each
 * crate is one undo of 3x + 4 = 19: point at x and it stands alone, x = 5.
 * At rest the outer crate hovers part way off and x holds the bright stroke.
 * The slider is the stagger between crates, in ms.
 *
 * The pattern: discrete items. How many layers open is a choice, so tweens;
 * the hit test unprojects onto each layer's resting rim, which nothing moves.
 */
const {
  Cam, facing, fit, hull, open, poly, prism, proj, ringAt, rings, rrect, run, unproj,
  tdone, tset, tval, tween, disposer, mk, pointer, put, register, solid,
} = HL;

// crates outside in: half-width, height, corner radius
const CR = [[52, 32, 7], [36, 26, 6], [21, 21, 5]];
const XC = 10, XH = 26, T = 3, M = 8, PB = 4, LIFT = 50, HOV = 20;
const READ = ["3x + 4 = 19", "step 1 of 3: subtract 4", "step 2 of 3: divide by 3", "x = 5"];

/** A run of points ordered left to right on screen. */
const LR = (pts) => (pts[0][0] <= pts[pts.length - 1][0] ? pts : pts.slice().reverse());

/** One crate of half-width w and height h, its foot at z0, scaled by s about its axis: `far` paints before what it holds, `near` after. */
function crate(P, front, w, h, r, z0, s) {
  const W = w * s, t = T * s, z1 = z0 + h * s;
  const outer = rrect(-W, -W, W, W, r * s, 6), inner = rrect(-W + t, -W + t, W - t, W - t, (r - T + 1) * s, 6);
  const iF = LR(ringAt(P, run(inner, front), z1)), oT = LR(ringAt(P, run(outer, front), z1)), oB = LR(ringAt(P, run(outer, front), z0));
  // a hand-hole near the top of each near face
  const hole = rrect(-9 * s, z1 - 9 * s, 9 * s, z1 - 4.5 * s, 2.2 * s, 4);
  return {
    far: [
      poly(hull(ringAt(P, outer, z0).concat(ringAt(P, outer, z1)))),
      poly(ringAt(P, inner, z1)),
      open(ringAt(P, run(inner, (q) => !front(q)), z0)),
    ],
    near: [
      poly([...iF, oT[oT.length - 1], ...oB.slice().reverse(), oT[0]]),
      open(oT),
      open(iF),
      open([oT[0], ...oB, oT[oT.length - 1]]),
      poly(hole.map((q) => P(W, q.u, q.v))) + poly(hole.map((q) => P(q.u, W, q.v))),
    ],
  };
}
const FAR = ["sil", "nf", "nf lo"], NEAR = ["fo", "nf lo", "nf", "nf sil", "nf lo"];

function mount({ stage, svg, read }, value) {
  const bag = disposer();
  let stag = value;

  // Fitted to the plate and the outer crate hovering at rest, its highest pose.
  const C = Cam(45, 0.5, 1.8), PW = CR[0][0] + M, TOP = CR[0][1] + HOV;
  fit(C, [[-PW, -PW, -PB], [PW, PW, -PB], [PW, -PW, -PB], [-PW, PW, -PB], [-CR[0][0], -CR[0][0], TOP], [CR[0][0], -CR[0][0], TOP]], 200, 166);
  const P = proj(C), front = facing(C);

  const g = mk("g", {}, svg);
  const [pr, pi] = rings(-PW, -PW, PW, PW, 9, 2);
  put(solid(g), prism(P, front, pr, pi, -PB, 0));
  const box = mk("g", {}, g);

  const core = solid(box);
  const [xr, xi] = rings(-XC, -XC, XC, XC, 3, 1.4);
  put(core, prism(P, front, xr, xi, 0, XH));
  core.sil.classList.add("hi");

  const crates = CR.map(([w, h, r], k) => {
    const far = mk("g", {}, box), near = mk("g", {}, box);
    return {
      w, h, r, far, near, a: tween(0), z: tween(k ? 0 : HOV), da: NaN, dz: NaN, s: 1,
      fp: FAR.map((cls) => mk("path", { class: cls }, far)), np: NEAR.map((cls) => mk("path", { class: cls }, near)),
    };
  });
  const hiOf = (k) => (k === 3 ? [core.sil] : [crates[k].fp[0], crates[k].np[3]]);

  /** Paint order, outside in: a crate still round what it holds paints in two halves about it; one lifted clear and shrunk paints after it. */
  let seq = [];
  function order() {
    let s = [core.g];
    for (let k = 2; k >= 0; k--) {
      const c = crates[k];
      if (c.s < 0.12) continue;
      const held = k === 2 ? XC : CR[k + 1][0];
      s = c.s * (c.w - T) >= held ? [c.far, ...s, c.near] : [...s, c.far, c.near];
    }
    if (s.length !== seq.length || s.some((el, i) => el !== seq[i])) { seq = s; box.replaceChildren(...s); }
  }

  const loop = register(stage, (_dt, now) => {
    let moving = false;
    for (const c of crates) {
      const a = tval(c.a, now), z = tval(c.z, now);
      if (!tdone(c.a, now) || !tdone(c.z, now)) moving = true;
      if (a === c.da && z === c.dz) continue;
      c.da = a; c.dz = z;
      // it lifts first and shrinks late, so it is clear of what it held before it is smaller than it
      c.s = 1 - a * a * a;
      if (c.s < 0.12) continue;
      const q = crate(P, front, c.w, c.h, c.r, a * LIFT + z, c.s);
      q.far.forEach((d, i) => c.fp[i].setAttribute("d", d));
      q.near.forEach((d, i) => c.np[i].setAttribute("d", d));
    }
    order();
    return moving;
  });
  bag.add(loop.unregister);

  // Each layer is tested on its own resting rim, innermost first; the outer crate on its whole closed-to-hovering silhouette.
  const within = (p, z, w) => { const [x, y] = unproj(C, p[0], p[1], z); return Math.max(Math.abs(x), Math.abs(y)) <= w; };
  function hit(p) {
    if (within(p, XH, XC + 4)) return 3;
    if (within(p, CR[2][1], CR[2][0] + 1)) return 2;
    if (within(p, CR[1][1], CR[1][0] + 1)) return 1;
    for (let z = 0; z <= TOP; z += 4) if (within(p, z, CR[0][0] + 3)) return 0;
    return -1;
  }

  let n = -1;
  /** Opens the m crates outside layer m (-1 is rest). Opening spreads outside in; closing, inside out. */
  function choose(m) {
    if (m === n) return;
    const now = performance.now(), o0 = Math.max(n, 0), o1 = Math.max(m, 0), from = o1 > o0 ? o0 : Math.max(o0 - 1, 0);
    hiOf(n < 0 ? 3 : n).forEach((el) => el.classList.remove("hi"));
    n = m;
    crates.forEach((c, k) => {
      const d = Math.abs(k - from) * stag;
      tset(c.a, k < o1 ? 1 : 0, now, d);
      tset(c.z, m < 0 && k === 0 ? HOV : 0, now, d);
    });
    hiOf(m < 0 ? 3 : m).forEach((el) => el.classList.add("hi"));
    read.textContent = m < 0 ? "rest" : READ[m];
    loop.wake();
  }
  read.textContent = "rest";

  bag.add(pointer(stage, { move: (p) => choose(hit(p)), leave: () => choose(-1) }));
  bag.add(() => svg.replaceChildren());

  return {
    set: (v) => { stag = v; },
    destroy: bag.dispose,
  };
}

export default {
  name: "crates",
  means: "Three crates nest round a block: open them from the outside in, one undo at a time, until x stands alone.",
  rules: [1, 2, 5, 8],
  range: [0, 45, 90],
  tour: [[271, 158], [238, 164], [200, 158], null],
  mount,
};
