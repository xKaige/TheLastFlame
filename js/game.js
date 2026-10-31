'use strict';
// LA ÚLTIMA LLAMA — prototipo de dungeon crawler por casillas

const DIRS = [[1, 0], [0, 1], [-1, 0], [0, -1]]; // E, S, O, N
const ROMAN = ['', 'I', 'II', 'III'];
const FLOOR_PAL = ['', 'crypt', 'castle', 'engrave'];
const LAST_FLOOR = 3;
const LEVELS_PER_FLOOR = 5;           // el último nivel de cada piso es la guarida del jefe

// ---------- Equilibrio: todos los números de dificultad en un solo lugar ----------
// d = profundidad total (1..15)
const BAL = {
  fuelPerStep: 0.78,
  oilFuel: 45,
  startPotions: 2, startOil: 2,
  lives: 3,                                                // llamas por partida: al perder la última, la partida termina
  potionHeal: p => Math.round(10 + p.maxhp * 0.45),
  lowFuel: 25,                                             // por debajo, la llama avisa que se apaga
  secretChance: 0.75,                                      // niveles comunes con sala secreta
  maxPotions: 5, maxOil: 5,                                // el cinturón no da para más
  defK: d => 10 + d * 1.5,                                 // la defensa se mide contra la profundidad
  chests: [2, 3],                                          // por nivel (mín, máx)
  chest: { potion: 0.16, oil: 0.42, rune: 0.53, item: 0.86, atk: 0.93 }, // probabilidades acumuladas; el resto: +1 defensa
  dropConsumable: 0.15,
  enemyHp: d => 1 + (d - 1) * 0.14,                        // multiplicador de vida
  enemyDmg: d => 1 + (d - 1) * 0.09,                       // multiplicador de daño
  enemyDmgFlat: d => Math.floor((d - 1) / 3),              // daño extra fijo
  enemyDef: d => Math.floor((d - 1) / 4),                  // defensa extra
};
const FLOOR_BOSS = { 1: 'reyOsario', 2: 'cazador', 3: 'boss' };

// idle: cómo se mueve en combate (breathe por defecto, float, skitter, heavy)
// hitFx: cómo se ve su golpe sobre la pantalla (blade por defecto, claw, bite, smash, shadow)
const ENEMIES = {
  rata:   { name: 'Rata de Osario', idle: 'skitter', hitFx: 'bite', spr: 'rat', hp: 7, atk: [1, 3], def: 0, xp: 3, ramp: 0, speed: 1, scale: 0.6, flee: 0.8 },
  kobold: { name: 'Kobold No-Muerto', hitFx: 'blade', spr: 'kobold', hp: 12, atk: [2, 5], def: 1, xp: 6, ramp: 0, speed: 0.7, scale: 0.9, flee: 0.6 },
  ghoul:  { name: 'Necrófago', hitFx: 'claw', spr: 'ghoul', hp: 20, atk: [3, 7], def: 1, xp: 12, ramp: 0, speed: 0.8, scale: 0.9, flee: 0.5 },
  sombra: { name: 'Sombra Susurrante', idle: 'float', hitFx: 'shadow', spr: 'shade', hp: 15, atk: [3, 6], def: 2, xp: 14, ramp: 1, speed: 0.9, scale: 0.85, glow: 0.35, fearsFire: true, drain: 6, flee: 0.45 },
  // con comportamiento propio: el Soplo apaga tu antorcha de lejos, el Acechador solo se ve con
  // luz fuerte y embosca, el Centinela alterna un escudo que frena los golpes pero no el fuego
  soplo:     { name: 'El Soplo', idle: 'float', hitFx: 'shadow', spr: 'wisp', hp: 9, atk: [1, 3], def: 0, xp: 9, ramp: 1, speed: 0.8, scale: 0.75, glow: 0.3, drain: 10, flee: 0.7, blows: true },
  acechador: { name: 'El Acechador', hitFx: 'claw', spr: 'lurker', hp: 20, atk: [4, 8], def: 1, xp: 15, ramp: 0, speed: 1, scale: 0.85, fearsFire: true, flee: 0.4, lurk: true },
  centinela: { name: 'Centinela del Osario', idle: 'heavy', hitFx: 'smash', short: 'Centinela', spr: 'sentinel', hp: 22, atk: [3, 6], def: 2, xp: 14, ramp: 0, speed: 0.6, scale: 1, flee: 0.6, shield: true },
  hueco:  { name: 'Caballero Hueco', idle: 'heavy', hitFx: 'blade', spr: 'knight', hp: 30, atk: [4, 9], def: 3, xp: 24, ramp: 0, speed: 0.6, scale: 1.0, flee: 0.5 },
  // jefes: uno al final de cada piso
  // los jefes no escalan con la profundidad: sus números ya están pensados para su piso
  reyOsario: { name: 'El Rey del Osario', idle: 'heavy', hitFx: 'smash', spr: 'boneKing', hp: 200, atk: [12, 18], def: 3, xp: 45, ramp: 2, speed: 0, scale: 1.3, glow: 0.3, boss: true,
               special: { msg: 'El Rey del Osario descarga su pico', dmg: [19, 27], fuel: 0 } },
  cazador:   { name: 'El Cazador Gris', hitFx: 'claw', spr: 'hunter', hp: 375, atk: [15, 22], def: 5, xp: 80, ramp: 1, speed: 0, scale: 1.25, glow: 0.35, boss: true, drain: 4,
               special: { msg: 'El Cazador Gris salta desde la penumbra', dmg: [24, 32], fuel: 10 } },
  // La Sombra del Rescoldo (modificador): no aparece sola, custodia tu Rescoldo; su sprite es tu propio retrato
  sombraPropia: { name: 'Tu Sombra', spr: 'heroShade', idle: 'float', hitFx: 'shadow', hp: 30, atk: [4, 8], def: 1, xp: 20, ramp: 1, speed: 0, scale: 0.9, glow: 0.3, flee: 0 },
  boss:      { name: 'El Que Habita la Oscuridad', idle: 'float', hitFx: 'shadow', spr: 'boss', hp: 520, atk: [16, 24], def: 6, xp: 150, ramp: 2, speed: 0, scale: 1.15, glow: 0.45, fearsFire: true, drain: 8, boss: true, final: true,
               special: { msg: 'La oscuridad te abraza', dmg: [22, 32], fuel: 15 } },
};
const POOLS = {
  1: ['rata', 'rata', 'kobold', 'kobold', 'centinela', 'soplo'],
  2: ['kobold', 'ghoul', 'sombra', 'rata', 'soplo', 'acechador', 'centinela'],
  3: ['ghoul', 'sombra', 'hueco', 'hueco', 'acechador', 'soplo'],
};

const LINES = {
  intro: ['Otra lucecita bajando a mi cripta...', 'Adelante, caballero. Baja.', 'Todas las antorchas se apagan algún día.'],
  lowFuel: ['Tu llama tiembla, caballero.', 'Puedo oírla toser desde aquí.', 'Déjala morir. La oscuridad es tibia.'],
  floor2: ['Más hondo. Bien.', 'Aquí abajo los muros recuerdan nombres.', 'Pronto recordarán el tuyo.'],
  floor3: ['Llegaste al fondo del pozo.', 'Yo soy lo que queda', 'cuando la última llama se apaga.'],
  boss1: ['¿Oyes los huesos crujir?', 'Ese es el Rey del Osario.', 'Gobierna a los que murieron cavando. Y quiere tus huesos para su trono.'],
  boss1Dead: ['Vaya. Rompiste su corona.', 'Bajo el trono hay una escalera.', 'Sigue bajando, lucecita. Te espero.'],
  boss2: ['Huele tu llama desde hace tres niveles.', 'Él guio al rey hasta la Llama.', 'Saluda al Cazador Gris.'],
  boss2Dead: ['El primero en morir, otra vez.', 'Ya no queda nadie entre tú y el fondo.', 'Nadie, salvo él.'],
  boss3: ['Por fin nos vemos a la cara.', 'Tan pequeña, tu chispa...', 'Ven. Apágala en mis manos.'],
  bossDead: ['Imposible...', 'Una chispa... tan pequeña...', 'y aun así... arde.'],
  deaths: [
    ['¿Ya de vuelta?', 'Me quedé con un pedacito de tu llama.', 'Está donde caíste. Ve a buscarlo... si te atreves.'],
    ['Qué rápido se apagan las chispas.', 'Te devolví la vida. La vida es barata aquí abajo.', 'Lo que cargabas, en cambio, me lo quedo.'],
    ['Otra vez te encendieron.', 'Algún día no habrá nadie que lo haga.'],
  ],
};

// ---------- Estado ----------
const S = { mode: 'title', floor: 1, level: 1, flags: {}, steps: 0, kills: 0, deaths: 0, world: null, env: 'crypt' };
// profundidad total (1..15): escala enemigos y botín dentro de cada piso
const depth = () => (S.floor - 1) * LEVELS_PER_FLOOR + S.level;
const isBossLevel = () => S.level === LEVELS_PER_FLOOR;
let P, C = null, anim = null, pending = null, T = 0, runId = 0;
const cam = { x: 0, y: 0, a: 0 };
const fx = { shake: 0, flash: 0, fade: 0, hurt: 0 };

let ctx, frameBg, titleArt, titleDim;
const $ = id => document.getElementById(id);

function later(ms, fn) { const id = runId; setTimeout(() => { if (id === runId) fn(); }, ms); }

// ---------- Generación de niveles ----------
// Cada piso tiene su propia forma: la cripta son salas chicas y pasillos angostos,
// el castillo salones con columnatas y galerías anchas, el fondo cavernas orgánicas.
// Valores del mapa: 0 suelo · 1 muro · 2 escalera · 3 suelo de la guarida
const WALL_MIX = { crypt: [0.76, 0.94], castle: [0.8, 0.9], abyss: [0.74, 0.87] }; // umbrales de las variantes 0/1/2

function carveRect(map, x, y, w, h) {
  for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) map[j * MW + i] = 0;
}

function placeRooms(map, n, wmin, wmax, gap) {
  const rooms = [];
  for (let t = 0; t < 400 && rooms.length < n; t++) {
    const w = rnd(wmin, wmax), h = rnd(wmin, wmax), x = rnd(1, MW - w - 2), y = rnd(1, MH - h - 2);
    if (rooms.some(r => x < r.x + r.w + gap && x + w + gap > r.x && y < r.y + r.h + gap && y + h + gap > r.y)) continue;
    rooms.push({ x, y, w, h, cx: x + (w >> 1), cy: y + (h >> 1) });
  }
  for (const r of rooms) carveRect(map, r.x, r.y, r.w, r.h);
  return rooms;
}

// Une cada sala con la más cercana ya conectada, más dos pasillos extra para que haya vueltas
function connectRooms(map, rooms, wide) {
  const carve = (a, b) => {
    let x = a.cx, y = a.cy;
    const dig = () => {
      map[y * MW + x] = 0;
      if (wide) { map[y * MW + x + 1] = 0; map[(y + 1) * MW + x] = 0; }
    };
    const walkX = () => { while (x !== b.cx) { dig(); x += Math.sign(b.cx - x); } };
    const walkY = () => { while (y !== b.cy) { dig(); y += Math.sign(b.cy - y); } };
    if (chance(0.5)) { walkX(); walkY(); } else { walkY(); walkX(); }
    dig();
  };
  for (let i = 1; i < rooms.length; i++) {
    let best = 0, bd = 1e9;
    for (let j = 0; j < i; j++) {
      const d = Math.abs(rooms[i].cx - rooms[j].cx) + Math.abs(rooms[i].cy - rooms[j].cy);
      if (d < bd) { bd = d; best = j; }
    }
    carve(rooms[i], rooms[best]);
  }
  for (let k = 0; k < 2; k++) carve(pick(rooms), pick(rooms));
}

// Columnatas en los salones grandes del castillo
function addColonnades(map, rooms) {
  for (const r of rooms) {
    if (r.w < 7 || r.h < 7) continue;
    const placed = [];
    for (let x = r.x + 2; x <= r.x + r.w - 3; x += 3)
      for (const y of [r.y + 2, r.y + r.h - 3]) {
        if (x === r.cx || y === r.cy || map[y * MW + x] !== 0) continue;
        map[y * MW + x] = 1; placed.push(y * MW + x);
      }
    if (!allConnected(map, rooms[0].cx, rooms[0].cy)) for (const i of placed) map[i] = 0;
  }
}

