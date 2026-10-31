'use strict';
// Todo el arte es procedural: texturas por píxel y sprites dibujados con
// Canvas2D en escala de grises que luego pasan por el dithering de la paleta.

// ---------- Texturas de muros, piso y techo ----------
function makeTex(fn) {
  const t = new Float32Array(TEX * TEX);
  for (let y = 0; y < TEX; y++)
    for (let x = 0; x < TEX; x++) t[y * TEX + x] = clamp(fn(x, y), 0, 1);
  return t;
}

function brickAt(x, y, s) {
  const bh = 16, bw = 32;
  const row = Math.floor(y / bh);
  const off = (row % 2) * 16;
  const bx = Math.floor((x + off) / bw) % 2;
  const lx = (x + off) % bw, ly = y % bh;
  const n = fbm(x / 8, y / 8, s * 10 + 3, 8);
  if (lx < 2 || ly < 2) return 0.06 + n * 0.1;
  let v = 0.42 + hash2(bx, row, s) * 0.28 + (n - 0.5) * 0.4;
  if (ly === 2 || lx === 2) v += 0.14;
  if (ly === bh - 1 || lx === bw - 1) v -= 0.14;
  if (hash2(x, y, s + 9) > 0.965) v *= 0.45;
  return v;
}

function floorAt(x, y) {
  const lx = x % 32, ly = y % 32;
  const n = fbm(x / 10, y / 10, 21, 6.4);
  if (lx < 2 || ly < 2) return 0.05;
  let v = 0.38 + hash2(x >> 5, y >> 5, 5) * 0.2 + (n - 0.5) * 0.45;
  if (Math.abs(fbm(x / 14, y / 14, 33, 64 / 14) - 0.5) < 0.012) v *= 0.3;
  if (lx === 2 || ly === 2) v += 0.1;
  return v;
}

// ---------- Sprites ----------
const OUT = 0.05;
function path(g, pts) {
  g.beginPath();
  g.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]);
}
function poly(g, pts, v, ol = 1) {
  path(g, pts); g.closePath();
  g.fillStyle = G(v); g.fill();
  if (ol) { g.lineWidth = ol; g.strokeStyle = G(OUT); g.stroke(); }
}
function limb(g, pts, w, v) {
  path(g, pts); g.strokeStyle = G(OUT); g.lineWidth = w + 2; g.stroke();
  path(g, pts); g.strokeStyle = G(v); g.lineWidth = w; g.stroke();
}
function ell(g, x, y, rx, ry, v, ol = 1, rot = 0) {
  g.beginPath(); g.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2);
  g.fillStyle = G(v); g.fill();
  if (ol) { g.lineWidth = ol; g.strokeStyle = G(OUT); g.stroke(); }
}
function line(g, x1, y1, x2, y2, w, v) {
  g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2);
  g.lineWidth = w; g.strokeStyle = G(v); g.stroke();
}
function curve(g, pts, w, v) {
  const [a, b, c, d] = pts;
  for (const [ww, vv] of [[w + 2, OUT], [w, v]]) {
    g.beginPath(); g.moveTo(a[0], a[1]); g.bezierCurveTo(b[0], b[1], c[0], c[1], d[0], d[1]);
    g.lineWidth = ww; g.strokeStyle = G(vv); g.stroke();
  }
}

function drawKobold(g) {
  curve(g, [[38, 44], [48, 52], [56, 52], [61, 46]], 1.4, 0.8);
  limb(g, [[31, 44], [28, 52], [26, 60]], 2.2, 0.86); limb(g, [[26, 60], [20, 62]], 1.6, 0.86);
  limb(g, [[37, 44], [41, 52], [44, 60]], 2.2, 0.86); limb(g, [[44, 60], [50, 62]], 1.6, 0.86);
  ell(g, 34, 43, 6, 3, 0.8);
  limb(g, [[34, 19], [34, 41]], 2, 0.85);
  for (let i = 0; i < 5; i++) {
    g.beginPath(); g.ellipse(34, 24 + i * 3.2, 7.5 - i * 0.7, 1.4, 0, 0, Math.PI * 2);
    g.strokeStyle = G(OUT); g.lineWidth = 2.4; g.stroke();
    g.strokeStyle = G(0.88); g.lineWidth = 1.1; g.stroke();
  }
  limb(g, [[28, 20], [23, 29], [19, 37]], 2, 0.86);
  line(g, 15, 3, 19, 38, 3.4, OUT); line(g, 15, 3, 19, 38, 1.8, 0.97);
  line(g, 12, 38.5, 25, 37, 3.4, OUT); line(g, 12, 38.5, 25, 37, 2, 0.7);
  ell(g, 20, 42, 1.8, 1.8, 0.75);
  ell(g, 27, 20, 5, 3.5, 0.62);
  limb(g, [[40, 20], [45, 28]], 2, 0.86);
  ell(g, 47, 32, 10, 10, 0.5, 1.2);
  g.beginPath(); g.arc(47, 32, 8.6, 0, Math.PI * 2); g.strokeStyle = G(0.9); g.lineWidth = 1.3; g.stroke();
  ell(g, 47, 32, 4.5, 5.5, 0.22, 0); ell(g, 47, 33, 2, 3, 0.85, 0);
  poly(g, [[29, 12], [39, 12], [36.5, 22], [32, 22]], 0.86);
  ell(g, 34, 10, 6.5, 5.5, 0.92);
  ell(g, 31.5, 10.5, 1.9, 2.2, 0.04, 0); ell(g, 36.5, 10.5, 1.9, 2.2, 0.04, 0);
  line(g, 32, 19.5, 36.5, 19.5, 0.8, 0.2);
}

