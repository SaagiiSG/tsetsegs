import { HL } from './kernel.js';

/**
 * Numrail: a number line built as a long bar, pointed at both ends and notched
 * at every whole number, with a bead sitting on it at the boundary. From the
 * bead out to one pointed end the rail is raised, notches and all: that is the
 * solution set. The pointer's place along the rail sets the boundary, snapped
 * to a notch, and the half of the rail it is in sets the side; in front of the
 * rail the bead is a ring (strict), behind it a solid puck. The bead slides,
 * the raised part stretches or shrinks behind it, and when the side changes one
 * part sinks as the other rises. At rest the bead sits at −1, solid, with the
 * rail raised to the right. The slider is how far the raised part stands.
 *
 * The pattern: discrete settings. Tweens, and a hit test on the rail's top
 * plane, which never moves.
 */
const {
  Cam, clamp, facing, fillet, fit, poly, prism, proj, ringAt, rrect, seg, unproj,
  tset, tval, tween, tdone, disposer, mk, pointer, put, register, solid,
} = HL;

const UN = 22, NB = 4, BMAX = 3, RW = 14, RH = 7, T = 14, XT = NB * UN + 6 + T;
const KI = 1.5, KW = RW - KI, G = 1.2, BR = 12, BH = 16, HR = 7, CB = 1.4, SMAX = 12;
const TAN = RW / T, SIN = RW / Math.hypot(RW, T), KT = XT - KI / SIN;
const REST = { b: -1, side: 1, strict: false };
const num = (n) => (n < 0 ? "−" + -n : String(n));
const say = (s) => `x ${s.side > 0 ? (s.strict ? ">" : "≥") : s.strict ? "<" : "≤"} ${num(s.b)}`;

/** A footprint from x0 to x1, half-width w, each end square or pointed (its tip then at x0 or x1), rounded, as a ring of samples with outward normals. */
function foot(x0, x1, w, pl, pr) {
  const s = w / TAN, pts = [], r = [];
  const add = (x, y, rr) => { pts.push([x, y]); r.push(rr); };
  if (pl) add(x0, 0, 3), add(x0 + s, -w, 4); else add(x0, -w, 1.5);
  if (pr) add(x1 - s, -w, 4), add(x1, 0, 3), add(x1 - s, w, 4); else add(x1, -w, 1.5), add(x1, w, 1.5);
  if (pl) add(x0 + s, w, 4); else add(x0, w, 1.5);
  const f = fillet(pts, r), n = f.length;
  // counter-clockwise on the ground, so the outward normal is the tangent turned clockwise
  return f.map((p, i) => {
    const a = f[(i + n - 1) % n], b = f[(i + 1) % n], tx = b[0] - a[0], ty = b[1] - a[1], m = Math.hypot(tx, ty) || 1;
    return { u: p[0], v: p[1], nu: ty / m, nv: -tx / m };
  });
}
/** A solid from x0 to x1 standing z0 to z1, with its crease inset by CB. */
const bar = (P, front, x0, x1, w, pl, pr, z0, z1) =>
  prism(P, front, foot(x0, x1, w, pl, pr), foot(x0 + (pl ? CB / SIN : CB), x1 - (pr ? CB / SIN : CB), w - CB, pl, pr), z0, z1);
/** Notches at the whole numbers strictly between x0 and x1, across the top at z and down the front. */
function notches(P, x0, x1, w, z) {
  let d = "";
  for (let i = -NB; i <= NB; i++) if (i * UN > x0 + 3 && i * UN < x1 - 3) d += seg(P(i * UN, 3 - w, z), P(i * UN, w - 3, z)) + seg(P(i * UN, w, z), P(i * UN, w, z - 2.6));
  return d;
}

