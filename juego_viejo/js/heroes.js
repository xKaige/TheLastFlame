'use strict';
// Retratos de héroe armados por partes según el equipo puesto.
// Cada ranura recibe {v, t} (variante de la base y calidad) o null si está vacía.

function lookOf(equip) {
  const l = {};
  for (const s of SLOTS) l[s] = equip[s] ? { v: equip[s].v || 0, t: equip[s].tier } : null;
  return l;
}
const lookKey = l => SLOTS.map(s => (l[s] ? `${l[s].v}${l[s].t}` : '-')).join('');

// Las piezas finas brillan más; las antiguas llevan gemas y filetes
const tv = (v, p) => Math.min(1, v + (p ? p.t * 0.06 : 0));
function gem(g, x, y, p, r = 1) { if (p && p.t === 2) { ell(g, x, y, r + 0.5, r + 0.5, OUT, 0); ell(g, x, y, r, r, 1, 0); } }
function trim(g, pts, p, closed) {
  if (!p || !p.t) return;
  path(g, pts); if (closed) g.closePath();
  g.strokeStyle = G(p.t === 2 ? 1 : 0.88); g.lineWidth = 0.6; g.stroke();
}
function elfEars(g, race, y = 12.5) {
  if (race !== 'elfo') return;
  poly(g, [[26.8, y - 0.5], [22.6, y - 4.5], [26.9, y + 2]], 0.66, 0.6);
  poly(g, [[37.2, y - 0.5], [41.4, y - 4.5], [37.1, y + 2]], 0.66, 0.6);
}

// ===================== Caballero =====================
function knightLegs(g, b, hasArmor) {
  for (const [x, s] of [[24, 1], [35, -1]]) {
    // muslos
    if (hasArmor) {
      poly(g, [[x, 43], [x + 7, 43], [x + 6.5, 49], [x + 0.5, 49]], 0.5);
      line(g, x + 1.5, 44, x + 1.5, 48.5, 0.7, 0.8);
    } else {
      poly(g, [[x, 43], [x + 7, 43], [x + 6.5, 52], [x + 0.5, 52]], 0.3);
      line(g, x + 3.5, 44, x + 3.5, 51, 0.4, 0.18);
    }
    if (!b) {
      poly(g, [[x + 0.5, 51], [x + 6.5, 51], [x + 6, 60.5], [x + 1, 60.5]], 0.3);
      poly(g, [[x + s * 0.5, 60], [x + 7 + s * 0.5, 60], [x + 7.5 + s, 63.6], [x - 0.5 + s, 63.6]], 0.22);
      continue;
    }
    poly(g, [[x + 0.5, 53], [x + 6.5, 53], [x + 6, 61], [x + 1, 61]], tv(0.52, b));
    line(g, x + 2, 54, x + 2, 60.5, 0.8, 0.82);
    line(g, x + 1, 57, x + 6, 57, 0.5, 0.3);
    trim(g, [[x + 0.5, 53], [x + 1, 61]], b); trim(g, [[x + 6.5, 53], [x + 6, 61]], b);
    if (b.v === 1) {
      // escarpes puntiagudos
      poly(g, [[x - 1 + s, 60.5], [x + 7 + s, 60.5], [x + 3 + s * 7, 63.6], [x - 2 + s, 63.6]], tv(0.45, b));
      for (let i = 0; i < 3; i++) line(g, x + 0.5 + s + i * 2, 61, x + 0.5 + s + i * 2, 63.3, 0.4, 0.25);
    } else {
      poly(g, [[x - 1 + s, 60.5], [x + 7 + s, 60.5], [x + 8 + s * 2, 63.6], [x - 2 + s, 63.6]], tv(0.45, b));
      line(g, x + s, 62, x + 7 + s, 62, 0.5, 0.25);
    }
    ell(g, x + 3.5, 51, 3.6, 3, tv(0.62, b), 1);
    g.beginPath(); g.arc(x + 3.5, 51, 3.6, Math.PI * 1.1, Math.PI * 1.9); g.strokeStyle = G(0.92); g.lineWidth = 0.9; g.stroke();
    if (b.v === 1) poly(g, [[x + 2.3, 50], [x + 3.5, 46.5], [x + 4.7, 50]], 0.9, 0.6);
    else ell(g, x + 3.5, 51.3, 1.3, 1.1, 0.35, 0);
    gem(g, x + 3.5, 51.3, b, 0.9);
  }
}

