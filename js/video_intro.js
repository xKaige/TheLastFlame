'use strict';
// Intro en video: las ocho ilustraciones de interfaz/intro/video_N.png con cámara lenta, llamas que titilan,
// brasas, humo, fundidos a negro y la narración abajo. Se dibuja en su propio lienzo de 1920×1080 encima de todo.
// Si hay voces grabadas en assets/voz/voces.js con las claves video_<escena>_<frase>, suenan en lugar del silencio.

const VIDEO_ESCENAS = [
  // cam: [x, y, zoom] al empezar y al terminar (x, y de 0 a 1 sobre la ilustración)
  { img: 1, dur: 13, cam: [[0.38, 0.5, 1.0], [0.6, 0.45, 1.1]], humo: 0.5, brasas: 0.6,
    lineas: ['Hubo un tiempo en que la noche tenía un final.', 'Bajo la montaña ardía la Primera Llama.', 'Su luz alcanzaba los confines de Vel\'Ombra y mantenía a raya la oscuridad.'] },
  { img: 2, dur: 12, cam: [[0.5, 0.45, 1.0], [0.6, 0.55, 1.18]], brasas: 0.5,
    lineas: ['Durante siglos, las Guardianas la protegieron.', 'No como un tesoro, sino como un deber.', { q: 'La Llama no se toma. Se cuida.' }] },
  { img: 3, dur: 14, cam: [[0.5, 0.35, 1.04], [0.45, 0.55, 1.16]], humo: 0.3,
    lineas: ['Pero el rey Aldemar temía a la muerte.', 'Y ningún juramento podía detener a un hombre que había dejado de temer a los dioses.', 'Descendió bajo la montaña con cuarenta caballeros y el Cazador Gris.'] },
  { img: 4, dur: 10, cam: [[0.55, 0.5, 1.05], [0.65, 0.5, 1.25]], brasas: 1, apaga: 6.2,
    lineas: ['Cuando tocó la Llama...', 'esta se apagó.'], tiempos: [0.8, 5.2] },
  { img: 5, dur: 11, cam: [[0.65, 0.5, 1.12], [0.35, 0.5, 1.04]], humo: 0.8,
    lineas: ['La oscuridad cubrió el reino.', 'No volvió a amanecer.'] },
  { img: 6, dur: 13, cam: [[0.38, 0.55, 1.0], [0.6, 0.45, 1.1]], humo: 1, brasas: 1,
    lineas: ['Desde entonces, las ciudades callaron y los caminos quedaron vacíos.', 'Los últimos supervivientes aprendieron a temer incluso a la luz.'] },
  { img: 7, dur: 11, cam: [[0.32, 0.65, 1.04], [0.48, 0.42, 1.22]], brasas: 1.4,
    lineas: ['Pero dicen que algo quedó.', 'Una chispa.', 'Una última llama.'] },
  { img: 8, dur: 15, cam: [[0.5, 0.55, 1.0], [0.6, 0.38, 1.4]], brasas: 0.4, cierra: [0.585, 0.17],
    lineas: ['Y mientras siga encendida,', 'todavía habrá alguien dispuesto a descender.'] },
];
const VIDEO = { W: 1920, H: 1080, BANDA: [170, 900], FUNDIDO: 1.6, imgs: {}, activo: false };

// Lo cálido de cada ilustración (el fuego), para hacerlo titilar y sacar brasas de ahí
function prepararFuego(img) {
  const w = img.naturalWidth, h = img.naturalHeight, c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d'); g.drawImage(img, 0, 0);
  const d = g.getImageData(0, 0, w, h), px = d.data, puntos = [];
  for (let i = 0; i < w * h; i++) {
    const r = px[i * 4], gg = px[i * 4 + 1], b = px[i * 4 + 2];
    const calor = r > 120 && r > gg * 1.12 && r > b * 1.7 ? Math.min(1, (r - 110) / 120) * Math.min(1, (r - b) / 140) : 0;
    px[i * 4 + 3] = Math.round(calor * 255);
    if (calor > 0.55 && i % 7 === 0) puntos.push([(i % w) / w, Math.floor(i / w) / h]);
  }
  g.putImageData(d, 0, 0);
  // la versión borrosa hace de halo
  const halo = document.createElement('canvas'); halo.width = Math.ceil(w / 6); halo.height = Math.ceil(h / 6);
  const hg = halo.getContext('2d'); hg.imageSmoothingQuality = 'high'; hg.drawImage(c, 0, 0, halo.width, halo.height);
  return { brillo: c, halo, puntos };
}

