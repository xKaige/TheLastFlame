'use strict';
// Perfil del jugador: lo que sobrevive entre partidas (estadísticas, historial y, más adelante,
// Ceniza y desbloqueos). Va aparte de las ranuras de partida y tiene su propia versión.
// Es lo que después se sincroniza con Steam Cloud.

const PROFILE_KEY = 'laultimallama.perfil';
const PROFILE_VERSION = 1;
const HISTORY_MAX = 20;

function freshProfile() {
  return {
    v: PROFILE_VERSION,
    ash: 0, unlocks: {},                     // fase 1 del roadmap
    stats: { runs: 0, wins: 0, deaths: 0, kills: 0, bosses: 0, steps: 0, best: 0, sold: 0 }, // best = profundidad máxima (1..15)
    codex: { foes: {}, runes: {}, relics: {}, events: {} },   // lo descubierto (bestiario y demás)
    ach: {}, endings: {},                                    // logros y finales alcanzados
    scores: [], daily: {},                                   // mejores puntuaciones y expediciones diarias
    history: [],                             // últimas partidas, la más nueva primero
    recorded: [],                            // marcas de partidas ya contadas (evita contar dos veces)
  };
}

function loadProfile() {
  try {
    const d = JSON.parse(STORE.get(PROFILE_KEY));
    if (d && d.v === PROFILE_VERSION) {
      const f = freshProfile();
      return { ...f, ...d, stats: { ...f.stats, ...d.stats }, codex: { ...f.codex, ...d.codex } };
    }
  } catch (e) { /* perfil ausente o dañado: se empieza de cero */ }
  return freshProfile();
}

let PROFILE = loadProfile();

function saveProfile() {
  return STORE.set(PROFILE_KEY, JSON.stringify(PROFILE));
}

// Resumen de la partida que termina; lo usan el epitafio y el historial
function runSummary(won) {
  const bosses = Object.keys(S.flags).filter(k => k.startsWith('down_')).length;
  return {
    won, time: Date.now(),
    name: P.name, race: P.race, cls: P.cls, lvl: P.lvl,
    floor: S.floor, level: S.level, depth: depth(),
    kills: S.kills, deaths: S.deaths, steps: S.steps, bosses,
    relics: (P.relics || []).length, runes: (P.runes || []).length, events: S.flags.evDone || 0,
    cause: won ? null : S.lastHit || 'la oscuridad',
    mods: (S.flags.mods || []).slice(),
    ending: won ? S.flags.ending || 'luz' : null,
    seed: S.flags.seed >>> 0, daily: S.flags.daily || null,
  };
}

// Cuenta la partida en el perfil una sola vez. Devuelve el resumen y si batió el récord de profundidad.
function recordRun(won) {
  const sum = runSummary(won);
  sum.ash = ashFor(sum);
  sum.score = scoreFor(sum);
  const tag = S.flags.runTag;
  if (tag && PROFILE.recorded.includes(tag)) return { sum, record: false, counted: false };
  PROFILE.ash += sum.ash.total;
  if (sum.ending) PROFILE.endings[sum.ending] = PROFILE.endings[sum.ending] || Date.now();
  // récords: las 10 mejores; la diaria guarda su mejor puntuación del día
  PROFILE.scores.push({ score: sum.score, name: sum.name, cls: sum.cls, race: sum.race, floor: sum.floor, level: sum.level,
    won: sum.won, mods: sum.mods, seed: sum.seed, daily: sum.daily, time: sum.time });
  PROFILE.scores.sort((a, b) => b.score - a.score);
  PROFILE.scores.length = Math.min(PROFILE.scores.length, 10);
  const pos = PROFILE.scores.findIndex(s => s.time === sum.time);
  sum.rank = pos >= 0 ? pos + 1 : 0;
  STEAM.score('puntuacion', sum.score);
  if (sum.daily) STEAM.score('diaria-' + sum.daily, sum.score);
  if (sum.daily) { const d = PROFILE.daily[sum.daily] || (PROFILE.daily[sum.daily] = { best: 0, tries: 0 }); d.best = Math.max(d.best, sum.score); }
  const st = PROFILE.stats;
  const record = sum.depth > st.best;
  st.runs++; if (won) st.wins++;
  st.deaths += sum.deaths; st.kills += sum.kills; st.bosses += sum.bosses; st.steps += sum.steps;
  st.best = Math.max(st.best, sum.depth);
  PROFILE.history.unshift(sum);
  PROFILE.history.length = Math.min(PROFILE.history.length, HISTORY_MAX);
  if (tag) { PROFILE.recorded.unshift(tag); PROFILE.recorded.length = Math.min(PROFILE.recorded.length, 50); }
  saveProfile();
  return { sum, record, counted: true };
}

// ¿Hay algo para despertar en el Altar? (lo avisa el título)
function altarSummary() {
  const total = Object.keys(UNLOCKS).length, owned = Object.keys(UNLOCKS).filter(unlocked).length;
  const can = Object.entries(UNLOCKS).some(([id, u]) => !unlocked(id) && PROFILE.ash >= u.cost);
  return tr('{0} de Ceniza · {1}/{2} despertados{3}', PROFILE.ash, owned, total, can ? ' · ✦ hay algo para despertar' : '');
}
