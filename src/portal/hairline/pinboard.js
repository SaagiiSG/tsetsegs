import { HL } from './kernel.js';

/**
 * Pinboard: a framed board on two feet, one claim card near the top and three
 * evidence cards pinned below it. A strung card is joined to the claim by a
 * taut string, pin to pin; a loose one has its string dangling off its own
 * pin. The pointer sweeps across the board: each card it reaches pulls its
 * string taut to the claim, one at a time, staggered outwards from it. Short
 * of two proofs the claim sags, tipping on its pin and slipping down. At rest
 * two proofs hold the claim up and the third string dangles. The slider is the
 * slack, how far a loose string hangs below its pin.
 *
 * The pattern: one of many, swept. Tweens, a stagger by distance, and a hit
 * test on the cards' rest centres along screen x, which nothing drawn moves.
 */
const {
  Cam, clamp, facing, fit, hull, lerp, open, poly, prism, proj, put, r2, rad, rings, rrect, run, seg, solid,
  tdone, tset, tval, tween, disposer, mk, place, pointer, register,
} = HL;

const W = 160, H = 100, TB = 5, BR = 6, FR = 6, LEAN = -10, Z0 = 7, TK = 1.4, SO = 4, PR = 2.6, STEP = 45, S = 1.6;
// the claim card [u0, v0, u1, v1], pinned near its foot, where the strings meet
const CL = [20, 60, 90, 84], CP = [55, 65];
// three evidence cards [u0, v0, u1, v1, tilt in degrees], each pinned a little crooked near its top: two under the claim, one off to the right
const EV = [[9, 11, 49, 39, 4], [59, 12, 99, 40, -3], [110, 24, 150, 52, -5]];
// short of two proofs the claim sags: it tips on its pin and slides down the board, by SAG[n] of TIP degrees and DROP
const SAG = [1, 0.75, 0, 0], TIP = -16, DROP = 7, REST = 2;

/** Turns (u, v) by a degrees about (pu, pv), in the board's plane. */
const rot = (pu, pv, a) => {
  const cs = Math.cos(rad(a)), sn = Math.sin(rad(a));
  return (u, v) => [pu + (u - pu) * cs - (v - pv) * sn, pv + (u - pu) * sn + (v - pv) * cs];
};

