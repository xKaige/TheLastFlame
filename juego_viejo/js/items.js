'use strict';
// Razas, clases, equipo y botín

const RACES = {
  humano:  { name: 'Humano', desc: 'Versátil y ambicioso. +1 ataque y +10% de experiencia.', atk: 1, xp: 1.1 },
  enano:   { name: 'Enano', desc: 'Robusto y hecho a la penumbra. +6 vida, +1 defensa, ve algo sin antorcha.', hp: 6, def: 1, dark: true, scale: 0.84 },
  elfo:    { name: 'Elfo', desc: 'Preciso y frugal. +8% de crítico y su antorcha dura más.', crit: 0.08, fuel: 0.75 },
  mediano: { name: 'Mediano', desc: 'Pequeño y escurridizo. +10% de esquiva y huye con facilidad.', dodge: 0.1, flee: 0.25, scale: 0.74 },
};

const CLASSES = {
  // kit: equipo inicial como [ranura, variante]
  guerrero:  { name: 'Caballero', weight: 'pesada', hp: 28, hpLvl: 7, atk: 3, def: 0,
               kit: [['arma', 0], ['pechera', 0], ['casco', 1], ['escudo', 0]],
               desc: 'Juramentado de la cruz. Acero, escudo y paciencia.', diff: 'Fácil' },
  picaro:    { name: 'Pícaro', weight: 'media', hp: 24, hpLvl: 7, atk: 2, def: 0, crit: 0.12,
               kit: [['arma', 2], ['pechera', 0], ['casco', 1], ['escudo', 0]],
               desc: 'Sombra entre sombras. Vive de los golpes críticos.', diff: 'Exigente' },
  hechicero: { name: 'Hechicero', weight: 'liviana', hp: 22, hpLvl: 6, atk: 1, def: 0, fireMul: 1.3,
               kit: [['arma', 0], ['pechera', 0], ['casco', 0]],
               desc: 'Pacto con el fuego. Su llama quema más que ninguna.', diff: 'Media' },
};

const WEIGHT_NAME = { pesada: 'Pesada', media: 'Media', liviana: 'Liviana' };
const WEIGHT_CLASS = { pesada: 'Caballero', media: 'Pícaro', liviana: 'Hechicero' };
const TIER_NAME = ['Común', 'Fina', 'Antigua'];
const SLOTS = ['arma', 'escudo', 'casco', 'pechera', 'botas'];
const SLOT_NAME = { arma: 'Arma', escudo: 'Mano izq.', casco: 'Casco', pechera: 'Pechera', botas: 'Botas' };
const BAG_MAX = 10;

const ITEM_BASE = {
  pesada:  { arma: ['Mandoble', 'Hacha de guerra', 'Maza de armas'], escudo: ['Escudo de cometa', 'Pavés', 'Escudo redondo'],
             casco: ['Yelmo', 'Gran yelmo'], pechera: ['Coraza', 'Cota de placas'], botas: ['Grebas', 'Escarpes'] },
  media:   { arma: ['Estoque', 'Sable', 'Daga larga'], escudo: ['Daga', 'Puñal'],
             casco: ['Almófar', 'Capucha de cazador'], pechera: ['Cota de malla', 'Jubón tachonado'], botas: ['Botas altas', 'Botas de montar'] },
  liviana: { arma: ['Báculo', 'Vara', 'Cetro'], escudo: ['Grimorio', 'Orbe'],
             casco: ['Capucha', 'Diadema'], pechera: ['Túnica', 'Hábito'], botas: ['Sandalias', 'Zapatos de tela'] },
};
// material según la calidad (Común, Fina, Antigua): el de la ropa y la armadura...
const ITEM_SUFFIX = {
  pesada:  ['de hierro', 'de acero negro', 'de Vel’Ombra'],
  media:   ['de cuero', 'del osario', 'del Cazador Gris'],
  liviana: ['de lino', 'de hueso', 'del Archimago'],
};
// ...y el de las armas y los focos del hechicero: empiezan en piedra o hueso y van subiendo
// (el cuero y el lino son sólo para la ropa)
const WEAPON_SUFFIX = {
  pesada:  ['de piedra', 'de hierro', 'de Vel’Ombra'],
  media:   ['de hueso', 'de hierro', 'del Cazador Gris'],
  liviana: ['de hueso', 'de plata', 'del Archimago'],
};
// la mano izquierda del Pícaro y del Hechicero también lleva material de arma (daga, grimorio, orbe)
const usesWeaponMat = (slot, weight) => slot === 'arma' || (slot === 'escudo' && weight !== 'pesada');
function itemSuffix(slot, weight, tier, en) {
  if (usesWeaponMat(slot, weight)) return (en ? WEAPON_SUFFIX_EN : WEAPON_SUFFIX)[weight][tier];
  return (en ? ITEM_SUFFIX_EN : ITEM_SUFFIX)[weight][tier];
}

