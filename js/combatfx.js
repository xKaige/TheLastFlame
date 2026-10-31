'use strict';
// Efectos de combate: arma propia en primer plano, tajos e impactos según el arma, partículas,
// golpes del enemigo sobre la pantalla y la animación del retrato enemigo.
// Todo se dibuja en lumBuf/rampBuf antes del dithering, así respeta la paleta del piso.
// Rampas: 0 = la del piso · 1 = sombra (verde espectral) · 2 = sangre

const CFX = { fx: [], parts: [], swing: null, stop: 0, guard: 0, jolt: 0, foe: null };
const FP = {};                 // sprites de armas y escudos en primer plano (128 px)
const FOE_X = 100, FOE_Y = 100; // centro del retrato enemigo en la vista

const easeIO = k => k * k * (3 - 2 * k);
const easeOut = k => 1 - (1 - k) * (1 - k);
const span = (t, a, b) => clamp((t - a) / (b - a), 0, 1);
const fr = (a, b) => a + Math.random() * (b - a);

// Tipo de arma según la base del objeto (ITEM_BASE): decide el movimiento y el impacto
function weaponKind() {
  const w = P.equip.arma;
  if (!w) return 'fist';
  return { pesada: ['sword', 'axe', 'mace'], media: ['rapier', 'sword', 'daggers'], liviana: ['staff', 'staff', 'staff'] }[w.weight][w.v] || 'sword';
}
// Con qué se cubre al defender: escudo grande, un sello arcano (grimorio/orbe) o el arma (el Pícaro cruza las dagas)
function guardKind() {
  const s = P.equip.escudo;
  if (!s) return weaponKind() === 'staff' ? 'ward' : 'parry';
  return s.weight === 'liviana' ? 'ward' : s.weight === 'media' ? 'parry' : 'kite';
}

// ---------- Sprites de primer plano (coordenadas de 64, empuñadura en 32,56) ----------
function fpSword(g) {
  g.fillStyle = G(0.8); g.beginPath(); g.moveTo(29, 47); g.lineTo(29, 9); g.lineTo(32, 2); g.lineTo(35, 9); g.lineTo(35, 47); g.fill();
  g.fillStyle = G(1); g.fillRect(29, 9, 1.4, 38);
  g.fillStyle = G(0.55); g.fillRect(31.5, 12, 1, 33);
  g.fillStyle = G(0.6); g.fillRect(21, 47, 22, 3.5);
  g.fillStyle = G(0.85); g.fillRect(21, 47, 22, 1);
  g.fillStyle = G(0.32); g.fillRect(30, 50.5, 4, 9);
  g.fillStyle = G(0.2); for (let y = 51.5; y < 59; y += 2) g.fillRect(30, y, 4, 0.8);
  g.fillStyle = G(0.7); g.beginPath(); g.arc(32, 61, 2.4, 0, 7); g.fill();
}
function fpAxe(g) {
  g.fillStyle = G(0.38); g.fillRect(30.5, 6, 3.5, 56);
  g.fillStyle = G(0.24); for (let y = 40; y < 60; y += 3) g.fillRect(30.5, y, 3.5, 1);
  g.fillStyle = G(0.72); g.beginPath(); g.moveTo(33, 9); g.quadraticCurveTo(44, 8, 50, 2); g.quadraticCurveTo(56, 16, 50, 30); g.quadraticCurveTo(44, 24, 33, 23); g.fill();
  g.strokeStyle = G(1); g.lineWidth = 1.6; g.beginPath(); g.moveTo(50, 3); g.quadraticCurveTo(55.5, 16, 50, 29); g.stroke();
  g.fillStyle = G(0.58); g.beginPath(); g.moveTo(30.5, 11); g.lineTo(24, 14); g.lineTo(30.5, 18); g.fill();
}
function fpMace(g) {
  g.fillStyle = G(0.38); g.fillRect(30.5, 18, 3, 44);
  g.fillStyle = G(0.62); g.fillRect(29, 52, 6, 2.2);
  g.fillStyle = G(0.5);
  for (let k = 0; k < 8; k++) {
    const a = k * Math.PI / 4;
    g.beginPath(); g.moveTo(32 + Math.cos(a - 0.4) * 6, 13 + Math.sin(a - 0.4) * 6);
    g.lineTo(32 + Math.cos(a) * 12, 13 + Math.sin(a) * 12); g.lineTo(32 + Math.cos(a + 0.4) * 6, 13 + Math.sin(a + 0.4) * 6); g.fill();
  }
  g.fillStyle = G(0.72); g.beginPath(); g.arc(32, 13, 7, 0, 7); g.fill();
  g.fillStyle = G(0.95); g.beginPath(); g.arc(30, 11, 3, 0, 7); g.fill();
}
function fpRapier(g) {
  g.fillStyle = G(0.85); g.beginPath(); g.moveTo(31, 46); g.lineTo(32, 1); g.lineTo(33, 46); g.fill();
  g.fillStyle = G(1); g.fillRect(31.2, 8, 0.9, 36);
  g.strokeStyle = G(0.65); g.lineWidth = 1.5; g.beginPath(); g.arc(32, 47, 7, Math.PI * 0.05, Math.PI * 0.95); g.stroke();
  g.fillStyle = G(0.6); g.fillRect(24, 45, 16, 2.5);
  g.fillStyle = G(0.3); g.fillRect(30.5, 47.5, 3, 11);
  g.fillStyle = G(0.7); g.beginPath(); g.arc(32, 60, 2.2, 0, 7); g.fill();
}
function fpDagger(g) {
  g.fillStyle = G(0.8); g.beginPath(); g.moveTo(29, 46); g.lineTo(29.5, 26); g.lineTo(32, 18); g.lineTo(34.5, 26); g.lineTo(35, 46); g.fill();
  g.fillStyle = G(1); g.fillRect(29.4, 26, 1.2, 20);
  g.fillStyle = G(0.6); g.fillRect(24, 46, 16, 3);
  g.fillStyle = G(0.3); g.fillRect(30.5, 49, 3, 9);
  g.fillStyle = G(0.65); g.beginPath(); g.arc(32, 59.5, 2.2, 0, 7); g.fill();
}
function fpStaff(g) {
  g.fillStyle = G(0.36); g.fillRect(30.5, 12, 3, 52);
  g.fillStyle = G(0.24); for (let y = 20; y < 64; y += 6) g.fillRect(30.5, y, 3, 1);
  g.strokeStyle = G(0.55); g.lineWidth = 1.6;
  g.beginPath(); g.moveTo(31, 16); g.quadraticCurveTo(24, 10, 27, 3); g.moveTo(33, 16); g.quadraticCurveTo(40, 10, 37, 3); g.stroke();
  g.fillStyle = G(0.9); g.beginPath(); g.arc(32, 8, 4.2, 0, 7); g.fill();
  g.fillStyle = G(1); g.beginPath(); g.arc(31, 7, 1.8, 0, 7); g.fill();
}
function fpKite(g) {
  g.beginPath(); g.moveTo(10, 8); g.quadraticCurveTo(32, 1, 54, 8); g.lineTo(54, 28); g.quadraticCurveTo(52, 48, 32, 63);
  g.quadraticCurveTo(12, 48, 10, 28); g.closePath();
  g.fillStyle = G(0.42); g.fill();
  g.lineWidth = 3; g.strokeStyle = G(0.72); g.stroke();
  g.fillStyle = G(0.62); g.fillRect(29.5, 9, 5, 44); g.fillRect(16, 21, 32, 5);
  g.fillStyle = G(0.85); g.fillRect(29.5, 9, 1.2, 44); g.fillRect(16, 21, 32, 1.2);
  g.fillStyle = G(0.92); g.beginPath(); g.arc(32, 23.5, 3.5, 0, 7); g.fill();
  g.strokeStyle = G(0.95); g.lineWidth = 1; g.beginPath(); g.moveTo(11.5, 10); g.lineTo(11.5, 28); g.quadraticCurveTo(13.5, 46, 30, 60); g.stroke();
}
function fpBuckler(g) {
  g.fillStyle = G(0.42); g.beginPath(); g.arc(32, 32, 24, 0, 7); g.fill();
  g.lineWidth = 3; g.strokeStyle = G(0.72); g.stroke();
  g.lineWidth = 1.2; g.strokeStyle = G(0.56); g.beginPath(); g.arc(32, 32, 16, 0, 7); g.stroke();
  g.fillStyle = G(0.85);
  for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4; g.beginPath(); g.arc(32 + Math.cos(a) * 20, 32 + Math.sin(a) * 20, 1.3, 0, 7); g.fill(); }
  g.fillStyle = G(0.8); g.beginPath(); g.arc(32, 32, 7, 0, 7); g.fill();
  g.fillStyle = G(1); g.beginPath(); g.arc(30, 30, 3, 0, 7); g.fill();
  g.strokeStyle = G(0.95); g.lineWidth = 1; g.beginPath(); g.arc(32, 32, 23, Math.PI * 0.75, Math.PI * 1.35); g.stroke();
}

