'use strict';
// Creación de personaje e inventario

// ---------- Creación de personaje ----------
const NAMES = ['Aldric', 'Brunhild', 'Caelan', 'Dagna', 'Eirik', 'Fenna', 'Garrick', 'Hilde', 'Isolde', 'Jorund',
  'Kael', 'Lysa', 'Morwen', 'Odo', 'Sigrun', 'Tormund', 'Ulric', 'Wendel', 'Ysolde', 'Varnak'];
const CR = { row: 0, name: vpick(NAMES), race: 'humano', cls: 'guerrero', attr: { fue: 0, vig: 0, des: 0, vol: 0 } };
// filas: 0 nombre · 1 raza · 2 clase · 3..6 atributos · 7 descender
const ROW_GO = 3 + ATTRS.length, N_ROWS = ROW_GO + 1;
const pointsLeft = () => ATTR_POINTS - ATTRS.reduce((n, a) => n + CR.attr[a.id], 0);

function openCreate() {
  S.mode = 'create';
  setPalette('castle');
  C = null;
  $('combat').classList.add('hidden');
  showScreen(null);
  renderCreate();
}

function cycleChoice(dir) {
  if (CR.row === 0) { CR.name = vpick(NAMES.filter(n => n !== CR.name)); }
  else if (CR.row === 1 || CR.row === 2) {
    const key = CR.row === 1 ? 'race' : 'cls';
    const keys = Object.keys(CR.row === 1 ? RACES : CLASSES);
    CR[key] = keys[(keys.indexOf(CR[key]) + dir + keys.length) % keys.length];
  } else if (CR.row < ROW_GO) {
    if (!changeAttr(ATTRS[CR.row - 3].id, dir)) { sfx('bump'); return; }
  } else return;
  sfx('select');
  renderCreate();
}

function changeAttr(id, dir) {
  const v = CR.attr[id] + dir;
  if (v < 0 || (dir > 0 && pointsLeft() <= 0)) return false;
  CR.attr[id] = v;
  return true;
}

function createAction(act) {
  switch (act) {
    case 'fwd': CR.row = (CR.row + N_ROWS - 1) % N_ROWS; sfx('select'); break;
    case 'back': CR.row = (CR.row + 1) % N_ROWS; sfx('select'); break;
    case 'turnL': case 'strafeL': cycleChoice(-1); return;
    case 'turnR': case 'strafeR': cycleChoice(1); return;
    case 'cancel': openTitleMenu(); return;
    case 'ok':
      if (CR.row === 0) { $('cName').focus(); $('cName').select(); return; }
      if (CR.row < ROW_GO) { CR.row++; sfx('select'); break; }
      if (pointsLeft() > 0) {
        // no se baja con puntos sin repartir: lleva al primer atributo
        CR.row = 3; sfx('bump'); break;
      }
      CR.name = ($('cName').value.trim() || vpick(NAMES)).slice(0, 14);
      openPrepMenu(() => playIntro(newGame));
      return;
  }
  renderCreate();
}

