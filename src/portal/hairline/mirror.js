import { HL } from './kernel.js';

/**
 * Mirror: a little flag planted on a shelf beside a thin standing mirror pane.
 * Its reflection, a dotted outline, stands on the other side of the pane, as
 * far from the glass as the flag. The pointer picks where the flag
 * goes: over it, it stays, f(x); over the far side, it flips across the pane,
 * f(−x); under the shelf, it flips over the floor line and hangs upside down,
 * −f(x). Every point travels straight across its mirror to the same distance
 * on the other side, so each flip passes through the glass or the shelf, on
 * the 700ms curve. The reflection follows the flag while it stands above the
 * shelf, where the pane can see it. At rest the pane is bright. The slider is
 * the flag's distance from the mirror.
 *
 * The pattern: a discrete choice on two tweens, the flag's x and z scales,
 * 1 or −1. The hit test picks the nearest of three fixed target points.
 */
const {
  Cam, facing, fillet, fit, poly, prism, proj, rings, rrect, seg,
  tdone, tset, tval, tween, disposer, mk, pointer, put, register, solid,
} = HL;

const L = 54, W = 12, PB = 4, TP = 1.5, Y = 8, H = 58; // the shelf, and the pane across its middle
const R = 2, HP = 54, PT = 44, PH = 18, PL = 24, T = 1.6; // the flag: a post that stands clear above its pennant
const FL = -PB / 2; // the floor line: the shelf's middle, which the vertical flip mirrors across
const POSE = { rest: [1, 1], "f(x)": [1, 1], "f(−x)": [-1, 1], "−f(x)": [1, -1] };
const SHAPE = fillet([[0, PT], [PL, PT - PH / 2], [0, PT - PH]], [1.2, 2.2, 1.2], 4);

