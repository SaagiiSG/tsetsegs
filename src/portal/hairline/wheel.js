import { HL } from './kernel.js';

/**
 * Wheel: a spoked wheel standing on a straight track, one spot marked on its
 * rim. The pointer, read along the line the hub travels (which never moves),
 * rolls the wheel from the start of the track through at most one turn, on a
 * spring. The rim that has touched the track and the track it has laid down
 * are one bright line, which ends at the spot; the spot leaves a faint mark
 * where it touches. After one turn the whole rim is bright and the line on the
 * track is one circumference long. At rest the wheel stands 0.3 of a turn
 * along. The slider is the wheel's radius.
 *
 * The wheel's own frame: angle a round the hub, 0 at the bottom, 90° forward
 * (+x, down the track), 180° at the top. Rolling forward by f turns, the rim
 * point that started at the bottom is at a = -f·360°.
 */
const {
  Cam, clamp, facing, fit, hull, open, poly, prism, proj, rings, seg, spring, stepS,
  disposer, flatDot, mk, place, pointer, put, register, solid,
} = HL;

const W = 7, TW = W / 2 + 5, TH = 3, M = 4, B = 1.4, REST = 0.3, RMAX = 17, N = 64, SPOKES = 5;
const TAU = 2 * Math.PI;

/** The read-out for a turn fraction, to the nearest quarter. */
const say = (f) => ["start", "¼ turn = ½πr", "½ turn = πr", "¾ turn = 1½πr", "one turn = 2πr"][Math.round(f * 4)];
const box = (x0, x1, y0, y1, z0, z1) => [x0, x1].flatMap((x) => [y0, y1].flatMap((y) => [[x, y, z0], [x, y, z1]]));

function mount({ stage, svg, read }, value) {
  const bag = disposer();
  let r = value, far = 0, over = false, drawn = "";

  // Fitted to the largest wheel at both ends of its one turn, so nothing leaves the frame at any radius.
  const C = Cam(45, 0.5, 2.8), PR = Math.PI * RMAX, EX = PR + RMAX + M;
  fit(C, [...box(-EX, EX, -TW, TW, -TH, 0), ...box(-PR - RMAX, -PR + RMAX, -W / 2, W / 2, 0, 2 * RMAX), ...box(PR - RMAX, PR + RMAX, -W / 2, W / 2, 0, 2 * RMAX)], 200, 166);
  const P = proj(C), front = facing(C);
  // how far z climbs toward the camera per unit of x and of y: the tread faces the camera where sin a > dz·cos a
  const o = P(0, 0, 0), dz = (P(1, 1, 0)[1] - o[1]) / (o[1] - P(0, 0, 1)[1]), PHI = Math.atan(dz);

  // back to front: the track, the marks lying on it, the wheel, the spokes on its face, the laid-down line, the spot
  const g = mk("g", {}, svg), track = solid(g), trail = mk("g", {}, g);
  const m0 = flatDot(trail, C, 1.3, "dot off"), m1 = flatDot(trail, C, 1.3, "dot off");
  m1.remove();
  const wheel = solid(g), face = mk("path", { class: "nf lo" }, g), hub = mk("path", { class: "lo" }, g);
  const laid = mk("path", { class: "nf hi" }, g), spot = mk("ellipse", { rx: 3.2, ry: 3.2, class: "dot" }, g);
  const sp = spring(REST, { eps: 0.0005 });

  function drawTrack() {
    const [ring, inner] = rings(-Math.PI * r - r - M, -TW, Math.PI * r + r + M, TW, 4, 1.2);
    put(track, prism(P, front, ring, inner, -TH, 0));
    place(m0, P(-Math.PI * r, W / 2, 0));
    place(m1, P(Math.PI * r, W / 2, 0));
  }

  function draw() {
    const f = sp.x, key = f + "," + r;
    // the spot leaves its mark where it touches down again; leaving takes the trail away
    if (over) far = Math.max(far, f);
    const touched = far > 0.995;
    if (touched !== m1.isConnected) { if (touched) trail.append(m1); else m1.remove(); }
    if (key === drawn) return;
    drawn = key;
    const cx = -Math.PI * r + f * TAU * r, th = f * TAU;
    const at = (a, rho, y = W / 2) => P(cx + rho * Math.sin(a), y, r - rho * Math.cos(a));
    const arc = (a0, a1, rho, y) => {
      const n = Math.max(2, Math.ceil((Math.abs(a1 - a0) / TAU) * N));
      return Array.from({ length: n + 1 }, (_, k) => at(a0 + ((a1 - a0) * k) / n, rho, y));
    };
    put(wheel, {
      sil: poly(hull(arc(0, TAU, r, W / 2).concat(arc(0, TAU, r, -W / 2)))),
      crease: open(arc(PHI, PHI + Math.PI, r - B)),
    });
    const spokes = Array.from({ length: SPOKES }, (_, k) => {
      const a = -th + ((k + 0.5) / SPOKES) * TAU;
      return seg(at(a, 0.2 * r), at(a, 0.7 * r));
    });
    face.setAttribute("d", poly(arc(0, TAU, 0.7 * r)) + spokes.join(""));
    hub.setAttribute("d", poly(arc(0, TAU, 0.2 * r)));
    laid.setAttribute("d", open([P(-Math.PI * r, W / 2, 0), ...arc(0, -th, r)]));
    place(spot, at(-th, r - 2.4));
  }

  const L = register(stage, (dt) => { const m = stepS(sp, dt); draw(); return m; });
  bag.add(L.unregister);
  drawTrack();
  draw();
  read.textContent = "rest";

  /** The turn fraction under the pointer: its place along the hub's path from start to one turn, on screen. */
  function along([x, y]) {
    const a = P(-Math.PI * r, 0, r), b = P(Math.PI * r, 0, r), dx = b[0] - a[0], dy = b[1] - a[1];
    return clamp(((x - a[0]) * dx + (y - a[1]) * dy) / (dx * dx + dy * dy), 0, 1);
  }

  bag.add(pointer(stage, {
    move: (p) => { over = true; sp.t = along(p); read.textContent = say(sp.t); L.wake(); },
    leave: () => { over = false; sp.t = REST; far = 0; read.textContent = "rest"; L.wake(); },
  }));
  bag.add(() => svg.replaceChildren());

  return {
    set: (v) => { r = v; drawTrack(); draw(); L.wake(); },
    destroy: bag.dispose,
  };
}

export default {
  name: "wheel",
  means: "A wheel rolls along a track: the rim it turns through is laid down as track, and one full turn lays down one circumference.",
  rules: [1, 3, 4, 5],
  range: [12, 14.5, 17],
  tour: [[200, 164], [299, 213], null],
  mount,
};
