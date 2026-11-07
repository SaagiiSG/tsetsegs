import { HL } from './kernel.js';

/**
 * Signpost: a fingerpost on a small base, standing where a path meets a turn.
 * The path comes in from the back and runs straight on; one way turns off
 * toward the viewer, to the next idea. The post's one arm is a pointed board
 * that turns on it. The pointer is read on the ground, which never moves, as
 * a direction from the junction, and the arm swings to the way it is toward on
 * the 700ms tween: back the way you came is "but", straight on is "and", the
 * turn to the next idea is "so". The dots along that way light up outward
 * from the junction. At rest the arm points across, to no way yet. The
 * slider is the stagger between dots, in ms.
 *
 * The pattern: one of three. A tween for the heading, a stagger by distance
 * for the dots, and the arm moved before or after the post as it swings.
 */
const {
  Cam, facing, fillet, fit, poly, prism, proj, rad, rings, seg, unproj,
  tdone, tset, tval, tween, disposer, flatDot, mk, place, pointer, put, register, solid,
} = HL;

const W = 8, LS = 56, LT = 52, PT = 2.5;
const PX = 0, PY = -25, PH = 58, BS = 7, BH = 4, PR = 3;
const ZA = 47, AH = 7, AL = 44, AT = 1.6, REST = -60, S = 2.4;
// The three ways, as headings from the junction: 0 runs along +x, straight on, and 90 is the turn.
const WAYS = [{ word: "and", h: 0 }, { word: "so", h: 90 }, { word: "but", h: 180 }];
const DOTS = [20, 33, 46];
// The path, a T: the through way along x, the turn along +y. Counterclockwise in world x, y.
const T = fillet(
  [[-LS, -W], [LS, -W], [LS, W], [W, W], [W, LT], [-W, LT], [-W, W], [-LS, W]],
  [7.5, 7.5, 7.5, 4, 7.5, 7.5, 4, 7.5],
  8,
);
// The arm in its own plane: u along the heading from the post's axis, v up from ZA.
// It starts at the post's face, so it never covers the post from inside.
const BOARD = fillet([[PR, -AH], [AL - 10, -AH], [AL, 0], [AL - 10, AH], [PR, AH]], [0.6, 1.2, 1.4, 1.2, 0.6]);

/**
 * The path, a thin plate. Its outline is the top swept down to the foot: the far side at the top, the near side at
 * the foot, and a drop where they meet (in a notch the drop falls inside the top, whose fill hides it). Then the top
 * over it, its edges dim in front and bright behind.
 */
function path(P, g) {
  const n = T.length, top = T.map(([x, y]) => P(x, y, PT)), foot = T.map(([x, y]) => P(x, y, 0));
  // a counterclockwise run from a to b has the outward normal (dy, -dx); it faces the viewer when its x + y is positive
  const faces = (a, b) => b[1] - a[1] - (b[0] - a[0]) > 0;
  const near = T.map((_, i) => faces(T[(i + n - 1) % n], T[(i + 1) % n])), out = [];
  T.forEach((_, i) => {
    const was = near[(i + n - 1) % n];
    if (near[i] !== was) out.push(was ? foot[i] : top[i]);
    out.push(near[i] ? foot[i] : top[i]);
  });
  mk("path", { d: poly(out), class: "sil" }, g);
  mk("path", { d: poly(top), class: "fo" }, g);
  let dim = "", rim = "";
  T.forEach((a, i) => {
    const j = (i + 1) % n, s = seg(top[i], top[j]);
    if (faces(a, T[j])) dim += s; else rim += s;
  });
  mk("path", { d: dim, class: "nf lo" }, g);
  mk("path", { d: rim, class: "nf sil" }, g);
}

/** The arm at heading th: its far face and its near face, and whether it reaches away from the viewer. */
function board(P, th) {
  const c = Math.cos(rad(th)), s = Math.sin(rad(th)), k = (c - s >= 0 ? AT : -AT) / 2;
  const at = (o) => poly(BOARD.map(([u, v]) => P(PX + u * c - o * s, PY + u * s + o * c, ZA + v)));
  return { back: at(-k), face: at(k), away: c + s < 0 };
}

