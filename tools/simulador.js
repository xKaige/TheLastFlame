// Simulador de equilibrio: un bot juega partidas completas a máxima velocidad y resume
// muertes, pasos, aceite, pociones y peleas contra jefes por piso y por clase.
// Uso: con el juego abierto (python -m http.server 8123), en la consola del navegador:
//   eval(await fetch('tools/simulador.js').then(r => r.text()));
//   simSummary(simMany(3))
// Ojo: reemplaza funciones del juego en esa pestaña; recargá la página después.

(() => {
  // todo síncrono y sin efectos
  window.later = (ms, fn) => fn();
  window.autosave = () => {};
  window.saveProfile = () => true; // el bot no ensucia el perfil del jugador
  window.recordRun = won => {
    const sum = runSummary(won);
    sum.ash = ashFor(sum); sum.score = scoreFor(sum);
    return { sum, record: false, counted: false };
  };
  window.codexNote = () => {};
  window.checkAchievements = () => {};
  window.openEndingMenu = () => winGame('luz');
  const realPotion = usePotion, realOil = useOil;

  function bfs(tx, ty, passEnt) {
    const prev = new Int32Array(MW * MH).fill(-1), s = P.y * MW + P.x, goal = ty * MW + tx;
    prev[s] = s;
    const q = [s];
    const blockedEnt = new Set(W_().ents.filter(e => e.type !== 'enemy' && e.type !== 'ember').map(e => e.y * MW + e.x));
    for (let h = 0; h < q.length; h++) {
      const c = q[h];
      if (c === goal) break;
      for (const [dx, dy] of DIRS) {
        const n = c + dy * MW + dx;
        if (prev[n] >= 0 || W_().map[n] === 1) continue;
        if (n !== goal && blockedEnt.has(n)) continue;
        prev[n] = c; q.push(n);
      }
    }
    if (prev[goal] < 0) return null;
    let c = goal, len = 0;
    while (prev[c] !== s) { c = prev[c]; len++; }
    return { dir: DIRS.findIndex(([dx, dy]) => c === s + dy * MW + dx), len };
  }

  function pickTarget() {
    const ents = W_().ents;
    const cands = [];
    for (const e of ents) {
      if (e.type === 'ember') { if (P.bag.length < BAG_MAX && (e.x !== P.x || e.y !== P.y)) cands.push([e, 0]); }
      else if (e.type === 'chest' && !e.open) cands.push([e, 1]);
      else if (e.type === 'enemy' && !e.def.boss) cands.push([e, 2]);
    }
    let best = null;
    for (const [e, pri] of cands) {
      const p = bfs(e.x, e.y);
      if (!p) continue;
      const score = p.len + pri * 3;
      if (!best || score < best.score) best = { e, p, score };
    }
    if (best) return best.p;
    const st = W_().map.indexOf(2);
    if (st >= 0) {
      if (st === P.y * MW + P.x) return 'stairs';
      return bfs(st % MW, (st / MW) | 0);
    }
    const b = ents.find(e => e.type === 'enemy' && e.def.boss);
    return b ? bfs(b.x, b.y) : null;
  }

  function combatChoice() {
    const o = combatOptions(), idx = id => o.findIndex(x => x.id === id && !x.off);
    if (P.hp < P.maxhp * 0.38 && idx('potion') >= 0) return idx('potion');
    if (P.hp < P.maxhp * 0.55 && idx('juramento') >= 0) return idx('juramento');
    if (!C.shield && idx('ceniza') >= 0) return idx('ceniza');
    for (const id of ['tormenta', 'danza', 'golpe', 'punalada', 'arcana', 'veneno']) {
      if (id === 'veneno' && C.dots.some(d => d.name === 'Veneno')) continue;
      if (idx(id) >= 0) return idx(id);
    }
    if ((C.e.def.fearsFire || P.cls === 'hechicero') && P.fuel > 40 && idx('burn') >= 0) return idx('burn');
    return 0;
  }

  function equipBest() {
    for (let b = P.bag.length - 1; b >= 0; b--) {
      const it = P.bag[b], cur = P.equip[it.slot];
      const val = x => (x.atk || 0) * 1.2 + (x.def || 0) + (x.power || 0) * 0.6 + x.tier;
      if (canEquip(it) && (!cur || val(it) > val(cur))) equipFromBag(b);
    }
    while (P.bag.length > 7) P.bag.shift();
  }

  // mods: modificadores de expedición, por ejemplo ['agonizante', 'muertos']
  window.simRun = function (cls, race, maxSteps = 60000, mods = []) {
    CR.cls = cls; CR.race = race; CR.name = 'Bot';
    EXP.mods = mods.slice();
    EXP.seed = window.simSeed ?? null; // fijar window.simSeed para repetir los mismos niveles
    CR.attr = { guerrero: { fue: 2, vig: 3, des: 0, vol: 0 }, picaro: { fue: 2, vig: 0, des: 3, vol: 0 }, hechicero: { fue: 0, vig: 2, des: 0, vol: 3 } }[cls];
    newGame();
    const rows = [];
    let row = null, bossFights = [];
    const counts = { potUsed: 0, oilUsed: 0 };
    window.usePotion = () => { const r = realPotion(); if (r) counts.potUsed++; return r; };
    window.useOil = () => { const r = realOil(); if (r) counts.oilUsed++; return r; };
    const startRow = () => {
      row = { f: S.floor, l: S.level, steps0: S.steps, fuel0: P.fuel, oil0: P.oil, pot0: P.potions, pu0: counts.potUsed, ou0: counts.oilUsed, deaths0: S.deaths, dark: 0 };
    };
    const endRow = () => {
      rows.push({
        piso: row.f, nivel: row.l, pasos: S.steps - row.steps0,
        aceiteHallado: P.oil - row.oil0 + (counts.oilUsed - row.ou0), aceiteUsado: counts.oilUsed - row.ou0,
        pocHalladas: P.potions - row.pot0 + (counts.potUsed - row.pu0), pocUsadas: counts.potUsed - row.pu0,
        muertes: S.deaths - row.deaths0, pasosOscuros: row.dark, nv: P.lvl, llamaFin: Math.round(P.fuel),
      });
    };
    startRow();
    let key = S.floor * 10 + S.level, i = 0, inBoss = null;
    for (; i < maxSteps; i++) {
      if (S.floor * 10 + S.level !== key) { endRow(); startRow(); key = S.floor * 10 + S.level; }
      if (S.mode === 'win' || S.mode === 'over') break;
      if (S.mode === 'dialog') { dialogReady = 0; closeDialog(); continue; }
      if (S.mode === 'fade') { update(0.7); continue; }
      if (S.mode === 'dead') {
        if (inBoss) { inBoss.muertes++; }
        revive(); continue;
      }
      if (S.mode === 'combat') {
        if (C && C.e.def.boss && (!inBoss || inBoss.kind !== C.e.kind)) {
          inBoss = bossFights.find(b => b.kind === C.e.kind);
          if (!inBoss) { inBoss = { kind: C.e.kind, nv: P.lvl, muertes: 0, turnos: 0 }; bossFights.push(inBoss); }
        }
        const fighting = C && C.e.def.boss ? inBoss : null;
        if (C && !C.busy) { if (fighting) fighting.turnos++; chooseCombat(combatChoice()); }
        if (fighting && fighting.vidaFinal == null && !W_().ents.some(e => e.kind === fighting.kind))
          { fighting.vidaFinal = Math.round(P.hp / P.maxhp * 100); inBoss = null; }
        continue;
      }
      if (S.mode === 'inv' || S.mode === 'menu') { S.mode = 'explore'; continue; }
      anim = null;
      // reparte los puntos de atributo según la clase
      while (P.attrPts > 0) { const id = { guerrero: 'vig', picaro: 'des', hechicero: 'vol' }[P.cls]; P.attr[id]++; P.attrPts--; recalc(); }
      if (P.hp < P.maxhp * 0.35 && P.potions > 0) usePotion();
      if (P.fuel < 22 && P.oil > 0) useOil();
      equipBest();
      if (P.fuel <= 0) row.dark++;
      const t = pickTarget();
      if (t === 'stairs') { descend(); continue; }
      if (!t || t.dir < 0) { turn(1); anim = null; continue; }
      tryMove(t.dir); anim = null;
    }
    endRow();
    return { cls, race, fin: S.mode + (S.mode === 'win' ? '' : ' en ' + S.floor + '-' + S.level), iter: i, nivel: P.lvl, muertes: S.deaths, pasos: S.steps, rows, jefes: bossFights };
  };

  window.simMany = function (n = 2, mods = []) {
    const combos = [['guerrero', 'humano'], ['picaro', 'mediano'], ['hechicero', 'elfo'], ['guerrero', 'enano'], ['picaro', 'humano'], ['hechicero', 'humano']];
    const out = [];
    for (let k = 0; k < n; k++) for (const [c, r] of combos) out.push(simRun(c, r, 60000, mods));
    EXP.mods = [];
    return out;
  };

  // Resumen por piso
  window.simSummary = function (runs) {
    const by = {};
    for (const r of runs) for (const row of r.rows) {
      const k = row.piso + '-' + row.nivel;
      const a = by[k] || (by[k] = { n: 0, pasos: 0, aceiteH: 0, aceiteU: 0, pocH: 0, pocU: 0, muertes: 0, oscuro: 0, nv: 0 });
      a.n++; a.pasos += row.pasos; a.aceiteH += row.aceiteHallado; a.aceiteU += row.aceiteUsado; a.pocH += row.pocHalladas;
      a.pocU += row.pocUsadas; a.muertes += row.muertes; a.oscuro += row.pasosOscuros; a.nv += row.nv;
    }
    const lines = Object.entries(by).map(([k, a]) => `${k}: pasos ${(a.pasos / a.n).toFixed(0)} aceite +${(a.aceiteH / a.n).toFixed(1)}/-${(a.aceiteU / a.n).toFixed(1)} poc +${(a.pocH / a.n).toFixed(1)}/-${(a.pocU / a.n).toFixed(1)} muertes ${(a.muertes / a.n).toFixed(2)} oscuro ${(a.oscuro / a.n).toFixed(0)} nv ${(a.nv / a.n).toFixed(1)}`);
    const jefes = {};
    for (const r of runs) for (const j of r.jefes) {
      const a = jefes[j.kind] || (jefes[j.kind] = { n: 0, muertes: 0, nv: 0, turnos: 0, vida: 0, vn: 0 });
      a.n++; a.muertes += j.muertes; a.nv += j.nv; a.turnos += j.turnos; if (j.vidaFinal != null) { a.vida += j.vidaFinal; a.vn++; }
    }
    const jl = Object.entries(jefes).map(([k, a]) => `${k}: muertes ${(a.muertes / a.n).toFixed(2)} nv ${(a.nv / a.n).toFixed(1)} turnos ${(a.turnos / a.n).toFixed(0)} vida final ${a.vn ? (a.vida / a.vn).toFixed(0) : '-'}%`);
    const fin = runs.map(r => `${r.race} ${r.cls}: ${r.fin} nv${r.nivel} muertes ${r.muertes} pasos ${r.pasos}`);
    return { niveles: lines, jefes: jl, partidas: fin };
  };
})();
