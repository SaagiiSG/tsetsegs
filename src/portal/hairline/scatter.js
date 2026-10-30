import { HL } from './kernel.js';

/**
 * Scatter: a scatter plot as an object. A thin rounded plate with two axes,
 * their ticks and a faint grid; twelve pegs stand on it along a rising trend,
 * and a best-fit rod lies across their tops. The pointer slides the bright peg
 * up or down its column; the rod, refitted to the new data on a spring, tilts
 * and shifts about the points' centre. The slider is the reach, in grid units.
 *
 * The pattern: scrub. One spring for the peg, two for the rod; a hit test on
 * the plane of the peg tops, which never moves; a rest where the line fits.
 */
const {
  Cam, clamp, facing, fit, open, poly, prism, proj, rings, rrect, seg, unproj, spring, stepS,
  mk, pointer, put, register, disposer, solid,
} = HL;

// The data in plot units, 0 to 10 on both axes. The bright peg stands at XH, set on the others' fit at mount.
const XS = [1.0, 1.6, 2.2, 2.8, 3.4, 3.9, 4.5, 5.1, 5.8, 6.5, 7.3];
const YS = [2.35, 1.12, 3.39, 2.16, 1.69, 3.95, 3.43, 2.39, 4.91, 3.63, 5.08];
const XH = 9.4, S = 1.9, U = 9.5, O = 10 * U, M = 9, PB = 4, PR = 3.1, PH = 6, RR = 1.8, HALF = 3.9;

/** The least-squares line through the points: its slope and the centre it passes through. */
function ols(xs, ys) {
  const n = xs.length, mx = xs.reduce((a, b) => a + b) / n, my = ys.reduce((a, b) => a + b) / n;
  let sxy = 0, sxx = 0;
  xs.forEach((x, i) => { sxy += (x - mx) * (ys[i] - my); sxx += (x - mx) ** 2; });
  return { m: sxy / sxx, mx, my };
}

/** A rod of screen radius r from a to b: its round-ended outline, and a dim line along its upper side. */
function rodPaths(a, b, r) {
  const L = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1, ux = (b[0] - a[0]) / L, uy = (b[1] - a[1]) / L;
  const at = (c, t) => [c[0] + r * (Math.cos(t) * ux - Math.sin(t) * uy), c[1] + r * (Math.cos(t) * uy + Math.sin(t) * ux)];
  const pts = [];
  for (let k = 0; k <= 8; k++) pts.push(at(b, -Math.PI / 2 + (k * Math.PI) / 8));
  for (let k = 0; k <= 8; k++) pts.push(at(a, Math.PI / 2 + (k * Math.PI) / 8));
  const s = 0.42 * r * (ux > 0 ? -1 : 1); // toward the side of the rod that faces up on screen
  const off = (c, d) => [c[0] - uy * s + ux * d, c[1] + ux * s + uy * d];
  return { sil: poly(pts), crease: open([off(a, r), off(b, -r)]) };
}

