'use strict';
// Guardado de partida (STORE: archivos en Electron, localStorage en el navegador)
// y menús genéricos: título, pausa, ranuras, muerte y victoria.

const SAVE_VERSION = 1;
const SAVE_PREFIX = 'laultimallama.save.';
const SLOT_IDS = ['auto', '1', '2', '3'];
const SLOT_LABEL = {
  get auto() { return tr('Autoguardado'); }, get 1() { return tr('Ranura I'); }, get 2() { return tr('Ranura II'); }, get 3() { return tr('Ranura III'); },
};
const AUTOSAVE_STEPS = 30;

// ---------- Serialización ----------
function snapshot() {
  const w = S.world;
  return {
    v: SAVE_VERSION, time: Date.now(), rng: RNG.s,
    meta: { name: P.name, race: P.race, cls: P.cls, lvl: P.lvl, floor: S.floor, level: S.level },
    floor: S.floor, level: S.level, flags: S.flags, steps: S.steps, kills: S.kills, deaths: S.deaths,
    P: JSON.parse(JSON.stringify(P)),
    world: {
      map: Array.from(w.map), wtype: Array.from(w.wtype), secrets: (w.secrets || []).map(s => ({ ...s })), explored: Array.from(w.explored), start: w.start,
      ents: w.ents.map(e => e.type === 'enemy'
        ? { type: 'enemy', kind: e.kind, x: e.x, y: e.y, hp: e.hp, maxhp: e.maxhp, aware: e.aware, stun: e.stun }
        : e.type === 'prop' ? { type: 'prop', p: e.p, x: e.x, y: e.y }
        : e.type === 'event' ? { type: 'event', ev: e.ev, done: e.done, x: e.x, y: e.y }
        : e.type === 'reliquary' ? { type: 'reliquary', open: e.open, x: e.x, y: e.y }
        : e.type === 'merchant' ? { type: 'merchant', x: e.x, y: e.y }
        : e.type === 'bonfire' ? { type: 'bonfire', x: e.x, y: e.y, used: e.used }
        : e.type === 'ember'
          ? { type: 'ember', x: e.x, y: e.y, xp: e.xp, bag: JSON.parse(JSON.stringify(e.bag)) }
          : { type: 'chest', x: e.x, y: e.y, open: e.open }),
    },
    log: logLines.slice(),
  };
}

function restore(d) {
  runId++;
  C = null; anim = null; pending = null;
  for (const id of ['combat', 'inv', 'dialog']) $(id).classList.add('hidden');
  $('stage').classList.remove('talking');
  showScreen(null);
  P = d.P;
  for (const it of [...Object.values(P.equip), ...P.bag]) fixLegacyItem(it);
  for (const e of d.world.ents) if (e.bag) e.bag.forEach(fixLegacyItem);
  S.floor = d.floor; S.level = d.level ?? 1; S.flags = d.flags; S.steps = d.steps; S.kills = d.kills; S.deaths = d.deaths || 0;
  S.lastHit = null;
  if (d.rng !== undefined) RNG.s = d.rng;
  if (S.flags.seed === undefined) S.flags.seed = newSeed();
  // partidas guardadas antes de las llamas y del perfil
  if (P.lives === undefined) P.lives = BAL.lives;
  if (d.world.ents.some(e => e.kind === 'sombraPropia')) buildHeroShade();
  if (P.livesMax === undefined) P.livesMax = Math.max(P.lives, BAL.lives);
  if (!S.flags.runTag) S.flags.runTag = Date.now().toString(36) + rnd(0, 9999);
  S.env = FLOOR_PAL[S.floor];
  setPalette(S.env);
  frameBg = buildFrame(S.env);
  const w = d.world;
  S.world = {
    theme: FLOOR_THEME[S.floor],
    map: Uint8Array.from(w.map), wtype: Uint8Array.from(w.wtype), secrets: w.secrets || [], explored: Uint8Array.from(w.explored), start: w.start,
    ents: w.ents.map(e => ({ ...e, vx: e.x + 0.5, vy: e.y + 0.5, ...(e.type === 'enemy' ? { def: ENEMIES[e.kind] } : {}) })),
  };
  cam.x = P.x + 0.5; cam.y = P.y + 0.5; cam.a = P.dir * Math.PI / 2;
  recalc();
  logLines.length = 0;
  logLines.push(...d.log);
  renderLog();
  updateHUD();
  S.mode = 'explore';
  setMusic(floorMusic());
}

// ---------- Almacenamiento ----------
function readSlot(id) {
  try {
    const raw = STORE.get(SAVE_PREFIX + id);
    if (!raw) return null;
    const d = JSON.parse(raw);
    return d && d.v === SAVE_VERSION ? d : null;
  } catch (e) { return null; }
}

function writeSlot(id) {
  try {
    return STORE.set(SAVE_PREFIX + id, JSON.stringify(snapshot()));
  } catch (e) { return false; }
}

