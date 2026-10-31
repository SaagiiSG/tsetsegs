import { HL } from './kernel.js';

/**
 * Hundred: a square tray holding a 10 × 10 grid of flat tiles. The pointer
 * sets how many stand up: every tile up to the one under it, row by row from
 * the far corner, rounded to the half row, so the count moves in 5% steps.
 * Tiles rise and settle on the 700ms curve, staggered out from the pointer's
 * tile; the raised ones take the bright stroke, and they are the percent. At
 * rest a third stand: 33 tiles, and the 34th a third of the way up.
 * The slider is the stagger, in ms.
 *
 * The pattern: discrete items. The count is a choice, so tweens; the hit test
 * is the ground at mid tile height, a fixed plane nothing drawn can move.
 */
const {
  Cam, clamp, facing, fit, hull, open, poly, prism, proj, ringAt, rings, rrect, run, unproj,
  tdone, tset, tval, tween, disposer, mk, pointer, put, register, solid,
} = HL;

const N = 10, PITCH = 12, T = 9.6, TR = 2, TB = 0.8, HF = 1.2, HR = 5, E = N * PITCH;
const MI = 5, WT = 3, WH = 3.5, WR = 6, ZH = (HF + HR) / 2;
const X0 = -MI - WT, X1 = E + MI + WT;
// rest: a third of the hundred, 33 tiles standing and the 34th a third of the way up
const restH = (k) => (k < 33 ? HR : k === 33 ? HF + (HR - HF) / 3 : HF);
const LR = (pts) => (pts[0][0] <= pts[pts.length - 1][0] ? pts : pts.slice().reverse());

/** The tray, which never moves: `far` is painted before the tiles, `near` after them; each entry is [d, class]. */
function tray(P, front, outer, inner) {
  const far = [
    [poly(hull(ringAt(P, outer, 0).concat(ringAt(P, outer, WH)))), "sil"],
    [poly(ringAt(P, inner, WH)), "nf"],
    [open(ringAt(P, run(inner, (q) => !front(q)), 0)), "nf lo"],
  ];
  // near: one opaque piece from the rim's inner edge down to the foot, so the front wall covers what is behind it
  const iF = LR(ringAt(P, run(inner, front), WH)), oT = LR(ringAt(P, run(outer, front), WH)), oB = LR(ringAt(P, run(outer, front), 0));
  const near = [
    [poly([...iF, oT[oT.length - 1], ...oB.slice().reverse(), oT[0]]), "fo"],
    [open(oT), "nf lo"],
    [open(iF), "nf"],
    [open([oT[0], ...oB, oT[oT.length - 1]]), "nf sil"],
  ];
  return { far, near };
}

function mount({ stage, svg, read }, value) {
  const bag = disposer();
  let stag = value;

  // Fitted to the tray and a raised tile in the far corner; all hundred up is the most extreme pose, and it stays inside the rim's box.
  const C = Cam(45, 0.5, 1.5);
  fit(C, [[X0, X0, 0], [X1, X1, 0], [X1, X0, 0], [X0, X1, 0], [X0, X0, WH], [0, 0, HR]], 200, 166);
  const P = proj(C), front = facing(C);
  const outer = rrect(X0, X0, X1, X1, WR, 6), inner = rrect(-MI, -MI, E + MI, E + MI, WR - WT, 6);
  const paths = tray(P, front, outer, inner);

  const g = mk("g", {}, svg);
  for (const [d, cls] of paths.far) mk("path", { d, class: cls }, g);

  // Tile (i, j) is number k = 10j + i in the fill order: rows along x, from the far corner. Diagonal by diagonal, back to front.
  const tiles = [];
  for (let s = 0; s <= 2 * (N - 1); s++) for (let i = 0; i < N; i++) {
    const j = s - i;
    if (j < 0 || j >= N) continue;
    const k = j * N + i, x0 = i * PITCH + (PITCH - T) / 2, y0 = j * PITCH + (PITCH - T) / 2;
    const [ring, inr] = rings(x0, y0, x0 + T, y0 + T, TR, TB);
    tiles.push({ i, j, k, h0: restH(k), ring, inr, el: solid(g), h: tween(restH(k)), d: NaN });
  }

  for (const [d, cls] of paths.near) mk("path", { d, class: cls }, g);

  const B = register(stage, (_dt, now) => {
    let moving = false;
    for (const t of tiles) {
      const h = tval(t.h, now);
      if (!tdone(t.h, now)) moving = true;
      if (h === t.d) continue;
      t.d = h;
      put(t.el, prism(P, front, t.ring, t.inr, 0, h));
      t.el.sil.classList.toggle("hi", h > ZH);
    }
    return moving;
  });
  bag.add(B.unregister);

  /** The tile under the pointer, on the plane at mid tile height, which never moves; null off the tray. */
  function cell([sx, sy]) {
    const [x, y] = unproj(C, sx, sy, ZH);
    if (x < X0 || y < X0 || x > X1 || y > X1) return null;
    return [clamp(Math.floor(x / PITCH), 0, N - 1), clamp(Math.floor(y / PITCH), 0, N - 1)];
  }

  let cnt = 0, at = [4, 3]; // 0 is rest; `at` is the tile the stagger spreads from
  /** Raises every tile up to the one under the pointer, rounded up to the half row (null puts the rest back). */
  function choose(c) {
    const n = c ? Math.ceil((c[1] * N + c[0] + 1) / 5) * 5 : 0;
    if (c) at = c;
    if (n === cnt) return;
    const now = performance.now();
    cnt = n;
    for (const t of tiles) tset(t.h, n ? (t.k < n ? HR : HF) : t.h0, now, Math.hypot(t.i - at[0], t.j - at[1]) * stag);
    read.textContent = n ? n + "%" + (n === 50 ? ": half" : n === 100 ? ": all" : "") : "rest";
    B.wake();
  }
  read.textContent = "rest";

  bag.add(pointer(stage, { move: (p) => choose(cell(p)), leave: () => choose(null) }));
  bag.add(() => svg.replaceChildren());

  return {
    set: (v) => { stag = v; },
    destroy: bag.dispose,
  };
}

export default {
  name: "hundred",
  means: "A tray of a hundred tiles: point at one and every tile up to it stands, row by row; the tiles standing are the percent.",
  rules: [1, 2, 5, 8],
  range: [0, 35, 70],
  tour: [[276, 158], [238, 177], [200, 222], null],
  mount,
};
