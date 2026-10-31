'use strict';
// Metaprogresión: Ceniza, Altar de la Llama (desbloqueos entre partidas) y modificadores de expedición.
// La Ceniza se gana al terminar cada partida y vive en el perfil (PROFILE.ash / PROFILE.unlocks).
// Los desbloqueos dan variedad, no poder bruto. Los modificadores son dificultad opcional que paga más Ceniza.

// ---------- Desbloqueos ----------
// kind: kit (equipo inicial alternativo de una clase) · rune / event (entran en las partidas) · perk (beneficio chico)
const UNLOCKS = {
  kitGuerrero:  { kind: 'kit', cls: 'guerrero', name: 'Juramento del Hacha', cost: 50,
                  desc: 'El Caballero puede empezar con hacha de guerra y pavés.',
                  kit: [['arma', 1], ['pechera', 0], ['casco', 1], ['escudo', 1]] },
  kitPicaro:    { kind: 'kit', cls: 'picaro', name: 'Escuela del Duelista', cost: 50,
                  desc: 'El Pícaro puede empezar con estoque y daga.',
                  kit: [['arma', 0], ['pechera', 0], ['casco', 1], ['escudo', 0]] },
  kitHechicero: { kind: 'kit', cls: 'hechicero', name: 'Cetro y Orbe', cost: 50,
                  desc: 'El Hechicero puede empezar con cetro y orbe.',
                  kit: [['arma', 2], ['pechera', 0], ['casco', 0], ['escudo', 1]] },
  runaRayo:     { kind: 'rune', name: 'Runa del Rayo', cost: 70, desc: 'Puede aparecer en tus partidas: a veces tus golpes descargan un rayo.' },
  runaRey:      { kind: 'rune', name: 'Runa del Rey', cost: 70, desc: 'Puede aparecer en tus partidas: ganas más experiencia.' },
  evCampana:    { kind: 'event', name: 'La Campana Enterrada', cost: 60, desc: 'Un nuevo encuentro en la cripta y el castillo.' },
  evPuerta:     { kind: 'event', name: 'La Puerta que Respira', cost: 60, desc: 'Un nuevo encuentro, en cualquier piso. Puede devolverte una llama.' },
  cinturon:     { kind: 'perk', name: 'Cinturón de Cuero', cost: 40, desc: 'Empiezas cada partida con una poción más.' },
  mecha:        { kind: 'perk', name: 'Mecha Trenzada', cost: 40, desc: 'Empiezas cada partida con un frasco de aceite más.' },
  // fase 2: más variedad
  kitGuerrero2: { kind: 'kit', cls: 'guerrero', name: 'Maza y Escudo Redondo', cost: 50,
                  desc: 'El Caballero puede empezar con maza de armas y escudo redondo.',
                  kit: [['arma', 2], ['pechera', 0], ['casco', 1], ['escudo', 2]] },
  kitPicaro2:   { kind: 'kit', cls: 'picaro', name: 'Sable y Puñal', cost: 50,
                  desc: 'El Pícaro puede empezar con sable y puñal.',
                  kit: [['arma', 1], ['pechera', 0], ['casco', 1], ['escudo', 1]] },
  kitHechicero2:{ kind: 'kit', cls: 'hechicero', name: 'Vara y Grimorio', cost: 50,
                  desc: 'El Hechicero puede empezar con vara y grimorio.',
                  kit: [['arma', 1], ['pechera', 0], ['casco', 0], ['escudo', 0]] },
  runaDestino:  { kind: 'rune', name: 'Runa del Destino', cost: 70, desc: 'Puede aparecer en tus partidas: una vez por nivel, un golpe mortal te deja en pie.' },
  relLagrima:   { kind: 'relic', name: 'Lágrima de Cera', cost: 55, desc: 'Nueva reliquia: el aceite también cura, pero aviva menos.' },
  relManto:     { kind: 'relic', name: 'Manto del Ahorcado', cost: 55, desc: 'Nueva reliquia: más esquiva a cambio de defensa.' },
  relDado:      { kind: 'relic', name: 'Dado de Hueso', cost: 55, desc: 'Nueva reliquia: críticos triples, pero menos frecuentes.' },
  evCaballero:  { kind: 'event', name: 'El Caballero Arrodillado', cost: 60, desc: 'Un nuevo encuentro en el castillo y el fondo.' },
  evNina:       { kind: 'event', name: 'La Niña de la Linterna', cost: 60, desc: 'Un nuevo encuentro, en cualquier piso.' },
  evAtaud:      { kind: 'event', name: 'El Ataúd del Rey sin Nombre', cost: 60, desc: 'Un nuevo encuentro en el castillo y el fondo. Puede darte una ranura de runa.' },
  evReflejo:    { kind: 'event', name: 'El Reflejo que no te Pertenece', cost: 60, desc: 'Un nuevo encuentro en el castillo y el fondo.' },
};
const unlocked = id => !!PROFILE.unlocks[id];
// runas, reliquias y eventos: en la diaria está todo disponible (igual para todos)
const contentUnlocked = id => !!(S.flags && S.flags.daily) || unlocked(id);
// beneficios y equipos del Altar: nunca en la diaria
const perkOn = id => !(S.flags && S.flags.daily) && unlocked(id);
const kitUnlocksOf = cls => Object.keys(UNLOCKS).filter(id => UNLOCKS[id].kind === 'kit' && UNLOCKS[id].cls === cls);

