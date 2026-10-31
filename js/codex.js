'use strict';
// Códice (bestiario, runas, reliquias, eventos), logros y finales alternativos.
// Todo se guarda en el perfil: se completa a lo largo de muchas partidas.
// Los logros están pensados para convertirse 1 a 1 en logros de Steam.

const FOE_LORE = {
  rata: 'Engordan con lo que dejan los entierros. Nunca andan solas.',
  kobold: 'Mineros que siguieron cavando después de morir.',
  ghoul: 'Tienen hambre desde hace siglos y no recuerdan de qué.',
  cebado: 'Comió lo que nadie se animaba a mirar. Sigue con hambre.',
  sombra: 'Susurran tu nombre para que te des vuelta. Odian el fuego.',
  soplo: 'Un aliento helado sin cuerpo. Apaga antorchas desde lejos.',
  acechador: 'Solo se lo ve con luz fuerte. Cuando lo ves, ya saltó.',
  centinela: 'Guardianes de lápida. Su escudo frena el acero, no el fuego.',
  hueco: 'Armaduras que siguen cumpliendo un juramento olvidado.',
  reyOsario: 'Reinó sobre los huesos de la cripta y no piensa abdicar.',
  cazador: 'Caza a los que bajan con luz. Se alimenta de ella.',
  boss: 'Lo que queda cuando la última llama se apaga.',
  sombraPropia: 'Lo que dejas atrás cada vez que caes. Tiene tu cara.',
};

// ---------- Registro ----------
function codexNote(kind, id, kill) {
  const c = PROFILE.codex;
  if (kind === 'foes') {
    const f = c.foes[id] || (c.foes[id] = { seen: 0, kills: 0 });
    if (kill) f.kills++; else f.seen++;
  } else c[kind][id] = 1;
  saveProfile();
}

// ---------- Logros ----------
const ACHIEVEMENTS = {
  primera:   { name: 'La Llama Perdura', desc: 'Gana una partida.', test: c => c.won },
  intacto:   { name: 'Intacto', desc: 'Gana sin perder ninguna llama.', test: c => c.won && S.deaths === 0 },
  leyenda:   { name: 'Leyenda', desc: 'Gana con tres desafíos activos.', test: c => c.won && (S.flags.mods || []).length >= 3 },
  regicida:  { name: 'Regicida', desc: 'Vence al Rey del Osario.', test: () => !!S.flags.down_reyOsario },
  cazado:    { name: 'El Cazador Cazado', desc: 'Vence al Cazador Gris.', test: () => !!S.flags.down_cazador },
  relicario: { name: 'Relicario Viviente', desc: 'Lleva cinco reliquias en una misma partida.', test: () => (P.relics || []).length >= 5 },
  lapidario: { name: 'Lapidario', desc: 'Encuentra seis runas en una misma partida.', test: () => (P.runes || []).length >= 6 },
  tinieblas: { name: 'Hijo de las Tinieblas', desc: 'Camina 60 pasos a oscuras en una partida.', test: () => (S.flags.darkSteps || 0) >= 60 },
  matarife:  { name: 'Matarife', desc: 'Vence a 100 criaturas en una partida.', test: () => S.kills >= 100 },
  negocio:   { name: 'Buen Negocio', desc: 'Vende diez objetos al Mercader de Huesos.', test: () => (PROFILE.stats.sold || 0) >= 10 },
  devoto:    { name: 'Devoto', desc: 'Despierta todo lo que guarda el Altar.', test: () => Object.keys(UNLOCKS).every(unlocked) },
  caminos:   { name: 'Todos los Caminos', desc: 'Descubre todos los finales.', test: () => Object.keys(ENDINGS).every(id => PROFILE.endings[id]) },
};

// Revisa los logros pendientes; avisa con un cartel los que se acaban de cumplir
function checkAchievements(ctx = {}) {
  if (!P || !S.flags) return;
  let any = false;
  for (const [id, a] of Object.entries(ACHIEVEMENTS)) {
    if (PROFILE.ach[id] || !a.test(ctx)) continue;
    PROFILE.ach[id] = Date.now(); any = true;
    STEAM.achievement(id);
    toastQueue.push({ title: `Logro · ${a.name}`, desc: a.desc, kind: 'Queda registrado en el Códice' });
  }
  if (any) { saveProfile(); nextToast(); }
}

// ---------- Finales ----------
// cond: si no se cumple, la opción aparece apagada con la pista (así se sabe que existe)
const ENDINGS = {
  luz: {
    name: 'La Llama Perdura', label: 'Subir con la llama', bonus: 0,
    sub: 'Cargas la última llama de vuelta a la superficie.',
    text: 'Subes escalón por escalón con la llama en las manos. Arriba, por primera vez en siglos, alguien ve amanecer.',
  },
  trono: {
    name: 'El Nuevo Habitante', label: 'Ocupar el trono vacío', bonus: 10,
    sub: 'Alguien tiene que habitar la oscuridad.',
    text: 'Te sientas donde él se sentaba. La oscuridad te reconoce. Ahora eres tú quien espera que la próxima lucecita baje.',
  },
  relicario: {
    name: 'El Relicario Viviente', label: 'Ofrecer las reliquias a la llama', bonus: 25,
    sub: 'Necesitas llevar cinco reliquias.', cond: () => (P.relics || []).length >= 5,
    text: 'Una a una, las reliquias se funden en la llama. Lo que se apaga no es la luz: es la maldición que la encerraba aquí abajo.',
  },
  leyenda: {
    name: 'La Leyenda', label: 'Volver como leyenda', bonus: 25,
    sub: 'Necesitas haber bajado con tres desafíos.', cond: () => (S.flags.mods || []).length >= 3,
    text: 'Bajaste con todo en contra y volviste igual. En las aldeas de arriba, tu nombre se dice en voz baja, como una plegaria.',
  },
};

