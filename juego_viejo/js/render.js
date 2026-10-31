'use strict';
// Raycaster por casillas + iluminación de antorcha + dithering de paleta

const lumBuf = new Float32Array(VW * VH);
const rampBuf = new Uint8Array(VW * VH);
const zBuf = new Float32Array(VW);
let viewImg, view32;
let rampsPacked = [];   // [entorno, sombra, sangre]
let lightR = 6, flick = 1;

function initRender(ctx) {
  viewImg = ctx.createImageData(VW, VH);
  view32 = new Uint32Array(viewImg.data.buffer);
}

function setPalette(envName) {
  rampsPacked = [packRamp(RAMPS[envName]), packRamp(RAMPS.shade), packRamp(RAMPS.blood)];
  RAMPS[envName].forEach((c, i) => document.documentElement.style.setProperty(`--c${i}`, c));
}

function lightAt(d) {
  let l = 1 - d / lightR;
  if (l <= 0) return 0.012;
  return l * Math.sqrt(l) * flick * 1.3 + 0.012;
}

function renderScene(world, cam, sprites, horizonOff) {
  const { map, wtype } = world;
  const px = cam.x, py = cam.y;
  const dx = Math.cos(cam.a), dy = Math.sin(cam.a);
  const plx = -dy * 0.66, ply = dx * 0.66;
  const hz = VH / 2 + horizonOff;
  const T = TEXTURES[world.theme || 'crypt'];   // cada piso tiene sus propias texturas

  // Piso y techo
  const rx0 = dx - plx, ry0 = dy - ply, rx1 = dx + plx, ry1 = dy + ply;
  for (let y = 0; y < VH; y++) {
    const isFloor = y >= hz;
    const p = isFloor ? y - hz + 0.5 : hz - y - 0.5;
    const rowDist = (0.5 * VH) / Math.max(0.5, p);
    const l0 = lightAt(rowDist) * (isFloor ? 1 : 0.65);
    let i = y * VW;
    if (l0 < 0.02) {
      for (let x = 0; x < VW; x++, i++) { lumBuf[i] = l0 * 0.4; rampBuf[i] = 0; }
      continue;
    }
    const sx = (rowDist * (rx1 - rx0)) / VW, sy = (rowDist * (ry1 - ry0)) / VW;
    let fx = px + rowDist * rx0, fy = py + rowDist * ry0;
    for (let x = 0; x < VW; x++, i++, fx += sx, fy += sy) {
      const tx = (fx * TEX) & (TEX - 1), ty = (fy * TEX) & (TEX - 1);
      let tex = T.ceil;
      if (isFloor) {
        const cx = Math.floor(fx), cy = Math.floor(fy);
        const m = cx >= 0 && cy >= 0 && cx < MW && cy < MH ? map[cy * MW + cx] : 0;
        tex = m === 2 ? TEXTURES.stairs : m === 3 ? T.lairFloor : T.floor;
      }
      lumBuf[i] = tex[ty * TEX + tx] * l0;
      rampBuf[i] = 0;
    }
  }

  // Muros (DDA)
  for (let x = 0; x < VW; x++) {
    const camX = (2 * x) / VW - 1;
    const rdx = dx + plx * camX, rdy = dy + ply * camX;
    let mx = Math.floor(px), my = Math.floor(py);
    const ddx = Math.abs(1 / rdx), ddy = Math.abs(1 / rdy);
    let stepX, stepY, sdx, sdy, side = 0, hit = 0;
    if (rdx < 0) { stepX = -1; sdx = (px - mx) * ddx; } else { stepX = 1; sdx = (mx + 1 - px) * ddx; }
    if (rdy < 0) { stepY = -1; sdy = (py - my) * ddy; } else { stepY = 1; sdy = (my + 1 - py) * ddy; }
    for (let n = 0; n < 64; n++) {
      if (sdx < sdy) { sdx += ddx; mx += stepX; side = 0; } else { sdy += ddy; my += stepY; side = 1; }
      if (mx < 0 || my < 0 || mx >= MW || my >= MH || map[my * MW + mx] === 1) { hit = 1; break; }
    }
    const perp = Math.max(0.05, side === 0 ? sdx - ddx : sdy - ddy);
    zBuf[x] = perp;
    if (!hit) continue;
    let wx = side === 0 ? py + perp * rdy : px + perp * rdx;
    wx -= Math.floor(wx);
    let tx = (wx * TEX) | 0;
    if ((side === 0 && rdx > 0) || (side === 1 && rdy < 0)) tx = TEX - tx - 1;
    const inMap = mx >= 0 && my >= 0 && mx < MW && my < MH;
    const tex = T.walls[inMap ? wtype[my * MW + mx] : 0];
    const lh = VH / perp;
    const ds = hz - lh / 2;
    const y0 = Math.max(0, Math.ceil(ds)), y1 = Math.min(VH, Math.ceil(hz + lh / 2));
    const l = lightAt(perp) * (side ? 0.78 : 1);
    for (let y = y0; y < y1; y++) {
      const ty = (((y - ds) / lh) * TEX) & (TEX - 1);
      const i = y * VW + x;
      lumBuf[i] = tex[ty * TEX + tx] * l;
      rampBuf[i] = 0;
    }
  }

  // Sprites (de lejos a cerca)
  const invDet = 1 / (plx * dy - dx * ply);
  const list = [];
  for (const s of sprites) {
    const sx = s.x - px, sy = s.y - py;
    const tX = invDet * (dy * sx - dx * sy);
    const tY = invDet * (-ply * sx + plx * sy);
    if (tY > 0.15) list.push({ s, tX, tY });
  }
  list.sort((a, b) => b.tY - a.tY);
  for (const { s, tX, tY } of list) {
    const spr = s.spr, S = spr.size;
    const scrX = (VW / 2) * (1 + tX / tY);
    const size = (VH / tY) * s.scale;
    const bottom = hz + (0.5 * VH) / tY;
    const top = bottom - size, left = scrX - size / 2;
    const l = lightAt(tY);
    const lit = Math.max(l, s.glow || 0) + (s.flash || 0);
    const xa = Math.max(0, Math.ceil(left)), xb = Math.min(VW, Math.ceil(left + size));
    const ya = Math.max(0, Math.ceil(top)), yb = Math.min(VH, Math.ceil(bottom));
    for (let x = xa; x < xb; x++) {
      if (tY >= zBuf[x]) continue;
      const tx = (((x - left) / size) * S) | 0;
      for (let y = ya; y < yb; y++) {
        const ti = (((y - top) / size) * S | 0) * S + tx;
        if (!spr.a[ti]) continue;
        const i = y * VW + x;
        lumBuf[i] = spr.lum[ti] * lit;
        rampBuf[i] = s.ramp;
      }
    }
  }
}

