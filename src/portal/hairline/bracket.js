import { HL } from './kernel.js';

/**
 * Bracket: a long gauge bar, notched every tenth from empty to full, lying on
 * a plate, with a true-value pin standing on it. Above the gauge rides a
 * bracket: a bar with a short post hanging at each end of the margin, and a
 * square marker post standing on its middle, over the estimate, where a dashed
 * drop meets the gauge. Everything keeps to the gauge's centre line, so the
 * pin is inside exactly when it stands between the two hanging posts, and it
 * takes the bright stroke while it does. The bracket rides above the pin, so
 * nothing ever passes through it. The pointer's place along the gauge sets
 * the estimate, snapped to whole percents; the bracket travels with it on the
 * 700ms curve. At rest the estimate sits just short of the pin and the bracket
 * holds it. The slider is the margin, in percent.
 *
 * The pattern: a discrete setting. A tween, a hit test on the gauge's top
 * plane, which never moves, and a paint order that never changes: the pin
 * stands below every part of the bracket.
 */
const {
  Cam, clamp, facing, fit, prism, proj, rings, rrect, seg, unproj,
  tset, tval, tween, tdone, disposer, mk, pointer, put, register, solid,
} = HL;

const U = 1.9, GW = 7, GH = 6, PB = 3, TRUE = 50, REST = 47;
const RN = 1, HN = 8, RB = 3.2; // the pin: needle radius and height, head radius
const RC = 2.3, ZC = 16, ZB = 28, BW = 3, BT = 4, RM = 2.8, ZM = 52; // the bracket: hanging posts, bar, marker
const S = 1.95, X = (p) => (p - 50) * U, XE = 50 * U + 4, XP = XE + 6, YP = GW + 7;

/** The camera, fitted to the plate with the marker over either end of the gauge. */
function camera() {
  const C = Cam(45, 0.5, S);
  fit(C, [[-XP, -YP, -PB], [XP, YP, -PB], [XP, -YP, -PB], [-XP, YP, -PB], [X(0), 0, GH + ZM], [X(100), 0, GH + ZM]], 200, 166);
  return { C, P: proj(C), front: facing(C) };
}

/** A post with a rounded footprint centred on (x, 0), half-width r, corner radius cr, standing z0 to z1. */
function post(P, front, x, r, cr, b, z0, z1) {
  const [ring, inner] = rings(x - r, -r, x + r, r, cr, b);
  return prism(P, front, ring, inner, z0, z1);
}

function mount({ stage, svg, read }, value) {
  const bag = disposer();
  let m = Math.round(value);
  const { C, P, front } = camera();

  // Back to front: the plate, the gauge and its notches, the pin, then the bracket, which is above all of it.
  const g = mk("g", {}, svg);
  // the plate's corners are big enough on screen to need more steps than rings gives (rule 09)
  put(solid(g), prism(P, front, rrect(-XP, -YP, XP, YP, 8, 10), rrect(2 - XP, 2 - YP, XP - 2, YP - 2, 6, 10), -PB, 0));
  const [gr, gi] = rings(-XE, -GW, XE, GW, 3, 1.2);
  put(solid(g), prism(P, front, gr, gi, 0, GH));
  let ticks = "";
  for (let p = 0; p <= 100; p += 10) ticks += seg(P(X(p), GW - 1.2, GH), P(X(p), p % 50 ? 2.5 : -GW + 1.2, GH));
  mk("path", { d: ticks, class: "nf lo" }, g);

  const drop = mk("path", { class: "nf dash" }, g);
  const needle = mk("path", { class: "sil", d: post(P, front, X(TRUE), RN, RN, 0.3, GH, GH + HN + RB).sil }, g);
  const [hx, hy] = P(X(TRUE), 0, GH + HN + RB * 0.7);
  const head = mk("ellipse", { cx: hx, cy: hy, rx: RB * S, ry: RB * S, class: "sil" }, g);
  const capL = solid(g), capR = solid(g), bar = solid(g), mark = solid(g);

  const et = tween(REST);
  let drawn = "", lit = null;
  function draw(now) {
    const e = tval(et, now), key = e + "," + m;
    if (key === drawn) return;
    drawn = key;
    const xl = X(e - m), xe = X(e), xh = X(e + m);
    drop.setAttribute("d", seg(P(xe, 0, GH + ZB), P(xe, 0, GH)));
    put(capL, post(P, front, xl, RC, RC, 0.6, GH + ZC, GH + ZB));
    put(capR, post(P, front, xh, RC, RC, 0.6, GH + ZC, GH + ZB));
    const [br, bi] = rings(xl - BW, -BW, xh + BW, BW, BW, 0.8);
    put(bar, prism(P, front, br, bi, GH + ZB, GH + ZB + BT));
    put(mark, post(P, front, xe, RM, 1, 0.7, GH + ZB + BT, GH + ZM));
    // the pin lights while the bracket, where it is now, spans it
    const on = Math.abs(TRUE - e) <= m + 1e-6;
    if (on !== lit) { lit = on; needle.classList.toggle("hi", on); head.classList.toggle("hi", on); }
  }
  draw(performance.now());

  const loop = register(stage, (_dt, now) => { draw(now); return !tdone(et, now); });
  bag.add(loop.unregister);

  /** The estimate under a screen point, read on the gauge's top plane, which never moves. */
  const hit = ([sx, sy]) => clamp(Math.round(unproj(C, sx, sy, GH)[0] / U + 50), m, 100 - m);

  let cur = null;
  /** Moves the estimate to e (null is rest). */
  function choose(e) {
    cur = e;
    const t = e === null ? REST : e;
    tset(et, t, performance.now(), 0);
    read.textContent = e === null ? "rest"
      : `${t}% ± ${m} (${t - m} to ${t + m}), true value ${Math.abs(TRUE - t) <= m ? "inside" : "outside"}`;
    loop.wake();
  }
  read.textContent = "rest";

  bag.add(pointer(stage, { move: (p) => choose(hit(p)), leave: () => choose(null) }));
  bag.add(() => svg.replaceChildren());

  return {
    set: (v) => { m = Math.round(v); if (cur !== null) choose(clamp(cur, m, 100 - m)); drawn = ""; loop.wake(); },
    destroy: bag.dispose,
  };
}

export default {
  name: "bracket",
  means: "An estimate on a gauge, with a bracket for its margin of error: the true-value pin lights while the bracket spans it.",
  rules: [1, 4, 5, 8],
  range: [3, 6, 10],
  tour: [[213, 201], [148, 168], [258, 223], null],
  mount,
};
