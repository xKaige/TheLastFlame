'use strict';
// Traducción. Los textos se escriben en español; en inglés se buscan en EN (js/i18n-en.js).
// Lo que no está en EN queda en español: así se puede traducir de a poco sin romper nada.
// Frases con valores: tr('Te quedan {0} llamas', 2). Los valores de texto también se traducen
// (un nombre de enemigo o de runa llega traducido sin repetir cada combinación).
// Los mensajes, menús, diálogos y carteles se traducen solos al mostrarse; las tablas de datos
// (razas, enemigos, runas...) se vuelven traducibles con localizeAll() al arrancar.

const EN = {
  // título y menús generales
  'Continuar': 'Continue', 'Nueva partida': 'New game', 'Cargar partida': 'Load game', 'Guardar partida': 'Save game', 'Salir': 'Quit',
  'Altar de la Llama': 'Altar of the Flame', 'Códice': 'Codex', 'Expedición diaria': 'Daily expedition', 'Opciones': 'Options',
  'Bestiario, runas, reliquias, logros, finales y récords': 'Bestiary, runes, relics, achievements, endings and records',
  'Pausa': 'Pause', 'Habilidades': 'Skills', 'Runas': 'Runes', 'Atributos': 'Attributes', 'Salir al título': 'Quit to title',
  '¿Salir? Lo no guardado se pierde.': 'Quit? Unsaved progress is lost.', 'Sí': 'Yes', 'No': 'No',
  'Autoguardado': 'Autosave', 'Ranura I': 'Slot I', 'Ranura II': 'Slot II', 'Ranura III': 'Slot III', 'Vacía': 'Empty',
  '↑↓ elegir · Enter aceptar': '↑↓ select · Enter accept', ' · Esc volver': ' · Esc back',
  'Nueva partida ': 'New game ', 'Volver al título': 'Back to title', 'Repetir esta semilla': 'Replay this seed', 'Reintentar la diaria': 'Retry the daily',
  'La llama perdura': 'The flame endures', 'Tu llama se ha extinguido': 'Your flame has gone out',
  // opciones y controles
  'Volumen general': 'Master volume', 'Música': 'Music', 'Efectos': 'Effects', '← → para ajustar': '← → to adjust',
  'Temblor de pantalla': 'Screen shake', 'sí': 'on', 'no': 'off', 'Sacudidas al golpear y al recibir golpes.': 'Shaking when you hit or get hit.',
  'Pantalla completa': 'Fullscreen', 'Idioma': 'Language',
  'Controles': 'Controls', 'Cambiar las teclas.': 'Change the keys.', 'Carpeta de guardado': 'Save folder',
  'Enter y luego la tecla nueva. Las flechas siempre funcionan. Mando: D-pad para moverte, LB/RB paso lateral, A interactuar, X poción, Y aceite, B/Start pausa.':
    'Enter, then the new key. Arrow keys always work. Gamepad: D-pad to move, LB/RB strafe, A interact, X potion, Y oil, B/Start pause.',
  'Avanzar': 'Move forward', 'Retroceder': 'Move back', 'Paso a la izquierda': 'Strafe left', 'Paso a la derecha': 'Strafe right',
  'Girar a la izquierda': 'Turn left', 'Girar a la derecha': 'Turn right', 'Interactuar': 'Interact', 'Poción': 'Potion', 'Aceite': 'Oil',
  'Inventario': 'Inventory', 'pulsa una tecla…': 'press a key…', 'Pulsa la tecla nueva (Esc cancela).': 'Press the new key (Esc cancels).',
  'Restablecer teclas': 'Reset keys', 'Teclas de fábrica.': 'Default keys.', 'Listo.': 'Done.', 'Sin cambios.': 'No change.',
  // panel
  'Vida': 'Life', 'Antorcha': 'Torch', 'Antorcha baja': 'Torch low', 'A oscuras': 'In darkness', 'Exp': 'XP', 'Mochila': 'Bag', 'Libro': 'Book',
  'Mapa': 'Map', 'Piso': 'Floor', 'Guarida': 'Lair', 'Santuario': 'Sanctuary', 'Nv': 'Lv',
  // combate
  'Atacar': 'Attack', 'Defender': 'Defend', 'Quemar': 'Burn', 'Huir': 'Flee', 'Tu turno': 'Your turn', 'Turno enemigo': 'Enemy turn',
  '¡Prepara un golpe!': 'Winding up!', 'Escudo alzado': 'Shield raised', 'Aturdido': 'Stunned', 'Teme al fuego': 'Fears fire', 'Jefe': 'Boss',
  // epitafio
  'nivel': 'level', 'criaturas': 'creatures', 'jefes': 'bosses', 'reliquias': 'relics', 'runas': 'runes', 'eventos': 'events',
  'muertes': 'deaths', 'pasos': 'steps', 'profundidad': 'depth', 'Puntuación': 'Score', 'Enter para continuar': 'Enter to continue',
  // creación de personaje e inventario
  'Forja tu leyenda': 'Forge your legend', 'Nombre': 'Name', 'Raza': 'Race', 'Clase': 'Class', 'Descender a la cripta ✠': 'Descend into the crypt ✠',
  '↑↓ elegir · ←→ cambiar · Enter confirmar · Esc volver': '↑↓ select · ←→ change · Enter confirm · Esc back',
  'Un descenso a la Cripta de Vel’Ombra': 'A descent into the Crypt of Vel’Ombra', 'Equipo': 'Equipment', 'Consumibles': 'Consumables',
  'Enter avanzar · Esc saltar': 'Enter next · Esc skip',
  'WASD / flechas: moverse · Q E: girar · Enter: interactuar · I: inventario · P: poción · O: aceite · F11: pantalla completa':
    'WASD / arrows: move · Q E: turn · Enter: interact · I: inventory · P: potion · O: oil · F11: fullscreen',
  // metaprogresión
  'Preparar la expedición': 'Prepare the expedition', 'Descender ✠': 'Descend ✠', 'Bestiario': 'Bestiary', 'Reliquias': 'Relics',
  'Encuentros': 'Encounters', 'Logros': 'Achievements', 'Finales': 'Endings', 'Récords': 'Records', 'Despedirte': 'Leave',
  'El Mercader de Huesos': 'The Bone Merchant', 'Vender equipo': 'Sell equipment',
};

