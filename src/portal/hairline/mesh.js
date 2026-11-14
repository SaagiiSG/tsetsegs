import { HL } from './kernel.js';

/**
 * Mesh: two equal spur gears on a board, a subject gear and a verb gear, side
 * by side, the verb gear on a pin it can be lifted off. At rest the verb gear has the subject's tooth spacing
 * and the two mesh. Over the subject gear, its crank turns and both gears turn.
 * Over the verb gear, it is lifted off its pin and swapped for one with coarser
 * teeth, which cannot seat: it lands crooked on the subject's tooth tips and
 * nothing turns. The bright stroke marks where the teeth meet, in every pose.
 * The slider is how fast the meshed pair turns, in turns a minute.
 *
 * The pattern: a choice between two versions, so the swap is a tween; the turn
 * is a spring chasing a target that moves while the crank is held. The hit
 * test is the nearer gear's rest centre, which nothing drawn can move.
 */
const {
  Cam, circ, facing, fillet, fit, lerp, open, poly, prism, proj, rings, spring, stepS, tdone, tset, tval, tween,
  reducedMotion, disposer, mk, pointer, put, register, solid,
} = HL;

const R = 30, AD = 6, DE = 7.5, T = 7, D = 60, TR = 0.25, TT = 0.12, LIP = 0.6, TAU = 2 * Math.PI, PITCH = TAU / 12;
const BR = 5.5, PR = 3.2, PZ = T + 6, KR = 16, KN = 3.4, KH = 13, K0 = Math.PI * 1.2;
const LIFT = 15, CW = 10, PB = 10, M = 6, OUT = R + AD;
// The jam: the coarse gear's near side rests on the subject's tooth tips (z = T at x = OUT), its far rim on the board.
const TJ = T / D, ZJ = TJ * OUT;

/** A gear's top outline in its own frame, counterclockwise: N filleted trapezoid teeth, tooth 0 at angle 0. */
function outline(N) {
  const p = TAU / N, rr = R - DE, ro = R + AD, pts = [], rs = [];
  for (let k = 0; k < N; k++) {
    for (const [r, w] of [[rr, -TR], [ro, -TT], [ro, TT], [rr, TR]]) pts.push([r * Math.cos((k + w) * p), r * Math.sin((k + w) * p)]);
    rs.push(2, 1.4, 1.4, 2);
  }
  return fillet(pts, rs, 3);
}

/** The cyclic runs of edges 0..n-1 that agree on keep(i); each run lists its points, the last edge's end included. */
function runs(n, keep) {
  const f = [];
  for (let i = 0; i < n; i++) f.push(keep(i));
  const s0 = Math.max(0, f.findIndex((v, i) => v !== f[(i + n - 1) % n])), out = [];
  let r = null;
  for (let m = 0; m < n; m++) {
    const i = (s0 + m) % n;
    if (!r || r.f !== f[i]) out.push((r = { f: f[i], ids: [i] }));
    r.ids.push((i + 1) % n);
  }
  return out;
}

const shift = (ring, cx, cy) => ring.map((q) => ({ ...q, u: q.u + cx, v: q.v + cy }));

