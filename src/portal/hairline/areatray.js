import { HL } from './kernel.js';

/**
 * Area tray: a shallow rounded tray three units deep and six long, split by a
 * sliding divider into two wells, with one dot on its floor for each unit
 * square. The tray is a(b + c); each well is one of ab and ac. The pointer's
 * column sets the divider just past it, so the well under the pointer is the
 * one it is building; that well's rim goes bright and its dots light up column
 * by column, outwards from the pointer. At rest the divider stands at 4 of 6
 * and its grip is the bright mark. The slider is the stagger between columns, in ms.
 *
 * The pattern: one of many. The divider's place is a choice, so tweens; the hit
 * test is the pointer's column on the rim plane, which never moves.
 */
const {
  Cam, clamp, facing, fit, hull, open, poly, prism, proj, rings, ringAt, rrect, run, unproj,
  tdone, tset, tval, tween, disposer, flatDot, mk, place, pointer, put, register, solid,
} = HL;

// U a unit square; NA rows (a), NB columns (b + c); WT wall, WH rim height, ZF floor, DT divider; G* the grip.
const U = 18, NA = 3, NB = 6, L = NB * U, A = NA * U, WT = 3, WH = 5, ZF = 1, R = 6, DT = 3, REST = 4;
const GW = 4.4, GL = 11, GH = 3.5;
/** Twice the signed area of a screen polygon: its sign is its winding. */
const wind = (pts) => pts.reduce((s, p, i) => { const q = pts[(i + 1) % pts.length]; return s + p[0] * q[1] - q[0] * p[1]; }, 0);
/** A closed path wound against `sign`, so the default fill rule cuts it out of a path wound with `sign`. */
const hole = (pts, sign) => poly(Math.sign(wind(pts)) === sign ? pts.slice().reverse() : pts);

function mount({ stage, svg, read }, value) {
  const bag = disposer();
  let stag = value;

  // The tray never moves and the grip stays below its far rim, so the tray is the whole box.
  const C = Cam(45, 0.5, 2.27);
  fit(C, [[-WT, -WT, 0], [L + WT, A + WT, 0], [L + WT, -WT, 0], [-WT, A + WT, 0], [-WT, -WT, WH], [L + WT, -WT, WH], [-WT, A + WT, WH]], 200, 166);
  const P = proj(C), front = facing(C), back = (q) => !front(q);
  const outer = rrect(-WT, -WT, L + WT, A + WT, R, 6);
  const body = hull(ringAt(P, outer, 0).concat(ringAt(P, outer, WH))), sign = Math.sign(wind(body));

  // Back to front: the tray's ground, the floor seen through the wells, the rim with the wells cut out, then the strokes.
  const g = mk("g", {}, svg);
  mk("path", { d: poly(body), class: "fo" }, g);
  const seams = [mk("path", { class: "nf lo" }, g), mk("path", { class: "nf lo" }, g)];
  const dots = [];
  for (let i = 0; i < NB; i++) for (let j = 0; j < NA; j++) {
    const el = flatDot(g, C, 1, "dot off");
    place(el, P((i + 0.5) * U, (j + 0.5) * U, ZF));
    dots.push({ i, el, t: tween(0), on: false });
  }
  const cover = mk("path", { class: "fo" }, g);
  mk("path", { d: open(ringAt(P, run(outer, front), WH)), class: "nf lo" }, g);
  const wells = [mk("path", { class: "nf" }, g), mk("path", { class: "nf" }, g)];
  mk("path", { d: poly(body), class: "nf sil" }, g);
  const grip = solid(g);
  grip.sil.classList.add("hi");

  /** The divider at x units: both wells, their floor seams, the rim between them, and the grip on top. */
  function drawDivider(x) {
    const c = x * U, tops = [];
    [rrect(0, 0, c - DT / 2, A, R - WT, 6), rrect(c + DT / 2, 0, L, A, R - WT, 6)].forEach((ring, k) => {
      const top = ringAt(P, ring, WH);
      tops.push(top);
      wells[k].setAttribute("d", poly(top));
      seams[k].setAttribute("d", open(ringAt(P, run(ring, back), ZF)));
    });
    cover.setAttribute("d", poly(body) + hole(tops[0], sign) + hole(tops[1], sign));
    const [gr, gi] = rings(c - GW / 2, A / 2 - GL / 2, c + GW / 2, A / 2 + GL / 2, 2, 0.8);
    put(grip, prism(P, front, gr, gi, WH, WH + GH));
  }

  const dv = tween(REST);
  let drawn = NaN;
  const B = register(stage, (_dt, now) => {
    const x = tval(dv, now);
    if (x !== drawn) { drawn = x; drawDivider(x); }
    let moving = !tdone(dv, now);
    for (const d of dots) {
      const on = tval(d.t, now) > 0.5;
      if (on !== d.on) { d.on = on; d.el.classList.toggle("off", !on); }
      if (!tdone(d.t, now)) moving = true;
    }
    return moving;
  });
  bag.add(B.unregister);

  // The pointer's column on the rim plane, which never moves; -1 off the tray.
  function hit([sx, sy]) {
    const [x, y] = unproj(C, sx, sy, WH), m = WT + 8;
    if (x < -m || x > L + m || y < -m || y > A + m) return -1;
    return clamp(Math.floor(x / U), 0, NB - 1);
  }

  let act = -1;
  /** Column k sets the divider just past it (the last column can only sit in the right well); -1 puts it back. */
  function choose(k) {
    if (k === act) return;
    act = k;
    const now = performance.now(), d = k < 0 ? REST : Math.min(k + 1, NB - 1), right = k >= d;
    tset(dv, d, now, 0);
    wells[0].classList.toggle("hi", k >= 0 && !right);
    wells[1].classList.toggle("hi", k >= 0 && right);
    grip.sil.classList.toggle("hi", k < 0);
    for (const t of dots) tset(t.t, k >= 0 && (t.i < d) !== right ? 1 : 0, now, Math.abs(t.i - Math.max(k, 0)) * stag);
    read.textContent = k < 0 ? "rest" : `${NA}(${d} + ${NB - d}) = ${NA * d} + ${NA * (NB - d)}`;
    B.wake();
  }

  bag.add(pointer(stage, { move: (p) => choose(hit(p)), leave: () => choose(-1) }));
  bag.add(() => svg.replaceChildren());

  return {
    set: (v) => { stag = v; },
    destroy: bag.dispose,
  };
}

export default {
  name: "areatray",
  means: "One tray, two wells: slide the divider and the same height times the whole splits into two areas, a(b + c) = ab + ac.",
  rules: [1, 2, 4, 8],
  range: [0, 40, 90],
  tour: [[186, 154], [215, 168], [272, 197], null],
  mount,
};