// Mano con antorcha en primer plano, con llama procedural
function renderTorch(t, fuelFrac, bob, ox = 0) {
  const spr = SPRITES.torch, S = spr.size, sc = 1.75;
  const left = VW - 104 + ox, top = VH - 92 + bob;
  for (let y = 0; y < S * sc; y++) {
    const dy = Math.floor(top + y);
    if (dy < 0 || dy >= VH) continue;
    for (let x = 0; x < S * sc; x++) {
      const ti = ((y / sc) | 0) * S + ((x / sc) | 0);
      if (!spr.a[ti]) continue;
      const dx = Math.floor(left + x);
      if (dx < 0 || dx >= VW) continue;
      const i = dy * VW + dx;
      lumBuf[i] = spr.lum[ti] * (0.55 + 0.45 * flick);
      rampBuf[i] = 0;
    }
  }
  if (fuelFrac <= 0) return;
  const tipX = left + 30.5 * sc, tipY = top + 16 * sc;
  const fh = 14 + 18 * fuelFrac, fw = 3 + 5 * fuelFrac;
  for (let fy = 0; fy < fh; fy++) {
    const ny = fy / fh;
    const sway = Math.sin(t * 7 + ny * 4) * ny * 3 + (vnoise(t * 6, ny * 3, 4) - 0.5) * ny * 4;
    const wd = fw * Math.pow(1 - ny, 0.75) * (0.8 + 0.4 * vnoise(t * 9, ny * 5, 2));
    for (let fx = -10; fx <= 10; fx++) {
      const d = Math.abs(fx - sway);
      if (d > wd) continue;
      const x = Math.round(tipX + fx), y = Math.round(tipY - fy);
      if (x < 0 || x >= VW || y < 0 || y >= VH) continue;
      const core = 1 - d / wd;
      const i = y * VW + x;
      lumBuf[i] = Math.max(lumBuf[i], 0.55 + core * 0.6 - ny * 0.2);
      rampBuf[i] = 0;
    }
  }
  // chispas
  for (let k = 0; k < 4; k++) {
    const ph = (t * 0.9 + k * 0.27) % 1;
    const x = Math.round(tipX + Math.sin(k * 3.1 + t * 2) * 6 * ph);
    const y = Math.round(tipY - fh - ph * 30);
    if (x >= 0 && x < VW && y >= 0 && y < VH && ph < 0.8) { lumBuf[y * VW + x] = 1; rampBuf[y * VW + x] = 0; }
  }
}

