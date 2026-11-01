'use strict';
// El juego: expediciones con un grupo elegido al azar y combate por turnos según velocidad.
// Se apoya en el motor de los otros scripts (mazmorra, arte, sonido) y reemplaza su título, creación de
// personaje y combate. Las reglas están en nucleo.js y los contenidos en datos/: acá sólo hay
// presentación y el flujo de la partida.

// ---------- Datos y estado ----------
const D = {};
for (const f of ['clases', 'habilidades', 'objetos', 'modelos', 'enemigos', 'mazmorra', 'dialogos', 'historia', 'eventos']) {
  const x = new XMLHttpRequest();
  x.open('GET', `datos/${f}.json`, false); x.send();
  D[f] = JSON.parse(x.responseText);
}
// Los textos de los datos se leen ya traducidos
localizeAllIn(D.clases, ['nombre', 'rol']);
localizeAllIn(D.modelos, ['titulo', 'rasgo']);
localizeAllIn(D.habilidades, ['nombre', 'descripcion', 'pista']);
localizeAllIn(D.objetos, ['nombre', 'descripcion']);
localizeAllIn(D.enemigos, ['nombre']);
for (const e of Object.values(D.enemigos)) if (e.especial) localize(e.especial, ['nombre']);
localizeAllIn(D.mazmorra.pisos, ['nombre']);
localizeMap(D.mazmorra.atributos.nombres);
localizeAllIn(D.historia.modelos, ['motivo', 'baja', 'piso', 'fondo', 'muerte']);
localizeAllIn(D.historia.finales, ['label', 'sub']);
const CLAVE = 'expedicion.estado';
const X = { ceniza: 0, caidos: [], corridas: 0, plantel: [], candidatos: [], leyendas: [], grimorio: [], mochila: [], memoria: { hondo: 1, reveladas: [], ultimoCaido: null, habitante: null, finales: {} }, perdidos: [], grupo: [], sel: [], ganada: 0 };
try { Object.assign(X, JSON.parse(STORE.get(CLAVE) || '{}')); } catch (e) { /* sin progreso */ }
for (const k of ['caidos', 'plantel', 'candidatos']) X[k] = X[k].filter(c => D.modelos[c.modelo] && D.clases[c.clase]).map(c => NUCLEO.ajustarModelo(D, NUCLEO.asegurarPersonaje(D, c)));   // personajes de modelos que ya no existen
X.leyendas = X.leyendas.filter(c => D.modelos[c.modelo] && D.clases[c.clase]).map(c => NUCLEO.ajustarModelo(D, c));
const guardarX = () => STORE.set(CLAVE, JSON.stringify({ grimorio: X.grimorio, mochila: X.mochila, ceniza: X.ceniza, caidos: X.caidos, corridas: X.corridas, plantel: X.plantel, candidatos: X.candidatos, leyendas: X.leyendas, memoria: X.memoria }));
const azarX = () => Math.random();
// Capa fina sobre el canvas de 480x270: textos, retratos e ilustraciones no se pixelan al agrandar la ventana.
// Se dibuja con las mismas coordenadas que el canvas, y su tamaño real es el de la ventana en pantalla:
// cada píxel de la capa es un píxel del monitor, así nada se reescala después.
const LADO_RETRATO = 128;
const NITIDO = { g: null, sucio: false, ancho: 0 };
function capaNitida() {
  ajustarCapa();
  NITIDO.sucio = true;
  return NITIDO.g;
}
function ajustarCapa() {
  const lienzo = $('nitido'), ancho = Math.max(480, Math.round($('stage').getBoundingClientRect().width * (window.devicePixelRatio || 1)));
  if (!NITIDO.g) NITIDO.g = lienzo.getContext('2d');
  if (ancho === NITIDO.ancho) return;
  NITIDO.ancho = ancho;
  lienzo.width = ancho; lienzo.height = Math.round(ancho * 270 / 480);
  NITIDO.g.setTransform(ancho / 480, 0, 0, ancho / 480, 0, 0);
  NITIDO.g.imageSmoothingQuality = 'high';
}
function limpiarCapa() {
  if (NITIDO.sucio) NITIDO.g.clearRect(0, 0, 480, 270);
  NITIDO.sucio = false;
}
const baseX = { draw, update, onAction, updateHUD, enterLevel, afterStep };

// Retratos de cada modelo: el PNG se pasa por la paleta del piso, como todo lo demás
const RET = {};
for (const [id, m] of Object.entries(D.modelos)) RET[id] = { img: Object.assign(new Image(), { src: tr('interfaz/retratos/{0}.png', m.retrato) }), c: {} };
function retratoX(id, size, ramp = S.env) {
  const r = RET[id], k = ramp + size;
  if (!r.c[k] && r.img.complete && r.img.naturalWidth) r.c[k] = spriteCanvas(spriteDesdeImagen(r.img, 128), size, ramp, 1.05);
  return r.c[k] || document.createElement('canvas');
}

// Texturas propias de la mazmorra: reemplazan las procedurales del motor
const TEXTURAS_X = [
  { tema: 'crypt', clave: 'walls', src: 'interfaz/mazmorra/cripta/muro_1.png' },
  { tema: 'crypt', clave: 'floor', src: 'interfaz/mazmorra/cripta/piso_1.png' },
  { tema: 'crypt', clave: 'ceil', src: 'interfaz/mazmorra/cripta/techo_1.png' },
];
for (const t of TEXTURAS_X) { t.img = new Image(); t.img.src = t.src; }
// Los dibujos propios de enemigos también van en la mazmorra: se pasan al formato de sprite del motor
// (brillo y máscara), así reciben la luz de la antorcha y la paleta del piso como todo lo demás.
function spriteDesdeImagen(img, size) {
  const c = document.createElement('canvas'); c.width = c.height = size;
  const g = c.getContext('2d', { willReadFrequently: true });
  g.drawImage(img, 0, 0, size, size);
  const d = g.getImageData(0, 0, size, size).data, n = size * size, lum = new Float32Array(n), a = new Uint8Array(n);
  let tope = 0.01;
  for (let i = 0; i < n; i++) {
    a[i] = d[i * 4 + 3] > 110 ? 1 : 0;
    lum[i] = (d[i * 4] * 0.35 + d[i * 4 + 1] * 0.5 + d[i * 4 + 2] * 0.15) / 255;
    if (a[i] && lum[i] > tope) tope = lum[i];
  }
  for (let i = 0; i < n; i++) lum[i] = Math.pow(lum[i] / tope, 0.8);   // usa todo el rango: el motor pone la luz
  return { size, lum, a };
}

const COFRES = { chest: D.mazmorra.accesorios.cofres.cerrado, chestOpen: D.mazmorra.accesorios.cofres.abierto };
for (const k in COFRES) COFRES[k] = Object.assign(new Image(), { src: tr('interfaz/mazmorra/cripta/accesorios/{0}.png', COFRES[k]) });

function aplicarEnemigosEnMapa() {
  for (const [k, img] of Object.entries(COFRES)) {
    if (img.enMapa || !img.complete || !img.naturalWidth) continue;
    const spr = spriteDesdeImagen(img, img.naturalWidth);
    for (let i = 0; i < spr.lum.length; i++) spr.lum[i] = Math.pow(spr.lum[i], 0.6);   // la madera oscura se perdía a la luz de la antorcha
    SPRITES[k].w = spr;
    img.enMapa = true;
  }
  for (const [id, d] of Object.entries(D.enemigos)) {
    const img = IMG_ENEMIGOS[d.imagen];
    if (!img || img.enMapa || !img.complete || !img.naturalWidth) continue;
    SPRITES[d.sprite].w = spriteDesdeImagen(img, 96);
    if (d.escala_mapa) ENEMIES[id].scale = d.escala_mapa;
    img.enMapa = true;
  }
}

function aplicarTexturas() {
  aplicarEnemigosEnMapa();
  prepararEventos();
  for (const t of TEXTURAS_X) {
    if (t.hecha || !t.img.complete || !t.img.naturalWidth) continue;
    const c = document.createElement('canvas'); c.width = c.height = TEX;
    const g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(t.img, 0, 0, TEX, TEX);
    const d = g.getImageData(0, 0, TEX, TEX).data;
    const tex = makeTex((x, y) => d[(y * TEX + x) * 4] / 255), T = TEXTURES[t.tema];
    if (t.clave === 'walls') { T.walls[0] = T.walls[1] = T.walls[2] = tex; T.walls[4] = crackTex(tex); }
    else T[t.clave] = tex;
    t.hecha = true;
  }
}

