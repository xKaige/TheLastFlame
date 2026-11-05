// Arma ENEMIGOS.txt: los parámetros de todos los enemigos y jefes, con lo que valen en cada piso según la escala de dificultad.
// Uso: node tools/enemigos.js
const fs = require('fs'), path = require('path');
const R = path.join(__dirname, '..'), D = {};
for (const f of ['enemigos', 'mazmorra']) D[f] = JSON.parse(fs.readFileSync(path.join(R, 'datos', f + '.json'), 'utf8'));
const E = D.enemigos, M = D.mazmorra, dif = M.dificultad, T = M.niveles.length, out = [];
const t = s => out.push(s), linea = () => t(''), titulo = s => { linea(); t(s.toUpperCase()); t('='.repeat(s.length)); };
const col = (v, n) => String(v).padEnd(n), pct = v => `${Math.round(v * 100)}%`;
const tabla = (l, piso) => (l ? l[Math.min(piso, l.length) - 1] : 1);
// lo mismo que crearEnemigo en js/nucleo.js, con el grupo completo (4 personajes)
const enPiso = (e, piso, fuerza = 1) => ({
  vida: Math.round(e.vida * fuerza * dif.vida * tabla(dif.vida_por_piso, piso) * (e.jefe ? dif.vida_jefe : 1)),
  golpe: e.ataque.map(n => Math.round(n * dif.dano * tabla(dif.dano_por_piso, piso))),
  defensa: e.defensa + (dif.defensa_por_piso || 0) * piso,
});
const DESCENSO = ['entrada', 'segundo descenso', 'guarida'];

// en qué zonas aparece cada uno
const zonas = {}, escolta = {};
for (const [z, grupos] of Object.entries(M.grupos_por_piso)) for (const g of grupos) for (const id of g) (zonas[id] = zonas[id] || new Set()).add(+z);
for (const [z, ids] of Object.entries(M.jefes)) for (const id of ids) {
  (zonas[id] = zonas[id] || new Set()).add(+z);
  if (!E[id].jefe) (escolta[id] = escolta[id] || new Set()).add(+z);
}

const CONOCIDAS = ['nombre', 'prob', 'blanco', 'mult', 'veces', 'ignora_defensa', 'sangrado', 'estado', 'roba_vida', 'debilita', 'aturde', 'apaga', 'quita_impetu', 'refuerza', 'hechiza', 'propia', 'mira', 'anota', 'dano', 'hoja'];
function habilidad(h) {
  const p = [`${pct(h.prob)}: "${h.nombre}"`];
  if (h.blanco === 'todos') p.push('a todo el grupo'); else if (h.blanco === 'herido') p.push('al más herido'); else if (h.blanco) p.push(`blanco: ${h.blanco}`);
  if (h.mult !== undefined) p.push(h.mult ? `golpe ×${h.mult}` : 'sin golpe');
  if (h.veces) p.push(`${h.veces} veces`);
  if (h.ignora_defensa) p.push('ignora defensa');
  if (h.sangrado) p.push(`sangrado ${pct(h.sangrado)}`);
  if (h.estado) p.push(`${h.estado.tipo} ${h.estado.por_turno}/turno por ${h.estado.min}-${h.estado.max} turnos`);
  if (h.roba_vida) p.push(`se cura ${pct(h.roba_vida)} de lo que hace`);
  if (h.debilita) p.push(`debilita ${h.debilita} turnos`);
  if (h.aturde) p.push('aturde');
  if (h.apaga) p.push(`antorcha −${h.apaga}`);
  if (h.quita_impetu) p.push(`Ímpetu −${h.quita_impetu}`);
  if (h.refuerza) p.push(`+${h.refuerza} defensa a los suyos`);
  if (h.hechiza) p.push('hechiza (ataca a los suyos)');
  if (h.propia) p.push(`se pone en ${h.propia}`);
  if (h.mira) p.push(`marca ${h.mira} turnos`);
  if (h.anota) p.push(`anota ${h.anota}`);
  if (h.dano) p.push(`daño fijo ${h.dano.join('-')} (no escala)`);
  const resto = Object.keys(h).filter(k => !CONOCIDAS.includes(k));
  if (resto.length) p.push(resto.map(k => `${k}: ${JSON.stringify(h[k])}`).join(', '));
  return p.join(' · ');
}