// Cavernas por autómata celular; se queda con la región abierta más grande
function layoutCaves() {
  for (let attempt = 0; attempt < 30; attempt++) {
    let m = new Uint8Array(MW * MH);
    for (let y = 0; y < MH; y++)
      for (let x = 0; x < MW; x++)
        m[y * MW + x] = x === 0 || y === 0 || x === MW - 1 || y === MH - 1 || grand() < 0.5 ? 1 : 0;
    for (let it = 0; it < 5; it++) {
      const n = new Uint8Array(m);
      for (let y = 1; y < MH - 1; y++)
        for (let x = 1; x < MW - 1; x++) {
          let c = 0;
          for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) if ((i || j) && m[(y + j) * MW + x + i]) c++;
          n[y * MW + x] = c >= 5 || (it < 2 && c === 0) ? 1 : 0;
        }
      m = n;
    }
    const region = new Int32Array(MW * MH).fill(-1);
    let bestId = -1, bestN = 0;
    for (let s = 0, id = 0; s < MW * MH; s++) {
      if (m[s] || region[s] >= 0) continue;
      const q = [s]; region[s] = id;
      for (let h = 0; h < q.length; h++)
        for (const [dx, dy] of DIRS) {
          const ni = q[h] + dy * MW + dx;
          if (!m[ni] && region[ni] < 0) { region[ni] = id; q.push(ni); }
        }
      if (q.length > bestN) { bestN = q.length; bestId = id; }
      id++;
    }
    if (bestN < MW * MH * 0.3 || bestN > MW * MH * 0.55) continue;
    for (let i = 0; i < MW * MH; i++) if (!m[i] && region[i] !== bestId) m[i] = 1;
    return m;
  }
  // respaldo improbable: salas de cripta
  const m = new Uint8Array(MW * MH).fill(1);
  connectRooms(m, placeRooms(m, 10, 3, 6, 1), false);
  return m;
}

function distances(map, sx, sy) {
  const dist = new Int16Array(MW * MH).fill(-1), q = [sy * MW + sx];
  dist[q[0]] = 0;
  for (let h = 0; h < q.length; h++) {
    const c = q[h];
    for (const [dx, dy] of DIRS) {
      const ni = c + dy * MW + dx;
      if (map[ni] !== 1 && dist[ni] < 0) { dist[ni] = dist[c] + 1; q.push(ni); }
    }
  }
  return dist;
}

// La guarida del jefe: sala cuadrada en los pisos I y II; la Cámara de la Llama es circular,
// con un anillo de columnas y braseros apagados
function carveLair(map, wtype, fx, fy, final, solids, ents) {
  const R = final ? 5 : 3;
  const cx = clamp(fx, R + 1, MW - R - 2), cy = clamp(fy, R + 1, MH - R - 2);
  for (let y = cy - R; y <= cy + R; y++)
    for (let x = cx - R; x <= cx + R; x++) {
      if (final && (x - cx) ** 2 + (y - cy) ** 2 > R * R + 1) continue;
      map[y * MW + x] = 3;
    }
  // si la sala se corrió para no salirse del mapa, se la une con el punto lejano
  let x = fx, y = fy;
  while (x !== cx) { if (map[y * MW + x] === 1) map[y * MW + x] = 0; x += Math.sign(cx - x); }
  while (y !== cy) { if (map[y * MW + x] === 1) map[y * MW + x] = 0; y += Math.sign(cy - y); }
  if (final) {
    for (let k = 0; k < 8; k++) {
      const a = (k * Math.PI) / 4;
      map[(cy + Math.round(Math.sin(a) * 3)) * MW + cx + Math.round(Math.cos(a) * 3)] = 1;
    }
    for (const [dx, dy] of [[-4, 1], [4, -1], [1, -4], [-1, 4]]) {
      const i = (cy + dy) * MW + cx + dx;
      if (map[i] !== 3) continue;
      map[i] = 1;
      if (allConnected(map, cx, cy)) { solids.push([i, 3]); ents.push({ type: 'prop', p: 'out', x: cx + dx, y: cy + dy }); }
      else map[i] = 3;
    }
  }
  for (let y = cy - R - 1; y <= cy + R + 1; y++)
    for (let x2 = cx - R - 1; x2 <= cx + R + 1; x2++) if (map[y * MW + x2] === 1) wtype[y * MW + x2] = 3;
  return [cx, cy];
}

function genFloor(kind) {
  const theme = FLOOR_THEME[S.floor];
  let map, rooms = null;
  if (theme === 'crypt') {
    map = new Uint8Array(MW * MH).fill(1);
    rooms = placeRooms(map, 10, 3, 6, 1);
    connectRooms(map, rooms, false);
  } else if (theme === 'castle') {
    map = new Uint8Array(MW * MH).fill(1);
    rooms = placeRooms(map, 7, 5, 9, 2);
    connectRooms(map, rooms, true);
    addColonnades(map, rooms);
  } else map = layoutCaves();

  let sx, sy;
  if (rooms) { sx = rooms[0].cx; sy = rooms[0].cy; }
  else {
    const open = [];
    for (let i = 0; i < MW * MH; i++) if (!map[i]) open.push(i);
    const s = pick(open); sx = s % MW; sy = (s / MW) | 0;
  }
  let dist = distances(map, sx, sy);
  let far = 0;
  for (let i = 0; i < MW * MH; i++) if (dist[i] > dist[far]) far = i;

  const wtype = new Uint8Array(MW * MH);
  const [t1, t2] = WALL_MIX[theme];
  for (let i = 0; i < MW * MH; i++) { const h = grand(); wtype[i] = h < t1 ? 0 : h < t2 ? 1 : 2; }

  const ents = [];
  // cofres y objetos se marcan como muro mientras se genera, para que ninguno corte el paso
  const solids = [];
  let bossAt = null;
  if (kind === 'boss') {
    bossAt = carveLair(map, wtype, far % MW, (far / MW) | 0, S.floor === LAST_FLOOR, solids, ents);
    dist = distances(map, sx, sy);
  } else map[far] = 2;

  const occupied = (x, y) => ents.some(e => e.x === x && e.y === y);
  const openCell = (minDist, test) => {
    for (let t = 0; t < 600; t++) {
      const x = rnd(1, MW - 2), y = rnd(1, MH - 2), i = y * MW + x;
      if (map[i] === 0 && dist[i] >= minDist && !occupied(x, y) && (!test || test(x, y))) return [x, y];
    }
    return null;
  };
  const wall = (x, y) => map[y * MW + x] === 1;
  // una esquina de sala (con la diagonal libre) o un callejón sin salida; nunca un recodo ni un pasillo
  const nook = (x, y) => {
    const open = DIRS.filter(([dx, dy]) => !wall(x + dx, y + dy));
    if (open.length === 1) return true;
    if (open.length !== 2) return false;
    const [[ax, ay], [bx, by]] = open;
    if (ax + bx === 0 && ay + by === 0) return false;
    return !wall(x + ax + bx, y + ay + by);
  };
  // todo lo sólido que ya está puesto tiene que seguir teniendo un lado libre para usarlo
  const usable = i => DIRS.some(([dx, dy]) => map[i + dy * MW + dx] !== 1);
  const solidCell = () => openCell(2, (x, y) => {
    if (!nook(x, y)) return false;
    map[y * MW + x] = 1;
    const ok = allConnected(map, sx, sy) && solids.every(([i]) => usable(i));
    map[y * MW + x] = 0;
    return ok;
  });

  for (let k = 0, want = rnd(BAL.chests[0], BAL.chests[1]); k < want; k++) {
    const c = solidCell();
    if (!c) continue;
    ents.push({ type: 'chest', x: c[0], y: c[1], open: false });
    map[c[1] * MW + c[0]] = 1; solids.push([c[1] * MW + c[0], 0]);
  }
  for (let k = 0, want = rnd(4, 7); k < want; k++) {
    const c = solidCell();
    if (!c) continue;
    ents.push({ type: 'prop', p: rnd(0, PROPS[theme].length - 1), x: c[0], y: c[1] });
    map[c[1] * MW + c[0]] = 1; solids.push([c[1] * MW + c[0], 0]);
  }
  // a veces, un evento con decisiones (nunca en la guarida del jefe)
  if (kind !== 'boss' && chance(EVENT_CHANCE)) {
    const id = pickEvent(), c = id && solidCell();
    if (c) { ents.push({ type: 'event', ev: id, done: false, x: c[0], y: c[1] }); map[c[1] * MW + c[0]] = 1; solids.push([c[1] * MW + c[0], 0]); }
  }
  for (let k = 0; k < 4 + S.floor + S.level; k++) {
    const c = openCell(5);
    if (c) ents.push(makeEnemy(pick(POOLS[S.floor]), c[0], c[1]));
  }
  for (const [i, v] of solids) map[i] = v;
  if (bossAt) ents.push(makeEnemy(FLOOR_BOSS[S.floor], bossAt[0], bossAt[1]));
  for (const e of ents) { e.vx = e.x + 0.5; e.vy = e.y + 0.5; }

  let dir = 0;
  for (let d = 0; d < 4; d++) if (map[(sy + DIRS[d][1]) * MW + sx + DIRS[d][0]] !== 1) { dir = d; break; }
  // la sala secreta se talla al final: queda aislada hasta que se derrumbe su pared
  const secrets = [];
  if (kind !== 'boss' && chance(BAL.secretChance)) { const s = carveSecret(map, wtype, ents); if (s) secrets.push(s); }
  return { map, wtype, ents, theme, secrets, explored: new Uint8Array(MW * MH), start: [sx, sy, dir] };
}

function allConnected(map, sx, sy) {
  const seen = new Uint8Array(MW * MH), q = [sy * MW + sx];
  seen[q[0]] = 1;
  let n = 1;
  while (q.length) {
    const c = q.pop();
    for (const [dx, dy] of DIRS) {
      const ni = c + dy * MW + dx;
      if (map[ni] !== 1 && !seen[ni]) { seen[ni] = 1; n++; q.push(ni); }
    }
  }
  let open = 0;
  for (let i = 0; i < MW * MH; i++) if (map[i] !== 1) open++;
  return n === open;
}

const propDef = e => (e.p === 'out' ? FLAME_CHAMBER_PROP : PROPS[W_().theme][e.p]);

const enemyDef = e => e.def.def + (e.def.boss ? 0 : BAL.enemyDef(depth()));

function makeEnemy(kind, x, y) {
  const d = ENEMIES[kind];
  const hp = d.boss ? d.hp : Math.round(d.hp * BAL.enemyHp(depth()) * (modOn('muertos') ? 1.25 : 1)); // los jefes no se tocan
  return { type: 'enemy', kind, def: d, x, y, vx: x + 0.5, vy: y + 0.5, hp, maxhp: hp, aware: false, stun: 0 };
}

function enterLevel(floor, level) {
  const newFloor = floor !== S.floor || !frameBg;
  S.floor = floor; S.level = level;
  S.env = FLOOR_PAL[floor];
  setPalette(S.env);
  if (newFloor || !frameBg) frameBg = buildFrame(S.env);
  seedRng(S.flags.seed ?? newSeed(), floor, level);
  S.world = level === 0 ? genShrine() : genFloor(isBossLevel() ? 'boss' : 'normal');
  S.flags.lvSteps = 0;
  setMusic(floorMusic());
  const [x, y, d] = S.world.start;
  P.x = x; P.y = y; P.dir = d;
  cam.x = x + 0.5; cam.y = y + 0.5; cam.a = d * Math.PI / 2;
  anim = null; pending = null;
  reveal();
  updateHUD();
}

// ---------- Utilidades del mundo ----------
const W_ = () => S.world;
function isWall(x, y) { return x < 0 || y < 0 || x >= MW || y >= MH || W_().map[y * MW + x] === 1; }
function entAt(x, y) { return W_().ents.find(e => e.x === x && e.y === y); }
function blocked(x, y) { return isWall(x, y) || !!entAt(x, y) || (P.x === x && P.y === y); }

