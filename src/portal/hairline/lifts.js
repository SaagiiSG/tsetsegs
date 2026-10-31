import { HL } from './kernel.js';

/**
 * Lifts: two lift shafts side by side on an oval plate. Each is an open frame
 * of three posts with a mark at every floor and a head on top, and a cab with
 * a pair of doors rides up it. The pointer's screen x is time t, from 0 on the
 * left to 6 on the right: lift A stands at floor 4 + t, lift B at 2t. The
 * cabs ride to their floors on the 700ms curve, the one in the shaft nearer
 * the pointer first. The higher cab takes the bright stroke; at t 4 both are
 * at floor 8, so both light and a level line joins them. Seven dots in front
 * are the steps; the one for t is medium. At rest it is t 2: A at floor 6,
 * B two floors under it and climbing faster. The slider is the stagger
 * between the cabs, in ms.
 *
 * The pattern: discrete items. t is a choice, so tweens; the hit test is seven
 * fixed bands of screen x, centred on the dots, which nothing drawn moves.
 */
const {
  Cam, clamp, extremes, facing, fit, open, prism, proj, rings, seg, tdone, tset, tval, tween,
  disposer, flatDot, mk, place, pointer, put, register, solid,
} = HL;

const F = 11, CH = 10, SW = 22, G = 38, PW = 2.2, IN = 3, DW = 3.6, M = 9, PB = 4, HT = 4, REST = 2, T = 6, K = Math.SQRT1_2;
const ZT = 12 * F + CH + 2, ROW = G + 2 * SW + 12;
// A (slow, starting high) on the left, B (fast, from the ground) on the right: the same depth, so neither hides the other and a level line is level on screen.
const LIFTS = [{ x: 0, y: G, floor: (t) => 4 + t }, { x: G, y: 0, floor: (t) => 2 * t }];
// The plate is an oval along the row of shafts, centred on (PC, PC), a long and b deep.
const PC = 33, PA = 54, PBD = 31;
/** An oval ring, n samples, its long axis running left to right on screen. */
function oval(a, b, n) {
  return Array.from({ length: n }, (_, i) => {
    const t = (i / n) * 2 * Math.PI, c = Math.cos(t) * a, s = Math.sin(t) * b, l = Math.hypot(c / a / a, s / b / b);
    const nu = c / a / a / l, nv = s / b / b / l; // the normal, along the oval's own axes
    return { u: PC + (c + s) * K, v: PC + (s - c) * K, nu: (nu + nv) * K, nv: (nv - nu) * K };
  });
}