function knightBody(g, p) {
  if (!p) {
    // gambesón acolchado
    poly(g, [[22, 20], [42, 20], [44.5, 30], [42.5, 45], [21.5, 45], [19.5, 30]], 0.42);
    for (let x = 24; x < 42; x += 3) line(g, x, 21, x - 0.3, 44, 0.5, 0.28);
    for (let y = 25; y < 44; y += 5) line(g, 21, y, 43, y, 0.4, 0.3);
    poly(g, [[22.5, 36.5], [41.5, 36.5], [41.5, 38.6], [22.5, 38.6]], 0.2, 0);
    ell(g, 32, 37.5, 1.2, 1, 0.75, 0);
    return;
  }
  if (p.v === 1) {
    // falda de malla bajo las placas
    poly(g, [[21, 40], [43, 40], [44, 47], [20, 47]], 0.5);
    for (let y = 41; y < 47; y += 1.6) for (let x = 21; x < 44; x += 1.6) ell(g, x + ((y * 5) % 2) * 0.8, y, 0.45, 0.45, 0.8, 0);
  }
  for (let i = 0; i < 3; i++) {
    poly(g, [[22 - i * 0.6, 37 + i * 2.4], [42 + i * 0.6, 37 + i * 2.4], [42.5 + i * 0.6, 40 + i * 2.4], [21.5 - i * 0.6, 40 + i * 2.4]], tv(0.5 - i * 0.04, p));
    line(g, 22.5 - i * 0.6, 37.6 + i * 2.4, 41.5 + i * 0.6, 37.6 + i * 2.4, 0.5, 0.85);
  }
  poly(g, [[22, 20], [42, 20], [44.5, 29], [41.5, 37.5], [22.5, 37.5], [19.5, 29]], tv(0.6, p));
  ell(g, 27, 25, 4, 3, tv(0.78, p), 0, -0.4);
  line(g, 32, 20.5, 32, 37, 0.9, 0.88);
  for (const y of [30, 33, 35.6]) { line(g, 21, y, 43, y, 0.7, 0.28); line(g, 21.3, y + 0.8, 42.7, y + 0.8, 0.4, 0.75); }
  for (const [x1, y1, x2, y2] of [[25, 22, 29, 27], [37, 23, 40, 21.5], [35, 27, 39, 29]]) line(g, x1, y1, x2, y2, 0.4, 0.3);
  if (p.v === 1) {
    // sobreveste templaria con cruz
    poly(g, [[27, 20.5], [37, 20.5], [38.5, 48], [32, 50], [25.5, 48]], 0.86);
    for (const x of [28.5, 35.5]) line(g, x, 22, x + (x > 32 ? 1 : -1), 47, 0.4, 0.6);
    line(g, 32, 24, 32, 42, 2.4, 0.15); line(g, 27.5, 29, 36.5, 29, 2.4, 0.15);
  }
  trim(g, [[22, 20], [42, 20], [44.5, 29], [41.5, 37.5], [22.5, 37.5], [19.5, 29]], p, true);
  poly(g, [[23, 37], [41, 37], [41, 38.6], [23, 38.6]], 0.25, 0);
  ell(g, 32, 37.8, 1.2, 1, 0.9, 0);
  gem(g, 32, 24.5, p, 1.1);
}

function knightShoulders(g, p) {
  if (!p) { ell(g, 43.5, 22.5, 4.5, 3.5, 0.42); ell(g, 20.5, 22.5, 4.5, 3.5, 0.42); return; }
  const big = p.v === 1 ? 1 : 0;
  for (const side of [1, -1]) {
    for (let i = 2; i >= 0; i--) {
      const x = 32 + side * (12 + i * 0.8), y = 21 + i * 2.6, rx = 6.2 - i * 0.6 + big;
      ell(g, x, y, rx, 3.6 + big * 0.4, tv(0.56 + i * 0.04, p), 1, side * 0.25);
      g.beginPath(); g.ellipse(x, y, rx, 3.6 + big * 0.4, side * 0.25, Math.PI * 1.05, Math.PI * 1.92);
      g.strokeStyle = G(p.t === 2 ? 1 : 0.9); g.lineWidth = 0.7; g.stroke();
    }
    gem(g, 32 + side * 12, 19.5, p, 0.8);
  }
}

