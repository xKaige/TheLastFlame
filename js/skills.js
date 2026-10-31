'use strict';
// Atributos y habilidades de clase.
// Las habilidades se aprenden y mejoran solas al subir de nivel:
// ranks = niveles en que se aprende (el primero) y en que sube de rango (los siguientes).
// type 'act' aparece en el menú de combate; 'pas' actúa sola.

const ATTRS = [
  { id: 'fue', name: 'Fuerza', fx: n => tr('+{0} ataque', n) },
  { id: 'vig', name: 'Vigor', fx: n => tr('+{0} vida', n * 4) },
  { id: 'des', name: 'Destreza', fx: n => tr('+{0}% crít. y esquiva', n * 2) },
  { id: 'vol', name: 'Voluntad', fx: n => tr('+{0} poder · −{1}% antorcha', n, n * 4) },
];
const ATTR_POINTS = 5;
const attrPointAt = lvl => lvl % 2 === 0;   // 1 punto de atributo en cada nivel par

// Gana el punto al subir de nivel y lo anuncia
function grantAttrPoint(lvl) {
  if (!attrPointAt(lvl)) return;
  P.attrPts = (P.attrPts || 0) + 1;
  log('✦ Ganas 1 punto de atributo. [U] para repartirlo.', 'em');
  toastQueue.push({ title: 'Punto de atributo', desc: 'Repártelo con la tecla U o desde Pausa › Atributos.', kind: 'Permanente' });
  nextToast();
}

// Menú para repartir los puntos ganados
function openAttrMenu() {
  P.attr = P.attr || { fue: 0, vig: 0, des: 0, vol: 0 }; // partidas guardadas antes de los atributos
  const m = { title: '', items: [], wrap: true };
  const refresh = () => {
    const pts = P.attrPts || 0;
    m.title = `${tr('Atributos')} · ${pts ? tr('{0} punto{1} para repartir', pts, pts > 1 ? 's' : '') : tr('sin puntos')}`;
    m.items = ATTRS.map(a => {
      const v = P.attr[a.id] || 0;
      return {
        label: `${a.name} <small>· ${v}</small>`,
        sub: (v ? tr('Ahora: {0}. ', a.fx(v)) : '') + (pts ? tr('Con un punto más: {0}.', a.fx(v + 1)) : tr('Ganas un punto en cada nivel par.')),
        off: !pts,
        fn: () => {
          const before = P.maxhp;
          P.attr[a.id] = v + 1;
          P.attrPts--;
          recalc();
          P.hp += P.maxhp - before; // el Vigor sube también la vida actual
          sfx('level');
          refresh();
          m.msg = `${a.name} sube a ${v + 1}.`;
          updateHUD();
          renderMenu();
        },
      };
    });
  };
  refresh();
  openMenu(m, 'game');
}