function buildCombatSprites() {
  const defs = { sword: fpSword, axe: fpAxe, mace: fpMace, rapier: fpRapier, dagger: fpDagger, staff: fpStaff, kite: fpKite, buckler: fpBuckler };
  for (const k in defs) FP[k] = makeSprite(128, defs[k]);
}

// ---------- Primitivas sobre el búfer de luz ----------
function plot(x, y, v, ramp = 0, force = false) {
  x = Math.round(x); y = Math.round(y);
  if (x < 0 || y < 0 || x >= VW || y >= VH) return;
  const i = y * VW + x;
  if (force || v > lumBuf[i]) { lumBuf[i] = v; rampBuf[i] = ramp; }
}
// disco de borde suave; force pisa lo que haya debajo (núcleos de tajos)
function blob(x, y, r, v, ramp = 0, force = false) {
  if (r < 0.7) { plot(x, y, v, ramp, force); return; }
  const xa = Math.max(0, Math.floor(x - r)), xb = Math.min(VW - 1, Math.ceil(x + r));
  const ya = Math.max(0, Math.floor(y - r)), yb = Math.min(VH - 1, Math.ceil(y + r));
  for (let Y = ya; Y <= yb; Y++)
    for (let X = xa; X <= xb; X++) {
      const d = Math.hypot(X - x, Y - y);
      if (d > r) continue;
      const l = v * (1 - (d / r) * 0.35), i = Y * VW + X;
      if (force || l > lumBuf[i]) { lumBuf[i] = l; rampBuf[i] = ramp; }
    }
}
// no llamarla line(): todos los scripts comparten el ámbito global y art.js ya tiene una line() para los sprites
function fxLine(x0, y0, x1, y1, w, v, ramp = 0) {
  const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0)));
  for (let s = 0; s <= n; s++) blob(lerp(x0, x1, s / n), lerp(y0, y1, s / n), w, v, ramp);
}
function ring(x, y, r, th, v, ramp = 0) {
  const o = r + th + 1;
  const xa = Math.max(0, Math.floor(x - o)), xb = Math.min(VW - 1, Math.ceil(x + o));
  const ya = Math.max(0, Math.floor(y - o)), yb = Math.min(VH - 1, Math.ceil(y + o));
  for (let Y = ya; Y <= yb; Y++)
    for (let X = xa; X <= xb; X++) {
      const d = Math.abs(Math.hypot(X - x, Y - y) - r);
      if (d > th) continue;
      const l = v * (1 - d / (th + 0.5) * 0.5), i = Y * VW + X;
      if (l > lumBuf[i]) { lumBuf[i] = l; rampBuf[i] = ramp; }
    }
}
const bez = (p, t) => {
  const u = 1 - t;
  return [u * u * p[0] + 2 * u * t * p[2] + t * t * p[4], u * u * p[1] + 2 * u * t * p[3] + t * t * p[5]];
};
// Tajo que recorre una curva: la cabeza avanza rápido y la cola la persigue; núcleo casi blanco
function slashCurve(p, k, width, v, ramp) {
  const head = clamp(k * 2.2, 0, 1), tail = clamp(k * 2.2 - 0.7, 0, 1);
  if (head <= tail) return;
  const fade = k > 0.55 ? 1 - (k - 0.55) / 0.45 : 1;
  const steps = Math.ceil(Math.hypot(p[4] - p[0], p[5] - p[1]) * 1.3 * (head - tail)) + 2;
  for (let s = 0; s <= steps; s++) {
    const u = s / steps, t = tail + (head - tail) * u;
    const w = width * Math.pow(Math.sin(Math.PI * clamp(u * 0.92 + 0.04, 0, 1)), 0.8) * fade;
    const [x, y] = bez(p, t);
    blob(x, y, w * 0.8 + 0.6, v * (0.7 + 0.3 * u), ramp);
    if (w > 1.2) blob(x, y, w * 0.42, ramp ? v * 1.1 : 1.15, ramp, true);
  }
}