function knightWeapon(g, a, armored) {
  limb(g, [[44, 25], [47, 33], [48.5, 41]], 3.2, armored ? 0.55 : 0.42);
  if (armored) { line(g, 45.5, 30, 48, 30.5, 0.5, 0.9); line(g, 47, 36, 49.5, 36.5, 0.5, 0.9); ell(g, 48.5, 33.5, 2, 1.6, 0.7); }
  if (a && a.v === 0) {
    line(g, 47.5, 47, 59, 9, 3.6, OUT); line(g, 47.5, 47, 59, 9, 2, tv(0.9, a));
    line(g, 48.6, 44, 58.6, 11, 0.5, 0.6);
    poly(g, [[58.2, 9.5], [60, 6], [60, 10]], tv(0.9, a), 0);
    if (a.t === 2) for (let i = 0; i < 4; i++) ell(g, 51 + i * 1.6, 34 - i * 5.2, 0.4, 0.6, 0.2, 0);
    line(g, 44.5, 42, 53, 45.5, 3.4, OUT); line(g, 44.5, 42, 53, 45.5, 1.8, tv(0.74, a));
  } else if (a && a.v === 1) {
    // hacha de guerra
    line(g, 46.5, 52, 56, 10, 3, OUT); line(g, 46.5, 52, 56, 10, 1.6, 0.42);
    poly(g, [[54.5, 12], [61, 6.5], [63, 18], [57, 19]], tv(0.82, a), 1);
    line(g, 61.2, 7.3, 63, 17.5, 0.7, 1);
    poly(g, [[55, 13], [50.5, 14], [54.5, 17]], tv(0.7, a), 0.8);
    gem(g, 57.6, 13.6, a);
  } else if (a && a.v === 2) {
    // maza de armas
    line(g, 47, 50, 55, 20, 3, OUT); line(g, 47, 50, 55, 20, 1.7, tv(0.6, a));
    for (let k = 0; k < 6; k++) {
      const an = (k * Math.PI) / 3, cx = 55.6 + Math.cos(an) * 4.4, cy = 17.5 + Math.sin(an) * 4.4;
      poly(g, [[55.6, 17.5], [cx + Math.cos(an + 1.2) * 1.2, cy + Math.sin(an + 1.2) * 1.2], [cx, cy], [cx + Math.cos(an - 1.2) * 1.2, cy + Math.sin(an - 1.2) * 1.2]], tv(0.72, a), 0.7);
    }
    ell(g, 55.6, 17.5, 2.6, 2.6, tv(0.8, a));
    gem(g, 55.6, 17.5, a);
  }
  ell(g, 48.6, 44, 2.6, 2.2, armored ? 0.45 : 0.6);
  for (let i = 0; i < 3; i++) line(g, 46.6, 43 + i * 1.1, 50.4, 43.5 + i * 1.1, 0.4, 0.25);
  if (a && a.v === 0) ell(g, 47, 48.6, 1.3, 1.3, 0.85);
}

function knightShield(g, e, armored) {
  limb(g, [[20, 23], [16.5, 31], [17, 38]], 3, armored ? 0.55 : 0.42);
  if (!e) { ell(g, 17, 39, 2.4, 2.2, armored ? 0.45 : 0.6); return; }
  const scratches = [[9, 30, 13, 33], [20, 41, 23, 38], [10, 43, 12, 47], [21, 29, 24, 31]];
  if (e.v === 0) {
    const s = [[5, 25.5], [27, 23.5], [27.5, 37], [24, 47], [16, 55], [9, 46], [5.5, 36]];
    poly(g, s, tv(0.8, e), 1.4);
    poly(g, [[7, 27.3], [25.4, 25.6], [25.8, 36.8], [22.6, 45.8], [16, 52.4], [10.4, 45.2], [7.4, 36]], 0.4, 0);
    for (const [x1, y1, x2, y2] of scratches) line(g, x1, y1, x2, y2, 0.4, 0.22);
    line(g, 16.4, 28, 16, 49, 3.6, OUT); line(g, 16.4, 28, 16, 49, 2.2, tv(0.86, e));
    line(g, 9, 35.4, 24, 34.4, 3.6, OUT); line(g, 9, 35.4, 24, 34.4, 2.2, tv(0.86, e));
    line(g, 15.6, 28.5, 15.3, 48.5, 0.5, 1);
    gem(g, 16.2, 34.9, e, 1.3);
  } else if (e.v === 1) {
    // pavés: alto, con nervio central
    poly(g, [[4.5, 21], [27.5, 20], [28, 52], [16.5, 58], [5, 52]], tv(0.76, e), 1.4);
    poly(g, [[6.5, 23], [25.8, 22.2], [26, 50.8], [16.5, 55.6], [7, 50.8]], 0.36, 0);
    poly(g, [[14.5, 22.5], [18.5, 22.3], [18.5, 55.5], [16.5, 56.5], [14.5, 55.5]], tv(0.66, e), 0.8);
    line(g, 15.6, 23, 15.6, 55, 0.6, 1);
    for (const y of [30, 44]) line(g, 7, y, 26, y - 0.4, 1.2, 0.6);
    for (const [x1, y1, x2, y2] of scratches) line(g, x1, y1 - 2, x2, y2 - 2, 0.4, 0.2);
    gem(g, 16.5, 37, e, 1.3);
  } else {
    // escudo redondo con umbo
    ell(g, 15.5, 37, 12, 12, tv(0.78, e), 1.4);
    ell(g, 15.5, 37, 10.2, 10.2, 0.38, 0);
    for (let k = 0; k < 8; k++) line(g, 15.5, 37, 15.5 + Math.cos(k * 0.785) * 10, 37 + Math.sin(k * 0.785) * 10, 0.5, 0.25);
    for (let k = 0; k < 12; k++) ell(g, 15.5 + Math.cos(k * 0.52) * 11.1, 37 + Math.sin(k * 0.52) * 11.1, 0.6, 0.6, 0.95, 0);
    ell(g, 15.5, 37, 3.4, 3.4, tv(0.85, e));
    ell(g, 14.6, 36, 1.2, 1, 1, 0);
    gem(g, 15.5, 37, e, 1.2);
  }
  if (e.t) trim(g, [[6, 27], [6, 33]], e);
}

