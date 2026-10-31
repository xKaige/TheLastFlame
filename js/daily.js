'use strict';
// Puntuación, récords y Expedición diaria.
// La diaria es igual para todos ese día: misma semilla, clase, raza y desafíos, con todo el contenido
// disponible y sin beneficios del Altar. Pensada para conectarse después con las tablas de Steam.

// ---------- Puntuación ----------
function scoreFor(sum) {
  const base = sum.depth * 100 + sum.bosses * 300 + sum.kills * 10 + sum.relics * 50 + sum.events * 40 - sum.deaths * 150 +
    (sum.won ? 1500 + Math.max(0, 4000 - sum.steps) : 0);
  return Math.max(0, Math.round(base * modsMult(sum.mods || [])));
}

function openScoresMenu() {
  const items = PROFILE.scores.map((s, i) => ({
    label: `${i + 1}. ${s.score.toLocaleString('es-AR')} <small>· ${s.name}, ${RACES[s.race].name.toLowerCase()} ${CLASSES[s.cls].name.toLowerCase()}</small>`,
    sub: (s.won ? tr('Victoria') : tr('Cayó en el Piso {0}-{1}', ROMAN[s.floor], s.level === 0 ? tr('Santuario') : s.level)) +
      `${s.mods.length ? ` · ${s.mods.map(id => MODS[id] ? MODS[id].name : id).join(', ')}` : ''}${s.daily ? ` · ${tr('diaria {0}', s.daily)}` : ''} · ${tr('semilla {0}', seedLabel(s.seed))}`,
    fn: () => {},
  }));
  if (!items.length) items.push({ label: 'Todavía no terminaste ninguna expedición', fn: closeMenu });
  openMenu({ title: tr('Récords'), cls: 'altar', items });
}

// ---------- Expedición diaria ----------
const dailyKey = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

// Todo sale de la fecha: semilla, clase, raza y uno o dos desafíos
function dailyPlan(key = dailyKey()) {
  let h = 2166136261;
  for (const ch of 'llama:' + key) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  const seed = h >>> 0, saved = RNG.s;
  seedRng(seed, 99, 99);
  const cls = pick(Object.keys(CLASSES)), race = pick(Object.keys(RACES));
  const pool = Object.keys(MODS).filter(id => id !== 'unaLlama'), mods = [pick(pool)];
  if (chance(0.5)) mods.push(pick(pool.filter(id => id !== mods[0])));
  RNG.s = saved;
  return { key, seed, cls, race, mods };
}

// Atributos fijos por clase: así la diaria compara a todos en igualdad
const DAILY_ATTR = { guerrero: { fue: 2, vig: 3, des: 0, vol: 0 }, picaro: { fue: 2, vig: 0, des: 3, vol: 0 }, hechicero: { fue: 0, vig: 2, des: 0, vol: 3 } };

function dailySummary() {
  const plan = dailyPlan(), d = PROFILE.daily[plan.key];
  return `${RACES[plan.race].name} ${CLASSES[plan.cls].name.toLowerCase()} · ${plan.mods.map(id => MODS[id].name).join(' + ')}` +
    (d ? ` · mejor ${d.best.toLocaleString('es-AR')}` : '');
}

function openDailyMenu() {
  const plan = dailyPlan(), d = PROFILE.daily[plan.key];
  openMenu({
    title: tr('Expedición diaria · {0}', plan.key), cls: 'altar',
    text: tr('Hoy todos bajan igual: <b>{0} {1}</b>, los mismos niveles y los mismos desafíos. ', RACES[plan.race].name, CLASSES[plan.cls].name.toLowerCase()) +
      tr('Todo el contenido está despierto y el Altar no ayuda.') + ' ' +
      (d ? tr('Tu mejor puntuación de hoy: <b>{0}</b> ({1} intento{2}).', d.best.toLocaleString('es-AR'), d.tries, d.tries > 1 ? 's' : '') : tr('Todavía no la intentaste.')),
    items: [
      ...plan.mods.map(id => ({ label: `◆ ${MODS[id].name} <small>· +${Math.round(MODS[id].bonus * 100)}%</small>`, sub: MODS[id].desc, fn: () => {} })),
      { label: tr('Descender ✠'), sub: tr('Semilla {0} · la puntuación queda en tus récords', seedLabel(plan.seed)), fn: () => { closeAllMenus(); startDaily(); } },
    ],
    sel: plan.mods.length,
  });
}

function startDaily() {
  const plan = dailyPlan();
  const d = PROFILE.daily[plan.key] || (PROFILE.daily[plan.key] = { best: 0, tries: 0 });
  d.tries++; saveProfile();
  CR.cls = plan.cls; CR.race = plan.race; CR.attr = { ...DAILY_ATTR[plan.cls] };
  if (!CR.name) CR.name = vpick(NAMES);
  EXP.mods = plan.mods.slice(); EXP.seed = plan.seed; EXP.daily = plan.key;
  audioInit();
  newGame();
  log(tr('Expedición diaria del {0}. Semilla {1}.', plan.key, seedLabel(plan.seed)), 'em');
}