// Sprite rotado alrededor de un pivote (pu, pv en píxeles del sprite). ghost: sólo aclara (estela)
function blitSpr(spr, x, y, pu, pv, scale, ang, lit, ramp = 0, ghost = false) {
  const S = spr.size, c = Math.cos(ang), s = Math.sin(ang), inv = 1 / scale;
  const R = Math.hypot(Math.max(pu, S - pu), Math.max(pv, S - pv)) * scale;
  const xa = Math.max(0, Math.floor(x - R)), xb = Math.min(VW, Math.ceil(x + R));
  const ya = Math.max(0, Math.floor(y - R)), yb = Math.min(VH, Math.ceil(y + R));
  for (let Y = ya; Y < yb; Y++) {
    const dy = Y - y;
    for (let X = xa; X < xb; X++) {
      const dx = X - x;
      const u = (c * dx + s * dy) * inv + pu, v = (-s * dx + c * dy) * inv + pv;
      if (u < 0 || v < 0 || u >= S || v >= S) continue;
      const ti = (v | 0) * S + (u | 0);
      if (!spr.a[ti]) continue;
      const i = Y * VW + X, l = spr.lum[ti] * lit;
      if (!ghost || l > lumBuf[i]) { lumBuf[i] = l; rampBuf[i] = ramp; }
    }
  }
}

// ---------- Efectos y partículas ----------
// layer 0: sobre el enemigo · 2: sobre todo (golpes que recibes)
function addFx(dur, draw, delay = 0, layer = 0) { CFX.fx.push({ t: -delay, dur, draw, layer }); }

// o: { sp: [min, max] velocidad, dir, spread (radianes), g gravedad, life: [min, max], v, ramp, r, trail, drag }
function burst(x, y, n, o) {
  for (let k = 0; k < n; k++) {
    const a = (o.dir ?? 0) + fr(-1, 1) * (o.spread ?? Math.PI), sp = fr(o.sp[0], o.sp[1]);
    const life = fr(o.life[0], o.life[1]);
    CFX.parts.push({
      x: x + fr(-1, 1) * (o.jit || 0), y: y + fr(-1, 1) * (o.jitY ?? o.jit ?? 0), vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
      g: o.g || 0, drag: o.drag || 0, life, max: life, v: o.v ?? 1, ramp: o.ramp || 0, r: o.r || 0, trail: !!o.trail,
    });
  }
}
const sparks = (x, y, n, dir = -Math.PI / 2, spread = Math.PI) =>
  burst(x, y, n, { sp: [70, 190], dir, spread, g: 260, life: [0.18, 0.42], v: 1, trail: true });
const blood = (x, y, n, dir = 0, spread = Math.PI) =>
  burst(x, y, n, { sp: [40, 150], dir, spread, g: 320, life: [0.3, 0.6], v: 0.75, ramp: 2, r: 0.9 });

function slash(p, width, o = {}) {
  addFx(o.dur || 0.32, k => slashCurve(p, k, width, o.v ?? 0.95, o.ramp || 0), o.delay || 0, o.layer || 0);
}

function shock(x, y, m) {
  addFx(0.4, k => {
    const e = easeOut(k), r = 6 + 52 * e * m;
    ring(x, y, r, 3 * (1 - k) + 0.6, 1 - k * 0.5);
    if (k < 0.5) blob(x, y, 14 * m * (1 - k * 2), 1, 0, true);
    for (let a = 0; a < 12; a++) {
      const an = a * Math.PI / 6 + 0.2;
      fxLine(x + Math.cos(an) * r * 0.55, y + Math.sin(an) * r * 0.55, x + Math.cos(an) * r * 1.05, y + Math.sin(an) * r * 1.05, 0.6, 0.85 * (1 - k));
    }
  });
  burst(x, y, 22, { sp: [30, 110], g: 140, drag: 2, life: [0.4, 0.8], v: 0.55, r: 1.2, jit: 10 });
}

function pierce(x, y, m) {
  addFx(0.28, k => {
    const e = easeOut(k), L = 34 * e * m, f = 1 - k;
    for (let a = 0; a < 8; a++) {
      const an = a * Math.PI / 4 + 0.39, l = a % 2 ? L * 0.55 : L;
      fxLine(x + Math.cos(an) * 3, y + Math.sin(an) * 3, x + Math.cos(an) * l, y + Math.sin(an) * l, 0.6, f);
    }
    blob(x, y, 7 * m * f, 1, 0, true);
    ring(x, y, 4 + 16 * e * m, 0.8, 0.8 * f);
  });
}

