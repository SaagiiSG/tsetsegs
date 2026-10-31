import { HL } from './kernel.js';

/**
 * Tokens: a dot plot as a beam. Ten round tokens stand in stacks on the seven
 * notches of a long bar, and the bar rests on a thin triangular pivot set at
 * their mean, so it balances level. One token, alone on the far notch, is bright.
 * The pointer's screen x picks a notch: the bright token lifts, carries over
 * the stacks and comes down on that notch's stack, held a little above it
 * while the pointer stays. The pivot chases the live mean on a spring, so the
 * bar stays level the whole way. The read-out is the new mean. The slider is
 * how high the held token hovers, in world units.
 *
 * The pattern: one of many. The notch is a choice, so the carry is one 700ms
 * tween along a lift, carry, set-down path; the pivot follows a number that
 * moves every frame, so a spring. The hit test is the notches' rest screen x,
 * which nothing moves.
 */
const {
  Cam, circ, clamp, facing, fillet, fit, hull, lerp, open, poly, prism, proj, rings, seg,
  spring, stepS, tset, tval, tdone, tween, disposer, mk, pointer, put, register, solid,
} = HL;

const NV = 7, D = 22, BL = 3 * D + 13, BW = 9, BT = 7, HP = 28, PB = 13, PW = 3;
const R = 8.4, RB = 1.6, T = 6, GAP = 1.5, S = 2.1, HOLD = 12;
const ZT = HP + BT; // the bar's top
// Still tokens per notch, 1 to 7: a mound peaking at 3. The bright one sits alone on 7, pulling the mean to 34 / 10 = 3.4.
const STILL = [1, 2, 3, 2, 1, 0, 0], HOME = 7, N = 10;
const SUM = STILL.reduce((a, c, i) => a + c * (i + 1), 0);
const r2 = Math.SQRT1_2;
/** World [x, y, z] from the bar's own frame: s along it (screen right), t towards the viewer, z up. */
const w3 = (s, t, z) => [(s + t) * r2, (t - s) * r2, z];
const sOf = (v) => (v - 4) * D;
const SUMS = STILL.reduce((a, c, i) => a + c * sOf(i + 1), 0);
/** A ring drawn in the bar's frame, turned into world samples. */
const turn = (ring) => ring.map((q) => ({ ...q, u: (q.u + q.v) * r2, v: (q.v - q.u) * r2, nu: (q.nu + q.nv) * r2, nv: (q.nv - q.nu) * r2 }));
// The pivot's face in (s, z): a triangle whose tip hides inside the bar.
const TRI = fillet([[PB, 0], [0, HP + 4], [-PB, 0]], [2.5, 2, 2.5]);
const UNIT = circ(1, 48);

