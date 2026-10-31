'use strict';
// Eventos con decisiones. Cada evento es un dato: para sumar uno nuevo alcanza con
// agregarlo a EVENTS, sin tocar la lógica.
// Campos: name, spr (dibujo de la escena), sprDone (dibujo cuando ya se resolvió, o null
// si desaparece), minFloor/maxFloor, weight (probabilidad relativa), intro, choices.
// Cada opción: label, sub (costo o pista), cond() (si se puede elegir) y run() → texto del resultado.
// Una opción con leave: true cierra la escena sin gastar el evento.

const EVENT_CHANCE = 0.5;   // probabilidad de que un nivel común traiga un evento

const EVENTS = {
  peregrino: {
    name: 'El Peregrino Ciego', spr: 'pilgrim', sprDone: null, scale: 0.9, glow: 0, minFloor: 1, maxFloor: 3, weight: 1,
    intro: 'Un viejo de ojos vendados tantea la pared con su bastón. «¿Llevas fuego, viajero? Hace años que no veo, pero todavía siento el frío.»',
    doneText: 'Ya no hay nadie aquí. Solo queda el eco de un bastón.',
    choices: [
      {
        label: 'Darle un frasco de aceite', sub: '−1 aceite',
        cond: () => P.oil > 0,
        run() {
          P.oil--;
          const r = giveRune('El peregrino te entrega');
          if (r) return tr('«Que tu llama dure más que la mía.» Pone en tu mano una piedra tallada: la {0}.', RUNES[r].name);
          P.bAtk++; recalc();
          return '«No tengo piedras para ti, pero sí un consejo: golpea primero.» Te sientes más seguro (+1 ataque).';
        },
      },
      {
        label: 'Darle una poción', sub: '−1 poción · él oye lo que tú no ves',
        cond: () => P.potions > 0,
        run() {
          P.potions--;
          const ex = W_().explored;
          for (let i = 0; i < MW * MH; i++) if (W_().map[i] !== 1) ex[i] = 1;
          return '«Escucha.» Te describe cada pasillo, cada escalón, cada cosa que respira. El mapa del nivel queda revelado.';
        },
      },
      {
        label: 'Seguir de largo', sub: 'no le das nada',
        run() {
          if (chance(0.5)) {
            P.fuel = Math.min(100, P.fuel + 15);
            return '«Toma, a mí ya no me sirve.» Te ofrece un resto de aceite (+15 de antorcha).';
          }
          return 'Murmura algo que no entiendes y sigue tanteando la pared.';
        },
      },
    ],
  },

  altar: {
    name: 'El Altar de Ceniza', spr: 'altar', sprDone: 'altarCold', scale: 0.62, glow: 0.55, minFloor: 1, maxFloor: 3, weight: 1,
    intro: 'Un altar cubierto de ceniza tibia. En el centro, un cuenco donde alguna vez ardió algo. La piedra parece esperar una ofrenda.',
    doneText: 'La ceniza ya está fría. El altar no espera nada más de ti.',
    choices: [
      {
        label: 'Sacrificar sangre', sub: '−6 de vida máxima, para siempre',
        cond: () => P.maxhp > 20,
        run() {
          P.bHp -= 6; recalc();
          const r = giveRune('El altar te da');
          if (r) return tr('La ceniza bebe tu sangre y escupe una piedra caliente: la {0}.', RUNES[r].name);
          P.bAtk++; recalc();
          return 'La ceniza bebe tu sangre. Sientes el brazo más pesado y más fuerte (+1 ataque).';
        },
      },
      {
        label: 'Ofrendar una poción', sub: '−1 poción · tu fuego arde más en este nivel',
        cond: () => P.potions > 0,
        run() {
          P.potions--;
          S.burnBuff = depth();
          return 'La poción sisea sobre la ceniza. Tu antorcha se aviva: mientras sigas en este nivel, Quemar hace un 50% más de daño.';
        },
      },
      {
        label: 'Apagar tu antorcha sobre el altar', sub: 'vacías la antorcha · +2 frascos de aceite',
        cond: () => P.fuel > 0,
        run() {
          P.fuel = 0;
          addConsumable('oil', 'El altar te devuelve un frasco de aceite.');
          addConsumable('oil', 'Y otro más.');
          return 'Hundes la antorcha en el cuenco y la oscuridad te cubre entera. Cuando la sacas, hay dos frascos de aceite junto a tus pies.';
        },
      },
      {
        label: 'Arrodillarte', sub: 'una bendición… o un castigo',
        run() {
          if (chance(0.6)) {
            P.hp = P.maxhp;
            P.fuel = Math.min(100, P.fuel + 30);
            return 'Una calidez antigua te recorre. Tus heridas se cierran y tu antorcha se aviva.';
          }
          const lost = Math.round(P.hp * 0.2);
          P.hp = Math.max(1, P.hp - lost);
          const spot = DIRS.map(([dx, dy]) => [P.x + dx, P.y + dy]).find(([x, y]) => !isWall(x, y) && !entAt(x, y));
          if (spot) {
            const e = makeEnemy('sombra', spot[0], spot[1]);
            e.vx = e.x + 0.5; e.vy = e.y + 0.5;
            W_().ents.push(e);
            S.eventCombat = e;
          }
          return tr('La ceniza se levanta y te muerde (−{0} vida). Algo se arrastra fuera del cuenco{1}.', lost, spot ? ': una Sombra Susurrante' : '');
        },
      },
      { label: 'Irte', sub: 'el altar seguirá esperando', leave: true },
    ],
  },

  campana: {
    name: 'La Campana Enterrada', spr: 'bell', sprDone: 'bell', scale: 0.7, glow: 0.2, minFloor: 1, maxFloor: 2, weight: 1, lock: 'evCampana',
    intro: 'Una campana de bronce asoma del suelo, tragada hasta la mitad por la tierra. El badajo todavía cuelga. Algo te dice que no la tocaron en siglos.',
    doneText: 'La campana calla. Ya dijo lo que tenía que decir.',
    choices: [
      {
        label: 'Tocarla', sub: 'despierta a los muertos del nivel · experiencia doble aquí',
        run() {
          for (const e of W_().ents) if (e.type === 'enemy') e.aware = true;
          S.bellXp = depth();
          sfx('level');
          return 'El tañido baja por los pasillos y vuelve multiplicado. Todo lo que duerme en este nivel abre los ojos y te busca. Mientras sigas aquí, cada caído vale el doble.';
        },
      },
      {
        label: 'Desenterrarla', sub: '−25 de antorcha · algo hay debajo',
        cond: () => P.fuel > 25,
        run() {
          P.fuel -= 25;
          giveItem(rollLoot(S.floor, true, S.level), 'Bajo la campana');
          return 'Escarbas con la antorcha hasta quemarle la mitad del aceite. Debajo del bronce, envuelto en un sudario, hay algo que alguien quiso esconder.';
        },
      },
      {
        label: 'Rezar en silencio', sub: 'la campana responde… a veces',
        run() {
          if (chance(0.5)) { P.hp = P.maxhp; return 'Sin que nadie la toque, la campana vibra apenas. Tus heridas se cierran.'; }
          return 'Rezas. La campana no responde.';
        },
      },
      { label: 'Dejarla dormir', sub: 'seguirá ahí', leave: true },
    ],
  },

  puerta: {
    name: 'La Puerta que Respira', spr: 'door', sprDone: 'doorShut', scale: 0.85, glow: 0.35, minFloor: 1, maxFloor: 3, weight: 1, lock: 'evPuerta',
    intro: 'Una puerta de madera negra, sin pared alrededor. Se hincha y se encoge despacio, como un pecho dormido. Por las rendijas sale aire tibio.',
    doneText: 'La puerta ya no respira. Es solo madera.',
    choices: [
      {
        label: 'Abrirla', sub: 'lo que respira del otro lado',
        run() {
          if (chance(0.55)) {
            giveItem(rollLoot(S.floor, false, S.level), 'Tras la puerta');
            addConsumable('potions', 'Y una poción.');
            return 'Del otro lado hay una celda vacía y un cofre abierto, como si alguien lo hubiera dejado para ti.';
          }
          const spot = DIRS.map(([dx, dy]) => [P.x + dx, P.y + dy]).find(([x, y]) => !isWall(x, y) && !entAt(x, y));
          if (spot) {
            const e = makeEnemy('hueco', spot[0], spot[1]);
            W_().ents.push(e);
            S.eventCombat = e;
          }
          return 'Lo que respiraba era una armadura vacía. Sale de la oscuridad empuñando su espada.';
        },
      },
      {
        label: 'Darle tu aliento', sub: '−8 de vida máxima · recuperas una llama',
        cond: () => (P.lives ?? BAL.lives) < (P.livesMax ?? BAL.lives) && P.maxhp > 24,
        run() {
          P.bHp -= 8; recalc();
          P.lives = (P.lives ?? 0) + 1;
          updateHUD();
          return 'Apoyas los labios en la madera y soplas. La puerta deja de respirar, y en tu pecho algo vuelve a encenderse.';
        },
      },
      {
        label: 'Escuchar', sub: 'oír antes de actuar',
        run() {
          const st = W_().map.indexOf(2);
          if (st >= 0) for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
            const x = (st % MW) + dx, y = ((st / MW) | 0) + dy;
            if (x >= 0 && y >= 0 && x < MW && y < MH) W_().explored[y * MW + x] = 1;
          }
          return st >= 0 ? 'Entre un aliento y otro, oyes pasos que bajan. Ya sabes dónde está la escalera.' : 'Solo oyes respirar.';
        },
      },
      { label: 'Alejarte', sub: 'seguirá respirando', leave: true },
    ],
  },

  caballero: {
    name: 'El Caballero Arrodillado', spr: 'knightKneel', sprDone: 'knightKneel', scale: 0.85, glow: 0, minFloor: 2, maxFloor: 3, weight: 1, lock: 'evCaballero',
    intro: 'Un caballero de armadura hueca está arrodillado en medio del pasillo, las manos sobre el pomo de una espada clavada en la piedra. No respira. No se mueve. Espera.',
    doneText: 'El caballero sigue arrodillado. Ya no espera nada.',
    choices: [
      {
        label: 'Tomar su espada', sub: 'un arma antigua · puede que él no esté de acuerdo',
        run() {
          if (chance(0.5)) {
            giveItem(makeItem('arma', CLASSES[P.cls].weight, 2), 'De la piedra');
            return 'La espada sale de la piedra con un suspiro. El caballero no se mueve: hace tiempo que la soltó.';
          }
          spawnBeside('hueco');
          return 'Apenas rozas el pomo, el yelmo se levanta. La armadura se pone de pie para defender lo que es suyo.';
        },
      },
      {
        label: 'Arrodillarte a su lado', sub: '−15 de antorcha · un juramento compartido: +2 defensa',
        cond: () => P.fuel > 15,
        run() {
          P.fuel -= 15; P.bDef += 2; recalc();
          return 'Te arrodillas. Durante un rato largo, dos caballeros velan juntos. Cuando te levantas, tu armadura pesa distinto (+2 defensa).';
        },
      },
      {
        label: 'Cerrarle la visera', sub: 'darle descanso',
        run() {
          gainXp(Math.round(P.next * 0.3));
          return 'Bajas la visera con cuidado. La armadura se deshace en polvo, y algo de lo que sabía pasa a ti.';
        },
      },
      { label: 'Seguir de largo', sub: 'no es asunto tuyo', leave: true },
    ],
  },

  nina: {
    name: 'La Niña de la Linterna', spr: 'girl', sprDone: null, scale: 0.7, glow: 0.5, minFloor: 1, maxFloor: 3, weight: 1, lock: 'evNina',
    intro: 'Una niña descalza sostiene una linterna más grande que su cabeza. «¿Estás perdido? Yo conozco todos los caminos. Todos.»',
    doneText: 'Ya no hay nadie. Solo un círculo de cera en el suelo.',
    choices: [
      {
        label: 'Seguirla', sub: 'te muestra el nivel entero',
        run() {
          const ex = W_().explored;
          for (let i = 0; i < MW * MH; i++) if (W_().map[i] !== 1) ex[i] = 1;
          return 'La sigues por pasillos que no habías visto. Cuando miras hacia atrás, ya no está, pero recuerdas cada rincón: el nivel queda en tu mapa.';
        },
      },
      {
        label: 'Pedirle su linterna', sub: '+40 de antorcha · ella se queda a oscuras',
        run() {
          P.fuel = Math.min(100, P.fuel + 40);
          spawnBeside('sombra');
          return 'Te da la linterna sin decir nada. Su cara se apaga con la luz, y lo que queda de ella ya no es una niña.';
        },
      },
      {
        label: 'Darle tu aceite', sub: '−1 aceite · la luz vuelve multiplicada',
        cond: () => P.oil > 0,
        run() {
          P.oil--;
          if ((P.lives ?? BAL.lives) < (P.livesMax ?? BAL.lives)) { P.lives++; updateHUD(); return 'Llena su linterna. A cambio, sopla sobre tu pecho: algo que se había apagado vuelve a arder (+1 llama).'; }
          P.bHp += 6; recalc(); P.hp = Math.min(P.maxhp, P.hp + 6);
          return 'Llena su linterna. A cambio, apoya su mano tibia en la tuya (+6 de vida máxima).';
        },
      },
      { label: 'Decirle que se vaya', sub: 'no le crees nada', leave: true },
    ],
  },

  ataud: {
    name: 'El Ataúd del Rey sin Nombre', spr: 'coffin', sprDone: 'coffinOpen', scale: 0.8, glow: 0.15, minFloor: 2, maxFloor: 3, weight: 1, lock: 'evAtaud',
    intro: 'Un ataúd de roble negro con una corona tallada en la tapa. En la placa donde iría el nombre, alguien raspó las letras hasta borrarlas.',
    doneText: 'El ataúd ya no guarda nada que te importe.',
    choices: [
      {
        label: 'Abrirlo', sub: 'un tesoro real… y su dueño',
        run() {
          const got = giveRelic('En el ataúd') || giveRune('En el ataúd');
          if (chance(0.6)) { spawnBeside('ghoul'); return tr('{0}Los huesos no se quedan quietos: algo hambriento sale con ellos.', got ? 'Entre los huesos brilla algo y lo tomas. ' : ''); }
          return got ? 'Entre los huesos del rey brilla algo. Lo tomas sin que nadie proteste.' : 'Solo huesos y polvo.';
        },
      },
      {
        label: 'Grabarle un nombre', sub: '−10 de vida máxima · un rey agradecido: +1 ranura de runa',
        cond: () => P.maxhp > 30 && !S.flags.kingSlot,
        run() {
          P.bHp -= 10; recalc();
          S.flags.kingSlot = 1;
          return 'Grabas un nombre con la punta del arma, y te cuesta sangre. La tapa tiembla: un rey que vuelve a tener nombre paga sus deudas (+1 ranura de runa).';
        },
      },
      {
        label: 'Rezar por él', sub: 'un descanso para los dos',
        run() { const h = Math.round(P.maxhp * 0.3); P.hp = Math.min(P.maxhp, P.hp + h); return tr('Rezas por un rey que nadie recuerda. Te sientes más liviano (+{0} vida).', h); },
      },
      { label: 'Dejarlo en paz', sub: 'los reyes muertos guardan rencor', leave: true },
    ],
  },

  reflejo: {
    name: 'El Reflejo que no te Pertenece', spr: 'mirror', sprDone: 'mirrorBroken', scale: 0.85, glow: 0.3, minFloor: 2, maxFloor: 3, weight: 1, lock: 'evReflejo',
    intro: 'Un espejo alto, de marco de hueso. Tu reflejo tarda un instante en moverse cuando tú te mueves. Y sonríe cuando tú no.',
    doneText: 'El espejo ya no refleja nada.',
    choices: [
      {
        label: 'Mirarte a los ojos', sub: 'tu reflejo te cambia algo: +3 ataque, −2 defensa',
        run() { P.bAtk += 3; P.bDef -= 2; recalc(); return 'Sostienes la mirada hasta que tu reflejo parpadea primero. Sales más fiero y menos prudente (+3 ataque, −2 defensa).'; },
      },
      {
        label: 'Romperlo', sub: 'pierdes una llama · ganas mucha experiencia',
        cond: () => (P.lives ?? BAL.lives) > 1,
        run() {
          P.lives--; updateHUD();
          gainXp(Math.round(P.next * 0.6));
          return 'El espejo estalla y algo tuyo se va con los pedazos (−1 llama). Lo que tu reflejo sabía, ahora lo sabes tú.';
        },
      },
      {
        label: 'Pasar a través', sub: 'el reflejo te lleva a la escalera',
        cond: () => W_().map.indexOf(2) >= 0,
        run() {
          const st = W_().map.indexOf(2);
          P.x = st % MW; P.y = (st / MW) | 0;
          cam.x = P.x + 0.5; cam.y = P.y + 0.5;
          W_().explored[st] = 1; reveal();
          return 'Entras en el espejo y sales por otro, lejos de aquí. Estás parado sobre la escalera que baja.';
        },
      },
      { label: 'Taparlo', sub: 'mejor no saber', leave: true },
    ],
  },
};