function hasLOS(x0, y0, x1, y1) {
  let dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1, err = dx + dy;
  while (!(x0 === x1 && y0 === y1)) {
    if (isWall(x0, y0)) return false;
    const e2 = 2 * err;
    if (e2 >= dy) { err += dy; x0 += sx; }
    if (e2 <= dx) { err += dx; y0 += sy; }
  }
  return true;
}

function reveal() {
  const ex = W_().explored, r = P.fuel > 0 ? 2 : 1;
  for (let y = P.y - r; y <= P.y + r; y++)
    for (let x = P.x - r; x <= P.x + r; x++)
      if (x >= 0 && y >= 0 && x < MW && y < MH && hasLOS(P.x, P.y, x, y)) ex[y * MW + x] = 1;
  // lo que alumbra la antorcha hacia adelante
  const [dx, dy] = DIRS[P.dir];
  for (let k = 1; k < 6; k++) {
    const x = P.x + dx * k, y = P.y + dy * k;
    if (x < 0 || y < 0 || x >= MW || y >= MH) break;
    ex[y * MW + x] = 1;
    for (const [ox, oy] of DIRS) { const ax = x + ox, ay = y + oy; if (ax >= 0 && ay >= 0 && ax < MW && ay < MH) ex[ay * MW + ax] = 1; }
    if (isWall(x, y)) break;
  }
  // la escalera exhala aire frío: se nota desde lejos si está a la vista
  const st = W_().map.indexOf(2);
  if (st >= 0 && !ex[st]) {
    const tx = st % MW, ty = (st / MW) | 0;
    if (Math.abs(tx - P.x) + Math.abs(ty - P.y) <= 6 && hasLOS(P.x, P.y, tx, ty)) ex[st] = 1;
  }
}

// Si pasás mucho tiempo en un nivel sin dar con la escalera, el aire te orienta y después la marca
const STAIRS_HINT = [160, 280];
function stairsHint() {
  const w = W_(), st = w.map.indexOf(2), n = S.flags.lvSteps = (S.flags.lvSteps || 0) + 1;
  if (st < 0 || w.explored[st] || (n !== STAIRS_HINT[0] && n !== STAIRS_HINT[1])) return;
  if (n === STAIRS_HINT[1]) { w.explored[st] = 1; log('Sigues el aire frío hasta su origen: la escalera queda marcada en tu mapa.', 'em'); return; }
  const dx = (st % MW) - P.x, dy = ((st / MW) | 0) - P.y;
  const dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'el este' : 'el oeste') : (dy > 0 ? 'el sur' : 'el norte');
  log(tr('Una corriente fría sube desde {0}: por ahí se baja.', dir), 'em');
}

// ---------- Jugador ----------
function newPlayer() {
  const r = RACES[CR.race], c = CLASSES[CR.cls];
  const p = {
    name: CR.name || 'Sin Nombre', race: CR.race, cls: CR.cls, x: 0, y: 0, dir: 0,
    lvl: 1, xp: 0, next: 10, fuel: 100,
    potions: modOn('ofrenda') ? 0 : BAL.startPotions + (perkOn('cinturon') ? 1 : 0), oil: modOn('ofrenda') ? 0 : BAL.startOil + (perkOn('mecha') ? 1 : 0),
    bHp: c.hp + (r.hp || 0), bAtk: c.atk + (r.atk || 0), bDef: c.def + (r.def || 0),
    equip: { arma: null, escudo: null, casco: null, pechera: null, botas: null }, bag: [],
    attr: { ...CR.attr }, attrPts: 0, runes: [], runeEq: [],
  };
  p.lives = p.livesMax = modOn('unaLlama') ? 1 : BAL.lives;
  for (const [slot, v] of startKit(CR.cls)) p.equip[slot] = makeItem(slot, c.weight, 0, v);
  p.hp = 999;
  return p;
}

function newGame() {
  runId++;
  const seed = EXP.seed ?? newSeed();
  S.flags = { runTag: Date.now().toString(36) + vrnd(0, 9999), mods: EXP.mods.slice(), seed, daily: EXP.daily || null };
  EXP.seed = null; EXP.daily = null;
  seedRng(seed);
  S.steps = 0; S.kills = 0; S.deaths = 0; S.lastHit = null; C = null;
  P = newPlayer();
  recalc();
  P.hp = P.maxhp;
  INV.sel = 0;
  logLines.length = 0; renderLog();
  frameBg = null;
  enterLevel(1, 1);
  S.mode = 'explore';
  showScreen(null);
  log(tr('{0}, {1} {2}, desciende a la Cripta de Vel’Ombra.', P.name, RACES[P.race].name.toLowerCase(), CLASSES[P.cls].name.toLowerCase()), 'em');
  log('WASD / flechas para moverte. Q/E para girar. I: inventario. Esc: pausa.');
  autosave(false);
  showDialog(LINES.intro, 'shade', 1);
}

function startAnim(fromX, fromY, toX, toY, fromA, toA, dur, bump) {
  anim = { fromX, fromY, toX, toY, fromA, toA, t: 0, dur, bump };
}

function tryMove(dirIdx) {
  const [dx, dy] = DIRS[dirIdx];
  const nx = P.x + dx, ny = P.y + dy;
  const a = P.dir * Math.PI / 2;
  if (isWall(nx, ny)) {
    const sec = secretAt(nx, ny);
    if (sec) hitSecret(sec);
    sfx('bump'); fx.shake = 3;
    startAnim(cam.x, cam.y, cam.x + dx * 0.12, cam.y + dy * 0.12, a, a, 0.16, true);
    return;
  }
  const e = entAt(nx, ny);
  if (e && e.type === 'enemy') { startCombat(e, false); return; }
  if (e && e.type === 'chest') { openChest(e); return; }
  if (e && e.type === 'reliquary') { openReliquary(e); return; }
  if (e && e.type === 'prop') { sfx('bump'); log(propDef(e)[3]); return; }
  if (e && e.type === 'event') { if (e.done) { sfx('bump'); log(EVENTS[e.ev].doneText); } else openEvent(e); return; }
  if (e && e.type === 'merchant') { openMerchant(); return; }
  if (e && e.type === 'bonfire') { useBonfire(e); return; }
  if (e && e.type === 'ember' && W_().ents.some(x => x.kind === 'sombraPropia')) {
    sfx('bump'); log('Tu Sombra custodia el Rescoldo: tienes que vencerla primero.', 'bad'); return;
  }
  if (e && e.type === 'ember') collectEmber(e);
  P.x = nx; P.y = ny;
  startAnim(cam.x, cam.y, nx + 0.5, ny + 0.5, a, a, 0.2);
  sfx('step');
  afterStep();
}

function turn(delta) {
  const fromA = cam.a;
  P.dir = (P.dir + delta + 4) % 4;
  startAnim(cam.x, cam.y, cam.x, cam.y, fromA, fromA + delta * Math.PI / 2, 0.17);
  sfx('turn');
  reveal();
}

function afterStep() {
  S.steps++;
  const before = P.fuel;
  P.fuel = Math.max(0, P.fuel - BAL.fuelPerStep * P.fuelMul);
  if (before > 0 && P.fuel === 0) log('Tu antorcha se apaga. La oscuridad te muerde.', 'bad');
  if (before >= BAL.lowFuel && P.fuel < BAL.lowFuel && P.fuel > 0)
    log(P.oil ? 'La antorcha chisporrotea: queda poco aceite. [O] para avivarla.' : 'La antorcha chisporrotea y no te queda aceite.', 'bad');
  if (P.fuel > 0 && P.fuel < BAL.lowFuel && chance(0.2)) sfx('sputter');
  if (P.fuel === 0) { S.flags.darkSteps = (S.flags.darkSteps || 0) + 1; checkAchievements(); }
  if (modOn('invertido')) {
    if (P.fuel === 0 && S.steps % 3 === 0 && P.hp < P.maxhp) P.hp++;
    else if (P.fuel > 0 && S.steps % 12 === 0 && P.hp > 1) { P.hp--; fx.hurt = 0.3; }
  } else if (P.fuel === 0 && S.steps % 3 === 0) {
    P.hp -= 1; fx.hurt = 0.6; S.lastHit = null;
    if (P.hp <= 0) { updateHUD(); playerFalls(); return; }
  }
  reveal();
  stairsHint();
  if (W_().map[P.y * MW + P.x] === 2) log('Una escalera desciende a la negrura. [Enter] para bajar.', 'em');
  enemiesAct();
  updateHUD();
  if (S.mode === 'explore' && P.fuel < 30 && P.fuel > 0 && !S.flags.lowFuel) {
    S.flags.lowFuel = 1;
    showDialog(LINES.lowFuel, 'shade', 1);
  }
  if (S.mode === 'explore' && S.steps % AUTOSAVE_STEPS === 0) autosave(false);
}

function enemiesAct() {
  for (const e of W_().ents) {
    if (e.type !== 'enemy' || S.mode !== 'explore') continue;
    if (e.stun > 0) { e.stun--; continue; }
    const d = Math.abs(e.x - P.x) + Math.abs(e.y - P.y);
    if (!e.aware && d <= (hasRelic('ojo') ? 9 : 6) && hasLOS(e.x, e.y, P.x, P.y)) e.aware = true;
    if (e.def.blows && d <= 3 && P.fuel > 0 && hasLOS(e.x, e.y, P.x, P.y)) {
      P.fuel = Math.max(0, P.fuel - 2);
      if (!S.blowLog || S.steps - S.blowLog > 4) { S.blowLog = S.steps; log('Un soplo helado lame tu antorcha (−2).', 'bad'); }
      sfx('sputter');
    }
    if (e.type !== 'enemy' || !e.aware || !e.def.speed || !chance(e.def.speed)) continue;
    const opts = DIRS.map(([dx, dy]) => ({ dx, dy, d: Math.abs(e.x + dx - P.x) + Math.abs(e.y + dy - P.y) + grand() * 0.5 }))
      .sort((a, b) => a.d - b.d);
    for (const o of opts) {
      if (o.d >= d + 0.5) break;
      const nx = e.x + o.dx, ny = e.y + o.dy;
      if (nx === P.x && ny === P.y) { startCombat(e, true); return; }
      if (!blocked(nx, ny)) { e.x = nx; e.y = ny; break; }
    }
  }
}

function openChest(c) {
  if (c.open) { log('El cofre está vacío.'); sfx('bump'); return; }
  c.open = true; sfx('chest');
  const r = grand();
  if (r < BAL.chest.potion) { if (modOn('ofrenda')) addConsumable('oil', 'Donde hubo una poción, solo queda un frasco de aceite.'); else addConsumable('potions', 'Encuentras una poción de sangre.'); }
  else if (r < BAL.chest.oil) addConsumable('oil', 'Encuentras un frasco de aceite.');
  else if (r < BAL.chest.rune && giveRune('En el cofre')) { /* runa entregada */ }
  else if (r < BAL.chest.item) giveItem(rollLoot(S.floor, false, S.level), 'En el cofre');
  else if (r < BAL.chest.atk) { P.bAtk++; recalc(); log('Un grimorio de esgrima: tu ataque sube (+1).', 'good'); }
  else { P.bDef++; recalc(); log('Un relicario bendito: tu defensa sube (+1).', 'good'); }
  later(150, () => sfx('pickup'));
  updateHUD();
}

// Pociones y aceite van en el cinturón, con lugar limitado
function addConsumable(kind, msg) {
  const max = kind === 'potions' ? BAL.maxPotions : BAL.maxOil;
  if (P[kind] >= max) { log(tr('{0}, pero tu cinturón está lleno.', tr(msg).replace(/\.$/, '')), 'bad'); return; }
  P[kind]++;
  log(msg, 'good');
}

function usePotion() {
  if (P.potions <= 0) { log('No te quedan pociones.'); return false; }
  if (P.hp >= P.maxhp) { log('Ya estás entero.'); return false; }
  P.potions--;
  const h = Math.round(BAL.potionHeal(P) * (hasRelic('caliz') ? 0.5 : 1));
  P.hp = Math.min(P.maxhp, P.hp + h);
  floatNum('+' + h, 'heal');
  log(tr('Bebes la poción. +{0} vida.', h), 'good'); sfx('heal');
  updateHUD();
  return true;
}