// Retrato grande (combate y diálogos)
// dissolve (0..1): el retrato se deshace en un tramado al morir el enemigo
function renderPortrait(spr, left, top, size, ramp, lit, dissolve = 0) {
  const S = spr.size;
  const xa = Math.max(0, Math.floor(left)), xb = Math.min(VW, Math.floor(left + size));
  const ya = Math.max(0, Math.floor(top)), yb = Math.min(VH, Math.floor(top + size));
  for (let y = ya; y < yb; y++) {
    const ty = (((y - top) / size) * S) | 0;
    for (let x = xa; x < xb; x++) {
      const ti = ty * S + ((((x - left) / size) * S) | 0);
      if (!spr.a[ti]) continue;
      if (dissolve && hash2(x, y, 5) < dissolve) continue;
      const i = y * VW + x;
      lumBuf[i] = spr.lum[ti] * lit;
      rampBuf[i] = ramp;
    }
  }
}

// Retrato con transformación (combate): anclado abajo al centro, escala por eje e inclinación
// skew desplaza cada fila según su altura: el cuerpo se mece sin mover los pies
function renderPortraitX(spr, cx, bottom, size, sx, sy, skew, ramp, lit, dissolve = 0) {
  const S = spr.size, w = size * sx, h = size * sy, top = bottom - h;
  const ya = Math.max(0, Math.floor(top)), yb = Math.min(VH, Math.ceil(bottom));
  for (let y = ya; y < yb; y++) {
    const ty = (((y - top) / h) * S) | 0;
    if (ty < 0 || ty >= S) continue;
    const left = cx - w / 2 + skew * (bottom - y);
    const xa = Math.max(0, Math.floor(left)), xb = Math.min(VW, Math.ceil(left + w));
    for (let x = xa; x < xb; x++) {
      const tx = (((x - left) / w) * S) | 0;
      if (tx < 0 || tx >= S) continue;
      const ti = ty * S + tx;
      if (!spr.a[ti]) continue;
      if (dissolve && hash2(x, y, 5) < dissolve) continue;
      const i = y * VW + x;
      lumBuf[i] = spr.lum[ti] * lit;
      rampBuf[i] = ramp;
    }
  }
}

// Sprite con dithering a un canvas con transparencia (para pantallas de menú)
function spriteCanvas(spr, size, rampName, lit = 1) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d');
  const img = g.createImageData(size, size);
  const out = new Uint32Array(img.data.buffer);
  const pal = packRamp(RAMPS[rampName]), n = pal.length - 1, S = spr.size;
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const ti = (((y / size) * S) | 0) * S + (((x / size) * S) | 0);
      if (!spr.a[ti]) continue;
      let v = clamp(spr.lum[ti] * lit, 0, 1) * n, k = v | 0;
      if (v - k > BAYER[((y & 3) << 2) | (x & 3)]) k++;
      out[y * size + x] = pal[k];
    }
  g.putImageData(img, 0, 0);
  return c;
}

function blitView(ctx, mul, add) {
  ditherTo(lumBuf, rampBuf, VW, VH, view32, rampsPacked, mul, add);
  ctx.putImageData(viewImg, VX, VY);
}