// ---------- Segunda daga (Pícaro) ----------
// El Pícaro no usa escudo: en la mano izquierda lleva una daga. Al Atacar remata con un segundo golpe
// que hace una parte del daño común, más cuanto mejor es la daga (Común, Fina, Antigua).
const DUAL_PCT = [[0.2, 0.35], [0.25, 0.45], [0.35, 0.5]];
const isOffDagger = it => !!it && it.slot === 'escudo' && it.weight === 'media';
// partidas guardadas antes de las dagas: el broquel o la rodela pasan a ser daga o puñal, sin defensa
function fixLegacyItem(it) { if (isOffDagger(it)) delete it.def; return it; }

const AFFIX = {
  hp:    { roll: t => 3 + t * 3, label: v => tr('Vida +{0}', v) },
  def:   { roll: t => t, label: v => tr('Defensa +{0}', v) },
  crit:  { roll: t => +(0.015 + t * 0.02).toFixed(3), label: v => tr('Crítico +{0}%', Math.round(v * 100)) },
  dodge: { roll: t => +(0.015 + t * 0.02).toFixed(3), label: v => tr('Esquiva +{0}%', Math.round(v * 100)) },
  power: { roll: t => 1 + t * 2, label: v => tr('Poder +{0}', v) },
  fuel:  { roll: t => +(0.06 + t * 0.07).toFixed(2), label: v => tr('Consumo de antorcha −{0}%', Math.round(v * 100)) },
};
const AFFIX_POOL = { pesada: ['hp', 'def'], media: ['crit', 'dodge'], liviana: ['power', 'fuel'] };

// v = variante de la base (decide cómo se dibuja en el retrato)
function makeItem(slot, weight, tier, v) {
  const bases = ITEM_BASE[weight][slot];
  if (v === undefined) v = rnd(0, bases.length - 1);
  const it = { slot, weight, tier, v, name: `${bases[v]} ${itemSuffix(slot, weight, tier)}` };
  if (slot === 'arma') {
    it.atk = { pesada: 3, media: 2, liviana: 1 }[weight] + tier * 2 + rnd(0, 1);
    if (weight === 'liviana') it.power = 1 + tier * 2;
  } else {
    const base = { casco: 0.5, pechera: 1, botas: 0.5, escudo: 0.75 }[slot] * { pesada: 1.6, media: 1.45, liviana: 0.85 }[weight];
    // la daga de la mano izquierda no protege: pega (ver DUAL_PCT)
    if (!isOffDagger(it)) it.def = Math.max(1, Math.round(base + tier * (slot === 'pechera' ? 1 : 0.5)));
    if (slot === 'escudo' && weight === 'liviana') it.power = 1 + tier;
  }
  if (tier > 0) {
    // los báculos ya dan Poder de por sí: su afijo es siempre de llama
    const k = slot === 'arma' && weight === 'liviana' ? 'fuel' : pick(AFFIX_POOL[weight]);
    it.aff = { k, v: AFFIX[k].roll(tier) };
  }
  return it;
}