const SKILLS = {
  guerrero: [
    { id: 'golpe', name: 'Golpe Brutal', type: 'act', ranks: [1, 4, 8], cost: () => 2,
      desc: r => ['Un golpe a dos manos: daño doble.', 'Ahora hace daño ×2,5.', 'Daño ×2,5 y aturde un turno a los enemigos comunes.'][r - 1] },
    { id: 'baluarte', name: 'Baluarte', type: 'pas', ranks: [3],
      desc: () => 'Al defenderte recibes solo el 30% del daño y recuperas el 6% de tu vida.' },
    { id: 'juramento', name: 'Juramento de la Cruz', short: 'Juramento', type: 'act', ranks: [5, 9], cost: () => 2,
      desc: r => (r === 1 ? 'Recuperas el 20% de tu vida y ganas +2 de defensa en este combate.' : 'Ahora recuperas el 28% de tu vida y ganas +3 de defensa.') },
    { id: 'represalia', name: 'Represalia', type: 'pas', ranks: [7],
      desc: () => '20% de probabilidad de devolver el 40% del daño que recibes.' },
    { id: 'bastion', name: 'Último Bastión', type: 'pas', ranks: [9],
      desc: () => 'Una vez por combate, un golpe mortal te deja con 1 de vida.' },
  ],
  picaro: [
    { id: 'punalada', name: 'Puñalada', type: 'act', ranks: [1, 4, 8], cost: () => 2,
      desc: r => ['Crítico seguro que ignora la defensa.', 'Ahora el crítico es ×2,5.', 'Crítico ×2,5 y abre una herida que sangra 3 turnos.'][r - 1] },
    { id: 'pies', name: 'Pies Ligeros', type: 'pas', ranks: [3],
      desc: () => '+8% de esquiva y su tope sube de 30% a 40%. Huir de enemigos comunes siempre funciona.' },
    { id: 'veneno', name: 'Hoja Envenenada', type: 'act', ranks: [5, 9], cost: () => 1,
      desc: r => (r === 1 ? 'Corta y envenena: daño cada turno durante 4 turnos.' : 'El veneno es un 50% más potente.') },
    { id: 'sombras', name: 'Golpe en las Sombras', type: 'pas', ranks: [7],
      desc: () => 'Cuando esquivas un ataque, tu siguiente golpe es crítico.' },
    { id: 'danza', name: 'Danza de Dagas', type: 'act', ranks: [9], cost: () => 3,
      desc: () => 'Tres golpes rápidos al 70% de tu daño; cada uno puede ser crítico.' },
  ],
  hechicero: [
    { id: 'arcana', name: 'Llama Arcana', type: 'act', ranks: [1, 4, 8], cost: r => (r >= 3 ? 1 : 2),
      desc: r => ['Gran daño de fuego sin gastar antorcha.', 'Ahora hace un 25% más de daño.', '+25% de daño y cuesta 1 de Ímpetu menos.'][r - 1] },
    { id: 'brasa', name: 'Brasa Interior', type: 'pas', ranks: [3],
      desc: () => 'Quemar cuesta 5 de antorcha en vez de 8, y se consume un 15% menos.' },
    { id: 'ceniza', name: 'Escudo de Ceniza', type: 'act', ranks: [5, 9], cost: () => 1,
      desc: r => (r === 1 ? 'Un escudo que absorbe daño; crece con tu poder y tu nivel.' : 'Ahora el escudo absorbe un 40% más.') },
    { id: 'sangre', name: 'Sangre Ígnea', type: 'pas', ranks: [7],
      desc: () => 'Tu daño de fuego te cura un 15% de lo que inflige.' },
    { id: 'tormenta', name: 'Tormenta de Fuego', short: 'Tormenta', type: 'act', ranks: [9], cost: () => 3,
      desc: () => 'Desata el doble de una Llama Arcana. Cuesta 15 de antorcha.' },
  ],
};

function skillRank(id) {
  const s = SKILLS[P.cls].find(k => k.id === id);
  return s ? s.ranks.filter(l => P.lvl >= l).length : 0;
}
const hasSkill = id => !!P && skillRank(id) > 0;
const learnedActives = () => SKILLS[P.cls].filter(s => s.type === 'act' && skillRank(s.id) > 0);
const burnCost = () => (hasSkill('brasa') ? 5 : 8);
const dodgeCap = () => (hasSkill('pies') ? 0.4 : 0.3);

// ---------- Efectos en combate ----------
function addDot(name, dmg, turns) {
  const ex = C.dots.find(d => d.name === name);
  if (ex) { ex.dmg = Math.max(ex.dmg, dmg); ex.turns = turns; } else C.dots.push({ name, dmg, turns });
}

function fireHeal(dmg) {
  const pct = (hasSkill('sangre') ? 0.15 : 0) + (hasRelic('corazon') ? 0.1 : 0);
  if (!pct) return;
  const h = Math.round(dmg * pct);
  P.hp = Math.min(P.maxhp, P.hp + h);
  floatNum('+' + h, 'heal');
  log(tr('El fuego te devuelve {0} de vida.', h), 'good');
  updateHUD();
}

