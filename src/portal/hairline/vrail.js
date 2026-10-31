import { HL } from './kernel.js';

/**
 * V-rail: a grid plate with a V-shaped rail standing on it along y = |x − 1|,
 * and a level bar laid across the rail. The pointer sets the bar's height,
 * snapped to whole units and read on the bar's own top plane, which never
 * moves. Where the bar crosses the V a bright ring sits on it: two above the
 * tip, one at the tip, none below. Each ring rides its arm on its own 700ms
 * tween; the one on the pointer's side leads and its twin follows. At rest the
 * bar lies at height 2, across both arms. The slider is that follow, in ms.
 *
 * The plate is turned square to the viewer and its y unit is twice its x unit
 * in the world, so on screen a cell is square and the V's arms rise at 45°.
 */
const {
  Cam, clamp, facing, fit, lerp, open, poly, prism, proj, rrect, seg, unproj,
  tween, tset, tval, tdone, mk, pointer, put, register, disposer, solid,
} = HL;

const U = 12, UY = 24, XA = -4, XB = 6, Y0 = -2, Y1 = 5, MW = 8, PB = 4, TIP = 1, ARM = 4.65;
const RW = 2.4, RH = 4, RB = 0.7, BW = 2.6, BH = 3.4, ZB = RH + BH, RR = 5.5;
const CMIN = -1, CMAX = 3, REST = 2, R2 = Math.SQRT1_2;

/** Local (u, v), world units along the graph's x and y, to world: x runs across the screen, y away. It is its own inverse. */
const L = (u, v) => [(u - v) * R2, (-u - v) * R2];
const turn = (ring) => ring.map((s) => { const [u, v] = L(s.u, s.v), [nu, nv] = L(s.nu, s.nv); return { ...s, u, v, nu, nv }; });
const G = (gx, gy) => L(gx * U, gy * UY);
const num = (n) => (n < 0 ? "−" + -n : String(n));
const say = (c) => (c > 0 ? `x = ${TIP + c} or ${num(TIP - c)}` : c === 0 ? `x = ${TIP}` : "no answer");

/** The V's centre line in local units, left end to right end. The tip turns on a radius just over the rail's half-width, so its inner side keeps a corner without folding. */
function vline() {
  const d = Math.hypot(U, UY), sn = U / d, cs = UY / d, rc = RW * 1.25, cv = rc / sn, tt = (rc * cs * cs) / (sn * UY);
  const out = [];
  for (let k = 0; k <= 8; k++) { const t = lerp(ARM, tt, k / 8); out.push([(TIP - t) * U, t * UY]); }
  const a0 = Math.atan2(tt * UY - cv, -rc * cs), a1 = Math.atan2(tt * UY - cv, rc * cs);
  for (let k = 1; k < 14; k++) { const a = lerp(a0, a1, k / 14); out.push([TIP * U + rc * Math.cos(a), cv + rc * Math.sin(a)]); }
  for (let k = 0; k <= 8; k++) { const t = lerp(tt, ARM, k / 8); out.push([(TIP + t) * U, t * UY]); }
  return out;
}

