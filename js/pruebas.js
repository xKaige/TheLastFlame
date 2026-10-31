'use strict';
// Menú Pruebas (sólo en modo prueba, ver PRUEBA en js/store.js): atajos para revisar el final del juego
// sin jugar una partida entera. Nada de lo que pase acá se guarda.

const TEST_CLASSES = ['guerrero', 'picaro', 'hechicero'];

function openTestMenu() {
  const m = { title: 'Pruebas', cls: 'altar', text: 'Modo prueba: no se guarda nada (partidas, perfil, logros).', items: [] };
  m.refresh = () => {
    m.items = [
      {
        label: `Héroe <small>· ◂ ${CLASSES[CR.cls].name} ${RACES[CR.race].name.toLowerCase()} ▸</small>`,
        sub: 'El que protagoniza las pruebas. ← → para cambiar de clase.',
        adjust: d => { CR.cls = TEST_CLASSES[(TEST_CLASSES.indexOf(CR.cls) + d + 3) % 3]; sfx('select'); m.refresh(); },
        fn() { this.adjust(1); renderMenu(); },
      },
      ...Object.entries(ENDINGS).map(([id, e]) => ({
        label: `Ver final · ${e.name}`, sub: 'Sólo la cinemática. Al terminar (o con Esc) vuelve acá.',
        fn: () => testEnding(id),
      })),
      { label: 'Prototipo de batalla en grupo', sub: 'Tres aliados contra tres enemigos, con turnos por velocidad y pantalla completa.', fn: startBattle },
      { label: 'Ir al final de la partida', sub: 'Nivel 10, equipo antiguo, 5 reliquias y 3 desafíos: todos los finales disponibles. Se elige uno y sigue hasta el epitafio.',
        fn: () => testRun(false) },
      { label: 'Pelear contra el jefe final', sub: 'El mismo héroe, frente a El Que Habita la Oscuridad.',
        fn: () => testRun(true) },
    ];
  };
  m.refresh();
  openMenu(m);
}

function testEnding(id) {
  closeAllMenus();
  playEnding(id, () => { openTitleMenu(); openTestMenu(); topMenu().sel = 1 + Object.keys(ENDINGS).indexOf(id); renderMenu(); },
    { cls: CR.cls, race: CR.race, look: kitLook(CR.cls), name: CR.name });
}

// Una partida armada para llegar al final: héroe fuerte, 5 reliquias y 3 desafíos (los finales piden eso)
function testRun(fight) {
  closeAllMenus();
  EXP.mods = []; EXP.seed = null; EXP.daily = null;
  newGame();
  closeDialog();
  S.flags.mods = ['agonizante', 'muertos', 'sombra'];
  // los mismos aumentos que gainXp, sin los carteles de cada nivel
  while (P.lvl < 10) { P.lvl++; P.next = Math.floor(P.next * 1.7); P.bHp += CLASSES[P.cls].hpLvl; P.bAtk++; if (P.lvl % 2) P.bDef++; }
  P.xp = 0; P.attrPts = 0;
  const c = CLASSES[P.cls];
  for (const [slot, v] of startKit(P.cls)) P.equip[slot] = makeItem(slot, c.weight, 2, v);
  P.relics = Object.keys(RELICS).slice(0, 5);
  P.potions = BAL.maxPotions; P.oil = BAL.maxOil;
  recalc(); P.hp = P.maxhp; P.fuel = 100;
  enterLevel(3, 5);
  S.mode = 'explore';
  logLines.length = 0;
  if (!fight) { log('Prueba: el jefe final ya cayó.', 'em'); openEndingMenu(); return; }
  // frente al jefe, mirándolo
  const b = W_().ents.find(e => e.type === 'enemy' && e.def.boss);
  for (const [d, [dx, dy]] of DIRS.entries()) {
    const x = b.x - dx, y = b.y - dy;
    if (isWall(x, y) || entAt(x, y)) continue;
    P.x = x; P.y = y; P.dir = d;
    cam.x = x + 0.5; cam.y = y + 0.5; cam.a = d * Math.PI / 2;
    break;
  }
  reveal(); updateHUD();
  log('Prueba: el jefe final está adelante. Avanza para pelear.', 'em');
}