function starBurst(x, y, m) {
  addFx(0.45, k => {
    const e = easeOut(k), f = 1 - k, r = 40 * e * m;
    for (const an of [0, Math.PI / 2, Math.PI, Math.PI * 1.5]) fxLine(x, y, x + Math.cos(an) * r, y + Math.sin(an) * r, 1.6 * f + 0.4, f);
    for (const an of [0.785, 2.356, 3.927, 5.498]) fxLine(x, y, x + Math.cos(an) * r * 0.45, y + Math.sin(an) * r * 0.45, 0.8, f);
    ring(x, y, r * 0.8, 1, 0.8 * f);
  });
  burst(x, y, 24, { sp: [40, 140], g: -20, drag: 2.5, life: [0.4, 0.9], v: 1, jit: 4 });
}

// Lenguas de fuego que suben sobre el enemigo (o toda la vista si wide)
function flames(m, wide, dur = 0.8) {
  const seed = vrnd(1, 999);
  addFx(dur, k => {
    const a = Math.sin(Math.PI * Math.min(1, k * 1.25));
    const x0 = wide ? 0 : 36, x1 = wide ? VW : 164, base = VH;
    for (let x = x0; x < x1; x++) {
      const nx = (x - x0) / (x1 - x0), env = wide ? 0.6 + 0.4 * Math.sin(Math.PI * nx) : Math.sin(Math.PI * nx);
      const tongue = 0.8 + 0.2 * Math.sin(x * 0.13 + T * 7 + seed);
      const hgt = (20 + 110 * Math.pow(fbm(x * 0.045, T * 2.2, seed, 0, 3), 1.6)) * tongue * a * env * m;
      for (let y = base - 1; y > base - hgt && y >= 0; y--) {
        const u = (base - y) / hgt;
        // la llama se ondula al subir y se deshilacha en la punta
        const wob = vnoise(x * 0.12 + Math.sin(y * 0.08 + T * 6) * 0.8, y * 0.05 - T * 4, seed + 1);
        if (u > 0.45 && wob < (u - 0.45) * 1.6) continue;
        const i = y * VW + x, l = 0.42 + (1 - u * 0.7) * (0.25 + 0.6 * wob);
        if (l > lumBuf[i]) { lumBuf[i] = l; rampBuf[i] = 0; }
      }
    }
  });
  const n = Math.round((wide ? 50 : 26) * m);
  for (let k = 0; k < n; k++)
    burst(wide ? fr(10, VW - 10) : FOE_X + fr(-55, 55), VH - fr(5, 50), 1, { sp: [30, 90], dir: -Math.PI / 2, spread: 0.5, g: -30, drag: 1, life: [0.5, 1.1], v: 1 });
}

// ---------- API que usa el combate ----------
function cfxStartCombat(e) {
  CFX.fx.length = 0; CFX.parts.length = 0; CFX.swing = null; CFX.stop = 0; CFX.guard = 0; CFX.jolt = 0;
  CFX.foe = { appear: 0, wind: 0, windTo: 0, lunge: 0, hit: 0, dir: 1, dodge: 0 };
}

// Movimiento del arma propia: tajo lateral, golpe desde arriba, estocada, conjuro o antorcha
function cfxStrike(kind) {
  const motion = { sword: 'sweep', axe: 'chop', mace: 'chop', rapier: 'thrust', dagger: 'thrust', daggers: 'thrust', staff: 'cast', torch: 'torch' }[kind];
  if (!motion) return;
  CFX.swing = { kind, motion, t: 0, dur: { sweep: 0.42, chop: 0.48, thrust: 0.36, cast: 0.6, torch: 0.48 }[motion] };
}

