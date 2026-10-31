import { HL } from './kernel.js';

/**
 * Ladder: a ladder, two rails and a few rungs, leans on a wall that stands on
 * a floor plate. Ladder, wall and floor make a right triangle, marked in the
 * near rail's plane: a dashed run along the floor, a small square at the
 * wall's foot, an arc at the ladder's foot, and a bright line up the wall, the
 * height reached. The pointer's height, read against the wall (which never
 * moves), sets the angle at the foot in 5° steps from 30° to 80°; the ladder
 * swings there on the 700ms curve, its top sliding on the wall and its foot on
 * the floor, its length kept. The read-out is the sine, height over length,
 * and the angle. The slider is the ladder's length: the sine does not change.
 *
 * The scene's own frame: u along the floor away from the wall's face, q along
 * the wall, z up. In the ladder's plane, s runs along a rail from its foot and
 * m across it, away from the wall; rails and rungs are rings in (s, m) stood
 * along q.
 */
const {
  Cam, circ, clamp, facing, fit, open, prism, proj, rad, rings, rrect, seg,
  tdone, tset, tval, tween, disposer, mk, pointer, put, register, solid,
} = HL;

const TURN = -12, S = 1.4, REST = 60, A0 = 30, A1 = 80, LMAX = 124;
const LW = 24, RW = 3, RH = 2, RR = 1.3, RS = 24; // ladder width, rail thickness, rail half depth, rung radius, rung spacing
const WD = 12, QW = 30, WH = 128, PB = 5, M = 8; // wall depth, half width, height; plate thickness, margin
const RA = 18, RM = 7, QT = LW / 2; // arc radius, square's side, the triangle's plane: the near rail's
const du = [Math.cos(rad(TURN)), Math.sin(rad(TURN))], dq = [-du[1], du[0]];
/** World [x, y, z] of a point in the scene's frame. */
const world = (u, q, z) => [u * du[0] + q * dq[0], u * du[1] + q * dq[1], z];
const turn = (ring) => ring.map((s) => {
  const [u, v] = world(s.u, s.v, 0), [nu, nv] = world(s.nu, s.nv, 0);
  return { u, v, nu, nv };
});
/** Toward the viewer, at Cam(45, 0.5): 30° up, from +x +y. */
const V = [Math.sqrt(3 / 8), Math.sqrt(3 / 8), 0.5];

/** The ladder at a degrees and length L: P of (s, m, q), and which ring samples face the viewer. Its rails' undersides run from the foot (L cos a, 0) to the top (0, L sin a). */
function frame(P, a, L) {
  const c = Math.cos(rad(a)), sn = Math.sin(rad(a)), u0 = L * c + RH * sn, z0 = RH * c;
  const at = (s, m, q) => P(...world(u0 - s * c + m * sn, q, z0 + s * sn + m * c));
  const front = (r) => (-r.nu * c + r.nv * sn) * (du[0] + du[1]) * V[0] + (r.nu * sn + r.nv * c) * V[2] > 0;
  return { at, front };
}

/** The plate's reach, u0 to u1 along the floor and q1 either side; the camera, fitted to plate and wall: the longest ladder stays inside both at every angle. */
const U0 = -WD - M, U1 = LMAX * Math.cos(rad(A0)) + M, Q1 = QW + M / 2;
function camera() {
  const C = Cam(45, 0.5, S), pts = [];
  for (const u of [U0, U1]) for (const q of [-Q1, Q1]) pts.push(world(u, q, -PB), world(u, q, 0));
  for (const u of [-WD, 0]) for (const q of [-QW, QW]) pts.push(world(u, q, WH));
  fit(C, pts, 200, 166);
  return C;
}