function mount({ stage, svg, read }, value) {
  const bag = disposer();
  let hold = value;

  // Fitted to the bar, the pivot at both ends of its slide, and a token held over the tallest stack at the slider's top.
  const C = Cam(45, 0.5, S), ext = [];
  for (const k of [-1, 1]) for (const t of [-BW, BW]) ext.push(w3(k * BL, t, HP), w3(k * BL, t, ZT));
  for (const v of [1, HOME]) for (const t of [-PW, PW]) ext.push(w3((SUMS + sOf(v)) / N + (v === 1 ? -PB : PB), t, 0));
  ext.push(w3(sOf(3), -R, ZT + 4 * T + HOLD), w3(sOf(HOME), -R, ZT + T + HOLD));
  fit(C, ext, 200, 166);
  const P = proj(C), front = facing(C), W = (s, t, z) => P(...w3(s, t, z));

  const g = mk("g", {}, svg);
  const piv = solid(g);
  const [br, bi] = rings(-BL, -BW, BL, BW, 5, 1.6);
  put(solid(g), prism(P, front, turn(br), turn(bi), HP, ZT));
  // the notches: a tick on the bar's front face for each of the seven values
  const ticks = [];
  for (let v = 1; v <= NV; v++) ticks.push(seg(W(sOf(v), BW, HP + 1.8), W(sOf(v), BW, ZT - 2.2)));
  mk("path", { d: ticks.join(""), class: "nf lo" }, g);

  /** A token standing at s on the bar's centre line, its foot at z0: an edge and the raised rim on its face. */
  function chip(el, s, z0) {
    const ring = (r, z) => UNIT.map((q) => W(s + r * q.u, r * q.v, z));
    put(el, { sil: poly(hull(ring(R, z0).concat(ring(R, z0 + T)))), crease: poly(ring(R - RB, z0 + T)) });
  }
  /** The pivot, a thin plate at s = m: front and back faces hulled, the front face's two slopes as its second line. */
  function wedge(m) {
    const f = TRI.map(([a, b]) => W(m + a, PW, b)), bk = TRI.map(([a, b]) => W(m + a, -PW, b));
    put(piv, { sil: poly(hull(f.concat(bk))), crease: open(f.filter((_, i) => TRI[i][1] > 0.6)) });
  }

  STILL.forEach((c, i) => { for (let l = 0; l < c; l++) chip(solid(g), sOf(i + 1), ZT + l * T); });
  const mv = solid(g);
  mv.sil.classList.add("hi");

  // The carry: four points, lift, carry, set down, walked by arc length on one tween.
  let path = Array(4).fill([sOf(HOME), ZT]), lens = [0, 0, 0], len = 0, tw = tween(1), drawn = "", pd = NaN;
  function along(p) {
    let d = p * len;
    for (let i = 0; i < 3; i++) {
      if (d <= lens[i] || i === 2) {
        const a = path[i], b = path[i + 1], f = lens[i] ? clamp(d / lens[i], 0, 1) : 1;
        return [lerp(a[0], b[0], f), lerp(a[1], b[1], f)];
      }
      d -= lens[i];
    }
  }
  /** Sends the token from where it is to (s1, z1), over every stack it would cross. */
  function plan(s1, z1, now) {
    const [s0, z0] = along(tval(tw, now)), lo = Math.min(s0, s1) - 2 * R, hi = Math.max(s0, s1) + 2 * R;
    let top = Math.max(z0, z1);
    if (Math.abs(s1 - s0) > 0.01) STILL.forEach((c, i) => { if (sOf(i + 1) >= lo && sOf(i + 1) <= hi) top = Math.max(top, ZT + c * T + GAP); });
    path = [[s0, z0], [s0, top], [s1, top], [s1, z1]];
    lens = [top - z0, Math.abs(s1 - s0), top - z1];
    len = lens[0] + lens[1] + lens[2];
    tw = tween(0);
    tset(tw, 1, now, 0);
  }

  const pv = spring((SUMS + sOf(HOME)) / N);
  const B = register(stage, (dt, now) => {
    const [s, z] = along(tval(tw, now)), key = s + "," + z;
    if (key !== drawn) { drawn = key; chip(mv, s, z); }
    pv.t = (SUMS + s) / N; // the balance point of every token where it is now
    const m = stepS(pv, dt);
    if (pv.x !== pd) { pd = pv.x; wedge(pd); }
    return m || !tdone(tw, now);
  });
  bag.add(B.unregister);

  // The notch under the pointer, by screen x against the notches' rest positions, which never move.
  const x4 = W(0, 0, ZT)[0], pitch = W(D, 0, ZT)[0] - x4;
  const notch = (x) => clamp(Math.round((x - x4) / pitch) + 4, 1, NV);
  let act = -1;
  const aim = (now) => {
    const v = act < 0 ? HOME : act;
    plan(sOf(v), ZT + STILL[v - 1] * T + (act < 0 ? 0 : hold), now);
    B.wake();
  };
  /** Carries the bright token to notch k (-1 sets it back home). */
  function choose(k) {
    if (k === act) return;
    act = k;
    aim(performance.now());
    read.textContent = k < 0 ? "rest" : "mean " + ((SUM + k) / N).toFixed(1);
  }
  read.textContent = "rest";

  bag.add(pointer(stage, { move: (p) => choose(notch(p[0])), leave: () => choose(-1) }));
  bag.add(() => svg.replaceChildren());

  return {
    set: (v) => { hold = v; if (act >= 0) aim(performance.now()); },
    destroy: bag.dispose,
  };
}

export default {
  name: "tokens",
  means: "Ten tokens on a beam make a dot plot: move one to another notch and the pivot slides to the new mean, so the beam stays level.",
  rules: [1, 4, 5, 8],
  range: [0, 6, 12],
  tour: [[154, 150], [61, 150], [246, 150], null],
  mount,
};