// Impacto sobre el enemigo según con qué le pegaste
function cfxImpact(kind, crit, heavy) {
  const m = (crit ? 1.3 : 1) * (heavy ? 1.25 : 1), f = CFX.foe;
  if (!f) return;
  const jx = fr(-8, 8), jy = fr(-10, 6);
  f.hit = 1; f.dir = -1;
  switch (kind) {
    case 'sword':
      slash([168 + jx, 30 + jy, 112, 92 + jy, 38 + jx, 160], 8 * m);
      sparks(FOE_X + jx, FOE_Y + jy, 14, Math.PI * 1.1, 1.1);
      sfx('slash');
      break;
    case 'axe':
      slash([132 + jx, 12, 112 + jx, 92, 86 + jx, 178], 12 * m, { dur: 0.36 });
      blood(FOE_X + jx, FOE_Y, 14, -Math.PI / 2, 1.2);
      burst(FOE_X + jx, FOE_Y + 10, 12, { sp: [40, 120], dir: Math.PI / 2, spread: 0.9, g: 300, life: [0.3, 0.6], v: 0.6, r: 1.1 });
      CFX.stop = Math.max(CFX.stop, 0.07); fx.shake = Math.max(fx.shake, 5);
      f.dir = 0.4; sfx('heavy');
      break;
    case 'mace': case 'fist':
      shock(FOE_X + jx, FOE_Y + jy, kind === 'fist' ? 0.6 * m : m);
      CFX.stop = Math.max(CFX.stop, kind === 'fist' ? 0.04 : 0.08); fx.shake = Math.max(fx.shake, kind === 'fist' ? 3 : 7);
      f.dir = jx > 0 ? 1 : -1; sfx('heavy');
      break;
    case 'rapier': case 'stab':
      pierce(FOE_X + jx, FOE_Y + jy, m);
      sparks(FOE_X + jx, FOE_Y + jy, 10);
      f.dir = 0.5; sfx('stab');
      break;
    case 'daggers':
      slash([60 + jx, 40, 95, 100, 150 + jx, 140], 5 * m, { dur: 0.26 });
      slash([150 + jx, 45, 110, 95, 55 + jx, 145], 5 * m, { dur: 0.26, delay: 0.08 });
      sparks(FOE_X + jx, FOE_Y + jy, 10);
      sfx('slash'); later(80, () => sfx('slash'));
      break;
    case 'dance':
      for (let k = 0; k < 3; k++) {
        const s = k % 2 ? -1 : 1, o = fr(-14, 14);
        slash([FOE_X - 60 * s, 40 + o, FOE_X, 95 + o, FOE_X + 60 * s, 150 + o], 5 * m, { dur: 0.24, delay: k * 0.09 });
        later(k * 90, () => { sfx('slash'); if (CFX.foe) CFX.foe.hit = 1; });
      }
      sparks(FOE_X, FOE_Y, 16);
      break;
    case 'staff':
      starBurst(FOE_X + jx, FOE_Y + jy, 0.8 * m); sfx('magic');
      break;
    case 'fire':
      flames(m, false); sparks(FOE_X, FOE_Y + 30, 10);
      break;
    case 'arcane':
      flames(1.1 * m, false); starBurst(FOE_X, FOE_Y, 0.9 * m); sfx('magic');
      break;
    case 'storm':
      flames(1.5 * m, true, 1.1); starBurst(FOE_X, FOE_Y, 1.4 * m);
      CFX.stop = Math.max(CFX.stop, 0.08); fx.shake = Math.max(fx.shake, 8);
      break;
    default:
      shock(FOE_X + jx, FOE_Y + jy, 0.6 * m);
  }
  if (crit) {
    CFX.stop = Math.max(CFX.stop, 0.1);
    fx.flash = Math.max(fx.flash, 0.35);
    addFx(0.22, k => { for (let a = 0; a < 16; a++) { const an = a * Math.PI / 8, r0 = 70 + 40 * k; fxLine(FOE_X + Math.cos(an) * r0, FOE_Y + Math.sin(an) * r0, FOE_X + Math.cos(an) * (r0 + 40), FOE_Y + Math.sin(an) * (r0 + 40), 0.6, 0.9 * (1 - k)); } });
  }
}

// Runa del Rayo: una descarga quebrada que baja del techo al enemigo
function cfxBolt() {
  const pts = [[FOE_X + fr(-30, 30), -4]];
  while (pts[pts.length - 1][1] < FOE_Y) {
    const [x, y] = pts[pts.length - 1];
    pts.push([x + fr(-14, 14) + (FOE_X - x) * 0.25, y + fr(10, 20)]);
  }
  addFx(0.35, k => {
    const v = k < 0.15 ? 1 : 1 - (k - 0.15) / 0.85, flick = Math.sin(k * 60) > -0.3 ? 1 : 0.4;
    for (let i = 1; i < pts.length; i++) {
      fxLine(pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1], 2.2 * v, 0.7 * v * flick);
      fxLine(pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1], 0.7, 1.1 * v * flick);
    }
  });
  sparks(FOE_X, FOE_Y, 18);
  fx.flash = Math.max(fx.flash, 0.5);
  sfx('clang');
}

// El golpe no conecta: un tajo al aire y el enemigo se corre
function cfxMiss() {
  if (!CFX.foe) return;
  CFX.foe.dodge = 1;
  slash([190, 25, 175, 95, 196, 170], 3.5, { v: 0.5, dur: 0.3 });
  sfx('whoosh');
}

// Veneno y sangrado al comienzo del turno enemigo
function cfxDot(names) {
  if (!CFX.foe) return;
  CFX.foe.hit = Math.max(CFX.foe.hit, 0.5);
  if (/veneno/i.test(names)) {
    for (let k = 0; k < 18; k++) burst(FOE_X + fr(-40, 40), FOE_Y + fr(-40, 20), 1, { sp: [5, 25], dir: Math.PI / 2, spread: 0.4, g: 140, life: [0.5, 1], v: 0.85, ramp: 1, r: 1 });
    burst(FOE_X, FOE_Y + 40, 10, { sp: [10, 30], dir: -Math.PI / 2, spread: 0.6, g: -40, life: [0.6, 1.1], v: 0.7, ramp: 1, r: 1.6, jit: 30 });
  }
  if (/sangrado/i.test(names)) blood(FOE_X + fr(-20, 20), FOE_Y, 18, -Math.PI / 2, 1.4);
}

// Habilidades sin golpe: luz de la cruz, ceniza que envuelve, curas
function cfxHoly() {
  sfx('holy');
  addFx(1.0, k => {
    const a = Math.sin(Math.PI * k), cx = 150, cy = 72;
    for (let x = 0; x < VW; x += 7) {
      const b = (0.5 + 0.5 * Math.sin(x * 0.37 + T * 3)) * a * 0.55;
      if (b > 0.15) fxLine(x, 0, x - 16, VH, 0.5, b);
    }
    fxLine(cx, cy - 46 * a, cx, cy + 66 * a, 2.4 * a, 1);
    fxLine(cx - 30 * a, cy - 8, cx + 30 * a, cy - 8, 2.4 * a, 1);
    ring(cx, cy - 8, 14 + 6 * k, 0.8, 0.9 * a);
  }, 0, 2);
  burst(150, VH, 30, { sp: [30, 90], dir: -Math.PI / 2, spread: 0.4, g: -20, drag: 0.5, life: [0.6, 1.2], v: 1, jit: 120, jitY: 4 });
}
function cfxAsh() {
  sfx('magic');
  for (let k = 0; k < 70; k++) {
    const a = fr(0, Math.PI * 2), r = fr(80, 140);
    const x = 150 + Math.cos(a) * r * 1.3, y = 95 + Math.sin(a) * r * 0.8;
    const sp = fr(60, 120);
    CFX.parts.push({ x, y, vx: -Math.sin(a) * sp - Math.cos(a) * 30, vy: Math.cos(a) * sp * 0.6 - Math.sin(a) * 20, g: 0, drag: 1.4,
      life: fr(0.6, 1.2), max: 1.2, v: fr(0.4, 0.75), ramp: 0, r: fr(0.6, 1.4), trail: false });
  }
}
function cfxHeal() {
  burst(60, VH - 10, 18, { sp: [20, 60], dir: -Math.PI / 2, spread: 0.5, g: -30, life: [0.6, 1.1], v: 1, jit: 40, jitY: 6 });
}