function useOil() {
  if (P.oil <= 0) { log('No te queda aceite.'); return false; }
  if (P.fuel >= 95) { log('La antorcha arde bien por ahora.'); return false; }
  P.oil--;
  P.fuel = Math.min(100, P.fuel + (hasRelic('lagrima') ? 30 : BAL.oilFuel));
  log('Empapas la antorcha en aceite. Se aviva.', 'good'); sfx('oil');
  if (hasRelic('lagrima')) { const h = Math.round(P.maxhp * 0.2); P.hp = Math.min(P.maxhp, P.hp + h); floatNum('+' + h, 'heal'); log(tr('La Lágrima de Cera gotea sobre tus heridas (+{0}).', h), 'good'); }
  S.flags.lowFuel = P.fuel >= 30 ? S.flags.lowFuel : 0;
  updateHUD();
  return true;
}

const levelName = () => (isShrine() ? tr('Piso {0} · Santuario', ROMAN[S.floor]) : isBossLevel() ? tr('Piso {0} · Guarida', ROMAN[S.floor]) : tr('Piso {0} · Nivel {1}', ROMAN[S.floor], S.level));

function descend() {
  sfx('stairs');
  // desde la guarida del jefe se baja al santuario del piso siguiente; si no, al próximo nivel
  const nextFloor = isBossLevel();
  transition(() => {
    if (nextFloor) enterLevel(S.floor + 1, 0); else enterLevel(S.floor, S.level + 1);
    log(`${levelName()}.`, 'em');
    if (isShrine()) log('Aquí no llega nada vivo. Una fogata, y alguien que espera junto a ella.', 'em');
    if (isBossLevel()) log('Se siente una presencia enorme en este nivel.', 'bad');
    if (P.attrPts) log(tr('✦ Tienes {0} punto{1} de atributo sin repartir. [U] para usarlo{1}.', P.attrPts, P.attrPts > 1 ? 's' : ''), 'em');
    autosave(true);
  }, () => { if (nextFloor) showDialog(LINES['floor' + S.floor], 'shade', 1); });
}

function transition(mid, after) {
  S.mode = 'fade';
  fx.fadeDir = 1; fx.fadeMid = mid; fx.fadeAfter = after;
}

// ---------- Combate ----------
function startCombat(e, ambush) {
  S.mode = 'combat';
  C = {
    e, sel: 0, busy: true, def: false, turn: 0, shake: 0, flash: 0,
    imp: 0, dots: [], stun: 0, shield: 0, defBuff: 0, nextCrit: false, bastion: false,
  };
  e.aware = true;
  // si ataca de costado o por la espalda, giramos para verlo de frente
  const face = DIRS.findIndex(([dx, dy]) => P.x + dx === e.x && P.y + dy === e.y);
  if (face >= 0 && face !== P.dir) {
    const delta = ((face - P.dir + 4) % 4) === 3 ? -1 : ((face - P.dir + 4) % 4);
    const fromA = cam.a;
    P.dir = face; pending = null;
    startAnim(cam.x, cam.y, P.x + 0.5, P.y + 0.5, fromA, fromA + delta * Math.PI / 2, 0.22);
    reveal();
  }
  codexNote('foes', e.kind);
  sfx('encounter');
  if (e.def.boss) setMusic(e.def.final ? 'final' : 'boss');
  log(ambush ? tr('¡{0} te embosca!', foeName(e.def, true)) : tr('Te enfrentas a {0}.', foeName(e.def)), 'bad');
  if (ambush && e.def.lurk) { C.lurkHit = true; log('Salta desde la oscuridad: su primer golpe será brutal.', 'bad'); }
  // la primera pelea de la partida explica el Ímpetu
  if (!S.flags.impTip) { S.flags.impTip = 1; log('Atacar y defenderte cargan Ímpetu ◆; tus habilidades lo gastan.', 'em'); }
  cfxStartCombat(e);
  if (ambush) CFX.foe.appear = 0.7;
  $('combat').classList.remove('hidden');
  renderCombatMenu();
  const go = () => { if (ambush) later(650, enemyTurn); else C.busy = false; renderCombatMenu(); };
  if (e.def.boss && !S.flags['talk_' + e.kind]) {
    S.flags['talk_' + e.kind] = 1;
    const who = e.def.final ? ['boss', 2] : ['shade', 1];
    showDialog(LINES['boss' + S.floor], who[0], who[1], () => { S.mode = 'combat'; go(); });
  } else go();
}

// Atacar, las habilidades activas aprendidas y luego las acciones comunes
// Cada opción trae ícono, un dato a la derecha (Ímpetu, costo, cantidad) y su descripción
// habilidades a las que la lápida no afecta (fuego, o que no pegan)
const FIRE_SKILLS = ['arcana', 'tormenta', 'ceniza'];
const SKILL_ICON = { juramento: 'cross', punalada: 'dagger', veneno: 'poison', danza: 'daggers', arcana: 'star', ceniza: 'ash', tormenta: 'storm' };
function combatOptions() {
  const e = C.e, cost = burnCost(), wk = weaponKind(), w = P.equip.arma;
  // con la lápida alzada los golpes pegan al 30%: lo mostramos así para que se vea que conviene el fuego
  const sh = C.eShield ? 0.3 : 1, shNote = C.eShield ? tr(' <em>La lápida frena tus golpes.</em>') : '';
  const lo = Math.max(1, Math.round(sh * (1 + P.atk - enemyDef(e)))), hi = Math.max(1, Math.round(sh * (6 + P.atk - enemyDef(e))));
  const off = P.equip.escudo, pct = isOffDagger(off) && DUAL_PCT[off.tier];
  const offNote = pct ? tr(' Remata con la otra daga: {0}–{1}.', Math.max(1, Math.round(sh * (Math.round((1 + P.atk) * pct[0]) - enemyDef(e)))), Math.max(1, Math.round(sh * (Math.round((6 + P.atk) * pct[1]) - enemyDef(e))))) : '';
  const iname = w && itemName(w), wname = w ? tr('tu {0}', iname[0].toLowerCase() + iname.slice(1)) : tr('los puños');
  const opts = [{ id: 'atk', label: tr('Atacar'), ic: wk, fn: actAttack,
    desc: tr('Golpeas con {0}. Daño {1}–{2}, {3}% de crítico.', wname, lo, hi, Math.round(P.crit * 100)) + offNote + shNote }];
  for (const s of learnedActives()) {
    const r = skillRank(s.id), cost = s.cost(r), short = C.imp < cost;
    const noFuel = s.id === 'tormenta' && P.fuel < 15;
    opts.push({
      id: s.id, fn: () => useSkill(s), off: short || noFuel, ic: SKILL_ICON[s.id] || wk,
      label: (s.short || s.name) + (s.ranks.length > 1 ? ` <small>${ROMAN[r]}</small>` : ''),
      meta: `<span class="imp${short ? ' short' : ''}">${'◆'.repeat(cost)}</span>`,
      desc: (short ? tr('<em>Necesitas {0} de Ímpetu: ataca o defiéndete para juntarlo.</em> ', cost) : noFuel ? '<em>Necesitas 15 de antorcha.</em> ' : '') + s.desc(r) +
        (FIRE_SKILLS.includes(s.id) ? '' : shNote),
    });
  }
  const flee = hasSkill('pies') ? 1 : Math.min(1, e.def.flee + (RACES[P.race].flee || 0));
  const guard = Math.round((hasSkill('baluarte') ? 0.3 : 0.5) * (hasRune('piedra') ? 0.65 : 1) * 100);
  opts.push(
    { id: 'def', label: tr('Defender'), ic: 'shield', fn: actDefend, desc: tr('Alzas la guardia: el próximo golpe te hace el {0}% del daño.', guard) },
    { id: 'burn', label: tr('Quemar'), ic: 'flame', fn: actBurn, off: P.fuel < cost, meta: `−${cost}`,
      desc: tr('Hundes la antorcha en la criatura. Gasta {0} de antorcha{1}. Atraviesa escudos.', cost, e.def.fearsFire ? '; <em>teme al fuego: daño doble</em>' : '') +
        (C.eShield ? tr(' <em>Ahora conviene: el fuego pasa la lápida.</em>') : '') },
    { id: 'potion', label: tr('Poción'), ic: 'flask', fn: actPotion, off: P.potions <= 0, meta: `×${P.potions}`,
      desc: tr('Recuperas {0} de vida. Te quedan {1}.', Math.round(BAL.potionHeal(P) * (hasRelic('caliz') ? 0.5 : 1)), P.potions) },
    { id: 'flee', label: tr('Huir'), ic: 'flee', fn: actFlee, off: !!e.def.boss, meta: e.def.boss ? '' : `${Math.round(flee * 100)}%`,
      desc: e.def.boss ? 'No hay escapatoria de un jefe.' : tr('Intentas escabullirte: {0}% de lograrlo.', Math.round(flee * 100)) },
  );
  return opts;
}

// Cabecera del enemigo: nombre, vida y estados (lo que conviene saber para decidir)
function renderFoe() {
  if (!C) return;
  const e = C.e, d = e.def, tags = [];
  if (d.special && (C.turn + 1) % 3 === 0 && e.hp > 0) tags.push(`<b class="warn">${tr('¡Prepara un golpe!')}</b>`);
  if (C.eShield) tags.push(`<b>${tr('Escudo alzado')}</b>`);
  if (C.stun) tags.push(`<b>${tr('Aturdido')}</b>`);
  for (const t of C.dots) tags.push(`${t.name} ${t.turns}`);
  if (d.fearsFire) tags.push(tr('Teme al fuego'));
  if (d.boss && !tags.length) tags.push(tr('Jefe'));
  $('foeName').textContent = d.name;
  $('foeHp').textContent = `${Math.max(0, e.hp)}/${e.maxhp}`;
  $('foeTags').innerHTML = tags.join(' · ');
}

function renderCombatMenu() {
  if (!C) return;
  const opts = combatOptions(), sel = opts[C.sel] || opts[0];
  $('combatMenu').innerHTML = opts.map((o, i) =>
    `<div class="opt${i === C.sel ? ' sel' : ''}${o.off ? ' off' : ''}" data-i="${i}"><span class="k">${i + 1}</span>${icon(o.ic)}<span class="ol">${tr(o.label)}</span>${o.meta ? `<span class="om">${o.meta}</span>` : ''}</div>`).join('');
  const buffs = [];
  if (C.shield > 0) buffs.push(`${icon('ash')}${C.shield}`);
  if (C.defBuff) buffs.push(`${icon('shield')}+${C.defBuff}`);
  if (C.nextCrit) buffs.push(tr('{0}crít.', icon('gem')));
  $('cturn').innerHTML = `<span>${tr(C.busy ? 'Turno enemigo' : 'Tu turno')}</span><span class="buffs">${buffs.join(' ')}</span>` +
    `<span class="impbar" title="${tr('Ímpetu: atacar o defender lo carga; las habilidades lo gastan.')}">${tr('Ímpetu')} <b>${impPips(C.imp)}</b></span>`;
  $('cpanel').classList.toggle('busy', C.busy);
  $('cdesc').innerHTML = glyphText(tr(sel.desc || ''));
  renderFoe();
}

function chooseCombat(i) {
  if (!C || C.busy) return;
  const o = combatOptions()[i];
  if (!o) return;
  C.sel = i;
  if (o.off) { sfx('bump'); renderCombatMenu(); return; }
  C.busy = true; C.def = false;
  // atacar y defenderse cargan el Ímpetu que gastan las habilidades
  if (o.id === 'atk' || o.id === 'def') gainImpetu();
  renderCombatMenu();
  o.fn();
}