// Pone una criatura junto a ti para que el evento termine en pelea
function spawnBeside(kind) {
  const spot = DIRS.map(([dx, dy]) => [P.x + dx, P.y + dy]).find(([x, y]) => !isWall(x, y) && !entAt(x, y));
  if (!spot) return null;
  const e = makeEnemy(kind, spot[0], spot[1]);
  W_().ents.push(e);
  S.eventCombat = e;
  return e;
}

// Elige un evento para el piso actual según su peso (los bloqueados esperan al Altar)
function pickEvent() {
  const ok = Object.entries(EVENTS).filter(([, ev]) => S.floor >= ev.minFloor && S.floor <= ev.maxFloor && (!ev.lock || contentUnlocked(ev.lock)));
  let total = ok.reduce((n, [, ev]) => n + ev.weight, 0), r = grand() * total;
  for (const [id, ev] of ok) { r -= ev.weight; if (r <= 0) return id; }
  return ok.length ? ok[0][0] : null;
}

const eventSprite = e => (e.done ? EVENTS[e.ev].sprDone : EVENTS[e.ev].spr);

function openEvent(e) {
  const ev = EVENTS[e.ev];
  sfx('whisper');
  const m = {
    title: ev.name, text: ev.intro, art: ev.spr, wrap: true, back: false,
    items: ev.choices.map(c => ({
      label: c.label, sub: c.sub, off: c.cond && !c.cond(),
      fn: () => (c.leave ? leaveEvent() : resolveEvent(e, m, c)),
    })),
  };
  openMenu(m, 'game');
}