function ficha(id) {
  const e = E[id], zs = [...(zonas[id] || [])].sort();
  linea(); t(`${e.nombre.toUpperCase()}${e.jefe ? ' · JEFE' : ''}  (${id})`);
  t(`- Base: vida ${e.vida}, golpe ${e.ataque.join('-')}, defensa ${e.defensa}, velocidad ${e.velocidad}, exp ${e.exp}. Crítico 5%, esquiva 0.`);
  const rasgos = [];
  if (e.roba_impetu) rasgos.push('roba Ímpetu');
  if (e.resiste_fisico) rasgos.push(`resiste ${pct(e.resiste_fisico)} del daño físico`);
  if (e.apresura) rasgos.push(`apresura ×${e.apresura}`);
  if (e.deuda) rasgos.push('lleva la deuda del grupo');
  if (e.oscuridad) rasgos.push(`en la oscuridad (antorcha ≤ ${e.oscuridad.umbral}) pega ×${e.oscuridad.dano}`);
  if (rasgos.length) t(`- Rasgos: ${rasgos.join(' · ')}`);
  for (const h of e.habilidades || []) t(`- Habilidad ${habilidad(h)}`);
  if (e.especial) t(`- Especial cada ${e.especial.cada} turnos: "${e.especial.nombre}", ${e.especial.dano.join('-')} a todo el grupo${e.especial.por_deuda ? ` (+${e.especial.por_deuda} por deuda)` : ''}. NO escala con la dificultad.`);
  if (e.al_morir) t(`- Al morir: "${e.al_morir.nombre}", ${e.al_morir.dano.join('-')} a todo el grupo${e.al_morir.estado ? ` + ${e.al_morir.estado.tipo} ${e.al_morir.estado.por_turno}/turno` : ''}. NO escala con la dificultad.`);
  if (e.ultimo) t(`- Al ${pct(e.ultimo.umbral)} de vida: golpe ×${e.ultimo.dano}, recibe ×${e.ultimo.recibe}${e.ultimo.saldada ? `, anota a ${e.ultimo.saldada === 3 ? 'uno' : e.ultimo.saldada} por turno` : ''}.`);
  if (e.fase) {
    const f = e.fase, extra = Object.keys(f).filter(k => !['umbral', 'escudos', 'velocidad', 'dano', 'mensaje'].includes(k));
    t(`- Segunda fase al ${pct(f.umbral)} de vida: ${f.escudos ? `${f.escudos} escudos, ` : ''}velocidad ×${f.velocidad}, golpe y especial ×${f.dano}.${extra.length ? ` Mecánicas: ${extra.join(', ')}.` : ''}`);
    if (f.gancho && f.gancho.dano) t(`  Gancho: ${f.gancho.dano.join('-')} (NO escala con la dificultad).`);
  }
  if (!zs.length) { t('- No aparece en ningún grupo.'); return; }
  t(`- Aparece en: ${zs.map(z => `zona ${z} (${M.pisos[z - 1].nombre})${escolta[id] && escolta[id].has(z) ? ' + escolta del jefe' : ''}`).join(', ')}`);
  t(`  ${col('Piso', 6)}${col('Lugar', 33)}${col('Vida', 7)}${col('Golpe', 10)}${col('Def', 5)}Contra Def 10 (cubierto)`);
  for (const z of zs) for (let k = 0; k < T; k++) {
    if (e.jefe && k !== T - 1) continue;
    const piso = (z - 1) * T + k + 1, v = enPiso(e, piso);
    const contra = v.golpe.map(g => Math.max(1, g - 10)), cubierto = contra.map(g => Math.max(1, Math.floor(g / 2)));
    t(`  ${col(piso, 6)}${col(`${M.pisos[z - 1].nombre} · ${DESCENSO[k]}`, 33)}${col(v.vida, 7)}${col(v.golpe.join('-'), 10)}${col(v.defensa, 5)}${contra.join('-')} (${cubierto.join('-')})`);
  }
}

