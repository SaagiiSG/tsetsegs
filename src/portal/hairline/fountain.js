import { HL } from './kernel.js';

/**
 * Fountain: a round stone basin, full of water, with a low nozzle near its left
 * wall. A jet arcs out of the nozzle and falls back into the basin, drawn as
 * three parallel dashed streams, with two ripple rings where it lands. Its
 * height over the water is f(x) = k(1 − ((x − c)/c)²): it leaves the nozzle at
 * x = 0, lands at x = 2c, and peaks at (c, k), where a bright dot rides it.
 *
 * The pointer's height sets k, the maximum, snapped to whole units so the
 * read-out is exact, on a spring. The slider is c, where the peak sits (half
 * the jet's reach), in whole units. The jet stands in the vertical plane
 * through the basin's centre that faces the viewer square on, so it reads as
 * an upright parabola and its highest point on screen is its true vertex.
 *
 * Paint order: basin, its opening, the water line on the far wall, the ripples,
 * the jet, then the nozzle, which hides the jet's start inside it. The jet never
 * dips below the front lip on screen (it lands well inside the opening), so the
 * only rim it crosses is the far one, which is behind it.
 */
const {
  Cam, circ, clamp, facing, fit, hull, open, poly, prism, proj, ringAt, run, spring, stepS,
  disposer, mk, place, pointer, put, register, solid,
} = HL;

const R = 40, H = 13, LIP = 3.5, W = 11; // the basin: radius, height, lip, water level
const NZ = 25, NH = 4, XU = 7, ZU = 5; // the nozzle: its distance left of centre and height; one unit across, one unit up
const KMIN = 3, KMAX = 14, REST = 7, CMIN = 2, CMAX = 4, SIDE = 2.4, S = 2.9, RIP = [2.2, 4.5]; // the ripples' radii: the outer stays inside the lip at the longest reach
const Q = Math.SQRT1_2;
/** u runs right across the screen, v toward the viewer; both on the ground. */
const at = (u, v, z) => [(u + v) * Q, (v - u) * Q, z];

function mount({ stage, svg, read }, value) {
  const bag = disposer();
  // Fitted to the basin and the tallest jet at either end of the slider.
  const C = Cam(45, 0.5, S), top = W + KMAX * ZU;
  fit(C, [at(-R, 0, 0), at(R, 0, 0), at(0, -R, H), at(0, R, 0), at(-NZ + CMIN * XU, 0, top), at(-NZ + CMAX * XU, 0, top)], 200, 166);
  const P = proj(C), front = facing(C), Pa = (u, v, z) => P(...at(u, v, z));
  const ring = ([x, y], r, z) => poly(circ(r, 40).map((s) => P(x + s.u, y + s.v, z)));

  const g = mk("g", {}, svg);
  const rim = circ(R, 96), bore = circ(R - LIP, 96);
  put(solid(g), { sil: prism(P, front, rim, bore, 0, H).sil, crease: poly(ringAt(P, bore, H)) }); // its crease is the lip's inner edge
  mk("path", { d: open(ringAt(P, run(bore, (s) => !front(s)), W)), class: "nf lo" }, g); // the water line on the far wall
  const rip = RIP.map(() => mk("path", { class: "nf lo" }, g));
  const jets = [-SIDE, 0, SIDE].map((v) => ({ v, el: mk("path", { class: v ? "nf dash" : "nf sil" }, g) }));
  const foot = circ(3.8, 32), tip = circ(2.8, 32), [nx, ny] = at(-NZ, 0, 0);
  const shift = (rg, z) => ringAt(P, rg.map((s) => ({ ...s, u: s.u + nx, v: s.v + ny })), z);
  put(solid(g), { sil: poly(hull(shift(foot, W).concat(shift(tip, W + NH)))), crease: poly(shift(circ(1.6, 24), W + NH)) });
  const dot = mk("circle", { r: 3.2, class: "dot" }, g); // the one bright mark: the maximum

  const sK = spring(REST), sC = spring(clamp(Math.round(value), CMIN, CMAX));
  let drawn = "";
  function draw() {
    const k = sK.x, c = sC.x, key = k + "," + c;
    if (key === drawn) return;
    drawn = key;
    const f = (x) => W + k * ZU * (1 - ((x - c) / c) ** 2);
    for (const j of jets) j.el.setAttribute("d", open(Array.from({ length: 49 }, (_, i) => Pa(-NZ + (i / 24) * c * XU, j.v, f((i / 24) * c)))));
    const land = at(-NZ + 2 * c * XU, 0, W);
    rip.forEach((el, i) => el.setAttribute("d", ring(land, RIP[i], W)));
    place(dot, Pa(-NZ + c * XU, 0, f(c)));
  }

  const B = register(stage, (dt) => {
    const m = stepS(sK, dt) | stepS(sC, dt);
    draw();
    return !!m;
  });
  bag.add(B.unregister);

  // The hit test reads only the pointer's screen height against the water line, which never moves.
  const y0 = Pa(0, 0, W)[1], per = y0 - Pa(0, 0, W + ZU)[1];
  let k = 0;
  function aim(n) {
    k = n;
    sK.t = n || REST;
    read.textContent = n ? `max ${n} at ${sC.t}` : "rest";
    B.wake();
  }
  read.textContent = "rest";
  bag.add(pointer(stage, {
    move: (p) => aim(clamp(Math.round((y0 - p[1]) / per), KMIN, KMAX)),
    leave: () => aim(0),
  }));
  bag.add(() => svg.replaceChildren());

  return {
    set: (v) => { sC.t = clamp(Math.round(v), CMIN, CMAX); if (k) aim(k); else B.wake(); },
    destroy: bag.dispose,
  };
}

export default {
  name: "fountain",
  means: "A fountain's jet arcs out of its basin: raise the pointer and it climbs; the bright dot rides its highest point, the maximum.",
  rules: [1, 4, 5, 6, 8],
  range: [2, 3, 4],
  tour: [[188, 160], [188, 98], [188, 30], null],
  mount,
};