function cargarVideo() {
  for (const e of VIDEO_ESCENAS) if (!VIDEO.imgs[e.img]) {
    const img = new Image(); img.src = `interfaz/intro/video_${e.img}.png`;
    VIDEO.imgs[e.img] = img;
    img.onload = () => { img.fuego = prepararFuego(img); };
  }
}

function lienzoVideo() {
  let el = $('videoIntro');
  if (el) return el;
  el = document.createElement('div'); el.id = 'videoIntro';
  el.innerHTML = '<canvas width="1920" height="1080"></canvas><div class="vSaltar">Enter avanzar · Esc saltar</div>';
  $('stage').appendChild(el);
  const parar = ev => { ev.stopPropagation(); videoAvanzar(); };
  el.addEventListener('click', parar);
  return el;
}

function verVideoIntro(alTerminar) {
  cargarVideo();
  closeAllMenus && closeAllMenus();
  const el = lienzoVideo();
  el.classList.remove('hidden');
  Object.assign(VIDEO, { activo: true, i: 0, t: 0, total: 0, alTerminar, g: el.querySelector('canvas').getContext('2d'), brasas: [], humo: [], voz: null, dicha: -1, titulo: 0, saliendo: 0, previo: performance.now(), modo: S.mode });
  S.mode = 'title';     // debajo se dibuja el título, quieto; el video lo tapa entero
  setMusic('intro');
  requestAnimationFrame(cuadroVideo);
}

// Enter: siguiente escena · Esc: termina
function videoAvanzar() {
  if (!VIDEO.activo) return;
  if (VIDEO.i >= VIDEO_ESCENAS.length) return terminarVideo();
  const e = VIDEO_ESCENAS[VIDEO.i];
  VIDEO.t = Math.max(VIDEO.t, e.dur - VIDEO.FUNDIDO);
}
function terminarVideo() {
  if (!VIDEO.activo) return;
  VIDEO.activo = false;
  if (VIDEO.voz) VIDEO.voz.pause();
  $('videoIntro').classList.add('hidden');
  S.mode = VIDEO.modo;
  if (VIDEO.alTerminar) VIDEO.alTerminar();
}
addEventListener('keydown', ev => {
  if (!VIDEO.activo) return;
  ev.preventDefault(); ev.stopImmediatePropagation();
  if (ev.repeat) return;
  if (ev.key === 'Escape') terminarVideo();
  else if (ev.key === 'Enter' || ev.key === ' ') videoAvanzar();
}, true);

const suave = k => k * k * (3 - 2 * k);
const ruido = (t, s) => 0.5 + 0.25 * Math.sin(t * 7.1 + s) * Math.sin(t * 3.3 + s * 2) + 0.25 * Math.sin(t * 13.7 + s * 5);

// Cuánto de la ilustración se ve y dónde: llena la banda y se mueve entre los dos puntos de cámara
function encuadre(e, img, k) {
  const [a, b] = e.cam, m = suave(k);
  const x = a[0] + (b[0] - a[0]) * m, y = a[1] + (b[1] - a[1]) * m, z = a[2] + (b[2] - a[2]) * m;
  const [y0, y1] = VIDEO.BANDA, bw = VIDEO.W, bh = y1 - y0;
  const esc = Math.max(bw / img.naturalWidth, bh / img.naturalHeight) * z, w = img.naturalWidth * esc, h = img.naturalHeight * esc;
  const dx = Math.min(0, Math.max(bw - w, bw / 2 - x * w)), dy = y0 + Math.min(0, Math.max(bh - h, bh / 2 - y * h));
  return { dx, dy, w, h };
}

function cuadroVideo(ahora) {
  if (!VIDEO.activo) return;
  const dt = Math.min(0.05, (ahora - VIDEO.previo) / 1000); VIDEO.previo = ahora;
  VIDEO.t += dt; VIDEO.total += dt;
  const g = VIDEO.g, { W, H } = VIDEO;
  g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1;
  g.fillStyle = '#000'; g.fillRect(0, 0, W, H);
  if (VIDEO.i < VIDEO_ESCENAS.length) escenaVideo(g, dt); else tituloVideo(g, dt);
  requestAnimationFrame(cuadroVideo);
}