function openEndingMenu() {
  sfx('whisper');
  openMenu({
    title: 'Y ahora…', text: 'La oscuridad cae a tus pies. La llama espera lo que decidas.', back: false, wrap: true,
    items: Object.entries(ENDINGS).map(([id, e]) => {
      const ok = !e.cond || e.cond();
      return { label: `${PROFILE.endings[id] ? '✦ ' : ''}${e.label}`, sub: ok ? e.sub : `${e.sub}`, off: !ok, fn: () => { closeAllMenus(); setPalette(S.env); playEnding(id, () => { setPalette(S.env); winGame(id); }, partyHero()); } };
    }),
  }, 'game');
}

// ---------- Menú del Códice (desde el título) ----------
function openCodexMenu() {
  const c = PROFILE.codex;
  const count = (obj, all) => `${Object.keys(all).filter(id => obj[id]).length}/${Object.keys(all).length}`;
  openMenu({ title: tr('Códice'), cls: 'altar', text: 'Lo que fuiste descubriendo, partida tras partida.', items: [
    { label: `${tr('Bestiario')} <small>· ${count(c.foes, ENEMIES)}</small>`, sub: 'Las criaturas que encontraste y cuántas venciste.', fn: openBestiary },
    { label: `${tr('Runas')} <small>· ${count(c.runes, RUNES)}</small>`, sub: 'Las piedras talladas que tuviste en la mano.', fn: () => openCodexList('Runas', RUNES, c.runes, r => r.desc, r => r.lock) },
    { label: `${tr('Reliquias')} <small>· ${count(c.relics, RELICS)}</small>`, sub: 'Ventajas con su contra.', fn: () => openCodexList('Reliquias', RELICS, c.relics, r => tr('{0} Contra: {1}', r.desc, r.cost), r => r.lock) },
    { label: `${tr('Encuentros')} <small>· ${count(c.events, EVENTS)}</small>`, sub: 'Los que se cruzaron en tu camino.', fn: () => openCodexList('Encuentros', EVENTS, c.events, e => e.intro, e => e.lock, e => e.name) },
    { label: `${tr('Logros')} <small>· ${count(PROFILE.ach, ACHIEVEMENTS)}</small>`, sub: 'Hazañas que quedan registradas.', fn: () => openCodexList('Logros', ACHIEVEMENTS, PROFILE.ach, a => a.desc, null, a => a.name, true) },
    { label: `${tr('Finales')} <small>· ${count(PROFILE.endings, ENDINGS)}</small>`, sub: 'Cómo puede terminar todo. Enter para volver a verlo.', fn: () => openCodexList('Finales', ENDINGS, PROFILE.endings, e => e.text, null, e => e.name, false, replayEnding) },
    { label: `${tr('Récords')} <small>· ${PROFILE.scores.length ? PROFILE.scores[0].score.toLocaleString('es-AR') : tr('ninguno')}</small>`, sub: 'Tus diez mejores expediciones.', fn: openScoresMenu },
  ] });
}

// Lista genérica: lo descubierto con su texto; lo demás en ??? (con pista si espera al Altar)
function openCodexList(title, all, known, text, lockOf, nameOf = x => x.name, showGoal = false, onPick = null) {
  const items = Object.entries(all).map(([id, x]) => {
    const has = !!known[id];
    const lock = lockOf && lockOf(x);
    return {
      label: has ? `✦ ${nameOf(x)}` : showGoal ? `◇ ${nameOf(x)}` : '◇ ???',
      sub: has ? text(x) : showGoal ? text(x) : lock && !unlocked(lock) ? 'Todavía duerme en el Altar de la Llama.' : 'Aún no lo encontraste.',
      fn: has && onPick ? () => onPick(id) : () => {},
    };
  });
  openMenu({ title, cls: 'altar', items });
}

// Volver a ver un final desde el Códice: al terminar se vuelve a la lista
function replayEnding(id) {
  const sel = Object.keys(ENDINGS).indexOf(id);
  closeAllMenus();
  playEnding(id, () => {
    openTitleMenu(); openCodexMenu();
    topMenu().sel = 5; activate(topMenu(), 5);
    topMenu().sel = sel; renderMenu();
  }, codexHero(id));
}

function openBestiary() {
  const c = PROFILE.codex.foes;
  const items = Object.entries(ENEMIES).map(([id, d]) => {
    const f = c[id];
    if (!f) return { label: '◇ ???', sub: 'Aún no te cruzaste con esto.', fn: () => {} };
    const traits = [d.boss ? 'jefe' : '', d.fearsFire ? 'teme al fuego' : '', d.drain || d.blows ? 'roba luz de tu antorcha' : '', d.lurk ? 'embosca' : '', d.shield ? 'alza un escudo' : '']
      .filter(Boolean).map(t => tr(t)).join(', ');
    return {
      label: `✦ ${d.name} <small>· vencidos ${f.kills}</small>`,
      sub: `${FOE_LORE[id] || ''} ${tr('Vida base {0} · golpe {1}–{2}', d.hp, d.atk[0], d.atk[1])}${traits ? ` · ${traits}` : ''}.`,
      fn: () => {},
    };
  });
  openMenu({ title: tr('Bestiario'), cls: 'altar', items });
}