// Accesorios de pared: cada uno es una variante del muro, así reciben la perspectiva y la luz del motor.
// Se eligen por posición, para que un nivel quede siempre igual.
const ACC_BASE = 10, ACCESORIOS = D.mazmorra.accesorios;
for (const a of ACCESORIOS.lista) a.img = Object.assign(new Image(), { src: tr('interfaz/mazmorra/cripta/accesorios/{0}.png', a.imagen) });
function muroConAccesorio(base, a) {
  const c = document.createElement('canvas'); c.width = c.height = TEX;
  // el motor ensancha los muros (el ancho de pantalla rinde más que el alto): se compensa para que el dibujo no se deforme
  const g = c.getContext('2d', { willReadFrequently: true }), ancho = Math.round(a.alto * 1.32 * VH / VW);
  g.drawImage(a.img, (TEX - ancho) >> 1, a.y, ancho, a.alto);
  const d = g.getImageData(0, 0, TEX, TEX).data, alfa = (x, y) => x >= 0 && y >= 0 && d[(y * TEX + x) * 4 + 3] > 128;
  const gris = i => (d[i] * 0.35 + d[i + 1] * 0.5 + d[i + 2] * 0.15) / 255;
  let tope = 0.01;
  for (let i = 0; i < d.length; i += 4) if (d[i + 3] > 128) tope = Math.max(tope, gris(i));
  return makeTex((x, y) => {
    const i = (y * TEX + x) * 4;
    if (alfa(x, y)) return Math.pow(gris(i) / tope, 0.7);                                // que se despegue del muro oscuro
    return base[y * TEX + x] * (alfa(x - 1, y - 1) || alfa(x - 2, y - 2) ? 0.4 : 1);       // sombra sobre el muro
  });
}
function prepararMuros(w) {
  const T = TEXTURES[w.theme || 'crypt'], lista = ACCESORIOS.lista.filter(a => a.img.complete && a.img.naturalWidth);
  lista.forEach(a => { const k = ACC_BASE + ACCESORIOS.lista.indexOf(a); if (!T.walls[k]) T.walls[k] = muroConAccesorio(T.walls[0], a); });
  return lista;
}
function decorarMuros(w, nivel) {
  const lista = prepararMuros(w), puestos = [];
  if (!lista.length) return;
  const muro = (x, y) => x < 0 || y < 0 || x >= MW || y >= MH || w.map[y * MW + x] === 1;
  const azar = (x, y, s) => { let h = Math.imul(x + 1, 73856093) ^ Math.imul(y + 1, 19349663) ^ Math.imul(nivel + s, 83492791); h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
  for (let y = 1; y < MH - 1; y++) for (let x = 1; x < MW - 1; x++) {
    const i = y * MW + x;
    if (w.map[i] !== 1 || w.wtype[i] > 2) continue;
    // sólo en pared plana: una cara libre y sus dos costados también muro
    const libres = [[1, 0], [-1, 0], [0, 1], [0, -1]].filter(([ax, ay]) => !muro(x + ax, y + ay));
    if (libres.length !== 1 || !muro(x + libres[0][1], y + libres[0][0]) || !muro(x - libres[0][1], y - libres[0][0])) continue;
    if (azar(x, y, 1) > ACCESORIOS.densidad || puestos.some(p => Math.abs(p[0] - x) + Math.abs(p[1] - y) < ACCESORIOS.separacion)) continue;
    w.wtype[i] = ACC_BASE + ACCESORIOS.lista.indexOf(lista[Math.floor(azar(x, y, 2) * lista.length)]);
    puestos.push([x, y]);
  }
}

// Accesorios de techo: sprites de la altura del muro con el dibujo arriba, así siempre tocan el techo.
// Nunca bajan de la línea de los ojos: el grupo pasa por debajo y no chocan con nada.
const TECHO = ACCESORIOS.techo, IMG_TECHO = TECHO.lista.map(n => Object.assign(new Image(), { src: tr('interfaz/mazmorra/cripta/accesorios/{0}.png', n) }));
const SPR_TECHO = [];
function spriteTecho(n) {
  const img = IMG_TECHO[n];
  if (!SPR_TECHO[n] && img.complete && img.naturalWidth) SPR_TECHO[n] = spriteDesdeImagen(img, img.naturalWidth);
  return SPR_TECHO[n];
}
function colgarDelTecho(w, nivel) {
  w.colgantes = [];
  const azar = (x, y, s) => { let h = Math.imul(x + 3, 19349663) ^ Math.imul(y + 5, 73856093) ^ Math.imul(nivel + s, 83492791); h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
  for (let y = 1; y < MH - 1; y++) for (let x = 1; x < MW - 1; x++) {
    if (w.map[y * MW + x] !== 0 || azar(x, y, 7) > TECHO.densidad) continue;
    if (w.colgantes.some(p => Math.abs(p.x - x - 0.5) + Math.abs(p.y - y - 0.5) < TECHO.separacion)) continue;
    w.colgantes.push({ x: x + 0.5, y: y + 0.5, n: Math.floor(azar(x, y, 8) * TECHO.lista.length) });
  }
}
// Accesorios de piso: sprites sólidos, siempre en esquinas de sala y donde no dejan nada aislado.
const PISO = ACCESORIOS.piso;
for (const a of PISO.lista) a.img = Object.assign(new Image(), { src: tr('interfaz/mazmorra/cripta/accesorios/{0}.png', a.imagen) });
function zonaAlcanzable(w, tapado) {
  const pila = [w.start[1] * MW + w.start[0]], visto = new Set(pila);
  while (pila.length) {
    const i = pila.pop(), x = i % MW;
    for (const n of [x < MW - 1 ? i + 1 : -1, x > 0 ? i - 1 : -1, i + MW, i - MW]) if (n >= 0 && n < MW * MH && n !== tapado && w.map[n] !== 1 && !visto.has(n) && !w.solidos.has(n)) { visto.add(n); pila.push(n); }
  }
  return visto.size;
}
// Sólo la esquina de una sala: dos muros en ángulo y libre todo lo demás alrededor. Nunca queda en el paso.
function esquinaDeSala(w, x, y) {
  const muro = (a, b) => a < 0 || b < 0 || a >= MW || b >= MH || w.map[b * MW + a] === 1;
  const pasillo = (a, b) => (muro(a - 1, b) && muro(a + 1, b)) || (muro(a, b - 1) && muro(a, b + 1));
  for (const sx of [-1, 1]) for (const sy of [-1, 1]) {
    if (!muro(x + sx, y) || !muro(x, y + sy)) continue;
    const a = [x - sx, y], b = [x, y - sy], c = [x - sx, y - sy];
    if (!muro(...a) && !muro(...b) && !muro(...c) && !pasillo(...a) && !pasillo(...b)) return true;
  }
  return false;
}
function prepararAdornos() {
  const lista = PISO.lista.filter(a => a.img.complete && a.img.naturalWidth);
  for (const a of lista) {
    if (!a.spr) a.spr = spriteDesdeImagen(a.img, a.img.naturalWidth);
    if (a.reemplaza) SPRITES[a.reemplaza].w = a.spr;      // el adorno viejo del juego base usa el dibujo nuevo
  }
  return lista;
}
const adornoEn = (x, y, a) => ({ x, y, spr: a.spr, scale: a.escala, ramp: 0, glow: 0.3, n: PISO.lista.indexOf(a) });
function ponerEnElPiso(w, nivel) {
  w.adornos = []; w.solidos = new Set();
  const lista = prepararAdornos();
  if (!lista.length) return;
  const azar = (x, y, s) => { let h = Math.imul(x + 7, 83492791) ^ Math.imul(y + 11, 19349663) ^ Math.imul(nivel + s, 73856093); h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
  let total = zonaAlcanzable(w, -1);
  for (let y = 1; y < MH - 1; y++) for (let x = 1; x < MW - 1; x++) {
    const i = y * MW + x;
    if (w.map[i] !== 0 || !esquinaDeSala(w, x, y) || azar(x, y, 3) > PISO.densidad || Math.abs(x - w.start[0]) + Math.abs(y - w.start[1]) < 3) continue;
    if (w.ents.some(e => e.x === x && e.y === y) || w.adornos.some(p => Math.abs(p.x - x - 0.5) + Math.abs(p.y - y - 0.5) < PISO.separacion)) continue;
    if (zonaAlcanzable(w, i) !== total - 1) continue;
    const a = lista[Math.floor(azar(x, y, 4) * lista.length)];
    w.adornos.push(adornoEn(x + 0.5, y + 0.5, a));
    w.solidos.add(i); total--;
  }
}
const baseIsWall = isWall;
window.isWall = (x, y) => baseIsWall(x, y) || !!W_().solidos?.has(y * MW + x);

const baseRenderScene = renderScene;
window.renderScene = (w, v, sprites, h) => {
  const extra = [];
  for (const c of w.colgantes || []) { const spr = spriteTecho(c.n); if (spr) extra.push({ x: c.x, y: c.y, spr, scale: 1, ramp: 0, glow: 0.3 * flick }); }
  baseRenderScene(w, v, sprites.concat(extra, w.adornos || []), h);
};

// Temas grabados: conviven con la música por código y usan su misma entrada, setMusic
const TEMAS = {};
for (const [n, t] of Object.entries(D.mazmorra.musica)) TEMAS[n] = { ...t, datos: fetch(t.archivo).then(r => r.arrayBuffer()), audio: null };
async function iniciarTema(st) {
  const t = TEMAS[st.name];
  if (!t.audio) t.audio = await AC.decodeAudioData(await t.datos);
  if (MUSIC.cur !== st) return;              // cambió de música mientras se decodificaba
  const src = AC.createBufferSource();
  src.buffer = t.audio; src.loop = true; [src.loopStart, src.loopEnd] = t.bucle;
  src.connect(st.out); src.start();
  st.src = src;
  st.out.gain.setValueAtTime(0, AC.currentTime);
  st.out.gain.linearRampToValueAtTime(t.volumen, AC.currentTime + 0.25);
}
// Cada jefe puede tener su tema en mazmorra.json (jefe_1, jefe_2...); si no, usa el del juego base
const temaDeJefe = () => (TEMAS[`jefe_${S.floor}`] ? tr('jefe_{0}', S.floor) : S.floor === LAST_FLOOR ? 'final' : 'boss');
const baseSetMusic = setMusic, baseFadeOut = fadeOutTrack;
window.fadeOutTrack = st => { baseFadeOut(st); if (st.src) setTimeout(() => st.src.stop(), 2500); };
window.setMusic = name => {
  if (!TEMAS[name]) return baseSetMusic(name);
  if (!AC) { MUSIC.want = name; return; }
  if (MUSIC.cur && MUSIC.cur.name === name) return;
  if (MUSIC.cur) fadeOutTrack(MUSIC.cur);
  const out = AC.createGain(); out.gain.value = 0; out.connect(musicBus);
  MUSIC.cur = { name, out, timer: 0 };
  iniciarTema(MUSIC.cur);
};

// ---------- Título ----------
window.openLanguagePick = then => then();
window.openTitleMenu = () => {
  closeAllMenus(); runId++; C = null;
  for (const id of ['combat', 'inv', 'dialog', 'battle', 'xCharla']) $(id).classList.add('hidden');
  showScreen(null); setPalette('castle'); setMusic('intro');
  S.mode = 'title';
  const hay = hayPartida(), curso = leerExpedicion(), items = [];
  // con una expedición en marcha no se pasa por el Hogar: el grupo sigue abajo
  if (curso) items.push({ label: 'Continuar', sub: tr('Expedición en curso · piso {0} · {1}', ROMAN[curso.snap.floor], curso.grupo.filter(p => p.vida > 0).map(p => p.nombre).join(', ')), fn: continuarExpedicion });
  else if (hay) items.push({ label: 'Continuar', sub: tr('{0} de Ceniza · {1} en el plantel · {2} expedicion{3}', X.ceniza, X.plantel.length, X.corridas, X.corridas === 1 ? '' : 'es'), fn: abrirHogar });
  items.push({ label: 'Nueva partida', fn: () => (hay ? confirmMenu('¿Empezar de nuevo? Se borra todo el progreso.', nuevaPartida) : nuevaPartida()) });
  items.push({ label: 'Opciones', fn: openOptionsMenu });
  if (PRUEBA) items.push({ label: 'Peleas de prueba', sub: 'Va directo a una pelea. No se guarda nada.', fn: abrirPeleasDePrueba });
  if (/Electron/i.test(navigator.userAgent)) items.push({ label: 'Salir', fn: () => window.close() });
  openMenu({ back: false, cls: 'compact', items }, 'title');
};

const hayPartida = () => X.corridas > 0 || X.ceniza > 0 || !!X.memoria.introVista;
function nuevaPartida() {
  Object.assign(X, { ceniza: 0, caidos: [], corridas: 0, plantel: [], candidatos: [], leyendas: [], grimorio: [], mochila: [], sel: [], memoria: { hondo: 1, reveladas: [], ultimoCaido: null, habitante: null, finales: {} } });
  guardarX();
  borrarExpedicion();
  verIntro();
}

// Sólo en modo prueba: elegís una pelea y arranca, sin pasar por la expedición
function abrirPeleasDePrueba() {
  const nombre = ids => ids.map(id => D.enemigos[id].nombre).join(' + ');
  const items = [];
  for (const piso of [1, 2, 3]) {
    const jefes = D.mazmorra.jefes[piso];
    items.push({ label: tr('Jefe del piso {0}', piso), sub: nombre(jefes), fn: () => pelearDePrueba(jefes, piso, true) });
    for (const ids of D.mazmorra.grupos_por_piso[piso]) items.push({ label: tr('Piso {0} <small>· {1}</small>', piso, nombre(ids)), fn: () => pelearDePrueba(ids, piso, false) });
  }
  openMenu({ title: 'Peleas de prueba', cls: 'altar', items });
}

function pelearDePrueba(ids, piso, jefe) {
  prepararHogar();
  while (X.plantel.length < MAX_GRUPO) X.plantel.push(...NUCLEO.sortearCandidatos(D, azarX).slice(0, MAX_GRUPO - X.plantel.length));
  X.sel = X.plantel.slice(0, MAX_GRUPO);
  partir();
  $('xCharla').classList.add('hidden'); CH = null;      // sin los diálogos de la bajada
  S.floor = piso; S.mode = 'explore';
  const ent = { type: 'enemy', def: jefe ? ENEMIES[FLOOR_BOSS[piso]] : ENEMIES.rata, x: 1, y: 1, vx: 1.5, vy: 1.5, hp: 1 };
  W_().ents.push(ent);
  setMusic(jefe ? temaDeJefe() : 'pelea');
  iniciarTransicion(ent, ids, jefe ? 'jefe' : 'comun');
}

// La pausa de la expedición: lo demás del menú del juego base no corre acá
window.openPauseMenu = () => openMenu({ title: 'Pausa', items: [
  { label: 'Continuar', fn: closeMenu },
  { label: 'Opciones', fn: openOptionsMenu },
  { label: 'Guardar y salir', sub: 'La expedición sigue donde la dejaste.', fn: () => { closeAllMenus(); S.mode = 'explore'; guardarExpedicion(); openTitleMenu(); } },
] }, 'game');

// ---------- La introducción ----------
// Cada escena sale de un dibujo de interfaz/intro; los textos están en historia.json.
// La última es el Hogar mismo: al terminar, la fogata sigue ardiendo y el juego empieza ahí.
const ARTE_INTRO = {};
for (const n of ['velombra', 'escalera', 'rey_llama', 'rey_apagada', 'velombra_apagada', 'boca']) ARTE_INTRO[n] = Object.assign(new Image(), { src: tr('interfaz/intro/{0}.png', n) });
// El fuego del dibujo se mueve por filas: abajo queda quieto, sobre el cuenco, y arriba ondula más
const LLAMA = { x: 224, w: 74, arriba: 1, abajo: 112 };     // no llega a la mano ni a la cara del rey
const LLAMA_TEMPLO = { x: 298, w: 28, arriba: 78, abajo: 97 };
const LLAMA_ANTORCHA = { x: 293, w: 18, arriba: 109, abajo: 128 };
function ondular(c, img, t, fuerza, zona = LLAMA) {
  const { x, w, arriba, abajo } = zona, alto = abajo - arriba, paso = 0.25, f = fuerza * alto / 110, e = img.naturalWidth / 480;
  for (let y = arriba; y < abajo; y += paso) {
    const k = Math.pow((abajo - y) / alto, 1.3), r = (y - arriba) * 110 / alto;
    const d = (Math.sin(r * 0.11 - t * 6.5) * 2.6 + Math.sin(r * 0.27 - t * 10.5) * 1.1) * k * f;
    const sube = (Math.sin(t * 7.3) * 0.5 + 0.5) * 5 * k * f;
    c.drawImage(img, x * e, (y + sube) * e, w * e, paso * e, x + d, y, w, paso + 0.02);
  }
}

function dibujarReyLlama(c, t) {
  const k = snuffK(1);
  if (k > 0) {
    ondular(c, ARTE_INTRO.rey_llama, t, 1);
    const luz = 0.1 + Math.sin(t * 9) * 0.03 + Math.sin(t * 23) * 0.02;
    const g = c.createRadialGradient(242, 80, 8, 242, 80, 150);
    g.addColorStop(0, `rgba(255, 130, 40, ${luz})`); g.addColorStop(1, 'rgba(255, 130, 40, 0)');
    c.save(); c.globalCompositeOperation = 'lighter'; c.fillStyle = g; c.fillRect(0, 0, 480, 270); c.restore();
    c.fillStyle = '#ffb45a';
    for (let i = 0; i < 12; i++) {
      const f = (t * 0.45 + hash2(i, 3, 9)) % 1;
      c.globalAlpha = (1 - f) * k;
      c.fillRect(216 + hash2(i, 5, 2) * 52 + Math.sin(t * 3 + i) * 5, 104 - f * 100, 0.5, 0.5);
    }
    c.globalAlpha = 1;
  }
  if (k < 1) {
    c.globalAlpha = 1 - k;
    c.drawImage(ARTE_INTRO.rey_apagada, 0, 0, 480, 270);
    ondular(c, ARTE_INTRO.rey_apagada, t * 0.4, 0.8);
    c.globalAlpha = 1;
  }
}

const ESCENAS_INTRO = [
  { art: 'velombra', nitida: true, ramp: 'crypt', pan: [0, 0, 0, 0], sfx: 'fire', dibujar: (c, t) => ondular(c, ARTE_INTRO.velombra, t, 1, LLAMA_TEMPLO) },
  { art: 'escalera', nitida: true, ramp: 'crypt', pan: [0, 0, 0, 0], sfx: 'stairs', dibujar: (c, t) => ondular(c, ARTE_INTRO.escalera, t, 1, LLAMA_ANTORCHA) },
  { art: 'rey_llama', nitida: true, ramp: 'crypt', pan: [0, 0, 0, 0], sfx: 'fire', dibujar: dibujarReyLlama },
  { art: 'velombra_apagada', nitida: true, ramp: 'crypt', pan: [0, 0, 0, 0] },
  { art: 'boca', nitida: true, ramp: 'crypt', pan: [0, 0, 0, 0], sfx: 'whisper', dibujar: (c, t) => {
    const k = IMG_CARAS.sombra;
    if (!k.img.naturalWidth) return;
    const cara = k.fina || (k.fina = spriteCanvas(spriteDesdeImagen(k.img, k.img.naturalWidth), k.img.naturalWidth, 'crypt', 1));
    c.globalAlpha = clamp((t - 1.5) / 3, 0, 1) * (0.85 + Math.sin(t * 1.3) * 0.15);
    c.drawImage(cara, 240 - CARA.lado / 2, 28, CARA.lado, CARA.lado); c.globalAlpha = 1;
  } },
  { art: 'hogar', ramp: 'crypt', pan: [0, 0, 0, 0], sfx: 'oil', sinFundido: true, dibujar: c => dibujarHogar(c) },
];

function verIntro() {
  closeAllMenus();
  prepararHogar();
  if (!CINE.art) CINE.art = buildCineArt();
  Object.assign(CINE.art, ARTE_INTRO, { hogar: document.createElement('canvas') });
  const escenas = ESCENAS_INTRO.map((e, i) => ({ ...e, lines: D.historia.intro[i] }));
  playCine(escenas, () => { X.memoria.introVista = true; guardarX(); abrirHogar(); }, null, 'historia');
}

// ---------- El Hogar ----------
// El último fuego de Vel'Ombra: acá se contrata, se arma el grupo y se baja a la cripta.
const REGLAS_HOGAR = D.mazmorra.hogar, MAX_GRUPO = D.mazmorra.tamano_grupo;
const HOGAR = { img: Object.assign(new Image(), { src: 'interfaz/hogar/hogar.png' }), fuego: { x: 240, y: 208 }, hueco: { cx: 239, cy: 207, rx: 37, ry: 10 }, c: null };
function fondoHogar() {
  if (!HOGAR.c && HOGAR.img.complete && HOGAR.img.naturalWidth) {
    const spr = spriteDesdeImagen(HOGAR.img, 480), { x: fx, y: fy } = HOGAR.fuego;
    // la luz sale de la fogata y se pierde hacia los bordes
    for (let y = 0; y < 270; y++) for (let x = 0; x < 480; x++) {
      const d = Math.hypot((x - fx) / 1.5, y - fy);
      spr.lum[y * 480 + x] *= 0.3 + 1.1 * Math.pow(Math.max(0, 1 - d / 190), 1.3);
    }
    HOGAR.c = [spriteCanvas(spr, 480, 'crypt', 0.92), spriteCanvas(spr, 480, 'crypt', 1.12)];
  }
  return HOGAR.c;
}
// Fuego simulado: el calor nace en un hueco, sube promediándose y se enfría según un ruido que trepa.
// El promedio y el ruido parejo dan formas limpias, de bandas y lenguas, como el resto del arte del juego.
function crearFuego(w, h, tope, ancho) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d'), img = g.createImageData(w, h), ruido = new Float32Array(w * h * 2);
  for (let y = 0; y < h * 2; y++) for (let x = 0; x < w; x++) ruido[y * w + x] = vnoise(x * 0.11, y * 0.09, 6) * 0.7 + vnoise(x * 0.27, y * 0.2, 8) * 0.3;
  return { w, h, tope, ancho, c, g, img, ruido, out: new Uint32Array(img.data.buffer), calor: new Float32Array(w * h), nuevo: new Float32Array(w * h), t: 0, ultimo: -1 };
}
const FOGATA = crearFuego(96, 116, 100, 36);
function avanzarFuego(f) {
  const { w, h, tope, ancho, ruido } = f, ca = f.calor, nu = f.nuevo;
  f.t += 1 / 30;
  const sube = Math.floor(f.t * 55) % (h * 2);
  for (let k = 1; k <= 2; k++) for (let x = 0; x < w; x++) {
    const d = Math.abs(x - w / 2) / ancho, borde = Math.max(0, 1 - d * d);
    ca[(h - k) * w + x] = tope * borde * (0.72 + 0.28 * vnoise(x * 0.08, f.t * 1.4, 4));
  }
  for (let y = 0; y < h - 2; y++) for (let x = 1; x < w - 1; x++) {
    const a = y + 1, v = (ca[a * w + x - 1] + ca[a * w + x] * 2 + ca[a * w + x + 1] + ca[(y + 2) * w + x]) / 5;
    const frio = ruido[((y + sube) % (h * 2)) * w + x];
    // cerca del tope del lienzo se apaga del todo, para que ninguna lengua llegue a cortarse
    const techo = y < 36 ? 0.8 + 0.2 * (y / 36) : 1;
    nu[y * w + x] = Math.max(0, v * techo - (0.25 + frio * frio * 4.2));
  }
  for (let i = 0; i < w * (h - 2); i++) ca[i] = nu[i];
}
function dibujarFuego(c, f, x, y) {
  const paso = Math.floor(T * 30);
  if (paso !== f.ultimo) {
    f.ultimo = paso; avanzarFuego(f);
    if (!f.pal) f.pal = packRamp(RAMPS.fuegoX);
    const { w, h, tope, calor, out, pal } = f, n = pal.length - 1;
    for (let py = 0; py < h; py++) for (let px = 0; px < w; px++) {
      const t = calor[py * w + px] / (tope * 0.55) * n + (BAYER[((py & 3) << 2) | (px & 3)] - 0.5) * 0.55;
      out[py * w + px] = t < 0.55 ? 0 : pal[clamp(Math.round(t), 1, n)];
    }
    f.g.putImageData(f.img, 0, 0);
  }
  c.drawImage(f.c, x - f.w / 2, y - f.h);
}

function dibujarHogar(c) {
  const f = fondoHogar(), { x, y } = HOGAR.fuego;
  const pintar = () => {
    if (!f) return;
    c.drawImage(f[0], 0, 0, 480, 270, 0, 0, 480, 270);
    c.globalAlpha = 0.5 + 0.35 * Math.sin(T * 7) * Math.sin(T * 2.3);
    c.drawImage(f[1], 0, 0, 480, 270, 0, 0, 480, 270);
    c.globalAlpha = 1;
  };
  c.fillStyle = '#000'; c.fillRect(0, 0, 480, 270);
  pintar();
  const { cx, cy, rx, ry } = HOGAR.hueco;
  dibujarFuego(c, FOGATA, cx, cy + ry + 2);
  // el borde de piedra de adelante tapa la base del fuego, que queda adentro del hueco
  c.save(); c.beginPath(); c.moveTo(cx - rx - 20, cy); c.lineTo(cx - rx, cy);
  c.ellipse(cx, cy, rx, ry, 0, Math.PI, 0, true);
  c.lineTo(cx + rx + 20, cy); c.lineTo(cx + rx + 20, cy + 30); c.lineTo(cx - rx - 20, cy + 30); c.closePath(); c.clip();
  pintar();
  c.restore();
  for (let n = 0; n < 7; n++) {
    const u = (T * (0.3 + n * 0.05) + n * 0.31) % 1;
    c.fillStyle = RAMPS.fuegoX[n % 2 ? 4 : 5];
    c.fillRect(x + Math.round(Math.sin(u * 6 + n) * 12), y - 30 - Math.round(u * 90), 1, 1);
  }
  // el grupo que va a bajar (en la intro todavía no hay grupo)
  if (S.mode !== 'cine') for (let i = 0; i < MAX_GRUPO; i++) {
    const p = X.sel[i], px = 250 + i * 54, py = 226;
    c.fillStyle = '#000'; c.fillRect(px - 1, py - 1, 40, 40);
    c.fillStyle = p ? RAMPS.crypt[5] : RAMPS.crypt[2]; c.fillRect(px - 1, py - 1, 40, 1); c.fillRect(px - 1, py + 38, 40, 1); c.fillRect(px - 1, py - 1, 1, 40); c.fillRect(px + 38, py - 1, 1, 40);
    if (p) capaNitida().drawImage(retratoX(p.modelo, LADO_RETRATO, 'crypt'), px, py, 38, 38);
  }
}

function recambiarCandidatos() { X.candidatos = [...NUCLEO.sortearCaidos(D, X.caidos, azarX), ...NUCLEO.sortearCandidatos(D, azarX)]; }
function prepararHogar() {
  if (!X.corridas && !X.plantel.length) X.plantel = NUCLEO.sortearCandidatos(D, azarX).filter((p, i, l) => l.findIndex(q => q.clase === p.clase) === i).slice(0, REGLAS_HOGAR.plantel_inicial);
  if (!X.candidatos.length) recambiarCandidatos();
  X.sel = X.sel.filter(p => X.plantel.includes(p));
  guardarX();
}
// Mientras el plantel no alcance para bajar de a dos, los reclutas son gratis: la partida nunca queda trabada
const costoRecluta = p => (p.condicion ? p.condicion.ceniza || 0 : X.plantel.length < REGLAS_HOGAR.plantel_gratis ? 0 : REGLAS_HOGAR.costo_recluta);
const fichaDe = p => `<img class="xr" src="${retratoX(p.modelo, LADO_RETRATO, 'crypt').toDataURL()}" alt="">`;
const datosDe = p => tr('{0} <small>· {1} nv {2}, {3}{4}{5}</small>', p.nombre, D.clases[p.clase].nombre, p.nivel, D.modelos[p.modelo].titulo, p.caido ? ' · caído' : '', p.marcado ? ' · marcado' : '');
const detalleDe = p => tr('{0} {1}. Vida {2} · Ataque {3} · Velocidad {4}. {5}.', D.historia.modelos[p.modelo].motivo, D.modelos[p.modelo].rasgo, p.vidaMax, p.ataque, p.velocidad, D.clases[p.clase].rol);

function abrirHogar() {
  closeAllMenus();
  S.mode = 'title'; setPalette('crypt');
  prepararHogar();
  const m = { title: 'El Hogar', cls: 'altar hogar', back: false, items: [] };
  m.refresh = () => {
    m.text = `Ceniza: <b>${X.ceniza}</b>`;
    const n = X.sel.length;
    m.items = [
      { label: 'Descender ✠', sub: n ? tr('Bajan {0}. Una sola antorcha para todos.', n) : 'Elegí al menos un portador.', off: !n, fn: partir },
      { label: tr('El grupo <small>· {0} de {1}</small>', n, MAX_GRUPO), sub: 'Quiénes bajan en esta expedición.', fn: () => abrirGrupo(m) },
      { label: 'Reclutar', sub: tr('{0} de {1} en el plantel.', X.plantel.length, REGLAS_HOGAR.plantel_max), fn: () => abrirReclutas(m) },
      { label: 'Los caídos', sub: 'Quienes quedaron en la cripta.', off: !X.caidos.length, fn: () => abrirLista('Los caídos', X.caidos, c => tr('Cayó en el nivel {0}. Puede volver a aparecer entre los reclutas.', c.cayo)) },
      { label: 'Las leyendas', sub: 'Quienes volvieron con la Llama.', off: !X.leyendas.length, fn: () => abrirLista('Las leyendas', X.leyendas, c => tr('Sobrevivió a la expedición {0}.', c.corrida)) },
      { label: 'Personajes', sub: 'Atributos, equipo y habilidades.', off: !X.plantel.length, fn: () => abrirPersonajes(X.plantel, true) },
      { label: 'Grimorio', sub: tr('{0} habilidades desbloqueadas.', X.grimorio.length), fn: abrirGrimorio },
      { label: 'La historia', sub: 'Lo que pasó con la Llama.', fn: verIntro },
      { label: 'Volver al título', fn: openTitleMenu },
    ];
  };
  m.refresh();
  openMenu(m, 'hogar');
}

function abrirGrupo(hogar) {
  const m = { title: 'El grupo', cls: 'altar hogar', items: [], onClose: hogar.refresh };
  m.refresh = () => {
    m.text = tr('Elegí hasta {0}: {1} de {0}.', MAX_GRUPO, X.sel.length);
    m.items = X.plantel.map(p => {
      // la primera expedición baja sin clases repetidas
      const on = X.sel.includes(p), repetida = !on && !X.corridas && X.sel.some(q => q.clase === p.clase);
      return { label: `${fichaDe(p)}${on ? '◆' : '◇'} ${datosDe(p)}`, sub: repetida ? tr('En la primera expedición no se repite la clase.') : detalleDe(p), off: repetida || (!on && X.sel.length >= MAX_GRUPO),
        fn: () => { if (on) X.sel.splice(X.sel.indexOf(p), 1); else X.sel.push(p); m.refresh(); renderMenu(); } };
    });
    if (!m.items.length) m.items.push({ label: 'No hay nadie en el plantel', sub: 'Reclutá a alguien primero.', off: true, fn: () => {} });
  };
  m.refresh();
  openMenu(m);
}

function abrirReclutas(hogar) {
  const m = { title: 'Reclutar', cls: 'altar hogar', items: [], onClose: hogar.refresh };
  m.refresh = () => {
    m.text = `Ceniza: <b>${X.ceniza}</b>`;
    m.items = X.candidatos.map(p => {
      const costo = costoRecluta(p), lleno = X.plantel.length >= REGLAS_HOGAR.plantel_max;
      return { label: `${fichaDe(p)}${datosDe(p)} <small>· ${costo ? `${costo} de Ceniza` : 'gratis'}</small>`, sub: p.condicion ? p.condicion.texto : detalleDe(p), off: costo > X.ceniza || lleno,
        fn: () => { contratar(p, costo); m.sel = 0; m.refresh(); renderMenu(); } };
    });
    if (!m.items.length) m.items.push({ label: 'No queda nadie', sub: 'Vendrán más después de la próxima expedición.', off: true, fn: () => {} });
  };
  m.refresh();
  openMenu(m);
}

function contratar(p, costo) {
  if (p.caido) {
    NUCLEO.aplicarCondicion(p);
    X.caidos = X.caidos.filter(c => c.id !== p.id);
    delete p.caido; delete p.condicion;
  }
  X.ceniza -= costo;
  X.candidatos.splice(X.candidatos.indexOf(p), 1);
  X.plantel.push(p);
  guardarX(); sfx('level');
}

function abrirLista(titulo, lista, nota) {
  openMenu({ title: titulo, cls: 'altar hogar', items: lista.map(c => ({ label: tr('{0} <small>· {1}, {2}</small>', c.nombre, D.clases[c.clase].nombre, D.modelos[c.modelo].titulo), sub: nota(c), fn: () => {} })) });
}

function partir() {
  X.grupo = X.sel.slice(); X.sel = []; X.perdidos = [];
  for (const p of X.grupo) { p.vida = p.vidaMax; delete p.cayo; }
  X.corridas++; X.ganada = 0; guardarX();
  const l = X.grupo[0];
  closeAllMenus();
  CR.cls = D.clases[l.clase].arte; CR.race = D.modelos[l.modelo].raza; CR.name = l.nombre;
  EXP.mods = []; EXP.seed = null; EXP.daily = null;
  // el diálogo de bienvenida del juego base no corre acá
  const dialogoBase = window.showDialog;
  window.showDialog = () => {};
  newGame();
  window.showDialog = dialogoBase;
  S.flags.lowFuel = 1;   // el aviso de antorcha baja del base le habla a un solo héroe
  P.potions = D.mazmorra.pociones_iniciales + X.grupo.filter(p => D.modelos[p.modelo].bonos.pociones).length;
  logLines.length = 0;
  log('El grupo baja con una sola antorcha.', 'em');
  updateHUD();
  const recuerdo = [], M = X.memoria;
  if (M.ultimoCaido) recuerdo.push({ quien: 'sombra', caras: ['risa'], lineas: [D.historia.modelos[M.ultimoCaido.modelo].muerte.replace('{nombre}', M.ultimoCaido.nombre)] });
  const marcado = X.grupo.find(p => p.marcado);
  if (marcado) recuerdo.push(conNombre('marcado', marcado.nombre));
  if (M.habitante) recuerdo.push(conNombre('habitante_nuevo', M.habitante));
  M.ultimoCaido = null; guardarX(); guardarExpedicion();
  encadenar([X.grupo.length === MAX_GRUPO ? 'inicio' : 'inicio_pocos', ...recuerdo, dichoDeAlguien('baja')]);
}

// ---------- Continuar ----------
// La expedición en marcha va en su propio archivo. Se guarda explorando, nunca en medio de una pelea:
// quien cierra el juego peleando vuelve a justo antes de empezarla.
const CLAVE_CURSO = 'expedicion.curso';
function leerExpedicion() {
  try { return JSON.parse(STORE.get(CLAVE_CURSO) || 'null'); } catch (e) { return null; }
}
const borrarExpedicion = () => STORE.remove(CLAVE_CURSO);
function guardarExpedicion() {
  if (S.mode !== 'explore' || Bt || !S.world || !NUCLEO.vivos(X.grupo).length) return;
  guardarX();
  const w = W_();
  STORE.set(CLAVE_CURSO, JSON.stringify({ snap: snapshot(), grupo: X.grupo, adornos: (w.adornos || []).map(({ x, y, n }) => ({ x, y, n })) }));
}
window.autosave = guardarExpedicion;
addEventListener('beforeunload', guardarExpedicion);

function continuarExpedicion() {
  const d = leerExpedicion();
  // quien ya no está en el plantel murió después de este guardado: cerrar el juego no lo revive
  X.grupo = d.grupo.map(g => {
    const q = X.plantel.find(p => p.id === g.id);
    return q ? Object.assign(q, g) : { ...g, vida: 0, cayo: g.cayo || d.snap.level };
  });
  X.perdidos = X.grupo.filter(p => p.vida <= 0); X.sel = []; X.ganada = 0;
  closeAllMenus();
  if (!NUCLEO.vivos(X.grupo).length) { borrarExpedicion(); recambiarCandidatos(); guardarX(); return abrirHogar(); }
  audioInit(); sfx('stairs');
  aplicarTexturas();
  restore(d.snap);
  const w = W_(), lista = prepararAdornos();
  prepararMuros(w);
  colgarDelTecho(w, S.level);
  w.adornos = d.adornos.filter(a => lista.includes(PISO.lista[a.n])).map(a => adornoEn(a.x, a.y, PISO.lista[a.n]));
  w.solidos = new Set(w.adornos.map(a => Math.floor(a.y) * MW + Math.floor(a.x)));
  log('El grupo sigue adelante.', 'em');
  updateHUD();
}

// ---------- Mazmorra (la del juego base) ----------
window.enterLevel = (floor, level) => {
  // cada piso son dos niveles y la guarida, con un santuario entre piso y piso
  if (level > 0 && !D.mazmorra.niveles.includes(level)) level = D.mazmorra.niveles.find(n => n > level);
  aplicarTexturas();
  baseX.enterLevel(floor, level);
  const w = W_();
  w.ents = w.ents.filter(e => !['event', 'reliquary', 'merchant'].includes(e.type));
  decorarMuros(w, level);
  colgarDelTecho(w, level);
  ponerEnElPiso(w, level);
  if (floor === 1 && level === 3) {
    const q = w.ents.find(e => e.type === 'prop');
    if (q) Object.assign(q, { type: 'event', ev: 'peregrino', done: false, rescate: true });
  }
  w.ents = w.ents.filter(e => e.type !== 'prop' || esquinaDeSala(w, e.x, e.y));     // los adornos del juego base tampoco van en el camino
  ponerEventos(w, level);
};

window.openEvent = e => {
  if (D.eventos[e.ev]) return abrirEvento(e);
  // el portador se va del mapa, se quede o no con el grupo
  W_().ents.splice(W_().ents.indexOf(e), 1);
  charla('rescate');
};

// ---------- Eventos ----------
// Están en datos/eventos.json. Cada expedición cruza cada uno una sola vez, en una esquina de sala que no tape el paso.
for (const [id, ev] of Object.entries(D.eventos)) {
  ev.img = Object.assign(new Image(), { src: `interfaz/eventos/${id}.png` });
  ev.imgMapa = Object.assign(new Image(), { src: `interfaz/${ev.mapa}.png` });
  EVENTS[id] = { spr: `ev_${id}`, sprDone: `ev_${id}`, scale: ev.escala, glow: 0.4, doneText: '', title: '', text: '', choices: [] };
}
function prepararEventos() {
  for (const [id, ev] of Object.entries(D.eventos)) {
    if (!SPRITES[`ev_${id}`] && ev.imgMapa.complete && ev.imgMapa.naturalWidth) SPRITES[`ev_${id}`] = { w: spriteDesdeImagen(ev.imgMapa, ev.imgMapa.naturalWidth) };
  }
}
function ponerEventos(w, nivel) {
  const R = D.mazmorra.eventos;
  if (nivel === 0 || isBossLevel() || !R.pisos.includes(S.floor)) return;
  const vistos = S.flags.eventos || (S.flags.eventos = []), pendientes = Object.keys(D.eventos).filter(id => !vistos.includes(id) && SPRITES[`ev_${id}`]).sort(() => azarX() - 0.5), libres = [];
  for (let y = 1; y < MH - 1; y++) for (let x = 1; x < MW - 1; x++) {
    if (w.map[y * MW + x] === 0 && esquinaDeSala(w, x, y) && !w.solidos?.has(y * MW + x) && !w.ents.some(e => e.x === x && e.y === y) && Math.abs(x - w.start[0]) + Math.abs(y - w.start[1]) >= 6) libres.push([x, y]);
  }
  libres.sort(() => azarX() - 0.5);
  for (const id of pendientes.slice(0, R.por_nivel)) {
    const lugar = libres.pop();
    if (!lugar) return;
    const [x, y] = lugar;
    w.ents.push({ type: 'event', ev: id, done: false, x, y, vx: x + 0.5, vy: y + 0.5 });
    vistos.push(id);
  }
}

// La ilustración pasa por la paleta del piso, como todo lo demás
function ilustracion(ev) {
  if (ev.fondo && ev.fondo.env === S.env) return ev.fondo.url;
  const lado = document.createElement('canvas'); lado.width = lado.height = 480;
  lado.getContext('2d').drawImage(ev.img, 0, 0, 480, 270);
  const c = document.createElement('canvas'); c.width = 480; c.height = 270;
  c.getContext('2d').drawImage(spriteCanvas(spriteDesdeImagen(lado, 480), 480, S.env, 1.1), 0, 0);
  ev.fondo = { env: S.env, url: c.toDataURL() };
  return ev.fondo.url;
}

let EV = null;
const opcionesEvento = ev => ev.opciones.map(o => {
  const falta = Object.entries(o.requisito || {}).find(([a, v]) => !NUCLEO.vivos(X.grupo).some(p => NUCLEO.atributosDe(D, p)[a] >= v));
  return { ...o, off: !!falta, nota: Object.entries(o.requisito || {}).map(([a, v]) => `${D.mazmorra.atributos.nombres[a]} ${v}`).join(', ') };
});
function abrirEvento(e) {
  EV = { e, ev: D.eventos[e.ev], sel: 0, res: null };
  EV.ops = opcionesEvento(EV.ev);
  S.mode = 'xevento'; sfx('whisper');
  $('evento').classList.remove('hidden');
  pintarEvento();
}
function pintarEvento() {
  const { ev, ops, sel, res } = EV;
  const cuerpo = res
    ? `<div class="etxt">${tr(res.texto)}</div>${EV.lineas.map(l => `<div class="eres">${l}</div>`).join('')}<div class="esig">Enter</div>`
    : `<div class="etxt">${tr(ev.texto)}</div>${ops.map((o, i) => `<div class="eop${i === sel ? ' sel' : ''}${o.off ? ' off' : ''}">${tr(o.texto)}${o.nota ? ` <small>· ${tr('Requiere {0}', o.nota)}</small>` : o.sub ? ` <small>· ${tr(o.sub)}</small>` : ''}</div>`).join('')}`;
  $('evento').innerHTML = `<img src="${ilustracion(ev)}" alt=""><div class="ecaja"><div class="etit">${tr(ev.titulo)}</div>${cuerpo}</div>`;
}
function eventoAction(act) {
  if (EV.res) { if (act === 'ok') { sfx('select'); cerrarEvento(); } return; }
  const n = EV.ops.length;
  if (act === 'fwd' || act === 'back') { EV.sel = (EV.sel + (act === 'fwd' ? n - 1 : 1)) % n; sfx('select'); pintarEvento(); return; }
  if (act !== 'ok') return;
  const o = EV.ops[EV.sel];
  if (o.off) { sfx('bump'); return; }
  sfx('select');
  EV.res = o.prob === undefined || azarX() < o.prob ? o.exito : o.fallo;
  EV.lineas = EV.res.efectos.map(aplicarEfectoEvento).filter(Boolean);
  guardarX(); updateHUD(); pintarEvento();
}
const masSano = () => NUCLEO.vivos(X.grupo).sort((a, b) => b.vida - a.vida)[0];
function aplicarEfectoEvento({ tipo, valor }) {
  const heridos = lista => lista.map(p => { const d = Math.round(p.vidaMax * valor); p.vida = Math.max(1, p.vida - d); return tr('{0} pierde {1} de vida.', p.nombre, d); }).join(' ');
  if (tipo === 'sangre') return heridos([masSano()]);       // no mata: el precio es quedar débil para la próxima
  if (tipo === 'dolor') return heridos(NUCLEO.vivos(X.grupo));
  if (tipo === 'cura') { for (const p of NUCLEO.vivos(X.grupo)) p.vida = Math.min(p.vidaMax, p.vida + Math.round(p.vidaMax * valor)); sfx('heal'); return tr('El grupo recupera vida.'); }
  if (tipo === 'objeto') { const l = Object.keys(D.objetos), id = l[Math.floor(azarX() * l.length)]; X.mochila.push(id); return tr('Encuentras {0}.', D.objetos[id].nombre); }
  if (tipo === 'ceniza') { X.ceniza += valor; return tr('+{0} de Ceniza.', valor); }
  if (tipo === 'antorcha') { P.fuel = clamp(P.fuel + valor, 0, 100); return tr(valor > 0 ? 'La antorcha gana {0}.' : 'La antorcha pierde {0}.', Math.abs(valor)); }
  if (tipo === 'impetu') { S.flags.impetu = (S.flags.impetu || 0) + valor; return tr('El grupo empieza la próxima pelea con +{0} de Ímpetu.', valor); }
  if (tipo === 'cofre') { window.openChest({ open: false }); return tr('Lo que había adentro ya es del grupo.'); }
  if (tipo === 'trato') { S.flags.trato = 1; return ''; }
  return '';     // la emboscada arranca al cerrar el evento
}
function cerrarEvento() {
  const { e, res } = EV, ents = W_().ents;
  EV = null;
  $('evento').classList.add('hidden');
  S.mode = 'explore';
  if (res.efectos.some(f => f.tipo === 'emboscada')) {
    // lo que estaba ahí pasa a ser el enemigo: al ganar se lo saca del mapa como a cualquier otro
    Object.assign(e, { type: 'enemy', kind: 'rata', def: ENEMIES.rata, hp: 1, maxhp: 1, aware: true, stun: 0 });
    return startCombat(e, true);
  }
  ents.splice(ents.indexOf(e), 1);
  guardarExpedicion();
}

window.openChest = c => {
  if (c.open) { log('El cofre está vacío.'); sfx('bump'); return; }
  c.open = true; sfx('chest');
  const r = azarX(), lista = sinDesbloquear('cofre'), objetos = Object.keys(D.objetos);
  if (lista.length && azarX() < D.mazmorra.botin.habilidad) {
    const id = lista[Math.floor(azarX() * lista.length)];
    desbloquear(id); sfx('level'); log(tr('Un pergamino: {0} queda en el Grimorio.', D.habilidades[id].nombre), 'em');
  } else if (azarX() < D.mazmorra.botin.objeto) {
    const id = objetos[Math.floor(azarX() * objetos.length)];
    X.mochila.push(id); guardarX(); log(tr('Encuentras {0}.', D.objetos[id].nombre), 'good');
  } else if (r < 0.35 && P.potions < BAL.maxPotions) { P.potions++; log('Encuentras una poción de sangre.', 'good'); }
  else if (r < 0.65 && P.oil < BAL.maxOil) { P.oil++; log('Encuentras un frasco de aceite.', 'good'); }
  else { X.ceniza += 3; log('Ceniza tibia en el fondo del cofre (+3).', 'good'); }
  updateHUD();
};

window.usePotion = () => {
  if (!P.potions) { log('No te quedan pociones.'); return; }
  const t = NUCLEO.vivos(X.grupo).sort((a, b) => a.vida / a.vidaMax - b.vida / b.vidaMax)[0];
  P.potions--; const v = Math.round(t.vidaMax * 0.4); t.vida = Math.min(t.vidaMax, t.vida + v);
  sfx('heal'); log(tr('{0} recupera {1} de vida.', t.nombre, v), 'good'); updateHUD();
};

// El inventario del base no aplica: se muestra el grupo
// La oscuridad le pega a todo el grupo, no al P del juego base
const ANTORCHA_BASE = BAL.fuelPerStep * 0.6;     // los mapas son más grandes: la antorcha rinde más pasos
const porGrupo = lista => D.mazmorra.grupo[lista][Math.max(1, Math.min(NUCLEO.vivos(X.grupo).length, 4)) - 1];
window.afterStep = () => {
  P.hp = P.maxhp;
  BAL.fuelPerStep = ANTORCHA_BASE * porGrupo('antorcha');     // cada chispa vive de la misma luz
  baseX.afterStep();
  if (P.fuel === 0 && S.steps % 3 === 0 && S.mode === 'explore') {
    for (const u of NUCLEO.vivos(X.grupo)) u.vida--;
    registrarCaidos();
    if (!NUCLEO.vivos(X.grupo).length) finExpedicion(false);
  }
  updateHUD();
};

// Exploración a pantalla completa: sin panel; mapa, zona y objetos
const CASILLEROS = {};
for (const n of ['pocion', 'aceite', 'antorcha']) CASILLEROS[n] = { img: Object.assign(new Image(), { src: tr('interfaz/hud/casillero_{0}.png', n) }), c: {} };
function casilleroX(n) {
  const k = CASILLEROS[n];
  if (!k.c[S.env] && k.img.complete && k.img.naturalWidth) k.c[S.env] = spriteCanvas(spriteDesdeImagen(k.img, k.img.naturalWidth), k.img.naturalWidth, S.env, 1).toDataURL();
  return k.c[S.env] || k.img.src;
}

window.updateHUD = () => {
  baseX.updateHUD();
  const heridos = NUCLEO.vivos(X.grupo).filter(p => p.vida < p.vidaMax * 0.3).length;
  const objeto = (img, nombre, n) => HUD_X.objetos === 'texto'
    ? `<div class="obj">${nombre} <b>${n}</b></div>`
    : `<div class="obj"><i style="background-image:url(${casilleroX(img)})"></i><b>${n}</b></div>`;
  const i = D.mazmorra.niveles.indexOf(S.level), total = D.mazmorra.niveles.length;
  const nivel = !S.level ? '<small>Santuario</small>' : { hondo: tr('<small>{0}</small>', i === total - 1 ? 'La guarida' : ['Primer', 'Segundo'][i] + ' descenso'), romano: ` · ${['I', 'II', 'III'][i]}`,
    rombos: tr('<small>{0}{1}</small>', '◆'.repeat(i + 1), '◇'.repeat(total - i - 1)) }[HUD_X.nivel];
  $('xEsq').innerHTML = `<div class="zona">${D.mazmorra.pisos[S.floor - 1].nombre}${nivel}</div>` +
    `<div class="fila ${HUD_X.objetos}">${objeto('pocion', 'Pociones', P.potions)}${objeto('aceite', 'Aceite', P.oil)}${objeto('antorcha', 'Antorcha', Math.ceil(P.fuel))}</div>` +
    (heridos ? `<div class="alerta">${heridos} en peligro · ${glyph('inv')}</div>` : '');
};

// Opciones a prueba: F8 cambia los objetos y F9 cómo se nombra el nivel
const HUD_X = { objetos: 'sueltos', nivel: 'hondo' };
try { Object.assign(HUD_X, JSON.parse(localStorage.getItem('expedicion.hud'))); } catch (e) { /* sin almacenamiento */ }
window.addEventListener('keydown', ev => {
  const lista = { F8: ['objetos', ['sueltos', 'cinto', 'texto']], F9: ['nivel', ['hondo', 'romano', 'rombos']] }[ev.code];
  if (!lista || S.mode !== 'explore') return;
  ev.preventDefault();
  const [campo, ops] = lista;
  HUD_X[campo] = ops[(ops.indexOf(HUD_X[campo]) + 1) % ops.length];
  try { localStorage.setItem('expedicion.hud', JSON.stringify(HUD_X)); } catch (e) { /* sin almacenamiento */ }
  updateHUD();
});

// El panel del juego base no se dibuja: sus barras quedan sin efecto y el mapa va arriba a la derecha
window.drawBar = () => {};
const MAPA = { x: 386, y: 9, cs: 2 };
window.drawMinimap = (c, R, w, p) => {
  const { x: ox, y: oy, cs } = MAPA, { map, explored, ents } = w;
  // lo recorrido brilla y lo cercano se insinúa: 3 pisado, 2 y 1 piso a uno o dos pasos, 9 muro que lo bordea
  const luz = new Uint8Array(MW * MH), pasos = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  const vecinos = (x, y, fn) => { for (const [ax, ay] of pasos) { const nx = x + ax, ny = y + ay; if (nx >= 0 && ny >= 0 && nx < MW && ny < MH) fn(ny * MW + nx); } };
  for (let i = 0; i < luz.length; i++) if (explored[i] && map[i] !== 1) luz[i] = 3;
  for (const n of [3, 2]) for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) if (luz[y * MW + x] === n) vecinos(x, y, i => { if (!luz[i] && map[i] !== 1) luz[i] = n - 1; });
  for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) if (luz[y * MW + x] && luz[y * MW + x] !== 9) vecinos(x, y, i => { if (map[i] === 1) luz[i] = 9; });
  c.fillStyle = R[0];
  for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) if (luz[y * MW + x]) c.fillRect(ox + x * cs - 1, oy + y * cs - 1, cs + 2, cs + 2);
  for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) {
    const i = y * MW + x, l = luz[i];
    if (!l) continue;
    c.fillStyle = l === 3 ? (map[i] === 2 ? R[5] : R[3]) : l === 2 ? R[2] : l === 1 ? ((x + y) & 1 ? R[2] : R[1]) : R[1];
    c.fillRect(ox + x * cs, oy + y * cs, cs, cs);
  }
  for (const e of ents) if (explored[e.y * MW + e.x] && ((e.type === 'chest' && !e.open) || (e.type === 'event' && !e.done))) {
    c.fillStyle = e.type === 'chest' ? R[4] : R[5]; c.fillRect(ox + e.x * cs, oy + e.y * cs, cs, cs);
  }
  // el jugador, como una flecha que marca hacia dónde mira
  const [dx, dy] = DIRS[p.dir], cx = ox + p.x * cs + 1.5, cy = oy + p.y * cs + 1.5;
  c.fillStyle = MARCO.luz; c.beginPath();
  c.moveTo(cx + dx * 4.5, cy + dy * 4.5); c.lineTo(cx - dx * 3 - dy * 3.5, cy - dy * 3 + dx * 3.5); c.lineTo(cx - dx * 3 + dy * 3.5, cy - dy * 3 - dx * 3.5);
  c.closePath(); c.fill();
};