// ---------- Marco ornamental (estilo grabado) ----------
function buildFrame(envName) {
  const R = RAMPS[envName];
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const g = c.getContext('2d');
  const img = g.createImageData(W, H);
  const lum = new Float32Array(W * H);
  for (let y = 0, i = 0; y < H; y++)
    for (let x = 0; x < W; x++, i++) lum[i] = 0.04 + fbm(x / 18, y / 18, 61) * 0.16;
  ditherTo(lum, null, W, H, new Uint32Array(img.data.buffer), [packRamp(R)]);
  g.putImageData(img, 0, 0);

  const box = (x, y, w, h) => {
    g.fillStyle = R[0]; g.fillRect(x, y, w, h);
    g.strokeStyle = R[4]; g.lineWidth = 1; g.strokeRect(x - 2.5, y - 2.5, w + 5, h + 5);
    g.strokeStyle = R[2]; g.strokeRect(x - 0.5, y - 0.5, w + 1, h + 1);
    g.strokeStyle = R[3]; g.strokeRect(x - 4.5, y - 4.5, w + 9, h + 9);
  };
  // el emblema de las rosetas cambia con el piso: calavera, cruz o llama
  const rosette = (x, y) => {
    g.fillStyle = R[1]; g.beginPath(); g.arc(x, y, 6, 0, Math.PI * 2); g.fill();
    g.strokeStyle = R[4]; g.stroke();
    if (envName === 'crypt') {
      g.fillStyle = R[4]; g.beginPath(); g.arc(x, y - 0.6, 3.2, 0, Math.PI * 2); g.fill();
      g.fillRect(x - 1.5, y + 1.5, 3, 2.2);
      g.fillStyle = R[0]; g.fillRect(x - 2, y - 1, 1.4, 1.4); g.fillRect(x + 0.6, y - 1, 1.4, 1.4);
      g.fillRect(x - 0.5, y + 2.6, 1, 1.1);
    } else if (envName === 'castle') {
      g.fillStyle = R[4]; g.fillRect(x - 0.75, y - 4, 1.5, 8); g.fillRect(x - 3, y - 1.75, 6, 1.5);
      g.fillStyle = R[5]; g.fillRect(x - 0.5, y - 1.5, 1, 1);
    } else {
      g.fillStyle = R[4];
      g.beginPath(); g.moveTo(x, y - 4.5); g.lineTo(x + 2.8, y + 1); g.lineTo(x + 1.4, y + 3.5); g.lineTo(x - 1.4, y + 3.5); g.lineTo(x - 2.8, y + 1); g.fill();
      g.fillStyle = R[5]; g.fillRect(x - 0.6, y, 1.2, 2.4);
    }
  };
  const column = x => {
    g.fillStyle = R[2]; g.fillRect(x, 10, 1, H - 20); g.fillRect(x + 8, 10, 1, H - 20);
    for (let y = 18; y < H - 18; y += 12) {
      g.fillStyle = R[3];
      g.beginPath(); g.moveTo(x + 4.5, y - 4); g.lineTo(x + 8, y); g.lineTo(x + 4.5, y + 4); g.lineTo(x + 1, y); g.fill();
      g.fillStyle = R[5]; g.fillRect(x + 4, y - 0.5, 1, 1);
    }
  };

  box(VX, VY, VW, VH);
  box(VX, 206, VW, 52);
  box(338, VY, 122, 240);
  column(4); column(467);
  for (const [x, y] of [[VX - 3, VY - 3], [VX + VW + 3, VY - 3], [VX - 3, VY + VH + 3], [VX + VW + 3, VY + VH + 3],
    [335, VY - 3], [463, VY - 3], [335, 261], [463, 261], [VX - 3, 261], [VX + VW + 3, 261]]) rosette(x, y);

  // separadores del panel
  const sep = y => {
    g.fillStyle = R[3]; g.fillRect(346, y, 106, 1);
    g.fillStyle = R[4];
    g.beginPath(); g.moveTo(399, y - 3); g.lineTo(403, y + 0.5); g.lineTo(399, y + 4); g.lineTo(395, y + 0.5); g.fill();
  };
  sep(46); sep(146);
  return c;
}

// Barra con marco biselado; ghost (>= frac) deja ver un rato lo que se acaba de perder
function drawBar(ctx, R, x, y, w, h, frac, ghost = frac) {
  ctx.fillStyle = R[0]; ctx.fillRect(x - 2, y - 2, w + 4, h + 4);
  ctx.fillStyle = R[3]; ctx.fillRect(x - 1, y - 1, w + 2, h + 2);
  ctx.fillStyle = R[0];
  for (const [cx, cy] of [[x - 1, y - 1], [x + w, y - 1], [x - 1, y + h], [x + w, y + h]]) ctx.fillRect(cx, cy, 1, 1);
  ctx.fillStyle = R[1]; ctx.fillRect(x, y, w, h);
  const fw = Math.round(w * clamp(frac, 0, 1)), gw = Math.max(fw, Math.round(w * clamp(ghost, 0, 1)));
  // tramado de las celdas vacías
  if (h >= 3) {
    ctx.fillStyle = R[2];
    for (let i = x + gw + ((x + gw) % 2); i < x + w; i += 2) ctx.fillRect(i, y + 1 + (i % 4 ? 0 : 1), 1, 1);
  }
  if (gw > fw) { ctx.fillStyle = R[3]; ctx.fillRect(x + fw, y, gw - fw, h); }
  ctx.fillStyle = R[4]; ctx.fillRect(x, y, fw, h);
  if (h >= 4) { ctx.fillStyle = R[3]; ctx.fillRect(x, y + h - 1, fw, 1); }
  ctx.fillStyle = R[5]; ctx.fillRect(x, y, fw, 1);
  if (fw > 1 && fw < w) ctx.fillRect(x + fw - 1, y, 1, h);
  // marcas cada décimo
  if (w > 60 && h >= 4) { ctx.fillStyle = R[2]; for (let k = 1; k < 10; k++) ctx.fillRect(x + Math.round(w * k / 10), y + h - 1, 1, 1); }
}