// Golpe del enemigo: se dibuja sobre la pantalla (te pega a ti)
function cfxFoeAttack(kind, big, blocked) {
  const m = big ? 1.4 : 1;
  if (blocked) {
    CFX.jolt = 1;
    const g = guardKind();
    const gx = g === 'ward' ? FOE_X : g === 'parry' ? 140 : 120, gy = g === 'ward' ? 110 : 130;
    sparks(gx + fr(-10, 10), gy + fr(-10, 10), 24, -Math.PI / 2, 1.6);
    addFx(0.25, k => ring(gx, gy, 8 + 40 * easeOut(k), 1.2, 1 - k), 0, 2);
    fx.shake = Math.max(fx.shake, 3);
    sfx(g === 'ward' ? 'magic' : 'clang');
    return;
  }
  switch (kind) {
    case 'claw':
      for (let k = 0; k < 3; k++) {
        const o = (k - 1) * 30;
        slash([190 + o, 8, 125 + o, 85, 40 + o, 175], 4 * m, { ramp: 2, v: 0.9, delay: k * 0.035, dur: 0.45, layer: 2 });
      }
      blood(150, 90, 10 * m, Math.PI * 0.75, 1);
      sfx('claw');
      break;
    case 'bite': {
      addFx(0.5, k => {
        const c = easeOut(Math.min(1, k * 3)), f = k > 0.5 ? 1 - (k - 0.5) * 2 : 1;
        const yu = -30 + c * 76, yd = VH + 30 - c * 76;
        // encía: una franja oscura y roja de la que salen los dientes
        for (let y = 0; y < 14; y++)
          for (let x = 0; x < VW; x++) {
            const wv = Math.sin(x * 0.05) * 3;
            plot(x, yu - y + wv, 0.32 * f, 2, true); plot(x, yd + y - wv, 0.32 * f, 2, true);
          }
        for (let i = 0; i < 13; i++) {
          const tx = 2 + i * 24 + (i % 2) * 4, len = 12 + ((i * 7) % 5) * 3 + (i === 3 || i === 9 ? 10 : 0);
          for (let d = 0; d < len; d++) {
            const u = d / len, hw = 6.5 * Math.pow(1 - u, 0.8), bend = u * u * 3 * (i % 2 ? 1 : -1);
            const l = (0.55 + 0.4 * u) * f;  // raíz en sombra, punta clara
            for (let x = -hw; x <= hw; x++) {
              plot(tx + x + bend, yu + Math.sin(tx * 0.05) * 3 + d, l, 0, true);
              plot(tx + 12 + x - bend, yd - Math.sin((tx + 12) * 0.05) * 3 - d, l, 0, true);
            }
          }
        }
      }, 0, 2);
      later(110, () => blood(150, 90, 22 * m, 0, Math.PI));
      sfx('bite');
      break;
    }
    case 'smash': {
      const x0 = fr(100, 200), y0 = fr(60, 110), branches = [];
      for (let b = 0; b < 7; b++) {
        let x = x0, y = y0, a = b * Math.PI * 2 / 7 + fr(-0.3, 0.3);
        const pts = [[x, y]];
        for (let s = 0; s < 14; s++) { a += fr(-0.5, 0.5); x += Math.cos(a) * 9 * m; y += Math.sin(a) * 9 * m; pts.push([x, y]); }
        branches.push(pts);
      }
      addFx(0.7, k => {
        const n = Math.floor(Math.min(1, k * 4) * 14), f = k > 0.4 ? 1 - (k - 0.4) / 0.6 : 1;
        for (const pts of branches) for (let s = 0; s < n; s++) fxLine(pts[s][0], pts[s][1], pts[s + 1][0], pts[s + 1][1], s < 4 ? 1.2 : 0.6, 0.9 * f);
        if (k < 0.3) blob(x0, y0, 20 * m * (1 - k / 0.3), 1, 0, true);
      }, 0, 2);
      burst(x0, y0, 26, { sp: [40, 140], g: 220, life: [0.3, 0.7], v: 0.6, r: 1.2 });
      fx.shake = Math.max(fx.shake, 10);
      sfx('heavy');
      break;
    }
    case 'shadow': {
      const ts = [];
      for (let k = 0; k < 7; k++) {
        const side = k % 4, s = fr(0.1, 0.9);
        const from = side === 0 ? [s * VW, -5] : side === 1 ? [VW + 5, s * VH] : side === 2 ? [s * VW, VH + 5] : [-5, s * VH];
        ts.push([from[0], from[1], fr(60, 240), fr(30, 150), 150 + fr(-30, 30), 90 + fr(-20, 20)]);
      }
      addFx(0.7, k => {
        const reach = Math.sin(Math.PI * Math.min(1, k * 1.2)) * 0.85;
        for (const p of ts) {
          const n = 110;
          for (let s = 0; s < n * reach; s++) {
            const t = s / n, [x, y] = bez(p, t);
            blob(x + Math.sin(t * 12 + T * 8) * 3, y, 3.2 * (1 - t / reach) + 0.4, 0.75, 1);
          }
        }
      }, 0, 2);
      sfx('whisper');
      break;
    }
    default: // 'blade'
      slash([30, 25, 140, 70, 285, 165], 9 * m, { ramp: 2, v: 0.9, dur: 0.42, layer: 2 });
      blood(150, 95, 14 * m, Math.PI * 0.2, 1.2);
      sfx('slash');
  }
}