function drawRat(g) {
  curve(g, [[18, 52], [8, 58], [6, 44], [1, 50]], 1.3, 0.7);
  limb(g, [[24, 56], [22, 62]], 2, 0.5);
  ell(g, 30, 50, 15, 9, 0.42); ell(g, 22, 50, 9, 9, 0.38);
  for (let i = 0; i < 6; i++) line(g, 18 + i * 4, 42 + Math.abs(i - 2.5) * 0.7, 20 + i * 4, 38.5 + Math.abs(i - 2.5) * 0.7, 1, 0.72);
  poly(g, [[40, 43], [57, 49], [54, 52], [40, 56]], 0.5);
  ell(g, 42, 42, 3, 4.2, 0.62);
  ell(g, 48, 47, 1.7, 1.7, 1, 0);
  line(g, 55, 51, 54, 54.5, 1, 0.95);
  line(g, 56, 49, 63, 47, 0.5, 0.8); line(g, 56, 50, 63, 52, 0.5, 0.8);
  limb(g, [[44, 55], [46, 62]], 2, 0.5); limb(g, [[36, 57], [36, 62]], 2, 0.45);
}

function drawGhoul(g) {
  limb(g, [[30, 46], [27, 55], [23, 62]], 3, 0.45); limb(g, [[38, 46], [42, 55], [45, 62]], 3, 0.45);
  limb(g, [[42, 27], [49, 40], [47, 53]], 2.6, 0.5);
  for (let i = 0; i < 3; i++) line(g, 47, 53, 45 + i * 2, 58, 1, 0.85);
  poly(g, [[22, 24], [40, 20], [46, 32], [42, 46], [28, 48], [24, 38]], 0.42);
  for (let i = 0; i < 4; i++) line(g, 28, 30 + i * 4, 40, 29 + i * 4, 0.9, 0.62);
  limb(g, [[26, 27], [17, 39], [12, 52]], 2.6, 0.5);
  for (let i = 0; i < 3; i++) line(g, 12, 52, 9 + i * 2.5, 58, 1, 0.85);
  ell(g, 22, 21, 7, 6.5, 0.48);
  poly(g, [[16, 24], [25, 25], [23, 31], [17, 29]], 0.05, 0);
  for (let i = 0; i < 3; i++) line(g, 17.5 + i * 2.2, 25, 18 + i * 2.2, 27.2, 0.7, 0.95);
  ell(g, 19.5, 19.5, 1.6, 1.4, 1, 0); ell(g, 25, 19, 1.6, 1.4, 1, 0);
  line(g, 17, 14.5, 26, 13.5, 1, 0.3);
}

function drawShade(g, boss) {
  for (let i = 0; i < 7; i++) {
    const x = 19 + i * 4.5;
    g.beginPath(); g.moveTo(x, 40);
    g.bezierCurveTo(x - 4, 50, x + 5, 54, x - 2 + (i % 2) * 4, 64);
    g.strokeStyle = G(0.2 + (i % 3) * 0.07); g.lineWidth = 3.2 - (i % 2); g.stroke();
  }
  if (boss) {
    poly(g, [[27, 16], [24, 1], [30, 12]], 0.7);
    poly(g, [[33, 14], [34, -1], [37, 13]], 0.75);
    poly(g, [[39, 15], [44, 2], [42, 15]], 0.7);
  }
  poly(g, [[24, 18], [15, 12], [10, 2], [14, 3], [20, 10], [29, 14]], 0.72);
  poly(g, [[38, 14], [46, 6], [50, -1], [57, 4], [53, 11], [44, 18]], 0.72);
  for (let i = 0; i < 4; i++) {
    line(g, 13 + i * 3, 5 + i * 2.5, 15.5 + i * 3, 3.8 + i * 2.5, 0.7, 0.25);
    line(g, 46 + i * 2.5, 9 - i * 2, 47.5 + i * 2.5, 11 - i * 2, 0.7, 0.25);
  }
  poly(g, [[22, 16], [42, 14], [47, 27], [43, 42], [34, 52], [26, 47], [20, 31]], 0.58);
  line(g, 23, 32, 29, 35, 1.2, 0.85); line(g, 44, 30, 39, 34, 1.2, 0.85);
  line(g, 30, 17, 33, 21, 0.8, 0.85); line(g, 36, 16, 34, 21, 0.8, 0.85);
  ell(g, 28, 25, 4.6, 3.4, 0.02, 0, 0.25); ell(g, 39, 24, 4.6, 3.4, 0.02, 0, -0.25);
  ell(g, 28.5, 25.5, 1.1, 1.1, 1, 0); ell(g, 38.5, 24.5, 1.1, 1.1, 1, 0);
  poly(g, [[23, 37], [45, 34], [41, 45], [30, 47]], 0.03, 0);
  for (let i = 0; i < 7; i++) {
    const x = 24.5 + i * 2.9, yt = 36.7 - i * 0.38;
    poly(g, [[x, yt], [x + 2.3, yt - 0.2], [x + 1.1, yt + 3.2]], 0.95, 0);
  }
  for (let i = 0; i < 5; i++) {
    const x = 30 + i * 2.4, yb = 46.3 - i * 0.3;
    poly(g, [[x, yb], [x + 2, yb - 0.1], [x + 1, yb - 3.3]], 0.9, 0);
  }
}