function escenaVideo(g, dt) {
  const e = VIDEO_ESCENAS[VIDEO.i], img = VIDEO.imgs[e.img], F = VIDEO.FUNDIDO;
  if (!img.complete || !img.naturalWidth) { VIDEO.t = 0; return; }       // esperando que cargue
  const t = VIDEO.t, k = Math.min(1, t / e.dur), r = encuadre(e, img, k), T = VIDEO.total;
  const [y0, y1] = VIDEO.BANDA;
  g.save(); g.beginPath(); g.rect(0, y0, VIDEO.W, y1 - y0); g.clip();
  g.imageSmoothingQuality = 'high';
  // la Llama que se apaga: el fuego se va y la escena cae a oscuras
  const apagado = e.apaga ? suave(Math.min(1, Math.max(0, (t - e.apaga) / 1.2))) : 0;
  g.globalAlpha = 1 - apagado * 0.82;
  g.drawImage(img, r.dx, r.dy, r.w, r.h);
  const f = img.fuego;
  if (f) {
    g.globalCompositeOperation = 'lighter';
    const vivo = (0.18 + 0.22 * ruido(T, e.img)) * (1 - apagado);
    g.globalAlpha = vivo; g.drawImage(f.brillo, r.dx, r.dy, r.w, r.h);
    g.globalAlpha = (0.35 + 0.3 * ruido(T * 0.8, e.img + 3)) * (1 - apagado); g.drawImage(f.halo, r.dx, r.dy, r.w, r.h);
    g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1;
    // brasas que nacen del fuego y suben
    if (e.brasas && f.puntos.length && !apagado) for (let n = 0; n < 2; n++) if (Math.random() < e.brasas * 0.55) {
      const p = f.puntos[Math.floor(Math.random() * f.puntos.length)];
      VIDEO.brasas.push({ x: r.dx + p[0] * r.w, y: r.dy + p[1] * r.h, vx: (Math.random() - 0.3) * 30, vy: -30 - Math.random() * 60, v: 0, max: 2 + Math.random() * 3, s: 1.5 + Math.random() * 2.5 });
    }
  }
  // humo que cruza despacio
  if (e.humo) {
    while (VIDEO.humo.length < 7) VIDEO.humo.push({ x: Math.random() * VIDEO.W, y: y0 + Math.random() * (y1 - y0) * 0.7, r: 260 + Math.random() * 320, vx: 12 + Math.random() * 18, a: Math.random() });
    for (const h of VIDEO.humo) {
      h.x += h.vx * dt; if (h.x - h.r > VIDEO.W) h.x = -h.r;
      const gr = g.createRadialGradient(h.x, h.y, 0, h.x, h.y, h.r);
      gr.addColorStop(0, `rgba(18,14,12,${0.32 * e.humo})`); gr.addColorStop(1, 'rgba(18,14,12,0)');
      g.fillStyle = gr; g.fillRect(h.x - h.r, h.y - h.r, h.r * 2, h.r * 2);
    }
  }
  dibujarBrasas(g, dt);
  // sombras que respiran en los bordes
  const resp = 0.55 + 0.08 * Math.sin(T * 0.7);
  const vi = g.createRadialGradient(VIDEO.W / 2, (y0 + y1) / 2, VIDEO.W * 0.25, VIDEO.W / 2, (y0 + y1) / 2, VIDEO.W * 0.62);
  vi.addColorStop(0, 'rgba(0,0,0,0)'); vi.addColorStop(1, `rgba(0,0,0,${resp})`);
  g.fillStyle = vi; g.fillRect(0, y0, VIDEO.W, y1 - y0);
  // el final: la oscuridad se cierra hasta dejar sólo la antorcha
  if (e.cierra) {
    const c = suave(Math.min(1, Math.max(0, (t - e.dur * 0.35) / (e.dur * 0.55))));
    const cx = r.dx + e.cierra[0] * r.w, cy = r.dy + e.cierra[1] * r.h, rad = VIDEO.W * (1.1 - c * 1.02);
    const os = g.createRadialGradient(cx, cy, Math.max(4, rad * 0.25), cx, cy, Math.max(12, rad));
    os.addColorStop(0, 'rgba(0,0,0,0)'); os.addColorStop(1, 'rgba(0,0,0,1)');
    g.fillStyle = os; g.fillRect(0, y0, VIDEO.W, y1 - y0);
  }
  g.restore();
  // fundidos a negro al entrar y al salir
  const fundido = Math.max(1 - t / F, (t - (e.dur - F)) / F, 0);
  if (fundido > 0) { g.fillStyle = `rgba(0,0,0,${Math.min(1, fundido)})`; g.fillRect(0, 0, VIDEO.W, VIDEO.H); }
  narracion(g, e, t);
  if (t >= e.dur) { VIDEO.i++; VIDEO.t = 0; VIDEO.brasas = []; VIDEO.humo = []; VIDEO.dicha = -1; }
}