function renderCreate() {
  const inp = $('cName');
  if (document.activeElement !== inp) inp.value = CR.name;
  $('cRace').innerHTML = Object.entries(RACES).map(([k, r]) => `<span class="chip${k === CR.race ? ' on' : ''}" data-race="${k}">${r.name}</span>`).join('');
  $('cCls').innerHTML = Object.entries(CLASSES).map(([k, c]) => `<span class="chip${k === CR.cls ? ' on' : ''}" data-cls="${k}">${c.name}</span>`).join('');
  const r = RACES[CR.race], c = CLASSES[CR.cls], at = CR.attr;
  $('cRaceDesc').textContent = r.desc;
  $('cClsDesc').innerHTML = `${c.desc} <span class="diff">${tr('Dificultad: {0}', c.diff)}</span>`;
  const kit = c.kit.map(([s, v]) => makeItem(s, c.weight, 0, v));
  const kitSum = k => kit.reduce((n, it) => n + (it[k] || 0), 0);
  const crit = Math.round((0.1 + (r.crit || 0) + (c.crit || 0)) * 100) + at.des * 2;
  const dodge = Math.round((r.dodge || 0) * 100) + at.des * 2;
  const first = SKILLS[CR.cls][0];
  $('cSum').innerHTML =
    tr('<div>Vida <b>{0}</b> · Ataque <b>{1}</b> · Defensa <b>{2}</b> · Crítico <b>{3}%</b>', c.hp + (r.hp || 0) + at.vig * 4, c.atk + (r.atk || 0) + kitSum('atk') + at.fue, c.def + (r.def || 0) + kitSum('def'), crit) +
    (dodge ? tr(' · Esquiva <b>{0}%</b>', dodge) : '') + (at.vol ? tr(' · Poder <b>{0}</b>', at.vol) : '') + '</div>' +
    tr('<div>Armadura <b>{0}</b> · <b>{1}</b> <i>({2})</i> · 4 habilidades más al subir de nivel</div>', WEIGHT_NAME[c.weight], first.name, first.desc(1).toLowerCase());
  const left = pointsLeft();
  $('cAttrHead').innerHTML = `${tr('Atributos')} <span class="${left ? 'left' : 'done'}">· ${left ? tr('quedan {0} punto{1}', left, left > 1 ? 's' : '') : tr('listos')}</span>`;
  $('cAttrRows').innerHTML = ATTRS.map((a, i) =>
    `<div class="crow arow" data-row="${3 + i}"><span class="an">${a.name}</span>` +
    `<span class="ab${at[a.id] ? '' : ' dis'}" data-a="${a.id}" data-d="-1">−</span><span class="av">${at[a.id]}</span>` +
    `<span class="ab${left ? '' : ' dis'}" data-a="${a.id}" data-d="1">+</span>` +
    `<span class="ax">${at[a.id] ? a.fx(at[a.id]) : ''}</span></div>`).join('');
  $('cGo').textContent = left ? tr('Reparte tus puntos (quedan {0})', left) : tr('Descender a la cripta ✠');
  $('cGo').classList.toggle('locked', left > 0);
  document.querySelectorAll('#create .crow, #cAttrs .crow').forEach(el => el.classList.toggle('focus', +el.dataset.row === CR.row));
  $('create').querySelector('.cgo').dataset.row = ROW_GO;
}

function drawCreate(ctx) {
  ctx.drawImage(titleDim, 0, 0);
  const R = RAMPS.castle;
  const bx = 26, by = 32, bw = 142, bh = 140;
  ctx.fillStyle = R[0]; ctx.fillRect(bx, by, bw, bh);
  ctx.strokeStyle = R[4]; ctx.strokeRect(bx - 2.5, by - 2.5, bw + 5, bh + 5);
  ctx.strokeStyle = R[2]; ctx.strokeRect(bx - 0.5, by - 0.5, bw + 1, bh + 1);
  // halo de antorcha detrás del héroe
  const glow = ctx.createRadialGradient(97, by + 95, 4, 97, by + 95, 80);
  glow.addColorStop(0, R[2]); glow.addColorStop(1, R[0]);
  ctx.fillStyle = glow; ctx.fillRect(bx, by, bw, bh);
  for (let y = by; y < by + bh; y += 2) { ctx.fillStyle = R[0]; ctx.fillRect(bx + ((y / 2) % 2), y, bw, 1); }
  const size = Math.round(132 * (RACES[CR.race].scale || 1));
  const img = heroPortrait(CR.cls, CR.race, kitLook(CR.cls), size, 'castle');
  const bob = Math.round(Math.sin(T * 1.5) * 1.5);
  ctx.drawImage(img, Math.round(97 - size / 2), by + bh - size - 4 + bob);
  ctx.fillStyle = R[3]; ctx.fillRect(bx + 10, by + bh - 6, bw - 20, 1);
  // marco del panel de atributos
  const ay = by + bh + 8, ah = 262 - ay;
  ctx.fillStyle = R[0]; ctx.fillRect(bx, ay, bw, ah);
  ctx.strokeStyle = R[4]; ctx.strokeRect(bx - 2.5, ay - 2.5, bw + 5, ah + 5);
  ctx.strokeStyle = R[2]; ctx.strokeRect(bx - 0.5, ay - 0.5, bw + 1, ah + 1);
}

