'use strict';
// Cinemáticas (la introducción y los finales, ver js/endings.js): escenas pintadas con el mismo
// dithering del juego, paneo lento, llama animada y textos en cajas góticas.

// ---------- Utilidades de dibujo ----------
function sceneArt(w, h, rampName, draw, post) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d');
  g.fillStyle = G(0); g.fillRect(0, 0, w, h);
  g.lineCap = 'round'; g.lineJoin = 'round';
  draw(g, w, h);
  const d = g.getImageData(0, 0, w, h).data;
  const lum = new Float32Array(w * h);
  for (let y = 0, i = 0; y < h; y++)
    for (let x = 0; x < w; x++, i++) {
      let v = d[i * 4] / 255;
      if (post) v = post(x, y, v);
      lum[i] = v + (hash2(x, y, 77) - 0.5) * 0.04;
    }
  const img = g.createImageData(w, h);
  ditherTo(lum, null, w, h, new Uint32Array(img.data.buffer), [packRamp(RAMPS[rampName])]);
  g.putImageData(img, 0, 0);
  return c;
}

function vgrad(g, x, y, w, h, stops) {
  const gr = g.createLinearGradient(0, y, 0, y + h);
  for (const [o, v] of stops) gr.addColorStop(o, G(v));
  g.fillStyle = gr; g.fillRect(x, y, w, h);
}

function glow(g, x, y, r, a) {
  const gr = g.createRadialGradient(x, y, 0, x, y, r);
  gr.addColorStop(0, `rgba(255,255,255,${a})`); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.globalCompositeOperation = 'lighter';
  g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2);
  g.globalCompositeOperation = 'source-over';
}

function castleSil(g, cx, by, s, v, lit) {
  const T = [[-30, 160, 44, 46], [22, 185, 28, 52], [-60, 110, 22, 32], [48, 122, 24, 32],
    [-95, 70, 18, 28], [88, 82, 20, 26], [-4, 205, 12, 34]];
  // peñasco irregular bajo los muros: sin él la base del castillo queda recortada en línea recta
  g.beginPath(); g.moveTo(cx - 100 * s, by - 4 * s);
  for (let k = 0; k <= 16; k++) {
    const f = k / 16, spread = 100 + 140 * Math.abs(f - 0.5);
    const x = cx + (f * 2 - 1) * spread * s;
    const y = by + (34 + hash2(k, cx | 0, 5) * 26 - Math.abs(f - 0.5) * 30) * s;
    g.lineTo(x, y);
  }
  g.lineTo(cx + 100 * s, by - 4 * s); g.closePath();
  g.fillStyle = G(v + 0.02); g.fill();
  for (let k = 0; k < 7; k++) line(g, cx + (hash2(k, 1, 7) - 0.5) * 150 * s, by + 4 * s, cx + (hash2(k, 2, 7) - 0.5) * 170 * s, by + 34 * s, 0.8, v + 0.07);
  g.fillStyle = G(v);
  g.fillRect(cx - 100 * s, by - 60 * s, 200 * s, 60 * s + 1);
  for (let x = -100; x < 100; x += 8) g.fillRect(cx + x * s, by - 65 * s, 5 * s, 6 * s);
  for (const [dx, ht, tw, sp] of T) {
    const x = cx + dx * s, y = by - ht * s, w = tw * s;
    g.fillStyle = G(v); g.fillRect(x, y, w, by - y + 1);
    poly(g, [[x - 2 * s, y], [x + w + 2 * s, y], [x + w / 2, y - sp * s]], v, 0);
    if (lit) for (let k = 0; k < 4; k++) if (hash2(dx, k, 3) > 0.35) {
      g.fillStyle = G(0.95);
      g.fillRect(Math.round(x + 1 + hash2(dx, k, 4) * Math.max(1, w - 4)), Math.round(y + 8 * s + k * 26 * s), Math.max(1, Math.round(3 * s)), Math.max(2, Math.round(5 * s)));
    }
  }
}

function houses(g, x0, x1, base, s, v, lit, seed) {
  for (let x = x0, k = 0; x < x1; k++) {
    const w = (14 + hash2(k, seed, 1) * 16) * s, h = (12 + hash2(k, seed, 2) * 14) * s;
    const y = base - h + hash2(k, seed, 5) * 4 * s;
    g.fillStyle = G(v); g.fillRect(x, y, w, base - y + 60);
    poly(g, [[x - 2, y], [x + w + 2, y], [x + w / 2, y - h * 0.6]], v + 0.03, 0);
    if (hash2(k, seed, 6) > 0.4) { g.fillStyle = G(v); g.fillRect(x + w * 0.7, y - h * 0.75, 3 * s, h * 0.5); }
    if (lit) for (let j = 0; j < 2; j++) if (hash2(k, j, seed) > 0.3) {
      g.fillStyle = G(0.93); g.fillRect(Math.round(x + 3 * s + j * w * 0.45), Math.round(y + h * 0.35), Math.round(3 * s), Math.round(4 * s));
    }
    x += w + 3 * s;
  }
}