function latestSave() {
  let best = null;
  for (const id of SLOT_IDS) {
    const d = readSlot(id);
    if (d && (!best || d.time > best.d.time)) best = { id, d };
  }
  return best;
}

function autosave(announce) {
  if (!S.world || P.hp <= 0) return;
  if (writeSlot('auto') && announce) log('Partida autoguardada.', 'em');
}

function slotSummary(d) {
  const m = d.meta;
  const when = new Date(d.time).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  const where = tr('Piso {0}-{1}', ROMAN[m.floor], m.level === 0 ? 'Santuario' : m.level === LEVELS_PER_FLOOR ? 'Guarida' : m.level ?? 1);
  return `${m.name} · ${RACES[m.race].name} ${CLASSES[m.cls].name.toLowerCase()} nv ${m.lvl} · ${where} · ${when}`;
}

// ---------- Menú genérico ----------
// Cada menú: { title, items: [{ label, sub, fn, off }], back (false = no se cierra), msg }
const MENU = { stack: [] };

function openMenu(m, bg) {
  if (!MENU.stack.length) { S.menuPrev = S.mode; S.menuBg = bg || 'game'; }
  if (m.sel === undefined) m.sel = Math.max(0, m.items.findIndex(i => !i.off));
  MENU.stack.push(m);
  S.mode = 'menu';
  $('menu').classList.remove('hidden');
  renderMenu();
}

function closeMenu() {
  const m = MENU.stack.pop();
  if (m && m.onClose) m.onClose();
  if (MENU.stack.length) { renderMenu(); return; }
  $('menu').classList.add('hidden');
  S.mode = S.menuPrev;
}

function closeAllMenus() {
  MENU.stack.length = 0;
  $('menu').classList.add('hidden');
}

function topMenu() { return MENU.stack[MENU.stack.length - 1]; }

function menuAction(act) {
  const m = topMenu();
  if (!m) return;
  const n = m.items.length;
  const it = m.items[m.sel];
  if ((act === 'turnL' || act === 'turnR') && it && it.adjust) { it.adjust(act === 'turnR' ? 1 : -1); renderMenu(); return; }
  if (act === 'fwd' || act === 'turnL') { m.sel = (m.sel + n - 1) % n; sfx('select'); }
  else if (act === 'back' || act === 'turnR') { m.sel = (m.sel + 1) % n; sfx('select'); }
  else if (act === 'ok') { activate(m, m.sel); return; }
  else if (act[0] === 'n') { const i = +act[1] - 1; if (i < n) { m.sel = i; activate(m, i); return; } }
  else if (act === 'cancel' && m.back !== false) { sfx('select'); closeMenu(); return; }
  renderMenu();
}

function activate(m, i) {
  const it = m.items[i];
  if (!it || it.off) { sfx('bump'); return; }
  sfx('select');
  m.msg = '';
  it.fn();
}

function renderMenu() {
  const m = topMenu();
  if (!m) return;
  $('menu').className = 'bg-' + S.menuBg + (m.wrap ? ' wrap' : '') + (m.art ? ' with-art' : '') + (m.cls ? ' ' + m.cls : '');
  $('menu').innerHTML =
    (m.title ? `<div class="mtitle">${tr(m.title)}</div>` : '') +
    (m.text ? `<div class="mtext">${glyphText(tr(m.text))}</div>` : '') +
    '<div class="mitems">' + m.items.map((it, i) =>
      `<div class="mopt${i === m.sel ? ' sel' : ''}${it.off ? ' off' : ''}" data-i="${i}">` +
      `<div class="ml">${glyphText(tr(it.label))}</div>${it.sub ? `<div class="ms">${glyphText(tr(it.sub))}</div>` : ''}</div>`).join('') + '</div>' +
    (m.msg ? `<div class="mmsg">${glyphText(tr(m.msg))}</div>` : '') +
    `<div class="mhint">${hintMenu(m.back !== false, m.items.length === 1)}</div>`;
  const box = $('menu').querySelector('.mitems'), sel = box && box.querySelector('.mopt.sel');
  if (sel) {
    if (m.scroll) box.scrollTop = m.scroll;
    if (sel.offsetTop < box.scrollTop) box.scrollTop = sel.offsetTop;
    else if (sel.offsetTop + sel.offsetHeight > box.scrollTop + box.clientHeight) box.scrollTop = sel.offsetTop + sel.offsetHeight - box.clientHeight;
    m.scroll = box.scrollTop;
  }
}

function confirmMenu(title, onYes) {
  openMenu({ title, sel: 1, items: [
    { label: tr('Sí'), fn: () => { closeMenu(); onYes(); } },
    { label: tr('No'), fn: closeMenu },
  ] });
}