function arcanaDmg(e) {
  let d = rnd(8, 13) + Math.round(P.lvl * 2.5) + P.power;
  if (skillRank('arcana') >= 2) d = Math.round(d * 1.25);
  if (e.def.fearsFire) d = Math.round(d * 1.5);
  return d;
}

const SKILL_ACT = {
  golpe(e, r) {
    sfx('swing');
    cfxStrike(weaponKind()); C.heavy = true;
    later(220, () => {
      if (chance(0.15)) { sfx('miss'); cfxMiss(); C.heavy = false; log('Tu golpe brutal se estrella contra la piedra.'); later(550, enemyTurn); return; }
      const dmg = Math.max(2, Math.round((rnd(1, 6) + P.atk) * (r >= 2 ? 2.5 : 2)) - enemyDef(e));
      sfx('hit'); fx.shake = 4;
      if (r >= 3 && !e.def.boss) C.stun = 1;
      damageEnemy(dmg, tr('¡Golpe Brutal! −{0}{1}', dmg, C.stun ? '. Queda aturdido.' : ''));
    });
  },
  juramento(e, r) {
    const h = Math.round(P.maxhp * (r >= 2 ? 0.28 : 0.2));
    P.hp = Math.min(P.maxhp, P.hp + h);
    floatNum('+' + h, 'heal');
    cfxHoly();
    C.defBuff = r >= 2 ? 3 : 2;
    sfx('heal'); fx.flash = 0.4;
    log(tr('Juras ante la cruz: +{0} vida, +{1} defensa.', h, C.defBuff), 'good');
    updateHUD();
    later(450, enemyTurn);
  },
  punalada(e, r) {
    sfx('swing');
    cfxStrike(weaponKind() === 'daggers' ? 'daggers' : 'rapier'); C.strike = 'stab';
    later(150, () => {
      const dmg = Math.round((rnd(1, 6) + P.atk) * (r >= 2 ? 2.5 : 2));
      sfx('hit');
      if (r >= 3) { addDot('Sangrado', Math.max(2, Math.round(P.atk * 0.5)), 3); cfxDot('sangrado'); }
      damageEnemy(dmg, tr('¡Puñalada! −{0}{1}', dmg, r >= 3 ? '. La herida sangra.' : ''), true);
    });
  },
  veneno(e, r) {
    sfx('swing');
    cfxStrike(weaponKind());
    later(150, () => {
      const per = Math.round((P.lvl + 2) * (r >= 2 ? 1.5 : 1));
      addDot('Veneno', per, 4);
      cfxDot('veneno');
      const dmg = Math.max(1, rnd(1, 6) + Math.round(P.atk * 0.5) - enemyDef(e));
      sfx('hit');
      damageEnemy(dmg, tr('Hoja envenenada: −{0}, veneno {1} por turno.', dmg, per));
    });
  },
  danza(e) {
    sfx('swing');
    cfxStrike('daggers'); C.strike = 'dance';
    later(150, () => {
      let total = 0, crits = 0;
      for (let k = 0; k < 3; k++) {
        let d = Math.max(1, Math.round((rnd(1, 6) + P.atk) * 0.7) - enemyDef(e));
        if (chance(P.crit)) { d *= 2; crits++; }
        total += d;
      }
      sfx('hit'); fx.shake = 5;
      damageEnemy(total, tr('Danza de Dagas: −{0}', total) + (crits ? tr(' ({0} crítico{1})', crits, crits > 1 ? 's' : '') : ''), crits > 0);
    });
  },
  arcana(e) {
    sfx('fire'); fx.flash = 0.5;
    cfxStrike('staff'); C.strike = 'arcane';
    const dmg = arcanaDmg(e);
    fireHeal(dmg);
    later(250, () => damageEnemy(dmg, tr('Llama Arcana: −{0}', dmg), false, true));
  },
  ceniza(e, r) {
    const amt = Math.round((6 + P.power + P.lvl * 1.5) * (r >= 2 ? 1.4 : 1));
    C.shield += amt;
    sfx('oil'); cfxAsh();
    log(tr('Te envuelve un escudo de ceniza ({0}).', amt), 'good');
    later(450, enemyTurn);
  },
  tormenta(e) {
    P.fuel = Math.max(0, P.fuel - 15);
    updateHUD();
    sfx('fire'); fx.flash = 0.9; fx.shake = 6;
    cfxStrike('staff'); C.strike = 'storm';
    const dmg = arcanaDmg(e) * 2;
    fireHeal(dmg);
    later(300, () => damageEnemy(dmg, tr('¡Tormenta de Fuego! −{0}', dmg), false, true));
  },
};