function leaveEvent() {
  closeAllMenus();
  S.mode = 'explore';
}

function resolveEvent(e, m, c) {
  const ev = EVENTS[e.ev];
  const result = c.run();
  e.done = true;
  S.flags.evDone = (S.flags.evDone || 0) + 1;
  codexNote('events', e.ev);
  if (!ev.sprDone) W_().ents.splice(W_().ents.indexOf(e), 1);
  log(`${ev.name}: ${tr(c.label).toLowerCase()}.`, 'em');
  updateHUD();
  m.text = tr(result);
  m.art = ev.sprDone || ev.spr;
  m.items = [{
    label: 'Continuar',
    fn: () => {
      leaveEvent();
      if (S.eventCombat) { const foe = S.eventCombat; S.eventCombat = null; startCombat(foe, true); }
    },
  }];
  m.sel = 0;
  renderMenu();
}

// Ilustración del evento a la izquierda del panel
const eventArtCache = {};
function drawMenuArt(ctx) {
  const m = topMenu();
  if (!m || !m.art) return;
  const key = m.art + S.env;
  if (!eventArtCache[key]) eventArtCache[key] = spriteCanvas(SPRITES[m.art].p, 120, S.env, 1.05);
  const R = RAMPS[S.env];
  const bx = 28, by = 40, bw = 104, bh = 150;
  ctx.fillStyle = R[0]; ctx.fillRect(bx, by, bw, bh);
  const glow = ctx.createRadialGradient(bx + bw / 2, by + 100, 2, bx + bw / 2, by + 100, 70);
  glow.addColorStop(0, R[2]); glow.addColorStop(1, R[0]);
  ctx.fillStyle = glow; ctx.fillRect(bx, by, bw, bh);
  for (let y = by; y < by + bh; y += 2) { ctx.fillStyle = R[0]; ctx.fillRect(bx + ((y / 2) % 2), y, bw, 1); }
  ctx.strokeStyle = R[4]; ctx.strokeRect(bx - 1.5, by - 1.5, bw + 3, bh + 3);
  ctx.drawImage(eventArtCache[key], Math.round(bx + bw / 2 - 60), by + bh - 124);
}

