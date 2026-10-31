'use strict';
// Ambientación de cada piso: texturas de muros, suelo y techo, la guarida del jefe
// y los objetos decorativos. Piso I: cripta · Piso II: castillo · Piso III: el fondo.

const FLOOR_THEME = ['', 'crypt', 'castle', 'abyss'];
const STAIRS_TEX = () => TEXTURES.stairs;

// Textura base por píxel + trazos dibujados encima (coordenadas 0..64)
function texDraw(base, draw) {
  const c = document.createElement('canvas');
  c.width = c.height = TEX;
  const g = c.getContext('2d');
  const img = g.createImageData(TEX, TEX);
  for (let y = 0, i = 0; y < TEX; y++)
    for (let x = 0; x < TEX; x++, i++) {
      const v = clamp(base(x, y), 0, 1) * 255;
      img.data[i * 4] = img.data[i * 4 + 1] = img.data[i * 4 + 2] = v; img.data[i * 4 + 3] = 255;
    }
  g.putImageData(img, 0, 0);
  g.lineCap = 'round'; g.lineJoin = 'round';
  draw(g);
  const d = g.getImageData(0, 0, TEX, TEX).data, t = new Float32Array(TEX * TEX);
  for (let i = 0; i < t.length; i++) t[i] = d[i * 4] / 255;
  return t;
}

// ---------- Patrones base ----------
// Sillares del castillo: hiladas altas y bajas alternadas, juntas finas y aristas talladas
function ashlarAt(x, y, s = 0) {
  const courses = [0, 20, 32, 52, 64];
  let row = 0;
  while (y >= courses[row + 1]) row++;
  const top = courses[row], h = courses[row + 1] - top, ly = y - top;
  const bw = h > 14 ? 32 : 21, off = (row % 2) * (bw / 2);
  const lx = (x + off) % bw, bx = Math.floor((x + off) / bw);
  if (lx < 1 || ly < 1) return 0.18;
  let v = 0.5 + hash2(bx, row, 30 + s) * 0.16 + (fbm(x / 10, y / 10, 31 + s, 6.4) - 0.5) * 0.18;
  if (ly === 1 || lx === 1) v += 0.16;
  if (ly === h - 1 || lx === bw - 1) v -= 0.14;
  return v;
}

function checkerAt(x, y) {
  const dark = ((x >> 4) + (y >> 4)) & 1;
  if (x % 16 === 0 || y % 16 === 0) return 0.12;
  let v = dark ? 0.16 : 0.58;
  v += (fbm(x / 7, y / 7, 51, 64 / 7) - 0.5) * 0.18;
  if (Math.abs(fbm(x / 16, y / 16, 52, 4) - 0.5) < 0.012) v *= 0.6;
  return v;
}

function beamsAt(x, y) {
  if (y % 32 < 7) return y % 32 === 0 ? 0.08 : 0.3 + (y % 32 === 1 ? 0.1 : 0);
  const grain = Math.sin(x * 0.35 + fbm(x / 9, y / 4, 61, 64 / 9) * 6) * 0.04;
  return 0.16 + grain + ((x % 16 === 0) ? -0.06 : 0);
}

function rockAt(x, y, s = 0) {
  const n = fbm(x / 14, y / 14, 70 + s, 64 / 14);
  let v = 0.2 + n * 0.5 + (fbm(x / 4, y / 4, 72 + s, 16) - 0.5) * 0.12;
  if (Math.abs(fbm(x / 20, y / 20, 74 + s, 3.2) - 0.5) < 0.02) v = 0.05;
  return v;
}

function veinsAt(x, y) {
  let v = 0.15 + fbm(x / 10, y / 10, 80, 6.4) * 0.18;
  const r = Math.abs(fbm(x / 12, y / 12, 81, 64 / 12) - 0.5);
  if (r < 0.009) v = 0.75 - r * 20;  // vetas de brasa que brillan en la oscuridad
  return v;
}