function mount({ stage, svg, read }, value) {
  const bag = disposer();
  let rpm = value, mode = "rest", drawn = "", lifted = null;

  // Head-on to the pair, so subject and verb read left to right. Fitted to rest and the jam, the poses that hold;
  // the swap's top (z 27, one frame in a 700ms tween) still clears the frame's top by about 60.
  const C = Cam(0, 0.5, 2.25);
  const X0 = -OUT - M, X1 = D + OUT + M, Y = OUT + M;
  fit(C, [[X0, -Y, -PB], [X1, -Y, -PB], [X0, Y, -PB], [X1, Y, -PB], [0, -OUT, T], [0, -KR, T + KH], [D, -OUT, ZJ + T]], 200, 166);
  const P = proj(C), front = facing(C);

  const g = mk("g", {}, svg);
  const [br, bi] = rings(X0, -Y, X1, Y, 12, 2);
  put(solid(g), prism(P, front, br, bi, -PB, 0));
  const KINDS = [["bot", "sil"], ["wall", "fo"], ["top", "fo"], ["sil", "nf sil"], ["lo", "nf lo"], ["hi", "nf hi"]];
  const gear = () => {
    const el = {};
    for (const [k, cls] of KINDS) el[k] = mk("path", { class: cls }, g);
    return el;
  };
  const S = gear(), V = gear(), knob = solid(g), pVlo = solid(g), pVup = solid(g);
  const are = outline(12), is = outline(8);

  /** The verb gear's pin, the subject's crank knob, or nothing: a round solid at (cx, cy) from z0 to z1. */
  const pin = (el, cx, cy, r, z0, z1) =>
    put(el, z1 - z0 < 0.3 ? { sil: "", crease: "" } : prism(P, front, shift(circ(r, 28), cx, cy), shift(circ(r - 0.9, 28), cx, cy), z0, z1));

  /** Draws a gear turned by a about (cx, 0), its underside at zc under its centre and tilted tl per unit of x, its near side up. */
  function drawGear(el, ring, cx, a, zc, tl) {
    const c = Math.cos(a), s = Math.sin(a), n = ring.length;
    const w = ring.map(([u, v]) => [cx + u * c - v * s, u * s + v * c]);
    const zb = (x) => zc + tl * (cx - x);
    const lv = (dz) => (i) => P(w[i][0], w[i][1], zb(w[i][0]) + dz), top = lv(T), low = lv(LIP);
    const all = [...Array(n).keys()];
    let wall = "", sil = "", lo = "", hi = "";
    // walls and the crease where the edge faces the viewer; the silhouette where it faces away
    for (const { f, ids } of runs(n, (i) => { const b = w[(i + 1) % n]; return front({ nu: b[1] - w[i][1], nv: w[i][0] - b[0] }); })) {
      if (f) { wall += poly(ids.map(top).concat(ids.slice().reverse().map(low))); lo += open(ids.map(top)); }
      else sil += open(ids.map(top));
    }
    // the bright: every edge within CW of the contact point, (R, 0), whatever turns through it
    for (const { f, ids } of runs(n, (i) => { const b = w[(i + 1) % n]; return Math.hypot((w[i][0] + b[0]) / 2 - R, (w[i][1] + b[1]) / 2) < CW; }))
      if (f) hi += open(ids.map(top));
    const bore = [];
    for (let k = 0; k < 24; k++) { const x = cx + BR * Math.cos((TAU * k) / 24); bore.push(P(x, BR * Math.sin((TAU * k) / 24), zb(x) + T)); }
    el.bot.setAttribute("d", poly(all.map(lv(0))));
    el.wall.setAttribute("d", wall);
    el.top.setAttribute("d", poly(all.map(top)));
    el.sil.setAttribute("d", sil);
    el.lo.setAttribute("d", lo + poly(bore));
    el.hi.setAttribute("d", hi);
  }

  const sw = tween(0), ang = spring(0, { eps: 0.002 });
  /** Draws the swap at k (0 the matching verb gear seated, 1 the coarse one jammed) and the turn at ang.x. */
  function draw(k) {
    const key = k + " " + ang.x;
    if (key === drawn) return;
    drawn = key;
    // Meshed, both gears paint layer by layer, so a higher face covers a lower one; lifted, the verb gear paints after the subject.
    const up = k > 0.02;
    if (up !== lifted) {
      lifted = up;
      const L = KINDS.map((kc) => kc[0]);
      g.append(...(up
        ? L.map((kk) => S[kk]).concat(knob.g, pVlo.g, L.map((kk) => V[kk]), pVup.g)
        : L.flatMap((kk) => [S[kk], V[kk]]).concat(knob.g, pVlo.g, pVup.g)));
    }
    const a = ang.x, swapped = k >= 0.5, zc = lerp(0, ZJ, k) + LIFT * Math.sin(Math.PI * k);
    drawGear(S, are, 0, a, 0, 0);
    pin(knob, KR * Math.cos(K0 + a), KR * Math.sin(K0 + a), KN, T, T + KH);
    // matching: a gap faces the subject's tooth and it turns the other way; coarse: tooth on tooth, held still
    drawGear(V, swapped ? is : are, D, swapped ? Math.PI : Math.PI + PITCH / 2 - a, zc, lerp(0, TJ, k));
    pin(pVlo, D, 0, PR, 0, Math.min(PZ, zc));
    pin(pVup, D, 0, PR, Math.min(PZ, zc + T), PZ);
  }

  const B = register(stage, (dt, now) => {
    const k = tval(sw, now), turning = mode === "are" && k < 0.02 && !reducedMotion();
    if (turning) ang.t += ((rpm * TAU) / 60) * dt;
    const m = stepS(ang, dt);
    draw(k);
    return turning || m || !tdone(sw, now);
  });
  bag.add(B.unregister);
  draw(0);

  const xS = P(0, 0, T)[0], xV = P(D, 0, T)[0];
  const words = { rest: "rest", are: "they are", is: "they is · jams" };
  /** rest, are (the crank turns the meshed pair) or is (the coarse verb gear is swapped in and jams). */
  function choose(m) {
    if (m === mode) return;
    mode = m;
    tset(sw, m === "is" ? 1 : 0, performance.now(), 0);
    // stopping, the pair coasts on to the next whole tooth, so rest and the jam always meet tooth to tooth
    if (m !== "are") ang.t = Math.ceil(ang.t / PITCH - 1e-6) * PITCH;
    read.textContent = words[m];
    B.wake();
  }

  bag.add(pointer(stage, {
    move: (p) => choose(Math.abs(p[0] - xS) <= Math.abs(p[0] - xV) ? "are" : "is"),
    leave: () => choose("rest"),
  }));
  bag.add(() => svg.replaceChildren());

  return {
    set: (v) => { rpm = v; },
    destroy: bag.dispose,
  };
}

export default {
  name: "mesh",
  means: "Two equal gears, subject and verb: the matching verb meshes and both turn; the wrong one clashes and jams.",
  rules: [1, 4, 6, 8],
  range: [6, 12, 24],
  tour: [[133, 150], [268, 150], null],
  mount,
};