function mount({ stage, svg, read }, value) {
  const bag = disposer();
  const lo = -M, hi = O + M;
  // Fitted to the plate with the rod on the pegs: the rod never leaves the plate, so nothing leaves the frame.
  const C = Cam(45, 0.5, S);
  fit(C, [[lo, lo, PH + 2 * RR], [hi, hi, -PB], [hi, lo, -PB], [lo, hi, -PB]], 200, 166);
  const P = proj(C), front = facing(C);
  const w = (u, v, z = 0) => P(O - v * U, O - u * U, z); // plot (u, v) to screen: the origin is the plate's nearest corner

  const f0 = ols(XS, YS), V0 = f0.my + f0.m * (XH - f0.mx), xs = XS.concat(XH), MX = ols(xs, xs).mx;
  let reach = value, want = V0, on = false;

  const g = mk("g", {}, svg);
  // the plate's corners are large on screen: more steps round each, so no facet shows
  const pr = rrect(lo, lo, hi, hi, 9, 10), pi = rrect(lo + 2, lo + 2, hi - 2, hi - 2, 7, 10);
  put(solid(g), prism(P, front, pr, pi, -PB, 0));
  let grid = "", axes = seg(w(0, 0), w(10.4, 0)) + seg(w(0, 0), w(0, 10.4));
  for (let k = 2; k <= 10; k += 2) {
    grid += seg(w(k, 0), w(k, 10)) + seg(w(0, k), w(10, k));
    axes += seg(w(k, 0), w(k, -0.45)) + seg(w(0, k), w(-0.45, k));
  }
  mk("path", { d: grid, class: "nf lo" }, g);
  mk("path", { d: axes, class: "nf" }, g);

  // Pegs, from the far corner to the near one (largest u + v first), so appending is painting back to front.
  const pegs = xs.map((u, i) => ({ u, v: i < XS.length ? YS[i] : V0 }));
  const H = pegs[pegs.length - 1];
  const order = pegs.slice().sort((a, b) => b.u + b.v - (a.u + a.v));
  order.forEach((p) => { p.el = solid(g); });
  const drawPeg = (p, v) => {
    const x = O - v * U, y = O - p.u * U, [ring, inner] = rings(x - PR, y - PR, x + PR, y + PR, PR, 0.8);
    put(p.el, prism(P, front, ring, inner, 0, PH));
  };
  pegs.forEach((p) => { if (p !== H) drawPeg(p, p.v); });
  H.el.sil.classList.add("hi");
  H.sp = spring(V0); H.drawn = NaN;

  // The bright peg moves along its column: keep it painted just after the last peg farther than it.
  const others = order.filter((p) => p !== H);
  let after = null;
  function placeH(v) {
    const prev = others.filter((p) => p.u + p.v > XH + v).pop();
    if (prev === after) return;
    after = prev;
    if (prev) prev.el.g.after(H.el.g); else others[0].el.g.before(H.el.g);
  }

  // The rod lies on the peg tops, painted last: nothing on the plate stands higher than it.
  const rod = solid(g), rm = spring(f0.m), ry = spring(ols(xs, YS.concat(V0)).my);
  let rodM = NaN, rodY = NaN;
  function drawRod() {
    if (rm.x === rodM && ry.x === rodY) return;
    rodM = rm.x; rodY = ry.x;
    const t = Math.atan(rodM), du = HALF * Math.cos(t), dv = HALF * Math.sin(t), z = PH + RR;
    put(rod, rodPaths(w(MX - du, rodY - dv, z), w(MX + du, rodY + dv, z), RR * S));
  }

  const B = register(stage, (dt) => {
    let moving = stepS(H.sp, dt);
    const f = ols(xs, YS.concat(H.sp.x));
    rm.t = f.m; ry.t = f.my;
    if (stepS(rm, dt)) moving = true;
    if (stepS(ry, dt)) moving = true;
    if (H.sp.x !== H.drawn) { H.drawn = H.sp.x; drawPeg(H, H.drawn); placeH(H.drawn); }
    drawRod();
    if (on) read.textContent = "slope " + rm.x.toFixed(2);
    return moving;
  });
  bag.add(B.unregister);

  function retarget() {
    H.sp.t = on ? clamp(clamp(want, V0 - reach, V0 + reach), 0.3, 9.7) : V0;
    B.wake();
  }
  bag.add(pointer(stage, {
    move: (p) => { on = true; want = (O - unproj(C, p[0], p[1], PH)[0]) / U; retarget(); },
    leave: () => { on = false; read.textContent = "rest"; retarget(); },
  }));
  bag.add(() => svg.replaceChildren());

  return {
    set: (v) => { reach = v; retarget(); },
    destroy: bag.dispose,
  };
}

export default {
  name: "scatter",
  means: "Twelve pegs on a plot and a best-fit rod across them: move one peg up or down and the line tilts to follow it.",
  rules: [1, 3, 5, 8],
  range: [2.5, 4, 5.5],
  tour: [[198, 104], [300, 155], [249, 129], null],
  mount,
};
