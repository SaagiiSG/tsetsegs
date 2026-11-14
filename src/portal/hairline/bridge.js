import { HL } from './kernel.js';

/**
 * Bridge: two sentence blocks stand apart with a gap between them, the first
 * longer, each with lines of writing on its face, and a railed deck spans the
 * gap flush with both tops: the deck is the transition. The pointer's height
 * sets the second block's level, level, higher or lower, on the 700ms curve,
 * and the deck tilts so it keeps joining them. The read-out names the word the
 * relationship needs: also, so, however,. At rest the blocks are level and the
 * deck is bright; when the pointer chooses, the second block takes the bright.
 * The slider is how far the second block rises or drops.
 *
 * The blocks are turned square to the viewer, as Ramp's plate is, so level
 * reads as level. The deck is sheared, not turned, so both its ends stay
 * upright and flush with the blocks. The hit test is three bands of screen
 * height on the second block's fixed axis, which nothing drawn can move.
 */
const {
  Cam, fit, lerp, prism, proj, rings, rrect, seg,
  tween, tset, tval, tdone, mk, pointer, put, register, disposer, solid,
} = HL;

const H0 = 44, D = 30, A1 = 58, B0 = 140, B1 = 186, W2 = 8, T = 5, RH = 12, BAND = 11, MAX = 30, R2 = Math.SQRT1_2;
const SAY = { "-1": "however,", 0: "also", 1: "so" };

function mount({ stage, svg, read }, value) {
  const bag = disposer();
  let step = value;

  // Local (u, v, z): u across the page, v away from it. Rings in u, v face the viewer when their normal points to -v.
  const C = Cam(45, 0.5, 1.72);
  const W = (u, v) => [(u - v) * R2, (-u - v) * R2];
  // Fitted to the second block at its highest, deck rail included: the most extreme pose.
  fit(C, [[...W(0, -D / 2), 0], [...W(B1, -D / 2), 0], [...W(B1, D / 2), H0 + MAX], [...W(B0 - 3, W2), H0 + MAX + RH]], 200, 166);
  const P = proj(C), Pl = (u, v, z) => P(...W(u, v), z), front = (q) => q.nv < 0;
  const [ra, ia] = rings(0, -D / 2, A1, D / 2, 6, 2), [rb, ib] = rings(B0, -D / 2, B1, D / 2, 6, 2);

  /** Lines of writing on a block's front face, hung from its top h, the last one short. */
  function lines(u0, u1, h, n) {
    let d = "";
    for (let k = 0; k < n; k++) d += seg(Pl(u0 + 9, -D / 2, h - 11 - 7 * k), Pl(k === n - 1 ? (u0 + u1) / 2 : u1 - 9, -D / 2, h - 11 - 7 * k));
    return d;
  }
  /** The deck from the first top at H0 to the second at h: a slab sheared, not turned, its profile (u, z) stood along v. */
  function deck(h) {
    const t = (h - H0) / (B0 - A1);
    const shear = (ring) => ring.map((q) => ({ ...q, v: q.v + (q.u - A1) * t, nu: q.nu - t * q.nv }));
    const ring = rrect(A1, H0 - T, B0, H0, 1.5, 4), inner = rrect(A1 + 0.8, H0 - T + 0.8, B0 - 0.8, H0 - 0.8, 0.7, 4);
    return prism((a, b, e) => Pl(a, e, b), (q) => q.nv > 0, shear(ring), shear(inner), W2, -W2);
  }
  /** A railing along the deck's edge at v: four posts, and the rail across their tops. */
  function rail(h, v) {
    const z = (u) => H0 + ((u - A1) / (B0 - A1)) * (h - H0), us = [0, 1, 2, 3].map((k) => lerp(A1 + 3, B0 - 3, k / 3));
    return us.map((u) => seg(Pl(u, v, z(u)), Pl(u, v, z(u) + RH))).join("") + seg(Pl(us[0], v, z(us[0]) + RH), Pl(us[3], v, z(us[3]) + RH));
  }

  // Paint order: the blocks, which never overlap the deck on screen; the far rail; the deck; the near rail over it.
  const g = mk("g", {}, svg);
  put(solid(g), prism(Pl, front, ra, ia, 0, H0));
  mk("path", { d: lines(0, A1, H0, 3), class: "nf lo" }, g);
  const b = solid(g), bl = mk("path", { class: "nf lo" }, g);
  const far = mk("path", { class: "nf lo" }, g), dk = solid(g), near = mk("path", { class: "nf" }, g);

  let drawn = NaN;
  /** The figure with the second block l steps from level. Skipped when its height has not changed. */
  function draw(l) {
    const h = H0 + l * step;
    if (h === drawn) return;
    drawn = h;
    put(b, prism(Pl, front, rb, ib, 0, h));
    bl.setAttribute("d", lines(B0, B1, h, 2));
    far.setAttribute("d", rail(h, W2 - 1.5));
    put(dk, deck(h));
    near.setAttribute("d", rail(h, -W2 + 1.5));
  }
  draw(0);

  const lvl = tween(0);
  const loop = register(stage, (_dt, now) => {
    draw(tval(lvl, now));
    return !tdone(lvl, now);
  });
  bag.add(loop.unregister);

  // The pointer's height on the second block's fixed axis picks the band: above its level top, around it, or below.
  const zy = Pl((B0 + B1) / 2, 0, 0)[1], dz = zy - Pl((B0 + B1) / 2, 0, 1)[1];
  const pick = (p) => {
    const z = (zy - p[1]) / dz - H0;
    return z > BAND ? 1 : z < -BAND ? -1 : 0;
  };

  let act = null;
  /** Sets the second block's level (null is rest). The bright goes to the block the pointer moved, and back to the deck at rest. */
  function choose(l) {
    if (l === act) return;
    act = l;
    tset(lvl, l || 0, performance.now(), 0);
    dk.sil.classList.toggle("hi", l === null);
    b.sil.classList.toggle("hi", l !== null);
    read.textContent = l === null ? "rest" : SAY[l];
    loop.wake();
  }
  dk.sil.classList.add("hi");
  read.textContent = "rest";

  bag.add(pointer(stage, { move: (p) => choose(pick(p)), leave: () => choose(null) }));
  bag.add(() => svg.replaceChildren());

  return {
    set: (v) => { step = v; loop.wake(); },
    destroy: bag.dispose,
  };
}

export default {
  name: "bridge",
  means: "Two sentence blocks joined by a deck: raise or lower the second, the deck tilts, and the read-out names the transition.",
  rules: [1, 5, 6, 8],
  range: [14, 22, 30],
  tour: [[320, 120], [320, 162], [320, 200], null],
  mount,
};