function initCreateUI() {
  $('cRace').addEventListener('click', ev => {
    const k = ev.target.dataset.race;
    if (k) { CR.race = k; CR.row = 1; sfx('select'); renderCreate(); }
  });
  $('cCls').addEventListener('click', ev => {
    const k = ev.target.dataset.cls;
    if (k) { CR.cls = k; CR.row = 2; sfx('select'); renderCreate(); }
  });
  $('cAttrRows').addEventListener('click', ev => {
    ev.stopPropagation();
    const b = ev.target.closest('.ab'), row = ev.target.closest('.arow');
    if (row) CR.row = +row.dataset.row;
    if (b) { if (changeAttr(b.dataset.a, +b.dataset.d)) sfx('select'); else sfx('bump'); }
    renderCreate();
  });
  $('cDice').addEventListener('click', () => { CR.row = 0; cycleChoice(1); });
  $('cGo').addEventListener('click', () => { CR.row = ROW_GO; createAction('ok'); });
  $('cName').addEventListener('input', ev => { CR.name = ev.target.value; });
  $('cName').addEventListener('focus', () => { CR.row = 0; renderCreate(); });
  $('create').addEventListener('click', ev => ev.stopPropagation());
}

// ---------- Inventario ----------
const INV = { sel: 0, msg: '' };
const LEFT_N = SLOTS.length + 2;   // ranuras de equipo + 2 consumibles en la columna izquierda

// Retrato del héroe con su equipo actual, dibujado sobre el lienzo detrás del inventario
// Panel liso sobre la vista y el registro: tapa el marco intermedio para que el texto no lo cruce
function drawPanel(ctx) {
  const R = RAMPS[S.env];
  const px = VX, py = VY, pw = VW, ph = 258 - VY;
  ctx.fillStyle = R[0]; ctx.fillRect(px - 5, py - 5, pw + 10, ph + 10);
  ctx.strokeStyle = R[3]; ctx.strokeRect(px - 4.5, py - 4.5, pw + 9, ph + 9);
  ctx.strokeStyle = R[4]; ctx.strokeRect(px - 2.5, py - 2.5, pw + 5, ph + 5);
  ctx.strokeStyle = R[2]; ctx.strokeRect(px - 0.5, py - 0.5, pw + 1, ph + 1);
}

function drawInvPortrait(ctx) {
  const R = RAMPS[S.env];
  drawPanel(ctx);
  const bx = 27, by = 46, bw = 84, bh = 122;
  ctx.fillStyle = R[0]; ctx.fillRect(bx, by, bw, bh);
  const glow = ctx.createRadialGradient(bx + bw / 2, by + 80, 2, bx + bw / 2, by + 80, 60);
  glow.addColorStop(0, R[2]); glow.addColorStop(1, R[0]);
  ctx.fillStyle = glow; ctx.fillRect(bx, by, bw, bh);
  for (let y = by; y < by + bh; y += 2) { ctx.fillStyle = R[0]; ctx.fillRect(bx + ((y / 2) % 2), y, bw, 1); }
  ctx.strokeStyle = R[4]; ctx.strokeRect(bx - 1.5, by - 1.5, bw + 3, bh + 3);
  ctx.strokeStyle = R[2]; ctx.strokeRect(bx + 0.5, by + 0.5, bw - 1, bh - 1);
  const size = Math.round(100 * (RACES[P.race].scale || 1));
  const img = heroPortrait(P.cls, P.race, lookOf(P.equip), size, S.env);
  ctx.drawImage(img, Math.round(bx + bw / 2 - size / 2), by + bh - size - 2);
}

function invEntries() {
  return [
    ...SLOTS.map(s => ({ t: 'eq', s })),
    { t: 'cons', k: 'potion' }, { t: 'cons', k: 'oil' },
    ...P.bag.map((it, i) => ({ t: 'bag', i })),
  ];
}

function openInv() {
  S.mode = 'inv';
  INV.msg = '';
  INV.sel = clamp(INV.sel, 0, invEntries().length - 1);
  $('inv').classList.remove('hidden');
  sfx('chest');
  renderInv();
}