// ---------- Dibujos ----------
function drawPilgrim(g) {
  poly(g, [[20, 22], [40, 20], [47, 63.5], [15, 63.5]], 0.34);
  for (let i = 0; i < 4; i++) line(g, 24 + i * 5, 28, 19 + i * 8, 63, 0.7, 0.22);
  poly(g, [[22, 22], [26, 8], [33, 4], [40, 9], [41, 22], [34, 20], [27, 21]], 0.38);
  ell(g, 32, 15, 5.4, 6, 0.6);
  poly(g, [[26.4, 12], [37.6, 12], [37.6, 15.4], [26.4, 15.4]], 0.85, 0.6);
  line(g, 29, 18.5, 35, 18.5, 0.6, 0.25);
  poly(g, [[28, 19], [36, 19], [35, 29], [32, 31], [29, 29]], 0.8, 0.6);
  limb(g, [[24, 26], [16, 34], [12, 36]], 2.6, 0.36);
  line(g, 10, 4, 13, 63, 3, OUT); line(g, 10, 4, 13, 63, 1.6, 0.5);
  ell(g, 12, 36, 2, 2, 0.6);
  limb(g, [[40, 26], [44, 38], [41, 44]], 2.6, 0.36);
  ell(g, 41, 45, 2, 2, 0.6);
  line(g, 41, 46, 41, 52, 0.7, 0.55); ell(g, 41, 54, 2.4, 2, 0.45, 0.6);
}

