import { HL } from './kernel.js';

/**
 * Gears: two spur gears lying meshed on a plate, twelve teeth and eight, so
 * 3 : 2. The pointer's x across the stage winds the big gear, in half-turn
 * detents, on one spring; the small gear turns 1.5 times as far, its teeth
 * riding in the big one's gaps. One tooth on each gear has the bright stroke:
 * at rest the two marks meet at the mesh, and they meet there again after two
 * turns of the big gear, three of the small. The slider is how far the pointer
 * can wind it, in big-gear turns.
 *
 * The pattern: a scrub. The turn is a position, so a spring; the hit test is
 * the pointer's x, which nothing drawn can move.
 */
const {
  Cam, circ, clamp, facing, fillet, fit, open, poly, prism, proj, seg, spring, stepS,
  disposer, mk, pointer, put, register, solid,
} = HL;

const N1 = 12, N2 = 8, MOD = 7, R1 = (N1 * MOD) / 2, R2 = (N2 * MOD) / 2, D = R1 + R2;
const AD = 7, DE = 8.5, TR = 0.25, TT = 0.115, T = 6, PB = 5, MG = 10, HUB = 6, LIP = 0.6;
const XL = 70, XR = 330; // the span of the stage's x that winds the gear, left to right
const TAU = 2 * Math.PI;

/** A gear's top outline in its own frame, counterclockwise: N filleted trapezoid teeth, the marked one first, at angle 0. */
function outline(N, R) {
  const p = TAU / N, rr = R - DE, ro = R + AD, pts = [], rs = [];
  for (let k = 0; k < N; k++) {
    for (const [r, w] of [[rr, -TR], [ro, -TT], [ro, TT], [rr, TR]]) pts.push([r * Math.cos((k + w) * p), r * Math.sin((k + w) * p)]);
    rs.push(2.2, 1.6, 1.6, 2.2);
  }
  return fillet(pts, rs, 3);
}

/** The plate: the hull of two circles round the gears, as a ring with outward normals. */
function capsule(ra, rb, n) {
  const ft = Math.acos((ra - rb) / D), out = [];
  for (let k = 0; k < n; k++) {
    const f = -Math.PI + (TAU * k) / n, near = Math.abs(f) < ft, r = near ? rb : ra;
    out.push({ u: (near ? D : 0) + r * Math.cos(f), v: r * Math.sin(f), nu: Math.cos(f), nv: Math.sin(f) });
  }
  return out;
}
const at = (ring, cx) => ring.map((q) => ({ ...q, u: q.u + cx }));