// La mano con la antorcha: el dibujo pasa por la paleta del piso y se apaga junto con el combustible;
// el fuego es la llama animada del juego, que crece o baja con lo que queda.
window.renderTorch = () => {};
const MANO = { img: Object.assign(new Image(), { src: 'interfaz/hud/mano_antorcha.png' }), x: 326, y: 152, lado: 136, cache: {} };
RAMPS.fuegoX = ['#3a0d06', '#7c1f0a', '#c9440c', '#ee7d1a', '#fab634', '#ffeeb0'];
function manoIluminada(nivel) {
  const clave = S.env + nivel;
  if (!MANO.cache[clave]) MANO.cache[clave] = spriteCanvas(spriteDesdeImagen(MANO.img, MANO.lado), MANO.lado, S.env, 0.5 + nivel * 0.15);
  return MANO.cache[clave];
}
function dibujarAntorcha(c) {
  if (!MANO.img.complete || !MANO.img.naturalWidth) return;
  const paso = anim && !anim.bump ? Math.sin(clamp(anim.t / anim.dur, 0, 1) * Math.PI) * 3 : 0;
  const x = MANO.x, y = MANO.y + Math.round(Math.sin(T * 1.7) + paso), k = 0.3 + 0.7 * P.fuel / 100;
  c.globalAlpha = S.mode === 'fade' ? 1 - fx.fade : 1;
  // el fuego abraza la cabeza: una llama detrás, los trapos, y lenguas y brasas por delante
  if (P.fuel > 0) drawFlame(c, x + 31, y + 34, 72, 70, T, k, 'fuegoX');
  c.drawImage(manoIluminada(Math.ceil(P.fuel / 25)), x, y);
  if (P.fuel > 0) {
    drawFlame(c, x + 31, y + 24, 44, 40, T + 2.7, k, 'fuegoX');
    for (let n = 0; n < 9; n++) {
      const u = (T * (0.5 + n * 0.07) + n * 0.37) % 1;
      c.fillStyle = RAMPS.fuegoX[n % 2 ? 4 : 5];
      if (n < 5) { if (Math.sin(T * 6 + n * 2) > 0) c.fillRect(x + 20 + n * 5, y + 16 + (n * 7) % 13, 1, 1); }   // brasas en los trapos
      else if (k > 0.3) c.fillRect(x + 28 + Math.round(Math.sin(u * 7 + n) * 7), y + 4 - Math.round(u * 44), 1, 1);    // chispas
    }
  }
  c.globalAlpha = 1;
}