const TEXTURES = {};
function buildTextures() {
  const mossBrick = (x, y) => {
    let b = brickAt(x, y, 1);
    const m = fbm(x / 16, y / 16, 77, 4);
    if (m > 0.52) b *= 0.25 + (1 - m) * 0.6;
    return b;
  };
  const niche = (x, y) => {
    const inArch = (x >= 19 && x <= 45 && y >= 26 && y <= 56) || ((x - 32) ** 2 + (y - 26) ** 2 <= 13 * 13 && y < 26);
    const ring = (x >= 17 && x <= 47 && y >= 26 && y <= 58) || ((x - 32) ** 2 + (y - 26) ** 2 <= 15 * 15 && y < 26);
    if (inArch) {
      const dx = x - 32, dy = y - 44;
      if ((dx * dx) / 52 + (dy * dy) / 40 <= 1) {
        if ((x - 29) ** 2 + (y - 43) ** 2 < 4 || (x - 35) ** 2 + (y - 43) ** 2 < 4) return 0.04;
        if (y >= 49 && x % 2 === 0) return 0.25;
        return 0.72 + fbm(x / 4, y / 4, 8, 16) * 0.2 - Math.max(0, dy) * 0.02;
      }
      if (y > 52) return 0.25 + hash2(x, y, 3) * 0.2;
      return 0.02 + (y < 30 ? 0 : 0.02);
    }
    if (ring) return 0.6 + fbm(x / 6, y / 6, 4, 64 / 6) * 0.25;
    return brickAt(x, y, 2);
  };

  TEXTURES.stairs = makeTex((x, y) => {
    if (x < 5 || x > 58 || y < 5 || y > 58) return floorAt(x, y) * 1.15;
    const step = Math.floor((y - 5) / 9), ly = (y - 5) % 9;
    const v = ly < 2 ? 0.8 - step * 0.12 : 0.5 - step * 0.09;
    return Math.max(0.02, v * (0.75 + fbm(x / 6, y / 6, 12, 64 / 6) * 0.5));
  });

  // ---- Piso I: la cripta ----
  TEXTURES.crypt = {
    walls: [makeTex((x, y) => brickAt(x, y, 0)), makeTex(mossBrick), makeTex(niche),
      // guarida del Rey del Osario: muro de calaveras apiladas
      texDraw(() => 0.06, g => {
        for (let r = 0; r < 4; r++) {
          line(g, 0, r * 16 + 15, 64, r * 16 + 15, 2.4, 0.55);
          for (let k = 0; k < 4; k++) {
            const x = k * 16 + 8 + (r % 2) * 8 - 4, y = r * 16 + 7;
            ell(g, x, y, 6, 5.4, 0.8, 0.8);
            ell(g, x - 2.2, y, 1.6, 1.8, 0.04, 0); ell(g, x + 2.2, y, 1.6, 1.8, 0.04, 0);
            poly(g, [[x - 0.6, y + 2.6], [x + 0.6, y + 2.6], [x, y + 1.4]], 0.1, 0);
            for (let t = 0; t < 4; t++) line(g, x - 2.4 + t * 1.6, y + 4.4, x - 2.4 + t * 1.6, y + 5.8, 0.6, 0.85);
          }
        }
      })],
    floor: makeTex(floorAt),
    ceil: makeTex((x, y) => 0.16 + fbm(x / 9, y / 9, 41, 64 / 9) * 0.3 + (x % 64 < 6 ? 0.18 : 0)),
    // suelo del osario con huesos sueltos
    lairFloor: texDraw(floorAt, g => {
      for (const [x1, y1, x2, y2] of [[8, 12, 24, 18], [38, 40, 54, 34], [14, 46, 22, 58]]) {
        line(g, x1, y1, x2, y2, 2, 0.85); ell(g, x1, y1, 1.6, 1.6, 0.85, 0); ell(g, x2, y2, 1.6, 1.6, 0.85, 0);
      }
      ell(g, 44, 16, 5, 4.4, 0.78, 0.8); ell(g, 42.4, 16, 1.2, 1.4, 0.05, 0); ell(g, 45.6, 16, 1.2, 1.4, 0.05, 0);
    }),
  };

  // ---- Piso II: el castillo ----
  TEXTURES.castle = {
    walls: [
      makeTex((x, y) => ashlarAt(x, y)),
      // estandarte raído con la cruz
      texDraw((x, y) => ashlarAt(x, y, 1), g => {
        line(g, 12, 6, 52, 6, 2.4, 0.62);
        poly(g, [[16, 7], [48, 7], [48, 50], [44, 54], [40, 49], [36, 56], [32, 50], [28, 57], [24, 50], [20, 54], [16, 50]], 0.3, 1);
        g.strokeStyle = G(0.72); g.lineWidth = 1; g.strokeRect(19, 10, 26, 37);
        line(g, 32, 15, 32, 42, 3.2, 0.82); line(g, 24, 24, 40, 24, 3.2, 0.82);
      }),
      // ventanal gótico con tracería y luz de luna
      texDraw((x, y) => ashlarAt(x, y, 2), g => {
        g.fillStyle = G(0.72);
        g.beginPath(); g.moveTo(17, 58); g.lineTo(17, 28); g.arc(32, 28, 15, Math.PI, 0); g.lineTo(47, 58); g.fill();
        g.fillStyle = G(0.1);
        g.beginPath(); g.moveTo(20, 56); g.lineTo(20, 28); g.arc(32, 28, 12, Math.PI, 0); g.lineTo(44, 56); g.fill();
        g.fillStyle = G(0.32); g.fillRect(21, 40, 22, 15);
        line(g, 32, 28, 32, 56, 2, 0.68); line(g, 20, 40, 44, 40, 1.6, 0.68);
        g.beginPath(); g.arc(32, 24, 5, 0, Math.PI * 2); g.strokeStyle = G(0.68); g.lineWidth = 1.4; g.stroke();
        for (const [x, y] of [[26, 33], [38, 31], [24, 48], [40, 50]]) ell(g, x, y, 0.8, 0.8, 0.95, 0);
        g.fillStyle = G(0.6); g.fillRect(15, 56, 34, 4);
      }),
      // guarida del Cazador Gris: trofeo de caza sobre escudo de madera
      texDraw((x, y) => ashlarAt(x, y, 3), g => {
        poly(g, [[20, 18], [44, 18], [44, 38], [32, 50], [20, 38]], 0.28, 1);
        for (const sx of [-1, 1]) {
          curve(g, [[32 + sx * 4, 22], [32 + sx * 12, 14], [32 + sx * 16, 8], [32 + sx * 22, 4]], 1.4, 0.82);
          line(g, 32 + sx * 12, 15, 32 + sx * 14, 7, 1.2, 0.82); line(g, 32 + sx * 18, 7, 32 + sx * 21, 12, 1.2, 0.82);
        }
        poly(g, [[27, 22], [37, 22], [35, 34], [32, 40], [29, 34]], 0.84, 0.8);
        ell(g, 29.8, 27, 1.4, 1.6, 0.05, 0); ell(g, 34.2, 27, 1.4, 1.6, 0.05, 0);
      }),
    ],
    floor: makeTex(checkerAt),
    ceil: makeTex(beamsAt),
    // alfombra del salón de trofeos
    lairFloor: texDraw(checkerAt, g => {
      g.fillStyle = G(0.3); g.fillRect(8, 0, 48, 64);
      line(g, 10, 0, 10, 64, 1.2, 0.72); line(g, 54, 0, 54, 64, 1.2, 0.72);
      for (let y = 8; y < 64; y += 16) poly(g, [[32, y - 6], [40, y], [32, y + 6], [24, y]], 0.55, 0.6);
    }),
  };

  // ---- Piso III: el fondo ----
  const scorched = (x, y) => rockAt(x, y, 5) * 0.55;
  TEXTURES.abyss = {
    walls: [
      makeTex((x, y) => rockAt(x, y)),
      // relieve tallado: un adorador arrodillado ante la Llama
      texDraw((x, y) => rockAt(x, y, 1), g => {
        g.fillStyle = G(0.14); g.fillRect(10, 8, 44, 48);
        g.strokeStyle = G(0.6); g.lineWidth = 1.5; g.strokeRect(10, 8, 44, 48);
        poly(g, [[32, 12], [37, 22], [34, 20], [32, 28], [30, 20], [27, 22]], 0.88, 0);
        ell(g, 32, 39, 3, 3, 0.7, 0);
        curve(g, [[32, 42], [34, 46], [36, 50], [40, 52]], 1.4, 0.68);
        line(g, 29.5, 41, 25, 31, 1.2, 0.7); line(g, 34.5, 41, 39, 31, 1.2, 0.7);
        line(g, 24, 52, 40, 52, 1.2, 0.68);
      }),
      // cadenas que cuelgan de la roca
      texDraw((x, y) => rockAt(x, y, 2), g => {
        for (const [cx, len] of [[20, 40], [44, 52]]) {
          for (let y = 2; y < len; y += 5) {
            g.beginPath(); g.ellipse(cx, y, (y / 5) % 2 ? 1.2 : 2.2, 3, 0, 0, Math.PI * 2);
            g.strokeStyle = G(OUT); g.lineWidth = 2.2; g.stroke();
            g.strokeStyle = G(0.72); g.lineWidth = 1; g.stroke();
          }
          g.beginPath(); g.arc(cx, len + 2, 3.4, 0, Math.PI); g.strokeStyle = G(0.72); g.lineWidth = 1.6; g.stroke();
        }
      }),
      // Cámara de la Llama: muros quemados con runas encendidas
      texDraw(scorched, g => {
        const glyphs = [[[0, 0], [4, 8], [8, 0]], [[0, 8], [4, 0], [8, 8], [0, 8]], [[0, 0], [0, 8], [6, 4], [0, 4]], [[2, 0], [6, 4], [2, 8]]];
        for (let row = 0; row < 2; row++)
          for (let k = 0; k < 4; k++) {
            const pts = glyphs[(k + row) % glyphs.length].map(([x, y]) => [8 + k * 13 + x, 14 + row * 26 + y]);
            path(g, pts); g.strokeStyle = G(0.25); g.lineWidth = 3; g.stroke();
            path(g, pts); g.strokeStyle = G(0.95); g.lineWidth = 1.1; g.stroke();
          }
        line(g, 0, 32, 64, 32, 0.6, 0.35);
      }),
    ],
    floor: makeTex(veinsAt),
    ceil: makeTex((x, y) => 0.08 + fbm(x / 8, y / 8, 90, 8) * 0.2),
    // piso ritual: círculo con runas alrededor de una llama
    lairFloor: texDraw((x, y) => 0.18 + fbm(x / 9, y / 9, 92, 64 / 9) * 0.1, g => {
      g.beginPath(); g.arc(32, 32, 26, 0, Math.PI * 2); g.strokeStyle = G(0.72); g.lineWidth = 1.6; g.stroke();
      g.beginPath(); g.arc(32, 32, 19, 0, Math.PI * 2); g.lineWidth = 1; g.stroke();
      for (let k = 0; k < 8; k++) {
        const a = (k * Math.PI) / 4, x = 32 + Math.cos(a) * 22.5, y = 32 + Math.sin(a) * 22.5;
        line(g, x - 1.5, y - 1.5, x + 1.5, y + 1.5, 0.8, 0.85); line(g, x + 1.5, y - 1.5, x - 1.5, y + 1.5, 0.8, 0.85);
      }
      poly(g, [[32, 22], [37, 32], [34, 31], [32, 40], [30, 31], [27, 32]], 0.85, 0);
    }),
  };

  // variante 4 de cada piso: la pared hueca de las salas secretas
  for (const th of ['crypt', 'castle', 'abyss']) TEXTURES[th].walls[4] = crackTex(TEXTURES[th].walls[0]);
}