// ---------- Números flotantes ----------
// kind: hit · crit · dot · hurt · heal. Los del enemigo salen sobre su retrato; los del jugador, a la izquierda.
function floatNum(text, kind) {
  const el = document.createElement('div');
  el.className = 'fnum ' + kind;
  el.textContent = text;
  const mine = kind === 'hurt' || kind === 'heal';
  el.style.left = (mine ? VX + 34 + rnd(-6, 6) : VX + FOE_X + rnd(-22, 22)) + 'px';
  el.style.top = (mine ? VY + 150 : VY + 64 + rnd(-10, 10)) + 'px';
  $('fx').appendChild(el);
  setTimeout(() => el.remove(), 1000);
}

// next: lo que sigue si el enemigo sigue en pie (por defecto, su turno)
function damageEnemy(dmg, msg, crit, fire, next) {
  const e = C.e;
  if (!fire && hasRune('rayo') && chance(0.2)) { dmg = Math.round(dmg * 1.6); msg += tr(' — ¡cae un rayo!'); cfxBolt(); }
  if (hasRelic('craneo') && e.hp <= e.maxhp * 0.3) { dmg *= 2; msg += tr(' — ¡el Cráneo del Verdugo dobla el golpe!'); }
  if (C.eShield && !fire) { dmg = Math.max(1, Math.round(dmg * 0.3)); msg += tr(' — el escudo lo frena'); }
  e.hp -= dmg;
  C.flash = 1; C.shake = 8;
  cfxImpact(C.strike || (fire ? 'fire' : weaponKind()), crit, C.heavy);
  C.strike = null; C.heavy = false;
  floatNum(crit ? tr('¡{0}!', dmg) : String(dmg), crit ? 'crit' : 'hit');
  log(msg, 'good');
  renderFoe();
  if (e.hp <= 0) { later(450, () => victory(e)); return; }
  if (next) { later(380, next); return; }
  later(650, enemyTurn);
}

function actAttack() {
  sfx('swing');
  cfxStrike(weaponKind());
  // con una daga en la mano izquierda, el golpe se remata con un segundo más flojo
  const off = isOffDagger(P.equip.escudo) ? P.equip.escudo : null;
  const next = off ? () => offhandStrike(off) : null;
  later(160, () => {
    const e = C.e;
    if (chance(0.12)) { sfx('miss'); cfxMiss(); log('Tu golpe corta el aire.'); if (next) later(380, next); else later(550, enemyTurn); return; }
    let dmg = Math.max(1, rnd(1, 6) + P.atk - enemyDef(e));
    const crit = C.nextCrit || chance(P.crit);
    C.nextCrit = false;
    if (crit) dmg *= hasRelic('dado') ? 3 : 2;
    sfx('hit');
    damageEnemy(dmg, crit ? tr('¡Golpe certero! −{0}', dmg) : tr('Golpeas a {0}: −{1}', foeName(e.def), dmg), crit, false, next);
  });
}

// Segundo golpe del Pícaro: una parte del daño común según la daga, con su propio fallo y su propio crítico
function offhandStrike(off) {
  sfx('swing');
  cfxStrike('dagger');
  later(140, () => {
    const e = C.e;
    if (chance(0.12)) { sfx('miss'); cfxMiss(); log('La otra daga no encuentra hueco.'); later(550, enemyTurn); return; }
    const [lo, hi] = DUAL_PCT[off.tier];
    let dmg = Math.max(1, Math.round((rnd(1, 6) + P.atk) * (lo + grand() * (hi - lo))) - enemyDef(e));
    const crit = chance(P.crit);
    if (crit) dmg *= hasRelic('dado') ? 3 : 2;
    sfx('hit');
    C.strike = 'rapier';
    damageEnemy(dmg, crit ? tr('¡La otra daga también acierta! −{0}', dmg) : tr('Rematas con la otra daga: −{0}', dmg), crit);
  });
}

function actDefend() {
  C.def = true;
  sfx('whoosh');
  const g = guardKind();
  log(g === 'ward' ? 'Trazas un sello de protección y esperas.' : g === 'parry' ? 'Cruzas el arma y esperas.' : 'Alzas el escudo y esperas.');
  later(450, enemyTurn);
}

function actBurn() {
  P.fuel = Math.max(0, P.fuel - burnCost());
  updateHUD();
  sfx('fire');
  cfxStrike('torch'); C.strike = 'fire';
  let dmg = Math.round((rnd(4, 9) + P.lvl + P.power) * (CLASSES[P.cls].fireMul || 1) * (hasRune('brasa') ? 1.4 : 1) * (S.burnBuff === depth() ? 1.5 : 1));
  const e = C.e;
  if (e.def.fearsFire) dmg *= 2;
  fireHeal(dmg);
  later(200, () => damageEnemy(dmg, e.def.fearsFire ? tr('¡La criatura chilla ante el fuego! −{0}', dmg) : tr('Lo quemas con la antorcha: −{0}', dmg), false, true));
}

function actPotion() {
  if (!usePotion()) { C.busy = false; renderCombatMenu(); return; }
  cfxHeal();
  later(500, enemyTurn);
}

function actFlee() {
  if (hasSkill('pies') || chance(C.e.def.flee + (RACES[P.race].flee || 0))) {
    log('Te escabulles entre las sombras.');
    C.e.stun = 4;
    endCombat();
  } else {
    log('¡No logras escapar!', 'bad');
    later(450, enemyTurn);
  }
}

function enemyTurn() {
  if (!C) return;
  const e = C.e, d = e.def;
  // veneno y sangrado actúan al comienzo del turno enemigo
  if (C.dots.length) {
    let tot = 0;
    for (const dt of C.dots) { tot += dt.dmg; dt.turns--; }
    const names = C.dots.map(x => x.name.toLowerCase()).join(' y ');
    C.dots = C.dots.filter(x => x.turns > 0);
    e.hp -= tot; C.flash = 0.6;
    cfxDot(names);
    renderFoe();
    floatNum(String(tot), 'dot');
    log(tr('{0} sufre {1} por {2}.', foeName(d, true), tot, names), 'good');
    if (e.hp <= 0) { later(450, () => victory(e)); return; }
  }
  if (C.stun > 0) { C.stun--; log(tr(isFemFoe(d.name) && SETTINGS.lang === 'es' ? '{0} está aturdida y no ataca.' : '{0} está aturdido y no ataca.', foeName(d, true))); endEnemyTurn(); return; }
  // se echa atrás para tomar impulso y recién entonces golpea
  cfxFoeWindup();
  later(d.boss ? 380 : 280, enemyStrike);
}

function enemyStrike() {
  if (!C) return;
  const d = C.e.def, hitFx = d.hitFx || 'blade';
  C.turn++; cfxFoeLunge();
  S.lastHit = d.name;
  sfx('swing');
  // La defensa reduce el daño de forma proporcional (nunca lo anula)
  const guard = C.def ? (hasSkill('baluarte') ? 0.3 : 0.5) * (hasRune('piedra') ? 0.65 : 1) : 1;
  const k = BAL.defK(depth());
  const fury = modOn('muertos') && !d.boss ? 1.15 : 1;
  const mitigate = raw => Math.max(1, Math.round((raw * fury * k) / (k + P.def + C.defBuff) * guard));
  if (d.special && C.turn % 3 === 0) {
    const sp = d.special;
    cfxFoeAttack(hitFx, true, C.def);
    hurtPlayer(mitigate(rnd(sp.dmg[0], sp.dmg[1])), sp.msg);
    if (sp.fuel) { P.fuel = Math.max(0, P.fuel - sp.fuel); log('Tu antorcha se encoge.', 'bad'); cfxDrain(); }
  } else if (chance(0.08 + Math.min(P.dodge, dodgeCap()))) { // la esquiva tiene tope
    log(tr('{0} falla.', foeName(d, true))); sfx('miss'); cfxFoeMiss();
    gainImpetu(); // esquivar también carga Ímpetu (el Pícaro vive de esto)
    if (hasSkill('sombras')) { C.nextCrit = true; log('Te deslizas a su espalda: tu próximo golpe será crítico.', 'good'); }
  } else {
    let raw = rnd(d.atk[0], d.atk[1]);
    if (C.lurkHit) { raw = Math.round(raw * 1.6); C.lurkHit = false; }
    cfxFoeAttack(hitFx, false, C.def);
    hurtPlayer(mitigate(d.boss ? raw : Math.round(raw * BAL.enemyDmg(depth())) + BAL.enemyDmgFlat(depth())), tr('{0} te hiere', foeName(d, true)));
    if (d.drain && P.fuel > 0) { P.fuel = Math.max(0, P.fuel - d.drain); log('…y sorbe tu antorcha.', 'bad'); cfxDrain(); }
  }
  if (C.def && hasSkill('baluarte') && P.hp > 0) {
    const h = Math.round(P.maxhp * 0.06);
    P.hp = Math.min(P.maxhp, P.hp + h);
    floatNum('+' + h, 'heal');
  }
  endEnemyTurn();
}

function endEnemyTurn() {
  if (C.e.def.shield && C.e.hp > 0) {
    C.eShield = !C.eShield;
    if (C.eShield) log('El Centinela alza su lápida: tus golpes rebotarán, el fuego no.', 'bad');
  }
  updateHUD();
  if (P.hp <= 0) { later(700, playerFalls); return; }
  if (C.e.hp <= 0) { const e = C.e; later(450, () => victory(e)); return; } // cayó por Represalia
  C.busy = false;
  renderCombatMenu();
}

function hurtPlayer(dmg, msg) {
  if (C && C.shield > 0) {
    const a = Math.min(C.shield, dmg);
    C.shield -= a; dmg -= a;
    log(tr('El escudo de ceniza absorbe {0}.', a), 'good');
    if (dmg <= 0) return;
  }
  P.hp -= dmg;
  if (P.hp <= 0 && hasRune('destino') && S.flags.fateLv !== depth()) {
    P.hp = 1; S.flags.fateLv = depth();
    log('La Runa del Destino arde un instante: este no es tu final. Sigues en pie con 1 de vida.', 'em');
  }
  floatNum('−' + dmg, 'hurt');
  fx.hurt = 1; fx.shake = 6;
  sfx('hurt');
  log(`${msg}: −${dmg}`, 'bad');
  if (!C) return;
  if (P.hp <= 0 && hasSkill('bastion') && !C.bastion) {
    C.bastion = true; P.hp = 1;
    log('¡Último Bastión! Te mantienes en pie con 1 de vida.', 'em');
  }
  if (P.hp > 0 && hasSkill('represalia') && chance(0.2)) {
    const r = Math.ceil(dmg * 0.4);
    C.e.hp -= r; C.flash = 0.6;
    if (CFX.foe) CFX.foe.hit = 0.7;
    floatNum(String(r), 'dot');
    log(tr('Represalia: le devuelves {0}.', r), 'good');
  }
}

function victory(e) {
  C.dying = 0.001; sfx('vanish'); cfxDeath();
  codexNote('foes', e.kind, true);
  const ents = W_().ents;
  ents.splice(ents.indexOf(e), 1);
  S.kills++;
  const xp = Math.round(e.def.xp * (RACES[P.race].xp || 1) * (hasRune('rey') ? 1.25 : 1) * (S.bellXp === depth() ? 2 : 1));
  log(tr('{0} cae. +{1} exp.', foeName(e.def, true), xp), 'em');
  if (chance(e.def.boss ? 1 : e.kind === 'hueco' ? 0.6 : 0.35)) giveItem(rollLoot(S.floor, e.def.boss, S.level), 'Botín');
  if (chance(e.def.boss ? 1 : BAL.dropConsumable)) {
    if (chance(0.5)) addConsumable('oil', 'Deja caer un frasco de aceite.');
    else addConsumable('potions', 'Deja caer una poción.');
  }
  // runas que premian cada victoria
  if (hasRune('aguas')) P.fuel = Math.min(100, P.fuel + 3);
  if (hasRelic('caliz') && (P.calizHp || 0) < 20) { P.calizHp = (P.calizHp || 0) + 1; recalc(); P.hp++; }
  if (hasRune('vida')) { const h = Math.round(P.maxhp * 0.08); P.hp = Math.min(P.maxhp, P.hp + h); floatNum('+' + h, 'heal'); }
  if (e.def.boss) {
    S.flags['down_' + e.kind] = 1;
    giveRune(tr('{0} deja caer', foeName(e.def, true)));
    if (e.kind === 'reyOsario') {
      toastQueue.push({ title: 'Tercera ranura de runa', desc: 'Ahora puedes encastrar tres runas a la vez.', kind: 'Permanente' });
      nextToast();
    }
  }
  gainXp(xp);
  checkAchievements();
  if (e.def.final) {
    later(600, () => {
      endCombat();
      showDialog(LINES.bossDead, 'boss', 2, openEndingMenu);
    });
    return;
  }
  if (e.def.boss) {
    // el jefe del piso abre la bajada al siguiente
    W_().map[e.y * MW + e.x] = 2;
    W_().explored[e.y * MW + e.x] = 1;
    later(600, () => {
      endCombat();
      log(tr('Donde cayó {0} se abre una escalera hacia el Piso {1}.', foeName(e.def), ROMAN[S.floor + 1]), 'em');
      autosave(true);
      showDialog(LINES['boss' + S.floor + 'Dead'], 'shade', 1);
    });
    return;
  }
  later(500, endCombat);
}