// ---------- Modificadores de expedición ----------
const MODS = {
  agonizante: { name: 'La Llama Agonizante', bonus: 0.5, desc: 'La antorcha se consume un 60% más rápido.' },
  muertos:    { name: 'Los Muertos Recuerdan', bonus: 0.5, desc: 'Los enemigos comunes tienen un 25% más de vida y pegan un 15% más. Los jefes no cambian.' },
  unaLlama:   { name: 'Una Sola Llama', bonus: 0.75, desc: 'Empiezas con una sola llama: la primera muerte es la última.' },
  sombra:     { name: 'La Sombra del Rescoldo', bonus: 0.5, desc: 'Al caer, una sombra con tu forma custodia tu Rescoldo: hay que vencerla para recuperarlo.' },
  ofrenda:    { name: 'La Última Ofrenda', bonus: 0.5, desc: 'Empiezas sin pociones ni aceite, y los cofres nunca guardan pociones.' },
  invertido:  { name: 'El Mundo Invertido', bonus: 0.5, desc: 'La oscuridad te cura y la luz te quema: con la antorcha encendida pierdes vida de a poco.' },
};
const modOn = id => !!(S.flags && S.flags.mods && S.flags.mods.includes(id));
const modsMult = mods => 1 + mods.reduce((n, id) => n + (MODS[id] ? MODS[id].bonus : 0), 0);

// Lo elegido para la próxima expedición; se recuerda en el perfil para no reelegirlo cada vez
// kit: por clase, el id del equipo alternativo elegido (o nada = el de siempre)
const EXP = { mods: [], kit: {}, seed: null, daily: null };
function loadPrep() {
  const p = PROFILE.prep || {};
  EXP.mods = (p.mods || []).filter(id => MODS[id]);
  EXP.kit = { ...(p.kit || {}) };
}
function savePrep() { PROFILE.prep = { mods: EXP.mods.slice(), kit: { ...EXP.kit } }; saveProfile(); }

// Equipo inicial de la clase: el alternativo elegido si sigue despertado
function startKit(cls) {
  if (S.flags && S.flags.daily) return CLASSES[cls].kit;
  const id = EXP.kit[cls];
  return id && UNLOCKS[id] && unlocked(id) ? UNLOCKS[id].kit : CLASSES[cls].kit;
}

// ---------- Ceniza ----------
function ashFor(sum) {
  const parts = [
    ['profundidad', sum.depth * 4], ['jefes', sum.bosses * 15], ['reliquias', sum.relics * 5],
    ['eventos', sum.events * 3], ['criaturas', Math.floor(sum.kills / 2)], ['victoria', sum.won ? 30 : 0],
    ['final', sum.ending ? ENDINGS[sum.ending].bonus : 0],
  ].filter(p => p[1] > 0);
  const base = parts.reduce((n, p) => n + p[1], 0), mult = modsMult(sum.mods || []);
  return { base, mult, total: Math.round(base * mult), parts };
}