// Pared agrietada de las salas secretas: la textura común del piso con grietas que se abren
function crackTex(base) {
  return texDraw((x, y) => base[y * TEX + x], g => {
    const cracks = [[[32, 20], [27, 28], [30, 34], [24, 42], [26, 50]], [[30, 34], [38, 38], [42, 46]], [[27, 28], [19, 26]], [[32, 20], [36, 12]]];
    for (const pts of cracks) {
      path(g, pts); g.strokeStyle = G(0.9); g.lineWidth = 2.2; g.stroke();
      path(g, pts); g.strokeStyle = G(0.03); g.lineWidth = 1.2; g.stroke();
    }
    for (const [x, y] of [[29, 31], [37, 39], [25, 45]]) ell(g, x, y, 1.6, 1.2, 0.02, 0);
  });
}

// ---------- Objetos decorativos ----------
function drawBonePile(g) {
  ell(g, 32, 58, 22, 6, 0.42);
  for (const [x1, y1, x2, y2] of [[14, 56, 30, 50], [34, 52, 52, 57], [22, 58, 44, 54]]) {
    limb(g, [[x1, y1], [x2, y2]], 2, 0.82); ell(g, x1, y1, 1.8, 1.8, 0.82); ell(g, x2, y2, 1.8, 1.8, 0.82);
  }
  for (const [x, y, r] of [[26, 48, 6], [40, 50, 5.4], [33, 42, 5.8]]) {
    ell(g, x, y, r, r * 0.9, 0.86);
    ell(g, x - r * 0.38, y, r * 0.24, r * 0.28, 0.04, 0); ell(g, x + r * 0.38, y, r * 0.24, r * 0.28, 0.04, 0);
  }
}