function knightHead(g, c, race) {
  poly(g, [[26.5, 18], [37.5, 18], [38.5, 21], [25.5, 21]], c ? 0.45 : 0.6);
  if (c) line(g, 26, 19.5, 38, 19.5, 0.5, 0.8);
  g.save(); g.translate(32, 20.5); g.scale(0.8, 0.8); g.translate(-32, -20.5);
  const dwarf = race === 'enano';
  const face = () => {
    elfEars(g, race, 12.5);
    ell(g, 32, 12.8, 5.4, 6.6, 0.66);
    ell(g, 29.8, 12, 0.7, 0.6, 0.05, 0); ell(g, 34.2, 12, 0.7, 0.6, 0.05, 0);
    line(g, 28.6, 10.5, 31, 10.8, 0.6, 0.25); line(g, 33, 10.8, 35.4, 10.5, 0.6, 0.25);
    poly(g, dwarf ? [[26, 14], [38, 14], [38, 22], [32, 28], [26, 22]] : [[26.8, 15], [37.2, 15], [36, 20], [32, 21.5], [28, 20]], dwarf ? 0.3 : 0.25, 0.6);
    line(g, 30.5, 16, 33.5, 16, 0.5, 0.08);
  };
  if (!c) {
    face();
    poly(g, [[26.5, 11], [26.8, 6.5], [32, 4.6], [37.2, 6.5], [37.5, 11], [35.5, 8.2], [32, 8.8], [28.5, 8.2]], 0.2, 0.6);
    line(g, 35.4, 9.5, 36.8, 14.8, 0.5, 0.85);
  } else if (c.v === 0) {
    // capelina con nasal: deja ver la cara
    face();
    poly(g, [[25, 12], [25.6, 7], [32, 3.4], [38.4, 7], [39, 12]], tv(0.66, c));
    ell(g, 32, 12, 9, 1.7, tv(0.6, c));
    ell(g, 29, 7.5, 2, 1.2, 0.88, 0, -0.3);
    line(g, 32, 11.5, 32, 17, 1.6, OUT); line(g, 32, 11.5, 32, 17, 0.9, tv(0.78, c));
    for (const sx of [-1, 1]) poly(g, [[32 + sx * 7, 12.5], [32 + sx * 4.6, 12.5], [32 + sx * 4.8, 19], [32 + sx * 6.8, 17.5]], tv(0.58, c), 0.8);
    trim(g, [[25, 12], [39, 12]], c);
    gem(g, 32, 6.3, c);
  } else {
    // gran yelmo de visera con cruces y penacho
    poly(g, [[25.5, 7.5], [38.5, 7.5], [39.6, 15.5], [37.5, 19.5], [26.5, 19.5], [24.4, 15.5]], tv(0.62, c));
    g.beginPath(); g.ellipse(32, 8, 6.6, 4.4, 0, Math.PI, 0); g.fillStyle = G(tv(0.66, c)); g.fill();
    g.strokeStyle = G(OUT); g.lineWidth = 1; g.stroke();
    ell(g, 28.5, 8.5, 2, 1.4, 0.88, 0, -0.3);
    line(g, 32, 3.8, 32, 19.4, 1, 0.9);
    line(g, 25, 11.3, 39, 11.3, 1.6, 0.03);
    for (const cx of [28.6, 35.4]) { line(g, cx, 12, cx, 16.4, 0.9, 0.03); line(g, cx - 1.6, 14, cx + 1.6, 14, 0.9, 0.03); }
    for (let i = 0; i < 3; i++) { ell(g, 27.6 + i * 1.2, 17.8, 0.35, 0.35, 0.05, 0); ell(g, 34 + i * 1.2, 17.8, 0.35, 0.35, 0.05, 0); }
    line(g, 25.2, 15.6, 38.8, 15.6, 0.4, 0.4);
    trim(g, [[25.5, 7.5], [24.4, 15.5], [26.5, 19.5], [37.5, 19.5], [39.6, 15.5], [38.5, 7.5]], c);
    if (c.t === 2) for (let i = 0; i < 5; i++) ell(g, 27 + i * 2.5, 6.2, 0.5, 0.5, 1, 0);
    const strands = [];
    for (let i = 0; i < 8; i++) strands.push([i * 0.75, 0.72 + ((i * 7) % 3) * 0.1]);
    for (const [w, v] of [[3.6, OUT], [1.8, null]]) {
      for (const [o, col] of strands) {
        g.beginPath(); g.moveTo(32, 4);
        g.bezierCurveTo(30 + o, -5 + o * 0.2, 40 + o, -5 + o, 45 + o * 0.7, 6 + o * 2);
        g.strokeStyle = G(v === null ? col : v); g.lineWidth = w; g.stroke();
      }
    }
    ell(g, 32, 4, 1.6, 1.2, 0.7);
  }
  g.restore();
}

