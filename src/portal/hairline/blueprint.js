import { HL } from './kernel.js';

/**
 * Blueprint: a paragraph built like a small building. Three slabs stand on a
 * gridded plate: a wide base, the setup; a slab set off to the right, the
 * turn; a smaller one back over the centre, the close. The pointer's height
 * raises the build level by level: low lays only the base, higher sets the
 * turn on it, highest closes it. Slabs that join drop in on the 700ms curve;
 * slabs that leave shrink away, last in first out. The slab being placed
 * hangs just over its seat with the bright stroke, and sets down when the
 * pointer leaves; at rest all three stand and the turn is bright. The slider is how far the turn swings off centre.
 *
 * The pattern: discrete items, as Cubes. Three fixed bands of screen height
 * pick the level, so nothing drawn can move the hit test.
 */
const {
  Cam, clamp, facing, fit, prism, proj, rings, seg, spring, stepS, tdone, tset, tval, tween,
  disposer, mk, pointer, put, register, solid,
} = HL;

// each slab: [half x, half y, z0, z1, whether it takes the turn's offset]
const SLABS = [[42, 30, 0, 22, 0], [32, 22, 22, 42, 1], [22, 14, 42, 60, 0]];
const NAMES = ["setup", "turn", "close"];
const PX = 62, PY = 50, PB = 4, R = 6, B = 1.8, DROP = 18, HOV = 10, STAG = 50, GRID = 16, DMAX = 24;

function mount({ stage, svg, read }, value) {
  const bag = disposer();
  // the turn shifts by d along (+x, -y): straight to the right on screen
  const off = spring(value);

  // Fitted to the plate, the close held over its seat and the turn held at its widest swing.
  const C = Cam(45, 0.5, 1.75);
  fit(C, [[-PX, -PY, -PB], [PX, PY, -PB], [PX, -PY, -PB], [-PX, PY, -PB], [-22, -14, 60 + HOV], [DMAX + 32, -DMAX - 22, 42 + HOV]], 200, 166);
  const P = proj(C), front = facing(C);

  const g = mk("g", {}, svg);
  const [pr, pi] = rings(-PX, -PY, PX, PY, 9, 2);
  put(solid(g), prism(P, front, pr, pi, -PB, 0));
  // the blueprint grid, ruled on the plate's top before anything stands on it
  let grid = "";
  for (let x = -3 * GRID; x <= 3 * GRID; x += GRID) grid += seg(P(x, -PY + 7, 0), P(x, PY - 7, 0));
  for (let y = -2 * GRID; y <= 2 * GRID; y += GRID) grid += seg(P(-PX + 7, y, 0), P(PX - 7, y, 0));
  mk("path", { d: grid, class: "nf lo" }, g);

  // Painted bottom to top: a slab can only ever cover the ones under it.
  const slabs = SLABS.map(([hx, hy, z0, z1, k]) => {
    const el = solid(g);
    return { hx, hy, z0, z1, k, a: tween(1), h: tween(0), el, txt: mk("path", { class: "nf lo" }, el.g), da: NaN, dh: NaN, dd: NaN };
  });
  slabs[1].el.sil.classList.add("hi");

  const loop = register(stage, (dt, now) => {
    let moving = stepS(off, dt);
    for (const s of slabs) {
      const a = tval(s.a, now), h = tval(s.h, now), d = s.k * off.x;
      if (!tdone(s.a, now) || !tdone(s.h, now)) moving = true;
      if (a === s.da && h === s.dh && d === s.dd) continue;
      s.da = a; s.dh = h; s.dd = d;
      if (a < 0.12) { put(s.el, { sil: "", crease: "" }); s.txt.setAttribute("d", ""); continue; }
      // grows about its centre, which falls DROP as it arrives; the slab being placed is held h over its seat
      const hx = s.hx * a, hy = s.hy * a, hz = ((s.z1 - s.z0) * a) / 2, cz = (s.z0 + s.z1) / 2 + (1 - a) * DROP + h;
      const [ring, inner] = rings(d - hx, -d - hy, d + hx, -d + hy, R * a, B * a);
      put(s.el, prism(P, front, ring, inner, cz - hz, cz + hz));
      // two lines of text ruled on the front face, the second one short: a paragraph's lines, a floor's windows
      const yF = -d + hy, x0 = d - hx + (R + 3) * a, x1 = d + hx - (R + 3) * a, z1 = cz + hz * 0.3, z2 = cz - hz * 0.3;
      s.txt.setAttribute("d", seg(P(x0, yF, z1), P(x1, yF, z1)) + seg(P(x0, yF, z2), P(x0 + (x1 - x0) * 0.6, yF, z2)));
    }
    return moving;
  });
  bag.add(loop.unregister);

  // Three bands of screen height, from the close's top to the base's nearest foot. They never move.
  const yT = P(0, 0, 60)[1], yB = P(42, 30, 0)[1], bh = (yB - yT) / 3;
  const band = (y) => clamp(2 - Math.floor((y - yT) / bh), 0, 2);

  let lv = -1;
  /** Builds up to level m, holding slab m just over its seat (-1 is rest: all three set down). Joining slabs land in order, leaving ones go last in first out. */
  function choose(m) {
    if (m === lv) return;
    const now = performance.now(), c0 = lv < 0 ? 3 : lv + 1, c1 = m < 0 ? 3 : m + 1, f = c1 > c0 ? c0 : c0 - 1;
    lv = m;
    slabs.forEach((s, i) => {
      tset(s.a, i < c1 ? 1 : 0, now, Math.abs(i - f) * STAG);
      tset(s.h, i === m ? HOV : 0, now, Math.abs(i - f) * STAG);
      s.el.sil.classList.toggle("hi", i === (m < 0 ? 1 : m));
    });
    read.textContent = m < 0 ? "rest" : NAMES[m];
    loop.wake();
  }
  read.textContent = "rest";

  bag.add(pointer(stage, { move: (p) => choose(band(p[1])), leave: () => choose(-1) }));
  bag.add(() => svg.replaceChildren());

  return {
    set: (v) => { off.t = v; loop.wake(); },
    destroy: bag.dispose,
  };
}

export default {
  name: "blueprint",
  means: "A paragraph built like a building: raise the pointer to lay the setup, swing the turn aside, then close it back over the centre.",
  rules: [1, 4, 5, 9],
  range: [12, 18, 24],
  tour: [[200, 215], [285, 165], [200, 128], null],
  mount,
};
