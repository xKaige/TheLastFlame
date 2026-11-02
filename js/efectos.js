'use strict';
// Efecto de ataque de cada habilidad. Toda habilidad tiene el suyo: una nueva en habilidades.json necesita su entrada acá.
// Cada uno dibuja centrado en el blanco; k va de 0 a 1 durante el efecto y m es la escala del blanco.

const COL_FX = { hueso: '#e8dcc0', luz: '#ffd27a', fuego: '#ff8a2a', brasa: '#ffb45a', sangre: '#b52a2a', veneno: '#7fae5a', sombra: '#14101c', ceniza: '#8a8778' };
const arco = (c, x, y, r, a, b) => { c.beginPath(); c.arc(x, y, r, a, b); c.stroke(); };
const raya = (c, x, y, x2, y2) => { c.beginPath(); c.moveTo(x, y); c.lineTo(x2, y2); c.stroke(); };
const circulo = (c, x, y, r) => { c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill(); };

const FX_HABILIDAD = {
  // el tajo baja desde arriba y parte al blanco
  golpe_brutal: { dur: 0.4, dibujar(c, k, m) {
    const y = -46 * m + k * 92 * m;
    c.strokeStyle = COL_FX.hueso; c.lineWidth = (1 - k) * 10 * m + 1; raya(c, 0, -46 * m, 0, y);
    c.strokeStyle = COL_FX.sangre; c.lineWidth = (1 - k) * 4 * m; raya(c, 3, -46 * m, 3, y);
  } },
  // el grito sale en ondas cuadradas
  provocar: { dur: 0.55, dibujar(c, k) {
    c.strokeStyle = COL_FX.sangre;
    for (let n = 0; n < 3; n++) { const q = clamp(k * 1.5 - n * 0.25, 0, 1), r = 18 + q * 28; c.lineWidth = (1 - q) * 3; c.strokeRect(-r, -r, r * 2, r * 2); }
  } },
  // tres puñaladas rápidas desde lados distintos
  punalada: { dur: 0.36, dibujar(c, k, m) {
    c.strokeStyle = COL_FX.hueso;
    [[-1, -0.7], [1, -0.4], [-0.5, 1]].forEach(([x, y], n) => {
      const q = clamp(k * 3 - n, 0, 1); if (q <= 0 || q >= 1) return;
      c.lineWidth = 2; raya(c, x * 42 * m * (1 - q), y * 42 * m * (1 - q), x * 8 * (1 - q), y * 8 * (1 - q));
    });
  } },
  // corte verde que gotea
  hoja_envenenada: { dur: 0.5, dibujar(c, k, m) {
    c.strokeStyle = COL_FX.veneno; c.lineWidth = (1 - k) * 5 * m; arco(c, -20 * m, -8 * m, 30 * m, -0.8, 0.9);
    c.fillStyle = COL_FX.veneno;
    for (let n = 0; n < 7; n++) c.fillRect(-14 + n * 5, -14 + (n % 3) * 7 + k * k * 34, 2, 3);
  } },
  // una bola de fuego cae en arco sobre el blanco
  llama_arcana: { dur: 0.5, dibujar(c, k, m) {
    const q = clamp(k * 1.6, 0, 1), x = (1 - q) * -60 * m, y = (1 - q) * -70 * m, r = k > 0.62 ? (k - 0.62) * 90 * m : 6 * m;
    c.globalAlpha = k > 0.62 ? 1 - (k - 0.62) / 0.38 : 1;
    c.fillStyle = COL_FX.fuego; circulo(c, x, y, r + 3); c.fillStyle = COL_FX.luz; circulo(c, x, y, r * 0.6);
  } },
  // columnas de fuego que suben del piso
  tormenta: { dur: 0.6, dibujar(c, k, m, t, f) {
    c.globalAlpha = 1 - k * k;
    for (let n = -2; n <= 2; n++) {
      const h = Math.sin(clamp(k * 1.5 - Math.abs(n) * 0.12, 0, 1) * Math.PI) * 74 * m;
      c.fillStyle = COL_FX.fuego; c.fillRect(n * 11 * m - 5, 34 * m - h, 10, h);
      c.fillStyle = COL_FX.luz; c.fillRect(n * 11 * m - 2, 34 * m - h * 0.7, 4, h * 0.7);
    }
  } },
  // cruces de luz que suben
  sanar: { dur: 0.6, dibujar(c, k) {
    c.fillStyle = COL_FX.luz; c.globalAlpha = 1 - k;
    for (let n = 0; n < 5; n++) { const x = -18 + n * 9, y = 18 - (k * 40 + (n % 2) * 12); c.fillRect(x - 1, y - 4, 3, 9); c.fillRect(x - 4, y - 1, 9, 3); }
  } },
  // una columna de luz baja sobre cada uno
  bendicion: { dur: 0.7, dibujar(c, k) {
    const a = Math.sin(k * Math.PI), w = 34 * a;
    c.fillStyle = COL_FX.luz; c.globalAlpha = a * 0.35; c.fillRect(-w / 2, -240, w, 280);
    c.globalAlpha = a; c.fillRect(-1, -240, 2, 280);
  } },
  // un escudo se arma delante de cada uno
  muro_escudos: { dur: 0.6, dibujar(c, k) {
    const a = Math.min(1, k * 3); c.globalAlpha = 1 - k * k; c.strokeStyle = COL_FX.hueso; c.lineWidth = 2;
    c.beginPath(); c.moveTo(-22 * a, -22); c.lineTo(22 * a, -22); c.lineTo(22 * a, 4); c.lineTo(0, 26 * a); c.lineTo(-22 * a, 4); c.closePath(); c.stroke();
  } },
  // las curas y el fuego más fuertes usan el dibujo de los comunes
  get gracia() { return this.sanar; },
  get milagro() { return this.bendicion; },
  get lanza_ignea() { return this.llama_arcana; },
  get incendio() { return this.tormenta; },
  // una cruz de sangre que crece y estalla
  ultimo_aliento: { dur: 0.5, dibujar(c, k, m) {
    const r = 12 + 38 * k * m; c.strokeStyle = COL_FX.sangre; c.lineWidth = (1 - k) * 9 + 1;
    raya(c, -r, -r, r, r); raya(c, r, -r, -r, r);
    c.strokeStyle = COL_FX.hueso; c.lineWidth = (1 - k) * 2; raya(c, -r, -r, r, r);
  } },
  // un barrido que da la vuelta entera
  tajo_giratorio: { dur: 0.42, dibujar(c, k, m) {
    const a = k * Math.PI * 2; c.lineWidth = (1 - k * k) * 6 * m + 1;
    c.strokeStyle = COL_FX.ceniza; arco(c, 0, 0, 34 * m, a - 1.8, a - 0.6);
    c.strokeStyle = COL_FX.hueso; arco(c, 0, 0, 34 * m, a - 0.6, a);
  } },
  // la silueta se abre en sombras que se van
  paso_sombra: { dur: 0.6, dibujar(c, k) {
    c.fillStyle = COL_FX.sombra;
    for (let n = 1; n <= 3; n++) { c.globalAlpha = (1 - k) * (0.8 - n * 0.2); c.fillRect(-20 + (n * 11 * k) * (n % 2 ? 1 : -1), -22, 40, 44); }
  } },
  // la herida revienta en una estrella roja
  abrir_herida: { dur: 0.45, dibujar(c, k, m) {
    c.strokeStyle = COL_FX.sangre; c.lineWidth = (1 - k) * 4 + 0.5;
    for (let n = 0; n < 10; n++) { const a = n * 0.628, r = 8 + 48 * k * m * (n % 2 ? 1 : 0.6); raya(c, Math.cos(a) * 6, Math.sin(a) * 6, Math.cos(a) * r, Math.sin(a) * r); }
  } },
  // una nube de polvo gira frente a los ojos
  polvo_ojos: { dur: 0.7, dibujar(c, k, m) {
    c.fillStyle = COL_FX.ceniza; c.globalAlpha = 1 - k;
    for (let n = 0; n < 26; n++) { const a = n * 2.4 + k * 5, r = (6 + n * 1.3) * (0.4 + k) * m; c.fillRect(Math.cos(a) * r, -24 * m + Math.sin(a) * r * 0.45, 2, 2); }
  } },
  // las brasas caen en espiral hacia el blanco
  brasa_avida: { dur: 0.55, dibujar(c, k, m) {
    c.fillStyle = COL_FX.brasa;
    for (let n = 0; n < 14; n++) { const a = n * 0.9 + k * 7, r = (1 - k) * (30 + n * 3) * m; c.fillRect(Math.cos(a) * r, Math.sin(a) * r, 3, 3); }
    c.globalAlpha = k; c.fillStyle = COL_FX.fuego; circulo(c, 0, 0, k * 9 * m);
  } },
  // una ola de fuego corre por delante del grupo
  muro_llamas: { dur: 0.8, dibujar(c, k, m, t) {
    const a = Math.sin(k * Math.PI); c.globalAlpha = a;
    for (let n = -5; n <= 5; n++) {
      const h = (14 + Math.sin(t * 22 + n * 1.7) * 8) * a;
      c.fillStyle = COL_FX.fuego; c.fillRect(n * 9 - 4, -30 - h, 8, h); c.fillStyle = COL_FX.luz; c.fillRect(n * 9 - 2, -30 - h * 0.5, 4, h * 0.5);
    }
  } },
  // dos arcos tibios que se cierran
  manos_tibias: { dur: 0.6, dibujar(c, k) {
    const d = (1 - k) * 26; c.strokeStyle = COL_FX.brasa; c.lineWidth = 3; c.globalAlpha = Math.sin(k * Math.PI);
    arco(c, -d, 0, 18, -1.2, 1.2); arco(c, d, 0, 18, Math.PI - 1.2, Math.PI + 1.2);
  } },
  // una chispa viaja desde quien la presta hasta el otro
  chispa_prestada: { dur: 0.5, dibujar(c, k, m, t, f) {
    const q = clamp(k * 1.3, 0, 1), x = (f.desdeX || 0) * (1 - q), y = (f.desdeY || 0) * (1 - q) - Math.sin(q * Math.PI) * 30;
    c.fillStyle = COL_FX.luz; circulo(c, x, y, 3); c.fillStyle = COL_FX.fuego;
    for (let n = 1; n < 5; n++) { const p = Math.max(0, q - n * 0.05); c.fillRect((f.desdeX || 0) * (1 - p) - 1, (f.desdeY || 0) * (1 - p) - Math.sin(p * Math.PI) * 30, 2, 2); }
    if (k > 0.75) { c.globalAlpha = (1 - k) * 4; c.strokeStyle = COL_FX.luz; c.lineWidth = 2; arco(c, 0, 0, (k - 0.75) * 120, 0, Math.PI * 2); }
  } },
};