function drawKnight(g) {
  poly(g, [[22, 18], [42, 18], [50, 58], [14, 60]], 0.16);
  line(g, 52, 2, 44, 63, 3.6, OUT); line(g, 52, 2, 44, 63, 1.8, 0.75);
  poly(g, [[51, 5], [60, 2], [62, 12], [53, 14]], 0.9);
  poly(g, [[51, 4], [53, -2], [55, 4]], 0.92);
  poly(g, [[26, 42], [31, 42], [30, 60], [24, 61]], 0.66);
  poly(g, [[34, 42], [39, 42], [41, 61], [35, 60]], 0.66);
  poly(g, [[21, 60], [31, 60], [31, 63.5], [20, 63.5]], 0.55);
  poly(g, [[34, 60], [43, 60], [44, 63.5], [34, 63.5]], 0.55);
  ell(g, 28, 50, 2.6, 2.1, 0.85); ell(g, 37.5, 50, 2.6, 2.1, 0.85);
  poly(g, [[24, 20], [40, 20], [42, 34], [38, 44], [26, 44], [22, 34]], 0.58);
  for (let y = 23; y < 40; y += 3)
    for (let x = 25; x < 40; x += 3) ell(g, x + ((y / 3) % 2), y, 0.8, 0.8, 0.85, 0);
  poly(g, [[25, 40], [39, 40], [39, 43], [25, 43]], 0.32);
  ell(g, 32, 41.5, 1.4, 1.4, 0.9, 0);
  line(g, 25, 42, 16, 58, 2.6, OUT); line(g, 25, 42, 16, 58, 1.2, 0.92);
  ell(g, 23, 22, 5, 4, 0.75); ell(g, 41, 22, 5, 4, 0.75);
  limb(g, [[42, 24], [46, 32], [48.5, 30]], 3, 0.64);
  limb(g, [[22, 24], [19, 34], [22, 40]], 3, 0.64);
  curve(g, [[32, 5], [28, -3], [20, 0], [15, 7]], 1.6, 0.85);
  ell(g, 32, 12, 6, 7, 0.78);
  line(g, 26.5, 12, 37.5, 12, 1.7, 0.02);
  line(g, 32, 5.5, 32, 18.5, 0.8, 0.5);
  ell(g, 29.5, 12, 0.8, 0.6, 1, 0); ell(g, 34.5, 12, 0.8, 0.6, 1, 0);
}

