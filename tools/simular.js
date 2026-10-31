// Prueba las reglas sin pantalla: un bot juega expediciones enteras y mide cuántos sobreviven.
// Uso: node tools/simular.js [cantidad]
const fs = require('fs'), path = require('path');
const N = require('../js/nucleo.js');
const D = {};
for (const f of ['clases', 'habilidades', 'objetos', 'modelos', 'enemigos', 'mazmorra', 'dialogos']) D[f] = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'datos', f + '.json'), 'utf8'));
const azar = Math.random, MEZCLA = ['guerrero', 'picaro', 'mago', 'sanador'];

function pelear(grupo, ids) {
  const b = N.iniciarBatalla(D, grupo, ids);
  let turnos = 0, r;
  while (!(r = N.haTerminado(b)) && turnos++ < 400) {
    const { unidad: u } = N.proximoTurno(b);
    if (N.haTerminado(b) || u.vida <= 0) continue;
    if (u.enemigo) { N.turnoEnemigo(b, u, azar); continue; }
    const rivales = N.vivos(b.enemigos), mas = rivales.slice().sort((x, y) => x.vida - y.vida)[0];
    const herido = N.vivos(b.aliados).slice().sort((x, y) => x.vida / x.vidaMax - y.vida / y.vidaMax)[0];
    const op = N.opciones(D, u).filter(o => !o.apagada);
    const cura = op.find(o => o.objetivo === 'aliado');
    if (cura && herido.vida / herido.vidaMax < 0.5) N.usarHabilidad(D, b, u, cura.id, herido, azar);
    else {
      const dano = op.filter(o => ['enemigo', 'enemigos'].includes(o.objetivo)).sort((x, y) => y.costo - x.costo)[0];
      if (dano) N.usarHabilidad(D, b, u, dano.id, mas, azar); else N.atacar(D, u, mas, azar);
    }
  }
  return { r, turnos };
}

const veces = +process.argv[2] || 500, G = D.mazmorra;
for (const tam of [4, 3, 2, 1]) {
  const tot = { gana: 0, turnos: 0, peleas: 0, muertos: 0, piso: [0, 0, 0, 0], jefes: [0, 0, 0], turnos1: 0, peleas1: 0 };
  for (let v = 0; v < veces; v++) {
    const grupo = MEZCLA.slice(0, tam).map(c => { const ms = Object.keys(D.modelos).filter(m => D.modelos[m].clase === c); return N.crearPersonaje(D, ms[Math.floor(azar() * ms.length)], azar); });
    let vivo = true;
    const descanso = (k) => { for (const u of N.vivos(grupo)) u.vida = Math.min(u.vidaMax, u.vida + Math.round(u.vidaMax * k)); };
    for (let piso = 1; piso <= 3 && vivo; piso++) {
      tot.piso[piso]++;
      const pool = G.grupos_por_piso[piso];
      for (let k = 0; k < 6 && vivo; k++) {
        const { r, turnos } = pelear(grupo, pool[Math.floor(azar() * pool.length)]);
        tot.peleas++; tot.turnos += turnos; vivo = r === 'victoria';
        if (piso === 1) { tot.peleas1++; tot.turnos1 += turnos; }
        const exp = 8;
        for (const u of N.vivos(grupo)) N.ganarExp(D, u, exp, N.topeNivel(D, piso));
        descanso(G.descanso);
        if (k % 2 === 1) descanso(0.25);          // pociones del grupo
      }
      if (vivo) {
        descanso(0.3);
        const { r } = pelear(grupo, G.jefes[piso]);
        vivo = r === 'victoria';
        if (vivo) { tot.jefes[piso - 1]++; for (const u of N.vivos(grupo)) N.ganarExp(D, u, D.enemigos[G.jefes[piso].find(i => D.enemigos[i].jefe)].exp, N.topeNivel(D, piso)); descanso(G.santuario.cura); }
      }
    }
    if (vivo) tot.gana++;
    tot.muertos += grupo.filter(u => u.vida <= 0).length;
  }
  console.log(`grupo de ${tam}:`, { ganadas: (tot.gana / veces * 100).toFixed(0) + '%', jefes: tot.jefes.map(j => (j / veces * 100).toFixed(0) + '%').join(' '), turnos_por_pelea: (tot.turnos / tot.peleas).toFixed(1), turnos_piso_1: (tot.turnos1 / tot.peleas1).toFixed(1), muertos: (tot.muertos / veces).toFixed(1) });
}