// Dónde pega: al centro de cada blanco de la habilidad
function lanzarEfecto(id, u, t) {
  const fx = FX_HABILIDAD[id], b = Bt.b, h = D.habilidades[id];
  if (!fx) return;
  const blancos = { enemigo: [t], enemigos: NUCLEO.vivos(b.enemigos), aliado: [t], aliados: NUCLEO.vivos(b.aliados), propio: [u] }[h.objetivo];
  const lugar = q => (q.enemigo ? { x: q.x, y: FBASE - q.tam * 0.45, m: q.tam / FTAM } : { x: CX[q.i] + 23, y: CY + 23, m: 1 });
  const o = lugar(u);
  for (const q of blancos) {
    const l = lugar(q);
    Bt.fxHab.push({ fx, ...l, t: 0, desdeX: o.x - l.x, desdeY: o.y - l.y });
  }
}

function actualizarFxHabilidad(dt) {
  for (const f of Bt.fxHab) f.t += dt;
  Bt.fxHab = Bt.fxHab.filter(f => f.t < f.fx.dur);
}

// Golpes de pixelfx, pasados por los tonos del piso. Cada uno se dibuja sobre el enemigo golpeado.
const LUGAR_PIXEL = {
  tajo: (x, m, q) => ({ x: x - 6 * q.dir, y: m + 26, radius: clamp(q.tam * 0.42, 28, 58) }),
  estocada: (x, m, q) => ({ x: x - 33 * q.dir, y: m + 14 }),
  golpe: (x, m) => ({ x, y: m + 22 }),
  chispa: (x, m) => ({ x, y: m + 20 }),
  critico: (x, m) => ({ x, y: m + 26 }),
  barrido: () => ({ x: 240, y: FBASE - 30, radius: 175 }),
};
let capaPixel = null;