// f: cuadro de la animación (0..3): la llama de cada vela cambia de alto y se ladea
const FLICKER = [[0, 0], [1.8, 0.7], [-1.2, -0.6], [0.8, 0.3]];
function drawCandles(g, f = 0) {
  ell(g, 32, 58, 12, 4, 0.3);
  ell(g, 32, 52, 7, 6, 0.82);
  ell(g, 29.4, 52, 1.6, 1.8, 0.04, 0); ell(g, 34.6, 52, 1.6, 1.8, 0.04, 0);
  [[22, 16], [27, 24], [37, 20], [42, 12]].forEach(([x, h], k) => {
    const [dh, dx] = FLICKER[(f + k) % 4];
    poly(g, [[x - 1.6, 56], [x + 1.6, 56], [x + 1.6, 56 - h], [x - 1.6, 56 - h]], 0.88, 0.7);
    line(g, x + 1.2, 56 - h, x + 1.6, 60 - h, 1, 0.95);
    // la llama de la vela es chica: se exagera el titileo para que se note a distancia
    const w = 1.6 + dh * 0.25;
    poly(g, [[x - w, 54 - h], [x + dx * 1.8, 47 - h - dh * 1.8], [x + w, 54 - h]], 1, 0);
    ell(g, x, 52.5 - h, w * 0.7, 1.6, 0.9, 0);
  });
}