function mount({ stage, svg, read }, value) {
  const bag = disposer();
  let sh = value;

  // Fitted to the rail with the bead at either end of its reach and both pointed ends raised as far as the slider goes.
  const C = Cam(45, 0.5, 2.0);
  fit(C, [[-XT, 0, 0], [XT, 0, 0], [XT - T, -RW, 0], [XT - T, RW, 0], [T - XT, -RW, 0], [T - XT, RW, 0],
    [-BMAX * UN - BR, -BR, RH + BH], [BMAX * UN + BR, BR, RH + BH], [T - XT, -KW, RH + SMAX], [XT - T, KW, RH + SMAX]], 200, 166);
  const P = proj(C), front = facing(C);

  // Back to front: the rail and its notches, the raised part behind the bead, the bead, the raised part in front of it.
  const g = mk("g", {}, svg);
  put(solid(g), bar(P, front, -XT, XT, RW, true, true, 0, RH));
  mk("path", { d: notches(P, -XT, XT, RW, RH), class: "nf lo" }, g);
  const sides = [-1, 1].map((side) => ({ side, t: tween(side === REST.side ? 1 : 0) }));
  const mkSide = (s) => { s.el = solid(g); s.marks = mk("path", { class: "nf lo" }, s.el.g); };
  mkSide(sides[0]);
  const bead = solid(g), hole = mk("path", { class: "nf hi" }, bead.g);
  bead.sil.classList.add("hi");
  mkSide(sides[1]);

  const bt = tween(REST.b * UN), ht = tween(REST.strict ? HR : 0);
  let drawn = "";
  function draw(now) {
    const bx = tval(bt, now), hr = tval(ht, now), hs = sides.map((s) => tval(s.t, now) * sh);
    const key = [bx, hr, ...hs].join();
    if (key === drawn) return;
    drawn = key;
    // each raised part ends where the bead stands, so it lies wholly behind the bead or wholly in front (rule 06)
    sides.forEach((s, i) => {
      const x0 = s.side < 0 ? -KT : bx + BR + G, x1 = s.side < 0 ? bx - BR - G : KT, h = hs[i];
      if (h < 0.3) { put(s.el, { sil: "", crease: "" }); s.marks.setAttribute("d", ""); return; }
      put(s.el, bar(P, front, x0, x1, KW, s.side < 0, s.side > 0, RH, RH + h));
      s.marks.setAttribute("d", notches(P, x0, x1, KW, RH + h));
    });
    put(bead, prism(P, front, rrect(bx - BR, -BR, bx + BR, BR, BR, 12), rrect(bx - BR + CB, CB - BR, bx + BR - CB, BR - CB, BR - CB, 12), RH, RH + BH));
    hole.setAttribute("d", hr < 0.3 ? "" : poly(ringAt(P, rrect(bx - hr, -hr, bx + hr, hr, hr, 8), RH + BH)));
  }
  draw(performance.now());

  const loop = register(stage, (_dt, now) => {
    draw(now);
    return !tdone(bt, now) || !tdone(ht, now) || sides.some((s) => !tdone(s.t, now));
  });
  bag.add(loop.unregister);

  /** The setting under a screen point, read on the rail's top plane, which never moves. */
  function hit([sx, sy]) {
    const [x, y] = unproj(C, sx, sy, RH);
    return { b: clamp(Math.round(x / UN), -BMAX, BMAX), side: x < 0 ? -1 : 1, strict: y > 0 };
  }

  let cur = "";
  /** Sets the boundary, the side and the kind of bead (null is rest). */
  function choose(s) {
    const id = s ? say(s) : "rest";
    if (id === cur) return;
    cur = id;
    const t = s || REST, now = performance.now();
    tset(bt, t.b * UN, now, 0);
    tset(ht, t.strict ? HR : 0, now, 0);
    sides.forEach((k) => tset(k.t, k.side === t.side ? 1 : 0, now, 0));
    read.textContent = id;
    loop.wake();
  }
  read.textContent = "rest";

  bag.add(pointer(stage, { move: (p) => choose(hit(p)), leave: () => choose(null) }));
  bag.add(() => svg.replaceChildren());

  return {
    set: (v) => { sh = v; drawn = ""; loop.wake(); },
    destroy: bag.dispose,
  };
}

export default {
  name: "numrail",
  means: "A number line with a bead at the boundary, raised from the bead to one end. A ring leaves the boundary out; a puck keeps it in.",
  rules: [1, 4, 6, 8],
  range: [4, 8, 12],
  tour: [[305, 211], [158, 160], [220, 191], null],
  mount,
};