function drawBell(g) {
  poly(g, [[6, 63.5], [58, 63.5], [54, 52], [10, 52]], 0.24);
  for (let k = 0; k < 9; k++) ell(g, 10 + k * 5.5, 53 + (k % 3), 2.2, 1.2, 0.32, 0);
  g.beginPath(); g.moveTo(16, 55); g.bezierCurveTo(16, 30, 22, 18, 32, 18); g.bezierCurveTo(42, 18, 48, 30, 48, 55); g.closePath();
  g.fillStyle = G(0.56); g.fill(); g.lineWidth = 1; g.strokeStyle = G(OUT); g.stroke();
  ell(g, 32, 18, 3.4, 2.6, 0.62);
  for (const y of [30, 34]) line(g, 21, y, 43, y, 0.7, 0.36);
  line(g, 20, 24, 18, 50, 1.2, 0.86);
  for (let k = 0; k < 5; k++) ell(g, 24 + k * 4, 42, 0.7, 0.7, 0.85, 0);
  poly(g, [[12, 56], [52, 56], [54, 60], [10, 60]], 0.3, 0.6);
  ell(g, 29, 50, 2.2, 2.2, 0.4);
}

function drawDoor(g, alive) {
  poly(g, [[14, 63.5], [50, 63.5], [50, 14], [44, 6], [32, 3], [20, 6], [14, 14]], 0.16);
  const b = alive ? 1.5 : 0;
  poly(g, [[18 - b, 62], [46 + b, 62], [46 + b, 16], [41, 9 - b], [32, 6.5 - b], [23, 9 - b], [18 - b, 16]], 0.4);
  for (const x of [24, 30, 36, 42]) line(g, x, 10, x, 61, 0.7, 0.22);
  for (const y of [22, 46]) { poly(g, [[18, y], [46, y], [46, y + 3], [18, y + 3]], 0.55, 0.6); for (const x of [21, 43]) ell(g, x, y + 1.5, 0.8, 0.8, 0.85, 0); }
  ell(g, 40, 36, 2, 2, 0.7);
  if (alive) for (const y of [13, 30, 52]) { line(g, 18.6, y, 18.6, y + 6, 1, 0.95); line(g, 45.4, y + 3, 45.4, y + 9, 1, 0.95); }
}