function drawArmorStand(g) {
  line(g, 32, 63, 32, 54, 3, 0.3); poly(g, [[22, 63.5], [42, 63.5], [40, 61], [24, 61]], 0.3);
  line(g, 46, 4, 44, 62, 3.4, OUT); line(g, 46, 4, 44, 62, 1.6, 0.45);
  poly(g, [[44, 6], [46, -1], [48, 6]], 0.9);
  poly(g, [[26, 40], [31, 40], [30, 56], [25, 56]], 0.62); poly(g, [[33, 40], [38, 40], [39, 56], [34, 56]], 0.62);
  poly(g, [[24, 18], [40, 18], [42, 30], [39, 41], [25, 41], [22, 30]], 0.66);
  line(g, 32, 19, 32, 40, 0.8, 0.88);
  for (const y of [28, 32, 36]) line(g, 23, y, 41, y, 0.6, 0.35);
  ell(g, 22, 20, 5, 3.6, 0.72); ell(g, 42, 20, 5, 3.6, 0.72);
  limb(g, [[21, 22], [19, 32], [21, 40]], 2.6, 0.62); limb(g, [[43, 22], [45, 30], [45, 34]], 2.6, 0.62);
  ell(g, 32, 11, 5.4, 6.4, 0.72);
  line(g, 27, 11, 37, 11, 1.4, 0.03);
  line(g, 32, 5, 32, 17, 0.7, 0.9);
}

