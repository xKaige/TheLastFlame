'use strict';
// Opciones del jugador (volumen, temblor, idioma, teclas). Se guardan aparte del perfil.

const SETTINGS_KEY = 'laultimallama.opciones';
const SETTINGS = (() => {
  const base = { master: 0.8, music: 0.7, sfx: 0.9, shake: true, lang: 'es', keys: {}, prompts: 'auto' };
  try { return { ...base, ...JSON.parse(STORE.get(SETTINGS_KEY) || '{}') }; } catch (e) { return base; }
})();
const saveSettings = () => STORE.set(SETTINGS_KEY, JSON.stringify(SETTINGS));
const FIRST_RUN = STORE.get(SETTINGS_KEY) === null;   // sin opciones guardadas: se pregunta el idioma

// Primera vez que se abre el juego: elegir idioma antes del título
function openLanguagePick(then) {
  const choose = lang => { SETTINGS.lang = lang; saveSettings(); applyStaticTr(); closeAllMenus(); then(); };
  openMenu({ title: 'Idioma · Language', back: false, items: [
    { label: 'Español', fn: () => choose('es') },
    { label: 'English', fn: () => choose('en') },
  ] }, 'title');
}

// ---------- Teclas ----------
// Acciones que se pueden reasignar, con su tecla principal por defecto (las flechas siguen funcionando)
const REBINDABLE = [
  ['fwd', 'Avanzar', 'KeyW'], ['back', 'Retroceder', 'KeyS'], ['strafeL', 'Paso a la izquierda', 'KeyA'], ['strafeR', 'Paso a la derecha', 'KeyD'],
  ['turnL', 'Girar a la izquierda', 'KeyQ'], ['turnR', 'Girar a la derecha', 'KeyE'], ['ok', 'Interactuar', 'Enter'],
  ['potion', 'Poción', 'KeyP'], ['oil', 'Aceite', 'KeyO'], ['inv', 'Inventario', 'KeyI'],
  ['skills', 'Habilidades', 'KeyH'], ['attrs', 'Atributos', 'KeyU'], ['runes', 'Runas', 'KeyR'],
];
const keyName = code => ({ ArrowUp: '↑', ArrowDown: '↓', ArrowLeft: '←', ArrowRight: '→', Space: 'Espacio', Enter: 'Enter', Escape: 'Esc', Tab: 'Tab' }[code]
  || code.replace(/^Key/, '').replace(/^Digit/, '').replace(/^Numpad/, 'Num '));
const boundKey = act => SETTINGS.keys[act] || REBINDABLE.find(r => r[0] === act)[2];

// Mapa efectivo: el de fábrica, con las teclas principales cambiadas por las elegidas
function buildKeys(defaults) {
  const map = { ...defaults };
  for (const [act, , def] of REBINDABLE) {
    const code = SETTINGS.keys[act];
    if (!code || code === def) continue;
    if (map[def] === act) delete map[def];
    map[code] = act;
  }
  return map;
}

let REBIND = null;   // acción esperando su tecla nueva
function finishRebind(code) {
  const act = REBIND; REBIND = null;
  const m = topMenu();
  if (code !== 'Escape' && code !== 'F11') {
    // si otra acción usaba esa tecla, se queda con la vieja de esta
    for (const [other] of REBINDABLE) if (other !== act && boundKey(other) === code) SETTINGS.keys[other] = boundKey(act);
    SETTINGS.keys[act] = code;
    saveSettings(); KEYS = buildKeys(KEYMAP);
    if (m) m.msg = tr('Listo.');
  } else if (m) m.msg = tr('Sin cambios.');
  if (m && m.refresh) m.refresh();
  renderMenu();
}