function useSkill(s) {
  const r = skillRank(s.id);
  C.imp -= s.cost(r);
  SKILL_ACT[s.id](C.e, r);
}

// ---------- Ímpetu ----------
// Las habilidades no se recargan: se pagan. Cada Atacar o Defender da 1 de Ímpetu (hasta IMP_MAX) y cada
// habilidad cuesta de 1 a 3. Así una pelea no se abre con el golpe grande: primero hay que ganárselo.
const IMP_MAX = 3;
function gainImpetu() { if (C) C.imp = Math.min(IMP_MAX, (C.imp || 0) + 1); }
const impPips = (n, max = IMP_MAX) => '◆'.repeat(n) + '◇'.repeat(Math.max(0, max - n));

// ---------- Avisos al subir de nivel ----------
const toastQueue = [];
let toastBusy = false;

function announceSkills(lvl) {
  for (const s of SKILLS[P.cls]) {
    const i = s.ranks.indexOf(lvl);
    if (i < 0) continue;
    const title = i === 0 ? tr('Nueva habilidad · {0}', s.name) : tr('{0} sube a rango {1}', s.name, ROMAN[i + 1]);
    log(`✦ ${title}`, 'em');
    toastQueue.push({ title, desc: s.desc(i + 1), passive: s.type === 'pas' });
  }
  nextToast();
}

function nextToast() {
  if (toastBusy || !toastQueue.length) return;
  const t = toastQueue.shift();
  toastBusy = true;
  const el = $('toast');
  const kind = t.kind || (t.passive ? 'Pasiva' : 'Activa · aparece en el combate');
  el.innerHTML = `<div class="tt">✦ ${tr(t.title)}</div><div class="td">${glyphText(tr(t.desc))}</div><div class="tk">${glyphText(tr(kind))}</div>`;
  el.classList.remove('hidden');
  el.classList.remove('show'); void el.offsetWidth; el.classList.add('show');
  sfx('level');
  setTimeout(() => { el.classList.add('hidden'); toastBusy = false; nextToast(); }, 4200);
}

// ---------- Libro de habilidades ----------
function openSkillsMenu() {
  const items = SKILLS[P.cls].map(s => {
    const r = skillRank(s.id);
    const kind = s.type === 'act' ? 'Activa' : 'Pasiva';
    // las activas muestran su costo de Ímpetu
    const cost = n => (s.cost ? ` <small>· ${'◆'.repeat(s.cost(n))} ${tr('Ímpetu')}</small>` : '');
    if (!r) return { label: tr('{0} <small>· nivel {1}</small>', s.name, s.ranks[0]) + cost(1), sub: `${tr(kind)}. ${s.desc(1)}`, off: true, fn: () => {} };
    const next = s.ranks[r];
    const rank = s.ranks.length > 1 ? ` ${ROMAN[r]}` : '';
    return { label: `${s.name}${rank}${cost(r)}`, sub: `${tr(kind)}. ${s.desc(r)}${next ? tr(' Mejora en nivel {0}.', next) : ''}`, fn: () => {} };
  });
  openMenu({ title: tr('Habilidades · {0}', CLASSES[P.cls].name), text: tr('Atacar, defenderte o esquivar un golpe da 1 de Ímpetu (hasta {0}); las habilidades activas lo gastan.', IMP_MAX), items, wrap: true }, 'game');
}