function mount({ stage, svg, read }, value) {
  const bag = disposer();
  let max = value, x = null;

  const C = Cam(45, 0.5, 1.9);
  const plate = capsule(R1 + AD + MG, R2 + AD + MG, 120), plateIn = capsule(R1 + AD + MG - 2, R2 + AD + MG - 2, 120);
  fit(C, plate.flatMap((q) => [[q.u, q.v, -PB], [q.u, q.v, 0]]).concat([[0, 0, T + HUB], [D, 0, T + HUB]]), 200, 166);
  const P = proj(C), front = facing(C);

  const g = mk("g", {}, svg);
  put(solid(g), prism(P, front, plate, plateIn, -PB, 0));
  // Every layer of both gears in turn, lowest first: at one screen point the higher surface is always the nearer.
  const gears = [[N1, R1, 0, 0, 9], [N2, R2, D, Math.PI + Math.PI / N2, 7]].map(([N, R, cx, a0, hub]) => ({ R, cx, a0, hub, ring: outline(N, R) }));
  for (const [key, cls] of [["bot", "sil"], ["wall", "fo"], ["top", "fo"], ["sil", "nf sil"], ["lo", "nf lo"], ["hi", "nf hi"]])
    for (const gr of gears) gr[key] = mk("path", { class: cls }, g);
  for (const gr of gears) put(solid(g), prism(P, front, at(circ(gr.hub, 48), gr.cx), at(circ(gr.hub - 1.3, 48), gr.cx), T, T + HUB));

  /** Draws a gear turned by a (radians): base outline, the walls that face the viewer, the top, its back edges bright and front edges dim, and the mark: tooth 0 and a line scribed out to it from the hub. */
  function drawGear(gr, a) {
    const c = Math.cos(a), s = Math.sin(a), n = gr.ring.length;
    const w = gr.ring.map(([u, v]) => [gr.cx + u * c - v * s, u * s + v * c]);
    const at3 = (z) => (i) => P(w[i][0], w[i][1], z), top = at3(T), low = at3(LIP);
    // which way each edge faces, from its own normal; then the outline cut into runs that face one way
    const ef = w.map((q, i) => { const b = w[(i + 1) % n]; return front({ nu: b[1] - q[1], nv: q[0] - b[0] }); });
    const s0 = Math.max(0, ef.findIndex((f, i) => f !== ef[(i + n - 1) % n])), runs = [];
    let run = null;
    for (let m = 0; m < n; m++) {
      const i = (s0 + m) % n;
      if (!run || run.f !== ef[i]) runs.push((run = { f: ef[i], ids: [i] }));
      run.ids.push((i + 1) % n);
    }
    let wall = "", sil = "", lo = "";
    for (const { f, ids } of runs) {
      if (f) { wall += poly(ids.map(top).concat(ids.slice().reverse().map(low))); lo += open(ids.map(top)); }
      else sil += open(ids.map(top));
    }
    const all = [...Array(n).keys()];
    gr.bot.setAttribute("d", poly(all.map(at3(0))));
    gr.wall.setAttribute("d", wall);
    gr.top.setAttribute("d", poly(all.map(top)));
    gr.sil.setAttribute("d", sil);
    gr.lo.setAttribute("d", lo);
    const on = (r) => P(gr.cx + r * c, r * s, T);
    gr.hi.setAttribute("d", open(all.slice(0, 16).map(top)) + seg(on(gr.hub + 1), on(gr.R + AD - 5)));
  }

  // big-gear turns; the small gear turns N1 / N2 as far, the other way
  const sp = spring(0, { eps: 0.002 });
  let drawn = NaN;
  function draw() {
    if (sp.x === drawn) return;
    drawn = sp.x;
    drawGear(gears[0], gears[0].a0 + TAU * sp.x);
    drawGear(gears[1], gears[1].a0 - TAU * sp.x * (N1 / N2));
  }
  draw();
  const B = register(stage, (dt) => { const m = stepS(sp, dt); draw(); return m; });
  bag.add(B.unregister);

  const num = (n) => String(Math.round(n * 100) / 100);
  function caption(b) {
    if (!b) return "rest";
    const s = (b * N1) / N2;
    // the marks meet again when the small gear has made whole turns too
    return Number.isInteger(s) ? `3 : 2 — ${num(b)} turns → ${num(s)} turns` : `big ${num(b)} turn${b > 1 ? "s" : ""}, small ${num(s)} turns`;
  }
  /** Winds to the half-turn detent under the pointer's x, or back to rest. */
  function retarget() {
    const steps = Math.max(1, Math.round(max * 2));
    const b = x === null ? 0 : clamp(Math.ceil(((x - XL) / (XR - XL)) * steps), 1, steps) / 2;
    sp.t = b;
    read.textContent = caption(b);
    B.wake();
  }
  retarget();

  bag.add(pointer(stage, { move: (p) => { x = p[0]; retarget(); }, leave: () => { x = null; retarget(); } }));
  bag.add(() => svg.replaceChildren());

  return {
    set: (v) => { max = v; retarget(); },
    destroy: bag.dispose,
  };
}

export default {
  name: "gears",
  means: "Two meshed gears, 12 teeth and 8: each turn of the big one turns the small one 1.5 times, so 2 turns make 3.",
  rules: [1, 5, 6, 8],
  range: [1, 2, 3],
  tour: [[110, 125], [170, 150], [290, 190], null],
  mount,
};
