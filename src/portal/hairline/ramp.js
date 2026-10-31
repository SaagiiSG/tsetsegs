import { HL } from './kernel.js';

/**
 * Ramp: a plank on a grid plate, its foot on the ground and its top end on a
 * post four grid steps away: a fixed run. The pointer's height sets the post's
 * rise in whole grid steps, 1 to 4, and the plank pivots on its foot to stay
 * on it, on the 700ms curve. A dashed run along the ground, the post's near
 * side and the plank close the slope triangle; faint rings on the post count
 * its steps. At rest the post stands three steps high, slope 3/4, and the
 * plank is bright; when the pointer chooses, the post takes the bright. The
 * slider is the plank's width, in grid steps.
 *
 * The plate is turned square to the viewer, as V-rail's is, so the triangle
 * faces the page; a step up is drawn as tall as a step across, so slope 1
 * looks like slope 1. The hit test is bands of screen height at the post's
 * whole steps, which nothing drawn can move.
 */
const {
  Cam, clamp, fit, open, prism, proj, ringAt, rrect, run, seg,
  tween, tset, tval, tdone, mk, pointer, put, register, disposer, solid,
} = HL;

const K = 0.5, U = 20, UZ = U / Math.sqrt(1 - K * K), RUN = 4, REST = 3, LO = 1, HI = 4, R2 = Math.SQRT1_2;
const T = 5, R = 2, B = 0.9, OV = 7, PW = 4, PB = 4, GU0 = -1, GU1 = RUN + 1, GV = 1, M = 8;
const gcd = (a, b) => (b ? gcd(b, a % b) : a);
const say = (r) => (r === RUN ? "slope 1" : `slope ${r / gcd(r, RUN)}/${RUN / gcd(r, RUN)}`);

function mount({ stage, svg, read }, value) {
  const bag = disposer();
  let w = value * U;

  // Local (u, v, z): u across the page, v away from it. Rings in u, v face the viewer when their normal points to -v.
  const C = Cam(45, K, 1.85);
  const W = (u, v) => [(u - v) * R2, (-u - v) * R2];
  const u0 = GU0 * U - M, u1 = GU1 * U + M, v0 = -GV * U - M, v1 = GV * U + M;
  // Fitted to the plate and the plank at its steepest and widest, the most extreme pose.
  fit(C, [[...W(u0, v0), -PB], [...W(u1, v1), 0], [...W(u0, v1), 0], [...W(u1, v0), -PB], [...W(RUN * U + OV, 0.8 * U), HI * UZ + T + 2]], 200, 166);
  const P = proj(C), Pl = (u, v, z) => P(...W(u, v), z), front = (q) => q.nv < 0;

  /** The plank resting on a post z high: its side profile, a rounded rectangle in u–z, stood along v. Its foot's round touches the ground at u 0. */
  function plank(z) {
    const d = Math.hypot(RUN * U, z), c = (RUN * U) / d, s = z / d, L = d + OV, lift = R * (s + c - 1);
    const turn = (ring) => ring.map((q) => ({
      ...q, u: q.u * c - q.v * s, v: q.u * s + q.v * c - lift, nu: q.nu * c - q.nv * s, nv: q.nu * s + q.nv * c,
    }));
    // the profile's points are (u, z), stood along v: its near face, the crease's, is at -w/2; it faces the viewer where it looks up
    return prism((a, b, e) => Pl(a, e, b), (q) => q.nv > 0, turn(rrect(0, 0, L, T, R, 6)), turn(rrect(B, B, L - B, T - B, R - B, 6)), w / 2, -w / 2);
  }

  // Paint order, back to front: plate, its ruling and the dashed run on it, the post, the plank resting on the post.
  const g = mk("g", {}, svg);
  put(solid(g), prism(Pl, front, rrect(u0, v0, u1, v1, 9, 6), rrect(u0 + 2, v0 + 2, u1 - 2, v1 - 2, 7, 6), -PB, 0));
  let grid = "";
  for (let j = GU0; j <= GU1; j++) grid += seg(Pl(j * U, -GV * U, 0), Pl(j * U, GV * U, 0));
  for (let i = -GV; i <= GV; i++) grid += seg(Pl(GU0 * U, i * U, 0), Pl(GU1 * U, i * U, 0));
  mk("path", { d: grid, class: "nf lo" }, g);
  const dash = mk("path", { class: "nf dash" }, g);
  const post = solid(g), steps = mk("path", { class: "nf lo" }, post.g);
  const board = solid(g);

  let drawn = "";
  /** The figure with the post h steps high. Skipped when nothing it draws has changed. */
  function draw(h) {
    const key = h + "," + w;
    if (key === drawn) return;
    drawn = key;
    const z = h * UZ, vn = -w / 2 + 1, pa = RUN * U - PW;
    const pr = rrect(pa, vn, RUN * U + PW, -vn, 2.5, 6), pf = run(pr, front);
    dash.setAttribute("d", seg(Pl(0, vn, 0), Pl(pa, vn, 0)));
    put(post, prism(Pl, front, pr, rrect(pa + 0.9, vn + 0.9, RUN * U + PW - 0.9, -vn - 0.9, 1.6, 6), 0, z));
    let d = "";
    for (let k = 1; k * UZ < z - 3; k++) d += open(ringAt(Pl, pf, k * UZ));
    steps.setAttribute("d", d);
    put(board, plank(z));
  }
  draw(REST);

  const rise = tween(REST);
  const loop = register(stage, (_dt, now) => {
    draw(tval(rise, now));
    return !tdone(rise, now);
  });
  bag.add(loop.unregister);

  // The pointer's height picks the whole step nearest it, measured up the post's fixed axis: nothing that moves.
  const zy = Pl(RUN * U, 0, 0)[1], dz = zy - Pl(RUN * U, 0, UZ)[1];
  const pick = (p) => clamp(Math.round((zy - p[1]) / dz), LO, HI);

  let act = 0;
  /** Sets the post to r steps (0 is rest). The bright goes to the post the pointer set, and back to the plank at rest. */
  function choose(r) {
    if (r === act) return;
    act = r;
    tset(rise, r || REST, performance.now(), 0);
    board.sil.classList.toggle("hi", !r);
    post.sil.classList.toggle("hi", !!r);
    read.textContent = r ? say(r) : "rest";
    loop.wake();
  }
  board.sil.classList.add("hi");
  read.textContent = "rest";

  bag.add(pointer(stage, { move: (p) => choose(pick(p)), leave: () => choose(0) }));
  bag.add(() => svg.replaceChildren());

  return {
    set: (v) => { w = v * U; loop.wake(); },
    destroy: bag.dispose,
  };
}

export default {
  name: "ramp",
  means: "A plank leans on a post over a grid: raise the pointer and the post lifts in whole steps over a run of four, rise over run.",
  rules: [1, 4, 5, 6, 8],
  range: [0.8, 1.2, 1.6],
  tour: [[274, 126], [274, 89], [274, 163], null],
  mount,
};