function mount({ stage, svg, read }, value) {
  const bag = disposer();
  let xp = value;

  // The shelf runs along y and the maths x is world -y, so f(x) stands up and to the right and hangs under the shelf's high end.
  // Fitted to the shelf, the pane, and the flag at its farthest, on both sides and hanging under the shelf, where its nearest is lowest.
  const C = Cam(45, 0.5, 2.65);
  const far = 28 + PL;
  fit(C, [[-W, -L, -PB], [W, L, -PB], [W, -L, 0], [-W, L, 0], [-Y, 0, H], [Y, 0, H], [0, far, HP], [0, -far, HP], [0, -far, -PB - HP], [R, R - 15, -PB - HP]], 200, 166);
  const P = proj(C), front = facing(C);

  // Back to front: what hangs under the shelf, the shelf, what stands behind the pane, the pane, what stands before it.
  const g = mk("g", {}, svg);
  const under = mk("g", {}, g);
  // the shelf's round ends pass 20 units on screen, so their rings take more steps than rings() gives
  put(solid(g), prism(P, front, rrect(-W, -L, W, L, 8, 12), rrect(1.8 - W, 1.8 - L, W - 1.8, L - 1.8, 6.2, 12), -PB, 0));
  const behind = mk("g", {}, g);
  const pane = solid(g);
  const [pr, pi] = rings(-Y, -TP, Y, TP, 2, 0.8);
  put(pane, prism(P, front, pr, pi, 0, H));
  // a glint on the glass, the one mark a mirror has
  mk("path", { d: seg(P(-1, TP, 34), P(4, TP, 46)) + seg(P(-4, TP, 34), P(-2, TP, 39)), class: "nf lo" }, pane.g);
  const before = mk("g", {}, g);

  /** The flag: its pennant's back and face, then the post in front of the pennant's root. */
  function flag(ghost) {
    const fg = mk("g", {}, before);
    const back = ghost ? null : mk("path", { class: "lo" }, fg);
    const face = mk("path", { class: ghost ? "dash" : "sil" }, fg);
    const post = ghost ? { g: fg, sil: mk("path", { class: "dash" }, fg), cr: null } : solid(fg);
    return { g: fg, back, face, post, at: before };
  }
  const real = flag(false), image = flag(true);

  /** The flag mirrored by sx across the pane and sz across the floor line: every point goes straight across, scaled. */
  function draw(f, sx, sz, show) {
    const zf = (z) => FL + sz * (z - FL);
    const pen = (x) => poly(SHAPE.map(([u, v]) => P(x, -sx * (xp + u), zf(v))));
    let za = zf(0), zb = zf(HP);
    if (za > zb) [za, zb] = [zb, za];
    if (sz >= 0) za = Math.max(za, 0); else zb = Math.min(zb, -PB); // the post is cut where it passes through the shelf
    const ry = Math.max(Math.abs(sx) * R, 0.2), cy = -sx * xp;
    const [ring, inner] = rings(-R, cy - ry, R, cy + ry, R, Math.min(0.7, ry * 0.45));
    const post = show && zb - za > 0.5 ? prism(P, front, ring, inner, za, zb) : { sil: "", crease: "" };
    const p0 = Math.min(zf(PT), zf(PT - PH)), p1 = Math.max(zf(PT), zf(PT - PH));
    const inShelf = !show || (p0 < 0 && p1 > -PB); // a pennant passing through the shelf is hidden for those frames
    f.face.setAttribute("d", inShelf ? "" : pen(T / 2));
    if (f.back) f.back.setAttribute("d", inShelf ? "" : pen(-T / 2));
    f.post.sil.setAttribute("d", post.sil);
    if (f.post.cr) f.post.cr.setAttribute("d", post.crease);
    const at = sz < 0 ? under : sx > 0 ? behind : before;
    if (at !== f.at) { at.append(f.g); f.at = at; }
  }

  const TX = tween(1), TZ = tween(1);
  let dx = NaN, dz = NaN;
  const loop = register(stage, (_dt, now) => {
    const sx = tval(TX, now), sz = tval(TZ, now);
    if (sx !== dx || sz !== dz) {
      dx = sx; dz = sz;
      draw(real, sx, sz, true);
      draw(image, -sx, sz, sz > 0); // the pane reflects only what stands above the shelf
    }
    return !tdone(TX, now) || !tdone(TZ, now);
  });
  bag.add(loop.unregister);

  let cur = "";
  /** Sends the flag to pose k. At rest the pane holds the bright stroke; once the pointer chooses, the flag takes it. */
  function choose(k) {
    if (k === cur) return;
    cur = k;
    const now = performance.now(), [x, z] = POSE[k];
    tset(TX, x, now, 0);
    tset(TZ, z, now, 0);
    pane.sil.classList.toggle("hi", k === "rest");
    [real.face, real.post.sil].forEach((el) => el.classList.toggle("hi", k !== "rest"));
    read.textContent = k;
    loop.wake();
  }
  choose("rest");

  // Three fixed points, one in each target pose's pennant; the pointer takes the nearest. None of them moves.
  const goal = { "f(x)": P(0, -32, 30), "f(−x)": P(0, 32, 30), "−f(x)": P(0, -32, -PB - 30) };
  const pick = ([x, y]) => Object.keys(goal).reduce((a, k) =>
    Math.hypot(x - goal[k][0], y - goal[k][1]) < Math.hypot(x - goal[a][0], y - goal[a][1]) ? k : a);
  bag.add(pointer(stage, { move: (p) => choose(pick(p)), leave: () => choose("rest") }));
  bag.add(() => svg.replaceChildren());

  return {
    set: (v) => { xp = v; dx = NaN; loop.wake(); },
    destroy: bag.dispose,
  };
}

export default {
  name: "mirror",
  means: "A flag beside a standing mirror: flip it across the pane and it reads f(−x); flip it over the floor line and it reads −f(x).",
  rules: [1, 4, 6, 8],
  range: [15, 21, 28],
  tour: [[140, 152], [260, 92], [260, 239], null],
  mount,
};
