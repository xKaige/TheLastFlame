'use strict';
// Animación por partes de un jefe: el dibujo se corta en piezas (campo "animacion" de enemigos.json) y cada pose
// se arma moviéndolas. Las poses se calculan una vez, al empezar la pelea, en el mismo formato que usa ponerEnemigo.

const POSES = { reposo: 12, velReposo: 7, golpe: 0.6, fin: 1.05 };
const POSES_LISTAS = {};     // varios enemigos iguales comparten las mismas poses

const dentro = (rects, x, y) => rects.some(([a, b, c, d]) => x >= a && y >= b && x < c && y < d);

// Busca qué parte del dibujo original cae en cada punto, aplicando al revés lo que hizo cada pieza
function armarPose(g, an, mov) {
  const t = g.size, k = t / an.base, lum = new Float32Array(t * t), a = new Uint8Array(t * t);
  const copiar = (i, sx, sy) => {
    const X = Math.round(sx * k), Y = Math.round(sy * k);
    if (X < 0 || Y < 0 || X >= t || Y >= t) return false;
    const o = Y * t + X;
    if (!g.a[o]) return false;
    lum[i] = g.lum[o]; a[i] = 1;
    return true;
  };
  const todo = mov.todo || {};
  for (let y = 0; y < t; y++) for (let x = 0; x < t; x++) {
    const px = x / k - (todo.x || 0), py = y / k - (todo.y || 0), i = y * t + x;
    let listo = false;
    for (const p of an.partes) {
      const m = mov[p.nombre] || {}, c = Math.cos(-(m.giro || 0)), s = Math.sin(-(m.giro || 0));
      const dx = px - p.pivote[0] - (m.x || 0), dy = py - p.pivote[1] - (m.y || 0);
      const sx = p.pivote[0] + dx * c - dy * s, sy = p.pivote[1] + dx * s + dy * c;
      if (dentro(p.rects, sx, sy) && copiar(i, sx, sy)) { listo = true; break; }
    }
    if (listo) continue;
    // el cuerpo respira de la cintura para arriba y la capa se mece de la cintura para abajo
    const pecho = clamp((an.cintura - py) / 40, 0, 1), capa = py < an.pies ? clamp((py - an.cintura) / 45, 0, 1) : 0;
    const sx = px - (mov.capa || 0) * capa * capa, sy = py + (mov.pecho || 0) * pecho;
    const pieza = an.partes.find(p => dentro(p.rects, sx, sy));
    if (!pieza) copiar(i, sx, sy);
    // lo que una pieza del cuerpo deja al descubierto se ve como sombra, no como un agujero
    else if (pieza.tapar && copiar(i, sx, sy)) lum[i] *= 0.35;
  }
  const borde = new Uint8Array(t * t);
  for (let y = 0; y < t; y++) for (let x = 0; x < t; x++) {
    if (a[y * t + x]) continue;
    if ((x && a[y * t + x - 1]) || (x < t - 1 && a[y * t + x + 1]) || (y && a[(y - 1) * t + x]) || (y < t - 1 && a[(y + 1) * t + x])) borde[y * t + x] = 1;
  }
  return { size: t, lum, a, borde };
}

function prepararPoses(e) {
  const an = D.enemigos[e.tipo].animacion, clave = `${e.tipo}:${e.tam}`;
  if (!an || e.gris.size !== e.tam) return;
  if (!POSES_LISTAS[clave]) {
    const r = an.reposo, reposo = [];
    for (let i = 0; i < POSES.reposo; i++) {
      const f = i / POSES.reposo * Math.PI * 2, s = Math.sin(f), mov = { pecho: s * (r.pecho || 0), capa: Math.sin(f + 1) * (r.capa || 0), todo: { y: Math.sin(f + 0.5) * (r.flota || 0) } };
      Object.entries(r.partes || {}).forEach(([n, m], j) => { const q = Math.sin(f + j * 0.9 + 1); mov[n] = { giro: q * (m.giro || 0), x: q * (m.x || 0), y: q * (m.y || 0) }; });
      reposo.push(armarPose(e.gris, an, mov));
    }
    POSES_LISTAS[clave] = { reposo, ataque: an.ataque.map(m => armarPose(e.gris, an, m)) };
  }
  e.poses = POSES_LISTAS[clave];
}

function iniciarAtaqueAnimado(e) {
  if (e.poses) e.atacaDesde = Bt.t;
}

// Elige la pose de este momento: mientras ataca sigue la secuencia y después vuelve a respirar
function posar(e) {
  if (!e.poses) return;
  const n = e.poses.ataque.length, t = e.atacaDesde === undefined ? -1 : Bt.t - e.atacaDesde, mitad = Math.floor(n / 2);
  if (t >= POSES.fin) e.atacaDesde = undefined;
  if (t < 0 || t >= POSES.fin) e.gris = e.poses.reposo[Math.floor(Bt.t * POSES.velReposo) % POSES.reposo];
  else if (t < POSES.golpe) e.gris = e.poses.ataque[Math.min(mitad - 1, Math.floor(t / POSES.golpe * mitad))];
  else e.gris = e.poses.ataque[Math.min(n - 1, mitad + Math.floor((t - POSES.golpe) / (POSES.fin - POSES.golpe) * (n - mitad)))];
}