function drawKneelingKnight(g) {
  line(g, 41, 28, 41, 63.5, 3.2, OUT); line(g, 41, 28, 41, 63.5, 1.7, 0.85);
  line(g, 36, 33, 46, 33, 2.8, OUT); line(g, 36, 33, 46, 33, 1.5, 0.7);
  ell(g, 41, 27.5, 1.8, 1.8, 0.72);
  poly(g, [[14, 52], [30, 52], [30, 63.5], [10, 63.5]], 0.3);
  poly(g, [[28, 45], [38, 45], [38, 63.5], [32, 63.5], [32, 53], [28, 53]], 0.42);
  poly(g, [[17, 26], [34, 24], [37, 46], [15, 52]], 0.52);
  for (const y of [32, 38]) line(g, 17, y, 35, y - 1, 0.6, 0.3);
  ell(g, 19, 26, 5, 3.6, 0.58); ell(g, 33, 25, 5, 3.6, 0.58);
  limb(g, [[33, 28], [38, 31], [40, 30]], 2.6, 0.5);
  limb(g, [[19, 29], [29, 34], [39, 31]], 2.6, 0.46);
  poly(g, [[19, 13], [30, 12], [32, 23], [20, 24]], 0.56);
  line(g, 20, 18.5, 31, 18, 1, 0.05);
  ell(g, 25, 12, 5.6, 2.8, 0.58);
  line(g, 25, 10, 25, 23, 0.6, 0.85);
}