// Fundidos y bandas con tramado Bayer (no rompen la paleta)
const patCache = {};
function ditherFill(ctx, x, y, w, h, amount, color) {
  const lv = Math.round(clamp(amount, 0, 1) * 16);
  if (!lv) return;
  if (lv >= 16) { ctx.fillStyle = color; ctx.fillRect(x, y, w, h); return; }
  const key = lv + color;
  if (!patCache[key]) {
    const c = document.createElement('canvas'); c.width = c.height = 4;
    const g = c.getContext('2d'); g.fillStyle = color;
    for (let i = 0; i < 16; i++) if (BAYER[i] < lv / 16) g.fillRect(i & 3, i >> 2, 1, 1);
    patCache[key] = ctx.createPattern(c, 'repeat');
  }
  ctx.fillStyle = patCache[key];
  ctx.fillRect(x, y, w, h);
}

// Llama procedural grande (k = intensidad 0..1)
const flameBufs = {};
function drawFlame(ctx, cx, by, w, h, t, k, rampName) {
  if (k <= 0.02) return;
  const key = w + 'x' + h + rampName;
  let fb = flameBufs[key];
  if (!fb) {
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const g = c.getContext('2d');
    const img = g.createImageData(w, h);
    fb = flameBufs[key] = { c, g, img, out: new Uint32Array(img.data.buffer), pal: packRamp(RAMPS[rampName]) };
  }
  const { out, pal } = fb, n = pal.length - 1, hh = h * (0.35 + 0.65 * k);
  out.fill(0);
  for (let y = 0; y < h; y++) {
    const ny = (h - 1 - y) / hh;
    if (ny > 1.1) continue;
    const sway = Math.sin(t * 5 + ny * 3) * ny * w * 0.08 + (vnoise(t * 4, ny * 3, 9) - 0.5) * ny * w * 0.18;
    // silueta de gota: base redondeada y punta que se afina
    const prof = Math.pow(Math.max(0, 1 - ny), 0.75) * Math.min(1, (ny + 0.08) * 3.2);
    const wd = w * 0.34 * prof * (0.85 + 0.3 * vnoise(t * 7, ny * 4, 3)) * (0.5 + 0.5 * k);
    for (let x = 0; x < w; x++) {
      const d = Math.abs(x - w / 2 - sway) / Math.max(0.5, wd);
      if (d >= 1) continue;
      const v = 0.62 + 0.55 * (1 - d) - ny * 0.22 + (vnoise(x * 0.3, y * 0.3 - t * 9, 5) - 0.5) * 0.3;
      let q = clamp(v, 0, 1) * n, j = q | 0;
      if (q - j > BAYER[((y & 3) << 2) | (x & 3)]) j++;
      out[y * w + x] = pal[j];
    }
  }
  fb.g.putImageData(fb.img, 0, 0);
  ctx.drawImage(fb.c, Math.round(cx - w / 2), Math.round(by - h));
  // chispas
  ctx.fillStyle = RAMPS[rampName][5];
  for (let i = 0; i < 8 * k; i++) {
    const ph = (t * 0.35 + i * 0.137) % 1;
    const px = cx + Math.sin(i * 2.7 + t * 1.3) * w * 0.4 * ph;
    const py = by - hh * 0.7 - ph * h * 0.8;
    if (ph < 0.85) ctx.fillRect(Math.round(px), Math.round(py), 1, 1);
  }
}

function drawSmoke(ctx, cx, by, t, color) {
  ctx.fillStyle = color;
  for (let s = 0; s < 3; s++)
    for (let i = 0; i < 40; i++) {
      const ph = ((t * 0.25 + s * 0.33 + i / 40) % 1);
      const y = by - ph * 160;
      const x = cx + Math.sin(ph * 6 + s * 2 + t) * (6 + ph * 22) + (s - 1) * 4;
      if (hash2(i, s, Math.floor(t * 4)) > ph * 0.9) ctx.fillRect(Math.round(x), Math.round(y), 1, 1);
    }
}

// ---------- Arte de cada escena ----------
function figureSil(g, x, fy, kind) {
  const v = 0.04;
  poly(g, [[x - 9, fy], [x - 7, fy - 38], [x + 7, fy - 38], [x + 9, fy]], v, 0);
  ell(g, x, fy - 44, 6, 7, v, 0);
  if (kind === 'rey') for (let k = 0; k < 3; k++) poly(g, [[x - 5 + k * 4, fy - 49], [x - 3 + k * 4, fy - 56], [x - 1 + k * 4, fy - 49]], 0.55, 0);
  if (kind === 'cab') { curve(g, [[x, fy - 51], [x + 3, fy - 60], [x - 6, fy - 62], [x - 12, fy - 54]], 1.2, 0.3); poly(g, [[x - 13, fy - 34], [x - 4, fy - 34], [x - 6, fy - 18], [x - 11, fy - 14]], 0.08, 0); }
  if (kind === 'mago') { poly(g, [[x - 8, fy - 46], [x + 8, fy - 46], [x + 1, fy - 66]], v, 0); line(g, x - 12, fy, x - 10, fy - 62, 1.4, 0.18); }
  if (kind === 'caz') { poly(g, [[x - 7, fy - 40], [x, fy - 56], [x + 7, fy - 40]], v, 0); g.beginPath(); g.arc(x - 14, fy - 32, 14, -1.2, 1.2); g.strokeStyle = G(0.2); g.lineWidth = 1.2; g.stroke(); }
  line(g, x + 7, fy - 28, x + 13, fy - 44, 1.6, 0.25);
  ell(g, x + 13.5, fy - 47, 1.8, 3.2, 1, 0);
}

