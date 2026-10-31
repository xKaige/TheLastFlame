'use strict';
// Iconos de botones: teclado, Xbox o PlayStation, dibujados con la paleta del juego.
// SETTINGS.prompts: 'auto' (según lo último que usaste), 'kb', 'xbox' o 'ps'.
// glyph('potion') devuelve el icono de esa acción; glyphText() cambia [O], [Enter]... en los textos.

const INPUT = { last: 'kb', pad: 'xbox' };
const promptStyle = () => (SETTINGS.prompts && SETTINGS.prompts !== 'auto' ? SETTINGS.prompts : INPUT.last === 'pad' ? INPUT.pad : 'kb');

// botón del mando para cada acción (coincide con PADMAP en game.js)
const PAD_BTN = {
  ok: 'a', cancel: 'b', potion: 'x', drop: 'x', oil: 'y', inv: 'view', strafeL: 'lb', strafeR: 'rb',
  move: 'dpad', fwd: 'dpad', back: 'dpad', turnL: 'dpad', turnR: 'dpad', change: 'dpad',
  menu: 'start', skills: 'start', attrs: 'start', runes: 'start',
};
// teclas que no se reasignan
const KB_FIXED = { cancel: 'Escape', menu: 'Escape', drop: 'KeyX', move: '↑↓', change: '←→' };

const SVG = d => `<svg viewBox="0 0 10 10">${d}</svg>`;
const PS_FACE = {
  a: SVG('<path d="M2.7 2.7l4.6 4.6M7.3 2.7L2.7 7.3"/>'),        // cruz
  b: SVG('<circle cx="5" cy="5" r="2.6"/>'),                        // círculo
  x: SVG('<rect x="2.8" y="2.8" width="4.4" height="4.4"/>'),       // cuadrado
  y: SVG('<path d="M5 2.3L7.7 7.1H2.3z"/>'),                        // triángulo
};
const DPAD = SVG('<path class="f" d="M3.7 .8h2.6v2.9h2.9v2.6H6.3v2.9H3.7V6.3H.8V3.7h2.9z"/>');
const XB_MENU = SVG('<path d="M2.6 3.2h4.8M2.6 5h4.8M2.6 6.8h4.8"/>');
const XB_VIEW = SVG('<rect x="2" y="2.2" width="4" height="3.4"/><rect x="4" y="4.4" width="4" height="3.4"/>');

function glyph(action, st = promptStyle()) {
  if (st === 'kb') {
    const k = KB_FIXED[action] || (REBINDABLE.some(r => r[0] === action) ? boundKey(action) : action);
    return k.length <= 2 && /[↑↓←→]/.test(k) ? `<span class="k arrows">${k}</span>` : `<span class="k">${keyName(k)}</span>`;
  }
  const b = PAD_BTN[action] || 'a';
  if (b === 'dpad') return `<span class="pg pad">${DPAD}</span>`;
  if (b === 'lb' || b === 'rb') return `<span class="pg bump">${st === 'ps' ? (b === 'lb' ? 'L1' : 'R1') : b.toUpperCase()}</span>`;
  if (b === 'start') return st === 'ps' ? '<span class="pg bump">OPTIONS</span>' : `<span class="pg face">${XB_MENU}</span>`;
  if (b === 'view') return st === 'ps' ? '<span class="pg bump">SHARE</span>' : `<span class="pg face">${XB_VIEW}</span>`;
  return st === 'ps' ? `<span class="pg face ps">${PS_FACE[b]}</span>` : `<span class="pg face xb">${b.toUpperCase()}</span>`;
}

// [O] [I] [U] [R] [H] [P] [Enter] [Esc] dentro de un texto → el icono que corresponde
const TOKEN_ACTION = { O: 'oil', I: 'inv', U: 'attrs', R: 'runes', H: 'skills', P: 'potion', Enter: 'ok', Esc: 'cancel' };
const glyphText = s => (typeof s === 'string' ? s.replace(/\[(O|I|U|R|H|P|Enter|Esc)\]/g, (m, t) => glyph(TOKEN_ACTION[t])) : s);

// Las ayudas de una línea, armadas con iconos
// con una sola opción no hay nada que elegir
const hintMenu = (back, single) => `${single ? '' : `${glyph('move')} ${tr('elegir')} · `}${glyph('ok')} ${tr('aceptar')}${back ? ` · ${glyph('cancel')} ${tr('volver')}` : ''}`;

// ---------- Qué se usó último: teclado o mando (y cuál) ----------
function noteInput(kind, padId) {
  const pad = padId ? (/054c|playstation|dualshock|dualsense|sony/i.test(padId) ? 'ps' : 'xbox') : INPUT.pad;
  if (INPUT.last === kind && INPUT.pad === pad) return;
  INPUT.last = kind; INPUT.pad = pad;
  refreshPrompts();
}

// Redibuja lo que muestra botones cuando cambia el estilo
function refreshPrompts() {
  const st = promptStyle();
  const stage = document.getElementById('stage');
  stage.classList.toggle('pad', st !== 'kb');
  const t4 = stage.querySelector('#title .t4');
  if (t4) t4.innerHTML = st === 'kb' ? tr(t4.dataset.kb)
    : `${glyph('move')} ${tr('moverse')} · ${glyph('strafeL')}${glyph('strafeR')} ${tr('paso lateral')} · ${glyph('ok')} ${tr('interactuar')} · ${glyph('inv')} ${tr('inventario')} · ${glyph('potion')} ${tr('poción')} · ${glyph('oil')} ${tr('aceite')} · ${glyph('menu')} ${tr('pausa')}`;
  const ch = stage.querySelector('#create .chint');
  if (ch) ch.innerHTML = `${glyph('move')} ${tr('elegir')} · ${glyph('change')} ${tr('cambiar')} · ${glyph('ok')} ${tr('confirmar')} · ${glyph('cancel')} ${tr('volver')}`;
  const ci = document.getElementById('cineHint');
  if (ci) ci.innerHTML = `${glyph('ok')} ${tr('avanzar')} · ${glyph('cancel')} ${tr('saltar')}`;
  if (typeof P !== 'undefined' && P && S.world) updateHUD();
  if (typeof renderLog === 'function') renderLog();
  if (MENU.stack.length) renderMenu();
  if (C) renderCombatMenu();
  if (S.mode === 'inv') renderInv();
  const dh = document.querySelector('#dialog .hint');
  if (dh) dh.innerHTML = `— ${glyph('ok')} —`;
}

const PROMPT_LABEL = { auto: 'Automático', kb: 'Teclado', xbox: 'Xbox', ps: 'PlayStation' };
const PROMPT_ORDER = ['auto', 'kb', 'xbox', 'ps'];
