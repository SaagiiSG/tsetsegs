import { HL } from './kernel.js';

/**
 * String: a drum on a square plinth, a stick lying on its top from the centre
 * peg to the rim, and a knotted string tied at the stick's end and wound round
 * the rim. The pointer's direction from the centre, read on the drum's top
 * (which never moves), sets how far the string is wound, snapped to half
 * radians, π and 2π; the string winds there on the 700ms tween. The wound part
 * is the one bright stroke, a knot sits at every radius-length along it, and
 * the loose end leaves the rim on its tangent. At rest one radius is wound, so
 * the bright arc is as long as the stick. The slider is the drum's radius: the
 * string grows with it, the angle a radius of it covers does not.
 *
 * The string winds counterclockwise on screen, which is decreasing world angle
 * at this camera: the rim point θ radians along is at world angle A0 − θ.
 */
const {
  Cam, circ, facing, fit, open, prism, proj, rings, rrect, unproj,
  tdone, tset, tval, tween, disposer, mk, place, pointer, put, register, solid,
} = HL;

const H = 28, PH = 60, PB = 5, RMAX = 56, PEG = 3.4, SW = 1.9, CW = 3, TAIL = 0.55, REST = 1;
// A0 puts the stick where it and one radian of rim come out the same length on screen.
const TAU = 2 * Math.PI, A0 = (102 * Math.PI) / 180;
const STEPS = [0.5, 1, 1.5, 2, 2.5, Math.PI, 3.5, 4, 4.5, 5, 5.5, TAU];
const say = (t) => (t === Math.PI ? "π rad = half turn" : t === TAU ? "2π rad = full turn" : t + " rad");

/** A ring turned by a round the origin, its normals with it. */
const turn = (ring, a) => {
  const c = Math.cos(a), s = Math.sin(a);
  return ring.map((q) => ({ u: c * q.u - s * q.v, v: s * q.u + c * q.v, nu: c * q.nu - s * q.nv, nv: s * q.nu + c * q.nv }));
};

function mount({ stage, svg, read }, value) {
  const bag = disposer();
  let R = value, sel = -1, drawn = "";

  // Fitted to the largest drum with its loose end reaching out, so nothing leaves the frame at any radius.
  const C = Cam(45, 0.5, 1.8), reach = RMAX * Math.hypot(1, TAIL);
  fit(C, [[-PH, -PH, -PB], [PH, PH, -PB], [PH, -PH, -PB], [-PH, PH, -PB], [-PH, -PH, 0], ...circ(reach, 48).map((q) => [q.u, q.v, H + 4])], 200, 166);
  const P = proj(C), front = facing(C);
  const rim = (th) => { const a = A0 - th; return P(R * Math.cos(a), R * Math.sin(a), H); };

  // back to front: plinth, drum, stick, peg, the wound string, its knots, its loose end
  const g = mk("g", {}, svg);
  const [pr, pi] = rings(-PH, -PH, PH, PH, 12, 2.2);
  put(solid(g), prism(P, front, pr, pi, -PB, 0));
  const drum = solid(g), stick = solid(g), peg = solid(g);
  put(peg, prism(P, front, circ(PEG, 32), circ(PEG - 0.9, 32), H, H + 4.5));
  const wound = mk("path", { class: "nf hi" }, g), knots = mk("g", {}, g), tail = mk("path", { class: "nf" }, g);
  const ks = [1, 2, 3, 4, 5, 6].map(() => mk("ellipse", { rx: 3, ry: 3, class: "dot m" }, knots));

  function drawBody() {
    put(drum, prism(P, front, circ(R, 128), circ(R - 2, 128), 0, H));
    put(stick, prism(P, front, turn(rrect(0, -SW, R, SW, SW, 4), A0), turn(rrect(0.7, 0.7 - SW, R - 0.7, SW - 0.7, SW - 0.7, 4), A0), H, H + 2.2));
  }

  function draw(th) {
    const key = th + "," + R;
    if (key === drawn) return;
    drawn = key;
    // the string is a band CW deep round the top of the wall: its upper edge is the rim, seen all round;
    // its lower edge only where the wall faces the viewer
    const n = Math.max(2, Math.ceil(th / 0.04)), up = [], runs = [[]];
    for (let k = 0; k <= n; k++) {
      const a = A0 - (th * k) / n, c = Math.cos(a), s = Math.sin(a);
      up.push(P(R * c, R * s, H));
      if (front({ u: R * c, v: R * s, nu: c, nv: s })) runs[runs.length - 1].push(P(R * c, R * s, H - CW));
      else if (runs[runs.length - 1].length) runs.push([]);
    }
    wound.setAttribute("d", open(up) + runs.filter((r) => r.length > 1).map(open).join(""));
    // the loose end runs on along the tangent where the winding stops
    const a = A0 - th, ex = R * Math.cos(a), ey = R * Math.sin(a), L = TAIL * R;
    tail.setAttribute("d", open([P(ex, ey, H), P(ex + L * Math.sin(a), ey - L * Math.cos(a), H)]));
    // a knot at every radius-length of string that is wound on
    ks.forEach((el, i) => {
      const on = th >= i + 1 - 1e-9;
      if (on !== el.isConnected) { if (on) knots.append(el); else el.remove(); }
      if (on) place(el, rim(i + 1));
    });
  }

  const tw = tween(REST);
  const B = register(stage, (_dt, now) => { draw(tval(tw, now)); return !tdone(tw, now); });
  bag.add(B.unregister);
  drawBody();
  draw(REST);
  read.textContent = "rest";

  /** Winds the string to th radians (-1 is rest). */
  function choose(th) {
    if (th === sel) return;
    sel = th;
    tset(tw, th < 0 ? REST : th, performance.now(), 0);
    read.textContent = th < 0 ? "rest" : say(th);
    B.wake();
  }

  bag.add(pointer(stage, {
    move: (p) => {
      const [x, y] = unproj(C, p[0], p[1], H);
      if (Math.hypot(x, y) < 0.15 * R) return; // too near the centre to say a direction
      const d = (((A0 - Math.atan2(y, x)) % TAU) + TAU) % TAU;
      choose(STEPS.reduce((b, s) => (Math.abs(s - d) < Math.abs(b - d) ? s : b)));
    },
    leave: () => choose(-1),
  }));
  bag.add(() => svg.replaceChildren());

  return {
    set: (v) => { R = v; drawBody(); B.wake(); },
    destroy: bag.dispose,
  };
}

export default {
  name: "string",
  means: "A knotted string wound round a drum: one radius of string covers one radian, and 2π radii wind one full turn.",
  rules: [1, 4, 5, 8],
  range: [36, 46, 56],
  tour: [[200, 167], [256, 116], [138, 145], null],
  mount,
};