function drawKnightHero(g, L, race) {
  poly(g, [[21, 18], [44, 18], [50, 34], [54, 50], [57, 62], [53, 59], [51, 64], [47, 60], [44, 64], [41, 61],
    [24, 61], [20, 64], [17, 60], [13, 64], [10, 61], [12, 46], [16, 30]], 0.12);
  for (const x of [15, 22, 46, 51]) line(g, x, 40, x + (x > 32 ? 2 : -1), 60, 0.6, 0.22);
  const armored = !!L.pechera;
  knightLegs(g, L.botas, armored);
  knightBody(g, L.pechera);
  knightWeapon(g, L.arma, armored);
  knightShoulders(g, L.pechera);
  knightShield(g, L.escudo, armored);
  knightHead(g, L.casco, race);
}

// ===================== Pícaro =====================
function drawRogueHero(g, L, race) {
  const { arma: a, escudo: e, casco: c, pechera: p, botas: b } = L;
  poly(g, [[22, 16], [42, 16], [48, 58], [16, 60]], 0.12);
  // piernas y botas
  for (const [x, s] of [[24, 0], [35, 1]]) {
    poly(g, [[x + 2, 41], [x + 7, 41], [x + 6 + s, 61], [x + s, 61]], 0.4);
    if (!b) poly(g, [[x - 1 + s, 59.5], [x + 7 + s, 59.5], [x + 7.5 + s, 63.5], [x - 1.5 + s, 63.5]], 0.25);
    else if (b.v === 0) {
      poly(g, [[x - 2 + s * 1.5, 57], [x + 7 + s, 57], [x + 8 + s, 63.5], [x - 3 + s * 2, 63.5]], tv(0.3, b));
      line(g, x - 1.5 + s * 1.5, 58, x + 7 + s, 58, 0.6, tv(0.55, b));
    } else {
      poly(g, [[x - 0.5 + s, 49], [x + 7.5 + s, 49], [x + 8 + s, 63.5], [x - 3 + s * 2, 63.5]], tv(0.33, b));
      poly(g, [[x - 1 + s, 48], [x + 8 + s, 48], [x + 8 + s, 51], [x - 1 + s, 51]], tv(0.42, b), 0.8);
      for (const y of [54, 58]) { line(g, x + s, y, x + 7 + s, y, 0.6, 0.2); ell(g, x + 5.5 + s, y, 0.7, 0.7, 0.9, 0); }
    }
    if (b) gem(g, x + 3 + s, 59.5, b, 0.7);
  }
  // torso
  const torso = [[24, 19], [40, 19], [42, 32], [39, 44], [25, 44], [22, 32]];
  if (!p) {
    poly(g, torso, 0.62);
    for (let i = 0; i < 4; i++) line(g, 30.5, 21 + i * 2.4, 33.5, 22 + i * 2.4, 0.4, 0.2);
    for (const [x1, x2] of [[25, 27], [39, 37]]) line(g, x1, 25, x2, 42, 0.4, 0.4);
  } else if (p.v === 0) {
    poly(g, torso, tv(0.5, p));
    for (let y = 22; y < 42; y += 3) for (let x = 25; x < 40; x += 4) ell(g, x + ((y / 3) % 2) * 2, y, 0.6, 0.6, 0.85, 0);
  } else {
    poly(g, torso, tv(0.38, p));
    for (let y = 22.5; y < 42; y += 4) for (let x = 25.5; x < 39; x += 4) ell(g, x, y, 0.9, 0.9, tv(0.9, p), 0.4);
    line(g, 24, 21, 24, 43, 0.5, 0.6); line(g, 40, 21, 40, 43, 0.5, 0.6);
  }
  trim(g, torso, p, true);
  line(g, 23, 25, 41, 39, 2.2, 0.28);
  for (let i = 0; i < 3; i++) ell(g, 26 + i * 6, 26.5 + i * 4.7, 0.8, 1.4, 0.75, 0, -0.9);
  poly(g, [[24, 40], [40, 40], [40, 43], [24, 43]], 0.3);
  ell(g, 32, 41.5, 1.2, 1.2, 0.85, 0);
  gem(g, 32, 22, p);
  // brazo derecho y arma
  limb(g, [[41, 23], [48, 31], [51, 37]], 2.6, 0.48);
  if (a && a.v === 0) {
    line(g, 51, 37, 61, 5, 2.4, OUT); line(g, 51, 37, 61, 5, 1, tv(0.92, a));
    g.beginPath(); g.arc(51.4, 36, 2.6, Math.PI * 1.2, Math.PI * 2.2); g.strokeStyle = G(tv(0.8, a)); g.lineWidth = 0.9; g.stroke();
    line(g, 48.6, 36.5, 54.4, 34.7, 1.2, tv(0.7, a));
    gem(g, 51.2, 38.5, a, 0.8);
  } else if (a && a.v === 1) {
    for (const [w, v] of [[3.4, OUT], [1.8, tv(0.92, a)]]) {
      g.beginPath(); g.moveTo(51, 36); g.bezierCurveTo(54, 26, 59, 18, 56.5, 6);
      g.strokeStyle = G(v); g.lineWidth = w; g.stroke();
    }
    g.beginPath(); g.arc(51, 38, 2.8, Math.PI * 0.1, Math.PI * 1.1); g.strokeStyle = G(tv(0.8, a)); g.lineWidth = 0.9; g.stroke();
    line(g, 48.5, 35.6, 54, 36.4, 1.3, tv(0.7, a));
    gem(g, 51, 38.6, a, 0.8);
  } else if (a && a.v === 2) {
    line(g, 51, 37, 59, 31, 3, OUT); line(g, 51, 37, 59, 31, 1.6, tv(0.95, a));
    line(g, 50, 35.6, 52.6, 38.6, 1.2, 0.6);
    gem(g, 50.2, 38.6, a, 0.7);
  }
  ell(g, 51, 37.4, 1.8, 1.8, 0.5);
  // brazo izquierdo: la segunda daga (corta) o el puñal de parada (más largo, con guarda en cruz)
  limb(g, [[23, 23], [16, 31], [13, 37]], 2.6, 0.48);
  if (e && e.v === 1) {
    line(g, 13, 37, 3, 24, 3, OUT); line(g, 13, 37, 3, 24, 1.6, tv(0.95, e));
    line(g, 9.6, 36.4, 15, 31.6, 1.4, tv(0.7, e));
    line(g, 13, 37, 15.4, 40.2, 1.6, 0.3);
    gem(g, 14.6, 39.4, e, 0.7);
  } else if (e) {
    line(g, 13, 37, 5, 30, 3, OUT); line(g, 13, 37, 5, 30, 1.6, tv(0.95, e));
    line(g, 11.6, 38.6, 14.2, 35.4, 1.2, 0.6);
    gem(g, 14.4, 38.8, e, 0.7);
  }
  ell(g, 13, 37.4, 1.8, 1.8, 0.5);
  // cabeza
  if (!c || c.v === 0) {
    if (c) {
      // almófar de malla: la cofia va detrás y la cara asoma por la abertura
      poly(g, [[26, 20], [38, 20], [40, 24], [24, 24]], tv(0.52, c), 0.7);
      ell(g, 32, 13, 7.2, 8.2, tv(0.52, c));
      for (let y = 6; y < 24; y += 1.5) for (let x = 25.5; x < 39; x += 1.5) {
        const dx = (x - 32) / 7, dy = (y - 13) / 8;
        if (dx * dx + dy * dy < 0.95 || y > 20.5) ell(g, x, y, 0.4, 0.4, 0.85, 0);
      }
    } else elfEars(g, race, 13);
    ell(g, 32, c ? 14 : 13.2, c ? 4.2 : 5, c ? 4.8 : 6, 0.62, c ? 0.8 : 1);
    ell(g, 30.2, 13.2, 0.8, 0.6, 0.05, 0); ell(g, 33.8, 13.2, 0.8, 0.6, 0.05, 0);
    if (!c) {
      poly(g, [[26.5, 11.5], [27, 6.5], [32, 4.6], [37, 6.5], [37.5, 11.5], [35.5, 8.5], [33, 10], [31, 8.5], [28.5, 10]], 0.2, 0.6);
      poly(g, [[26.6, 14.8], [37.4, 14.8], [37, 19.2], [32, 21], [27, 19.2]], race === 'enano' ? 0.32 : 0.28, 0.6);
    } else {
      line(g, 30.5, 16.8, 33.5, 16.8, 0.5, 0.1);
      gem(g, 32, 6.5, c);
    }
  } else {
    poly(g, [[22, 22], [24, 8], [32, 1], [40, 8], [42, 22], [37, 20], [27, 20]], tv(0.38, c));
    trim(g, [[27, 20], [24, 8], [32, 1], [40, 8], [37, 20]], c);
    ell(g, 32, 13.5, 6, 6.5, 0.04, 0);
    ell(g, 29.8, 13, 1, 0.7, 1, 0); ell(g, 34.2, 13, 1, 0.7, 1, 0);
    poly(g, [[27, 18], [37, 18], [35, 22], [29, 22]], 0.3, 0);
    gem(g, 32, 21, c, 0.8);
  }
}

