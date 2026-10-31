'use strict';
// Traducción. Los textos se escriben en español y cada idioma los busca en su archivo de datos/idiomas.
// Lo que falta queda en español: así se puede traducir de a poco sin romper nada.
// Frases con valores: tr('Te quedan {0} llamas', 2). Los valores de texto también se traducen
// (un nombre de enemigo o de runa llega traducido sin repetir cada combinación).
// Los mensajes, menús, diálogos y carteles se traducen solos al mostrarse; las tablas de datos
// (razas, enemigos, runas...) se vuelven traducibles con localizeAll() al arrancar.

// Un archivo por idioma en datos/idiomas (clave: el texto en español). Ver tools/textos_faltantes.js.
function leerIdioma(archivo) {
  const x = new XMLHttpRequest();
  x.open('GET', `datos/idiomas/${archivo}.json`, false); x.send();
  return JSON.parse(x.responseText);
}
const IDIOMAS = leerIdioma('lista'), TRADUCCION = {};
for (const { id } of IDIOMAS) if (id !== 'es') TRADUCCION[id] = leerIdioma(id);

function tr(s, ...vals) {
  if (typeof s !== 'string') return s;
  const t = TRADUCCION[SETTINGS.lang];
  let out = (t && t[s]) || s;
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