function mount({ stage, svg, read }, value) {
  const bag = disposer();
  let L = value;
  const C = camera(), P = proj(C), front = facing(C), W = (u, z) => P(...world(u, QT, z));
  const pr = (u0, q0, u1, q1, r, b) => [turn(rrect(u0, q0, u1, q1, r, 6)), turn(rrect(u0 + b, q0 + b, u1 - b, q1 - b, r - b, 6))];

  // back to front: the plate and the run on it; the wall and the height on its face; the square and the arc; far rail, rungs, near rail
  const g = mk("g", {}, svg);
  put(solid(g), prism(P, front, ...pr(U0, -Q1, U1, Q1, 8, 2), -PB, 0));
  const dash = mk("path", { class: "nf dash" }, g);
  put(solid(g), prism(P, front, ...pr(-WD, -QW, 0, QW, 3, 1.4), 0, WH));
  const rise = mk("path", { class: "nf hi" }, g), sq = mk("path", { class: "nf lo" }, g), arc = mk("path", { class: "nf" }, g);
  const far = solid(g), rungs = solid(g), near = solid(g);

  let drawn = "";
  /** The ladder at a degrees. Skipped when nothing it draws has changed. */
  function draw(a) {
    const key = a + "," + L;
    if (key === drawn) return;
    drawn = key;
    const D = L * Math.cos(rad(a)), H = L * Math.sin(rad(a)), n = Math.ceil(a / 4);
    dash.setAttribute("d", seg(W(0, 0), W(D, 0)));
    rise.setAttribute("d", seg(W(0, 0), W(0, H)));
    sq.setAttribute("d", open([W(RM, 0), W(RM, RM), W(0, RM)]));
    arc.setAttribute("d", open(Array.from({ length: n + 1 }, (_, k) => {
      const f = rad(180 - a + (a * k) / n);
      return W(D + RA * Math.cos(f), RA * Math.sin(f));
    })));
    const { at, front: fr } = frame(P, a, L), [ring, inner] = rings(0, -RH, L, RH, 1.2, 0.7);
    put(far, prism(at, fr, ring, inner, -QT - RW / 2, -QT + RW / 2));
    put(near, prism(at, fr, ring, inner, QT - RW / 2, QT + RW / 2));
    // the rungs run between the rails' inner faces; their creases fall inside the near rail, which covers them
    const k = Math.max(3, Math.round(L / RS) - 1);
    let sil = "", crease = "";
    for (let i = 1; i <= k; i++) {
      const s = (L * i) / (k + 1), mv = (r) => r.map((p) => ({ ...p, u: p.u + s }));
      const q = prism(at, fr, mv(circ(RR, 16)), mv(circ(RR - 0.5, 16)), -QT + RW / 2, QT - RW / 2);
      sil += q.sil; crease += q.crease;
    }
    put(rungs, { sil, crease });
  }

  const tw = tween(REST);
  const B = register(stage, (_dt, now) => { draw(tval(tw, now)); return !tdone(tw, now); });
  bag.add(B.unregister);
  draw(REST);
  read.textContent = "rest";

  // the wall's foot and top on screen, which never move: the pointer's height between them is the angle
  const y0 = W(0, 0)[1], y1 = W(0, WH)[1];
  let want = null;
  /** Swings the ladder to the angle under the pointer, or back to rest. */
  function choose() {
    tset(tw, want ?? REST, performance.now(), 0);
    read.textContent = want === null ? "rest" : `sin = ${+Math.sin(rad(want)).toFixed(2)} (${want}°)`;
    B.wake();
  }
  bag.add(pointer(stage, {
    move: (p) => { want = A0 + 5 * Math.round((clamp((y0 - p[1]) / (y0 - y1), 0, 1) * (A1 - A0)) / 5); choose(); },
    leave: () => { want = null; choose(); },
  }));
  bag.add(() => svg.replaceChildren());

  return {
    set: (v) => { L = v; drawn = ""; B.wake(); },
    destroy: bag.dispose,
  };
}

export default {
  name: "ladder",
  means: "A ladder leans on a wall: raise the pointer and it stands steeper, its top climbing the wall. Height over length is the sine.",
  rules: [1, 4, 5, 8],
  range: [96, 110, 124],
  tour: [[225, 227], [205, 180], [175, 87], null],
  mount,
};
