'use strict';
// Prototipo de batalla en grupo (menú Pruebas): pantalla completa, varios aliados controlables y turnos
// por velocidad. Todavía no reemplaza al combate de la exploración (js/game.js).

const BH_SPD = { guerrero: 8, picaro: 13, hechicero: 10 };
const BF_SPD = { rata: 12, kobold: 9, ghoul: 8, sombra: 11, soplo: 14, acechador: 13, centinela: 6, hueco: 7 };
const BATTLE_LVL = 6;
const BC_X = [8, 165, 322], BC_Y = 212, BF_X = [120, 240, 360], BF_BASE = 136, BF_SIZE = 96;

let B = null;

function battleHero(cls, race, name, i) {
  const c = CLASSES[cls], hp = c.hp + c.hpLvl * (BATTLE_LVL - 1);
  const atk = c.atk + BATTLE_LVL - 1 + (cls === 'hechicero' ? 1 : 3);
  return { hero: true, cls, name, i, hp, maxhp: hp, atk, def: c.def + 3, spd: BH_SPD[cls], imp: 0, guard: false,
    head: heroPortrait(cls, race, kitLook(cls), 76, 'crypt'), hit: 0 };
}

function battleFoe(kind, i, label) {
  const d = ENEMIES[kind], hp = Math.round(d.hp * 2.2);
  return { hero: false, kind, name: d.name + label, i, hp, maxhp: hp, atk: d.atk, def: d.def, spd: BF_SPD[kind],
    img: spriteCanvas(SPRITES[d.spr].p, BF_SIZE, 'crypt', 1), hit: 0 };
}

function battleBackdrop() {
  return sceneArt(480, 270, 'crypt', g => {
    g.fillStyle = G(0.05); g.fillRect(0, 0, 480, 270);
    for (let y = 0; y < 150; y += 14)
      for (let x = ((y / 14) % 2) * 18 - 18; x < 480; x += 36) {
        g.fillStyle = G(0.09 + hash2(x, y, 61) * 0.09 + (y / 150) * 0.05);
        g.fillRect(x + 1, y + 1, 34, 12);
      }
    vgrad(g, 0, 150, 480, 120, [[0, 0.2], [1, 0.06]]);
    for (let k = -8; k <= 8; k++) line(g, 240 + k * 28, 150, 240 + k * 110, 270, 1, 0.1);
    for (const y of [160, 176, 198, 228]) line(g, 0, y, 480, y, 1, 0.1);
    glow(g, 240, 110, 230, 0.2);
  });
}

function startBattle() {
  closeAllMenus();
  S.env = 'crypt'; setPalette('crypt');
  const party = [battleHero('guerrero', 'humano', 'Isolde', 0), battleHero('picaro', 'elfo', 'Merek', 1), battleHero('hechicero', 'humano', 'Sabela', 2)];
  const foes = [battleFoe('kobold', 0, ' A'), battleFoe('rata', 1, ''), battleFoe('kobold', 2, ' B')];
  const units = [...party, ...foes];
  // arrancan escalonados: el más veloz actúa primero
  for (const u of units) u.next = 100 / u.spd;
  B = { party, foes, units, cur: null, phase: 'wait', sel: 0, tsel: 0, opts: [], potions: 3, msg: 'Un grupo te cierra el paso.', t: 0, bg: battleBackdrop() };
  S.mode = 'battle';
  $('battle').classList.remove('hidden');
  setMusic('boss');
  later(600, nextTurn);
}

const alive = list => list.filter(u => u.hp > 0);

// Los próximos turnos, sin tocar el estado: la barra de arriba
function turnPreview(n) {
  const sim = alive(B.units).map(u => ({ u, next: u.next }));
  const out = [];
  while (out.length < n) {
    sim.sort((a, b) => a.next - b.next);
    out.push(sim[0].u);
    sim[0].next += 100 / sim[0].u.spd;
  }
  return out;
}

function nextTurn() {
  if (!B) return;
  if (!alive(B.foes).length) return endBattle(true);
  if (!alive(B.party).length) return endBattle(false);
  const u = turnPreview(1)[0];
  const base = u.next;
  for (const x of B.units) x.next -= base;     // el reloj avanza hasta el que actúa
  u.next = 100 / u.spd;
  B.cur = u;
  if (u.hero) {
    u.guard = false;
    B.opts = battleOptions(u); B.sel = 0; B.phase = 'menu';
    B.msg = `Turno de ${u.name}.`;
    renderBattle();
  } else {
    B.phase = 'wait'; B.msg = `Turno de ${u.name}.`;
    renderBattle();
    later(650, () => foeAct(u));
  }
}

