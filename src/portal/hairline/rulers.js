import { HL } from './kernel.js';

/**
 * Rulers: two rulers lying side by side on a plate, ticked along the edge
 * where they meet. The bottom ruler is fixed; the top one slides, and its
 * ticks re-space. Where a top tick meets a bottom tick, the pair takes the
 * bright stroke: that is a solution. The pointer's third of the rulers picks
 * one of three settings: left, a different spacing, so the ticks meet once;
 * middle, the same spacing and flush, so they meet everywhere; right, the same
 * spacing slid half a step, so they never meet. At rest the top ruler lies a
 * little apart, meeting once. The slider is the stagger between ticks, in ms.
 *
 * The pattern: discrete settings. Tweens, a stagger by distance from the
 * pointer's tick, and a hit test on three fixed bands of the rulers' top plane.
 */
const {
  Cam, clamp, facing, fit, prism, proj, rings, rrect, seg, tdone, tset, tval, tween, unproj,
  disposer, mk, pointer, put, register, solid,
} = HL;

const LEN = 128, WD = 30, TH = 4, R = 4, B = 1.4, D = 32, N = 4, TL = 19, IN = 1.4;
const PM = 7, PT = 4, PR = 9, REST_GAP = 6, GAP = 1.5;
const BOT = Array.from({ length: N }, (_, j) => D / 2 + D * j); // the bottom ruler's ticks, which never move
// the three settings: the top ruler's offset along x, and the spacing of its ticks
const SET = [
  { off: -D / 6, step: (2 * D) / 3, say: "one solution" },
  { off: 0, step: D, say: "always: infinitely many" },
  { off: D / 2, step: D, say: "never: no solution" },
];
/** Tick k's place along the top ruler, its ticks centred on it. */
const loc = (k, step) => LEN / 2 + (k - (N - 1) / 2) * step;

function mount({ stage, svg, read }, value) {
  const bag = disposer();
  let stag = value;

  // Fitted to the plate, which holds the top ruler at both ends of its slide.
  const X0 = SET[0].off - PM, X1 = LEN + SET[2].off + PM, Y0 = -REST_GAP - WD - PM, Y1 = WD + PM;
  const C = Cam(45, 0.5, 1.9);
  fit(C, [[X0, Y0, -PT], [X1, Y1, -PT], [X1, Y0, -PT], [X0, Y1, -PT], [X0, Y0, TH], [X1, Y0, TH]], 200, 166);
  const P = proj(C), front = facing(C);

  const g = mk("g", {}, svg);
  // the plate's corners are large on screen, so they take more steps than rings gives (rule 09)
  put(solid(g), prism(P, front, rrect(X0, Y0, X1, Y1, PR, 10), rrect(X0 + 2, Y0 + 2, X1 - 2, Y1 - 2, PR - 2, 10), -PT, 0));

  // the top ruler is behind the bottom one at every slide, so it is painted first
  const top = solid(g);
  const ticks = BOT.map(() => mk("path", { class: "nf" }, top.g));
  const bot = solid(g);
  const [br, bi] = rings(0, 0, LEN, WD, R, B);
  put(bot, prism(P, front, br, bi, 0, TH));
  const bTicks = BOT.map((x) => mk("path", { d: seg(P(x, IN, TH), P(x, IN + TL, TH)), class: "nf" }, bot.g));

  const off = tween(SET[0].off), gap = tween(REST_GAP);
  const at = BOT.map((_, k) => tween(loc(k, SET[0].step)));
  let drawn = "";
  const loop = register(stage, (_dt, now) => {
    const o = tval(off, now), y1 = -tval(gap, now), xs = at.map((t) => o + tval(t, now));
    const moving = !tdone(off, now) || !tdone(gap, now) || at.some((t) => !tdone(t, now));
    const key = [o, y1, ...xs].join();
    if (key !== drawn) {
      drawn = key;
      const [r0, r1] = rings(o, y1 - WD, o + LEN, y1, R, B);
      put(top, prism(P, front, r0, r1, 0, TH));
      xs.forEach((x, k) => ticks[k].setAttribute("d", seg(P(x, y1 - IN, TH), P(x, y1 - IN - TL, TH))));
    }
    return moving;
  });
  bag.add(loop.unregister);

  /** Three bands along the rulers, on their top plane, which never moves: [setting, nearest bottom tick], or -1 off the plate. */
  function hit([sx, sy]) {
    const [x, y] = unproj(C, sx, sy, TH);
    if (x < X0 || x > X1 || y < Y0 || y > Y1) return [-1, -1];
    return [clamp(Math.floor(x / (LEN / 3)), 0, 2), clamp(Math.round((x - BOT[0]) / D), 0, N - 1)];
  }

  let s = null, from = 1;
  /** Sets setting m (-1 is rest). The ticks move after one another, outwards from tick a. */
  function choose(m, a) {
    if (m === s) return;
    const now = performance.now(), t = SET[Math.max(m, 0)];
    s = m;
    if (a >= 0) from = a;
    tset(off, t.off, now, 0);
    tset(gap, m < 0 ? REST_GAP : GAP, now, 0);
    at.forEach((tw, k) => tset(tw, loc(k, t.step), now, Math.abs(k - from) * stag));
    // bright where a top tick will meet a bottom tick: read from the target, never the pose on screen
    const xs = at.map((_, k) => t.off + loc(k, t.step)), meets = (x, list) => list.some((v) => Math.abs(v - x) < 0.5);
    ticks.forEach((el, k) => el.classList.toggle("hi", meets(xs[k], BOT)));
    bTicks.forEach((el, j) => el.classList.toggle("hi", meets(BOT[j], xs)));
    read.textContent = m < 0 ? "rest" : t.say;
    loop.wake();
  }
  choose(-1, -1);

  bag.add(pointer(stage, { move: (p) => choose(...hit(p)), leave: () => choose(-1, -1) }));
  bag.add(() => svg.replaceChildren());

  return {
    set: (v) => { stag = v; },
    destroy: bag.dispose,
  };
}

export default {
  name: "rulers",
  means: "Two rulers side by side: where ticks meet is a solution. They meet once, everywhere, or never.",
  rules: [1, 2, 4, 8],
  range: [0, 45, 90],
  tour: [[153, 118], [210, 147], [268, 176], null],
  mount,
};