// El enemigo falla: el golpe pasa de largo
function cfxFoeMiss() {
  slash([290, 40, 200, 30, 120, 70], 5, { v: 0.45, dur: 0.35, layer: 2 });
  sfx('whoosh');
}

// Te roba la llama: chispas que vuelan de tu antorcha al enemigo
function cfxDrain() {
  for (let k = 0; k < 18; k++) {
    const x = fr(220, 290), y = fr(150, 180);
    const dx = FOE_X - x, dy = FOE_Y - y, d = Math.hypot(dx, dy), sp = fr(160, 260);
    CFX.parts.push({ x, y, vx: dx / d * sp, vy: dy / d * sp + fr(-40, 40), g: 0, drag: 0, life: d / sp, max: d / sp, v: 1, ramp: 0, r: 1, trail: true });
  }
}

// Antes de atacar el enemigo se echa atrás; después salta encima
function cfxFoeWindup() { if (CFX.foe) CFX.foe.windTo = 1; }
function cfxFoeLunge() { if (CFX.foe) { CFX.foe.windTo = 0; CFX.foe.wind = 0; CFX.foe.lunge = 1; } }

// Al morir se deshace en ceniza que sube
function cfxDeath() {
  for (let k = 0; k < 70; k++)
    burst(FOE_X + fr(-50, 50), fr(30, VH - 10), 1, { sp: [10, 50], dir: -Math.PI / 2, spread: 0.8, g: -40, drag: 0.8, life: [0.6, 1.3], v: fr(0.5, 0.9), r: fr(0.5, 1.3) });
}

// ---------- Paso de tiempo ----------
function updateCombatFx(dt) {
  CFX.jolt = Math.max(0, CFX.jolt - dt * 4);
  CFX.guard += ((C && C.def && !C.dying ? 1 : 0) - CFX.guard) * Math.min(1, dt * 10);
  // pausa de impacto: todo se congela un instante para que el golpe pese
  if (CFX.stop > 0) { CFX.stop -= dt; return; }
  const f = CFX.foe;
  if (f) {
    f.appear = Math.min(1, f.appear + dt * 2.4);
    f.wind += (f.windTo - f.wind) * Math.min(1, dt * 9);
    f.lunge = Math.max(0, f.lunge - dt * 2.8);
    f.hit = Math.max(0, f.hit - dt * 3.2);
    f.dodge = Math.max(0, f.dodge - dt * 2.5);
  }
  if (CFX.swing && (CFX.swing.t += dt) > CFX.swing.dur) CFX.swing = null;
  for (const e of CFX.fx) e.t += dt;
  CFX.fx = CFX.fx.filter(e => e.t < e.dur);
  for (const p of CFX.parts) {
    p.life -= dt;
    p.vy += p.g * dt;
    if (p.drag) { const k = Math.exp(-p.drag * dt); p.vx *= k; p.vy *= k; }
    p.x += p.vx * dt; p.y += p.vy * dt;
  }
  CFX.parts = CFX.parts.filter(p => p.life > 0 && p.y < VH + 20 && p.y > -40);
}

// ---------- Dibujo ----------
// Retrato enemigo con respiración, flotación, preparación, embestida y retroceso al recibir
function drawFoe(e) {
  const f = CFX.foe, d = e.def;
  let cx = FOE_X, oy = 0, size = 164, sx = 1, sy = 1, skew = 0, lit = 0.95;
  switch (d.idle) {
    case 'float': oy = Math.sin(T * 1.6) * 5 - 4; skew = Math.sin(T * 1.2) * 0.06; sx += Math.sin(T * 2.3) * 0.02; break;
    case 'skitter': { const hop = Math.max(0, Math.sin(T * 7)); oy = -hop * hop * 3; cx += Math.sin(T * 3.1) * 3; skew = Math.sin(T * 11) * 0.02; sy += hop * 0.03; break; }
    case 'heavy': { const b = Math.sin(T * 1.3); sy += b * 0.018; sx -= b * 0.008; skew = Math.sin(T * 0.7) * 0.02; break; }
    default: { const b = Math.sin(T * 2.2); sy += b * 0.025; sx -= b * 0.012; skew = Math.sin(T * 1.1) * 0.035; }
  }
  const a = easeOut(f.appear);
  oy += (1 - a) * 34; lit *= 0.25 + 0.75 * a;
  const w = f.wind;
  sy *= 1 + 0.05 * w; sx *= 1 - 0.04 * w; oy -= 9 * w; skew -= 0.14 * w; lit += 0.15 * w * (0.5 + 0.5 * Math.sin(T * 30));
  const L = f.lunge * f.lunge;
  size *= 1 + 0.18 * L; oy += 12 * L; skew += 0.08 * L;
  const h = f.hit;
  // el destello es corto y moderado: si satura, el sprite queda como una silueta plana
  cx += f.dir * 14 * h; sx *= 1 + 0.07 * h; sy *= 1 - 0.09 * h; skew += f.dir * 0.16 * h; lit += h * h * 0.35;
  cx += Math.sin(f.dodge * Math.PI) * 22;
  cx += (Math.random() - 0.5) * C.shake; lit += C.flash * 0.15;
  const dy = C.dying || 0;
  const ramp = h > 0.75 && !d.boss ? 2 : d.ramp;
  renderPortraitX(SPRITES[d.spr].p, cx, VH + 6 + oy + dy * 22, size, sx, sy, skew, ramp, lit + dy * 0.7, dy);
}