// ---------- Menús ----------
const pct = v => `${Math.round(v * 100)}%`;
function openOptionsMenu(focus) {
  const m = { title: tr('Opciones'), cls: 'altar', items: [], displayPick: null };
  const vol = (key, label) => ({
    get label() { return `${tr(label)} <small>· ◂ ${pct(SETTINGS[key])} ▸</small>`; }, sub: tr('← → para ajustar'),
    adjust: d => { SETTINGS[key] = clamp(Math.round((SETTINGS[key] + d * 0.1) * 10) / 10, 0, 1); saveSettings(); applyVolumes(); sfx('select'); },
    fn() { this.adjust(SETTINGS[key] >= 1 ? -10 : 1); },
  });
  m.refresh = () => {
    m.title = tr('Opciones');
    m.items = [
      vol('master', 'Volumen general'), vol('music', 'Música'), vol('sfx', 'Efectos'),
      { label: `${tr('Temblor de pantalla')} <small>· ${SETTINGS.shake ? tr('sí') : tr('no')}</small>`, sub: tr('Sacudidas al golpear y al recibir golpes.'),
        fn: () => { SETTINGS.shake = !SETTINGS.shake; saveSettings(); m.refresh(); renderMenu(); } },
      (() => {
        // ← → eligen el modo y Enter lo aplica (cambiar de ventana tarda un momento: no se hace al pasar)
        const cur = () => m.displayPick || displayMode();
        const step = d => { const i = DISPLAY_MODES.indexOf(cur()); m.displayPick = DISPLAY_MODES[(i + d + DISPLAY_MODES.length) % DISPLAY_MODES.length]; sfx('select'); m.refresh(); };
        const pending = m.displayPick && m.displayPick !== displayMode();
        return { id: 'display', label: `${tr('Pantalla')} <small>· ◂ ${tr(DISPLAY_LABEL[cur()])} ▸</small>`,
          sub: pending ? tr('Enter para aplicar.') : `${tr(DISPLAY_HELP[cur()])} ${tr('F11 alterna ventana y pantalla completa.')}`,
          adjust: step, fn: () => { setDisplayMode(cur()); m.displayPick = null; m.refresh(); renderMenu(); } };
      })(),
      { label: `${tr('Idioma')} <small>· ${SETTINGS.lang === 'en' ? 'English' : 'Español'}</small>`, sub: 'Español / English',
        fn: () => { SETTINGS.lang = SETTINGS.lang === 'en' ? 'es' : 'en'; saveSettings(); applyStaticTr(); m.refresh(); refreshPrompts(); } },
      (() => {
        // ← → o Enter recorren los estilos; el panel y los menús se redibujan con los iconos elegidos
        const step = d => { const i = PROMPT_ORDER.indexOf(SETTINGS.prompts || 'auto'); SETTINGS.prompts = PROMPT_ORDER[(i + d + PROMPT_ORDER.length) % PROMPT_ORDER.length]; saveSettings(); sfx('select'); m.refresh(); refreshPrompts(); };
        return { label: `${tr('Iconos de botones')} <small>· ${tr(PROMPT_LABEL[SETTINGS.prompts || 'auto'])}</small>`,
          sub: `${tr('Teclado, Xbox o PlayStation. Automático: según lo que estés usando.')} ${glyph('ok', 'kb')} ${glyph('ok', 'xbox')} ${glyph('ok', 'ps')}`,
          adjust: d => step(d), fn: () => step(1) };
      })(),
      { label: tr('Controles'), sub: tr('Cambiar las teclas.'), fn: openControlsMenu },
    ];
    if (STORE.where) m.items.push({ label: tr('Carpeta de guardado'), sub: STORE.where, fn: () => {} });
  };
  m.refresh();
  if (focus) m.sel = Math.max(0, m.items.findIndex(it => it.id === focus));
  openMenu(m);
}

const DISPLAY_HELP = {
  ventana: 'Con bordes; se puede cambiar de tamaño.',
  completa: 'Ocupa todo el monitor, también la barra de tareas.',
  sinBordes: 'Una ventana sin bordes del tamaño del monitor: cambiar de programa es instantáneo.',
};

function openControlsMenu() {
  const m = { title: tr('Controles'), cls: 'altar', items: [] };
  m.refresh = () => {
    const ps = promptStyle() === 'ps' ? 'ps' : 'xbox';
    m.text = `${tr('Enter y luego la tecla nueva. Las flechas siempre funcionan.')}<br>${tr('Mando')}: ${glyph('move', ps)} ${tr('moverse')} · ${glyph('strafeL', ps)}${glyph('strafeR', ps)} ${tr('paso lateral')} · ${glyph('ok', ps)} ${tr('interactuar')} · ${glyph('potion', ps)} ${tr('poción')} · ${glyph('oil', ps)} ${tr('aceite')} · ${glyph('inv', ps)} ${tr('inventario')} · ${glyph('menu', ps)} ${tr('pausa')}`;
    m.items = REBINDABLE.map(([act, label]) => ({
      label: `${tr(label)} <small>· ${REBIND === act ? tr('pulsa una tecla…') : keyName(boundKey(act))}</small>`,
      fn: () => { REBIND = act; m.msg = tr('Pulsa la tecla nueva (Esc cancela).'); m.refresh(); renderMenu(); },
    }));
    m.items.push({ label: tr('Restablecer teclas'), fn: () => { SETTINGS.keys = {}; saveSettings(); KEYS = buildKeys(KEYMAP); m.msg = tr('Teclas de fábrica.'); m.refresh(); renderMenu(); } });
  };
  m.refresh();
  openMenu(m);
}