function gainXp(xp) {
  P.xp += xp;
  while (P.xp >= P.next) {
    P.lvl++; P.xp -= P.next; P.next = Math.floor(P.next * 1.7);
    P.bHp += CLASSES[P.cls].hpLvl; P.bAtk++; if (P.lvl % 2) P.bDef++;
    recalc(); P.hp = P.maxhp;
    log(tr('¡Subes a nivel {0}! Te sientes más fuerte.', P.lvl), 'em');
    later(300, () => sfx('level'));
    fx.flash = 0.6;
    announceSkills(P.lvl);
    grantAttrPoint(P.lvl);
  }
  updateHUD();
}

function endCombat() {
  C = null;
  setMusic(floorMusic());
  $('combat').classList.add('hidden');
  if (S.mode === 'combat') S.mode = 'explore';
}

// ---------- Diálogos de la Sombra ----------
let dialogCb = null, dialogReady = 0;
function showDialog(lines, portrait, ramp, cb) {
  lines = lines.map(l => tr(l));
  S.prevMode = S.mode === 'dialog' ? S.prevMode : S.mode;
  S.mode = 'dialog';
  S.dialog = { portrait, ramp, t: 0 };
  dialogCb = cb || null;
  dialogReady = performance.now() + 500;
  // cada frase aparece cuando la anterior terminó de decirse
  const voice = portrait === 'boss' ? 'rey' : 'sombra';
  let at = 0.3;
  const boxes = lines.map(l => {
    const d = at;
    at += speakLine(l, voice, d) + 0.35;
    return `<div class="box" style="animation-delay:${d}s">${l}</div>`;
  });
  $('dialog').innerHTML = boxes.join('') + `<div class="hint" style="animation-delay:${at}s">— ${glyph('ok')} —</div>`;
  $('dialog').classList.remove('hidden');
  $('stage').classList.add('talking');
  sfx('whisper');
}

function closeDialog() {
  if (performance.now() < dialogReady) return;
  $('dialog').classList.add('hidden');
  $('stage').classList.remove('talking');
  S.mode = S.prevMode === 'combat' && C ? 'combat' : 'explore';
  const cb = dialogCb; dialogCb = null;
  if (cb) cb();
}

// ---------- Muerte: la llama renace ----------
// Al caer, la Sombra se queda con tu experiencia en curso y tu mochila y los deja
// en un Rescoldo donde caíste. Renaces al inicio del nivel; si recuperas el Rescoldo
// lo recobras todo. Si mueres antes de llegar, el Rescoldo anterior se pierde.
function playerFalls() {
  S.deaths++;
  P.lives = Math.max(0, (P.lives ?? BAL.lives) - 1);
  sfx('death');
  // el que te mató recupera sólo la mitad de lo que le sacaste: cada intento cuenta
  if (C) { C.e.hp = Math.min(C.e.maxhp, C.e.hp + Math.ceil((C.e.maxhp - C.e.hp) / 2)); C.e.stun = 3; }
  setMusic(floorMusic());
  C = null;
  $('combat').classList.add('hidden');
  if (P.lives <= 0) { endRun(false); return; }
  S.mode = 'dead';
  const ents = W_().ents;
  const old = ents.find(e => e.type === 'ember');
  if (old) ents.splice(ents.indexOf(old), 1);
  const coin = hasRelic('moneda');
  const lost = { xp: P.xp, bag: coin ? [] : P.bag.splice(0) };
  if (coin && P.potions > 0) { P.potions--; log('La Moneda Funeraria se cobra una poción: tu mochila queda contigo.', 'em'); }
  P.xp = 0;
  const any = lost.xp > 0 || lost.bag.length > 0;
  if (any) ents.push({ type: 'ember', x: P.x, y: P.y, vx: P.x + 0.5, vy: P.y + 0.5, xp: lost.xp, bag: lost.bag });
  for (let i = ents.length - 1; i >= 0; i--) if (ents[i].kind === 'sombraPropia') ents.splice(i, 1);
  if (any && modOn('sombra')) {
    buildHeroShade();
    const spot = DIRS.map(([dx, dy]) => [P.x + dx, P.y + dy]).find(([x, y]) => !isWall(x, y) && !ents.some(e => e.x === x && e.y === y));
    if (spot) {
      const sh = makeEnemy('sombraPropia', spot[0], spot[1]);
      sh.hp = sh.maxhp = Math.round(P.maxhp * 0.8);
      ents.push(sh);
    }
  }
  const what = [lost.xp ? tr('{0} de experiencia', lost.xp) : '', lost.bag.length ? `${lost.bag.length} objeto${lost.bag.length > 1 ? 's' : ''}` : '']
    .filter(Boolean).join(' y ');
  showScreen('Tu llama se apaga',
    (any ? tr('La Sombra se quedó con {0}.<br>Quedó un <b>Rescoldo</b> donde caíste: recupéralo antes de volver a caer.', what) : 'No llevabas nada que la Sombra quisiera.') +
    (old ? '<br><i>El rescoldo anterior se consumió para siempre.</i>' : '') +
    tr('<br>Te {0} <b>{1} llama{2}</b>{3}.', P.lives > 1 ? 'quedan' : 'queda', P.lives, P.lives > 1 ? 's' : '', P.lives === 1 ? ': la próxima caída será la última' : ''), 'Enter para renacer');
  updateHUD();
}

function revive() {
  showScreen(null);
  transition(() => {
    const [x, y, d] = S.world.start;
    P.x = x; P.y = y; P.dir = d;
    cam.x = x + 0.5; cam.y = y + 0.5; cam.a = d * Math.PI / 2;
    P.hp = P.maxhp;
    P.fuel = Math.max(P.fuel, 60);
    anim = null; pending = null;
    reveal();
    log('Tu llama renace al inicio del nivel.', 'em');
    // nunca renaces con el cinturón vacío: una poción y un frasco de aceite como mínimo
    const gifts = [];
    if (!P.potions && !modOn('ofrenda')) { P.potions = 1; gifts.push('una poción'); }
    if (!P.oil) { P.oil = 1; gifts.push('un frasco de aceite'); }
    if (gifts.length) log(tr('Junto a ti, en la ceniza: {0}.', gifts.map(g => tr(g)).join(tr(' y '))), 'good');
    updateHUD();
  }, () => showDialog(LINES.deaths[(S.deaths - 1) % LINES.deaths.length], 'shade', 1));
}

function collectEmber(e) {
  const ents = W_().ents;
  sfx('oil');
  fx.flash = 0.5;
  let back = 0;
  while (e.bag.length && P.bag.length < BAG_MAX) { P.bag.push(e.bag.shift()); back++; }
  log(tr('Recuperas tu rescoldo') + (e.xp ? `: +${e.xp} exp` : '') + (back ? tr(' y {0} objeto{1}', back, back > 1 ? 's' : '') : '') + '.', 'good');
  const xp = e.xp; e.xp = 0;
  if (e.bag.length) log('Tu mochila está llena: parte del rescoldo sigue ardiendo aquí.', 'bad');
  else ents.splice(ents.indexOf(e), 1);
  if (xp) gainXp(xp);
  updateHUD();
}

function winGame(ending = 'luz') {
  setMusic('intro');
  sfx('level');
  S.flags.ending = ending;
  endRun(true);
}

// ---------- Fin de partida: se cuenta en el perfil y se muestra el epitafio ----------
function endRun(won) {
  S.mode = won ? 'win' : 'over';
  const res = recordRun(won);
  checkAchievements({ won });
  // la partida terminada no se puede continuar desde el autoguardado
  STORE.remove(SAVE_PREFIX + 'auto');
  showEpitaph(res);
  updateHUD();
}

// "la Rata de Osario", "el Necrófago", "el Rey del Osario": el enemigo dentro de una frase.
// cap: al principio de la frase. En inglés el nombre va tal cual.
const isFemFoe = n => /^(Rata|Sombra)/.test(n);
function foeName(d, cap) {
  const n = d.name;
  if (SETTINGS.lang === 'en') return !cap && /^(The|Your) /.test(n) ? n[0].toLowerCase() + n.slice(1) : n;
  const s = /^(El|La|Tu) /.test(n) ? n[0].toLowerCase() + n.slice(1) : (isFemFoe(n) ? 'la ' : 'el ') + n;
  return cap ? s[0].toUpperCase() + s.slice(1) : s;
}

// "un Necrófago", "una Rata de Osario", "El Rey del Osario" (los nombres propios ya traen artículo)
const withArticle = n => {
  n = tr(n);
  if (SETTINGS.lang === 'en') return /^(The|Your) /.test(n) || n === tr('la oscuridad') ? n : (/^[AEIOU]/i.test(n) ? 'an ' : 'a ') + n;
  return /^(El|La|Tu) /.test(n) || n === 'la oscuridad' ? n : (isFemFoe(n) ? 'una ' : 'un ') + n;
};

function showEpitaph({ sum, record }) {
  const who = `${sum.name}, ${RACES[sum.race].name.toLowerCase()} ${CLASSES[sum.cls].name.toLowerCase()}`;
  const where = sum.level === 0 ? tr('en el santuario del Piso {0}', ROMAN[sum.floor]) : sum.level === LEVELS_PER_FLOOR ? tr('en la guarida del Piso {0}', ROMAN[sum.floor]) : tr('en el Piso {0}, nivel {1}', ROMAN[sum.floor], sum.level);
  const end = sum.won && ENDINGS[sum.ending];
  const text = sum.won
    ? tr('{0}, venció a lo que habitaba la oscuridad.<br>{1}', who, end.text)
    : tr('Aquí yace {0}.<br>Su última llama se apagó {1}: se la llevó {2}.', who, where, withArticle(sum.cause));
  const cell = (k, v) => `<span><b>${v}</b>${tr(k)}</span>`;
  const st = PROFILE.stats, bf = Math.ceil(st.best / LEVELS_PER_FLOOR), bl = ((st.best - 1) % LEVELS_PER_FLOOR) + 1;
  const el = $('screenMsg');
  el.className = 'epi';
  el.innerHTML =
    `<div class="big">${sum.won ? end.name : tr('Tu llama se ha extinguido')}</div>` +
    `<div class="etext">${text}</div>` +
    `<div class="egrid">${cell('nivel', sum.lvl)}${cell('criaturas', sum.kills)}${cell('jefes', `${sum.bosses}/${LAST_FLOOR}`)}` +
    `${cell('reliquias', sum.relics)}${cell('runas', sum.runes)}${cell('eventos', sum.events)}` +
    `${cell('muertes', sum.deaths)}${cell('pasos', sum.steps)}${cell('profundidad', `${ROMAN[sum.floor]}-${sum.level}`)}</div>` +
    (sum.ash ? `<div class="eash">✦ ${tr('+{0} de Ceniza', sum.ash.total)}${sum.ash.mult > 1 ? ` <small>${tr('({0} × {1} por desafíos)', sum.ash.base, String(sum.ash.mult).replace('.', ','))}</small>` : ''} · ${tr('total {0}', PROFILE.ash)}</div>` : '') +
    `<div class="escore">${tr('Puntuación')} <b>${sum.score.toLocaleString('es-AR')}</b>${sum.rank ? ` · ${tr('#{0} en tus récords', sum.rank)}` : ''}${sum.daily ? ` · ${tr('Diaria {0}', sum.daily)}` : ''} · ${tr('semilla {0}', seedLabel(sum.seed))}</div>` +
    (record ? `<div class="erec">${tr('✦ Nuevo récord de profundidad ✦')}</div>` : '') +
    tr('<div class="eprof">Expediciones {0} · Victorias {1} · Récord: Piso {2}-{3}</div>', st.runs, st.wins, ROMAN[bf] || '—', st.best ? bl : '—') +
    `<div class="hint">— ${glyphText(tr('Enter para continuar').replace(/^Enter/, '[Enter]'))} —</div>`;
}