function registrarCaidos() {
  let nuevo = false;
  for (const p of X.grupo) if (p.vida <= 0 && !p.cayo) {
    p.cayo = S.level; nuevo = true;
    X.caidos.push({ ...p, vida: p.vidaMax, exp: 0 });
    X.perdidos.push(p); X.memoria.ultimoCaido = { nombre: p.nombre, modelo: p.modelo };
    X.plantel = X.plantel.filter(q => q.id !== p.id);
  }
  if (nuevo) guardarX();
  return nuevo;
}

// El registro se muestra un rato y se apaga solo; no ocupa pantalla si no hay novedades
const baseRenderLog = renderLog;
let apagarLog = 0;
window.renderLog = () => {
  baseRenderLog();
  $('log').classList.remove('apagado');
  clearTimeout(apagarLog);
  apagarLog = setTimeout(() => $('log').classList.add('apagado'), 5000);
};

// ---------- Diálogos ----------
const QUIEN = { sombra: ['shade', 'shade', 'La Sombra'], rey: ['boneKing', 'blood', 'El Rey del Osario'], habitante: [null, null, 'El Que Habita la Oscuridad'], narrador: [null, null, ''] };
let CH = null;
// La cara de quien habla flota sobre el diálogo; cada línea puede elegir su gesto ("caras" en dialogos.json)
const CARAS = { sombra: { base: 'sombra', risa: 'sombra_risa', enojo: 'sombra_enojo' } };
const IMG_CARAS = {};
for (const g of Object.values(CARAS)) for (const n of Object.values(g)) IMG_CARAS[n] = { img: Object.assign(new Image(), { src: tr('interfaz/personajes/{0}.png', n) }), c: {} };
const CARA = { lado: 124, x: 172, y: 62 };
function caraDe(nombre) {
  const k = IMG_CARAS[nombre];
  if (!k.c[S.env] && k.img.complete && k.img.naturalWidth) k.c[S.env] = spriteCanvas(spriteDesdeImagen(k.img, k.img.naturalWidth), CARA.lado, S.env, 1);
  return k.c[S.env];
}
function dibujarCara(c) {
  if (CH && CH.n.p) {
    const r = retratoX(CH.n.p.modelo, LADO_RETRATO, S.env), x = CARA.x - 32, y = 122, n = capaNitida();
    n.globalAlpha = clamp((T - CH.desde) / 0.3, 0, 1);
    n.fillStyle = RAMPS[S.env][4]; n.fillRect(x - 1, y - 1, 66, 66);
    n.drawImage(r, x, y, 64, 64); n.globalAlpha = 1;
    return;
  }
  const g = CH && CARAS[CH.n.quien];
  if (!g) return;
  const img = caraDe(g[(CH.n.caras && CH.n.caras[CH.i]) || 'base'] || g.base);
  if (!img) return;
  c.globalAlpha = clamp((T - CH.desde) / 0.5, 0, 1);
  c.drawImage(img, CARA.x - CARA.lado / 2, CARA.y + Math.round(Math.sin(T * 1.3) * 2));
  c.globalAlpha = 1;
}
function charla(id, luego) {
  const n = typeof id === 'string' ? D.dialogos[id] : id;
  CH = { n, i: 0, luego, sel: 0, desde: T, vuelve: S.mode === 'xbat' ? 'xbat' : 'explore' };
  S.mode = 'xcharla';
  $('xCharla').classList.remove('hidden');
  pintarCharla();
}
// Varios diálogos seguidos; los que no corresponden llegan vacíos y se saltean
function encadenar(lista, fin) {
  const resto = lista.filter(Boolean), uno = resto.shift();
  if (!uno) { if (fin) fin(); return; }
  charla(uno, () => encadenar(resto, fin));
}
const conNombre = (id, nombre) => ({ ...D.dialogos[id], lineas: D.dialogos[id].lineas.map(l => tr(l).replace('{nombre}', nombre)) });
// Una línea dicha por alguien del grupo, al azar entre los vivos
function dichoDeAlguien(clave) {
  const v = NUCLEO.vivos(X.grupo), p = v[Math.floor(azarX() * v.length)];
  return p && { quien: 'personaje', p, lineas: [D.historia.modelos[p.modelo][clave]] };
}
// La historia de La Sombra se cuenta de a poco, una vez por partida guardada
function revelar(n) {
  if (X.memoria.reveladas.includes(n)) return null;
  X.memoria.reveladas.push(n); guardarX();
  return `revelacion_${n}`;
}
// El motor pide diálogos al cambiar de piso: se reemplazan por los del grupo
window.showDialog = (lineas, quien, cara, listo) => {
  const piso = lineas === LINES.floor2 ? 2 : lineas === LINES.floor3 ? 3 : 0;
  if (!piso) { if (listo) listo(); return; }
  X.memoria.hondo = Math.max(X.memoria.hondo, piso); guardarX();
  encadenar([`piso_${piso}`, revelar(piso), dichoDeAlguien('piso')], listo);
};
function pintarCharla() {
  const { n, i, sel } = CH, q = n.p ? [0, 0, n.p.nombre] : QUIEN[n.quien], ops = i >= n.lineas.length - 1 && n.opciones ? n.opciones.filter(o => o.requiere !== 'pocion' || P.potions > 0) : null;
  CH.ops = ops;
  $('xCharla').innerHTML = `<div class="cb">${q[2] ? `<div class="cq">${tr(q[2])}</div>` : ''}<div class="ct">${tr(n.lineas[i])}</div>` +
    (ops ? ops.map((o, k) => `<div class="co${k === sel ? ' sel' : ''}">${tr(o.texto)}</div>`).join('') : '<div class="cs">Enter</div>') + '</div>';
}
function charlaAction(act) {
  if (CH.ops && (act === 'fwd' || act === 'back')) { CH.sel = (CH.sel + (act === 'fwd' ? CH.ops.length - 1 : 1)) % CH.ops.length; sfx('select'); pintarCharla(); return; }
  if (act !== 'ok') return;
  sfx('select');
  if (!CH.ops && CH.i < CH.n.lineas.length - 1) { CH.i++; pintarCharla(); return; }
  const o = CH.ops && CH.ops[CH.sel], { luego, vuelve } = CH;
  $('xCharla').classList.add('hidden');
  S.mode = vuelve; CH = null;
  if (o) efecto(o);
  if (luego) luego();
}
function efecto(o) {
  if (o.efecto === 'ceniza') { P.potions--; X.ceniza += o.valor; log(tr('El portador se aleja. +{0} de Ceniza.', o.valor), 'good'); }
  if (o.efecto === 'reclutar') {
    if (NUCLEO.vivos(X.grupo).length >= D.mazmorra.tamano_grupo) { X.ceniza += 4; log('El grupo está completo: te da su Ceniza y sigue solo (+4).', 'good'); }
    else {
      const clases = NUCLEO.vivos(X.grupo).map(q => q.clase), ms = Object.keys(D.modelos).filter(m => X.corridas > 1 || !clases.includes(D.modelos[m].clase));
      const p = NUCLEO.crearPersonaje(D, ms[Math.floor(azarX() * ms.length)], azarX);
      X.grupo.push(p); X.plantel.push(p); log(tr('{0} se suma al grupo.', p.nombre), 'good');
    }
  }
  updateHUD();
}