function battleOptions(u) {
  const skill = { guerrero: ['Golpe Brutal', 2, 'Daño doble a un enemigo.'], picaro: ['Puñalada', 2, 'Crítico seguro que ignora la defensa.'], hechicero: ['Llama Arcana', 2, 'Gran daño de fuego.'] }[u.cls];
  return [
    { id: 'atk', label: 'Atacar', desc: u.cls === 'picaro' ? 'Dos golpes: el segundo, más flojo. +1 Ímpetu.' : 'Golpe común. +1 Ímpetu.', target: true },
    { id: 'skill', label: skill[0], cost: skill[1], desc: skill[2], target: true, off: u.imp < skill[1] },
    { id: 'def', label: 'Defender', desc: 'Mitad de daño hasta tu próximo turno. +1 Ímpetu.' },
    { id: 'pot', label: 'Poción', desc: `Cura al aliado con menos vida. Quedan ${B.potions}.`, off: B.potions <= 0 },
  ];
}

function battleAction(act) {
  if (!B) return;
  if (B.phase === 'end') { if (act === 'ok') leaveBattle(); return; }
  if (B.phase === 'menu') {
    const n = B.opts.length;
    if (act === 'fwd') { B.sel = (B.sel + n - 1) % n; sfx('select'); }
    else if (act === 'back') { B.sel = (B.sel + 1) % n; sfx('select'); }
    else if (act === 'ok') {
      const o = B.opts[B.sel];
      if (o.off) { sfx('bump'); return; }
      if (o.target) { B.phase = 'target'; B.tsel = alive(B.foes)[0].i; sfx('select'); }
      else battleUse(o);
    }
    renderBattle();
  } else if (B.phase === 'target') {
    const list = alive(B.foes), at = list.findIndex(f => f.i === B.tsel);
    if (act === 'turnL' || act === 'strafeL') { B.tsel = list[(at + list.length - 1) % list.length].i; sfx('select'); }
    else if (act === 'turnR' || act === 'strafeR') { B.tsel = list[(at + 1) % list.length].i; sfx('select'); }
    else if (act === 'cancel') { B.phase = 'menu'; sfx('select'); }
    else if (act === 'ok') battleUse(B.opts[B.sel], B.foes[B.tsel]);
    renderBattle();
  }
}

function hitFoe(f, dmg, crit) {
  f.hp -= dmg; f.hit = 0.3;
  battleNum(BF_X[f.i], BF_BASE - 60, String(dmg), crit ? 'crit' : 'hit');
  sfx('hit');
}

function battleUse(o, f) {
  const u = B.cur, roll = () => rnd(1, 6) + u.atk;
  B.phase = 'wait';
  let wait = 650;
  if (o.id === 'atk') {
    u.imp = Math.min(IMP_MAX, u.imp + 1);
    cfxNone();
    const crit = chance(0.12), dmg = Math.max(1, roll() - f.def) * (crit ? 2 : 1);
    hitFoe(f, dmg, crit);
    B.msg = `${u.name} golpea a ${f.name}: −${dmg}.`;
    if (u.cls === 'picaro') {
      wait = 1000;
      later(350, () => { if (f.hp > 0) { const d2 = Math.max(1, Math.round(roll() * (0.2 + grand() * 0.15)) - f.def); hitFoe(f, d2, false); B.msg = `${u.name} remata con la otra daga: −${d2}.`; renderBattle(); } });
    }
  } else if (o.id === 'skill') {
    u.imp -= o.cost;
    const dmg = u.cls === 'hechicero' ? rnd(8, 13) + Math.round(BATTLE_LVL * 2.5) : u.cls === 'picaro' ? roll() * 2 : Math.max(2, roll() * 2 - f.def);
    hitFoe(f, dmg, u.cls === 'picaro');
    B.msg = `${o.label} sobre ${f.name}: −${dmg}.`;
  } else if (o.id === 'def') {
    u.guard = true; u.imp = Math.min(IMP_MAX, u.imp + 1);
    sfx('whoosh'); B.msg = `${u.name} se cubre.`;
  } else if (o.id === 'pot') {
    const t = alive(B.party).sort((a, b) => a.hp / a.maxhp - b.hp / b.maxhp)[0], h = Math.round(t.maxhp * 0.4);
    B.potions--; t.hp = Math.min(t.maxhp, t.hp + h);
    sfx('heal'); battleNum(BC_X[t.i] + 26, BC_Y - 6, `+${h}`, 'heal');
    B.msg = `${t.name} recupera ${h} de vida.`;
  }
  renderBattle();
  later(wait, nextTurn);
}

function cfxNone() { sfx('swing'); }

function foeAct(f) {
  if (!B || f.hp <= 0) return nextTurn();
  const t = pick(alive(B.party));
  if (t.cls === 'picaro' && chance(0.18)) {
    t.imp = Math.min(IMP_MAX, t.imp + 1); sfx('miss');
    B.msg = `${t.name} esquiva a ${f.name}. +1 Ímpetu.`;
  } else {
    let dmg = Math.max(1, rnd(f.atk[0], f.atk[1]) + 2 - Math.floor(t.def / 2));
    if (t.guard) dmg = Math.max(1, Math.round(dmg / 2));
    t.hp -= dmg; t.hit = 0.3;
    battleNum(BC_X[t.i] + 26, BC_Y - 6, `−${dmg}`, 'hurt');
    sfx('hurt');
    B.msg = `${f.name} hiere a ${t.name}: −${dmg}.`;
  }
  renderBattle();
  later(750, nextTurn);
}

