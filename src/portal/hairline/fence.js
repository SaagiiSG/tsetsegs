import { HL } from './kernel.js';

/**
 * Fence: a grid plate with a peg point at every crossing, and a straight fence
 * of posts and a rail across it, turning about its middle post. The side the
 * pointer is on rises: a short peg stands at every point strictly on that
 * side, and the other side lies flat. The pointer's direction from the middle,
 * read on the ground plane, which never moves, picks the nearest of ten
 * answers: five slopes, two sides. The fence turns on the 700ms curve and the
 * pegs rise and sink staggered out from it; its footing is a dashed line, the
 * boundary left out. At rest the fence stands steep and the field before it
 * is up. The slider is that stagger, in ms per cell.
 *
 * The plate is turned square to the viewer and its y unit is twice its x unit
 * in the world, so on screen a cell is square and a slope looks like itself.
 * The middle is the point (-1, -1), so every slope through it has a whole intercept.
 */
const {
  Cam, facing, fit, prism, proj, rings, rrect, seg, unproj,
  tween, tset, tval, tdone, mk, pointer, put, register, disposer, solid,
} = HL;

const U = 20, UY = 40, LO = -3, HI = 1, MID = -1, HALF = 2.5, MW = 4, PB = 4;
const PR = 6, PH = 7, PC = 1.3; // pegs: radius, height, crease inset
const FH = 12, PS = 2.8, RW = 2.4, RT = 3.2, NP = 5, END = 0.3; // fence: post height and half-size, rail half-width and thickness, posts, end inset
const R2 = Math.SQRT1_2, MINUS = "−", EMPTY = { sil: "", crease: "" };
/** Ten answers: a slope m and a side s (1 is above the line). `a` is the direction, from the middle, that picks it: the side's normal. */
const STATES = [-2, -1, 0, 1, 2].flatMap((m) => [1, -1].map((s) => ({ m, s, a: Math.atan2(s, -s * m) })));
const REST = STATES.find((st) => st.m === 2 && st.s === -1);

/** Local (u, v), world units along the graph's x and y, to world: x runs across the screen, y away. It is its own inverse. */
const L = (u, v) => [(u - v) * R2, (-u - v) * R2];
/** A ring turned by a radians, moved to local (cx, cy), then into the world. */
const xf = (ring, cx, cy, a = 0) => {
  const c = Math.cos(a), s = Math.sin(a);
  return ring.map((q) => {
    const [u, v] = L(cx + q.u * c - q.v * s, cy + q.u * s + q.v * c), [nu, nv] = L(q.nu * c - q.nv * s, q.nu * s + q.nv * c);
    return { ...q, u, v, nu, nv };
  });
};
/** How far point (gx, gy) stands above the line of slope m through the middle; its sign is the side. */
const above = (m, gx, gy) => gy - MID - m * (gx - MID);
/** The inequality, as a student writes it: y < 2x + 1, y > x, y > −1. */
function say({ m, s }) {
  const b = m * -MID + MID, n = Math.abs(m);
  const mx = m ? (m < 0 ? MINUS : "") + (n === 1 ? "" : n) + "x" : "";
  const bs = !b ? "" : mx ? (b < 0 ? ` ${MINUS} ` : " + ") + Math.abs(b) : (b < 0 ? MINUS : "") + Math.abs(b);
  return `y ${s > 0 ? ">" : "<"} ${mx}${bs}`;
}
const gap = (a, b) => Math.abs((((a - b) % (2 * Math.PI)) + 3 * Math.PI) % (2 * Math.PI) - Math.PI);