// Nombre para mostrar: en español es el guardado; en inglés se arma con la base y la calidad
const ITEM_BASE_EN = {
  pesada:  { arma: ['Greatsword', 'War Axe', 'Flanged Mace'], escudo: ['Kite Shield', 'Pavise', 'Round Shield'],
             casco: ['Helm', 'Great Helm'], pechera: ['Cuirass', 'Plate Armor'], botas: ['Greaves', 'Sabatons'] },
  media:   { arma: ['Rapier', 'Sabre', 'Long Dagger'], escudo: ['Dagger', 'Parrying Dagger'],
             casco: ['Mail Coif', 'Hunter’s Hood'], pechera: ['Mail Shirt', 'Studded Doublet'], botas: ['Tall Boots', 'Riding Boots'] },
  liviana: { arma: ['Staff', 'Wand', 'Scepter'], escudo: ['Grimoire', 'Orb'],
             casco: ['Hood', 'Circlet'], pechera: ['Tunic', 'Habit'], botas: ['Sandals', 'Cloth Shoes'] },
};
const ITEM_SUFFIX_EN = { pesada: ['Iron {0}', 'Black Steel {0}', '{0} of Vel’Ombra'], media: ['Leather {0}', 'Ossuary {0}', 'Grey Hunter’s {0}'], liviana: ['Linen {0}', 'Bone {0}', 'Archmage’s {0}'] };
const WEAPON_SUFFIX_EN = { pesada: ['Stone {0}', 'Iron {0}', '{0} of Vel’Ombra'], media: ['Bone {0}', 'Iron {0}', 'Grey Hunter’s {0}'], liviana: ['Bone {0}', 'Silver {0}', 'Archmage’s {0}'] };
// El nombre se arma al mostrarlo (así los objetos de partidas guardadas con nombres viejos se corrigen solos)
function itemName(it) {
  const en = SETTINGS.lang === 'en';
  const base = (en ? ITEM_BASE_EN : ITEM_BASE)[it.weight][it.slot][it.v || 0];
  if (!base) return it.name;
  const suf = itemSuffix(it.slot, it.weight, it.tier, en);
  return en ? suf.replace('{0}', base) : `${base} ${suf}`;
}

// Botín: sesgado hacia el peso de tu clase para que no frustre
function rollLoot(floor, boss, level = 1) {
  const own = CLASSES[P.cls].weight;
  const weight = boss || chance(0.65) ? own : pick(['pesada', 'media', 'liviana']);
  // cuanto más hondo dentro del piso, más chances de una pieza mejor
  let tier = boss ? Math.min(2, floor) : clamp(floor - 1 + (chance(0.1 + level * 0.06) ? 1 : 0) - (chance(0.3) ? 1 : 0), 0, 2);
  return makeItem(pick(SLOTS), weight, tier);
}

function itemStats(it) {
  const s = [];
  if (it.atk) s.push(tr('Ataque +{0}', it.atk));
  if (it.def) s.push(tr('Defensa +{0}', it.def));
  if (it.power) s.push(tr('Poder +{0}', it.power));
  if (isOffDagger(it)) s.push(tr('Segundo golpe {0}–{1}%', ...DUAL_PCT[it.tier].map(v => Math.round(v * 100))));
  if (it.aff) s.push(AFFIX[it.aff.k].label(it.aff.v));
  return s.join(' · ');
}

// Valor aproximado de una pieza, para compararla con lo equipado (flechas del inventario)
function itemScore(it) {
  if (!it) return 0;
  let s = (it.atk || 0) * 2 + (it.def || 0) * 2 + (it.power || 0) * 1.5;
  if (isOffDagger(it)) s += (DUAL_PCT[it.tier][0] + DUAL_PCT[it.tier][1]) * 6;
  if (it.aff) s += { hp: it.aff.v / 3, def: it.aff.v * 2, crit: it.aff.v * 60, dodge: it.aff.v * 60, power: it.aff.v * 1.5, fuel: it.aff.v * 15 }[it.aff.k] || 0;
  return s;
}
// ▲ mejor · ▼ peor · = parecido (sólo para lo que tu clase puede usar)
function itemArrow(it) {
  if (!canEquip(it)) return '';
  const d = itemScore(it) - itemScore(P.equip[it.slot]);
  return d > 0.3 ? '<span class="arr up" title="Mejor que lo equipado">▲</span>'
    : d < -0.3 ? '<span class="arr down" title="Peor que lo equipado">▼</span>' : '<span class="arr eq" title="Parecido a lo equipado">=</span>';
}

function canEquip(it) { return it.weight === CLASSES[P.cls].weight; }

