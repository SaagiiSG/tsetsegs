import { HL } from './kernel.js';

/**
 * Sector: a pie on a round plate, one slice lifted out of it. The slice's
 * right cut stays put; the pointer's direction from the centre, read on the
 * pie's top (which never moves), sets where its left cut falls, snapped to 30°
 * steps from 30° to 180°. The slice widens there on the 700ms tween, the gap
 * in the pie widens with it, and the slice's outer arc is the one bright
 * stroke. At rest the slice is 60°. The slider is how far the slice is pulled
 * out.
 *
 * The slice always holds the viewer's direction (45°), so its own cut faces
 * turn away and the pie's cut faces, in the gap, face the viewer: plate, pie,
 * slice is back to front in every pose. The pie is not convex, so its
 * silhouette is walked edge by edge instead of taken as a hull.
 */
const {
  Cam, circ, clamp, facing, fillet, fit, open, poly, prism, proj, rad, unproj,
  tdone, tset, tval, tween, disposer, mk, pointer, put, register, solid,
} = HL;

const R = 60, H = 18, RD = 88, PB = 4, LIFT = 4, CUT = 40, REST = 60, B = 1.8;
const FR = { 30: "1/12", 60: "1/6", 90: "1/4", 120: "1/3", 150: "5/12", 180: "1/2" };

/** The footprint of the wedge from a1 to a2 degrees (ccw), radius r, every edge moved in by b, tip and rim corners rounded. */
function wedge(a1, a2, r, b, rTip, rRim) {
  const g = rad(a2 - a1) / 2, c = rad(a1 + a2) / 2, t = Math.atan2(b, Math.sqrt((r - b) ** 2 - b ** 2));
  const A1 = rad(a1) + t, A2 = rad(a2) - t, n = Math.ceil((A2 - A1) / rad(3));
  const pts = [[(Math.cos(c) * b) / Math.sin(g), (Math.sin(c) * b) / Math.sin(g)]];
  for (let k = 0; k <= n; k++) { const a = A1 + ((A2 - A1) * k) / n; pts.push([(r - b) * Math.cos(a), (r - b) * Math.sin(a)]); }
  const f = fillet(pts, pts.map((_, k) => (k === 0 ? rTip : k === 1 || k === n + 1 ? rRim : 0)));
  return f.filter((p, k) => k === 0 || Math.hypot(p[0] - f[k - 1][0], p[1] - f[k - 1][1]) > 1e-6);
}

/** For each edge of a screen polygon: whether the polygon lies above it, so the side standing on it faces the viewer. */
function facingEdges(s) {
  let a = 0;
  s.forEach((p, i) => { const q = s[(i + 1) % s.length]; a += p[0] * q[1] - q[0] * p[1]; });
  return s.map((p, i) => Math.sign(a) * (s[(i + 1) % s.length][0] - p[0]) < 0);
}

/**
 * A piece of pie standing on footprint `foot` from z0 to z1, moved by mv: its silhouette walks the footprint,
 * on the floor where a side faces the viewer and on the top where it does not; the crease is the facing top
 * edges of `inner`.
 */
function slab(P, foot, inner, z0, z1, mv) {
  const at = (pts, z) => pts.map(([x, y]) => P(x + mv[0], y + mv[1], z));
  const b = at(foot, z0), t = at(foot, z1), low = facingEdges(b), n = b.length, sil = [];
  for (let i = 0; i < n; i++) {
    const was = low[(i + n - 1) % n], is = low[i];
    sil.push(was ? b[i] : t[i]);
    if (was !== is) sil.push(is ? b[i] : t[i]);
  }
  if (!inner) return { sil: poly(sil), crease: "" };
  const ti = at(inner, z1), il = facingEdges(ti), m = ti.length, k0 = il.indexOf(false);
  let crease = "", run = [];
  for (let j = 1; j <= m; j++) {
    const i = (k0 + j) % m;
    if (il[i]) { if (!run.length) run.push(ti[i]); run.push(ti[(i + 1) % m]); }
    else if (run.length) { crease += open(run); run = []; }
  }
  return { sil: poly(sil), crease };
}

function mount({ stage, svg, read }, value) {
  const bag = disposer();
  let out = value, sel = -1;

  const dish = circ(RD, 120), top = circ(R, 60);
  const C = Cam(45, 0.5, 1.7);
  fit(C, dish.flatMap((q) => [[q.u, q.v, 0], [q.u, q.v, -PB]]).concat(top.map((q) => [q.u, q.v, H + LIFT])), 200, 166);
  const P = proj(C), front = facing(C);

  // back to front: the plate, the pie, the slice, the slice's arc
  const g = mk("g", {}, svg);
  put(solid(g), prism(P, front, dish, circ(RD - 2.2, 120), -PB, 0));
  const pie = solid(g), slice = solid(g), arc = mk("path", { class: "nf hi" }, g);

  let drawn = NaN, drawnOut = NaN;
  function draw(th) {
    if (th === drawn && out === drawnOut) return;
    drawn = th; drawnOut = out;
    const a2 = CUT + th, f = rad(CUT + th / 2), mv = [out * Math.cos(f), out * Math.sin(f)];
    put(pie, slab(P, wedge(a2, CUT + 360, R, 0, 2, 2.5), wedge(a2, CUT + 360, R, B, 2, 1.5), 0, H, [0, 0]));
    put(slice, slab(P, wedge(CUT, a2, R, 0, 1.5, 2.5), null, LIFT, H + LIFT, mv));
    // the crust edge of the slice, end to end: the arc whose share of the circle the read-out gives
    const e = 2.5 / R, n = Math.ceil(th / 3), pts = [];
    for (let k = 0; k <= n; k++) {
      const a = rad(CUT) + e + ((rad(th) - 2 * e) * k) / n;
      pts.push(P(R * Math.cos(a) + mv[0], R * Math.sin(a) + mv[1], H + LIFT));
    }
    arc.setAttribute("d", open(pts));
  }

  const tw = tween(REST);
  const L = register(stage, (_dt, now) => { draw(tval(tw, now)); return !tdone(tw, now); });
  bag.add(L.unregister);
  draw(REST);
  read.textContent = "rest";

  /** Cuts a slice of th degrees (-1 is rest). */
  function choose(th) {
    if (th === sel) return;
    sel = th;
    tset(tw, th < 0 ? REST : th, performance.now(), 0);
    read.textContent = th < 0 ? "rest" : `arc ${FR[th]} (${th}°)`;
    L.wake();
  }

  bag.add(pointer(stage, {
    move: (p) => {
      const [x, y] = unproj(C, p[0], p[1], H);
      if (Math.hypot(x, y) < 8) return; // too near the centre to say a direction
      const d = ((Math.atan2(y, x) * 180) / Math.PI - CUT + 720) % 360;
      choose(d > 270 ? 30 : d > 180 ? 180 : clamp(Math.round(d / 30) * 30, 30, 180));
    },
    leave: () => choose(-1),
  }));
  bag.add(() => svg.replaceChildren());

  return {
    set: (v) => { out = v; L.wake(); },
    destroy: bag.dispose,
  };
}

export default {
  name: "sector",
  means: "A pie on a plate with one slice lifted out: the pointer widens the slice in 30° steps, and its bright arc is that share of the circle.",
  rules: [1, 4, 5, 6, 8],
  range: [6, 14, 22],
  tour: [[122, 144], [193, 102], [167, 176], null],
  mount,
};
