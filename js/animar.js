'use strict';
// Animación por partes de un jefe: el dibujo se corta en piezas (campo "animacion" de enemigos.json) y cada pose
// se arma moviéndolas. Las poses se calculan una vez, al empezar la pelea, en el mismo formato que usa ponerEnemigo.

const POSES = { reposo: 12, velReposo: 7, golpe: 0.6, fin: 1.05 };
const POSES_LISTAS = {};     // varios enemigos iguales comparten las mismas poses

const dentro = (rects, x, y) => rects.some(([a, b, c, d]) => x >= a && y >= b && x < c && y < d);

// Busca qué parte del dibujo original cae en cada punto, aplicando al revés lo que hizo cada pieza
function armarPose(g, an, mov) {
  // cada pose es más grande que el dibujo: lo que se mueve puede salirse de él sin cortarse
  const t = g.size, m = Math.ceil(t * 0.3), T = t + m * 2, k = t / an.base, lum = new Float32Array(T * T), a = new Uint8Array(T * T);
  const copiar = (i, sx, sy) => {
    const X = Math.round(sx * k), Y = Math.round(sy * k);
    if (X < 0 || Y < 0 || X >= t || Y >= t) return false;
    const o = Y * t + X;
    if (!g.a[o]) return false;
    lum[i] = g.lum[o]; a[i] = 1;
    return true;
  };
  const todo = mov.todo || {};
  for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) {
    const px = (x - m) / k - (todo.x || 0), py = (y - m) / k - (todo.y || 0), i = y * T + x;
    let listo = false;
    for (const p of an.partes) {
      const q = mov[p.nombre] || {}, c = Math.cos(-(q.giro || 0)), s = Math.sin(-(q.giro || 0));
      const dx = px - p.pivote[0] - (q.x || 0), dy = py - p.pivote[1] - (q.y || 0);
      const sx = p.pivote[0] + dx * c - dy * s, sy = p.pivote[1] + dx * s + dy * c;
      if (dentro(p.rects, sx, sy) && copiar(i, sx, sy)) { listo = true; break; }
    }
    if (listo) continue;
    // el cuerpo respira de la cintura para arriba y la capa se mece de la cintura para abajo
    const pecho = clamp((an.cintura - py) / 40, 0, 1), capa = py < an.pies ? clamp((py - an.cintura) / 45, 0, 1) : 0;
    const sx = px - (mov.capa || 0) * capa * capa, sy = py + (mov.pecho || 0) * pecho;
    const pieza = an.partes.find(p => dentro(p.rects, sx, sy));
    if (!pieza) copiar(i, sx, sy);
    // lo que una pieza del cuerpo deja al descubierto sigue siendo cuerpo: se ve el dibujo original
    else if (pieza.tapar) copiar(i, sx, sy);
    // detrás de un arma no hay dibujo: se completa con lo que se ve a su lado (campo "relleno")
    else if (an.relleno && dentro(an.relleno.rects, sx, sy)) copiar(i, sx + an.relleno.x, sy + an.relleno.y);
  }
  cerrarUniones(g, a, lum, k, T, m, todo);
  quitarSueltos(a, T);
  const afuera = zonaDeAfuera(a, T), borde = new Uint8Array(T * T);
  for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) {
    const i = y * T + x;
    // un hueco cerrado por dentro no es silueta: se rellena con el dibujo original, sin contorno
    if (!a[i] && !afuera[i]) {
      const X = Math.round(x - m - (todo.x || 0) * k), Y = Math.round(y - m - (todo.y || 0) * k), o = clamp(Y, 0, t - 1) * t + clamp(X, 0, t - 1);
      if (g.a[o]) { a[i] = 1; lum[i] = g.lum[o]; }
      continue;
    }
    if (a[i]) continue;
    if ((x && a[i - 1]) || (x < T - 1 && a[i + 1]) || (y && a[i - T]) || (y < T - 1 && a[i + T])) borde[i] = 1;
  }
  return { size: T, margen: m, lum, a, borde };
}

// Al mover una pieza queda una rendija entre ella y el cuerpo, que el contorno pintaría de negro.
// Un hueco angosto, con dibujo a los dos lados, se rellena con el dibujo original.
function cerrarUniones(g, a, lum, k, T, m, todo) {
  const t = g.size, ancho = Math.ceil(3 * k), hay = (x, y) => x >= 0 && y >= 0 && x < T && y < T && a[y * T + x] === 1;
  const cerca = (x, y, dx, dy) => { for (let n = 1; n <= ancho; n++) if (hay(x + dx * n, y + dy * n)) return true; return false; };
  for (let vuelta = 0; vuelta < 2; vuelta++) {
    const nuevos = [];
    for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) {
      if (a[y * T + x] || !((cerca(x, y, 1, 0) && cerca(x, y, -1, 0)) || (cerca(x, y, 0, 1) && cerca(x, y, 0, -1)))) continue;
      const X = Math.round(x - m - (todo.x || 0) * k), Y = Math.round(y - m - (todo.y || 0) * k);
      if (X >= 0 && Y >= 0 && X < t && Y < t && g.a[Y * t + X]) nuevos.push([y * T + x, g.lum[Y * t + X]]);
    }
    for (const [i, l] of nuevos) { a[i] = 1; lum[i] = l; }
  }
}