function mount({ stage, svg, read }, value) {
  const bag = disposer();
  let stag = value;

  // Fitted to the path, the post, and the arm's tip at every heading it passes through.
  const C = Cam(45, 0.5, S), tips = [];
  for (let h = 0; h < 360; h += 45) {
    for (const z of [ZA - AH, ZA + AH]) tips.push([PX + AL * Math.cos(rad(h)), PY + AL * Math.sin(rad(h)), z]);
  }
  fit(C, [[-LS, -W, 0], [LS, W, 0], [-W, LT, 0], [LS, -W, 0], [-LS, W, 0], [PX, PY, PH], ...tips], 200, 166);
  const P = proj(C), front = facing(C);

  const g = mk("g", {}, svg);
  path(P, g);
  const dots = [];
  WAYS.forEach((w, i) => DOTS.forEach((d, k) => {
    const el = flatDot(g, C, 1.3, "dot off");
    place(el, P(d * Math.cos(rad(w.h)), d * Math.sin(rad(w.h)), PT));
    dots.push({ i, k, el, tw: tween(0), on: false });
  }));

  // The sign stands behind the path, clear of it on screen, so it is painted after it.
  const [br, bi] = rings(PX - BS, PY - BS, PX + BS, PY + BS, 3, 1.2);
  put(solid(g), prism(P, front, br, bi, 0, BH));
  const post = solid(g), [pr, pi] = rings(PX - PR, PY - PR, PX + PR, PY + PR, 2.2, 0.8);
  put(post, prism(P, front, pr, pi, BH, PH));
  const arm = mk("g", {}, g), back = mk("path", { class: "lo" }, arm), face = mk("path", { class: "sil hi" }, arm);

  const heading = tween(REST);
  let drawn = NaN, away = false;
  const B = register(stage, (_dt, now) => {
    let moving = !tdone(heading, now);
    const th = tval(heading, now);
    if (th !== drawn) {
      drawn = th;
      const q = board(P, th);
      back.setAttribute("d", q.back);
      face.setAttribute("d", q.face);
      // reaching away, the arm passes behind the post; reaching toward the viewer, in front of it
      if (q.away !== away) { away = q.away; if (away) post.g.before(arm); else post.g.after(arm); }
    }
    for (const d of dots) {
      const on = tval(d.tw, now) > 0.5;
      if (on !== d.on) { d.on = on; d.el.setAttribute("class", on ? "dot m" : "dot off"); }
      if (!tdone(d.tw, now)) moving = true;
    }
    return moving;
  });
  bag.add(B.unregister);

  /**
   * The way the pointer is toward, from the junction on the ground. On screen: the right half
   * is straight on, the upper left back, the lower left the turn.
   */
  function way([sx, sy]) {
    const [x, y] = unproj(C, sx, sy, 0), a = (Math.atan2(y, x) * 180) / Math.PI;
    return a > -135 && a <= 45 ? 0 : a > 45 && a <= 135 ? 1 : 2;
  }

  let act = -1, aim = REST;
  /** Swings the arm to way w (-1 is rest), the short way round, and lights that way's dots outward. */
  function choose(w) {
    if (w === act) return;
    const now = performance.now(), h = w < 0 ? REST : WAYS[w].h;
    act = w;
    aim += ((((h - aim) % 360) + 540) % 360) - 180;
    tset(heading, aim, now, 0);
    for (const d of dots) tset(d.tw, d.i === w ? 1 : 0, now, d.k * stag);
    read.textContent = w < 0 ? "rest" : WAYS[w].word;
    B.wake();
  }
  read.textContent = "rest";

  bag.add(pointer(stage, { move: (p) => choose(way(p)), leave: () => choose(-1) }));
  bag.add(() => svg.replaceChildren());

  return {
    set: (v) => { stag = v; },
    destroy: bag.dispose,
  };
}

export default {
  name: "signpost",
  means: "A signpost where the path turns: its arm swings back for but, straight on for and, or off to the next idea for so.",
  rules: [1, 2, 5, 6, 10],
  range: [0, 50, 100],
  tour: [[235, 254], [126, 200], [126, 254], null],
  mount,
};