// ---------- Jefes ----------
// El Rey del Osario: kobold esqueleto gigante que reina sobre los mineros muertos
function drawBoneKing(g) {
  // un poco más chico, apoyado en el suelo, para que la corona entre en el cuadro
  g.translate(32, 64); g.scale(0.9, 0.9); g.translate(-32, -64);
  // capa raída
  poly(g, [[18, 15], [46, 15], [53, 36], [57, 62], [52, 58], [49, 63.5], [45, 59], [41, 63.5], [24, 63.5], [20, 59], [16, 63.5], [12, 58], [8, 62], [12, 36]], 0.16);
  for (const x of [14, 21, 43, 50]) line(g, x, 34, x + (x > 32 ? 1.5 : -1.5), 60, 0.6, 0.26);
  // piernas
  limb(g, [[28, 44], [25, 53], [24, 61]], 2.6, 0.84); limb(g, [[24, 61], [17, 63]], 1.8, 0.84);
  limb(g, [[36, 44], [39, 53], [40, 61]], 2.6, 0.84); limb(g, [[40, 61], [47, 63]], 1.8, 0.84);
  ell(g, 25.5, 53, 2.2, 1.8, 0.92); ell(g, 38.6, 53, 2.2, 1.8, 0.92);
  ell(g, 32, 43, 8, 3.6, 0.78);
  ell(g, 28.5, 43, 1.6, 1.2, 0.1, 0); ell(g, 35.5, 43, 1.6, 1.2, 0.1, 0);
  // columna y costillar
  limb(g, [[32, 17], [32, 41]], 2.2, 0.82);
  for (let i = 0; i < 6; i++) {
    g.beginPath(); g.ellipse(32, 21 + i * 3.1, 10 - i * 0.9, 1.6, 0, 0, Math.PI * 2);
    g.strokeStyle = G(OUT); g.lineWidth = 2.6; g.stroke();
    g.strokeStyle = G(0.88); g.lineWidth = 1.2; g.stroke();
  }
  // collar de calaveras
  for (let i = 0; i < 5; i++) {
    const x = 23.5 + i * 4.2, y = 19.5 + Math.sin((i / 4) * Math.PI) * 3.5;
    ell(g, x, y, 1.9, 1.7, 0.9, 0.6);
    ell(g, x - 0.7, y - 0.2, 0.45, 0.5, 0.05, 0); ell(g, x + 0.7, y - 0.2, 0.45, 0.5, 0.05, 0);
  }
  // cuello de piel sobre los hombros
  for (const sx of [-1, 1]) {
    ell(g, 32 + sx * 11, 16, 7, 4, 0.72);
    for (let k = 0; k < 5; k++) line(g, 32 + sx * (6 + k * 2.2), 14, 32 + sx * (5.5 + k * 2.2), 19.5, 0.6, 0.45);
  }
  // brazo izquierdo (del espectador): cetro de fémur con cráneo
  limb(g, [[22, 18], [16, 27], [13, 35]], 2.2, 0.85);
  line(g, 9, 4, 14, 52, 3.6, OUT); line(g, 9, 4, 14, 52, 2, 0.86);
  ell(g, 14.2, 53, 2.2, 1.8, 0.86); ell(g, 13.2, 53.6, 1.6, 1.4, 0.86, 0);
  ell(g, 8.6, 4.5, 5, 4.4, 0.9);
  poly(g, [[5.5, 6], [11.5, 6], [10, 10.5], [7, 10.5]], 0.86, 0.8);
  ell(g, 7, 4.2, 1.1, 1.3, 0.05, 0); ell(g, 10.3, 4.2, 1.1, 1.3, 0.05, 0);
  ell(g, 13, 35.5, 2.2, 2, 0.8);
  // brazo derecho: pico de minero
  limb(g, [[42, 18], [48, 27], [50, 34]], 2.2, 0.85);
  line(g, 47, 60, 53, 7, 3.4, OUT); line(g, 47, 60, 53, 7, 1.8, 0.42);
  for (const [w, v] of [[3.6, OUT], [2.2, 0.8]]) {
    g.beginPath(); g.moveTo(40, 12); g.quadraticCurveTo(53, 2, 63, 11);
    g.strokeStyle = G(v); g.lineWidth = w; g.stroke();
  }
  poly(g, [[51, 5], [55, 5], [55, 10], [51, 10]], 0.6, 0.8);
  ell(g, 50.4, 34.5, 2.2, 2, 0.8);
  // cráneo de kobold
  poly(g, [[26.5, 10], [37.5, 10], [35, 20], [29, 20]], 0.86);
  ell(g, 32, 8, 7.2, 6, 0.92);
  ell(g, 29.2, 8.5, 2.1, 2.3, 0.04, 0); ell(g, 34.8, 8.5, 2.1, 2.3, 0.04, 0);
  ell(g, 29.2, 8.7, 0.8, 0.8, 1, 0); ell(g, 34.8, 8.7, 0.8, 0.8, 1, 0);
  for (let i = 0; i < 5; i++) line(g, 29.6 + i * 1.2, 17.5, 29.8 + i * 1.2, 19.5, 0.6, 0.97);
  line(g, 30, 14, 31.4, 14.6, 0.5, 0.2); line(g, 34, 14, 32.6, 14.6, 0.5, 0.2);
  // corona de colmillos y falanges
  poly(g, [[24.8, 4.5], [39.2, 4.5], [38.6, 1.6], [25.4, 1.6]], 0.7, 0.8);
  for (let i = 0; i < 6; i++) {
    const x = 25.6 + i * 2.6, h = i % 2 ? 4 : 6.5;
    poly(g, [[x - 0.9, 2], [x, 2 - h], [x + 0.9, 2]], 0.94, 0.6);
  }
  ell(g, 32, 3, 1, 1, 1, 0);
}