// Recalcula estadísticas derivadas de raza, clase, nivel y equipo
function recalc() {
  const r = RACES[P.race], c = CLASSES[P.cls];
  let atk = P.bAtk, def = P.bDef, hp = P.bHp, power = 0;
  let crit = 0.1 + (r.crit || 0) + (c.crit || 0), dodge = r.dodge || 0, fuelMul = r.fuel || 1;
  // atributos elegidos al crear el personaje
  const a = P.attr || {};
  atk += a.fue || 0; hp += (a.vig || 0) * 4; crit += (a.des || 0) * 0.02; dodge += (a.des || 0) * 0.02;
  power += a.vol || 0; fuelMul *= 1 - (a.vol || 0) * 0.04;
  // pasivas de clase
  if (hasSkill('pies')) dodge += 0.08;
  if (hasSkill('brasa')) fuelMul *= 0.85;
  // runas encastradas
  if (hasRune('orden')) crit += 0.08;
  if (hasRune('sol')) fuelMul *= 0.85;
  for (const s of SLOTS) {
    const it = P.equip[s];
    if (!it) continue;
    atk += it.atk || 0; def += it.def || 0; power += it.power || 0;
    if (it.aff) {
      const { k, v } = it.aff;
      if (k === 'hp') hp += v; else if (k === 'def') def += v; else if (k === 'crit') crit += v;
      else if (k === 'dodge') dodge += v; else if (k === 'power') power += v; else if (k === 'fuel') fuelMul *= 1 - v;
    }
  }
  // reliquias
  hp += P.calizHp || 0;
  if (hasRelic('craneo')) hp = Math.round(hp * 0.9);
  if (hasRelic('corazon')) fuelMul *= 1.15;
  if (modOn('agonizante')) fuelMul *= 1.6;
  if (hasRelic('manto')) { dodge += 0.12; def -= 2; }
  if (hasRelic('dado')) crit -= 0.06;
  crit = Math.min(crit, 0.5);
  Object.assign(P, { atk, def, maxhp: hp, crit, dodge, power, fuelMul });
  P.hp = Math.min(P.hp, P.maxhp);
}

// Lo que no te sirve: peor que lo equipado o de otra clase de armadura
const isJunk = it => !canEquip(it) || itemScore(it) - itemScore(P.equip[it.slot]) < -0.3;

// El trasto de menos valor de la mochila (para hacerle lugar a algo mejor)
function worstJunk() {
  let best = -1;
  P.bag.forEach((it, i) => { if (isJunk(it) && (best < 0 || itemScore(it) < itemScore(P.bag[best]))) best = i; });
  return best;
}

// Equipa lo que es mejor y tira lo que no sirve, de una
function tidyBag() {
  let equipped = 0, dropped = 0;
  for (const s of SLOTS) {
    let bi = -1;
    P.bag.forEach((it, i) => { if (it.slot === s && canEquip(it) && itemScore(it) - itemScore(P.equip[s]) > 0.3 && (bi < 0 || itemScore(it) > itemScore(P.bag[bi]))) bi = i; });
    if (bi >= 0) { equipFromBag(bi); equipped++; }
  }
  for (let i = P.bag.length - 1; i >= 0; i--) if (isJunk(P.bag[i])) { P.bag.splice(i, 1); dropped++; }
  recalc();
  if (!equipped && !dropped) return 'No hay nada que ordenar.';
  return tr('Te equipas {0} y tiras {1}.', equipped ? tr('{0} mejora{1}', equipped, equipped > 1 ? 's' : '') : tr('nada nuevo'), dropped ? tr('{0} trasto{1}', dropped, dropped > 1 ? 's' : '') : tr('nada'));
}

function giveItem(it, source) {
  const label = `${itemName(it)} <span class="tier t${it.tier}">(${TIER_NAME[it.tier]})</span>`;
  if (P.bag.length >= BAG_MAX) {
    const j = worstJunk();
    if (j < 0 || isJunk(it)) { log(tr('Mochila llena: dejas atrás {0}.', label), 'bad'); return; }
    const old = P.bag.splice(j, 1)[0];
    log(tr('Mochila llena: tiras {0} para hacerle lugar.', itemName(old)));
  }
  P.bag.push(it);
  log(tr('{0}: {1}', source, label) + (canEquip(it) ? '' : tr(' — no apta para tu clase')) + '.', 'good');
}

function equipFromBag(i) {
  const it = P.bag[i];
  if (!canEquip(it)) return tr('Sólo un {0} puede usar equipo {1}.', WEIGHT_CLASS[it.weight], WEIGHT_NAME[it.weight].toLowerCase());
  const old = P.equip[it.slot];
  P.equip[it.slot] = it;
  P.bag.splice(i, 1);
  if (old) P.bag.splice(i, 0, old);
  recalc();
  return tr('Te equipas {0}.', itemName(it));
}

function unequip(slot) {
  const it = P.equip[slot];
  if (!it) return null;
  if (P.bag.length >= BAG_MAX) return 'La mochila está llena.';
  P.equip[slot] = null;
  P.bag.push(it);
  recalc();
  return tr('Te quitas {0}.', itemName(it));
}
