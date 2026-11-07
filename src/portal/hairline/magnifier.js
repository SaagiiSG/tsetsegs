import { HL } from './kernel.js';

/**
 * Magnifier: a page of five lines, and a magnifying glass hovering over it.
 * The pointer moves the lens over the page; the line under it lifts toward
 * the glass and swells, and its neighbours stir, staggered outwards from it.
 * One line is the main idea: under the lens it rises into the glass and takes
 * the bright stroke. At rest the lens holds it. The slider is the lens's
 * power: how much the line under it swells.
 *
 * The pattern: the lens on a spring (where), the lines on tweens (which), and
 * a hit test on the page's top, which never moves.
 */
const {
  Cam, circ, clamp, facing, fit, hull, open, poly, prism, proj, rad, ringAt, rings, rrect, run, unproj,
  spring, stepS, tdone, tset, tval, tween, disposer, mk, pointer, put, register, solid,
} = HL;

const PX = 96, PY = 98, PT = 1.4, G = 16, Y1 = 17, T = 8, H = 3, KEY = 2, STEP = 40;
// each line's start and end along x: the first indented, the right edge ragged, the last short
const LINES = [[20, 84], [12, 86], [12, 80], [12, 84], [12, 54]], N = LINES.length, YN = Y1 + (N - 1) * G;
// the lens: rim radius, rim width, rim height, its height over the page; the handle leaves the rim at TH degrees.
// It hovers over everything a line can reach, on the sight line through the point AIM above the page under the pointer.
const R = 24, RW = 3.2, RT = 4, ZL = 20, AIM = 9, TH = 20, HLEN = 42, LX0 = 28, LX1 = 64, REST = [28, Y1 + KEY * G];
// the main idea rises to the middle of the glass; a detail only stirs; a neighbour barely
const LIFT = { key: 10, det: 4.5, nb: 1.5 };

const LR = (pts) => (pts[0][0] <= pts[pts.length - 1][0] ? pts : pts.slice().reverse());
const area = (p) => p.reduce((s, a, i) => { const b = p[(i + 1) % p.length]; return s + a[0] * b[1] - b[0] * a[1]; }, 0);
/** A ring turned by a degrees about its origin, normals and all. */
function turn(ring, a) {
  const c = Math.cos(rad(a)), s = Math.sin(rad(a));
  return ring.map((q) => ({ u: q.u * c - q.v * s, v: q.u * s + q.v * c, nu: q.nu * c - q.nv * s, nv: q.nu * s + q.nv * c }));
}