// ===================== Hechicero =====================
function drawMageHero(g, L, race) {
  const { arma: a, escudo: e, casco: c, pechera: p, botas: b } = L;
  // pies
  for (const [x, s] of [[26, -1], [34.5, 1]]) {
    if (!b) { ell(g, x + 1.5 + s, 62.4, 3, 1.5, 0.64); for (let i = 0; i < 3; i++) ell(g, x + s + i * 1.2, 63.2, 0.35, 0.35, 0.3, 0); }
    else if (b.v === 0) {
      ell(g, x + 1.5 + s, 62.4, 3, 1.5, 0.64);
      for (const dx of [-1, 0.6, 2.2]) line(g, x + 1.5 + s + dx, 61, x + 1.5 + s + dx * 0.6, 63.6, 0.6, tv(0.25, b));
    } else {
      poly(g, [[x - 1.5 + s, 60.5], [x + 4 + s, 60.5], [x + 4.5 + s, 63.6], [x - 2 + s * 4, 63.4], [x - 3.5 + s * 5, 61.6]], tv(0.45, b), 0.8);
      gem(g, x + 1.5 + s, 61.8, b, 0.7);
    }
  }
  // túnica / hábito / ropa simple
  if (!p) {
    for (const x of [26.5, 35]) poly(g, [[x, 44], [x + 4.5, 44], [x + 4, 61], [x + 0.5, 61]], 0.3);
    poly(g, [[24, 18], [40, 18], [42, 34], [43, 47], [21, 47], [22, 34]], 0.45);
    line(g, 32, 19, 32, 46, 0.5, 0.25);
    for (const [x1, x2] of [[26, 24], [38, 40]]) line(g, x1, 22, x2, 46, 0.4, 0.3);
    poly(g, [[22.5, 33], [41.5, 33], [41.5, 35.5], [22.5, 35.5]], 0.28, 0);
  } else {
    const dark = p.v === 1;
    poly(g, [[24, 18], [40, 18], [50, 61], [14, 61]], tv(dark ? 0.24 : 0.36, p));
    for (let i = 0; i < 4; i++) line(g, 27 + i * 4, 24, 22 + i * 7, 60.5, 0.8, dark ? 0.14 : 0.22);
    if (dark) {
      // escapulario y cordón
      poly(g, [[28.5, 19], [35.5, 19], [36.5, 58], [27.5, 58]], 0.32, 0.6);
      poly(g, [[25, 18], [39, 18], [37, 24], [27, 24]], 0.28, 0.6);
      for (const [w, v] of [[2, OUT], [1, 0.82]]) {
        g.beginPath(); g.moveTo(23, 34); g.quadraticCurveTo(32, 37, 41, 34);
        g.moveTo(30, 35.6); g.quadraticCurveTo(29, 42, 30.5, 48);
        g.strokeStyle = G(v); g.lineWidth = w; g.stroke();
      }
    } else {
      poly(g, [[24, 33], [40, 33], [40, 36], [24, 36]], 0.7);
      ell(g, 32, 34.5, 1.5, 1.5, 0.95, 0);
    }
    if (p.t) {
      poly(g, [[14.2, 58], [49.8, 58], [50, 61], [14, 61]], tv(0.6, p), 0);
      if (p.t === 2) for (let x = 16; x < 49; x += 4) ell(g, x, 59.6, 0.7, 0.7, 0.2, 0);
    }
    gem(g, 32, 21.5, p);
  }
  // arma (mano derecha)
  if (a && a.v === 0) {
    line(g, 48, 4, 46, 63, 3.6, OUT); line(g, 48, 4, 46, 63, 1.8, tv(0.58, a));
    curve(g, [[48, 6], [55, 2], [54, -3], [48, -2]], 1.2, tv(0.7, a));
    ell(g, 50, 2, 3, 3, 1, 0);
    if (a.t) ell(g, 50, 2, 4.2, 4.2, 0.95, 0), ell(g, 50, 2, 3, 3, 1, 0);
  }
  limb(g, [[39, 22], [44, 30], [46.5, 30]], 3.2, p ? tv(p.v === 1 ? 0.24 : 0.36, p) : 0.45);
  if (a && a.v === 1) {
    line(g, 46, 31, 55, 14, 2.8, OUT); line(g, 46, 31, 55, 14, 1.3, tv(0.5, a));
    ell(g, 55.3, 13.4, 1.8 + a.t * 0.4, 1.8 + a.t * 0.4, 1, 0);
    for (let k = 0; k < 4; k++) ell(g, 55.3 + Math.cos(k * 1.57 + 0.4) * 3.6, 13.4 + Math.sin(k * 1.57 + 0.4) * 3.6, 0.4, 0.4, 0.95, 0);
  } else if (a && a.v === 2) {
    line(g, 46, 36, 51.5, 12, 3, OUT); line(g, 46, 36, 51.5, 12, 1.6, tv(0.75, a));
    poly(g, [[48.5, 12.5], [54.5, 11.5], [55, 6.5], [53.2, 9], [51.8, 5], [50.4, 9.3], [48.4, 7.5]], tv(0.85, a), 0.8);
    ell(g, 51.6, 9.6, 1.1, 1.1, 1, 0);
    gem(g, 48.4, 22, a, 0.8);
  }
  ell(g, 46.6, 30.2, 1.9, 1.9, 0.66);
  // mano izquierda: grimorio u orbe
  limb(g, [[25, 22], [20, 32], [24, 38]], 3.2, p ? tv(p.v === 1 ? 0.24 : 0.36, p) : 0.45);
  if (e && e.v === 0) {
    poly(g, [[16, 33], [27.5, 31.5], [28.5, 41.5], [17, 43]], tv(0.42, e), 1.2);
    poly(g, [[17.4, 41.6], [28, 40.2], [28.5, 41.5], [17, 43]], 0.88, 0);
    line(g, 22.2, 32.4, 22.8, 42.3, 0.8, 0.25);
    ell(g, 22, 37, 1.6, 2, tv(0.85, e), 0.6);
    gem(g, 22, 37, e, 0.9);
  } else if (e && e.v === 1) {
    for (let k = 0; k < 6; k++) ell(g, 21.5 + Math.cos(k * 1.05) * 6.4, 31 + Math.sin(k * 1.05) * 6.4, 0.4, 0.4, 0.9, 0);
    ell(g, 21.5, 31, 4.4 + e.t * 0.4, 4.4 + e.t * 0.4, tv(0.7, e), 1);
    ell(g, 21.5, 31, 3, 3, 0.95, 0);
    ell(g, 20.4, 29.9, 1, 0.8, 1, 0);
  }
  ell(g, 24.5, 38.5, 2, 2, 0.66);
  // cabeza
  const beard = (len) => poly(g, [[28, 19], [36, 19], [34.5, 19 + len], [32, 21 + len], [29.5, 19 + len]], 0.82, 0.8);
  if (!c || c.v === 1) {
    if (c) poly(g, [[25.8, 9], [38.2, 9], [41, 27], [35, 22], [29, 22], [23, 27]], 0.26, 0.8);
    elfEars(g, race, 13.5);
    ell(g, 32, 14, 5.2, 6.2, 0.66);
    ell(g, 30, 13.4, 0.8, 0.6, 0.05, 0); ell(g, 34, 13.4, 0.8, 0.6, 0.05, 0);
    line(g, 28.6, 12, 31, 12.4, 0.7, 0.85); line(g, 33, 12.4, 35.4, 12, 0.7, 0.85);
    beard(race === 'enano' ? 14 : c ? 6 : 11);
    if (!c) {
      ell(g, 30.2, 9.6, 2.2, 1.3, 0.85, 0, -0.3);
      for (const sx of [-1, 1]) poly(g, [[32 + sx * 4.6, 11], [32 + sx * 6, 13], [32 + sx * 5.6, 19], [32 + sx * 4.4, 17]], 0.82, 0.6);
    } else {
      line(g, 26.4, 10.6, 37.6, 10.6, 2.2, OUT); line(g, 26.4, 10.6, 37.6, 10.6, 1.1, tv(0.88, c));
      ell(g, 32, 10.5, 1.3, 1.3, 1, 0.6);
    }
  } else {
    poly(g, [[22, 22], [25, 10], [31, -2], [35, 6], [40, 10], [42, 22], [36, 20], [28, 20]], tv(0.42, c));
    trim(g, [[28, 20], [25, 10], [31, -2], [35, 6], [40, 10], [36, 20]], c);
    ell(g, 32, 15, 5.5, 5.5, 0.04, 0);
    ell(g, 30, 14.5, 0.9, 0.7, 1, 0); ell(g, 34, 14.5, 0.9, 0.7, 1, 0);
    beard(11);
    gem(g, 31, 3, c, 0.8);
  }
}