function buildCineArt() {
  const A = {};
  A.reino = sceneArt(560, 270, 'castle', g => {
    vgrad(g, 0, 0, 560, 270, [[0, 0.05], [0.5, 0.3], [0.8, 0.55], [1, 0.62]]);
    glow(g, 300, 260, 230, 0.35);
    g.beginPath(); g.moveTo(40, 270); g.lineTo(170, 178); g.lineTo(230, 152); g.lineTo(272, 128); g.lineTo(330, 126);
    g.lineTo(380, 150); g.lineTo(450, 172); g.lineTo(560, 270); g.closePath();
    g.fillStyle = G(0.15); g.fill();
    castleSil(g, 300, 132, 0.5, 0.12, true);
    for (let k = 0; k < 10; k++) glow(g, 25 + k * 57 + hash2(k, 1, 9) * 20, 205, 28, 0.22);
    houses(g, 0, 560, 252, 1, 0.17, true, 1);
    houses(g, -10, 560, 272, 1.35, 0.1, true, 2);
  });
  A.llama = sceneArt(480, 420, 'castle', g => {
    vgrad(g, 0, 0, 480, 110, [[0, 0.04], [1, 0.32]]);
    castleSil(g, 240, 96, 0.42, 0.1, true);
    g.beginPath(); g.moveTo(0, 116);
    for (let x = 0; x <= 480; x += 8) g.lineTo(x, 112 - Math.sin((x / 480) * Math.PI) * 26 + (hash2(x, 3, 11) - 0.5) * 9);
    g.lineTo(480, 420); g.lineTo(0, 420); g.closePath(); g.fillStyle = G(0.11); g.fill();
    for (let k = 0; k < 7; k++) {
      let x = 180 + k * 20, y = 290;
      g.beginPath(); g.moveTo(x, y);
      while (y > 105) { y -= 12 + hash2(k, y, 2) * 10; x += (hash2(k, y, 3) - 0.5) * 22; g.lineTo(x, y); }
      g.strokeStyle = G(0.42); g.lineWidth = 1; g.stroke();
    }
    ell(g, 240, 335, 160, 75, 0.2, 0);
    glow(g, 240, 350, 170, 0.6);
    ell(g, 240, 393, 120, 13, 0.38, 0);
  }, (x, y, v) => (y > 100 ? v + (fbm(x / 22, y / 22, 5) - 0.5) * 0.14 : v));
  A.rey = sceneArt(520, 270, 'castle', g => {
    vgrad(g, 0, 0, 520, 270, [[0, 0.03], [1, 0.1]]);
    for (const x of [40, 130, 410, 490]) { g.fillStyle = G(0.13); g.fillRect(x - 12, 0, 24, 270); g.fillStyle = G(0.22); g.fillRect(x - 12, 0, 3, 270); }
    glow(g, 290, 310, 210, 0.42);
    ell(g, 290, 272, 135, 72, 0.3, 0);
    for (let k = 0; k < 60; k++) {
      const a = Math.PI + (k / 60) * Math.PI, r = 120 + hash2(k, 1, 4) * 14;
      line(g, 290 + Math.cos(a) * r * 0.95, 272 + Math.sin(a) * 62, 290 + Math.cos(a) * (r - 18), 272 + Math.sin(a) * 50, 1, 0.45);
    }
    poly(g, [[232, 270], [258, 192], [322, 192], [348, 270]], 0.2, 0);
    for (let k = 0; k < 9; k++) ell(g, 262 + k * 7, 214 + Math.sin(k / 8 * Math.PI) * 10, 2, 1.4, 0.85, 0);
    poly(g, [[277, 158], [303, 158], [306, 196], [274, 196]], 0.48, 0);
    poly(g, [[257, 112], [264, 82], [290, 74], [316, 82], [323, 112], [314, 172], [266, 172]], 0.1, 0);
    ell(g, 290, 126, 27, 37, 0.6, 0);
    g.save(); g.beginPath(); g.ellipse(290, 126, 27, 37, 0, 0, Math.PI * 2); g.clip();
    g.fillStyle = G(0.43); g.fillRect(293, 80, 40, 100); g.restore();
    ell(g, 279, 119, 7.5, 5, 0.06, 0); ell(g, 301, 119, 7.5, 5, 0.06, 0);
    ell(g, 279, 119, 1.7, 1.7, 0.97, 0); ell(g, 301, 119, 1.7, 1.7, 0.9, 0);
    line(g, 271, 126, 286, 127.5, 1, 0.32); line(g, 294, 127.5, 309, 126, 1, 0.3);
    line(g, 269, 132, 277, 148, 1, 0.33); line(g, 311, 132, 303, 148, 1, 0.3);
    line(g, 290, 121, 287, 140, 1.2, 0.38); line(g, 280, 150, 300, 150, 1.5, 0.12);
    for (let k = 0; k < 14; k++) line(g, 277 + k * 2, 153, 277 + k * 2 + (hash2(k, 1, 1) - 0.5) * 2, 162 + hash2(k, 2, 1) * 8, 0.6, 0.28);
    poly(g, [[261, 99], [319, 99], [317, 86], [263, 86]], 0.82);
    for (let k = 0; k < 5; k++) poly(g, [[264 + k * 12, 87], [268 + k * 12, 68 + (k === 2 ? -6 : 0)], [272 + k * 12, 87]], 0.85, 0.8);
    for (let k = 0; k < 4; k++) ell(g, 272 + k * 12, 92.5, 1.8, 1.8, 0.99, 0);
  });
  A.procesion = sceneArt(620, 270, 'crypt', g => {
    g.fillStyle = G(0.05); g.fillRect(0, 0, 620, 270);
    for (let y = 0; y < 230; y += 12)
      for (let x = ((y / 12) % 2) * 14; x < 620; x += 28)
        if (y + 12 < 80 + (x / 24) * 7) { g.fillStyle = G(0.12 + hash2(x, y, 1) * 0.08); g.fillRect(x + 1, y + 1, 26, 10); }
    for (let k = 0; k < 27; k++) {
      const x = k * 24, y = 80 + k * 7, v = 0.3 - k * 0.009;
      g.fillStyle = G(v); g.fillRect(x, y, 25, 270 - y);
      g.fillStyle = G(v + 0.14); g.fillRect(x, y, 25, 2);
    }
    const F = [[80, 'rey'], [150, 'cab'], [215, 'cab'], [290, 'mago'], [365, 'caz'], [440, 'cab'], [505, 'cab']];
    for (const [x] of F) glow(g, x + 13, 80 + (x / 24) * 7 - 48, 55, 0.5);
    for (const [x, kind] of F) figureSil(g, x, 80 + (x / 24) * 7, kind);
  });
  A.apagon = sceneArt(480, 270, 'castle', g => {
    g.fillStyle = G(0.07); g.fillRect(0, 0, 480, 270);
    glow(g, 240, 170, 200, 0.55);
    for (let k = 0; k < 34; k++) {
      const a = (k / 34) * Math.PI * 2, r = 190 + hash2(k, 1, 6) * 40;
      ell(g, 240 + Math.cos(a) * r, 150 + Math.sin(a) * r * 0.75, 40 + hash2(k, 2, 6) * 30, 30 + hash2(k, 3, 6) * 20, 0.03 + hash2(k, 4, 6) * 0.06, 0);
    }
    poly(g, [[196, 238], [284, 238], [272, 208], [208, 208]], 0.34);
    ell(g, 240, 208, 34, 6, 0.46);
    poly(g, [[480, 112], [480, 158], [345, 176], [320, 170], [324, 148]], 0.3);
    for (let k = 0; k < 5; k++) line(g, 360 + k * 24, 120 + k * 1.5, 356 + k * 24, 168 - k * 2, 0.8, 0.42);
    poly(g, [[324, 148], [320, 170], [302, 174], [292, 160], [300, 149]], 0.58);
    for (let k = 0; k < 4; k++) { line(g, 300, 152 + k * 5, 283 - k * 1.5, 149 + k * 6, 3.4, OUT); line(g, 300, 152 + k * 5, 283 - k * 1.5, 149 + k * 6, 2.2, 0.62); }
    ell(g, 316, 168, 3, 2, 0.9, 0.6);
  });
  A.oscuridad = sceneArt(560, 270, 'engrave', g => {
    vgrad(g, 0, 0, 560, 270, [[0, 0.14], [1, 0.3]]);
    castleSil(g, 330, 178, 0.62, 0.06, false);
    houses(g, 0, 560, 236, 1.1, 0.08, false, 3);
    houses(g, -6, 560, 272, 1.5, 0.05, false, 4);
    for (let k = 0; k < 30; k++) {
      const x = hash2(k, 1, 8) * 560;
      g.beginPath(); g.moveTo(x, -5);
      g.bezierCurveTo(x + (hash2(k, 2, 8) - 0.5) * 120, 60, x + (hash2(k, 3, 8) - 0.5) * 160, 140, x + (hash2(k, 4, 8) - 0.5) * 90, 160 + hash2(k, 5, 8) * 110);
      g.strokeStyle = G(0.01); g.lineWidth = 2 + hash2(k, 6, 8) * 5; g.stroke();
    }
  });
  A.rojo = sceneArt(480, 270, 'blood', g => {
    vgrad(g, 0, 0, 480, 270, [[0, 0.02], [1, 0.08]]);
    glow(g, 240, 110, 190, 0.3);
  });
  A.verde = sceneArt(480, 270, 'shade', g => {
    vgrad(g, 0, 0, 480, 270, [[0, 0.03], [1, 0.1]]);
    glow(g, 340, 100, 170, 0.25);
    for (let k = 0; k < 18; k++) curve(g, [[hash2(k, 1, 2) * 480, 270], [hash2(k, 2, 2) * 480, 200], [hash2(k, 3, 2) * 480, 120], [hash2(k, 4, 2) * 480, 40]], 1.5, 0.12);
  });
  A.pueblo = sceneArt(560, 270, 'castle', g => {
    vgrad(g, 0, 0, 560, 270, [[0, 0.04], [1, 0.3]]);
    glow(g, 430, 58, 80, 0.28);
    ell(g, 430, 58, 22, 22, 0.82, 0);
    for (const [x, y, r] of [[-8, -5, 6], [7, 8, 5], [9, -9, 3]]) ell(g, 430 + x, 58 + y, r, r, 0.66, 0);
    g.beginPath(); g.moveTo(170, 270); g.lineTo(260, 170); g.lineTo(330, 122); g.lineTo(400, 160); g.lineTo(560, 236); g.lineTo(560, 270); g.closePath();
    g.fillStyle = G(0.13); g.fill();
    castleSil(g, 330, 126, 0.34, 0.1, false);
    g.beginPath(); g.moveTo(0, 186); g.quadraticCurveTo(220, 168, 560, 252); g.lineTo(560, 270); g.lineTo(0, 270); g.closePath();
    g.fillStyle = G(0.17); g.fill();
    for (let k = 0; k < 11; k++) {
      const x = 6 + k * 46, base = 188 + Math.pow(x / 560, 1.6) * 62;
      houses(g, x, x + 26, base, 0.9, 0.1, true, 10 + k);
      glow(g, x + 12, base - 8, 18, 0.12);
    }
  });
  A.cripta = sceneArt(480, 270, 'crypt', g => {
    g.fillStyle = G(0.1); g.fillRect(0, 0, 480, 270);
    for (let y = 0; y < 270; y += 14)
      for (let x = ((y / 14) % 2) * 16; x < 480; x += 32) { g.fillStyle = G(0.12 + hash2(x, y, 2) * 0.1); g.fillRect(x + 1, y + 1, 30, 12); }
    g.fillStyle = G(0.38);
    g.beginPath(); g.moveTo(152, 270); g.lineTo(152, 96); g.arc(240, 96, 88, Math.PI, 0); g.lineTo(328, 270); g.fill();
    g.fillStyle = G(0.02);
    g.beginPath(); g.moveTo(168, 270); g.lineTo(168, 96); g.arc(240, 96, 72, Math.PI, 0); g.lineTo(312, 270); g.fill();
    for (let k = 0; k < 9; k++) { const a = Math.PI + (k / 8) * Math.PI; line(g, 240 + Math.cos(a) * 72, 96 + Math.sin(a) * 72, 240 + Math.cos(a) * 88, 96 + Math.sin(a) * 88, 1, 0.12); }
    for (let k = 0; k < 6; k++) { g.fillStyle = G(0.06 - k * 0.008); g.fillRect(176 + k * 4, 200 - k * 14, 128 - k * 8, 2); }
    glow(g, 300, 150, 120, 0.3);
  });
  return A;
}