function endBattle(won) {
  B.phase = 'end'; B.cur = null;
  B.msg = won ? 'Victoria. Enter para volver.' : 'El grupo cae. Enter para volver.';
  renderBattle();
}

function leaveBattle() {
  B = null;
  $('battle').classList.add('hidden');
  openTitleMenu(); openTestMenu();
}

function battleNum(x, y, text, kind) {
  const el = document.createElement('div');
  el.className = 'fnum ' + kind; el.textContent = text;
  el.style.left = x + 'px'; el.style.top = y + 'px';
  $('fx').appendChild(el);
  setTimeout(() => el.remove(), 1000);
}

// ---------- Pantalla ----------
function renderBattle() {
  if (!B) return;
  const pct = u => Math.round(clamp(u.hp, 0, u.maxhp) / u.maxhp * 100);
  $('bLog').textContent = B.phase === 'target' ? `Elige objetivo: ${B.foes[B.tsel].name} · ← → · Enter` : B.msg;
  $('bCards').innerHTML = B.party.map(u => `<div class="bcard${B.cur === u ? ' on' : ''}${u.hp <= 0 ? ' down' : ''}" style="left:${BC_X[u.i]}px">
    <div class="bn">${u.name}<small>${CLASSES[u.cls].name} · vel ${u.spd}${u.guard ? ' · en guardia' : ''}</small></div>
    <div class="bbar"><i style="width:${pct(u)}%"></i></div><div class="bv">${Math.max(0, u.hp)}/${u.maxhp}</div>
    <div class="bimp">Ímpetu <b>${impPips(u.imp)}</b></div></div>`).join('');
  const m = $('bMenu'), show = B.phase === 'menu' || B.phase === 'target';
  m.classList.toggle('hidden', !show);
  if (show) {
    m.style.left = BC_X[B.cur.i] + 'px';
    m.innerHTML = `<div class="bopts">${B.opts.map((o, i) => `<div class="bopt${i === B.sel ? ' sel' : ''}${o.off ? ' off' : ''}">${o.label}${o.cost ? ` <span>${'◆'.repeat(o.cost)}</span>` : ''}</div>`).join('')}</div><div class="bdesc">${B.opts[B.sel].desc}</div>`;
  }
}

function battleUpdate(dt) {
  if (!B) return;
  B.t += dt;
  for (const u of B.units) u.hit = Math.max(0, u.hit - dt);
}

function drawBattle(ctx) {
  const R = RAMPS.crypt;
  ctx.drawImage(B.bg, 0, 0);
  // enemigos, de frente
  for (const f of B.foes) {
    if (f.hp <= 0) continue;
    const x = BF_X[f.i] + (f.hit ? Math.sin(B.t * 60) * 3 : 0), y = BF_BASE - BF_SIZE + Math.sin(B.t * 2 + f.i) * 1.5;
    ctx.drawImage(f.img, Math.round(x - BF_SIZE / 2), Math.round(y));
    drawBar(ctx, R, BF_X[f.i] - 30, BF_BASE + 3, 60, 3, f.hp / f.maxhp);
    const marked = (B.phase === 'target' && B.tsel === f.i) || B.cur === f;
    if (marked && Math.sin(B.t * 8) > -0.4) {
      ctx.fillStyle = R[5];
      for (let k = 0; k < 5; k++) ctx.fillRect(BF_X[f.i] - 4 + k, BF_BASE - BF_SIZE - 4 + k, 9 - k * 2, 1);
    }
  }
  // orden de turnos, arriba
  const list = B.phase === 'end' ? [] : [...(B.cur ? [B.cur] : []), ...turnPreview(B.cur ? 8 : 9)], size = 20, x0 = Math.round(240 - (list.length * (size + 3)) / 2);
  list.forEach((u, i) => {
    const x = x0 + i * (size + 3), y = i ? 6 : 4;
    ctx.fillStyle = R[i ? 2 : 5]; ctx.fillRect(x - 1, y - 1, size + 2, size + 2);
    ctx.fillStyle = R[0]; ctx.fillRect(x, y, size, size);
    if (u.hero) ctx.drawImage(u.head, 24, 2, 28, 28, x, y, size, size);
    else ctx.drawImage(u.img, 0, 0, BF_SIZE, BF_SIZE, x, y, size, size);
  });
  // tarjetas del grupo: el texto va en #bCards, el retrato acá
  for (const u of B.party) {
    const x = BC_X[u.i] + (u.hit ? Math.sin(B.t * 60) * 2 : 0);
    ctx.fillStyle = R[B.cur === u ? 5 : 3]; ctx.fillRect(x, BC_Y, 150, 52);
    ctx.fillStyle = R[0]; ctx.fillRect(x + 1, BC_Y + 1, 148, 50);
    ctx.fillStyle = R[1]; ctx.fillRect(x + 4, BC_Y + 4, 44, 44);
    ctx.drawImage(u.head, 14, 0, 48, 48, x + 4, BC_Y + 4, 44, 44);
  }
}