// ---------- Menús concretos ----------
function openTitleMenu() {
  closeAllMenus();
  runId++;
  C = null;
  for (const id of ['combat', 'inv', 'dialog']) $(id).classList.add('hidden');
  showScreen(null);
  setPalette('castle');
  setMusic('intro');
  S.mode = 'title';
  const last = latestSave();
  const items = [];
  if (last) items.push({ label: tr('Continuar'), sub: slotSummary(last.d), fn: () => loadFrom(last.id) });
  items.push({ label: tr('Nueva partida'), fn: () => { closeAllMenus(); openCreate(); } });
  items.push({ label: tr('Cargar partida'), fn: () => openLoadMenu(), off: !last });
  items.push({ label: tr('Altar de la Llama'), get sub() { return altarSummary(); }, fn: openAltarMenu });
  items.push({ label: tr('Expedición diaria'), get sub() { return dailySummary(); }, fn: openDailyMenu });
  items.push({ label: tr('Códice'), sub: tr('Bestiario, runas, reliquias, logros, finales y récords'), fn: openCodexMenu });
  items.push({ label: tr('Opciones'), fn: openOptionsMenu });
  if (PRUEBA) items.push({ label: 'Pruebas', sub: 'Ver los finales o saltar al final.', fn: openTestMenu });
  if (/Electron/i.test(navigator.userAgent)) items.push({ label: tr('Salir'), fn: () => window.close() });
  openMenu({ items, back: false, cls: 'compact' }, 'title');
}

function openPauseMenu() {
  openMenu({ title: tr('Pausa'), items: [
    { label: tr('Continuar'), fn: closeMenu },
    { label: tr('Habilidades'), fn: openSkillsMenu },
    { label: tr('Runas'), fn: openRunesMenu },
    { label: `${tr('Atributos')}${P.attrPts ? ` <small>· ${P.attrPts}</small>` : ''}`, fn: openAttrMenu },
    { label: tr('Guardar partida'), fn: openSaveMenu },
    { label: tr('Cargar partida'), fn: openLoadMenu, off: !latestSave() },
    { label: tr('Opciones'), fn: openOptionsMenu },
    { label: tr('Salir al título'), fn: () => confirmMenu(tr('¿Salir? Lo no guardado se pierde.'), openTitleMenu) },
  ] }, 'game');
}

function openSaveMenu() {
  const items = ['1', '2', '3'].map(id => {
    const d = readSlot(id);
    return {
      label: SLOT_LABEL[id], sub: d ? slotSummary(d) : 'Vacía',
      fn: () => {
        const doSave = () => {
          const ok = writeSlot(id);
          closeMenu();
          topMenu().msg = ok ? tr('Partida guardada en {0}.', SLOT_LABEL[id]) : 'No se pudo guardar.';
          if (ok) sfx('pickup');
          renderMenu();
        };
        if (d) confirmMenu(tr('¿Sobrescribir {0}?', SLOT_LABEL[id]), doSave); else doSave();
      },
    };
  });
  openMenu({ title: 'Guardar partida', items });
}

function openLoadMenu() {
  const items = SLOT_IDS.map(id => {
    const d = readSlot(id);
    return { label: SLOT_LABEL[id], sub: d ? slotSummary(d) : 'Vacía', off: !d, fn: () => loadFrom(id) };
  });
  openMenu({ title: 'Cargar partida', items });
}

function loadFrom(id) {
  const d = readSlot(id);
  if (!d) return;
  closeAllMenus();
  audioInit();
  sfx('stairs');
  restore(d);
  log(`Partida cargada (${SLOT_LABEL[id]}).`, 'em');
}

function openEndMenu(won) {
  showScreen(null);
  const seed = S.flags.seed, mods = (S.flags.mods || []).slice(), daily = S.flags.daily;
  openMenu({ title: tr(won ? 'La llama perdura' : 'Tu llama se ha extinguido'), back: false, items: [
    daily
      ? { label: tr('Reintentar la diaria'), sub: tr('Misma semilla, mismos desafíos ({0})', daily), fn: () => { closeAllMenus(); startDaily(); } }
      : { label: tr('Repetir esta semilla'), sub: tr('Los mismos niveles y desafíos · semilla {0}', seedLabel(seed)), fn: () => { closeAllMenus(); EXP.seed = seed; EXP.mods = mods; newGame(); } },
    { label: tr('Nueva partida'), fn: () => { closeAllMenus(); openCreate(); } },
    // con la Ceniza recién ganada, el Altar a mano (al volver de él se queda en el título)
    { label: tr('Altar de la Llama'), sub: tr('{0} de Ceniza para despertar algo nuevo', PROFILE.ash), fn: () => { openTitleMenu(); openAltarMenu(); } },
    { label: tr('Volver al título'), fn: openTitleMenu },
  ] }, 'game');
}

function initMenuUI() {
  $('menu').addEventListener('click', ev => {
    ev.stopPropagation();
    const o = ev.target.closest('.mopt');
    const m = topMenu();
    if (!o || !m) return;
    const i = +o.dataset.i;
    if (i === m.sel) activate(m, i); else { m.sel = i; sfx('select'); renderMenu(); }
  });
}