// ---------- Guion ----------
// línea: texto | { q: cita en caja } | { big: rótulo central }
function cineScenes() {
  const look = kitLook(CR.cls), size = Math.round(150 * (RACES[CR.race].scale || 1));
  return [
    { art: 'reino', ramp: 'castle', pan: [0, 0, 80, 0], lines: [
      'Hace siglos, el reino de Vel’Ombra fue el más luminoso del continente.',
      'Su riqueza no venía del oro: venía del fuego.'] },
    { art: 'llama', ramp: 'castle', pan: [0, 90, 0, 150], flame: [240, 393, 96, 150], lines: [
      'En lo más hondo de la montaña ardía la Llama Primera,',
      'un fuego que nadie había encendido y que nunca se apagaba.',
      'Los reyes de Vel’Ombra construyeron su castillo encima,',
      'y la ciudad creció alrededor de las chimeneas que subían ese calor a las calles.',
      'Mientras la Llama ardiera, la noche no podía entrar del todo.',
      'Las sombras de Vel’Ombra eran cortas y obedientes.'] },
    { art: 'rey', ramp: 'castle', pan: [0, 0, 40, 0], lines: [
      'El último rey, Aldemar el Insomne, tenía miedo a morir.',
      'Sus hechiceros le dijeron que la Llama Primera no daba luz: la robaba.',
      'Cada fuego del mundo era un pedazo de ella,',
      'y quien la poseyera entera no volvería a conocer la oscuridad,',
      'ni siquiera la de la tumba.'] },
    { art: 'procesion', ramp: 'crypt', pan: [0, 0, 140, 0], sfx: 'stairs', lines: [
      'Aldemar bajó a buscarla.',
      'Llevó a sus caballeros juramentados, a su archimago',
      'y a un cazador de bestias conocido como el Cazador Gris.'] },
    { art: 'apagon', ramp: 'castle', pan: [0, 0, 0, 0], snuff: true, lines: [
      'Cuando el rey tocó la Llama, esta se apagó.',
      'No hubo explosión ni grito.'] },
    { art: 'oscuridad', ramp: 'engrave', pan: [60, 0, 0, 0], lines: [
      'Vel’Ombra simplemente se quedó a oscuras, por primera vez en su historia.',
      'Toda la sombra que la Llama había mantenido a raya durante siglos entró de golpe:',
      'en los pasillos, en las casas y en la gente.'] },
    { art: 'rojo', ramp: 'blood', pan: [0, 0, 0, 0], sprite: ['boss', 'blood', 220], sfx: 'encounter', lines: [
      'Lo que quedó del rey ya no era un hombre.',
      'Era la oscuridad que ocupó el lugar del fuego, y tenía hambre de luz.',
      'Hoy los pocos que conocen la historia lo llaman',
      { big: 'El Que Habita la Oscuridad' }] },
    { art: 'verde', ramp: 'shade', pan: [0, 0, 0, 0], sprite: ['shade', 'shade', 210, 70], sfx: 'whisper', lines: [
      'Desde la caída, una voz recibe a cada viajero que entra en la cripta.',
      'Se burla y aconseja. Habla de las antorchas con desprecio y de la oscuridad con cariño:',
      { q: 'Otra lucecita bajando a mi cripta...' },
      'Es la Sombra Susurrante, el primer fragmento que se desprendió del rey.',
      'No ataca enseguida: espera. Sabe que toda antorcha se gasta, que el aceite se termina',
      'y que tarde o temprano el viajero queda solo con su respiración.',
      'Entonces le ofrece lo único que tiene:',
      { q: 'Déjala morir. La oscuridad es tibia.' },
      'Lo que la Sombra nunca dice es que necesita que la llama se apague por voluntad del portador.',
      'No puede apagarla ella misma. Por eso habla tanto.'] },
    { art: 'pueblo', ramp: 'castle', pan: [0, 0, 80, 0], lines: [
      'Nadie baja a la Cripta de Vel’Ombra por oro.',
      'En los pueblos de la ladera todavía circula una leyenda:',
      'la Llama Primera no se extinguió, se dividió.',
      'Quedó una chispa en cada antorcha encendida desde entonces,',
      'y si alguien llevara una al fondo del pozo y la mantuviera viva frente al rey caído,',
      'el fuego recordaría lo que fue.'] },
    { art: 'cripta', ramp: 'crypt', pan: [0, 0, 0, 0], hero: [look, size], torchGrow: true, sfx: 'oil', lines: [
      'Por eso el héroe baja con una sola antorcha.',
      'No es una herramienta: es la misión.',
      { big: 'La última llama es la tuya.' }] },
  ];
}