function drawLanternGirl(g) {
  poly(g, [[24, 30], [40, 30], [44, 60], [20, 60]], 0.72);
  for (let i = 0; i < 3; i++) line(g, 27 + i * 5, 34, 25 + i * 7, 59, 0.5, 0.5);
  for (const x of [28, 35]) ell(g, x, 61.5, 2.4, 1.4, 0.62);
  limb(g, [[26, 32], [22, 40], [23, 44]], 2, 0.66);
  ell(g, 32, 20, 6, 7, 0.7);
  poly(g, [[25, 22], [26, 12], [32, 9], [38, 12], [39, 22], [37, 16], [27, 16]], 0.22);
  line(g, 25.5, 22, 24, 34, 2, 0.22); line(g, 38.5, 22, 40, 34, 2, 0.22);
  ell(g, 29.5, 20.5, 0.8, 1, 0.05, 0); ell(g, 34.5, 20.5, 0.8, 1, 0.05, 0);
  limb(g, [[38, 32], [44, 38], [46, 41]], 2, 0.66);
  line(g, 46, 41, 46, 44, 0.6, 0.5);
  poly(g, [[42.5, 44], [49.5, 44], [49.5, 54], [42.5, 54]], 0.45, 0.8);
  ell(g, 46, 49, 2.2, 3, 1, 0);
}