function drawBrazier(g, lit, f = 0) {
  for (const [x1, x2] of [[24, 18], [40, 46], [32, 32]]) line(g, 32 + (x1 - 32) * 0.4, 46, x2, 63, 2, 0.4);
  g.beginPath(); g.ellipse(32, 44, 14, 4, 0, 0, Math.PI); g.fillStyle = G(0.5); g.fill();
  g.strokeStyle = G(OUT); g.lineWidth = 1; g.stroke();
  ell(g, 32, 44, 14, 3, lit ? 0.7 : 0.22);
  if (!lit) { for (let k = 0; k < 4; k++) ell(g, 26 + k * 4, 43.5, 1.6, 1, 0.12, 0); return; }
  // cada lengua de fuego sube y baja según el cuadro (f: 0..3)
  const t = k => FLICKER[(f + k) % 4];
  poly(g, [[20, 44], [24 + t(0)[1], 30 - t(0)[0] * 2], [27, 36], [31 + t(1)[1], 20 - t(1)[0] * 2.5], [35, 33], [38 + t(2)[1], 26 - t(2)[0] * 2], [44, 44]], 0.92, 0);
  poly(g, [[25, 44], [29 + t(3)[1], 34 - t(3)[0]], [32, 38], [35 + t(2)[1], 31 - t(1)[0] * 1.5], [39, 44]], 1, 0);
}

function drawStalagmite(g) {
  poly(g, [[18, 63.5], [46, 63.5], [40, 40], [35, 14], [32, 4], [29, 18], [24, 42]], 0.42);
  poly(g, [[32, 4], [35, 14], [40, 40], [46, 63.5], [38, 63.5], [35, 40]], 0.3, 0);
  for (let k = 0; k < 5; k++) line(g, 26 + k * 3, 60 - k * 6, 28 + k * 2.6, 50 - k * 6, 0.6, 0.55);
  poly(g, [[44, 63.5], [54, 63.5], [50, 52], [48, 46]], 0.38);
}

function drawObelisk(g) {
  poly(g, [[22, 63.5], [42, 63.5], [40, 58], [24, 58]], 0.35);
  poly(g, [[25, 58], [39, 58], [36, 10], [32, 2], [28, 10]], 0.18);
  line(g, 28, 10, 25, 58, 0.8, 0.4);
  const glyphs = [[[0, 0], [3, 4], [6, 0]], [[0, 4], [3, 0], [6, 4]], [[3, 0], [3, 4], [0, 2], [6, 2]]];
  for (let k = 0; k < 7; k++) {
    const pts = glyphs[k % 3].map(([x, y]) => [29 + x, 14 + k * 6 + y]);
    path(g, pts); g.strokeStyle = G(0.95); g.lineWidth = 0.9; g.stroke();
  }
}

// tipos de objeto por piso: [sprite, escala, brillo propio, texto al chocar]
const PROPS = {
  crypt: [['bones', 0.5, 0, 'Un montón de huesos. Algunos todavía tienen marcas de dientes.'],
          ['candles', 0.45, 0.85, 'Velas de sebo sobre una calavera. Alguien las sigue encendiendo.']],
  castle: [['armorStand', 0.95, 0, 'Una armadura vacía. Juras que antes miraba hacia el otro lado.'],
           ['brazier', 0.6, 0.9, 'Un brasero que todavía arde. El calor es casi una caricia.']],
  abyss: [['stalagmite', 0.95, 0, 'Roca que crece hacia arriba, buscando una luz que ya no existe.'],
          ['obelisk', 1.0, 0.3, 'Un obelisco cubierto de runas. Están escritas desde adentro.']],
};
const FLAME_CHAMBER_PROP = ['brazierOut', 0.6, 0, 'Un brasero frío. Aquí ardía algo mucho más grande.'];