// Poses del arma en primer plano en función del tiempo (x, y del pivote, ángulo, escala)
const SWING_POSE = {
  sweep(t) {
    const rise = easeIO(span(t, 0, 0.1)), cut = easeOut(span(t, 0.1, 0.2)), fall = easeIO(span(t, 0.22, 0.42));
    return { x: 228 - 40 * cut, y: 168 + 130 * (1 - rise) + 20 * cut + 120 * fall, ang: 1.15 - 2.65 * cut - 0.3 * fall, sc: 1, fast: t > 0.1 && t < 0.22 };
  },
  chop(t) {
    const rise = easeIO(span(t, 0, 0.12)), c = span(t, 0.12, 0.22), cut = c * c, fall = easeIO(span(t, 0.26, 0.48));
    return { x: 200 - 40 * cut, y: 178 + 130 * (1 - rise) - 24 * rise * (1 - cut) + 20 * cut + 120 * fall,
      ang: lerp(lerp(0.05, 0.5, rise), -1.05, cut), sc: 1.05, fast: t > 0.12 && t < 0.24 };
  },
  thrust(t) {
    const out = easeOut(span(t, 0.02, 0.15)), back = easeIO(span(t, 0.18, 0.36)), k = out * (1 - back);
    return { x: 222 - 82 * k, y: 260 - 110 * k + 20 * back, ang: -0.5, sc: 1 - 0.28 * k, fast: t > 0.06 && t < 0.16 };
  },
  cast(t) {
    const rise = easeIO(span(t, 0, 0.14)), push = Math.sin(Math.PI * span(t, 0.1, 0.3)), fall = easeIO(span(t, 0.38, 0.6));
    return { x: 210 - 16 * push, y: 262 - 70 * rise - 14 * push + 110 * fall, ang: -0.22 - 0.18 * push, sc: 1, glow: rise * (1 - fall) * (0.55 + 0.45 * push) };
  },
};

function drawSwing() {
  const s = CFX.swing;
  if (!s) return;
  if (s.motion === 'torch') {
    const k = Math.sin(Math.PI * span(s.t, 0, s.dur));
    renderTorch(T, Math.max(0.35, P.fuel / 100), 70 - 95 * k, -80 * k);
    if (s.t > 0.12 && s.t < 0.3) blob(FOE_X + 40, FOE_Y + 40, 10 * k, 1, 0, true);
    return;
  }
  const spr = FP[s.kind === 'daggers' ? 'dagger' : s.kind];
  const one = (t, mirror) => {
    const p = SWING_POSE[s.motion](t);
    const x = mirror ? 228 - p.x : p.x, ang = mirror ? -p.ang : p.ang;
    if (p.fast) for (let i = 3; i >= 1; i--) {
      const q = SWING_POSE[s.motion](t - i * 0.014);
      blitSpr(spr, mirror ? 228 - q.x : q.x, q.y, 64, 112, q.sc, mirror ? -q.ang : q.ang, 0.5 - i * 0.1, 0, true);
    }
    blitSpr(spr, x, p.y, 64, 112, p.sc, ang, 0.9);
    if (p.glow) {
      const tx = x + Math.sin(ang) * 96 * p.sc, ty = p.y - Math.cos(ang) * 96 * p.sc;
      blob(tx, ty, 4 + 7 * p.glow, 1, 0, true);
      ring(tx, ty, 8 + 10 * p.glow + Math.sin(T * 20) * 1.5, 0.7, p.glow);
    }
  };
  one(s.t, false);
  if (s.kind === 'daggers') one(s.t - 0.08, true);
}

// Guardia alzada mientras defiendes: escudo, broquel, sello arcano o el arma cruzada
function drawGuard() {
  const g = CFX.guard;
  if (g < 0.02) return;
  const kind = guardKind(), j = CFX.jolt, e = easeIO(g);
  const shake = (Math.random() - 0.5) * j * 6;
  if (kind === 'ward') {
    const r = 54 * e + j * 10, cx = FOE_X, cy = 110;
    ring(cx, cy, r, 0.9, 0.8 * g);
    ring(cx, cy, r - 8, 0.6, 0.55 * g);
    for (let k = 0; k < 12; k++) {
      const a = k * Math.PI / 6 + T * 0.7, x = cx + Math.cos(a) * (r - 4), y = cy + Math.sin(a) * (r - 4);
      fxLine(x - 1.5, y, x + 1.5, y, 0.4, 0.95 * g); fxLine(x, y - 1.5, x, y + 1.5, 0.4, 0.95 * g);
    }
    return;
  }
  if (kind === 'parry') {
    const w = weaponKind();
    if (w === 'fist') return;
    const spr = FP[w === 'daggers' ? 'dagger' : w];
    blitSpr(spr, 210 + shake, 170 + (1 - e) * 90 + j * 8, 64, 112, 1, -1.35 + j * 0.15, 0.85);
    return;
  }
  const big = kind === 'kite';
  blitSpr(FP[kind], (big ? 118 : 124) + Math.sin(T * 1.7) * 1.5 + shake, (big ? 168 : 158) + (1 - e) * 120 + j * 12 + Math.sin(T * 2.1) * 1.2,
    64, 64, big ? 1.15 : 0.95, -0.1 + j * 0.12, 0.85);
}

function drawParts() {
  for (const p of CFX.parts) {
    const f = clamp(p.life / p.max, 0, 1), v = p.v * (0.35 + 0.65 * f);
    if (p.trail) fxLine(p.x - p.vx * 0.025, p.y - p.vy * 0.025, p.x, p.y, 0, v, p.ramp);
    else blob(p.x, p.y, p.r * (0.5 + 0.5 * f), v, p.ramp);
  }
}

function drawCombatFx() {
  for (const e of CFX.fx) if (e.layer === 0 && e.t >= 0) e.draw(clamp(e.t / e.dur, 0, 1));
  drawGuard();
  drawSwing();
  drawParts();
  for (const e of CFX.fx) if (e.layer === 2 && e.t >= 0) e.draw(clamp(e.t / e.dur, 0, 1));
}