// ---------- Reproducción ----------
// who: el héroe que aparece (clase, raza, equipo, nombre) · prefix: clave de las voces grabadas
const CINE = { art: null, scenes: null, si: 0, li: -1, t: 0, lt: 0, phase: 'in', fade: 1, skip: false, snuffed: false, onDone: null, who: null, prefix: 'intro' };

const lineText = l => tr(typeof l === 'string' ? l : l.q || l.big);
const lineVoice = l => (l.q ? 'sombra' : 'narrador');
// tiempo de escritura + pausa para leer
const lineDur = l => lineText(l).length / VOICE_CPS + 1.7 + lineText(l).length * 0.018 + (typeof l === 'string' ? 0 : 0.8);

function playIntro(onDone) {
  playCine(cineScenes(), onDone, { cls: CR.cls, race: CR.race, look: kitLook(CR.cls), name: CR.name }, 'intro');
}

function playCine(scenes, onDone, who, prefix, music = 'intro') {
  if (!CINE.art) CINE.art = buildCineArt();
  Object.assign(CINE, { scenes, si: 0, onDone, skip: false, who, prefix });
  S.mode = 'cine';
  $('cine').classList.remove('hidden');
  setMusic(music);
  startScene();
}

function startScene() {
  const sc = CINE.scenes[CINE.si];
  Object.assign(CINE, { li: -1, t: 0, lt: 0, phase: 'in', fade: 1, snuffed: false });
  sc.total = 1.8 + sc.lines.reduce((n, l) => n + lineDur(l), 0);
  setPalette(sc.ramp);
  if (sc.sprite && !sc.spriteCanvas) sc.spriteCanvas = spriteCanvas(SPRITES[sc.sprite[0]].p, sc.sprite[2], sc.sprite[1], 1);
  if (sc.hero) sc.heroCanvas = heroPortrait(CINE.who.cls, CINE.who.race, sc.hero[0] || CINE.who.look, sc.hero[1], sc.ramp);
  $('cineText').innerHTML = '';
  if (sc.sfx) sfx(sc.sfx);
  if (sc.flame) sfx('fire');
}