function showScreen(title, body, hint = 'Enter para continuar') {
  const el = $('screenMsg');
  el.className = '';
  if (!title) { el.classList.add('hidden'); return; }
  title = tr(title); body = glyphText(tr(body)); hint = glyphText(tr(hint).replace(/^Enter/, '[Enter]'));
  el.innerHTML = `<div class="big">${title}</div><div class="small">${body}</div><div class="hint">— ${hint} —</div>`;
  el.classList.remove('hidden');
}

// ---------- HUD y registro ----------
const logLines = [];
function log(text, cls = '') {
  text = tr(text);
  // contracciones: "a el Rey" → "al Rey", "de el" → "del"
  if (SETTINGS.lang === 'es') text = text.replace(/\b(a|de) el /g, (m, p) => (p === 'a' ? 'al ' : 'del '));
  // la misma línea seguida se agrupa: "El cofre está vacío. ×3"
  const last = logLines[logLines.length - 1];
  if (last && last.text === text && last.cls === cls) last.n = (last.n || 1) + 1;
  else logLines.push({ text, cls });
  while (logLines.length > 4) logLines.shift();
  renderLog();
}
function renderLog() {
  $('log').innerHTML = logLines.map((l, i) =>
    `<div class="line ${l.cls}" style="opacity:${0.45 + (i + 1) / logLines.length * 0.55}">${glyphText(l.text)}${l.n ? ` <span class="rep">×${l.n}</span>` : ''}</div>`).join('');
}

function updateHUD() {
  const c = CLASSES[P.cls], low = P.fuel < BAL.lowFuel;
  const row = (ic, label, v, max) => `<span class="lb">${icon(ic)}${label}</span><span class="vl">${v}<small>/${max}</small></span>`;
  const slot = (ic, n, act) => `<span class="slot${n ? '' : ' none'}">${icon(ic)}<b>×${n}</b>${glyph(act)}</span>`;
  const lives = P.lives ?? BAL.lives;
  $('stName').innerHTML = `<span class="nm">${P.name}</span><span class="lives" title="Llamas: vidas de esta partida">` +
    Array.from({ length: P.livesMax ?? BAL.lives }, (_, i) => (i < lives ? icon('flame') : `<span class="spent">${icon('flame')}</span>`)).join('') + '</span>';
  $('stLvl').innerHTML = `<span>${RACES[P.race].name} · ${c.name}</span><span class="lv">${tr('Nv')} ${P.lvl}</span>`;
  $('stHp').innerHTML = row('heart', tr('Vida'), Math.max(0, P.hp), P.maxhp);
  $('stFuel').innerHTML = row('flame', tr(P.fuel <= 0 ? 'A oscuras' : low ? 'Antorcha baja' : 'Antorcha'), Math.ceil(P.fuel), 100);
  $('stFuel').classList.toggle('low', low);
  $('stXp').innerHTML = row('gem', tr('Exp'), P.xp, P.next);
  const third = c.weight === 'liviana' ? `<span title="Poder">${icon('star')}${P.power}</span>` : `<span title="Crítico">${icon('gem')}${Math.round(P.crit * 100)}%</span>`;
  $('stStats').innerHTML = `<span title="Ataque">${icon(weaponKind())}${P.atk}</span><span title="Defensa">${icon('shield')}${P.def}</span>${third}`;
  $('stItems').innerHTML = slot('flask', P.potions, 'potion') + slot('oil', P.oil, 'oil');
  $('stKeys').innerHTML = P.attrPts
    ? tr('<span class="pts">✦ {0} punto{1} de atributo</span>', P.attrPts, P.attrPts > 1 ? 's' : '') + glyph('attrs')
    : promptStyle() === 'kb'
      ? `${glyph('inv')}${tr('Mochila')}${glyph('runes')}${tr('Runas')}${glyph('skills')}${tr('Libro')}`
      : `${glyph('inv')}${tr('Mochila')}${glyph('menu')}${tr('Pausa')}`;
  const fl = `${tr('Piso')} ${ROMAN[S.floor]}`;
  $('stMap').textContent = `${tr('Mapa')} · ${isShrine() ? `${fl} · ${tr('Santuario')}` : isBossLevel() ? `${fl} · ${tr('Guarida')}` : `${fl} · ${S.level}/${LEVELS_PER_FLOOR}`}`;
}

// ---------- Entrada ----------
const KEYMAP = {
  KeyW: 'fwd', ArrowUp: 'fwd', KeyS: 'back', ArrowDown: 'back',
  KeyA: 'strafeL', KeyD: 'strafeR', KeyQ: 'turnL', ArrowLeft: 'turnL', KeyE: 'turnR', ArrowRight: 'turnR',
  Enter: 'ok', NumpadEnter: 'ok', Space: 'ok', Escape: 'cancel',
  KeyP: 'potion', KeyO: 'oil', KeyI: 'inv', Tab: 'inv', KeyX: 'drop', Delete: 'drop', KeyH: 'skills', KeyU: 'attrs', KeyR: 'runes',
  Digit1: 'n1', Digit2: 'n2', Digit3: 'n3', Digit4: 'n4', Digit5: 'n5', Digit6: 'n6', Digit7: 'n7', Digit8: 'n8',
  Numpad1: 'n1', Numpad2: 'n2', Numpad3: 'n3', Numpad4: 'n4', Numpad5: 'n5', Numpad6: 'n6', Numpad7: 'n7', Numpad8: 'n8',
};

let KEYS = buildKeys(KEYMAP);

window.addEventListener('keydown', ev => {
  if (REBIND) { ev.preventDefault(); finishRebind(ev.code); return; }
  if (ev.code === 'F11') { ev.preventDefault(); toggleFullscreen(); return; }
  // Mientras se escribe el nombre, sólo algunas teclas salen del campo
  if (document.activeElement === $('cName')) {
    const exits = { Enter: 'back', NumpadEnter: 'back', ArrowDown: 'back', ArrowUp: 'fwd', Escape: 'back', Tab: 'back' };
    if (exits[ev.code]) {
      ev.preventDefault();
      CR.name = $('cName').value.trim() || CR.name;
      $('cName').blur();
      createAction(exits[ev.code]);
    }
    return;
  }
  const act = KEYS[ev.code];
  if (!act) return;
  noteInput('kb');
  ev.preventDefault();
  if (ev.repeat && !['fwd', 'back', 'strafeL', 'strafeR'].includes(act)) return;
  audioInit();
  onAction(act);
});

// ---------- Modo de pantalla ----------
// En Electron: ventana, pantalla completa nativa o ventana sin bordes (main.js).
// En el navegador: ventana o la pantalla completa de HTML.
const DISPLAY_MODES = window.nativeDisplay ? ['ventana', 'completa', 'sinBordes'] : ['ventana', 'completa'];
const DISPLAY_LABEL = { ventana: 'Ventana', completa: 'Pantalla completa', sinBordes: 'Ventana sin bordes' };
const displayMode = () => (window.nativeDisplay ? nativeDisplay.mode() : document.fullscreenElement ? 'completa' : 'ventana');

function setDisplayMode(m) {
  if (m === displayMode()) return;
  SETTINGS.display = m; saveSettings();
  if (!window.nativeDisplay) {
    if (m === 'completa') document.documentElement.requestFullscreen().catch(() => {});
    else if (document.fullscreenElement) document.exitFullscreen();
    return;
  }
  // si hace falta otra ventana (con o sin bordes), la partida en curso viaja con ella
  const atTitle = ['title', 'create', 'cine', 'dead', 'over', 'win'].includes(S.mode) || (S.mode === 'menu' && $('menu').classList.contains('bg-title'));
  nativeDisplay.set(m, JSON.stringify({ snap: S.world && !atTitle ? snapshot() : null, menu: S.mode === 'menu' }));
}
// F11: alterna entre ventana y pantalla completa
function toggleFullscreen() { setDisplayMode(displayMode() === 'ventana' ? 'completa' : 'ventana'); }

// La ventana nueva retoma donde estaba la anterior: la partida y, si venía de ahí, el menú de Opciones
function resumeDisplay(r) {
  if (r.snap) { restore(r.snap); if (r.menu) { openPauseMenu(); openOptionsMenu('display'); } }
  else { openTitleMenu(); if (r.menu) openOptionsMenu('display'); }
}

function onAction(act, fromPad) {
  switch (S.mode) {
    case 'title': if (act === 'ok') openTitleMenu(); return;
    case 'menu': return menuAction(act);
    case 'cine': return cineAction(act);
    case 'battle': return battleAction(act);
    case 'dead': if (act === 'ok') revive(); return;
    case 'win': if (act === 'ok') openEndMenu(true); return;
    case 'over': if (act === 'ok') openEndMenu(false); return;
    case 'create': return createAction(act);
    case 'inv': return invAction(act, fromPad);
    case 'dialog': if (act === 'ok' || act === 'cancel') closeDialog(); return;
    case 'combat': return combatAction(act);
    case 'explore': return exploreAction(act);
  }
}

function combatAction(act) {
  if (!C) return;
  const n = combatOptions().length;
  if (act === 'fwd' || act === 'turnL') { C.sel = (C.sel + n - 1) % n; sfx('select'); renderCombatMenu(); }
  else if (act === 'back' || act === 'turnR') { C.sel = (C.sel + 1) % n; sfx('select'); renderCombatMenu(); }
  else if (act === 'ok') chooseCombat(C.sel);
  else if (act[0] === 'n') chooseCombat(+act[1] - 1);
  else if (act === 'potion') chooseCombat(combatOptions().findIndex(o => o.id === 'potion'));
}

function exploreAction(act) {
  if (anim) { pending = act; return; }
  switch (act) {
    case 'fwd': tryMove(P.dir); break;
    case 'back': tryMove((P.dir + 2) % 4); break;
    case 'strafeL': tryMove((P.dir + 3) % 4); break;
    case 'strafeR': tryMove((P.dir + 1) % 4); break;
    case 'turnL': turn(-1); break;
    case 'turnR': turn(1); break;
    case 'potion': usePotion(); break;
    case 'oil': useOil(); break;
    case 'inv': openInv(); break;
    case 'skills': openSkillsMenu(); break;
    case 'attrs': openAttrMenu(); break;
    case 'runes': openRunesMenu(); break;
    case 'cancel': openPauseMenu(); break;
    case 'ok':
      if (W_().map[P.y * MW + P.x] === 2) descend();
      else {
        const [dx, dy] = DIRS[P.dir];
        const e = entAt(P.x + dx, P.y + dy);
        if (e && e.type === 'chest') openChest(e);
        else if (e && e.type === 'merchant') openMerchant();
        else if (e && e.type === 'bonfire') useBonfire(e);
      }
      break;
  }
}

// Mando (Steam Deck / Xbox)
const padPrev = {};
const PADMAP = { 12: 'fwd', 13: 'back', 14: 'turnL', 15: 'turnR', 4: 'strafeL', 5: 'strafeR', 0: 'ok', 9: 'cancel', 1: 'cancel', 2: 'potion', 3: 'oil', 8: 'inv' };
function pollGamepad() {
  const pads = navigator.getGamepads ? navigator.getGamepads() : [];
  for (const gp of pads) {
    if (!gp) continue;
    for (const b in PADMAP) {
      const down = gp.buttons[b] && gp.buttons[b].pressed;
      const key = gp.index + ':' + b;
      if (down && !padPrev[key]) { audioInit(); noteInput('pad', gp.id); onAction(PADMAP[b], true); }
      padPrev[key] = down;
    }
    const ax = gp.axes[0] || 0, ay = gp.axes[1] || 0;
    const stick = Math.abs(ay) > 0.6 ? (ay < 0 ? 'fwd' : 'back') : Math.abs(ax) > 0.6 ? (ax < 0 ? 'turnL' : 'turnR') : null;
    const k = gp.index + ':stick';
    if (stick && padPrev[k] !== stick) { noteInput('pad', gp.id); onAction(stick); }
    else if (stick && S.mode === 'explore' && !anim && (stick === 'fwd' || stick === 'back')) onAction(stick);
    padPrev[k] = stick;
  }
}