function mount({ stage, svg, read }, value) {
  const bag = disposer();
  let stag = value;

  // Fitted to the plate and the two heads, the highest point in every pose.
  const C = Cam(45, 0.5, 1.6);
  const foot = [[-PA, 0], [PA, 0], [0, -PBD], [0, PBD]].map(([c, s]) => [PC + (c + s) * K, PC + (s - c) * K, -PB]);
  fit(C, [...foot, [-1, G - 1, ZT + HT], [G - 1, -1, ZT + HT]], 200, 166);
  const P = proj(C), front = facing(C);

  const g = mk("g", {}, svg);
  put(solid(g), prism(P, front, oval(PA, PBD, 72), oval(PA - 2, PBD - 2, 72), -PB, 0));

  // The seven steps: a row of dots in front of the shafts, level on screen, from under A to under B.
  const dotAt = (i) => { const d = (i - T / 2) * ((2 * G) / T); return P((ROW + d) / 2, (ROW - d) / 2, 0); };
  const dots = Array.from({ length: T + 1 }, (_, i) => { const el = flatDot(g, C, 1.8, "dot off"); place(el, dotAt(i)); return el; });

  // Each shaft back to front: floor marks, posts, cab, head.
  const lifts = LIFTS.map((L) => {
    const x1 = L.x + SW, y1 = L.y + SW, h = PW / 2;
    const posts = [[L.x + h, L.y + h], [L.x + h, y1 - h], [x1 - h, L.y + h]]; // back, left, right
    // a floor mark at every floor: the back half of its ring, post to post, painted under the posts
    let marks = "";
    for (let n = 1; n <= 12; n++) marks += open([posts[1], posts[0], posts[2]].map(([x, y]) => P(x, y, n * F)));
    mk("path", { d: marks, class: "nf lo" }, g);
    for (const [x, y] of posts) {
      const [r, i] = rings(x - h, y - h, x + h, y + h, 1, 0.5);
      put(solid(g), prism(P, front, r, i, 0, ZT));
    }
    const cab = solid(g), door = mk("path", { class: "nf lo" }, cab.g);
    const [hr, hi] = rings(L.x - 1, L.y - 1, x1 + 1, y1 + 1, 4, 1.4);
    put(solid(g), prism(P, front, hr, hi, ZT, ZT + HT));
    const [cr, ci] = rings(L.x + IN, L.y + IN, x1 - IN, y1 - IN, 2.4, 1.2);
    return { ...L, cx: L.x + SW / 2, cab, door, cr, ci, z: tween(L.floor(REST)), dz: NaN };
  });
  const level = mk("path", { class: "nf hi" }, g);
  // where the level line meets each cab: A's right side, B's left side
  const ends = [extremes(P, lifts[0].cr)[1], extremes(P, lifts[1].cr)[0]];

  const loop = register(stage, (_dt, now) => {
    let moving = false;
    for (const L of lifts) {
      const f = tval(L.z, now);
      if (!tdone(L.z, now)) moving = true;
      if (f === L.dz) continue;
      L.dz = f;
      const z = f * F, fy = L.y + SW - IN;
      put(L.cab, prism(P, front, L.cr, L.ci, z, z + CH));
      // the doorway on the cab's front-left face, and the seam between its two doors
      const d0 = z + 1, d1 = z + CH - 2.4;
      L.door.setAttribute("d", open([[-DW, d0], [-DW, d1], [DW, d1], [DW, d0]].map(([u, h]) => P(L.cx + u, fy, h))) + seg(P(L.cx, fy, d0), P(L.cx, fy, d1)));
    }
    return moving;
  });
  bag.add(loop.unregister);

  // Seven bands of screen x, centred on the dots. They never move.
  const x0 = dotAt(0)[0], step = dotAt(1)[0] - x0;
  const band = (x) => clamp(Math.round((x - x0) / step), 0, T);

  let t = null;
  /** Sets time m (-1 is rest, which is t 2). The cab in the shaft nearer the pointer leaves first. */
  function choose(m) {
    if (m === t) return;
    const now = performance.now(), to = m < 0 ? REST : m, a = to < T / 2 ? 0 : 1;
    t = m;
    // bright on the higher cab, read from the target floors, never the pose on screen; level lights both
    const fl = lifts.map((L) => L.floor(to)), top = Math.max(...fl), lv = fl[0] === fl[1];
    lifts.forEach((L, i) => {
      tset(L.z, fl[i], now, Math.abs(i - a) * stag);
      L.cab.sil.classList.toggle("hi", fl[i] === top);
    });
    const zl = fl[0] * F + CH / 2;
    level.setAttribute("d", lv ? seg(P(ends[0].u, ends[0].v, zl), P(ends[1].u, ends[1].v, zl)) : "");
    dots.forEach((el, i) => { el.classList.toggle("m", i === to); el.classList.toggle("off", i !== to); });
    read.textContent = m < 0 ? "rest" : lv ? `t ${m}: level at floor ${fl[0]}` : `t ${m}: ${fl[0]} vs ${fl[1]}`;
    loop.wake();
  }
  choose(-1);

  bag.add(pointer(stage, { move: (p) => choose(band(p[0])), leave: () => choose(-1) }));
  bag.add(() => svg.replaceChildren());

  return {
    set: (v) => { stag = v; },
    destroy: bag.dispose,
  };
}

export default {
  name: "lifts",
  means: "Two lifts climb at different speeds: move left to right through time, and at one moment they stand level.",
  rules: [1, 2, 4, 8],
  range: [0, 40, 80],
  tour: [[200, 260], [214, 260], [241, 260], null],
  mount,
};