// El Cazador Gris: rastreador del rey, con la piel de un lobo como capucha
function drawGreyHunter(g) {
  // capa gris deshilachada
  poly(g, [[19, 14], [45, 14], [51, 34], [54, 56], [50, 54], [48, 63.5], [44, 57], [40, 63.5], [36, 58], [28, 58], [24, 63.5], [20, 57], [16, 63.5], [14, 54], [10, 56], [13, 34]], 0.5);
  for (let k = 0; k < 7; k++) line(g, 15 + k * 5.5, 30, 14 + k * 6, 56 + (k % 2) * 4, 0.6, 0.36);
  // carcaj a la espalda
  poly(g, [[38, 6], [43, 4], [48, 22], [43, 24]], 0.3);
  for (let i = 0; i < 4; i++) { line(g, 38.8 + i * 1.3, 6 - i * 0.4, 36.6 + i * 1.4, 0.5 - i * 0.2, 0.6, 0.6); poly(g, [[36 + i * 1.4, 1], [37.4 + i * 1.4, -0.5], [37.6 + i * 1.4, 2.2]], 0.85, 0); }
  // piernas vendadas y botas
  for (const [x, s] of [[25, -1], [34, 1]]) {
    poly(g, [[x, 41], [x + 5.5, 41], [x + 5 + s, 58], [x + 0.5 + s, 58]], 0.44);
    for (let y = 44; y < 57; y += 3) line(g, x + s * 0.3, y, x + 5.5 + s * 0.5, y + 1.2, 0.5, 0.25);
    poly(g, [[x - 1 + s, 57], [x + 6 + s, 57], [x + 6.5 + s * 2, 63.5], [x - 1.5 + s * 2, 63.5]], 0.28);
  }
  // jubón de cuero, cinturón con trofeos
  poly(g, [[23, 18], [41, 18], [43, 31], [40, 43], [24, 43], [21, 31]], 0.3);
  for (let k = 0; k < 4; k++) line(g, 24, 22 + k * 5, 40, 23 + k * 5, 0.5, 0.2);
  line(g, 24, 19, 41, 36, 2.6, OUT); line(g, 24, 19, 41, 36, 1.6, 0.55);
  poly(g, [[22.5, 37], [41.5, 37], [41.5, 40], [22.5, 40]], 0.24);
  ell(g, 32, 38.5, 1.3, 1.3, 0.75, 0);
  for (let i = 0; i < 6; i++) poly(g, [[24.5 + i * 3, 40], [26 + i * 3, 40], [25.3 + i * 3, 44 + (i % 2) * 1.5]], 0.95, 0.5);
  // brazo izquierdo (del espectador): arco largo
  limb(g, [[22, 20], [15, 28], [8, 33]], 2.4, 0.4);
  for (const [w, v] of [[3.6, OUT], [2, 0.66]]) {
    g.beginPath(); g.moveTo(9, 4); g.bezierCurveTo(1, 16, 1, 50, 10, 61);
    g.strokeStyle = G(v); g.lineWidth = w; g.stroke();
  }
  line(g, 9, 4, 10, 61, 0.5, 0.9);
  ell(g, 7, 33, 2, 2.2, 0.52);
  // brazo derecho: cuchillo de desollar
  limb(g, [[42, 20], [48, 30], [49, 38]], 2.4, 0.4);
  ell(g, 49, 39, 2, 2, 0.52);
  line(g, 49, 41, 52, 54, 3, OUT); line(g, 49, 41, 52, 54, 1.6, 0.95);
  line(g, 47, 40.5, 51.5, 39.5, 1.2, 0.5);
  // pellejo de lobo sobre los hombros
  for (const sx of [-1, 1]) {
    poly(g, [[32 + sx * 4, 12], [32 + sx * 13, 15], [32 + sx * 14, 22], [32 + sx * 9, 21], [32 + sx * 5, 17]], 0.5);
    for (let k = 0; k < 4; k++) line(g, 32 + sx * (7 + k * 2), 15, 32 + sx * (7.5 + k * 2), 21, 0.5, 0.32);
  }
  // capucha de piel: la cara del cazador queda en sombra bajo la cabeza del lobo
  poly(g, [[22.5, 22], [23, 11], [41, 11], [41.5, 22], [37, 20], [27, 20]], 0.48);
  ell(g, 32, 17, 6.2, 4.6, 0.03, 0);
  ell(g, 29.6, 17.4, 1.2, 0.8, 1, 0); ell(g, 34.4, 17.4, 1.2, 0.8, 1, 0);
  // orejas grandes, abiertas hacia afuera
  poly(g, [[24, 7], [19.5, -1.5], [28.5, 3.5]], 0.5, 1); poly(g, [[23.6, 5], [21.6, 1], [26.2, 3.6]], 0.2, 0);
  poly(g, [[40, 7], [44.5, -1.5], [35.5, 3.5]], 0.5, 1); poly(g, [[40.4, 5], [42.4, 1], [37.8, 3.6]], 0.2, 0);
  // cabeza del lobo: ancha arriba y en punta hacia el hocico, que cae sobre la frente
  poly(g, [[22, 8], [26, 2.5], [32, 1.5], [38, 2.5], [42, 8], [38.5, 11], [34.5, 14], [32, 15], [29.5, 14], [25.5, 11]], 0.58);
  for (let k = 0; k < 7; k++) line(g, 24.5 + k * 2.5, 3.5 + Math.abs(k - 3) * 0.6, 25 + k * 2.4, 6.5 + Math.abs(k - 3) * 0.6, 0.45, 0.4);
  poly(g, [[29.5, 8], [34.5, 8], [33.5, 13], [32, 14.2], [30.5, 13]], 0.72, 0);
  ell(g, 32, 13.6, 1.6, 1.1, 0.06, 0);
  // ojos rasgados del lobo
  poly(g, [[25.8, 7.4], [29.4, 8.4], [26.6, 9]], 0.9, 0.5); poly(g, [[38.2, 7.4], [34.6, 8.4], [37.4, 9]], 0.9, 0.5);
  // colmillos colgando sobre la sombra de la cara
  for (const [x, h] of [[29.2, 3.6], [30.6, 2.4], [33.4, 2.4], [34.8, 3.6]]) poly(g, [[x - 0.6, 13], [x + 0.6, 13], [x, 13 + h]], 0.97, 0.4);
}

// ---------- Enemigos con comportamiento propio ----------
// El Soplo: cara de humo con la boca fruncida, soplando las antorchas
function drawWisp(g) {
  for (let i = 0; i < 6; i++) {
    const x = 22 + i * 4;
    g.beginPath(); g.moveTo(x, 36); g.bezierCurveTo(x - 5, 46, x + 6, 52, x - 3 + (i % 2) * 6, 63);
    g.strokeStyle = G(0.35 + (i % 3) * 0.08); g.lineWidth = 3.4 - (i % 2); g.stroke();
  }
  ell(g, 32, 24, 13, 15, 0.62);
  ell(g, 26.5, 21, 3.4, 4.2, 0.03, 0); ell(g, 37.5, 21, 3.4, 4.2, 0.03, 0);
  ell(g, 26.5, 22, 1, 1, 0.95, 0); ell(g, 37.5, 22, 1, 1, 0.95, 0);
  ell(g, 24, 29, 3.4, 2.6, 0.72, 0); ell(g, 40, 29, 3.4, 2.6, 0.72, 0);     // mejillas infladas
  ell(g, 32, 31.5, 2.6, 2.2, 0.03, 0.6);                                     // boca en «o»
  for (let k = 0; k < 3; k++) curve(g, [[35, 31 + k * 1.5], [44, 29 + k * 3], [52, 33 + k * 2], [62, 28 + k * 4]], 0.8, 0.86);
  line(g, 22, 13, 29, 15, 1, 0.3); line(g, 42, 13, 35, 15, 1, 0.3);
}

