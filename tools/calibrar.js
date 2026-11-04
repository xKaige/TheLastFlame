// Busca, piso por piso, cuánto multiplicar la vida y el daño enemigo para acercarse a los objetivos de la guía de balance.
// Escribe el resultado en datos/mazmorra.json (dificultad.vida_por_piso y dano_por_piso).
// Uso: node tools/calibrar.js [peleas por prueba]
const fs = require('fs'), path = require('path');
const { D, medirPiso, pisos } = require('./medir.js');
const archivo = path.join(__dirname, '..', 'datos', 'mazmorra.json'), veces = +process.argv[2] || 300;
// rondas y "terminan los cuatro en pie" buscados para entrada, segundo descenso y jefe de cada zona
const OBJ = [{ rondas: 2.0, cuatro: 0.93 }, { rondas: 2.6, cuatro: 0.8 }, { rondas: 4.7, cuatro: 0.85 }];
const dif = D.mazmorra.dificultad;
dif.vida_por_piso = Array(pisos).fill(1); dif.dano_por_piso = Array(pisos).fill(1);
for (let vuelta = 0; vuelta < 2; vuelta++) for (let piso = 1; piso <= pisos; piso++) {
  const o = OBJ[(piso - 1) % 3];
  // la vida decide cuánto dura, el daño cuántos quedan en pie
  // el daño tiene techo: más arriba los golpes matan de una y la pelea deja de ser pareja
  for (const [tabla, clave, masEsMas, techo] of [[dif.vida_por_piso, 'rondas', true, 6], [dif.dano_por_piso, 'cuatro', false, 2.5]]) {
    let lo = 0.4, hi = techo;
    for (let k = 0; k < 9; k++) {
      tabla[piso - 1] = (lo + hi) / 2;
      const r = medirPiso(piso, veces);
      if (masEsMas ? r[clave] > o[clave] : r[clave] < o[clave]) hi = tabla[piso - 1]; else lo = tabla[piso - 1];
    }
    tabla[piso - 1] = Math.round((lo + hi) * 50) / 100;
  }
  console.log(`vuelta ${vuelta + 1} · piso ${piso}: vida ×${dif.vida_por_piso[piso - 1]} · daño ×${dif.dano_por_piso[piso - 1]}`);
}
const s = fs.readFileSync(archivo, 'utf8'), nl = s.includes('\r\n') ? '\r\n' : '\n', M = JSON.parse(s);
M.dificultad.vida_por_piso = dif.vida_por_piso; M.dificultad.dano_por_piso = dif.dano_por_piso;
fs.writeFileSync(archivo, JSON.stringify(M, null, 2).replace(/\n/g, nl) + nl);