// Fantasma de las barras: cuando el valor baja, el tramo perdido tarda un poco en vaciarse
const barGhosts = {};
function ghostOf(key, frac, dt) {
  const g = barGhosts[key];
  if (!g || frac >= g.v) { barGhosts[key] = { v: frac, hold: 0.45 }; return frac; }
  if ((g.hold -= dt) < 0) g.v = Math.max(frac, g.v - dt * 0.7);
  return g.v;
}

function drawMinimap(ctx, R, world, P, ox, oy, cs) {
  const { map, explored, ents } = world;
  ctx.fillStyle = R[0]; ctx.fillRect(ox - 2, oy - 2, MW * cs + 4, MH * cs + 4);
  ctx.strokeStyle = R[3]; ctx.strokeRect(ox - 2.5, oy - 2.5, MW * cs + 5, MH * cs + 5);
  for (let y = 0; y < MH; y++)
    for (let x = 0; x < MW; x++) {
      const i = y * MW + x;
      if (!explored[i]) continue;
      const m = map[i];
      ctx.fillStyle = m === 1 ? R[1] : m === 2 ? R[5] : m === 3 ? R[4] : R[3];
      if (m === 1) {
        // sólo se dibujan muros que bordean pasillos explorados
        let edge = false;
        for (const [ax, ay] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nx = x + ax, ny = y + ay;
          if (nx >= 0 && ny >= 0 && nx < MW && ny < MH && map[ny * MW + nx] !== 1 && explored[ny * MW + nx]) edge = true;
        }
        if (!edge) continue;
        ctx.fillStyle = R[2];
      }
      ctx.fillRect(ox + x * cs, oy + y * cs, cs, cs);
    }
  // salidas sin explorar: suelo desconocido pegado a lo explorado, con un punto tenue
  ctx.fillStyle = R[3];
  for (let y = 1; y < MH - 1; y++)
    for (let x = 1; x < MW - 1; x++) {
      const i = y * MW + x;
      if (explored[i] || map[i] === 1) continue;
      if ((explored[i - 1] && map[i - 1] !== 1) || (explored[i + 1] && map[i + 1] !== 1) ||
          (explored[i - MW] && map[i - MW] !== 1) || (explored[i + MW] && map[i + MW] !== 1))
        ctx.fillRect(ox + x * cs + 1, oy + y * cs + 1, 1, 1);
    }
  for (const e of ents)
    if (e.type === 'chest' && explored[e.y * MW + e.x]) {
      ctx.fillStyle = e.open ? R[2] : R[4];
      ctx.fillRect(ox + e.x * cs + 1, oy + e.y * cs + 1, cs - 1, cs - 1);
    } else if (e.type === 'event' && !e.done && explored[e.y * MW + e.x]) {
      ctx.fillStyle = R[5];
      ctx.fillRect(ox + e.x * cs + 1, oy + e.y * cs, 1, cs);
      ctx.fillRect(ox + e.x * cs, oy + e.y * cs + 1, cs, 1);
    } else if (e.type === 'ember' && Math.sin(T * 6) > -0.3) {
      // el rescoldo siempre se ve en el mapa, parpadeando
      ctx.fillStyle = R[5];
      ctx.fillRect(ox + e.x * cs, oy + e.y * cs, cs, cs);
    }
  // Runa del Vacío: las paredes huecas parpadean en el mapa
  if (hasRune('vacio') && Math.sin(T * 5) > 0) {
    ctx.fillStyle = R[5];
    for (const s of world.secrets || []) if (!s.open) ctx.fillRect(ox + s.x * cs, oy + s.y * cs, cs, cs);
  }
  // Ojo del Hereje: enemigos cercanos, aunque no los veas
  if (hasRelic('ojo')) {
    ctx.fillStyle = R[4];
    for (const e of ents)
      if (e.type === 'enemy' && Math.abs(e.x - P.x) + Math.abs(e.y - P.y) <= 8) ctx.fillRect(ox + e.x * cs + 1, oy + e.y * cs + 1, cs - 1, cs - 1);
  }
  ctx.fillStyle = R[5];
  const cx = ox + P.x * cs, cy = oy + P.y * cs;
  ctx.fillRect(cx, cy, cs, cs);
  const [fx, fy] = DIRS[P.dir];
  ctx.fillStyle = R[4];
  ctx.fillRect(cx + fx * cs, cy + fy * cs, cs, cs);
}