// El Acechador: agazapado, de miembros largos, con un racimo de ojos
function drawLurker(g) {
  limb(g, [[22, 46], [10, 50], [6, 63]], 2, 0.3); limb(g, [[42, 46], [54, 50], [58, 63]], 2, 0.3);
  limb(g, [[26, 50], [20, 57], [16, 63]], 2, 0.28); limb(g, [[38, 50], [44, 57], [48, 63]], 2, 0.28);
  poly(g, [[18, 44], [26, 34], [38, 34], [46, 44], [40, 54], [24, 54]], 0.24);
  for (let i = 0; i < 4; i++) line(g, 22 + i * 2, 38 + i * 4, 42 - i * 2, 38 + i * 4, 0.6, 0.38);
  limb(g, [[24, 40], [12, 34], [4, 42]], 2.2, 0.3);
  limb(g, [[40, 40], [52, 34], [60, 42]], 2.2, 0.3);
  for (const [x, s] of [[4, -1], [60, 1]]) for (let k = 0; k < 3; k++) line(g, x, 42, x + s * (k - 1) * 2, 47, 0.8, 0.8);
  ell(g, 32, 44, 7, 6, 0.2);
  for (const [x, y, r] of [[29, 42, 1.4], [35, 42, 1.4], [32, 40, 1], [26.5, 45, 0.9], [37.5, 45, 0.9], [32, 46, 1.1]]) ell(g, x, y, r, r, 1, 0);
  for (let k = 0; k < 4; k++) line(g, 29 + k * 2, 49, 29.5 + k * 2, 52, 0.6, 0.9);
}

// Centinela del Osario: un esqueleto que se cubre con una lápida como escudo
function drawSentinel(g) {
  line(g, 48, 2, 50, 62, 3, OUT); line(g, 48, 2, 50, 62, 1.6, 0.6);
  poly(g, [[46, 6], [48, -1], [50, 6]], 0.9);
  limb(g, [[27, 44], [25, 54], [24, 62]], 2.2, 0.85); limb(g, [[37, 44], [40, 54], [41, 62]], 2.2, 0.85);
  limb(g, [[32, 16], [32, 42]], 2, 0.84);
  for (let i = 0; i < 4; i++) { g.beginPath(); g.ellipse(32, 22 + i * 3.4, 7 - i * 0.6, 1.4, 0, 0, Math.PI * 2); g.strokeStyle = G(OUT); g.lineWidth = 2.4; g.stroke(); g.strokeStyle = G(0.86); g.lineWidth = 1.1; g.stroke(); }
  limb(g, [[38, 18], [45, 26], [48, 26]], 2, 0.84);
  ell(g, 32, 9, 6, 6, 0.9);
  ell(g, 29.6, 9, 1.6, 1.9, 0.04, 0); ell(g, 34.4, 9, 1.6, 1.9, 0.04, 0);
  // la lápida-escudo tapa medio cuerpo
  g.beginPath(); g.moveTo(10, 58); g.lineTo(10, 26); g.arc(22, 26, 12, Math.PI, 0); g.lineTo(34, 58); g.closePath();
  g.fillStyle = G(0.6); g.fill(); g.strokeStyle = G(OUT); g.lineWidth = 1.2; g.stroke();
  line(g, 22, 22, 22, 40, 2.2, 0.9); line(g, 16, 28, 28, 28, 2.2, 0.9);
  for (const [x1, y1, x2, y2] of [[13, 44, 18, 50], [26, 46, 31, 52], [14, 32, 16, 36]]) line(g, x1, y1, x2, y2, 0.6, 0.3);
  for (let k = 0; k < 3; k++) line(g, 14, 48 + k * 3, 30, 48 + k * 3, 0.5, 0.42);
  limb(g, [[26, 18], [20, 26]], 2, 0.84);
}

// Rescoldo: montón de ceniza con brasas y una llamita que sigue viva
function drawEmber(g) {
  ell(g, 32, 58, 20, 5, 0.28);
  ell(g, 32, 55.5, 15, 5, 0.38, 0);
  for (let i = 0; i < 9; i++) ell(g, 20 + i * 3 + (i % 2), 55 + (i % 3) - 1, 1.3, 1, 0.92 + (i % 2) * 0.08, 0);
  poly(g, [[25, 54], [28, 40], [30, 46], [32, 30], [35, 44], [37, 38], [39, 54]], 0.9, 1);
  poly(g, [[29, 54], [31, 44], [32, 47], [34, 42], [35, 54]], 1, 0);
}