// ---------- Batalla ----------
// tarjetas flotantes: separadas entre sí y del borde inferior
const MENU_Y = 191;
const CX = [10, 128, 246, 364], CY = 216, CW = 106, FX3 = [145, 240, 335], FBASE = 168, FTAM = 74;
let Bt = null;
window.startCombat = (e, emboscada) => {
  if (Bt || S.mode !== 'explore') return;
  if (S.flags.trato && !e.def.boss) { delete S.flags.trato; emboscada = true; log('La Sombra cobra lo suyo.', 'bad'); }
  guardarExpedicion();
  const jefe = e.def.boss, tipo = jefe ? 'jefe' : emboscada ? 'emboscada' : 'comun';
  const ids = jefe ? D.mazmorra.jefes[S.floor] : (p => p[Math.floor(azarX() * p.length)])(D.mazmorra.grupos_por_piso[S.floor]);
  const go = () => iniciarTransicion(e, ids, tipo);
  if (jefe) { setMusic(temaDeJefe()); charla(`jefe_${S.floor}`, go); } else { setMusic('pelea'); go(); }
};

// ---------- Transición a la pelea ----------
// La oscuridad se cierra desde los bordes; después la pelea se enciende y entran enemigos y tarjetas.
const TRANS = { comun: { cierre: 0.42, negro: 0.1, entrada: 0.95 }, emboscada: { cierre: 0.2, negro: 0.06, entrada: 0.5 }, jefe: { cierre: 0.7, negro: 1.1, entrada: 1.3 } };
let Tr = null;
function iniciarTransicion(ent, ids, tipo) {
  Tr = { ent, ids, tipo, t: 0, ...TRANS[tipo], rojo: tipo === 'emboscada' ? 0.8 : 0, sono: false };
  S.mode = 'xtrans';
  sfx(tipo === 'jefe' ? 'whisper' : 'whoosh');
  if (tipo === 'emboscada') banner('¡Emboscada!');
  if (!LUZ.c) prepararLuz();
}

function banner(texto) {
  const b = $('xBanner');
  b.textContent = texto || '';
  b.classList.toggle('hidden', !texto);
}

function actualizarTransicion(dt) {
  Tr.t += dt; Tr.rojo = Math.max(0, Tr.rojo - dt * 2.5);
  if (!Tr.sono && Tr.t >= Tr.cierre) {
    Tr.sono = true; sfx('encounter');
    if (Tr.tipo === 'jefe') banner(D.enemigos[Tr.ids.find(id => D.enemigos[id].jefe)].nombre);
  }
  if (Tr.t >= Tr.cierre + Tr.negro) { const { ent, ids, tipo, entrada } = Tr; Tr = null; banner(tipo === 'emboscada' ? '¡Emboscada!' : ''); iniciarPelea(ent, ids, entrada, tipo === 'emboscada'); }
}

// El círculo de luz se achica con el mismo tramado de la mazmorra
function dibujarCierre(c, k = clamp(Tr.t / Tr.cierre, 0, 1), rojo = Tr.rojo) {
  const r = 330 * (1 - k * k) - 40;
  const { px, cen, w, h } = LUZ, negro = 0xff020104 >>> 0;
  for (let y = 0, i = 0; y < h; y++) for (let x = 0; x < w; x++, i++) {
    const v = (cen[i] - r) / 46;
    px[i] = (v >= 1 || (v > 0 && v > BAYER[((y & 3) << 2) | (x & 3)])) ? negro : 0;
  }
  LUZ.g.putImageData(LUZ.img, 0, 0);
  c.imageSmoothingEnabled = false;
  c.drawImage(LUZ.c, 0, 0, 480, 270);
  c.imageSmoothingEnabled = true;
  if (rojo) { c.fillStyle = `rgba(150, 20, 20, ${rojo * 0.6})`; c.fillRect(0, 0, 480, 270); }
}

// Fondo pintado de cada zona; si no cargó, el procedural
// por ahora todos los pisos pelean en el mismo escenario, pasado por la paleta de cada uno
const FONDOS = { crypt: Object.assign(new Image(), { src: 'interfaz/batalla/cripta.png' }) };
const ANTORCHAS = { crypt: [[25, 77], [454, 77]] };
// Dibujos propios de enemigos (campo "imagen" de enemigos.json); los demás usan el sprite del juego base
const IMG_ENEMIGOS = {};
for (const d of Object.values(D.enemigos)) if (d.imagen) IMG_ENEMIGOS[d.imagen] = Object.assign(new Image(), { src: tr('interfaz/enemigos/{0}.png', d.imagen) });

function fondoBatalla() {
  const f = FONDOS[S.env] || FONDOS.crypt, n = 480 * 270, g = new Float32Array(n).fill(0.14);
  if (!f || !f.complete || !f.naturalWidth) return g;
  const c = document.createElement('canvas'); c.width = 480; c.height = 270;
  const x = c.getContext('2d', { willReadFrequently: true }); x.drawImage(f, 0, 0, 480, 270);
  const d = x.getImageData(0, 0, 480, 270).data;
  for (let i = 0; i < n; i++) g[i] = d[i * 4] / 255 * 0.8;   // un poco más oscuro, para que resalten los enemigos
  return g;
}

// El enemigo como brillo y máscara, con un borde oscuro que lo separa del fondo
function topeVisible(e) {
  const { a, size } = e.gris;
  if (e.tope === undefined) e.tope = Math.floor(Math.max(0, a.indexOf(1)) / size);
  return e.tope;
}

function grisDeEnemigo(e) {
  const g = spriteDesdeImagen(e.img, e.tam), w = g.size, borde = new Uint8Array(w * w);
  for (let i = 0; i < g.lum.length; i++) g.lum[i] = Math.min(1, g.lum[i] * 1.15 + 0.12);
  for (let y = 0; y < w; y++) for (let x = 0; x < w; x++) {
    if (g.a[y * w + x]) continue;
    if ((x && g.a[y * w + x - 1]) || (x < w - 1 && g.a[y * w + x + 1]) || (y && g.a[(y - 1) * w + x]) || (y < w - 1 && g.a[(y + 1) * w + x])) borde[y * w + x] = 1;
  }
  g.borde = borde;
  return g;
}

function iniciarPelea(ent, ids, entrada = 0.95, emboscada = false) {
  const b = NUCLEO.iniciarBatalla(D, X.grupo, ids, emboscada);
  if (S.flags.impetu) { for (const u of b.aliados) u.impetu = Math.min(NUCLEO.IMP_TOPE, u.impetu + S.flags.impetu); delete S.flags.impetu; }
  const fx = ids.length === 1 ? [240] : ids.length === 2 ? [190, 290] : ids.some(id => D.enemigos[id].tam_batalla) ? [92, 240, 388] : FX3;   // un jefe grande necesita lugar
  for (const e of b.enemigos) { e.x = fx[e.i]; const propia = IMG_ENEMIGOS[e.imagen], lista = propia && propia.complete && propia.naturalWidth; const tam = lista ? D.enemigos[e.tipo].tam_batalla || propia.naturalWidth : e.jefe ? FTAM + 14 : FTAM; e.tam = tam; e.img = lista ? propia : spriteCanvas(SPRITES[e.sprite].p, tam, S.env, 1); e.golpeado = 0; e.luz = luzDeEnemigo(e); e.gris = grisDeEnemigo(e); e.icono = spriteCanvas(e.gris, e.tam, S.env, 1); prepararPoses(e); }
  for (const u of b.aliados) u.golpeado = 0;
  Bt = { b, ent, fase: 'espera', sel: 0, tsel: 0, ops: [], msg: 'Te cierran el paso.', t: 0, gris: fondoBatalla(), fx: [], fxHab: [], part: [], temblor: 0, destello: 0, golpe: 'tajo', ini: 0, entrada };
  S.mode = 'xbat';
  $('battle').classList.remove('hidden');
  $('bMenu').classList.add('hidden');
  if (ent.def.boss) setMusic(temaDeJefe());
  sfx('fire');
  pintarBatalla();
  later(Math.round(entrada * 1000) + 100, () => { banner(''); siguiente(); });
}

function siguiente() {
  if (!Bt) return;
  const r = NUCLEO.haTerminado(Bt.b);
  if (r) return terminarPelea(r === 'victoria');
  const { unidad: u, eventos } = NUCLEO.proximoTurno(Bt.b);
  mostrar(eventos);
  if (u.vida <= 0) return later(500, siguiente);
  if (u.enemigo) {
    Bt.fase = 'espera'; Bt.msg = ''; pintarBatalla();
    iniciarAtaqueAnimado(u);
    later(600, () => { if (Bt) { mostrar(NUCLEO.turnoEnemigo(Bt.b, u, azarX)); later(450, () => { if (Bt) Bt.fase = 'cambio'; }); later(800, siguiente); } });
  } else {
    Bt.ops = [{ id: 'atk', nombre: tr('Atacar'), descripcion: tr(D.clases[u.clase].doble_golpe ? 'Dos golpes: el segundo, más flojo. +1 Ímpetu.' : 'Golpe común. +1 Ímpetu.'), objetivo: 'enemigo' },
      ...NUCLEO.opciones(D, u),
      { id: 'def', nombre: tr('Defender'), descripcion: tr('Mitad de daño hasta tu próximo turno. +1 Ímpetu.') },
      { id: 'pot', nombre: tr('Poción'), descripcion: tr('Cura un 40% al aliado más herido. Quedan {0}.', P.potions), apagada: !P.potions }];
    Bt.sel = 0; Bt.fase = 'menu'; Bt.msg = ''; pintarBatalla();
  }
}

// Convierte los eventos del núcleo en números, mensajes y efectos. Cada golpe a un enemigo se muestra
// por separado, así el doble golpe del Pícaro se ve como dos impactos.
function mostrar(eventos) {
  let espera = 0;
  for (const e of eventos) {
    const uno = () => { if (Bt) { mostrarEvento(e); pintarBatalla(); } };
    if (espera) later(espera, uno); else uno();
    if (e.tipo === 'dano' && e.quien.enemigo) espera += 260;
  }
  pintarBatalla();
  return espera;
}

function mostrarEvento(e) {
  const q = e.quien, x = q.enemigo ? q.x : CX[q.i] + 26, y = q.enemigo ? FBASE - 60 : CY - 6;
  if (e.tipo === 'dano') {
    q.golpeado = 0.3; golpeBarra(q);
    numero(x, y, q.enemigo ? String(e.valor) : `−${e.valor}`, e.estado ? tr('est-{0}', e.estado) : e.critico ? 'crit' : q.enemigo ? 'hit' : 'hurt');
    if (e.estado) efectoEstado(q, e.estado);
    else if (q.enemigo) { efectoGolpe(q, Bt.golpe, e.critico); sfx('hit'); } else { Bt.temblor = Math.max(Bt.temblor, 2); sfx('hurt'); }
    Bt.msg = e.estado === 'estallido' ? '¡La herida se abre!' : '';       // el daño ya se ve en el número que salta
  }
  if (e.tipo === 'cura') { numero(x, y, `+${e.valor}`, 'heal'); sfx('heal'); chispas(x, CY - 6, 10, [RAMPS[S.env][5], RAMPS[S.env][4]], -30); Bt.msg = tr('{0} recupera {1}.', q.nombre, e.valor); }
  if (e.tipo === 'esquiva') { sfx('miss'); Bt.msg = tr('{0} esquiva.', q.nombre); }
  if (e.tipo === 'muerte') {
    Bt.msg = q.enemigo ? tr('{0} cae.', q.nombre) : tr('{0} cae. Su chispa se apaga.', q.nombre);
    if (q.enemigo) { q.muriendo = 0.6; chispas(q.x, FBASE - q.tam * 0.45, 24, [RAMPS[S.env][2], RAMPS[S.env][3], RAMPS[S.env][4]], -18); }
  }
  if (e.tipo === 'fase') { Bt.msg = tr('{0} se enfurece y se cubre de escudos.', q.nombre); Bt.temblor = 6; Bt.destello = 0.5; sfx('encounter'); chispas(q.x, FBASE - q.tam * 0.5, 30, VIDA_ESCUDO, -24); }
  if (e.tipo === 'escudo') {
    q.golpeado = 0.2; sfx(e.quedan ? 'miss' : 'chest');
    chispas(q.x, FBASE - q.tam * 0.45, e.quedan ? 10 : 34, VIDA_ESCUDO, -30);
    Bt.msg = e.quedan ? tr('Quedan {0} escudos.', e.quedan) : tr('Se rompen los escudos de {0}.', q.nombre);
    if (!e.quedan) Bt.temblor = 5;
  }
  if (e.tipo === 'texto' && e.clave === 'aturdido') Bt.msg = tr('{0} no ve nada.', q.nombre);
  if (e.tipo === 'texto' && e.clave === 'pierde_turno') Bt.msg = tr('{0} pierde el turno.', q.nombre);
  if (e.tipo === 'texto' && e.clave === 'jefe_resiste') Bt.msg = tr('{0} ni se inmuta.', q.nombre);
  if (e.tipo === 'texto' && e.clave === 'resiste') Bt.msg = tr('{0} ya tiene ese efecto: no se renueva.', q.nombre);
  if (e.tipo === 'texto' && e.clave === 'especial') { Bt.msg = `${q.nombre} ${e.texto}.`; Bt.temblor = 5; Bt.destello = 0.5; }
  if (e.tipo === 'texto' && e.clave === 'roba') Bt.msg = tr('El Soplo le roba Ímpetu a {0}.', q.nombre);
}