function mount({ stage, svg, read }, value) {
  const bag = disposer();
  let pow = value;

  // Fitted to the page and the lens at the four corners of its range, handle and all. On its
  // sight line the lens draws as if it stood at AIM over the point it looks at, so it is fitted there.
  const C = Cam(45, 0.5, 2.2);
  const pts = [[0, 0, 0], [PX, PY, 0], [PX, 0, 0], [0, PY, 0]], tip = R + HLEN + 3;
  for (const x of [LX0, LX1]) for (const y of [Y1, YN]) {
    for (let k = 0; k < 8; k++) pts.push([x + R * Math.cos(rad(k * 45)), y + R * Math.sin(rad(k * 45)), PT + AIM + RT]);
    pts.push([x + tip * Math.cos(rad(TH)), y + tip * Math.sin(rad(TH)), PT + AIM - 2]);
  }
  fit(C, pts, 200, 166);
  const P = proj(C), front = facing(C), back = (q) => !front(q);
  // from a point on the page to the lens that looks at it: up the sight line to ZL
  const D = unproj(C, ...P(0, 0, PT + AIM), ZL);

  const g = mk("g", {}, svg);
  const [pr, pi] = rings(-4, -4, PX + 4, PY + 4, 5, 1.4);
  put(solid(g), prism(P, front, pr, pi, 0, PT));

  /** [lift, swell] of line i with the lens over line c: the main idea rises highest and swells most. */
  function pose(i, c) {
    const d = Math.abs(i - c);
    if (d === 0) return c === KEY ? [LIFT.key, pow] : [LIFT.det, 1 + (pow - 1) * 0.5];
    return d === 1 ? [LIFT.nb, 1 + (pow - 1) * 0.15] : [0, 1];
  }
  // Back to front: a lifted line stays behind the line in front of it in depth, so the order never changes.
  const lines = LINES.map(([x0, x1], i) => {
    const [l, s] = pose(i, KEY);
    return { i, x0, x1, y: Y1 + i * G, l: tween(l), s: tween(s), el: solid(g), drawn: "" };
  });
  lines[KEY].el.sil.classList.add("hi");

  // The lens is painted last: everything under it is lower, so nothing can cover it.
  const lens = mk("g", {}, g);
  const rim = circ(R, 96), rimIn = circ(R - 0.8, 96), mouth = circ(R - RW, 96);
  const L = {
    face: mk("path", { class: "fo" }, lens), wallFace: mk("path", { class: "fo" }, lens),
    sil: mk("path", { class: "nf sil" }, lens), cr: mk("path", { class: "nf lo" }, lens),
    mouth: mk("path", { class: "nf" }, lens), wall: mk("path", { class: "nf lo" }, lens), glint: mk("path", { class: "nf lo" }, lens),
  };
  const ferrule = solid(lens), handle = solid(lens);
  const fz = ZL + RT / 2;
  const fer = [turn(rrect(R - 1.5, -4, R + 6, 4, 2, 4), TH), turn(rrect(R - 0.7, -3.2, R + 5.2, 3.2, 1.4, 4), TH)];
  const hdl = [turn(rrect(R + 6, -2.8, R + HLEN, 2.8, 2.8, 4), TH), turn(rrect(R + 6.9, -1.9, R + HLEN - 0.9, 1.9, 1.9, 4), TH)];

  function drawLens(x, y) {
    const Q = (u, v, z) => P(u + x + D[0], v + y + D[1], z), top = ZL + RT;
    const p = prism(Q, front, rim, rimIn, ZL, top);
    const outer = hull(ringAt(Q, rim, ZL).concat(ringAt(Q, rim, top))), hole = ringAt(Q, mouth, top);
    // the rim, open in the middle: the glass hole winds against the outline
    L.face.setAttribute("d", poly(outer) + poly(area(outer) * area(hole) > 0 ? hole.slice().reverse() : hole));
    // the far inner wall of the rim, seen through the glass
    const wTop = LR(ringAt(Q, run(mouth, back), top)), wBot = LR(ringAt(Q, run(mouth, back), ZL));
    L.wallFace.setAttribute("d", poly(wTop.concat(wBot.slice().reverse())));
    L.sil.setAttribute("d", p.sil);
    L.cr.setAttribute("d", p.crease);
    L.mouth.setAttribute("d", poly(hole));
    L.wall.setAttribute("d", open(wBot));
    const gr = 0.66 * (R - RW);
    L.glint.setAttribute("d", open([0, 1, 2, 3, 4, 5].map((k) => Q(gr * Math.cos(rad(196 + k * 8)), gr * Math.sin(rad(196 + k * 8)), ZL + RT / 2))));
    put(ferrule, prism(Q, front, fer[0], fer[1], fz - 3.6, fz + 3.6));
    put(handle, prism(Q, front, hdl[0], hdl[1], fz - 2.8, fz + 2.8));
  }

  function drawLine(ln, lift, sw) {
    const key = lift + "," + sw;
    if (key === ln.drawn) return;
    ln.drawn = key;
    const t = (T * sw) / 2, z0 = PT + lift;
    const [ring, inner] = rings(ln.x0, ln.y - t, ln.x1, ln.y + t, t, 0.8);
    put(ln.el, prism(P, front, ring, inner, z0, z0 + H * sw));
  }

  const lx = spring(REST[0]), ly = spring(REST[1]);
  let lensAt = "";
  const B = register(stage, (dt, now) => {
    const mx = stepS(lx, dt), my = stepS(ly, dt);
    let moving = mx || my;
    const at = lx.x + "," + ly.x;
    if (at !== lensAt) { lensAt = at; drawLens(lx.x, ly.x); }
    for (const ln of lines) {
      drawLine(ln, tval(ln.l, now), tval(ln.s, now));
      if (!tdone(ln.l, now) || !tdone(ln.s, now)) moving = true;
    }
    return moving;
  });
  bag.add(B.unregister);

  let act = -1;
  /** Lifts the line the lens is over (the main idea at rest), its neighbours a little, staggered outwards from it. */
  function aim() {
    const now = performance.now(), c = act < 0 ? KEY : act;
    for (const ln of lines) {
      const d = Math.abs(ln.i - c), [l, s] = pose(ln.i, c);
      tset(ln.l, l, now, d * STEP);
      tset(ln.s, s, now, d * STEP);
      ln.el.sil.classList.toggle("hi", d === 0 && c === KEY);
    }
    B.wake();
  }
  read.textContent = "rest";

  /** The line nearest the pointer, read on the page's top, which never moves; -1 off the page. */
  function hit(p) {
    const [x, y] = unproj(C, p[0], p[1], PT);
    if (x < -8 || x > PX + 8 || y < -8 || y > PY + 8) return [-1, REST[0], REST[1]];
    return [clamp(Math.round((y - Y1) / G), 0, N - 1), clamp(x, LX0, LX1), clamp(y, Y1, YN)];
  }

  /** Sends the lens to (x, y) over line a; -1 sends it home, over the main idea. */
  function choose(a, x, y) {
    lx.t = x; ly.t = y;
    if (a !== act) {
      act = a;
      read.textContent = a < 0 ? "rest" : a === KEY ? "main idea" : "detail";
      aim();
    }
    B.wake();
  }

  bag.add(pointer(stage, { move: (p) => choose(...hit(p)), leave: () => choose(-1, REST[0], REST[1]) }));
  bag.add(() => svg.replaceChildren());

  return {
    set: (v) => { pow = v; aim(); },
    destroy: bag.dispose,
  };
}

export default {
  name: "magnifier",
  means: "A magnifying glass over a page: the line under it lifts and swells, and the main idea rises into the glass.",
  rules: [1, 4, 5, 8],
  range: [1.2, 1.5, 1.8],
  tour: [[122, 176], [284, 158], [212, 172], null],
  mount,
};
