// Mide los tres encuentros de referencia de la guía de balance en cada zona: entrada, segundo descenso y jefe.
// Grupo de las 4 clases, armas iniciales, habilidades en nivel 1 y los libres en lo propio de cada clase.
// Uso: node tools/medir.js [peleas por encuentro] [JSON con cambios a "dificultad"]
const fs = require('fs'), path = require('path');
const N = require('../js/nucleo.js');
const D = {};
for (const f of ['clases', 'habilidades', 'objetos', 'modelos', 'enemigos', 'mazmorra', 'dialogos']) D[f] = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'datos', f + '.json'), 'utf8'));
const azar = Math.random, CLASES = ['guerrero', 'picaro', 'mago', 'sanador'], TRAMOS = D.mazmorra.niveles.length;

function grupo(nivel) {
  return CLASES.map(c => {
    const ms = Object.keys(D.modelos).filter(m => D.modelos[m].clase === c), u = N.crearPersonaje(D, ms[0], azar);
    while (u.nivel < nivel) { u.exp = 0; N.ganarExp(D, u, u.nivel * D.mazmorra.exp_por_nivel, 99); }
    const libres = D.clases[c].libres_sugeridos;
    for (let i = 0; u.puntos; i++) N.subirAtributo(D, u, libres[i % libres.length]);
    u.vida = u.vidaMax;
    return u;
  });
}

// Decisiones simples: cura si alguien está bajo la mitad, el Guerrero se cubre si está muy herido, si no la habilidad más cara
function pelear(g, ids, piso) {
  const b = N.iniciarBatalla(D, g, ids, false, piso);
  let turnos = 0, r, propios = 0;
  while (!(r = N.haTerminado(b)) && turnos++ < 600) {
    const { unidad: u, pierde } = N.proximoTurno(b, azar);
    if (N.haTerminado(b) || u.vida <= 0 || pierde) continue;
    if (u.enemigo) { N.turnoEnemigo(D, b, u, azar); continue; }
    propios++;
    const rivales = N.vivos(b.enemigos), mas = rivales.slice().sort((x, y) => x.vida - y.vida)[0];
    const herido = N.vivos(b.aliados).slice().sort((x, y) => x.vida / x.vidaMax - y.vida / y.vidaMax)[0];
    const op = N.opciones(D, u).filter(o => !o.apagada);
    const cura = op.find(o => o.objetivo === 'aliado');
    if (cura && herido.vida / herido.vidaMax < 0.5) N.usarHabilidad(D, b, u, cura.id, herido, azar);
    else if (u.clase === 'guerrero' && u.vida / u.vidaMax < 0.35) N.defender(D, u);
    else {
      const dano = op.filter(o => ['enemigo', 'enemigos', 'propio'].includes(o.objetivo)).sort((x, y) => y.costo - x.costo)[0];
      if (dano) N.usarHabilidad(D, b, u, dano.id, mas, azar); else N.atacar(D, u, mas, azar);
    }
  }
  return { r, rondas: propios / g.length, enPie: N.vivos(g).length };
}

// piso: 1..(zonas × 3). El primero de cada zona son grupos de 2, el segundo de 3 (si la zona los tiene), el tercero el jefe.
function caso(piso) {
  const z = Math.ceil(piso / TRAMOS), t = (piso - 1) % TRAMOS, base = (z - 1) * D.mazmorra.zonas.nivel_maximo, grupos = D.mazmorra.grupos_por_piso[z];
  const tres = grupos.filter(g => g.length === 3);
  return [
    { nombre: 'entrada (2 enemigos)', nivel: base + 1, lista: grupos.filter(g => g.length === 2) },
    { nombre: tres.length ? 'segundo (3 enemigos)' : 'segundo (2 enemigos)', nivel: base + 5, lista: tres.length ? tres : grupos.filter(g => g.length === 2) },
    { nombre: 'jefe', nivel: base + 10, lista: [D.mazmorra.jefes[z]] },
  ][t];
}

function medirPiso(piso, veces) {
  const c = caso(piso);
  let gana = 0, rondas = 0, cuatro = 0;
  for (let v = 0; v < veces; v++) {
    const s = pelear(grupo(c.nivel), c.lista[v % c.lista.length], piso);
    if (s.r === 'victoria') { gana++; if (s.enPie === 4) cuatro++; }
    rondas += s.rondas;
  }
  return { ...c, rondas: rondas / veces, gana: gana / veces, cuatro: cuatro / veces };
}

module.exports = { D, medirPiso, pisos: D.mazmorra.pisos.length * TRAMOS };

if (require.main === module) {
  const veces = +process.argv[2] || 1000;
  if (process.argv[3]) Object.assign(D.mazmorra.dificultad, JSON.parse(process.argv[3]));
  const pct = x => (100 * x).toFixed(1).padStart(5) + '%';
  console.log(`${veces} peleas por encuentro\n\nzona piso encuentro              nivel  rondas  victoria  4 en pie`);
  for (let piso = 1; piso <= module.exports.pisos; piso++) {
    const r = medirPiso(piso, veces);
    console.log(`${String(Math.ceil(piso / TRAMOS)).padEnd(5)}${String(piso).padEnd(5)}${r.nombre.padEnd(24)}${String(r.nivel).padEnd(6)}${r.rondas.toFixed(2).padStart(6)}  ${pct(r.gana)}  ${pct(r.cuatro)}`);
  }
}