// ---------- Bucle principal ----------
function update(dt) {
  T += dt;
  flick = 0.9 + 0.06 * Math.sin(T * 13) * Math.sin(T * 7.3) + 0.05 * vnoise(T * 9, 0, 3);
  // con poco aceite la llama chisporrotea: tironeos bruscos de luz
  if (P && P.fuel > 0 && P.fuel < BAL.lowFuel) flick -= (1 - P.fuel / BAL.lowFuel) * 0.35 * Math.max(0, vnoise(T * 24, 1, 6) - 0.45) * 2;
  if (P) {
    const ff = P.fuel / 100;
    lightR = (RACES[P.race].dark ? 2.6 : 1.6) + (hasRelic('ojo') ? 1.2 : 0) + 5.4 * ff;
  }
  if (anim) {
    anim.t += dt;
    let k = clamp(anim.t / anim.dur, 0, 1);
    const e = anim.bump ? Math.sin(k * Math.PI) : k * k * (3 - 2 * k);
    cam.x = lerp(anim.fromX, anim.toX, e); cam.y = lerp(anim.fromY, anim.toY, e);
    cam.a = lerp(anim.fromA, anim.toA, anim.bump ? 0 : e);
    if (anim.bump && k >= 1) { cam.x = anim.fromX; cam.y = anim.fromY; }
    if (k >= 1) {
      cam.a = P.dir * Math.PI / 2;
      anim = null;
      if (pending && S.mode === 'explore') { const p = pending; pending = null; exploreAction(p); }
      else pending = null;
    }
  }
  if (S.world) for (const e of S.world.ents) {
    e.vx = lerp(e.vx, e.x + 0.5, 1 - Math.pow(0.0001, dt));
    e.vy = lerp(e.vy, e.y + 0.5, 1 - Math.pow(0.0001, dt));
  }
  if (S.mode === 'fade') {
    fx.fade += dt * 1.6 * fx.fadeDir;
    if (fx.fadeDir > 0 && fx.fade >= 1) { fx.fade = 1; fx.fadeDir = -1; fx.fadeMid(); }
    else if (fx.fadeDir < 0 && fx.fade <= 0) { fx.fade = 0; S.mode = 'explore'; if (fx.fadeAfter) fx.fadeAfter(); }
  }
  if (S.mode === 'dialog') S.dialog.t += dt;
  if (S.mode === 'cine') cineUpdate(dt);
  if (S.mode === 'battle') battleUpdate(dt);
  fx.shake = SETTINGS.shake ? Math.max(0, fx.shake - dt * 30) : 0;
  fx.hurt = Math.max(0, fx.hurt - dt * 2.5);
  fx.flash = Math.max(0, fx.flash - dt * 2);
  updateCombatFx(dt);
  if (C) {
    C.flash = Math.max(0, C.flash - dt * 4);
    C.shake = SETTINGS.shake ? Math.max(0, C.shake - dt * 40) : 0;
    if (C.dying) C.dying = Math.min(1, C.dying + dt * 1.9);
  }
}

function draw() {
  $('stage').dataset.mode = S.mode;
  $('stage').dataset.bg = S.mode === 'menu' ? S.menuBg : '';
  if (S.mode === 'title' || (S.mode === 'menu' && S.menuBg === 'title')) { ctx.drawImage(titleArt, 0, 0); return; }
  if (S.mode === 'create') { drawCreate(ctx); return; }
  if (S.mode === 'cine') { drawCine(ctx); return; }
  if (S.mode === 'battle') { drawBattle(ctx); return; }
  const R = RAMPS[S.env];
  ctx.drawImage(frameBg, 0, 0);

  const moving = anim && !anim.bump && (anim.fromX !== anim.toX || anim.fromY !== anim.toY);
  const bob = moving ? Math.sin(clamp(anim.t / anim.dur, 0, 1) * Math.PI) * 2 : 0;
  const shakeA = fx.shake ? (Math.random() - 0.5) * fx.shake * 0.006 : 0;
  const view = { x: cam.x, y: cam.y, a: cam.a + shakeA };

  const sprites = [];
  for (const e of S.world.ents) {
    if (C && e === C.e) continue;
    if (e.type === 'chest') sprites.push({ x: e.vx, y: e.vy, spr: SPRITES[e.open ? 'chestOpen' : 'chest'].w, scale: 0.5, ramp: 0 });
    else if (e.type === 'prop') { const d = propDef(e); sprites.push({ x: e.vx, y: e.vy, spr: spriteFrame(d[0], e), scale: d[1], ramp: 0, glow: d[2] * flick }); }
    else if (e.type === 'event') { const ev = EVENTS[e.ev]; sprites.push({ x: e.vx, y: e.vy, spr: SPRITES[eventSprite(e)].w, scale: ev.scale, ramp: 0, glow: e.done ? 0 : ev.glow * flick }); }
    else if (e.type === 'reliquary') sprites.push({ x: e.vx, y: e.vy, spr: SPRITES[e.open ? 'reliquaryOpen' : 'reliquary'].w, scale: 0.55, ramp: 0, glow: e.open ? 0 : 0.45 * flick });
    else if (e.type === 'merchant') sprites.push({ x: e.vx, y: e.vy, spr: SPRITES.merchant.w, scale: 0.86, ramp: 0, glow: 0.25 * flick });
    else if (e.type === 'bonfire') sprites.push({ x: e.vx, y: e.vy, spr: spriteFrame(e.used ? 'brazierOut' : 'brazier', e), scale: 0.6, ramp: 0, glow: e.used ? 0.1 : 0.8 * flick });
    else if (e.type === 'ember') sprites.push({ x: e.vx, y: e.vy, spr: SPRITES.ember.w, scale: 0.42 + Math.sin(T * 4) * 0.02, ramp: 0, glow: 0.75 * flick });
    else if (!e.def.lurk || Math.hypot(e.vx - cam.x, e.vy - cam.y) < lightR * 0.55)
      sprites.push({ x: e.vx, y: e.vy, spr: SPRITES[e.def.spr].w, scale: e.def.scale, ramp: e.def.ramp, glow: e.def.glow });
  }
  renderScene(S.world, view, sprites, -bob);

  let mul = 1;
  const inCombat = C && (S.mode === 'combat' || S.mode === 'dialog' || S.mode === 'dead');
  if (inCombat || ['dialog', 'inv', 'menu'].includes(S.mode)) {
    mul = 0.35;
    for (let i = 0; i < lumBuf.length; i++) lumBuf[i] *= mul;
    mul = 1;
  }
  if (inCombat && S.mode !== 'dialog') {
    drawFoe(C.e);
    drawCombatFx();
  }
  if (S.mode === 'dialog') {
    const d = S.dialog;
    const a = clamp(d.t * 1.5, 0, 1);
    renderPortrait(SPRITES[d.portrait].p, VW - 160 + Math.sin(T * 1.3) * 2, 6 + Math.sin(T * 0.9) * 3, 150, d.ramp, a * (0.85 + 0.15 * flick));
  } else if (!inCombat && !['dead', 'over', 'win', 'inv', 'menu'].includes(S.mode)) {
    renderTorch(T, P.fuel / 100, -bob * 1.5 + Math.sin(T * 1.7) * 1);
  }

  if (S.mode === 'fade') mul *= 1 - fx.fade;
  if (S.mode === 'dead' || S.mode === 'over') mul *= 0.5;
  blitView(ctx, mul, fx.hurt * 0.12 + fx.flash * 0.3);

  if (S.mode === 'inv') drawInvPortrait(ctx);
  else if (S.mode === 'menu') { drawPanel(ctx); drawMenuArt(ctx); }
  else if (S.mode === 'over' || S.mode === 'win') drawPanel(ctx); // el epitafio ocupa vista y registro

  // Panel derecho
  drawBar(ctx, R, 346, 62, 106, 5, P.hp / P.maxhp, ghostOf('hp', P.hp / P.maxhp, DT));
  drawBar(ctx, R, 346, 81, 106, 5, P.fuel / 100, ghostOf('fuel', P.fuel / 100, DT));
  if (P.fuel < BAL.lowFuel && Math.sin(T * 7) > 0) { ctx.strokeStyle = R[5]; ctx.strokeRect(343.5, 78.5, 111, 10); }
  drawBar(ctx, R, 346, 99, 106, 2, P.xp / P.next);
  drawMinimap(ctx, R, S.world, P, 357, 163, 3);
  if (C && S.mode === 'combat') drawCombatPlate(ctx, R);
}

// Placa del menú de combate sobre la vista, con la barra de vida del enemigo
function drawCombatPlate(ctx, R) {
  const x = 204, y = 19, w = 115, h = 178;
  ctx.globalAlpha = 0.82; ctx.fillStyle = R[0]; ctx.fillRect(x, y, w, h); ctx.globalAlpha = 1;
  ctx.fillStyle = R[3]; ctx.fillRect(x, y, 1, h);
  ctx.fillStyle = R[2]; ctx.fillRect(x + 2, y, 1, h);
  const sep = yy => {
    ctx.fillStyle = R[2]; ctx.fillRect(x + 6, yy, w - 10, 1);
    ctx.fillStyle = R[4]; ctx.fillRect(x + 4, yy - 1, 1, 3); ctx.fillRect(x + w - 4, yy - 1, 1, 3);
  };
  sep(62); sep(163);
  const e = C.e, f = clamp(e.hp / e.maxhp, 0, 1);
  drawBar(ctx, R, 209, 37, 105, 4, f, ghostOf('foe', f, DT));
}

let last = 0, DT = 0;
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000 || 0);
  last = now; DT = dt;
  pollGamepad();
  update(dt);
  draw();
  requestAnimationFrame(frame);
}

function fit() {
  const s = Math.min(innerWidth / W, innerHeight / H);
  // escala entera sólo si queda casi exacta; si no, llena la ventana
  const scale = Math.abs(s - Math.round(s)) < 0.03 ? Math.round(s) : s;
  const st = $('stage');
  st.style.transform = `scale(${scale})`;
  st.style.left = `${Math.round((innerWidth - W * scale) / 2)}px`;
  st.style.top = `${Math.round((innerHeight - H * scale) / 2)}px`;
}

function boot() {
  const canvas = $('screen');
  ctx = canvas.getContext('2d');
  initRender(ctx);
  buildTextures();
  buildSprites();
  buildCombatSprites();
  localizeAll();
  applyStaticTr();
  refreshPrompts();
  for (const id in PROFILE.ach) STEAM.achievement(id); // logros ganados sin conexión
  titleArt = buildTitleArt();
  titleDim = buildTitleArt(0.45);
  setPalette('castle');
  P = newPlayer();
  recalc();
  initCreateUI();
  initInvUI();
  initMenuUI();
  if (PRUEBA) $('tPrueba').textContent = ' · modo prueba';
  const resumed = window.nativeDisplay && nativeDisplay.takeResume();
  if (resumed) resumeDisplay(JSON.parse(resumed));
  else if (FIRST_RUN) openLanguagePick(openTitleMenu); else openTitleMenu();
  fit();
  addEventListener('resize', fit);
  $('combatMenu').addEventListener('click', ev => {
    const o = ev.target.closest('.opt');
    if (o) { audioInit(); chooseCombat(+o.dataset.i); }
  });
  $('stage').addEventListener('click', () => {
    audioInit();
    if (['title', 'dead', 'over', 'win'].includes(S.mode)) onAction('ok');
    else if (S.mode === 'dialog') closeDialog();
    else if (S.mode === 'cine') cineAction('ok');
  });
  requestAnimationFrame(frame);
}

window.addEventListener('load', boot);
