import { HL } from './kernel.js';

/**
 * Trains: two straight tracks side by side on a plate, a small engine on
 * each, heading toward each other. Train A leaves the far end at 60 km/h,
 * train B the near end at 40 km/h, 300 km apart. The pointer's screen x is
 * time t, 0 to 5 hours: both engines run to where they are at t on the 700ms
 * curve, the one at the pointer's end of the line first. At t 3 they stand
 * side by side, 180 km from A's end, and the signal between the tracks
 * lights. Otherwise train A, the one the kilometres are counted from, holds
 * the bright stroke. The slider is the stagger between the engines, in ms.
 *
 * The pattern: discrete items. t is a choice, so tweens; the hit test is six
 * fixed bands of screen x, which nothing drawn moves.
 */
const {
  Cam, clamp, facing, fit, prism, proj, rings, seg, tdone, tset, tval, tween,
  disposer, mk, pointer, put, register, solid,
} = HL;

const D = 300, KM = 0.34, T = 5, MEET = 3, REST = 0.25;
const L = 32, W = 18, CAB = 13, HB = 12, HC = 23, ZB = 0, G = 40, BED = 8, RAIL = 4;
const XS = -L / 2 - 2, XE = D * KM + L / 2 + 2, M = 5, PB = 4;
// A at 60 km/h from km 0 on the far track; B at 40 km/h from km 300 on the near one
const TRAINS = [{ y: 0, dir: 1, km: (t) => 60 * t }, { y: G, dir: -1, km: (t) => D - 40 * t }];
const XM = TRAINS[0].km(MEET) * KM, YM = G / 2;

function mount({ stage, svg, read }, value) {
  const bag = disposer();
  let stag = value;

  // Fitted to the plate, the cab tops at both ends of the line and the signal lamp: the extremes of every pose.
  const C = Cam(45, 0.5, 2.15);
  fit(C, [[XS - M, -BED - M, -PB], [XE + M, -BED - M, -PB], [XS - M, G + BED + M, -PB], [XE + M, G + BED + M, -PB],
    [XS, -W / 2, ZB + HC], [XE, G - W / 2, ZB + HC], [XM, YM, 39]], 200, 166);
  const P = proj(C), front = facing(C);
  const box = (x0, x1, y0, y1, z0, z1, r, b) => prism(P, front, ...rings(Math.min(x0, x1), y0, Math.max(x0, x1), y1, r, b), z0, z1);

  const g = mk("g", {}, svg);
  put(solid(g), box(XS - M, XE + M, -BED - M, G + BED + M, -PB, 0, 8, 2));

  /** A track: two rails on sleepers, all under its engine. */
  function track(yc) {
    let sl = "";
    for (let x = XS + 4; x < XE - 2; x += 10) sl += seg(P(x, yc - RAIL - 2.5, 0), P(x, yc + RAIL + 2.5, 0));
    mk("path", { d: sl, class: "nf lo" }, g);
    mk("path", { d: [-RAIL, RAIL].map((dy) => seg(P(XS, yc + dy, 0), P(XE, yc + dy, 0))).join(""), class: "nf" }, g);
  }

  /** An engine's three solids, painted far to near: a tall cab at the back, a low body, a stack at the front. */
  function engine(tr) {
    const eg = mk("g", {}, g), cab = solid(eg), body = solid(eg), stack = solid(eg);
    if (tr.dir < 0) eg.append(body.g, stack.g, cab.g); // B runs toward the far end: its cab is the nearest part
    return { ...tr, parts: [cab, body, stack], k: tween(tr.km(REST)), dk: NaN };
  }
  function drawEngine(e, km) {
    const cx = km * KM, y0 = e.y - W / 2, y1 = e.y + W / 2, back = cx - (e.dir * L) / 2, nose = cx + (e.dir * L) / 2;
    const sx = nose - e.dir * 8;
    put(e.parts[0], box(back, back + e.dir * CAB, y0, y1, ZB, ZB + HC, 3, 1.2));
    put(e.parts[1], box(back + e.dir * (CAB - 1), nose, y0 + 1, y1 - 1, ZB, ZB + HB, 3, 1.2));
    put(e.parts[2], box(sx - 3.2, sx + 3.2, e.y - 3.2, e.y + 3.2, ZB + HB - 1, ZB + HB + 7, 3.2, 0.9));
  }

  // Back to front: far track, A, the signal between the tracks, near track, B.
  track(TRAINS[0].y);
  const engines = [engine(TRAINS[0])];
  const post = solid(g), lamp = solid(g);
  put(post, box(XM - 1.2, XM + 1.2, YM - 1.2, YM + 1.2, 0, 32, 1.2, 0.5));
  put(lamp, box(XM - 3.5, XM + 3.5, YM - 3.5, YM + 3.5, 30, 39, 2.6, 1));
  track(TRAINS[1].y);
  engines.push(engine(TRAINS[1]));

  const loop = register(stage, (_dt, now) => {
    let moving = false;
    for (const e of engines) {
      const km = tval(e.k, now);
      if (!tdone(e.k, now)) moving = true;
      if (km === e.dk) continue;
      e.dk = km;
      drawEngine(e, km);
    }
    return moving;
  });
  bag.add(loop.unregister);

  // Six bands of screen x, centred where the meeting line crosses each hour of A's run. They never move.
  const x0 = P(0, YM, 0)[0], step = P(60 * KM, YM, 0)[0] - x0;
  const band = (x) => clamp(Math.round((x - x0) / step), 0, T);

  let cur = null;
  /** Sets time m (-1 is rest). The engine at the pointer's end of the line leaves first. */
  function choose(m) {
    if (m === cur) return;
    const now = performance.now(), t = m < 0 ? REST : m, a = t < T / 2 ? 0 : 1, met = m === MEET;
    cur = m;
    engines.forEach((e, i) => {
      tset(e.k, e.km(t), now, Math.abs(i - a) * stag);
      for (const p of e.parts) p.sil.classList.toggle("hi", i === 0 && !met);
    });
    lamp.sil.classList.toggle("hi", met);
    const at = engines.map((e) => e.km(t));
    read.textContent = m < 0 ? "rest" : met ? `t ${m}: they meet at ${at[0]} km` : `t ${m}: ${Math.abs(at[1] - at[0])} km apart`;
    loop.wake();
  }
  choose(-1);

  bag.add(pointer(stage, { move: (p) => choose(band(p[0])), leave: () => choose(-1) }));
  bag.add(() => svg.replaceChildren());

  return {
    set: (v) => { stag = v; },
    destroy: bag.dispose,
  };
}

export default {
  name: "trains",
  means: "Two trains head toward each other at different speeds: move left to right through time, and at one moment they pass.",
  rules: [1, 4, 6, 8],
  range: [0, 40, 80],
  tour: [[153, 157], [216, 188], [278, 219], null],
  mount,
};