function closeInv() {
  $('inv').classList.add('hidden');
  S.mode = 'explore';
  // si estás parado sobre un rescoldo que no cabía en la mochila, recoge lo que ahora entra
  const ember = W_().ents.find(e => e.type === 'ember' && e.x === P.x && e.y === P.y);
  if (ember && P.bag.length < BAG_MAX) collectEmber(ember);
  updateHUD();
}

function invAction(act, fromPad) {
  const ents = invEntries(), n = ents.length;
  if (fromPad && act === 'potion') act = 'drop';
  switch (act) {
    case 'inv': case 'cancel': closeInv(); return;
    case 'fwd': INV.sel = (INV.sel + n - 1) % n; sfx('select'); break;
    case 'back': INV.sel = (INV.sel + 1) % n; sfx('select'); break;
    case 'turnL': case 'turnR': case 'strafeL': case 'strafeR':
      if (INV.sel < LEFT_N && P.bag.length) INV.sel = LEFT_N + Math.min(INV.sel, P.bag.length - 1);
      else if (INV.sel >= LEFT_N) INV.sel = Math.min(INV.sel - LEFT_N, LEFT_N - 1);
      sfx('select');
      break;
    case 'ok': invUse(ents[INV.sel]); break;
    case 'drop': invDrop(ents[INV.sel]); break;
    case 'oil':
      INV.msg = tidyBag(); sfx('pickup'); updateHUD();
      INV.sel = clamp(INV.sel, 0, invEntries().length - 1);
      break;
  }
  renderInv();
}

function invUse(e) {
  if (!e) return;
  if (e.t === 'eq') {
    INV.msg = unequip(e.s) || 'No hay nada equipado ahí.';
  } else if (e.t === 'cons') {
    if (e.k === 'potion') usePotion(); else useOil();
    INV.msg = logLines[logLines.length - 1].text;
  } else {
    const ok = canEquip(P.bag[e.i]);
    INV.msg = equipFromBag(e.i);
    sfx(ok ? 'pickup' : 'bump');
  }
  INV.sel = clamp(INV.sel, 0, invEntries().length - 1);
  updateHUD();
}

function invDrop(e) {
  if (!e) return;
  if (e.t !== 'bag') { INV.msg = e.t === 'eq' ? 'Quítatelo primero para poder tirarlo.' : 'No vas a tirar eso aquí abajo.'; return; }
  const it = P.bag.splice(e.i, 1)[0];
  INV.msg = tr('Tiras {0}.', itemName(it));
  sfx('bump');
  updateHUD();
  INV.sel = clamp(INV.sel, 0, invEntries().length - 1);
}

const tierSpan = it => `<span class="tier t${it.tier}">${TIER_NAME[it.tier]}</span>`;

function renderInv() {
  const ents = invEntries();
  const row = (i, label, value, cls = '') => `<div class="irow${i === INV.sel ? ' sel' : ''} ${cls}" data-i="${i}"><span class="islot">${label}</span>${value}</div>`;
  $('iWho').textContent = `${P.name} · ${RACES[P.race].name} ${CLASSES[P.cls].name.toLowerCase()} · ${tr('equipo {0}', WEIGHT_NAME[CLASSES[P.cls].weight].toLowerCase())}${P.coins ? ` · ${tr('{0} óbolos', P.coins)}` : ''}`;
  $('iEquip').innerHTML = SLOTS.map((s, i) => {
    const it = P.equip[s];
    return row(i, SLOT_NAME[s], it ? `<span class="iname t${it.tier}">${itemName(it)}</span>` : '<span class="empty">—</span>');
  }).join('');
  $('iCons').innerHTML = row(LEFT_N - 2, tr('Poción'), `×${P.potions}/${BAL.maxPotions}`) + row(LEFT_N - 1, tr('Aceite'), `×${P.oil}/${BAL.maxOil}`);
  $('iBagTitle').textContent = tr('Mochila {0}/{1}', P.bag.length, BAG_MAX);
  $('iBag').innerHTML = P.bag.length
    ? P.bag.map((it, i) => row(LEFT_N + i, SLOT_NAME[it.slot], `${itemArrow(it)}<span class="iname t${it.tier}">${itemName(it)}</span>`, canEquip(it) ? '' : 'noequip')).join('')
    : '<div class="empty pad">Vacía. Los enemigos a veces sueltan equipo.</div>';
  $('iStats').innerHTML = tr('Vida {0}/{1} · Ataque {2} · Defensa {3} · Crítico {4}%', Math.max(0, P.hp), P.maxhp, P.atk, P.def, Math.round(P.crit * 100)) +
    (P.dodge ? tr(' · Esquiva {0}%', Math.round(Math.min(P.dodge, dodgeCap()) * 100)) : '') + (P.power ? tr(' · Poder {0}', P.power) : '');
  $('iDetail').innerHTML = invDetail(ents[INV.sel]);
  $('iHint').innerHTML = INV.msg ? `<span class="imsg">${glyphText(tr(INV.msg))}</span>`
    : `${glyph('move')} ${tr('elegir')} · ${glyph('ok')} ${tr('equipar / usar')} · ${glyph('drop')} ${tr('tirar')} · ${glyph('oil')} ${tr('ordenar')} · ${glyph('inv')} ${tr('cerrar')}`;
}