function zonaDeAfuera(a, t) {
  const fuera = new Uint8Array(t * t), pila = [];
  const sumar = i => { if (!a[i] && !fuera[i]) { fuera[i] = 1; pila.push(i); } };
  for (let n = 0; n < t; n++) { sumar(n); sumar((t - 1) * t + n); sumar(n * t); sumar(n * t + t - 1); }
  while (pila.length) {
    const i = pila.pop(), x = i % t;
    if (x) sumar(i - 1);
    if (x < t - 1) sumar(i + 1);
    if (i >= t) sumar(i - t);
    if (i < t * (t - 1)) sumar(i + t);
  }
  return fuera;
}

// Los pedacitos que quedan sueltos al mover una pieza se borran
function quitarSueltos(a, t) {
  const visto = new Uint8Array(t * t), minimo = Math.round(t * t * 0.002);
  for (let i = 0; i < t * t; i++) {
    if (!a[i] || visto[i]) continue;
    const pila = [i], isla = [];
    visto[i] = 1;
    while (pila.length) {
      const c = pila.pop(), x = c % t;
      isla.push(c);
      for (const n of [x ? c - 1 : -1, x < t - 1 ? c + 1 : -1, c - t, c + t]) if (n >= 0 && n < t * t && a[n] && !visto[n]) { visto[n] = 1; pila.push(n); }
    }
    if (isla.length < minimo) for (const c of isla) a[c] = 0;
  }
}

function prepararPoses(e) {
  const an = D.enemigos[e.tipo].animacion, clave = `${e.tipo}:${e.tam}`;
  if (!an || e.gris.size !== e.tam) return;
  topeVisible(e);      // se mide sobre el dibujo: las poses tienen margen
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

// El golpe especial dibujado cuadro por cuadro (campo "golpe_especial" de enemigos.json): una hoja con un cuadro al lado del otro
const HOJAS_ESPECIAL = {}, CUADROS_ESPECIAL = {};
for (const d of Object.values(D.enemigos)) for (const r of [d.golpe_especial, d.fase && d.fase.trono, d.fase && d.fase.caceria, d.fase && d.fase.veo, d.fase && d.fase.gancho && d.fase.gancho.hoja, d.ultimo && d.ultimo.hoja, ...(d.habilidades || []).map(h => h.hoja)]) if (r) HOJAS_ESPECIAL[r.imagen] = Object.assign(new Image(), { src: `interfaz/enemigos/${r.imagen}.png` });

function cuadrosEspeciales(e, r = D.enemigos[e.tipo].golpe_especial) {
  const hoja = r && HOJAS_ESPECIAL[r.imagen];
  if (!hoja || !hoja.complete || !hoja.naturalWidth) return null;
  if (!CUADROS_ESPECIAL[r.imagen]) CUADROS_ESPECIAL[r.imagen] = Array.from({ length: r.cuadros }, (_, i) => {
    const c = document.createElement('canvas'), t = r.lado; c.width = c.height = t;
    c.getContext('2d').drawImage(hoja, i * t, 0, t, t, 0, 0, t, t);
    const q = spriteDesdeImagen(c, t), borde = new Uint8Array(t * t);
    for (let n = 0; n < q.lum.length; n++) q.lum[n] = Math.min(1, q.lum[n] * 1.15 + 0.12);
    for (let y = 1; y < t - 1; y++) for (let x = 1; x < t - 1; x++) {
      const n = y * t + x;
      if (!q.a[n] && (q.a[n - 1] || q.a[n + 1] || q.a[n - t] || q.a[n + t])) borde[n] = 1;
    }
    return { ...q, margen: r.margen, borde };
  });
  return CUADROS_ESPECIAL[r.imagen];
}

function iniciarAtaqueAnimado(e) {
  if (e.poses) e.atacaDesde = Bt.t;
}

// Elige la pose de este momento: mientras ataca sigue la secuencia y después vuelve a respirar
function posar(e) {
  if (e.especialDesde !== undefined) {
    // cada tramo muestra un cuadro ("orden"; null es fuera de la pantalla) y puede subir o bajar al enemigo ("vuelo")
    const r = e.hojaActiva, t = Bt.t - e.especialDesde, i = r.tiempos.findIndex(v => t < v);
    if (i >= 0) {
      const c = r.orden ? r.orden[i] : i, v = r.vuelo && r.vuelo[i], ini = i ? r.tiempos[i - 1] : 0;
      e.oculto = c === null;
      if (c !== null) e.gris = cuadrosEspeciales(e, r)[c];
      e.vuelo = v ? v[0] + (v[1] - v[0]) * (t - ini) / (r.tiempos[i] - ini) : 0;
      return;
    }
    e.especialDesde = undefined; e.oculto = false; e.vuelo = 0;
  }
  // una hoja que termina en una pose que se queda: el trono armado, o el Cazador oculto mientras no ataca
  if (e.tronoDesde !== undefined && !e.expuesto) {
    const r = e.hojaFija, c = cuadrosEspeciales(e, r), i = r.tiempos.findIndex(v => Bt.t - e.tronoDesde < v);
    if (c) { e.gris = c[i < 0 ? c.length - 1 : i]; return; }
  }
  if (!e.poses) return;
  const n = e.poses.ataque.length, t = e.atacaDesde === undefined ? -1 : Bt.t - e.atacaDesde, mitad = Math.floor(n / 2);
  if (t >= POSES.fin) e.atacaDesde = undefined;
  if (t < 0 || t >= POSES.fin) e.gris = e.poses.reposo[Math.floor(Bt.t * POSES.velReposo) % POSES.reposo];
  else if (t < POSES.golpe) e.gris = e.poses.ataque[Math.min(mitad - 1, Math.floor(t / POSES.golpe * mitad))];
  else e.gris = e.poses.ataque[Math.min(n - 1, mitad + Math.floor((t - POSES.golpe) / (POSES.fin - POSES.golpe) * (n - mitad)))];
}