function golpePixel(id, q) {
  const R = RAMPS[S.env], palette = id === 'critico' ? ['#2a0510', '#5c0a1c', '#a3142a', '#e0302c', R[4], R[5], '#fff09a', '#ffffff'] : [...R, '#ffffff'];
  const f = PIXELFX.createFx(PIXELFX.EFECTOS[id === 'barrido' ? 'tajo' : id], { ...LUGAR_PIXEL[id](q.x, FBASE - q.tam * 0.5, q), flip: id !== 'barrido' && q.dir < 0, seed: 1 + Math.floor(azarX() * 9999), palette, sparks: [R[5], R[4], R[3], '#ffffff'], warm: R[4], dust: R[3], clod: R[2] });
  f.update(0.07);   // arranca ya en el impacto: es el cuadro que queda congelado
  Bt.fxPixel.push(f);
}

function actualizarFxPixel(dt) {
  for (const f of Bt.fxPixel) f.update(dt);
  Bt.fxPixel = Bt.fxPixel.filter(f => !f.done());
}

function dibujarFxPixel(c) {
  if (!Bt.fxPixel.length) return;
  if (!capaPixel) {
    const lienzo = document.createElement('canvas'); lienzo.width = 480; lienzo.height = 270;
    capaPixel = { lienzo, g: lienzo.getContext('2d'), marco: PIXELFX.createFrame(480, 270), img: new ImageData(480, 270) };
  }
  PIXELFX.clearFrame(capaPixel.marco);
  for (const f of Bt.fxPixel) f.draw(capaPixel.marco);
  PIXELFX.composite(capaPixel.marco, capaPixel.img.data);
  capaPixel.g.putImageData(capaPixel.img, 0, 0);
  c.drawImage(capaPixel.lienzo, 0, 0);
}

function dibujarFxHabilidad(c) {
  for (const f of Bt.fxHab) {
    c.save(); c.translate(f.x, f.y); c.lineCap = 'butt';
    f.fx.dibujar(c, clamp(f.t / f.fx.dur, 0, 1), f.m, Bt.t, f);
    c.restore();
  }
}