// ---------- Efectos de golpe ----------
// Los efectos usan los tonos del piso; sólo el fuego y la sangre conservan su color
const coloresFx = t => { const R = RAMPS[S.env]; return t === 'fuego' ? ['#ffd27a', '#ee7d1a', '#a3281f'] : [R[5], R[4], R[3]]; };
function chispas(x, y, n, cols, vy = -40, fuerza = 70) {
  for (let i = 0; i < n; i++) {
    const a = azarX() * Math.PI * 2, v = fuerza * (0.3 + azarX() * 0.7);
    Bt.part.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v + vy, t: 0, dur: 0.3 + azarX() * 0.4, col: cols[Math.floor(azarX() * cols.length)] });
  }
}

function efectoEstado(q, estado) {
  const y = FBASE - q.tam * 0.5;
  if (estado === 'estallido') {
    chispas(q.x, y, 30, COLOR_ESTADO.sangrado, -20, 110);
    Bt.temblor = 5; sfx('slash');
  } else {
    chispas(q.x, y, 10, COLOR_ESTADO[estado], -45, 35);
    sfx(estado === 'quemadura' ? 'fire' : 'sputter');
  }
}

function efectoGolpe(q, tipo = 'tajo', critico = false) {
  const x = q.x, y = FBASE - q.tam * 0.5, cols = coloresFx(tipo), m = critico ? 1.5 : 1;
  q.retro = critico ? 9 : 5; q.dir = azarX() < 0.5 ? -1 : 1;
  Bt.fx.push({ tipo, x, y, t: 0, dur: tipo === 'fuego' ? 0.4 : 0.22, m, giro: azarX() * 0.8 - 0.4 });
  chispas(x, y, Math.round((tipo === 'fuego' ? 22 : 12) * m), cols, tipo === 'fuego' ? -50 : -30);
  Bt.temblor = Math.max(Bt.temblor, critico ? 4 : 2);
  Bt.destello = Math.max(Bt.destello, tipo === 'fuego' ? 0.45 : critico ? 0.35 : 0.15);
  if (critico) { Bt.fx.push({ tipo: 'anillo', x, y, t: 0, dur: 0.28, m }); sfx('slash'); }
}

function dibujarFx(c) {
  for (const f of Bt.fx) {
    const k = clamp(f.t / f.dur, 0, 1), cols = coloresFx(f.tipo);
    c.save(); c.translate(f.x, f.y); c.rotate(f.giro || 0); c.lineCap = 'butt';
    if (f.tipo === 'tajo' || f.tipo === 'golpe') {
      // medialuna que cruza al enemigo en diagonal
      const r = 34 * f.m;
      c.strokeStyle = cols[1]; c.lineWidth = (1 - k) * 7 * f.m; c.beginPath(); c.arc(-r * 0.7, -r * 0.2, r, -0.9 + k * 0.5, 0.9 + k * 0.5); c.stroke();
      c.strokeStyle = cols[0]; c.lineWidth = (1 - k) * 3 * f.m; c.beginPath(); c.arc(-r * 0.7, -r * 0.2, r, -0.8 + k * 0.5, 0.8 + k * 0.5); c.stroke();
    } else if (f.tipo === 'estocada') {
      const l = 40 * f.m * (0.4 + k * 0.6);
      c.fillStyle = cols[0]; c.beginPath(); c.moveTo(-l, -1); c.lineTo(l, 0); c.lineTo(-l, 2 * (1 - k) + 1); c.closePath(); c.fill();
    } else if (f.tipo === 'fuego') {
      for (let n = 0; n < 3; n++) { c.fillStyle = cols[n]; const r = (10 + 26 * k) * (1 - n * 0.28) * f.m; c.beginPath(); c.arc(0, 0, r * (1 - k * 0.3), 0, Math.PI * 2); c.globalAlpha = 1 - k; c.fill(); }
    } else if (f.tipo === 'veneno') {
      c.fillStyle = cols[0]; c.globalAlpha = 1 - k;
      for (let n = 0; n < 6; n++) c.fillRect(Math.round(Math.sin(n * 2.4) * 16), Math.round(10 - n * 4 - k * 18), 2, 2);
    } else if (f.tipo === 'anillo') {
      c.strokeStyle = RAMPS[S.env][5]; c.lineWidth = (1 - k) * 3; c.beginPath(); c.arc(0, 0, 10 + 34 * k, 0, Math.PI * 2); c.stroke();
    }
    c.restore();
  }
  for (const p of Bt.part) { const q = p.t / p.dur > 0.6 ? 1 : 2; c.fillStyle = p.col; c.fillRect(Math.round(p.x), Math.round(p.y), q, q); }
}

function actualizarFx(dt) {
  Bt.temblor = Math.max(0, Bt.temblor - dt * 22);
  Bt.destello = Math.max(0, Bt.destello - dt * 2.2);
  for (const f of Bt.fx) f.t += dt;
  Bt.fx = Bt.fx.filter(f => f.t < f.dur);
  for (const p of Bt.part) { p.t += dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 120 * dt; }
  Bt.part = Bt.part.filter(p => p.t < p.dur);
  actualizarLinea(dt);
  for (const u of Bt.b.unidades) actualizarBarra(u, dt);
  if (Bt.fase === 'botin') actualizarBotin(dt);
  for (const e of Bt.b.enemigos) { if (e.retro) e.retro = Math.max(0, e.retro - dt * 34); if (e.muriendo) e.muriendo = Math.max(0, e.muriendo - dt); }
}

function numero(x, y, text, kind) {
  const el = document.createElement('div');
  el.className = 'fnum ' + kind; el.textContent = text;
  el.style.left = x + 'px'; el.style.top = y + 'px';
  $('fx').appendChild(el);
  setTimeout(() => el.remove(), 1000);
}

// La explicación de la acción elegida: se abre y se cierra con el botón del inventario y queda así entre turnos
let ayudaBatalla = false;
function pintarAyuda(ver) {
  const a = $('bAyuda'), o = ver && ayudaBatalla && Bt.ops[Bt.sel];
  a.classList.toggle('hidden', !o);
  if (!o) return;
  const costo = o.costo ? tr('Cuesta {0} de Ímpetu.', o.costo) : '', falta = o.apagada && o.costo ? ` ${tr('Te falta Ímpetu: atacá o defendé para juntarlo.')}` : '';
  a.innerHTML = `<b>${o.nombre}</b><p>${o.descripcion}</p>${costo ? `<em>${costo}${falta}</em>` : ''}`;
}

function batallaAction(act) {
  if (!Bt) return;
  if (Bt.fase === 'botin') {
    if (act !== 'ok') return;
    if (Bt.listo) salirDelBotin(); else Bt.velXp = 1e6;
    return;
  }
  if (Bt.ini < Bt.entrada) { if (act === 'ok') Bt.ini = Bt.entrada; return; }
  const b = Bt.b, u = b.actual;
  if (act === 'inv' && (Bt.fase === 'menu' || Bt.fase === 'objetivo')) { ayudaBatalla = !ayudaBatalla; sfx('select'); pintarBatalla(); return; }
  if (Bt.fase === 'menu') {
    const n = Bt.ops.length;
    if (act === 'fwd' || act === 'turnL' || act === 'strafeL') { Bt.sel = (Bt.sel + n - 1) % n; sfx('select'); }
    else if (act === 'back' || act === 'turnR' || act === 'strafeR') { Bt.sel = (Bt.sel + 1) % n; sfx('select'); }
    else if (act === 'ok') {
      const o = Bt.ops[Bt.sel];
      if (o.apagada) { sfx('bump'); return; }
      if (o.objetivo === 'enemigo' || o.objetivo === 'aliado') { Bt.fase = 'objetivo'; Bt.lista = NUCLEO.vivos(o.objetivo === 'enemigo' ? b.enemigos : b.aliados); Bt.tsel = 0; sfx('select'); }
      else ejecutar(o);
    }
  } else if (Bt.fase === 'objetivo') {
    const n = Bt.lista.length;
    if (act === 'turnL' || act === 'strafeL' || act === 'fwd') { Bt.tsel = (Bt.tsel + n - 1) % n; sfx('select'); }
    else if (act === 'turnR' || act === 'strafeR' || act === 'back') { Bt.tsel = (Bt.tsel + 1) % n; sfx('select'); }
    else if (act === 'cancel') Bt.fase = 'menu';
    else if (act === 'ok') ejecutar(Bt.ops[Bt.sel], Bt.lista[Bt.tsel]);
  }
  if (Bt) pintarBatalla();
}

function ejecutar(o, t) {
  const b = Bt.b, u = b.actual;
  Bt.fase = 'espera';
  sfx('swing');
  // el efecto depende de quién pega y con qué
  const h = D.habilidades[o.id], fuego = h && h.efectos.some(x => x.tipo === 'dano_fijo');
  Bt.golpe = h ? 'propio' : fuego ? 'fuego' : u.clase === 'picaro' ? 'estocada' : u.clase === 'guerrero' ? 'tajo' : 'golpe';   // cada habilidad trae su efecto
  if (h) lanzarEfecto(o.id, u, t);
  let ev;
  if (o.id === 'atk') ev = NUCLEO.atacar(D, u, t, azarX);
  else if (o.id === 'def') ev = NUCLEO.defender(u);
  else if (o.id === 'pot') {
    const h = NUCLEO.vivos(b.aliados).sort((x, y) => x.vida / x.vidaMax - y.vida / y.vidaMax)[0], v = Math.round(h.vidaMax * 0.4);
    P.potions--; h.vida = Math.min(h.vidaMax, h.vida + v); ev = [{ tipo: 'cura', quien: h, valor: v }];
  } else ev = NUCLEO.usarHabilidad(D, b, u, o.id, t, azarX);
  const espera = mostrar(ev);
  later(450 + espera, () => { if (Bt) Bt.fase = 'cambio'; });
  later(800 + espera, siguiente);
}

function terminarPelea(gano) {
  const { b, ent } = Bt;
  registrarCaidos();
  if (!gano) { cerrarPelea(); return finExpedicion(false); }
  W_().ents.splice(W_().ents.indexOf(ent), 1);
  if (ent.def.boss && S.floor < LAST_FLOOR) { W_().map[ent.y * MW + ent.x] = 2; W_().explored[ent.y * MW + ent.x] = 1; }   // se abre la bajada
  const exp = b.enemigos.reduce((n, e) => n + e.exp, 0);
  const hallado = soltarBotin(ent.def.boss);
  for (const id of sinDesbloquear('jefe')) if (b.enemigos.some(e => e.tipo === D.habilidades[id].jefe)) { desbloquear(id); log(tr('{0} queda en el Grimorio.', D.habilidades[id].nombre), 'em'); }
  X.ceniza += Math.round((ent.def.boss ? D.mazmorra.ceniza.por_jefe : D.mazmorra.ceniza.por_grupo) * porGrupo('ceniza'));
  const tope = NUCLEO.topeNivel(D, S.floor);
  for (const u of NUCLEO.vivos(X.grupo)) {
    // lo que se anima en pantalla sale de los valores de antes del reparto
    u.reparto = { exp: u.exp, nivel: u.nivel, falta: u.nivel >= tope ? 0 : exp, subio: 0, tope };
    NUCLEO.ganarExp(D, u, exp, tope);
    u.vida = Math.min(u.vidaMax, u.vida + Math.round(u.vidaMax * D.mazmorra.descanso));
  }
  guardarX();
  b.actual = null;
  Object.assign(Bt, { fase: 'botin', listo: false, msg: tr('+{0} de experiencia{1}', exp, hallado ? ` · ${hallado}` : ''), velXp: Math.max(exp / 1.3, 6) });
  sfx('level');
  pintarBatalla();
}

function cerrarPelea() {
  $('battle').classList.add('hidden');
  Bt = null;
  S.mode = 'explore';
  setMusic(floorMusic());
}

function actualizarBotin(dt) {
  let queda = false;
  for (const u of NUCLEO.vivos(Bt.b.aliados)) {
    const a = u.reparto;
    if (!a) continue;
    a.subio = Math.max(0, a.subio - dt * 0.5);
    if (a.falta <= 0) continue;
    const paso = Math.min(a.falta, dt * Bt.velXp);
    a.exp += paso; a.falta -= paso;
    while (a.nivel < a.tope && a.exp >= a.nivel * D.mazmorra.exp_por_nivel) { a.exp -= a.nivel * D.mazmorra.exp_por_nivel; a.nivel++; a.subio = 1; sfx('level'); }
    if (a.nivel >= a.tope) a.falta = 0;
    if (a.falta > 0) queda = true;
  }
  if (!queda && !Bt.listo) Bt.listo = true;
}

// Al salir la oscuridad se cierra sobre la pelea y se abre sobre el mapa, como al entrar pero al revés
const SALIDA = { cierre: 0.42, negro: 0.12, apertura: 0.55 };
let Sal = null;
function salirDelBotin() {
  Sal = { t: 0, abierto: false };
  S.mode = 'xsal';
  sfx('whoosh');
  if (!LUZ.c) prepararLuz();
}

function actualizarSalida(dt) {
  Sal.t += dt;
  if (Bt) $('battle').style.opacity = 1 - clamp(Sal.t / (SALIDA.cierre * 0.7), 0, 1);
  if (!Sal.abierto && Sal.t >= SALIDA.cierre + SALIDA.negro) { Sal.abierto = true; volverAlMapa(); S.mode = 'xsal'; }
  if (Sal.t >= SALIDA.cierre + SALIDA.negro + SALIDA.apertura) { Sal = null; S.mode = 'explore'; seguirTrasPelea(); }
}

function dibujarSalida(c) {
  const k = Sal.t < SALIDA.cierre + SALIDA.negro ? Sal.t / SALIDA.cierre : 1 - (Sal.t - SALIDA.cierre - SALIDA.negro) / SALIDA.apertura;
  dibujarCierre(c, clamp(k, 0, 1), 0);
}

let trasPelea = null;
function volverAlMapa() {
  const { ent } = Bt, jefe = ent.def.boss, piso = S.floor, caido = X.memoria.ultimoCaido;
  for (const u of X.grupo) delete u.reparto;
  cerrarPelea();
  $('battle').style.opacity = '';
  updateHUD();
  trasPelea = { jefe, piso, caido };
}

function seguirTrasPelea() {
  const { jefe, piso, caido } = trasPelea;
  const muerte = caido && { quien: 'sombra', caras: ['risa'], lineas: [D.historia.modelos[caido.modelo].muerte.replace('{nombre}', caido.nombre)] };
  X.memoria.ultimoCaido = null;
  if (jefe && piso === LAST_FLOOR) return encadenar([muerte, 'jefe_3_muerto', revelar(4)], elegirPortador);
  guardarExpedicion();
  encadenar([muerte, caido ? revelar(1) : null, jefe ? tr('jefe_{0}_muerto', piso) : null]);
}

// ---------- El santuario ----------
window.useBonfire = b => {
  const items = [
    { label: 'Descansar', sub: b.used ? 'Sólo quedan brasas.' : 'Cura al grupo y renueva la antorcha, una sola vez.', off: b.used, fn: () => {
      b.used = true; P.fuel = 100;
      for (const u of NUCLEO.vivos(X.grupo)) u.vida = Math.min(u.vidaMax, u.vida + Math.round(u.vidaMax * D.mazmorra.santuario.cura));
      closeMenu(); sfx('oil'); log('El grupo descansa junto al fuego.', 'em'); updateHUD();
    } },
    { label: 'Personajes', sub: 'Cambiar equipo y habilidades.', fn: () => abrirPersonajes(X.grupo, true) },
    { label: 'Volver al Hogar', sub: 'Los vivos conservan su nivel. La expedición termina acá.', fn: retirarse },
    { label: 'Seguir', fn: closeMenu },
  ];
  openMenu({ title: 'La fogata', cls: 'altar', text: 'Acá no llega nada vivo.', items }, 'game');
};
function retirarse() {
  closeAllMenus(); S.mode = 'explore';
  borrarExpedicion();
  charla('retirada', () => { recambiarCandidatos(); guardarX(); abrirHogar(); });
}