function mount({ stage, svg, read }, value) {
  const bag = disposer();
  let stag = value;
  const x0 = XA * U - MW, x1 = XB * U + MW, y0 = Y0 * UY - MW, y1 = Y1 * UY + MW;
  const C = Cam(45, 0.5, 2.2);
  fit(C, [[...L(x0, y0), -PB], [...L(x1, y0), -PB], [...L(x0, y1), 0], [...L(x1, y1), 0]], 200, 166);
  const P = proj(C), front = facing(C);
  const at = (gx, gy, z = 0) => P(...G(gx, gy), z);
  const o = P(0, 0, 0), dv = (q) => [q[0] - o[0], q[1] - o[1]];
  const ex = dv(P(1, 0, 0)), ey = dv(P(0, 1, 0)), ez = dv(P(0, 0, 1));

  // The plate, its ruling and its two axes; then the V, the bar laid on it, and the rings on the bar.
  const g = mk("g", {}, svg);
  put(solid(g), prism(P, front, turn(rrect(x0, y0, x1, y1, 10, 14)), turn(rrect(x0 + 2.2, y0 + 2.2, x1 - 2.2, y1 - 2.2, 7.8, 14)), -PB, 0));
  let grid = "";
  for (let i = XA + 1; i < XB; i++) if (i) grid += seg(at(i, Y0), at(i, Y1));
  for (let j = Y0 + 1; j < Y1; j++) if (j) grid += seg(at(XA, j), at(XB, j));
  mk("path", { d: grid, class: "nf lo" }, g);
  mk("path", { d: seg(at(0, Y0), at(0, Y1)) + seg(at(XA, 0), at(XB, 0)), class: "nf" }, g);
  const vee = solid(g), bar = solid(g), rings = [0, 1].map(() => mk("path", { class: "hi" }, g));

  /** The screen offset, from the foot of the rail's centre, of its cross-section's farthest point along n: a disc of radius r, lifted to RH when n looks up. */
  function reach(n, r, lift) {
    const dx = n[0] * ex[0] + n[1] * ex[1], dy = n[0] * ey[0] + n[1] * ey[1], m = Math.hypot(dx, dy) || 1;
    const up = lift && n[0] * ez[0] + n[1] * ez[1] > 0 ? RH : 0;
    return [(r * (dx * ex[0] + dy * ey[0])) / m + up * ez[0], (r * (dx * ex[1] + dy * ey[1])) / m + up * ez[1]];
  }
  const add = (p, v) => [p[0] + v[0], p[1] + v[1]];

  /** The rail along screen points c, left end to right end: {sil, crease}, as prism gives. */
  function rail(c) {
    const n = c.length, out = [], inn = [], cr = [];
    const nrm = c.map((_, i) => {
      const p = c[Math.max(0, i - 1)], q = c[Math.min(n - 1, i + 1)], m = Math.hypot(q[0] - p[0], q[1] - p[1]) || 1;
      return [-(q[1] - p[1]) / m, (q[0] - p[0]) / m]; // the outer side: down on screen at the tip
    });
    const cap = (p, nn) => {
      const a0 = Math.atan2(nn[1], nn[0]), r = [];
      for (let j = 0; j <= 10; j++) r.push(add(p, reach([Math.cos(a0 - (Math.PI * j) / 10), Math.sin(a0 - (Math.PI * j) / 10)], RW, true)));
      return r;
    };
    c.forEach((p, i) => {
      const m = nrm[i];
      out.push(add(p, reach(m, RW, true)));
      inn.push(add(p, reach([-m[0], -m[1]], RW, true)));
      cr.push(add(add(p, reach(m, RW - RB, false)), [RH * ez[0], RH * ez[1]]));
    });
    const sil = out.concat(cap(c[n - 1], nrm[n - 1]), inn.reverse(), cap(c[0], [-nrm[0][0], -nrm[0][1]]));
    return { sil: poly(sil), crease: open(cr) };
  }
  put(vee, rail(vline().map(([u, v]) => P(...L(u, v), 0))));

  /** The bar at height h: a rounded beam across the plate, lying on the V's top. */
  function drawBar(h) {
    const v = h * UY, u0 = XA * U - 4, u1 = XB * U + 4, b = 0.9;
    put(bar, prism(P, front, turn(rrect(u0, v - BW, u1, v + BW, BW, 6)), turn(rrect(u0 + b, v - BW + b, u1 - b, v + BW - b, BW - b, 6)), RH, ZB));
  }
  /** Ring i (0 left, 1 right) where its arm meets height h; below the tip it shrinks into it and is gone half a unit down. */
  function drawRing(i, h) {
    const k = clamp(1 + 2 * h, 0, 1), y = Math.max(h, 0);
    if (k < 0.05) { rings[i].setAttribute("d", ""); return; }
    const [cx, cy] = G(TIP + (i ? y : -y), y), pts = [];
    for (let a = 0; a < 24; a++) pts.push(P(cx + RR * k * Math.cos((a * Math.PI) / 12), cy + RR * k * Math.sin((a * Math.PI) / 12), ZB));
    rings[i].setAttribute("d", poly(pts));
  }

  const hb = tween(REST), hr = [tween(REST), tween(REST)];
  let drawn = "";
  function draw(b, r0, r1) {
    const key = [b, r0, r1].join();
    if (key === drawn) return;
    drawn = key;
    drawBar(b); drawRing(0, r0); drawRing(1, r1);
  }
  draw(REST, REST, REST);

  const B = register(stage, (_dt, now) => {
    draw(tval(hb, now), tval(hr[0], now), tval(hr[1], now));
    return !tdone(hb, now) || !tdone(hr[0], now) || !tdone(hr[1], now);
  });
  bag.add(B.unregister);

  let near = 1;
  /** Sets the bar to the whole height under p, read on the bar's top plane, which never moves; null sends it to rest. The ring on the pointer's side leads. */
  function aim(p) {
    let c = REST;
    if (p) {
      const [u, v] = L(...unproj(C, p[0], p[1], ZB));
      c = clamp(Math.round(v / UY), CMIN, CMAX);
      near = u / U < TIP ? 0 : 1;
    }
    const now = performance.now();
    tset(hb, c, now, 0);
    tset(hr[near], c, now, 0);
    tset(hr[1 - near], c, now, stag);
    read.textContent = p ? say(c) : "rest";
    B.wake();
  }
  read.textContent = "rest";

  bag.add(pointer(stage, { move: aim, leave: () => aim(null) }));
  bag.add(() => svg.replaceChildren());

  return {
    set: (v) => { stag = v; },
    destroy: bag.dispose,
  };
}

export default {
  name: "vrail",
  means: "A level bar laid across a V-shaped rail: above the tip it meets the V twice, at the tip once, and below the tip not at all.",
  rules: [1, 4, 5, 8],
  range: [0, 45, 90],
  tour: [[279, 108], [213, 188], [200, 214], null],
  mount,
};