// La frase se escribe letra por letra; lo no escrito ocupa su lugar invisible para que no salte el texto
function showLine() {
  const l = CINE.scenes[CINE.si].lines[CINE.li];
  const slot = '<span class="typed"></span><span class="rest"></span>';
  const el = $('cineText');
  if (typeof l === 'string') el.innerHTML = `<div class="cap">${slot}</div>`;
  else if (l.q) { el.innerHTML = `<div class="cq"><span class="box">${slot}</span></div>`; sfx('whisper'); }
  else el.innerHTML = `<div class="cbig">${slot}</div>`;
  CINE.text = lineText(l);
  CINE.voice = lineVoice(l);
  CINE.shown = 0;
  CINE.audio = recordedVoice(`${CINE.prefix}_${CINE.si}_${CINE.li}`);
  renderTyped();
}

function renderTyped() {
  const n = Math.floor(CINE.shown);
  const el = $('cineText');
  el.querySelector('.typed').textContent = CINE.text.slice(0, n);
  el.querySelector('.rest').textContent = CINE.text.slice(n);
}

function typeTo(target) {
  const from = Math.floor(CINE.shown), to = Math.floor(target);
  CINE.shown = target;
  if (to === from) return;
  if (!CINE.audio) {
    const v = VOICES[CINE.voice];
    for (let i = from; i < to; i++)
      if (/[a-záéíóúñü]/i.test(CINE.text[i]) && i % v.every === 0) voiceBlip(CINE.text[i], CINE.voice);
  }
  renderTyped();
}