function drawChest(g, open) {
  poly(g, [[12, 38], [52, 38], [52, 61], [12, 61]], 0.46);
  for (let i = 1; i < 4; i++) line(g, 13, 38 + i * 5.7, 51, 38 + i * 5.7, 0.7, 0.28);
  line(g, 20, 38, 20, 61, 2.4, 0.8); line(g, 44, 38, 44, 61, 2.4, 0.8);
  if (open) {
    poly(g, [[12, 18], [52, 18], [52, 34], [12, 34]], 0.5);
    line(g, 20, 18, 20, 34, 2.4, 0.8); line(g, 44, 18, 44, 34, 2.4, 0.8);
    poly(g, [[13, 34], [51, 34], [51, 39], [13, 39]], 0.03, 0);
  } else {
    poly(g, [[12, 28], [52, 28], [52, 38], [12, 38]], 0.6);
    g.beginPath(); g.ellipse(32, 29, 20, 6, 0, Math.PI, 0); g.fillStyle = G(0.58); g.fill(); g.strokeStyle = G(OUT); g.lineWidth = 1; g.stroke();
    line(g, 20, 23.5, 20, 38, 2.4, 0.8); line(g, 44, 23.5, 44, 38, 2.4, 0.8);
    poly(g, [[29, 35], [35, 35], [35, 43], [29, 43]], 0.95);
    ell(g, 32, 39, 0.9, 1.4, 0.05, 0);
  }
}

function drawTorchHand(g) {
  poly(g, [[27, 20], [34, 20], [41, 64], [32, 64]], 0.42);
  for (let i = 0; i < 4; i++) line(g, 26.5 + i * 0.6, 22 + i * 3, 34.5 + i * 0.7, 21 + i * 3, 1.3, 0.22);
  poly(g, [[24, 16], [37, 16], [35, 22], [26, 22]], 0.3);
  ell(g, 36, 43, 9, 7, 0.62);
  for (let i = 0; i < 4; i++) line(g, 29, 38.5 + i * 3, 41, 37.5 + i * 3, 0.8, 0.3);
  poly(g, [[28, 49], [47, 46], [56, 64], [28, 64]], 0.72);
  line(g, 29, 52, 49, 49, 1, 0.92);
  for (let i = 0; i < 3; i++) ell(g, 33 + i * 6, 56 - i * 0.6, 1, 1, 0.95, 0);
}

function makeSprite(size, draw, post) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d');
  g.scale(size / 64, size / 64);
  g.lineCap = 'round'; g.lineJoin = 'round';
  draw(g);
  const d = g.getImageData(0, 0, size, size).data;
  const n = size * size, lum = new Float32Array(n), a = new Uint8Array(n);
  for (let i = 0; i < n; i++) { a[i] = d[i * 4 + 3] > 110 ? 1 : 0; lum[i] = d[i * 4] / 255; }
  if (post) post(lum, a, size);
  return { size, lum, a };
}

// Los jirones de las sombras se deshacen hacia abajo
function wispFade(lum, a, size) {
  for (let y = 0; y < size; y++) {
    const f = (y / size - 0.62) / 0.38;
    if (f <= 0) continue;
    for (let x = 0; x < size; x++) if (hash2(x, y, 7) < f) a[y * size + x] = 0;
  }
}

const SPRITES = {};
function buildSprites() {
  const defs = {
    kobold: [drawKobold], rat: [drawRat], ghoul: [drawGhoul],
    shade: [g => drawShade(g, false), wispFade], boss: [g => drawShade(g, true), wispFade],
    knight: [drawKnight], boneKing: [drawBoneKing], bones: [drawBonePile], candles: [drawCandles], armorStand: [drawArmorStand], brazier: [g => drawBrazier(g, true)], brazierOut: [g => drawBrazier(g, false)], stalagmite: [drawStalagmite], obelisk: [drawObelisk], hunter: [drawGreyHunter], ember: [drawEmber], wisp: [drawWisp, wispFade], lurker: [drawLurker], sentinel: [drawSentinel], reliquary: [g => drawReliquary(g, false)], reliquaryOpen: [g => drawReliquary(g, true)], pilgrim: [drawPilgrim], altar: [g => drawAltar(g, true)], bell: [drawBell], merchant: [drawMerchant], knightKneel: [drawKneelingKnight], girl: [drawLanternGirl], coffin: [g => drawCoffin(g, false)], coffinOpen: [g => drawCoffin(g, true)], mirror: [g => drawMirror(g, false)], mirrorBroken: [g => drawMirror(g, true)], door: [g => drawDoor(g, true)], doorShut: [g => drawDoor(g, false)], altarCold: [g => drawAltar(g, false)], chest: [g => drawChest(g, false)], chestOpen: [g => drawChest(g, true)],
  };
  for (const k in defs) {
    const [d, p] = defs[k];
    SPRITES[k] = { w: makeSprite(64, d, p), p: makeSprite(128, d, p) };
  }
  SPRITES.torch = makeSprite(64, drawTorchHand);
  // fuegos del mapa: cuatro cuadros con la llama en otra forma (ver spriteFrame)
  SPRITES.candles.frames = [0, 1, 2, 3].map(f => makeSprite(64, g => drawCandles(g, f)));
  SPRITES.brazier.frames = [0, 1, 2, 3].map(f => makeSprite(64, g => drawBrazier(g, true, f)));
}

// El cuadro que toca ahora; cada objeto tiene su propio desfase para que no titilen todos a la vez
function spriteFrame(name, e) {
  const s = SPRITES[name];
  if (!s.frames) return s.w;
  return s.frames[Math.floor(T * 7 + hash2(e.x, e.y, 13) * 4) % s.frames.length];
}

