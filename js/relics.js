'use strict';
// Reliquias y salas secretas.
// Las reliquias son pasivas permanentes de la partida: una ventaja fuerte con una contra.
// No se quitan (a diferencia de las runas). Se encuentran en relicarios, dentro de salas
// secretas detrás de paredes agrietadas que se derrumban a golpes.

const RELICS = {
  corazon: { name: 'Corazón de Brasa', desc: 'Tu fuego te cura un 10% del daño que hace.', cost: 'La antorcha se consume un 15% más rápido.' },
  craneo:  { name: 'Cráneo del Verdugo', desc: 'Doble daño a enemigos con menos del 30% de vida.', cost: '−10% de vida máxima.' },
  ojo:     { name: 'Ojo del Hereje', desc: 'Ves en el mapa a los enemigos cercanos y algo más en la oscuridad.', cost: 'Los enemigos te notan desde más lejos.' },
  moneda:  { name: 'Moneda Funeraria', desc: 'Al morir no pierdes la mochila, solo la experiencia.', cost: 'Cada muerte se cobra una poción.' },
  caliz:   { name: 'Cáliz del Penitente', desc: 'Cada enemigo vencido suma +1 de vida máxima (hasta +20).', cost: 'Las pociones curan la mitad.' },
  // lock: sólo aparecen después de despertarlas en el Altar de la Llama
  lagrima: { name: 'Lágrima de Cera', desc: 'Cada frasco de aceite también te cura un 20% de vida.', cost: 'El aceite aviva menos: +30 en vez de +45.', lock: 'relLagrima' },
  manto:   { name: 'Manto del Ahorcado', desc: '+12% de esquiva.', cost: '−2 de defensa.', lock: 'relManto' },
  dado:    { name: 'Dado de Hueso', desc: 'Tus golpes críticos hacen triple daño.', cost: '−6% de probabilidad de crítico.', lock: 'relDado' },
};
const relicAvailable = id => !RELICS[id].lock || contentUnlocked(RELICS[id].lock);

const hasRelic = id => !!P && !!P.relics && P.relics.includes(id);

function giveRelic(source) {
  P.relics = P.relics || [];
  const left = Object.keys(RELICS).filter(id => relicAvailable(id) && !P.relics.includes(id));
  if (!left.length) return null;
  const id = pick(left), r = RELICS[id];
  P.relics.push(id);
  codexNote('relics', id);
  recalc();
  log(tr('{0}: {1}.', source, r.name), 'em');
  toastQueue.push({ title: r.name, desc: tr('{0} <i>Contra: {1}</i>', r.desc, r.cost), kind: 'Reliquia · permanente en esta partida' });
  nextToast();
  updateHUD();
  checkAchievements();
  return id;
}

// ---------- Salas secretas ----------
// Busca un muro pegado al suelo detrás del cual haya un bloque macizo de 5×5 y talla ahí
// una cámara de 3×3, separada del resto por una sola pared agrietada (wtype 4).
function carveSecret(map, wtype, ents) {
  for (let t = 0; t < 300; t++) {
    const fx = rnd(1, MW - 2), fy = rnd(1, MH - 2);
    // la casilla frente a la pared hueca es la única entrada: no puede tener nada encima
    if (map[fy * MW + fx] !== 0 || ents.some(e => e.x === fx && e.y === fy)) continue;
    const [dx, dy] = pick(DIRS);
    const wx = fx + dx, wy = fy + dy, cx = fx + dx * 3, cy = fy + dy * 3;
    let solid = true;
    for (let y = cy - 2; y <= cy + 2 && solid; y++)
      for (let x = cx - 2; x <= cx + 2; x++)
        if (x < 1 || y < 1 || x > MW - 2 || y > MH - 2 || map[y * MW + x] !== 1) { solid = false; break; }
    if (!solid) continue;
    for (let y = cy - 1; y <= cy + 1; y++) for (let x = cx - 1; x <= cx + 1; x++) map[y * MW + x] = 0;
    wtype[wy * MW + wx] = 4;
    ents.push({ type: 'reliquary', open: false, x: cx, y: cy, vx: cx + 0.5, vy: cy + 0.5 });
    return { x: wx, y: wy, hits: 0, open: false };
  }
  return null;
}

const secretAt = (x, y) => (W_().secrets || []).find(s => !s.open && s.x === x && s.y === y);

// Golpear una pared agrietada: suena hueca, suelta polvo y al tercer golpe se derrumba
function hitSecret(sec) {
  sec.hits++;
  if (sec.hits >= 3 || hasRune('umbral')) {
    sec.open = true;
    W_().map[sec.y * MW + sec.x] = 0;
    sfx('crumble'); fx.shake = 7;
    log('¡La pared se derrumba! Detrás hay una cámara oculta.', 'em');
    reveal();
    return;
  }
  log(sec.hits === 1 ? 'La pared suena hueca.' : 'Se desprenden polvo y piedritas de las grietas.');
}

function openReliquary(r) {
  if (r.open) { log('El relicario está vacío.'); sfx('bump'); return; }
  r.open = true;
  sfx('chest'); later(200, () => sfx('level'));
  if (giveRelic('En el relicario')) return;
  // ya tienes todas: el relicario guarda otra cosa
  if (!giveRune('En el relicario')) giveItem(rollLoot(S.floor, true, S.level), 'En el relicario');
}

// Las reliquias se listan en el menú de runas (no se pueden quitar)
function relicMenuItems() {
  return (P.relics || []).map(id => ({
    label: `✠ ${tr('{0} <small>· reliquia</small>', RELICS[id].name)}`,
    sub: tr('{0} Contra: {1}', RELICS[id].desc, RELICS[id].cost),
    fn: () => { topMenu().msg = 'Las reliquias no se quitan: te acompañan hasta el final.'; renderMenu(); },
  }));
}

// ---------- Dibujos ----------
function drawReliquary(g, open) {
  poly(g, [[16, 40], [48, 40], [48, 61], [16, 61]], 0.62);
  for (const x of [18, 46]) line(g, x, 41, x, 60, 1.6, 0.9);
  line(g, 17, 50, 47, 50, 1, 0.85);
  line(g, 32, 43, 32, 57, 2.4, 0.95); line(g, 26, 48, 38, 48, 2.4, 0.95);
  if (open) {
    poly(g, [[16, 22], [48, 22], [48, 34], [16, 34]], 0.55);
    poly(g, [[17, 34], [47, 34], [47, 40], [17, 40]], 0.04, 0);
    ell(g, 32, 38, 7, 2, 0.4, 0);
  } else {
    poly(g, [[14, 32], [50, 32], [48, 40], [16, 40]], 0.7);
    poly(g, [[20, 32], [32, 24], [44, 32]], 0.66);
    ell(g, 32, 28.6, 2.2, 2.2, 1, 0.6);
  }
}
