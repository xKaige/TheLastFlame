// Prueba las reglas sin pantalla: un bot juega expediciones enteras y mide cuántos sobreviven.
// Uso: node tools/simular.js [cantidad]
const fs = require('fs'), path = require('path');
const N = require('../js/nucleo.js');
const D = {};
for (const f of ['clases', 'habilidades', 'modelos', 'enemigos', 'mazmorra', 'dialogos']) D[f] = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'datos', f + '.json'), 'utf8'));
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

const veces = +process.argv[2] || 500, tot = { gana: 0, turnos: 0, peleas: 0, jefe: 0, turnosJefe: 0, muertos: 0 };
for (let v = 0; v < veces; v++) {
  const grupo = MEZCLA.map(c => N.crearPersonaje(D, Object.keys(D.modelos)[Math.floor(azar() * 10)], c, azar));
  let vivo = true;
  for (const nivel of D.mazmorra.niveles) {
    const pool = D.mazmorra.grupos_por_nivel[nivel];
    for (let k = 0; k < 4 && vivo; k++) {
      const { r, turnos } = pelear(grupo, pool[Math.floor(azar() * pool.length)]);
      tot.peleas++; tot.turnos += turnos; vivo = r === 'victoria';
      for (const u of N.vivos(grupo)) { N.ganarExp(D, u, 4); u.vida = Math.min(u.vidaMax, u.vida + Math.round(u.vidaMax * D.mazmorra.descanso)); }
    }
  }
  if (vivo) {
    const { r, turnos } = pelear(grupo, D.mazmorra.jefe);
    tot.jefe++; tot.turnosJefe += turnos;
    if (r === 'victoria') tot.gana++;
  }
  tot.muertos += grupo.filter(u => u.vida <= 0).length;
}
console.log({ expediciones: veces, ganadas: (tot.gana / veces * 100).toFixed(0) + '%', llegan_al_jefe: (tot.jefe / veces * 100).toFixed(0) + '%',
  turnos_por_pelea: (tot.turnos / tot.peleas).toFixed(1), turnos_jefe: (tot.turnosJefe / Math.max(1, tot.jefe)).toFixed(1), muertos_por_expedicion: (tot.muertos / veces).toFixed(1) });