function tr(s, ...vals) {
  if (typeof s !== 'string') return s;
  let out = (SETTINGS.lang === 'en' && EN[s]) || s;
  vals.forEach((v, i) => { out = out.split(`{${i}}`).join(typeof v === 'string' ? tr(v) : v); });
  return out;
}

// Campos de texto de una tabla de datos → se leen ya traducidos (las funciones, sobre su resultado)
function localize(obj, fields) {
  for (const f of fields) {
    if (!(f in obj)) continue;
    const v = obj[f];
    if (typeof v === 'string') Object.defineProperty(obj, f, { get: () => tr(v), enumerable: true, configurable: true });
    else if (typeof v === 'function') { const fn = v; obj[f] = (...a) => tr(fn(...a)); }
  }
}
const localizeAllIn = (table, fields) => { for (const o of Object.values(table)) localize(o, fields); };
// mapa o lista de textos sueltos (SLOT_NAME, TIER_NAME, FOE_LORE...)
function localizeMap(map) {
  for (const k of Object.keys(map)) { const v = map[k]; if (typeof v === 'string') Object.defineProperty(map, k, { get: () => tr(v), enumerable: true, configurable: true }); }
}

// Textos fijos del HTML: se marcan con data-tr y se reescriben al cambiar de idioma
function applyStaticTr() {
  for (const el of document.querySelectorAll('[data-tr]')) el.textContent = tr(el.dataset.tr);
  document.documentElement.lang = SETTINGS.lang;
}