t('LA ÚLTIMA LLAMA · ENEMIGOS Y JEFES');
t(`Generado desde los datos del juego (versión ${require(path.join(R, 'package.json')).version}). Para rehacerlo: node tools/enemigos.js`);

titulo('1. Cómo escalan');
t(`- Vida = base × ${dif.vida} × tabla de vida del piso${dif.vida_jefe !== 1 ? ` × ${dif.vida_jefe} si es jefe` : ''} × fuerza por tamaño del grupo.`);
t(`- Golpe = base × ${dif.dano} × tabla de daño del piso. Se le resta la defensa ENTERA del personaje; si está cubierto, después se parte a la mitad. Mínimo 1.`);
t(`- Defensa = base + ${dif.defensa_por_piso} por piso (pisos 1 a ${M.pisos.length * T}, ${T} por zona).`);
t('- Lo que NO escala (queda en los números del dato): el especial de los jefes, el daño al morir, el gancho del Cazador y los daños fijos de habilidades.');
t(`- Fuerza por tamaño del grupo (sólo vida), con 1 / 2 / 3 / 4 personajes: ${M.grupo.fuerza_enemiga.map(pct).join(' / ')}. Las tablas de abajo son con 4.`);
t('- La columna "Contra Def 10" muestra cuánto le saca un golpe a un personaje con 10 de defensa, y entre paréntesis si está cubierto.');
linea();
t('Tabla por piso (calibrada con tools/calibrar.js para unas 2 / 2,6 / 4,7 rondas en entrada, segundo descenso y guarida):');
t(`  ${col('Piso', 6)}${col('Lugar', 33)}${col('Vida ×', 9)}${col('Daño ×', 9)}${col('Def +', 7)}Total vida / daño`);
for (let piso = 1; piso <= M.pisos.length * T; piso++) {
  const z = Math.ceil(piso / T), v = tabla(dif.vida_por_piso, piso), d = tabla(dif.dano_por_piso, piso);
  t(`  ${col(piso, 6)}${col(`${M.pisos[z - 1].nombre} · ${DESCENSO[(piso - 1) % T]}`, 33)}${col(v, 9)}${col(d, 9)}${col(dif.defensa_por_piso * piso, 7)}×${Math.round(v * dif.vida * 100) / 100} / ×${Math.round(d * dif.dano * 100) / 100}`);
}

titulo('2. Jefes');
for (const [z, ids] of Object.entries(M.jefes)) t(`- Guarida de la zona ${z}: ${ids.map(id => E[id].nombre).join(' + ')}`);
for (const id of Object.keys(E).filter(id => E[id].jefe)) ficha(id);

titulo('3. Enemigos por zona');
for (let z = 1; z <= M.pisos.length; z++) {
  linea(); t(`--- Zona ${z}: ${M.pisos[z - 1].nombre} ---`);
  t(`Grupos: ${M.grupos_por_piso[z].map(g => g.map(id => E[id].nombre).join(' + ')).join(' | ')}`);
  for (const id of Object.keys(E).filter(id => !E[id].jefe && Math.min(...(zonas[id] || [99])) === z)) ficha(id);
}
const sueltos = Object.keys(E).filter(id => !E[id].jefe && !zonas[id]);
if (sueltos.length) { titulo('4. Sin usar en ningún grupo'); for (const id of sueltos) ficha(id); }

fs.writeFileSync(path.join(R, 'ENEMIGOS.txt'), out.join('\n') + '\n');
console.log('ENEMIGOS.txt', out.length, 'líneas');