function compare(it) {
  const cur = P.equip[it.slot];
  const d = [];
  const diff = (k, label) => {
    const v = (it[k] || 0) - ((cur && cur[k]) || 0);
    if (v) d.push(`<span class="${v > 0 ? 'up' : 'down'}">${tr(label)} ${v > 0 ? '+' : ''}${v}</span>`);
  };
  diff('atk', 'Ataque'); diff('def', 'Defensa'); diff('power', 'Poder');
  // dagas de la mano izquierda: se comparan por el segundo golpe
  if (isOffDagger(it) && isOffDagger(cur) && it.tier !== cur.tier)
    d.push(`<span class="${it.tier > cur.tier ? 'up' : 'down'}">${tr('Segundo golpe {0}–{1}%', ...DUAL_PCT[it.tier].map(v => Math.round(v * 100)))}</span>`);
  return d.length ? tr('Frente a lo equipado: {0}', d.join(' · ')) : tr(cur ? 'Similar a lo que llevas.' : 'Ranura vacía: es una mejora.');
}

function invDetail(e) {
  if (!e) return '';
  if (e.t === 'cons') {
    return e.k === 'potion'
      ? tr('<div class="dname">Poción de sangre</div><div>Restaura {0} de vida. <b>Enter</b> para beber.</div>', BAL.potionHeal(P))
      : tr('<div class="dname">Frasco de aceite</div><div>Aviva la antorcha +{0}. <b>Enter</b> para usar.</div>', BAL.oilFuel);
  }
  const it = e.t === 'eq' ? P.equip[e.s] : P.bag[e.i];
  if (!it) return `<div class="dname">${SLOT_NAME[e.s]}</div><div>${tr('Nada equipado.')}</div>`;
  let h = `<div class="dname t${it.tier}">${itemName(it)}</div>` +
    `<div>${SLOT_NAME[it.slot]} · ${WEIGHT_NAME[it.weight]} · ${tierSpan(it)}</div><div class="dstats">${itemStats(it)}</div>`;
  if (e.t === 'bag') {
    h += canEquip(it)
      ? `<div>${compare(it)}</div><div class="dhint">${glyph('ok')} ${tr('equipar')} · ${glyph('drop')} ${tr('tirar')}</div>`
      : tr('<div class="down">Sólo para {0}. <b>X</b> tirar</div>', WEIGHT_CLASS[it.weight]);
  } else h += `<div class="dhint">${glyph('ok')} ${tr('quitar')}</div>`;
  return h;
}

function initInvUI() {
  $('inv').addEventListener('click', ev => {
    ev.stopPropagation();
    const r = ev.target.closest('.irow');
    if (!r) return;
    const i = +r.dataset.i;
    if (i === INV.sel) invAction('ok'); else { INV.sel = i; INV.msg = ''; sfx('select'); renderInv(); }
  });
}