// La Sombra del Rescoldo usa tu propio retrato como sprite de enemigo
function buildHeroShade() {
  if (!P) return;
  const draw = { guerrero: drawKnightHero, picaro: drawRogueHero, hechicero: drawMageHero }[P.cls];
  const d = g => draw(g, lookOf(P.equip), P.race);
  SPRITES.heroShade = { w: makeSprite(64, d, wispFade), p: makeSprite(128, d, wispFade) };
}

// ---------- Construcción y caché de retratos ----------
const portraitCache = new Map();
function heroPortrait(cls, race, look, size, rampName) {
  const key = [cls, race, lookKey(look), size, rampName].join('|');
  let c = portraitCache.get(key);
  if (!c) {
    const draw = { guerrero: drawKnightHero, picaro: drawRogueHero, hechicero: drawMageHero }[cls];
    const spr = makeSprite(128, g => draw(g, look, race));
    c = spriteCanvas(spr, size, rampName, 1.05);
    if (portraitCache.size > 40) portraitCache.delete(portraitCache.keys().next().value);
    portraitCache.set(key, c);
  }
  return c;
}

function kitLook(cls) {
  const l = {};
  for (const s of SLOTS) l[s] = null;
  for (const [s, v] of CLASSES[cls].kit) l[s] = { v, t: 0 };
  return l;
}