// ---------- Preparar la expedición (después de crear el personaje) ----------
function openPrepMenu(onGo) {
  loadPrep();
  const m = { title: tr('Preparar la expedición'), cls: 'altar', items: [] };
  const refresh = () => {
    const mult = modsMult(EXP.mods);
    m.text = tr('Ceniza acumulada: <b>{0}</b>. Los desafíos multiplican la que ganes.', PROFILE.ash);
    m.items = Object.entries(MODS).map(([id, md]) => {
      const on = EXP.mods.includes(id);
      return {
        label: tr('{0} {1} <small>· +{2}% Ceniza</small>', on ? '◆' : '◇', md.name, Math.round(md.bonus * 100)), sub: md.desc,
        fn: () => { EXP.mods = on ? EXP.mods.filter(x => x !== id) : [...EXP.mods, id]; sfx(on ? 'select' : 'pickup'); refresh(); renderMenu(); },
      };
    });
    // Enter recorre los equipos despertados de la clase (y vuelve al de siempre)
    const kits = [null, ...kitUnlocksOf(CR.cls).filter(unlocked)];
    if (kits.length > 1) {
      const cur = kits.includes(EXP.kit[CR.cls]) ? EXP.kit[CR.cls] : null;
      m.items.push({
        label: `${tr('Equipo inicial: {0}', cur ? UNLOCKS[cur].name : tr('el de siempre'))} <small>· ${kits.indexOf(cur) + 1}/${kits.length}</small>`,
        sub: cur ? UNLOCKS[cur].desc : 'Enter para cambiarlo por un equipo despertado en el Altar.',
        fn: () => { EXP.kit[CR.cls] = kits[(kits.indexOf(cur) + 1) % kits.length]; sfx('select'); refresh(); renderMenu(); },
      });
    }
    m.items.push({
      label: tr('Descender ✠'), sub: mult > 1 ? tr('Ganarás Ceniza ×{0}', mult.toFixed(2).replace(/\.?0+$/, '').replace('.', ',')) : 'Sin desafíos: Ceniza normal.',
      fn: () => { savePrep(); closeAllMenus(); onGo(); },
    });
  };
  refresh();
  m.sel = m.items.length - 1;
  openMenu(m, 'title');
}

// ---------- Altar de la Llama (desde el título) ----------
function openAltarMenu() {
  const m = { title: tr('Altar de la Llama'), cls: 'altar', items: [] };
  const refresh = () => {
    const owned = Object.keys(UNLOCKS).filter(unlocked).length;
    m.text = tr('Ceniza: <b>{0}</b> · {1}/{2} despertados. Cada partida, ganes o caigas, deja Ceniza.', PROFILE.ash, owned, Object.keys(UNLOCKS).length);
    m.items = Object.entries(UNLOCKS).map(([id, u]) => {
      const have = unlocked(id), afford = PROFILE.ash >= u.cost;
      return {
        label: `${have ? '✦' : afford ? '◆' : '◇'} ${u.name} <small>· ${have ? tr('despertado') : afford ? tr('{0} de Ceniza', u.cost) : tr('{0} de Ceniza · faltan {1}', u.cost, u.cost - PROFILE.ash)}</small>`,
        sub: u.desc, off: have || !afford,
        fn: () => confirmMenu(tr('¿Despertar {0} por {1} de Ceniza?', u.name, u.cost), () => {
          PROFILE.ash -= u.cost; PROFILE.unlocks[id] = 1; saveProfile(); checkAchievements();
          sfx('level'); refresh(); m.msg = `${u.name} despierta.`; renderMenu();
        }),
      };
    });
  };
  refresh();
  m.sel = Math.max(0, m.items.findIndex(i => !i.off));
  openMenu(m);
}