function drawCoffin(g, open) {
  poly(g, [[8, 63.5], [56, 63.5], [53, 57], [11, 57]], 0.26);
  poly(g, [[14, 57], [50, 57], [55, 45], [47, 37], [17, 37], [9, 45]], 0.4);
  for (const y of [43, 51]) line(g, 12, y, 52, y, 0.6, 0.27);
  if (open) {
    poly(g, [[17, 37], [47, 37], [45, 33], [19, 33]], 0.05);
    poly(g, [[11, 31], [47, 23], [49, 27], [13, 35]], 0.44);
    for (let k = 0; k < 4; k++) ell(g, 24 + k * 5, 35, 1.6, 1, 0.9, 0.4);
  } else {
    poly(g, [[17, 37], [47, 37], [51, 31], [13, 31]], 0.52);
    line(g, 32, 38, 32, 56, 1.4, 0.75); line(g, 23, 45, 41, 45, 1.4, 0.75);
    poly(g, [[26, 35], [27, 31.5], [29.5, 33.5], [32, 30], [34.5, 33.5], [37, 31.5], [38, 35]], 0.88, 0.6);
  }
}

function drawMirror(g, broken) {
  poly(g, [[19, 63.5], [45, 63.5], [41, 57], [23, 57]], 0.3);
  ell(g, 32, 31, 14, 24, 0.62);
  ell(g, 32, 31, 11, 21, broken ? 0.12 : 0.22, 0);
  if (!broken) {
    ell(g, 32, 23, 3.6, 4.2, 0.55, 0);
    poly(g, [[27, 29], [37, 29], [39, 47], [25, 47]], 0.45, 0);
    ell(g, 30.7, 22.6, 0.6, 0.5, 1, 0); ell(g, 33.3, 22.6, 0.6, 0.5, 1, 0);
    line(g, 30.5, 25.5, 33.5, 25.2, 0.4, 0.95);
  } else for (const [x2, y2] of [[24, 15], [40, 17], [22, 43], [42, 45], [33, 51], [21, 29]]) line(g, 32, 30, x2, y2, 0.6, 0.85);
  for (let k = 0; k < 10; k++) { const a = k * 0.63; ell(g, 32 + Math.cos(a) * 14, 31 + Math.sin(a) * 24, 1, 1, 0.85, 0.4); }
}

function drawAltar(g, lit) {
  poly(g, [[12, 63.5], [52, 63.5], [50, 58], [14, 58]], 0.32);
  poly(g, [[16, 58], [48, 58], [46, 34], [18, 34]], 0.46);
  for (const y of [42, 50]) line(g, 17, y, 47, y, 0.6, 0.3);
  poly(g, [[14, 34], [50, 34], [50, 30], [14, 30]], 0.56);
  g.beginPath(); g.ellipse(32, 30, 12, 3.4, 0, Math.PI, 0); g.fillStyle = G(0.6); g.fill();
  ell(g, 32, 29, 10, 2.6, lit ? 0.5 : 0.22, 0);
  for (let k = 0; k < 6; k++) ell(g, 25 + k * 2.8, 29 + (k % 2) * 0.6, 1, 0.6, lit ? 0.95 : 0.35, 0);
  if (lit) for (let k = 0; k < 3; k++) curve(g, [[28 + k * 4, 27], [26 + k * 4, 20], [31 + k * 4, 14], [29 + k * 4, 6]], 0.6, 0.55);
}