// ---------- El fondo: quién sostiene la antorcha y qué hace con la Llama ----------
function elegirPortador() {
  const v = NUCLEO.vivos(X.grupo);
  if (v.length === 1) return elegirFinal(v[0]);
  openMenu({ title: 'La antorcha', cls: 'altar', back: false, text: '¿Quién la sostiene al llegar al cuenco?',
    items: v.map(p => ({ label: `${fichaDe(p)}${datosDe(p)}`, sub: D.historia.modelos[p.modelo].fondo, fn: () => { closeAllMenus(); S.mode = 'explore'; elegirFinal(p); } })) }, 'game');
}
function elegirFinal(p) {
  charla({ quien: 'personaje', p, lineas: [D.historia.modelos[p.modelo].fondo] }, () => {
    const F = D.historia.finales, puede = { relicario: X.perdidos.length > 0, leyenda: !X.perdidos.length };
    openMenu({ title: 'La Llama', cls: 'altar', back: false, text: 'El cuenco espera lo que decidan.',
      items: Object.entries(F).map(([id, f]) => ({ label: `${X.memoria.finales[id] ? '✦ ' : ''}${f.label}`, sub: f.sub, off: puede[id] === false, fn: () => {
        closeAllMenus(); setPalette(S.env);
        const a = D.clases[p.clase].arte;
        playEnding(id, () => cerrarFinal(id, p), { cls: a, race: D.modelos[p.modelo].raza, look: kitLook(a), name: p.nombre });
      } })) }, 'game');
  });
}
function cerrarFinal(id, p) {
  X.memoria.finales[id] = 1;
  if (id === 'trono') { X.memoria.habitante = p.nombre; p.vida = 0; X.plantel = X.plantel.filter(q => q !== p); }
  S.mode = 'explore';
  finExpedicion(true);
}
// Los finales reusan el arte y los efectos del motor, con el texto del grupo
const ARTE_FINAL = {
  luz: [{ art: 'escalera', ramp: 'crypt', pan: [0, 290, 0, 0], climb: true, sfx: 'stairs' }, { art: 'amanecer', ramp: 'castle', pan: [80, 0, 0, 0], dawn: true }],
  trono: [{ art: 'trono', ramp: 'blood', pan: [0, 0, 0, 0], sfx: 'whisper' }, { art: 'camara', ramp: 'engrave', pan: [0, 0, 0, 0], hero: [null, 150, 150], heroSnuff: 1 }, { art: 'trono', ramp: 'blood', pan: [0, 0, 0, 0], hero: [null, 170, 240, true], sfx: 'encounter' }],
  relicario: [{ art: 'llama', ramp: 'castle', pan: [0, 150, 0, 150], flame: [240, 393, 96, 150], flameK: [0.25, 1], orbs: true, sfx: 'oil' }, { art: 'reino', ramp: 'castle', pan: [0, 0, 80, 0] }],
  leyenda: [{ art: 'escalera', ramp: 'crypt', pan: [0, 290, 0, 0], climb: true, sfx: 'stairs' }, { art: 'hoguera', ramp: 'castle', pan: [0, 0, 0, 0], flame: [240, 182, 48, 80], sfx: 'fire' }],
};
window.endingScenes = (id, who) => {
  const nombres = X.grupo.filter(p => p.vida > 0).map(p => p.nombre).join(' · ');
  const poner = l => (typeof l === 'string' ? tr(l).replaceAll('{nombre}', who.name).replaceAll('{nombres}', nombres) : Object.fromEntries(Object.entries(l).map(([k, v]) => [k, poner(v)])));
  const intro = endingIntro().map(e => ({ ...e, lines: e.lines.map(l => (typeof l === 'string' ? l.replace('Tu antorcha', `La antorcha de ${who.name}`) : l)) }));
  return [...intro, ...ARTE_FINAL[id].map((e, i) => ({ ...e, lines: D.historia.finales[id].escenas[i].map(poner) }))];
};

function finExpedicion(gano) {
  borrarExpedicion();
  if (gano) {
    X.ganada = 1;
    // quienes recuperan la Llama se retiran: quedan como leyendas del Hogar
    for (const p of NUCLEO.vivos(X.grupo)) { X.leyendas.push({ nombre: p.nombre, clase: p.clase, modelo: p.modelo, corrida: X.corridas }); X.plantel = X.plantel.filter(q => q.id !== p.id); }
  }
  recambiarCandidatos();
  guardarX();
  charla(gano ? 'victoria' : 'derrota', () => {
    const vivos = NUCLEO.vivos(X.grupo).length;
    openMenu({ title: gano ? 'Expedición cumplida' : 'El grupo cayó', back: false, text: tr('Sobrevivieron {0} de {1}. Ceniza acumulada: {2}. Quienes cayeron pueden volver a aparecer entre los reclutas.', vivos, X.grupo.length, X.ceniza),
      items: [{ label: 'Volver al Hogar', fn: abrirHogar }] }, 'game');
  });
}

function pintarBatalla() {
  if (!Bt) return;
  const b = Bt.b, u = b.actual, pct = q => Math.round(Math.max(0, q.vida) / q.vidaMax * 100);
  $('bLog').textContent = Bt.fase === 'objetivo' ? '' : tr(Bt.msg);
  $('bCards').innerHTML = b.aliados.map(q => `<div class="bcard${u === q ? ' on' : ''}${q.vida <= 0 ? ' down' : ''}" style="left:${CX[q.i]}px">
    <div class="bn">${q.nombre}<small>${D.clases[q.clase].nombre}</small></div>
    <div class="bfila hp"><span>HP</span><b>${Math.max(0, q.vida)}/${q.vidaMax}</b></div>
    <div class="bestados">${Bt.fase === 'botin' ? '' : estadosDe(q)}</div></div>`).join('');
  const m = $('bMenu'), ver = Bt.fase === 'menu' || Bt.fase === 'objetivo';
  m.classList.toggle('hidden', !ver);
  pintarAyuda(ver);
  if (ver) {
    m.innerHTML = `<div class="bpista">${glyph('inv')} ${tr(ayudaBatalla ? 'Ocultar detalle' : 'Detalle')}</div><div class="bopts">${Bt.ops.map((o, i) => `<div class="bopt${i === Bt.sel ? ' sel' : ''}${o.apagada ? ' off' : ''}">${o.nombre}${o.costo ? ` <span>${'◆'.repeat(o.costo)}</span>` : ''}</div>`).join('')}</div>`;
    // el canvas dibuja velas y llamas en la posición real de cada palabra
    Bt.menuX = [...m.querySelectorAll('.bopt')].map(e => ({ x: m.offsetLeft + e.parentNode.offsetLeft + e.offsetLeft, w: e.offsetWidth }));
  }
}

// La interfaz toma los tonos del piso; sólo el rojo de la vida es fijo, como acento
const MARCO = { piedra: '', luz: '', fondo: '', vida: ['#6a1518', '#b52a2a', '#e0605a'], impetu: [] };
function marcoDelPiso() { const R = RAMPS[S.env] || RAMPS.crypt; Object.assign(MARCO, { piedra: R[3], luz: R[5], fondo: R[0], impetu: [R[2], R[4], R[5]] }); }

// Barra con punta a la derecha, como una placa flotante
function placa(c, x, y, w, h, frac, col, luz, resto = 0) {
  const fin = x + w, tip = Math.floor(h / 2);
  const forma = (ins) => { c.beginPath(); c.moveTo(x + ins, y + ins); c.lineTo(fin - tip - ins, y + ins); c.lineTo(fin - ins - 1, y + tip + 0.5); c.lineTo(fin - tip - ins, y + h - ins); c.lineTo(x + ins, y + h - ins); c.closePath(); };
  forma(0); c.fillStyle = luz ? MARCO.luz : MARCO.piedra; c.fill();
  forma(1); c.fillStyle = MARCO.fondo; c.fill();
  c.save(); forma(1); c.clip();
  const iw = w - 3, lleno = Math.round(iw * frac);
  if (resto > frac) { c.fillStyle = RAMPS[S.env][5]; c.fillRect(x + 1, y + 1, Math.round(iw * resto), h - 2); }
  c.fillStyle = col[1]; c.fillRect(x + 1, y + 1, lleno, h - 2);
  c.fillStyle = col[2]; c.fillRect(x + 1, y + 1, lleno, 1);
  c.fillStyle = col[0]; c.fillRect(x + 1, y + h - 2, lleno, 1);
  c.restore();
}

// Un punto de Ímpetu: rombo de 7×7 píxeles, lleno o sólo el contorno
function rombo(c, x, y, lleno) {
  for (let k = 0; k < 7; k++) {
    const a = 3 - Math.abs(3 - k), f = y + k;
    c.fillStyle = lleno ? (k < 3 ? MARCO.impetu[2] : MARCO.impetu[1]) : MARCO.fondo;
    c.fillRect(x + 3 - a, f, a * 2 + 1, 1);
    c.fillStyle = lleno ? MARCO.impetu[0] : MARCO.piedra;
    c.fillRect(x + 3 - a, f, 1, 1); c.fillRect(x + 3 + a, f, 1, 1);
  }
}

// Fila de estados: lo que afecta a cada personaje ahora
function estadosDe(q) {
  const on = [q.guardia && ['escudo', icon('shield'), 'En guardia'], q.provoca > 0 && ['ira', icon('cross'), 'Provocando'],
    q.defensaExtra > 0 && ['mas', '▲', `Defensa +${q.defensaExtra}`], q.marcado && ['marca', icon('ash'), 'Marcado']].filter(Boolean);
  return Array.from({ length: 4 }, (_, i) => (on[i] ? `<i class="${on[i][0]}" title="${on[i][2]}">${on[i][1]}</i>` : '<i></i>')).join('');
}

// ---------- Escena de la batalla ----------
// Igual que la mazmorra: fondo y enemigos se juntan como brillo en gris, se les aplica la luz y recién al
// final pasan a los 6 tonos del piso con tramado Bayer. Así todo comparte la misma grilla y paleta.
// Suman las antorchas de la pared, la del grupo (su alcance depende del combustible) y un resplandor propio
// de cada enemigo, para que nunca se pierda en la oscuridad.
const LUZ = { w: 480, h: 270, ambiente: 0.2, pal: {} };
function prepararLuz() {
  const c = document.createElement('canvas'); c.width = LUZ.w; c.height = LUZ.h;
  const g = c.getContext('2d'), img = g.createImageData(LUZ.w, LUZ.h), n = LUZ.w * LUZ.h;
  Object.assign(LUZ, { c, g, img, px: new Uint32Array(img.data.buffer), lum: new Float32Array(n), lat: new Float32Array(n), cen: new Float32Array(n) });
  for (let y = 0, i = 0; y < LUZ.h; y++) for (let x = 0; x < LUZ.w; x++, i++) {
    LUZ.lat[i] = Math.min(Math.hypot(x - 25, y - 66), Math.hypot(x - 454, y - 66));
    LUZ.cen[i] = Math.hypot(x - 240, (y - 120) * 1.4);
  }
}

// El resplandor de un enemigo se calcula una vez, al empezar la pelea
function luzDeEnemigo(e) {
  if (!LUZ.c) prepararLuz();
  const d = new Float32Array(LUZ.w * LUZ.h), cy = FBASE - e.tam * 0.45;
  for (let y = 0, i = 0; y < LUZ.h; y++) for (let x = 0; x < LUZ.w; x++, i++) d[i] = Math.hypot(x - e.x, (y - cy) * 0.8);
  return d;
}

function ponerEnemigo(e, x0, y0) {
  const { lum, w, h } = LUZ, g = e.gris, t = g.size, muere = e.vida <= 0, corte = muere ? Math.round(t * (1 - e.muriendo / 0.6)) : 0;
  x0 -= g.margen || 0; y0 -= g.margen || 0;      // las poses animadas son más grandes que el dibujo
  const extra = e.golpeado > 0.2 ? 0.5 : 0;
  // sombra en el piso
  for (let y = FBASE - 4; y <= FBASE + 3; y++) for (let x = e.x - 30; x <= e.x + 30; x++) {
    const a = (x - e.x) / (e.tam * 0.34), b = (y - FBASE + 1) / 4;
    if (a * a + b * b < 1) lum[y * w + x] *= 0.5;
  }
  for (let y = corte; y < t; y++) {
    const Y = y0 + y; if (Y < 0 || Y >= h) continue;
    for (let x = 0; x < t; x++) {
      const X = x0 + x; if (X < 0 || X >= w) continue;
      const i = y * t + x;
      if (g.a[i]) lum[Y * w + X] = Math.min(1, g.lum[i] + extra); else if (g.borde[i]) lum[Y * w + X] = 0;
    }
  }
}

function dibujarEscena(c, ex, ey) {
  if (!LUZ.c) prepararLuz();
  const { lum, px, lat: dl, cen: dc, w, h, ambiente } = LUZ, bg = Bt.gris;
  if (ex || ey) { for (let y = 0; y < h; y++) { const Y = clamp(y - ey, 0, h - 1); for (let x = 0; x < w; x++) lum[y * w + x] = bg[Y * w + clamp(x - ex, 0, w - 1)]; } }
  else lum.set(bg);
  for (const e of Bt.b.enemigos) {
    if (e.vida <= 0 && !e.muriendo) continue;
    const sale = aparicion(e);
    posar(e);
    if (sale > 0) ponerEnemigo(e, Math.round(e.x + ex + (e.retro || 0) * (e.dir || 1) - e.tam / 2), FBASE - e.tam + ey + Math.round((1 - sale) * 12));
  }
  const f = clamp(flick, 0.7, 1.05), alcance = (110 + 170 * P.fuel / 100) * (0.94 + f * 0.06), lat = 120 * (0.86 + f * 0.14);
  const entra = clamp(Bt.ini / (Bt.entrada * 0.75), 0, 1), focos = Bt.b.enemigos.filter(e => e.vida > 0 && e.luz).map(e => e.luz);
  const pal = LUZ.pal[S.env] || (LUZ.pal[S.env] = packRamp(RAMPS[S.env])), n = pal.length - 1;
  for (let y = 0, i = 0; y < h; y++) for (let x = 0; x < w; x++, i++) {
    let l = ambiente + Bt.destello + Math.max(0, 1 - dc[i] / alcance) * 0.8 + Math.max(0, 1 - dl[i] / lat) * 0.95;
    for (const d of focos) { const q = 1 - d[i] / 52; if (q > 0) l += q * 0.5; }
    const b = lum[i] * l * entra, v = (b > 1 ? 1 : b) * n;
    let k = v | 0;
    if (v - k > BAYER[((y & 3) << 2) | (x & 3)]) k++;
    px[i] = pal[k];
  }
  LUZ.g.putImageData(LUZ.img, 0, 0);
  c.drawImage(LUZ.c, 0, 0);
}

// Brasas que suben de las antorchas y polvo suspendido
function dibujarParticulas(c) {
  const t = Bt.t, R = RAMPS[S.env];
  for (let i = 0; i < 12; i++) {
    const ph = (t * 0.3 + i * 0.083) % 1, lado = i % 2 ? 25 : 454;
    if (ph > 0.75) continue;
    c.fillStyle = ph < 0.4 ? '#f5c98a' : '#b4562a';
    c.fillRect(Math.round(lado + Math.sin(t * 2 + i * 1.7) * (3 + ph * 8)), Math.round(58 - ph * 44), 1, 1);
  }
  c.fillStyle = R[3];
  for (let i = 0; i < 16; i++) {
    const ph = (t * 0.05 + i * 0.0625) % 1;
    if (Math.sin(t * 1.5 + i) > 0.2) c.fillRect(Math.round(70 + hash2(i, 3, 71) * 340 + Math.sin(t * 0.7 + i) * 6), Math.round(150 - ph * 110), 1, 1);
  }
}

// ---------- Menú de acciones ----------
// Sólo palabras sobre la oscuridad; una llama marca la acción elegida.
function dibujarMenu(c) {
  const p = (Bt.menuX || [])[Bt.sel];
  if (p) drawFlame(c, p.x - 2, MENU_Y + 11, 11, 15, Bt.t, 0.9, 'fuegoX');
}

// ---------- Vida y estados de los enemigos ----------
const COLOR_ESTADO = { veneno: ['#2f6a2a', '#5fbf4a', '#b6e36a'], quemadura: ['#8a3a10', '#e8761c', '#fbbf5a'], sangrado: ['#6a1518', '#b52a2a', '#e0605a'] };
const ICONOS = {
  veneno: ['.#####.', '#######', '#.###.#', '#######', '.#####.', '.#.#.#.', '.......'],
  quemadura: ['...#...', '..##...', '..###..', '.#####.', '.##.##.', '.#####.', '..###..'],
  sangrado: ['...#...', '...#...', '..###..', '.#####.', '.#####.', '.#####.', '..###..'],
};
function dibujarIcono(c, tipo, x, y) {
  c.fillStyle = MARCO.fondo; c.fillRect(x - 1, y - 1, 9, 9);
  c.fillStyle = COLOR_ESTADO[tipo][2];
  ICONOS[tipo].forEach((f, j) => { for (let i = 0; i < 7; i++) if (f[i] === '#') c.fillRect(x + i, y + j, 1, 1); });
}

// Marca un golpe: la barra tiembla y lo perdido queda claro un momento antes de vaciarse
function golpeBarra(u) { u.sacude = 0.25; u.espera = 0.28; if (u.fantasma === undefined) u.fantasma = u.vidaMax; }
function actualizarBarra(u, dt) {
  if (u.fantasma === undefined) { u.fantasma = u.vida; return; }
  u.sacude = Math.max(0, (u.sacude || 0) - dt);
  if ((u.espera = Math.max(0, (u.espera || 0) - dt)) > 0) return;
  u.fantasma = u.fantasma > u.vida ? Math.max(Math.max(0, u.vida), u.fantasma - u.vidaMax * dt * 0.9) : Math.max(0, u.vida);
}

const VIDA_ESCUDO = ['#16304f', '#2f6fb5', '#6fb6ee'];
function dibujarEscudo(c, x, y) {
  c.fillStyle = '#0a1420'; c.fillRect(x - 1, y - 1, 9, 8); c.fillRect(x, y + 7, 7, 1); c.fillRect(x + 2, y + 8, 3, 1);
  c.fillStyle = VIDA_ESCUDO[1]; c.fillRect(x, y, 7, 6); c.fillRect(x + 1, y + 6, 5, 1); c.fillRect(x + 3, y + 7, 1, 1);
  c.fillStyle = VIDA_ESCUDO[2]; c.fillRect(x, y, 7, 1); c.fillRect(x, y, 1, 5); c.fillRect(x + 3, y + 2, 1, 3);
}