function stopLineAudio() {
  if (CINE.audio) { CINE.audio.pause(); CINE.audio = null; }
}

function nextLine() {
  const sc = CINE.scenes[CINE.si];
  stopLineAudio();
  CINE.li++; CINE.lt = 0;
  if (CINE.li >= sc.lines.length) { CINE.phase = 'out'; $('cineText').innerHTML = ''; return; }
  showLine();
}

function cineUpdate(dt) {
  CINE.t += dt;
  if (CINE.phase === 'in') {
    CINE.fade -= dt / 0.9;
    if (CINE.fade <= 0) { CINE.fade = 0; CINE.phase = 'lines'; nextLine(); }
  } else if (CINE.phase === 'lines') {
    CINE.lt += dt;
    if (CINE.shown < CINE.text.length) typeTo(Math.min(CINE.text.length, CINE.shown + dt * VOICE_CPS));
    // con voz grabada, la frase espera a que termine el audio
    const talking = CINE.audio && !CINE.audio.ended && !CINE.audio.error;
    if (!talking && CINE.lt > lineDur(CINE.scenes[CINE.si].lines[CINE.li])) nextLine();
  } else {
    if (CINE.scenes[CINE.si].sinFundido && !CINE.skip) return endIntro();
    CINE.fade += dt / (CINE.skip ? 0.5 : 0.9);
    if (CINE.fade >= 1) {
      CINE.fade = 1;
      if (!CINE.skip && CINE.si < CINE.scenes.length - 1) { CINE.si++; startScene(); }
      else endIntro();
    }
  }
}

function endIntro() {
  stopLineAudio();
  $('cine').classList.add('hidden');
  $('cineText').innerHTML = '';
  const cb = CINE.onDone; CINE.onDone = null;
  if (cb) cb();
}

function cineAction(act) {
  if (act === 'cancel') { CINE.skip = true; CINE.phase = 'out'; stopLineAudio(); $('cineText').innerHTML = ''; return; }
  if (act !== 'ok') return;
  if (CINE.phase === 'in') CINE.fade = 0;
  else if (CINE.phase === 'lines') {
    // primer Enter: completa la frase; segundo: pasa a la siguiente
    if (CINE.shown < CINE.text.length) { CINE.shown = CINE.text.length; renderTyped(); }
    else nextLine();
  }
}

// Intensidad de la llama que se apaga durante la frase n.º at de la escena
function snuffK(at = 0) {
  if (CINE.li < at || CINE.phase === 'in') return 1;
  if (CINE.li > at || CINE.phase === 'out') return 0;
  const k = clamp(1 - (CINE.lt - 1.6) / 1.4, 0, 1);
  if (k < 1 && !CINE.snuffed) { CINE.snuffed = true; sfx('snuff'); }
  return k;
}

