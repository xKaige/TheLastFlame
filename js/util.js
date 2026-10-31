'use strict';
// Resolución interna (16:9, escala entera a 1080p x4 y 4K x8)
const W = 480, H = 270;
// Ventana 3D
const VX = 0, VY = 0, VW = 480, VH = 270;
const TEX = 64;
const MW = 44, MH = 44;

// Azar del juego con semilla (mulberry32): la misma semilla genera los mismos niveles.
// Cada nivel se resiembra al entrar (seedRng), así el mapa no depende de cómo jugaste antes.
// Lo visual, la música y los nombres usan vrnd/vpick (Math.random) para no correr la secuencia.
const RNG = { s: 1 };
function grand() {
  let t = (RNG.s = (RNG.s + 0x6D2B79F5) | 0);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
function seedRng(seed, a = 0, b = 0) { RNG.s = (hash2(seed | 0, a * 131 + b, 911) * 4294967296) | 0; }
const newSeed = () => (Math.random() * 4294967296) >>> 0;
const seedLabel = seed => (seed >>> 0).toString(36).toUpperCase().padStart(7, '0');
const rnd = (a, b) => a + Math.floor(grand() * (b - a + 1));
const chance = p => grand() < p;
const pick = arr => arr[Math.floor(grand() * arr.length)];
const vrnd = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
const vpick = arr => arr[Math.floor(Math.random() * arr.length)];
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;

function hash2(x, y, s) {
  let h = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(s | 0, 982451653)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967295;
}

// Ruido de valor; p = período para texturas que repiten (0 = sin repetición)
function vnoise(x, y, s, p) {
  const xi = Math.floor(x), yi = Math.floor(y);
  const xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const w = n => (p ? ((n % p) + p) % p : n);
  const a = hash2(w(xi), w(yi), s), b = hash2(w(xi + 1), w(yi), s);
  const c = hash2(w(xi), w(yi + 1), s), d = hash2(w(xi + 1), w(yi + 1), s);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}

function fbm(x, y, s, p, oct = 4) {
  let amp = 0.5, sum = 0, f = 1, norm = 0;
  for (let i = 0; i < oct; i++) {
    sum += amp * vnoise(x * f, y * f, s + i, p ? p * f : 0);
    norm += amp; amp *= 0.5; f *= 2;
  }
  return sum / norm;
}

const G = v => {
  const c = clamp(Math.round(v * 255), 0, 255);
  return `rgb(${c},${c},${c})`;
};

function hexToRgb(h) {
  const n = parseInt(h.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

// Rampas de color (oscuro -> claro). El dithering elige entre pasos vecinos.
const RAMPS = {
  crypt:   ['#070d0a', '#15241b', '#2f3b2c', '#6e5640', '#b98c66', '#efc79a'], // sepia sobre verde negro
  castle:  ['#07050c', '#22122e', '#4f2148', '#933a45', '#d9753f', '#f5c98a'], // luna naranja y bruma violeta
  engrave: ['#000000', '#121212', '#383836', '#77756f', '#c8c5bb', '#f2efe6'], // grabado blanco y negro
  shade:   ['#050a07', '#0f1f16', '#244032', '#4b7556', '#8fb38a', '#cfe3b8'], // verde espectral
  blood:   ['#080305', '#2a0a10', '#5e1418', '#a3281f', '#e0603a', '#ffc58a'],
};

function packRamp(hexes) {
  return Uint32Array.from(hexes.map(h => {
    const [r, g, b] = hexToRgb(h);
    return ((255 << 24) | (b << 16) | (g << 8) | r) >>> 0;
  }));
}

const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map(v => (v + 0.5) / 16);

// Convierte luminancia + índice de rampa a píxeles con dithering ordenado
function ditherTo(lum, rampIdx, w, h, out32, ramps, mul = 1, add = 0) {
  for (let y = 0, i = 0; y < h; y++) {
    const by = (y & 3) << 2;
    for (let x = 0; x < w; x++, i++) {
      const pal = ramps[rampIdx ? rampIdx[i] : 0];
      const n = pal.length - 1;
      let v = lum[i] * mul + add;
      if (v < 0) v = 0; else if (v > 1) v = 1;
      v *= n;
      let k = v | 0;
      if (v - k > BAYER[by | (x & 3)]) k++;
      out32[i] = pal[k];
    }
  }
}