// Los ojos encendidos del enemigo furioso, sobre el dibujo
function dibujarOjos(c, e) {
  const an = D.enemigos[e.tipo].animacion, ojos = D.enemigos[e.tipo].ojos;
  if (!e.enfurecido || !ojos || e.vida <= 0) return;
  const k = e.tam / an.base, x0 = e.x - e.tam / 2, y0 = FBASE - e.tam, f = 0.75 + Math.sin(Bt.t * 9) * 0.25;
  for (const [ox, oy] of ojos) {
    const x = Math.round(x0 + ox * k), y = Math.round(y0 + oy * k);
    c.fillStyle = `rgba(255, 40, 20, ${0.25 * f})`; c.fillRect(x - 3, y - 3, 8, 7);
    c.fillStyle = '#ff2a14'; c.fillRect(x, y, 3, 2);
    c.fillStyle = '#ffd0b0'; c.fillRect(x + 1, y, 1, 1);
  }
}

function dibujarVidaEnemigo(c, e) {
  const est = e.estados.find(v => v.tipo !== 'sangrado'), col = e.escudos ? VIDA_ESCUDO : est ? COLOR_ESTADO[est.tipo] : MARCO.vida;
  const x = e.x - 22 + (e.sacude ? Math.round(Math.sin(Bt.t * 70) * 1.5) : 0), y = FBASE + 3, w = 42;
  const vida = Math.round(w * Math.max(0, e.vida) / e.vidaMax), resto = Math.round(w * Math.max(0, e.fantasma ?? e.vida) / e.vidaMax);
  c.fillStyle = MARCO.fondo; c.fillRect(x, y, w + 2, 4);
  if (resto > vida) { c.fillStyle = RAMPS[S.env][5]; c.fillRect(x + 1 + vida, y + 1, resto - vida, 2); }
  c.fillStyle = col[1]; c.fillRect(x + 1, y + 1, vida, 2);
  c.fillStyle = col[2]; c.fillRect(x + 1, y + 1, vida, 1);
  if (e.sacude > 0.15) { c.fillStyle = RAMPS[S.env][5]; c.fillRect(x + 1, y + 1, vida, 2); }
  for (let n = 0; n < e.escudos; n++) dibujarEscudo(c, e.x - e.escudos * 5 + n * 10 + 1, FBASE + 9);
  // estados debajo: parpadean cuando les queda el último turno
  e.estados.forEach((v, n) => {
    const ix = e.x - 4 - (e.estados.length - 1) * 5 + n * 10, iy = FBASE + (e.escudos ? 19 : 9);
    if (v.turnos === 1 && Math.sin(Bt.t * 12) < 0) return;
    dibujarIcono(c, v.tipo, ix, iy);
    if (v.tipo === 'sangrado') { c.fillStyle = COLOR_ESTADO.sangrado[2]; for (let k = 0; k < v.pilas; k++) c.fillRect(ix + k * 2, iy + 8, 1, 1); }
  });
}

// ---------- Línea de turnos ----------
// Corre de derecha a izquierda: quien juega ocupa el lugar de Turno y los demás esperan en fila, una vez
// cada uno. Al gastar el turno, su retrato pasa por debajo de la fila y vuelve al fondo.
const LINEA = { turno: 42, primero: 64, paso: 16, y: 6, tam: 13 };     // a la izquierda: arriba al centro va el nombre de un jefe grande
function ordenLinea() {
  const b = Bt.b, act = b.actual && b.actual.vida > 0 && Bt.fase !== 'cambio' ? b.actual : null;
  return { act, fila: b.unidades.filter(u => u.vida > 0 && u !== act).sort((x, y) => x.reloj - y.reloj) };
}
const destinoLinea = (u, act, fila) => (u === act ? LINEA.turno : LINEA.primero + fila.indexOf(u) * LINEA.paso);

function actualizarLinea(dt) {
  const { act, fila } = ordenLinea(), fin = LINEA.primero + fila.length * LINEA.paso + 20;
  for (const u of Bt.b.unidades) {
    if (u.vida <= 0) continue;
    if (u.lx === undefined) u.lx = fin;
    const d = destinoLinea(u, act, fila);
    u.ly = d > u.lx + 6 ? Math.min(9, (u.ly || 0) + dt * 70) : Math.max(0, (u.ly || 0) - dt * 60);   // vuelve por debajo
    u.lx += (d - u.lx) * Math.min(1, dt * (d > u.lx ? 5 : 9));
  }
}

function dibujarLinea(c) {
  const b = Bt.b, L = LINEA, { act, fila } = ordenLinea(), fin = L.primero + Math.max(0, fila.length - 1) * L.paso + L.tam + 8;
  const cy = L.y + L.tam / 2;
  c.fillStyle = MARCO.piedra; c.fillRect(L.turno + L.tam + 6, cy, fin - L.turno - L.tam - 6, 1);
  // lugar de Turno
  c.fillStyle = MARCO.fondo; c.fillRect(L.turno - 3, L.y - 3, L.tam + 6, L.tam + 6);
  c.strokeStyle = MARCO.luz; c.lineWidth = 1; c.strokeRect(L.turno - 2.5, L.y - 2.5, L.tam + 5, L.tam + 5);
  c.font = '10px "New Rocker", serif'; c.textAlign = 'right'; c.fillStyle = MARCO.luz;
  c.fillText(tr('Turno'), L.turno - 6, cy + 3);
  c.textAlign = 'left';
  // los que vuelven pasan por debajo de la fila
  const orden = b.unidades.filter(u => u.vida > 0 && u.lx !== undefined).sort((x, y) => (y.ly || 0) - (x.ly || 0));
  for (const u of orden) {
    const x = Math.round(u.lx), y = L.y + Math.round(u.ly || 0);
    c.fillStyle = u === act ? MARCO.luz : u.enemigo ? MARCO.vida[0] : MARCO.piedra; c.fillRect(x - 1, y - 1, L.tam + 2, L.tam + 2);
    c.fillStyle = MARCO.fondo; c.fillRect(x, y, L.tam, L.tam);
    c.drawImage(u.enemigo ? u.icono : retratoX(u.modelo, LADO_RETRATO), x, y, L.tam, L.tam);
  }
  // a quién se está apuntando: el mismo objetivo marcado en la fila
  const ap = Bt.fase === 'objetivo' && Bt.lista[Bt.tsel];
  if (ap && ap.lx !== undefined) {
    const x = Math.round(ap.lx), y = L.y + Math.round(ap.ly || 0), mx = x + L.tam / 2, py = y + L.tam + 3;
    c.save();
    c.strokeStyle = c.fillStyle = '#ffe9b0'; c.shadowColor = '#ff9a3c'; c.shadowBlur = 6 + Math.sin(Bt.t * 8) * 3; c.lineWidth = 1.5;
    c.strokeRect(x - 1.75, y - 1.75, L.tam + 3.5, L.tam + 3.5);
    c.beginPath(); c.moveTo(mx, py); c.lineTo(mx - 3.5, py + 4); c.lineTo(mx + 3.5, py + 4); c.fill();
    c.restore();
  }
}

// Barra de experiencia del reparto: se llena, y si sube de nivel vuelve a empezar con una flecha al final
function dibujarReparto(c, u, x, y) {
  const a = u.reparto, w = 46, enElTope = a.nivel >= a.tope, frac = enElTope ? 1 : clamp(a.exp / (a.nivel * D.mazmorra.exp_por_nivel), 0, 1);
  c.fillStyle = MARCO.piedra; c.fillRect(x, y, w, 4);
  c.fillStyle = MARCO.fondo; c.fillRect(x + 1, y + 1, w - 2, 2);
  c.fillStyle = MARCO.luz; c.fillRect(x + 1, y + 1, Math.round((w - 2) * frac), 2);
  c.font = '9px "New Rocker", serif'; c.textAlign = 'left'; c.fillStyle = MARCO.luz;
  c.fillText(enElTope ? tr('Nv {0} máx', a.nivel) : `Nv ${a.nivel}`, x, y + 13);
  if (a.nivel > (a.nivel0 ?? (a.nivel0 = a.nivel))) {
    // flecha hacia arriba al final de la barra
    const ax = x + w + 2, ay = y - 1 - Math.round(a.subio * 3);
    c.fillStyle = '#ffd27a';
    c.fillRect(ax + 2, ay, 1, 1); c.fillRect(ax + 1, ay + 1, 3, 1); c.fillRect(ax, ay + 2, 5, 1); c.fillRect(ax + 2, ay + 3, 1, 3);
  }
}

// Cuánto emergió cada enemigo (0..1): entran de a uno
const aparicion = e => clamp((Bt.ini - (0.1 + e.i * 0.14) * Bt.entrada) / (0.3 * Bt.entrada), 0, 1);

// El personaje que juega: su marco titila para encontrarlo de un vistazo
function marcoDeTurno(n, x, y) {
  const p = Math.sin(Bt.t * 9) > 0 ? 1 : 0.15;
  n.save();
  n.strokeStyle = '#ffe9b0'; n.lineWidth = 1.5; n.globalAlpha = p;
  n.shadowColor = '#ff9a3c'; n.shadowBlur = 10 * p;
  n.strokeRect(x - 0.75, y - 0.75, 47.5, 47.5);
  n.restore();
}

// El aliado elegido como objetivo: el marco de su retrato late con esquinas de fuego
function marcoApuntado(n, x, y) {
  const p = 0.5 + 0.5 * Math.sin(Bt.t * 7), f = 1.5 + p * 1.5, l = 9, L = 46 + f * 2, x0 = x - f, y0 = y - f;
  n.save();
  n.strokeStyle = '#ffd27a'; n.shadowColor = '#ff9a3c'; n.shadowBlur = 8 + p * 14;
  n.globalAlpha = 0.45 + p * 0.3; n.lineWidth = 0.75; n.strokeRect(x0, y0, L, L);
  n.globalAlpha = 1; n.lineWidth = 1.5; n.beginPath();
  for (const [cx, cy, sx, sy] of [[x0, y0, 1, 1], [x0 + L, y0, -1, 1], [x0, y0 + L, 1, -1], [x0 + L, y0 + L, -1, -1]]) {
    n.moveTo(cx + sx * l, cy); n.lineTo(cx, cy); n.lineTo(cx, cy + sy * l);
  }
  n.stroke();
  n.restore();
}

function dibujarBatalla(c) {
  const R = RAMPS[S.env], b = Bt.b, tm = SETTINGS.shake ? Bt.temblor : 0;
  const ex = Math.round((azarX() - 0.5) * tm), ey = Math.round((azarX() - 0.5) * tm);
  dibujarEscena(c, ex, ey);
  // lo que da luz o informa va por encima de la oscuridad: llamas, brasas, vida y marca de turno
  for (const [x, y] of ANTORCHAS[S.env] || ANTORCHAS.crypt) drawFlame(c, x, y, 18, 26, Bt.t, 0.75 * clamp(Bt.ini / (Bt.entrada * 0.5), 0, 1), 'fuegoX');
  dibujarParticulas(c);
  for (const e of b.enemigos) {
    if (e.vida <= 0 || aparicion(e) < 1) continue;
    dibujarOjos(c, e);
    dibujarVidaEnemigo(c, e);
    if ((Bt.fase === 'objetivo' && Bt.lista[Bt.tsel] === e) || b.actual === e) {
      // la flecha va sobre la cabeza real del sprite y el nombre arriba de ella
      const y = Math.max(15, FBASE - e.tam + topeVisible(e) - 9);
      const n = capaNitida();
      n.font = '10px "New Rocker", serif'; n.textAlign = 'center';
      n.fillStyle = '#000'; n.fillText(e.nombre, e.x + 0.5, y - 3.5);
      n.fillStyle = R[5]; n.fillText(e.nombre, e.x, y - 4);
      c.fillStyle = R[5];
      if (Math.sin(Bt.t * 8) > -0.4) for (let k = 0; k < 5; k++) c.fillRect(e.x - 4 + k, y + k, 9 - k * 2, 1);
    }
  }
  dibujarFx(c);
  dibujarFxHabilidad(c);
  if (Bt.fase === 'menu' || Bt.fase === 'objetivo') dibujarMenu(c);
  if (Bt.ini >= Bt.entrada * 0.8 && Bt.fase !== 'botin') dibujarLinea(capaNitida());
  // las tarjetas suben desde abajo
  const sube = 1 - clamp((Bt.ini - Bt.entrada * 0.45) / (Bt.entrada * 0.4), 0, 1), bajan = Math.round(sube * sube * 70);
  $('bCards').style.transform = bajan ? tr('translateY({0}px)', bajan) : '';
  $('bLog').style.visibility = Bt.ini < Bt.entrada * 0.8 ? 'hidden' : '';
  for (const u of b.aliados) {
    const marcado = b.actual === u || (Bt.fase === 'objetivo' && Bt.lista[Bt.tsel] === u);
    const x = Math.round(CX[u.i] + (u.golpeado ? Math.sin(Bt.t * 60) * 2 : 0)), y = (marcado ? CY - 3 : CY) + bajan;
    // retrato en su marco
    c.fillStyle = marcado ? MARCO.luz : MARCO.piedra; c.fillRect(x, y, 46, 46);
    c.fillStyle = MARCO.fondo; c.fillRect(x + 1, y + 1, 44, 44);
    const n = capaNitida();
    n.drawImage(retratoX(u.modelo, LADO_RETRATO), x + 1, y + 1, 44, 44);
    if (b.actual === u && Bt.fase !== 'objetivo') marcoDeTurno(n, x, y);
    if (Bt.fase === 'objetivo' && Bt.lista[Bt.tsel] === u) marcoApuntado(n, x, y);
    if (u.vida <= 0) ditherFill(n, x + 1, y + 1, 44, 44, 0.7, R[0]);
    else if (u.golpeado > 0.12) ditherFill(n, x + 1, y + 1, 44, 44, 0.45, '#b52a2a');
    placa(c, x + 48 + (u.sacude ? Math.round(Math.sin(Bt.t * 70)) : 0), y + 15, CW - 48, 9, Math.max(0, u.vida) / u.vidaMax, MARCO.vida, marcado, Math.max(0, u.fantasma ?? u.vida) / u.vidaMax);
    if (Bt.fase === 'botin' && u.reparto) dibujarReparto(n, u, x + 49, y + 27);
    else if (Bt.fase !== 'botin') for (let k = 0; k < NUCLEO.IMP_TOPE; k++) rombo(c, x + 50 + k * 10, y + 26, k < u.impetu);
  }
}

// ---------- Conexión con el bucle del juego base ----------
window.onAction = (act, pad) => {
  if (['skills', 'attrs', 'runes'].includes(act)) return;     // son del juego base
  if (S.mode === 'xbat') return batallaAction(act);
  if (S.mode === 'xcharla') return charlaAction(act);
  if (S.mode === 'xevento') return eventoAction(act);
  if (S.mode === 'xsal') return;
  if (S.mode === 'xpj') return pjAction(act, pad);
  if (S.mode === 'xtrans') { if (act === 'ok' && Tr) Tr.t = Math.max(Tr.t, Tr.cierre + Tr.negro); return; }
  return baseX.onAction(act, pad);
};
window.update = dt => {
  baseX.update(dt);
  if (S.mode === 'xtrans' && Tr) actualizarTransicion(dt);
  if (S.mode === 'xsal' && Sal) actualizarSalida(dt);
  if (S.mode === 'xbat' && Bt) { Bt.t += dt; Bt.ini += dt; for (const u of Bt.b.unidades) u.golpeado = Math.max(0, (u.golpeado || 0) - dt); actualizarFx(dt); actualizarFxHabilidad(dt); }
};
window.draw = () => {
  limpiarCapa();
  if (S.mode === 'xpj') { $('stage').dataset.mode = 'xpj'; dibujarFondoPj(ctx); return; }
  if (S.mode === 'menu' && S.menuBg === 'hogar') { Object.assign($('stage').dataset, { mode: 'menu', bg: 'hogar' }); dibujarHogar(ctx); return; }
  marcoDelPiso();
  if ((S.mode === 'xbat' || S.mode === 'xsal') && Bt) {
    $('stage').dataset.mode = 'battle'; $('stage').dataset.bg = ''; dibujarBatalla(ctx);
    if (Sal) dibujarSalida(capaNitida());
    return;
  }
  // el base marca la antorcha baja con un recuadro en su panel, que acá no existe
  if (!ctx.strokeBase) { ctx.strokeBase = ctx.strokeRect; ctx.strokeRect = function (x, y, w, h) { if (x !== 343.5) this.strokeBase(x, y, w, h); }; }
  baseX.draw();
  if (S.mode === 'xcharla') dibujarCara(ctx);
  if (['explore', 'fade', 'xcharla', 'xtrans', 'xsal'].includes(S.mode)) dibujarAntorcha(ctx);
  if (S.mode === 'xtrans' && Tr) dibujarCierre(ctx);
  if (S.mode === 'xsal' && Sal) { $('stage').dataset.mode = 'explore'; dibujarSalida(capaNitida()); }
};