function drawCine(ctx) {
  const sc = CINE.scenes[CINE.si];
  const R = RAMPS[sc.ramp];
  const art = CINE.art[sc.art];
  const p = clamp(CINE.t / sc.total, 0, 1);
  const e = p * p * (3 - 2 * p);
  const ox = -Math.round(lerp(sc.pan[0], sc.pan[2], e)), oy = -Math.round(lerp(sc.pan[1], sc.pan[3], e));
  ctx.fillStyle = R[0]; ctx.fillRect(0, 0, W, H);
  ctx.drawImage(art, ox, oy);
  const t = CINE.t;
  if (sc.flame) drawFlame(ctx, sc.flame[0] + ox, sc.flame[1] + oy, sc.flame[2], sc.flame[3], t, sc.flameK ? lerp(sc.flameK[0], sc.flameK[1], clamp((p - 0.45) / 0.4, 0, 1)) : 1, sc.ramp);
  if (sc.snuff) {
    const k = snuffK();
    ditherFill(ctx, 0, 0, W, H, (1 - k) * 0.8, R[0]);
    drawFlame(ctx, 240, 210, 84, 140, t, k, sc.ramp);
    if (k < 0.6) drawSmoke(ctx, 240, 206, t, R[2]);
  }
  if (sc.sprite) {
    const [, , size, dx = 0] = sc.sprite;
    const sx = Math.round(240 - size / 2 + dx), sy = Math.round(4 + Math.sin(t * 1.2) * 3);
    // spriteFade: se deshace en ceniza a lo largo de la escena (borrado con tramado, sin salir de la paleta)
    if (sc.spriteFade) {
      const k = clamp((p - 0.2) / 0.55, 0, 1);
      const tmp = sc.fadeBuf || (sc.fadeBuf = document.createElement('canvas'));
      tmp.width = sc.spriteCanvas.width; tmp.height = sc.spriteCanvas.height;
      const tg = tmp.getContext('2d');
      tg.drawImage(sc.spriteCanvas, 0, 0);
      tg.globalCompositeOperation = 'destination-out';
      ditherFill(tg, 0, 0, tmp.width, tmp.height * k * 1.2, 1, '#000');
      ditherFill(tg, 0, tmp.height * k * 1.2, tmp.width, tmp.height, k, '#000');
      tg.globalCompositeOperation = 'source-over';
      ctx.drawImage(tmp, sx, sy);
      ctx.fillStyle = R[3];
      for (let i = 0; i < 40 * k; i++) {
        const ph = (t * 0.2 + i * 0.053) % 1;
        ctx.fillRect(Math.round(sx + hash2(i, 7, 3) * size + Math.sin(t * 2 + i) * 4), Math.round(sy + size * 0.8 - ph * size), 1, 1);
      }
    } else ctx.drawImage(sc.spriteCanvas, sx, sy);
    ctx.fillStyle = R[4];
    for (let i = 0; i < 14; i++) {
      const ph = (t * 0.12 + i * 0.071) % 1;
      ctx.fillRect(Math.round(hash2(i, 1, 4) * W + Math.sin(t + i) * 6), Math.round(H - ph * H), 1, 1);
    }
  }
  if (sc.hero) {
    // hero: [equipo (null: el del héroe), tamaño, centro x, sin antorcha]
    const hc = sc.heroCanvas, hx = Math.round((sc.hero[2] || 240) - hc.width / 2), hy = H - hc.height - 2;
    ctx.drawImage(hc, hx, hy);
    if (!sc.hero[3]) {
      // la antorcha queda clavada a un lado, fuera de la silueta del héroe
      const tx = hx + hc.width + 4, ty = H - 92;
      ctx.fillStyle = R[2]; ctx.fillRect(tx - 1, ty, 3, 46);
      ctx.fillStyle = R[3]; ctx.fillRect(tx - 2, ty, 5, 4);
      const grow = sc.torchGrow ? (CINE.phase === 'lines' ? clamp(0.4 + CINE.li * 0.3 + CINE.lt * 0.05, 0, 1) : CINE.li < 0 ? 0.4 : 1)
        : sc.heroSnuff !== undefined ? snuffK(sc.heroSnuff) : 1;
      drawFlame(ctx, tx + 0.5, ty + 2, 36, 64, t, grow, sc.ramp);
      if (sc.heroSnuff !== undefined && grow < 0.6) drawSmoke(ctx, tx + 0.5, ty, t, R[2]);
    }
  }
  if (sc.dibujar) sc.dibujar(ctx, t);
  if (typeof drawEndingFx === 'function') drawEndingFx(ctx, sc, R, ox, oy, t, e);
  // banda inferior para el texto, en degradé tramado para que no corte la escena
  for (let k = 0; k < 8; k++) ditherFill(ctx, 0, 186 + k * 6, W, 6, 0.08 + k * 0.09, R[0]);
  ditherFill(ctx, 0, 234, W, 36, 0.8, R[0]);
  ditherFill(ctx, 0, 0, W, H, CINE.fade, R[0]);
}