function dibujarBrasas(g, dt) {
  g.globalCompositeOperation = 'lighter';
  for (const b of VIDEO.brasas) {
    b.v += dt; b.x += (b.vx + Math.sin(b.v * 3 + b.s) * 25) * dt; b.y += b.vy * dt;
    const a = Math.max(0, 1 - b.v / b.max) * (0.6 + 0.4 * Math.sin(b.v * 20 + b.s));
    g.fillStyle = `rgba(255,${140 + Math.round(60 * a)},60,${a})`;
    g.fillRect(b.x, b.y, b.s, b.s);
    g.fillStyle = `rgba(255,120,40,${a * 0.18})`;
    g.fillRect(b.x - b.s * 2, b.y - b.s * 2, b.s * 5, b.s * 5);
  }
  VIDEO.brasas = VIDEO.brasas.filter(b => b.v < b.max);
  g.globalCompositeOperation = 'source-over';
}

// Las frases se reparten en la escena (o en los tiempos que diga) y aparecen y se van despacio, abajo de la imagen
function narracion(g, e, t) {
  const n = e.lineas.length, ini = e.tiempos || e.lineas.map((_, i) => 1 + i * (e.dur - 2.4) / n);
  let cual = -1;
  for (let i = 0; i < n; i++) if (t >= ini[i]) cual = i;
  if (cual < 0) return;
  if (cual !== VIDEO.dicha) {
    VIDEO.dicha = cual;
    if (VIDEO.voz) VIDEO.voz.pause();
    VIDEO.voz = recordedVoice(`video_${VIDEO.i}_${cual}`);
  }
  const fin = cual + 1 < n ? ini[cual + 1] : e.dur - 0.6, l = e.lineas[cual], texto = tr(typeof l === 'string' ? l : l.q);
  const a = Math.min(1, (t - ini[cual]) / 0.9, (fin - t) / 0.6);
  if (a <= 0) return;
  g.globalAlpha = a; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = typeof l === 'string' ? '46px "New Rocker", serif' : 'italic 52px "New Rocker", serif';
  g.fillStyle = '#000'; g.fillText(texto, VIDEO.W / 2 + 3, 990 + 3, VIDEO.W - 160);
  g.fillStyle = typeof l === 'string' ? '#d8c6a8' : '#f0b060';
  g.fillText(texto, VIDEO.W / 2, 990, VIDEO.W - 160);
  g.globalAlpha = 1;
}

// Negro, y aparece el nombre; las brasas suben despacio
function tituloVideo(g, dt) {
  const t = VIDEO.t, a = Math.min(1, Math.max(0, (t - 1) / 2.2)) * Math.min(1, Math.max(0, (8 - t) / 1.5));
  if (Math.random() < 0.25) VIDEO.brasas.push({ x: VIDEO.W / 2 + (Math.random() - 0.5) * 900, y: 640 + Math.random() * 60, vx: (Math.random() - 0.5) * 20, vy: -20 - Math.random() * 40, v: 0, max: 3 + Math.random() * 3, s: 1.5 + Math.random() * 2 });
  dibujarBrasas(g, dt);
  g.globalAlpha = a; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = '150px "New Rocker", serif';
  g.shadowColor = 'rgba(255,120,40,0.45)'; g.shadowBlur = 30 * (0.8 + 0.2 * ruido(VIDEO.total, 1));
  g.fillStyle = '#e8c890'; g.fillText(tr('La Última Llama'), VIDEO.W / 2, 520);
  g.shadowBlur = 0; g.globalAlpha = 1;
  if (t >= 8.5) terminarVideo();
}