function mount({ stage, svg, read }, value) {
  const bag = disposer();
  let slack = value;

  // The board leans back by LEAN; B(u, v, o) is a point on its face, o out from it towards the viewer.
  const C = Cam(45, 0.5, S), ls = Math.sin(rad(LEAN)), lc = Math.cos(rad(LEAN));
  const W3 = (u, v, o) => [u, v * ls + o * lc, Z0 + v * lc - o * ls];
  fit(C, [W3(0, 0, 0), W3(W, 0, 0), W3(0, H, -TB), W3(W, H, -TB), [0, 6, 0], [W, 6, 0]], 200, 166);
  const P = proj(C), front = facing(C), B = (u, v, o) => P(...W3(u, v, o));

  const g = mk("g", {}, svg);
  // two feet, painted first: the board stands on them and hides their far halves
  for (const x of [14, W - 42]) { const [fr, fi] = rings(x, -9, x + 28, 6, 4, 1.4); put(solid(g), prism(P, front, fr, fi, 0, Z0)); }
  // the board: a silhouette round its face and back, one crease where its top and right edges turn, and the frame round the cork
  const outer = rrect(0, 0, W, H, BR, 6), crease = rrect(1.6, 1.6, W - 1.6, H - 1.6, BR - 1.6, 6);
  const at = (o) => (q) => B(q.u, q.v, o);
  mk("path", { d: poly(hull(outer.map(at(0)).concat(outer.map(at(-TB))))), class: "sil" }, g);
  mk("path", { d: open(run(crease, (q) => 0.61 * q.nu + 0.39 * q.nv > 0).map(at(0))), class: "nf lo" }, g);
  mk("path", { d: poly(rrect(FR, FR, W - FR, H - FR, 3, 6).map(at(0))), class: "nf lo" }, g);

  /** A card: its back, its face TK off the board, and its written lines, all turned by a about its pin, then moved dv down the board. */
  function card(r, pin, a, lines, dv = 0) {
    const T = rot(pin[0], pin[1], a), R = (u, v) => { const p = T(u, v); return [p[0], p[1] - dv]; };
    const ring = rrect(r[0], r[1], r[2], r[3], 2.5, 4).map((q) => R(q.u, q.v));
    return {
      back: poly(ring.map((p) => B(p[0], p[1], 0))),
      face: poly(ring.map((p) => B(p[0], p[1], TK))),
      lines: lines.map(([u0, u1, v]) => seg(B(...R(u0, v), TK), B(...R(u1, v), TK))).join(""),
    };
  }
  const cardEls = (cls) => ({ back: mk("path", { class: "lo" }, g), face: mk("path", { class: "sil" }, g), lines: mk("path", { class: cls }, g) });
  const drawCard = (els, q) => { for (const k in els) els[k].setAttribute("d", q[k]); };

  const ev = EV.map((r, i) => {
    const pin = [(r[0] + r[2]) / 2, r[3] - 5], els = cardEls("nf lo");
    drawCard(els, card(r, pin, r[4], [[r[0] + 6, r[2] - 6, r[3] - 14], [r[0] + 6, r[2] - 14, r[3] - 21]]));
    return { i, pin, els, t: tween(i < REST ? 1 : 0), x: B(pin[0], (r[1] + r[3]) / 2, 0)[0], drawn: "" };
  });
  const claim = { els: cardEls("nf"), k: tween(SAG[REST]), pin: CP, drawn: NaN };
  claim.els.face.classList.add("hi");

  // strings in front of every card, then the pin heads over their ends
  ev.forEach((e) => { e.path = mk("path", { class: e.i < REST ? "nf sil" : "nf" }, g); });
  const head = (p, cls) => { const el = mk("circle", { r: r2(PR * S), class: cls }, g); place(el, B(p[0], p[1], SO + 1)); return el; };
  ev.forEach((e) => { e.head = head(e.pin, "dot m"); });
  claim.head = head(CP, "dot");

  /** A string from pin A: hanging `slack` below it in a slight bow when loose (t 0), a straight line to the claim's pin when strung (t 1). */
  function string(A, t) {
    const T = claim.pin, E = [lerp(A[0] + 5, T[0], t), lerp(A[1] - slack, T[1], t)];
    const M = [lerp(A[0] - 4, (A[0] + T[0]) / 2, t), lerp(A[1] - 0.55 * slack, (A[1] + T[1]) / 2, t)], pts = [];
    for (let k = 0; k <= 16; k++) {
      const q = k / 16, a = (1 - q) * (1 - q), b = 2 * q * (1 - q), d = q * q;
      pts.push(B(a * A[0] + b * M[0] + d * E[0], a * A[1] + b * M[1] + d * E[1], SO));
    }
    return open(pts);
  }

  const L = register(stage, (_dt, now) => {
    let moving = false;
    const k = tval(claim.k, now);
    if (!tdone(claim.k, now)) moving = true;
    if (k !== claim.drawn) {
      claim.drawn = k;
      claim.pin = [CP[0], CP[1] - DROP * k];
      drawCard(claim.els, card(CL, CP, TIP * k, [[CL[0] + 8, CL[2] - 8, CL[3] - 9], [CL[0] + 8, CL[2] - 22, CL[3] - 16]], DROP * k));
      place(claim.head, B(claim.pin[0], claim.pin[1], SO + 1));
    }
    for (const e of ev) {
      const t = tval(e.t, now), key = t + "|" + slack + "|" + k;
      if (!tdone(e.t, now)) moving = true;
      if (key === e.drawn) continue;
      e.drawn = key;
      e.path.setAttribute("d", string(e.pin, t));
    }
    return moving;
  });
  bag.add(L.unregister);

  // Hit test: how many cards' rest centres lie left of the pointer, halfway to the next. They never move.
  const gap = ev[1].x - ev[0].x;
  const hit = ([x]) => clamp(ev.filter((e) => x >= e.x - gap / 2).length, 0, ev.length);

  let act = -1;
  const caption = (m) => (m < 0 ? "rest" : m === 0 ? "claim" : "claim + " + m + (m > 1 ? " proofs" : " proof"));
  /** Strings the first m cards to the claim (-1 is rest). The change spreads from the first card to move. */
  function choose(m) {
    if (m === act) return;
    const now = performance.now(), n0 = act < 0 ? REST : act, n1 = m < 0 ? REST : m, f = n1 > n0 ? n0 : n0 - 1;
    act = m;
    for (const e of ev) {
      tset(e.t, e.i < n1 ? 1 : 0, now, Math.abs(e.i - f) * STEP);
      const pick = e.i === m - 1;
      e.els.face.classList.toggle("hi", pick);
      e.path.classList.toggle("hi", pick);
      e.path.classList.toggle("sil", e.i < n1);
      e.head.classList.toggle("m", !pick);
    }
    tset(claim.k, SAG[n1], now, 0);
    claim.els.face.classList.toggle("hi", m <= 0);
    claim.head.classList.toggle("m", m > 0);
    read.textContent = caption(m);
    L.wake();
  }
  read.textContent = "rest";

  bag.add(pointer(stage, { move: (p) => choose(hit(p)), leave: () => choose(-1) }));
  bag.add(() => svg.replaceChildren());

  return {
    set: (v) => { slack = v; L.wake(); },
    destroy: bag.dispose,
  };
}

export default {
  name: "pinboard",
  means: "A claim pinned above its evidence: sweep across and each card's string pulls taut to the claim, one proof at a time.",
  rules: [1, 2, 5, 8],
  range: [16, 26, 32],
  tour: [[96, 150], [138, 168], [255, 206], null],
  mount,
};