// ---------- Pantalla de título: castillo bajo la luna ----------
function buildTitleArt(mul = 1) {
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const g = c.getContext('2d');
  const img = g.createImageData(W, H);
  for (let y = 0, i = 0; y < H; y++)
    for (let x = 0; x < W; x++, i++) {
      let v = 0.03 + (y / 200) * 0.28;
      const cl = fbm(x / 70 + y / 300, y / 22, 90);
      if (cl > 0.5 && y < 190) v += (cl - 0.5) * 0.9 * (1 - y / 260);
      const b = clamp(v, 0, 1) * 255;
      img.data[i * 4] = img.data[i * 4 + 1] = img.data[i * 4 + 2] = b; img.data[i * 4 + 3] = 255;
    }
  g.putImageData(img, 0, 0);

  const mx = 100, my = 100;
  const mg = g.createRadialGradient(mx, my, 20, mx, my, 80);
  mg.addColorStop(0, G(0.5)); mg.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = mg; g.fillRect(0, 30, 260, 180);
  ell(g, mx, my, 28, 28, 0.82, 0);
  for (const [x, y, r] of [[-11, -6, 7], [9, 10, 5], [14, -8, 3], [-3, 15, 3], [3, -2, 2]]) ell(g, mx + x, my + y, r, r, 0.66, 0);

  const mtn = (base, amp, seed, v) => {
    g.beginPath(); g.moveTo(0, H);
    for (let x = 0; x <= W; x += 8) g.lineTo(x, base - fbm(x / 60, 0.5, seed, 0, 3) * amp - (x % 16 ? 0 : 3));
    g.lineTo(W, H); g.closePath(); g.fillStyle = G(v); g.fill();
  };
  mtn(200, 110, 5, 0.3);
  mtn(225, 60, 9, 0.17);

  const T = [
    { x: 270, w: 44, top: 62, sp: 46 }, { x: 322, w: 28, top: 36, sp: 52 },
    { x: 240, w: 22, top: 110, sp: 32 }, { x: 358, w: 24, top: 96, sp: 32 },
    { x: 204, w: 18, top: 150, sp: 28 }, { x: 396, w: 20, top: 138, sp: 26 },
    { x: 300, w: 14, top: 22, sp: 34 },
  ];
  g.fillStyle = G(0.1); g.fillRect(214, 160, 200, 110);
  for (let x = 214; x < 414; x += 8) g.fillRect(x, 155, 5, 6);
  for (const t of T) {
    g.fillStyle = G(0.11); g.fillRect(t.x, t.top, t.w, H - t.top);
    g.fillStyle = G(0.2); g.fillRect(t.x, t.top, 3, H - t.top);
    poly(g, [[t.x - 3, t.top], [t.x + t.w + 3, t.top], [t.x + t.w / 2, t.top - t.sp]], 0.13, 0);
    poly(g, [[t.x - 3, t.top], [t.x + t.w / 2, t.top - t.sp], [t.x + t.w / 2 - 2, t.top]], 0.22, 0);
    for (let k = 0; k < 3; k++) if (hash2(t.x, k, 1) > 0.4) {
      g.fillStyle = G(0.95);
      g.fillRect(t.x + 4 + ((hash2(t.x, k, 2) * (t.w - 10)) | 0), t.top + 12 + k * 22, 2, 4);
    }
  }
  g.fillStyle = G(0.01);
  g.beginPath(); g.moveTo(298, 270); g.lineTo(298, 222); g.arc(314, 222, 16, Math.PI, 0); g.lineTo(330, 270); g.fill();
  // puente y camino de antorchas
  g.fillStyle = G(0.14);
  g.beginPath(); g.moveTo(60, 240); g.lineTo(220, 226); g.lineTo(220, 240); g.lineTo(60, 254); g.fill();
  g.fillStyle = G(0.02);
  g.beginPath(); g.ellipse(140, 252, 26, 14, -0.08, Math.PI, 0); g.fill();
  for (const [x, y] of [[70, 238], [110, 234], [150, 231], [190, 227], [234, 222], [390, 224], [430, 232]]) {
    const tg = g.createRadialGradient(x, y, 0, x, y, 14);
    tg.addColorStop(0, G(0.75)); tg.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = tg; g.fillRect(x - 14, y - 14, 28, 28);
    g.fillStyle = G(0.18); g.fillRect(x - 0.5, y, 1.5, 10);
    ell(g, x + 0.25, y - 1, 1.6, 2.6, 1, 0);
  }

  const d = g.getImageData(0, 0, W, H).data;
  const lum = new Float32Array(W * H);
  for (let y = 0, i = 0; y < H; y++)
    for (let x = 0; x < W; x++, i++) {
      let v = d[i * 4] / 255;
      if (y > 175) {
        const f = fbm(x / 50, y / 14, 55) * ((y - 175) / 95);
        v = lerp(v, 0.36, clamp(f * 1.1, 0, 0.7));
      }
      v += (hash2(x, y, 99) - 0.5) * 0.05;
      lum[i] = v;
    }
  const out = g.createImageData(W, H);
  ditherTo(lum, null, W, H, new Uint32Array(out.data.buffer), [packRamp(RAMPS.castle)], mul);
  g.putImageData(out, 0, 0);
  return c;
}