function mount({ stage, svg, read }, value) {
  const bag = disposer();
  let stag = value;
  const x0 = (MID - HALF) * U - MW, x1 = (MID + HALF) * U + MW, y0 = (MID - HALF) * UY - MW, y1 = (MID + HALF) * UY + MW;

  // Fitted to the plate with the fence's top at its far edge, the most extreme pose.
  const C = Cam(45, 0.5, 1.9);
  fit(C, [[...L(x0, y0), -PB], [...L(x1, y0), -PB], [...L(x0, y1), FH + RT], [...L(x1, y1), FH + RT]], 200, 166);
  const P = proj(C), front = facing(C);
  const at = (gx, gy) => P(...L(gx * U, gy * UY), 0);

  // The plate, its ruling and its two axes; then the pegs behind the fence, the fence, and the pegs in front of it.
  const g = mk("g", {}, svg);
  put(solid(g), prism(P, front, xf(rrect(x0, y0, x1, y1, 10, 14), 0, 0), xf(rrect(x0 + 2.2, y0 + 2.2, x1 - 2.2, y1 - 2.2, 7.8, 14), 0, 0), -PB, 0));
  let grid = "", axes = "";
  for (let k = LO; k <= HI; k++) {
    const d = seg(at(k, MID - HALF), at(k, MID + HALF)) + seg(at(MID - HALF, k), at(MID + HALF, k));
    if (k) grid += d; else axes += d;
  }
  mk("path", { d: grid, class: "nf lo" }, g);
  mk("path", { d: axes, class: "nf" }, g);
  const line = mk("path", { class: "nf dash" }, g); // the boundary on the ground: dashed, since it is not in the answer
  const back = mk("g", {}, g), fence = mk("g", {}, g), fore = mk("g", {}, g);

  // Pegs, far row first, so appending in this order paints back to front.
  const [pr, pi] = rings(-PR, -PR, PR, PR, PR, PC), pegs = [];
  for (let gy = HI; gy >= LO; gy--) for (let gx = LO; gx <= HI; gx++) {
    const h0 = REST.s * above(REST.m, gx, gy) > 0 ? PH : 0;
    pegs.push({ gx, gy, ring: xf(pr, gx * U, gy * UY), inner: xf(pi, gx * U, gy * UY), el: solid(back), h: tween(h0), d: NaN });
  }
  const [qr, qi] = rings(-PS, -PS, PS, PS, 1.2, 0.7);
  const posts = Array.from({ length: NP }, () => solid(fence)), rail = solid(fence);
  posts.forEach((p) => p.sil.classList.add("hi"));
  rail.sil.classList.add("hi");

  /** The fence at direction th (radians, in graph units): it runs edge to edge of the field, posts evenly along it, the rail on their tops. */
  function drawFence(th) {
    const cg = Math.cos(th), sg = Math.sin(th), h = HALF / Math.max(Math.abs(cg), Math.abs(sg)) - END;
    const dx = cg * U, dy = sg * UY, a = Math.atan2(dy, dx), cx = MID * U, cy = MID * UY, w = h + END;
    line.setAttribute("d", seg(at(MID - w * cg, MID - w * sg), at(MID + w * cg, MID + w * sg)));
    posts.forEach((p, i) => {
      const f = (2 * i) / (NP - 1) - 1, px = cx + f * h * dx, py = cy + f * h * dy;
      put(p, prism(P, front, xf(qr, px, py, a), xf(qi, px, py, a), 0, FH));
    });
    const e = h * Math.hypot(dx, dy) + PS, b = 0.7;
    put(rail, prism(P, front, xf(rrect(-e, -RW, e, RW, RW, 6), cx, cy, a), xf(rrect(-e + b, -RW + b, e - b, RW - b, RW - b, 6), cx, cy, a), FH, FH + RT));
  }

  /** Pegs on the fence's far side go behind it, the rest in front; moved only when a peg changes side. */
  let seq = "";
  function order(th) {
    const k = Math.sign(Math.cos(th)) || 1, dx = k * Math.cos(th), dy = k * Math.sin(th);
    const far = pegs.map((p) => dx * (p.gy - MID) - dy * (p.gx - MID) > 1e-9);
    const s = far.join();
    if (s === seq) return;
    seq = s;
    pegs.forEach((p, i) => (far[i] ? back : fore).append(p.el.g));
  }

  const ang = tween(Math.atan(REST.m));
  let tgt = Math.atan(REST.m), drawn = NaN;
  function frame(now) {
    let moving = !tdone(ang, now);
    const th = tval(ang, now);
    if (th !== drawn) { drawn = th; drawFence(th); order(th); }
    for (const p of pegs) {
      const h = tval(p.h, now);
      if (!tdone(p.h, now)) moving = true;
      if (h === p.d) continue;
      p.d = h;
      put(p.el, h < 0.4 ? EMPTY : prism(P, front, p.ring, p.inner, 0, h));
    }
    return moving;
  }
  frame(performance.now());
  const B = register(stage, (_dt, now) => frame(now));
  bag.add(B.unregister);

  let cur = null; // null is rest
  /** Turns the fence to state st (null puts it back to rest) the short way round, and raises its side, spreading out from the fence. */
  function choose(st) {
    if (st === cur) return;
    cur = st;
    const t = st || REST, now = performance.now(), k = Math.hypot(1, t.m);
    let a = Math.atan(t.m);
    while (a - tgt > Math.PI / 2) a -= Math.PI;
    while (tgt - a > Math.PI / 2) a += Math.PI;
    tgt = a;
    tset(ang, a, now, 0);
    for (const p of pegs) {
      const off = above(t.m, p.gx, p.gy);
      tset(p.h, t.s * off > 0 ? PH : 0, now, (Math.abs(off) / k) * stag);
    }
    read.textContent = st ? say(st) : "rest";
    B.wake();
  }
  read.textContent = "rest";

  /** The pointer's direction from the middle, on the ground plane, which never moves: the nearest side's normal wins. */
  function aim(p) {
    const [u, v] = L(...unproj(C, p[0], p[1], 0)), a = Math.atan2(v / UY - MID, u / U - MID);
    choose(STATES.reduce((b, st) => (gap(st.a, a) < gap(b.a, a) ? st : b)));
  }

  bag.add(pointer(stage, { move: aim, leave: () => choose(null) }));
  bag.add(() => svg.replaceChildren());

  return {
    set: (v) => { stag = v; },
    destroy: bag.dispose,
  };
}

export default {
  name: "fence",
  means: "A fence across a field of points: turn it and the side the pointer is on rises, every point there solving the inequality.",
  rules: [1, 2, 6, 8],
  range: [0, 45, 90],
  tour: [[132, 160], [200, 107], [151, 224], null],
  mount,
};
