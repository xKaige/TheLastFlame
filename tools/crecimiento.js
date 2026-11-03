// Arma CRECIMIENTO.txt: todos los valores y cálculos de crecimiento de los personajes, sacados de los datos del juego.
// Uso: node tools/crecimiento.js
const fs = require('fs'), path = require('path');
const R = path.join(__dirname, '..'), N = require(path.join(R, 'js', 'nucleo.js')), D = {};
for (const f of ['clases', 'habilidades', 'objetos', 'modelos', 'enemigos', 'mazmorra']) D[f] = JSON.parse(fs.readFileSync(path.join(R, 'datos', f + '.json'), 'utf8'));
const M = D.mazmorra, A = M.atributos, out = [];
const t = s => out.push(s), linea = () => t(''), titulo = s => { linea(); t(s.toUpperCase()); t('='.repeat(s.length)); };
const col = (v, n) => String(v).padEnd(n), pct = v => `${Math.round(v * 1000) / 10}%`;

t('LA ÚLTIMA LLAMA · VALORES Y CÁLCULOS DE CRECIMIENTO');
t(`Generado desde los datos del juego (versión ${require(path.join(R, 'package.json')).version}). Para rehacerlo: node tools/crecimiento.js`);

titulo('1. Niveles');
t(`- Experiencia para subir: nivel actual × ${M.exp_por_nivel}. De 1 a 2 hacen falta ${M.exp_por_nivel}, de 10 a 11 hacen falta ${M.exp_por_nivel * 10}.`);
t(`- Tope de nivel: ${M.zonas.nivel_maximo} por zona (zona 1: ${M.zonas.nivel_maximo}, zona 3: ${M.zonas.nivel_maximo * 3}, zona 9: ${M.zonas.nivel_maximo * 9}). En una zona ya superada no se gana experiencia.`);
t(`- Cada nivel: +${M.mejora_nivel.vida} de vida base, +${M.mejora_nivel.ataque} de ataque base y 1 punto de atributo para repartir.`);
t(`- Cada ${A.crece_cada} niveles, los atributos propios de la clase suben solos (ver "crecimiento" en cada clase).`);

titulo('2. Atributos');
t('Lo que suma cada punto por encima del valor inicial de la clase:');
for (const a of A.lista) t(`- ${col(A.nombres[a], 12)} ${Object.entries(A.por_punto[a]).map(([k, v]) => `${k} +${v}`).join(', ')}`);
t('');
t('Rendimiento decreciente (puntos por encima del inicial de la clase):');
let ini = 0;
for (const r of A.tramos) { t(`- ${r.hasta ? `de +${ini + 1} a +${r.hasta}` : `más de +${ini}`}: cada punto vale ${r.vale}`); ini = r.hasta; }
t('Ejemplo: +30 puntos de Fuerza valen 20 + 10×0,5 = 25 → +25 de ataque.');
t('');
t('Magia: "magia" sube toda la magia (fuego y curas), "cura" sólo las curas y "fuego" sólo el fuego y las quemaduras.');
t('El valor final multiplica: daño de fuego × (1 + magia + fuego), curas × (1 + magia + cura).');

titulo('3. Fórmulas de combate');
t('- Golpe físico: (1d6 + ataque + ataque mágico del arma) × multiplicador − defensa del blanco. Mínimo 1.');
t('- Crítico: daño × 2. Probabilidad = crítico del personaje (+5% por nivel de Sangre Fría contra enemigos con estado).');
t('- Ataque mágico del arma: % del Intelecto total (ver armas).');
t('- Fuego (dano_fijo): azar entre min y max × (1 + magia + fuego) × poder de la habilidad.');
t('- Curas: vida máxima del curado × porcentaje × (1 + magia + cura) × poder de la habilidad.');
t('- Poder de la habilidad: 1 + 0,1 × (nivel de la habilidad − 1). Nivel 4 = ×1,3.');
t('- Pícaro: sus habilidades con "atributo" suman 0,5% por punto de Destreza por encima del inicial.');
t('- Guardia (Defender o Concentrar): recibe la mitad del daño hasta su próximo turno.');
t('- Debilitado: pega 30% menos. Presa: recibe 50% más.');
t(`- Ímpetu: máximo ${N.IMP_TOPE}. Atacar +1, esquivar +1, Defender +1 (Guerrero +2), Concentrar +2 (Mago y Sanador).`);
t('  El Guerrero gana además +1 por cada golpe que recibe.');

titulo('4. Clases');
for (const [id, c] of Object.entries(D.clases)) {
  linea(); t(`${c.nombre.toUpperCase()} · ${c.rol}`);
  t(`- Base: vida ${c.vida}, ataque ${c.ataque}, defensa ${c.defensa}, velocidad ${c.velocidad}, crítico ${pct(c.critico)}, esquiva ${pct(c.esquiva)}${c.doble_golpe ? `, doble golpe ${pct(c.doble_golpe)} (el segundo pega ×${c.doble_golpe})` : ''}`);
  t(`- Atributos iniciales: ${A.lista.map(a => `${A.nombres[a]} ${c.atributos[a]}`).join(', ')}`);
  t(`- Crecimiento cada ${A.crece_cada} niveles: ${Object.entries(c.crecimiento).map(([a, v]) => `${A.nombres[a]} +${v}`).join(', ')}`);
  t(`- Ímpetu inicial: ${c.impetu_inicial || 0} · Defender da ${c.concentra || c.bloqueo || 1}${c.concentra ? ' (se llama Concentrar)' : ''}${c.impetu_al_recibir ? ` · +${c.impetu_al_recibir} por golpe recibido` : ''}`);
  t(`- Empieza con: ${c.habilidades.map(h => D.habilidades[h].nombre).join(', ')}`);
}

titulo('5. Crecimiento por nivel (puntos repartidos en lo propio de la clase, sin equipo)');
t('Los puntos libres se reparten en partes iguales entre los atributos de "crecimiento" de la clase. Sin arma: el Mago y el Sanador suman ataque mágico recién al equipar una.');
for (const c of Object.keys(D.clases)) {
  linea(); t(D.clases[c].nombre);
  t(`${col('Nivel', 6)}${col('Vida', 6)}${col('Atq', 5)}${col('Def', 5)}${col('Vel', 6)}${col('Crít', 7)}${col('Esq', 7)}${col('Magia', 9)}${col('Cura', 9)}${col('Fuego', 9)}Atributos`);
  for (const nivel of [1, 5, 10, 20, 30, 45, 60, 90]) {
    const p = N.crearPersonaje(D, Object.keys(D.modelos).find(k => D.modelos[k].clase === c && !Object.keys(D.modelos[k].bonos || {}).length) || Object.keys(D.modelos).find(k => D.modelos[k].clase === c), () => 0.5);
    while (p.nivel < nivel) { p.exp = 0; N.ganarExp(D, p, p.nivel * M.exp_por_nivel, nivel); }
    const pr = Object.keys(D.clases[c].crecimiento);
    for (let i = 0; p.puntos; i++) N.subirAtributo(D, p, pr[i % pr.length]);
    N.recalcular(D, p);
    const at = N.atributosDe(D, p);
    t(`${col(nivel, 6)}${col(p.vidaMax, 6)}${col(p.ataque, 5)}${col(p.defensa, 5)}${col(p.velocidad, 6)}${col(pct(p.critico), 7)}${col(pct(p.esquiva), 7)}${col(`+${pct(p.magia)}`, 9)}${col(`+${pct(p.cura || 0)}`, 9)}${col(`+${pct(p.fuego || 0)}`, 9)}${A.lista.map(a => `${A.nombres[a].slice(0, 3)} ${at[a]}`).join(' ')}`);
  }
}

titulo('6. Habilidades');
t(`Suben de nivel con lo que acumulan. Meta para pasar del nivel N al siguiente: meta base × N². Tope: zona + 1 (máximo ${10}).`);
for (const c of Object.keys(D.clases)) {
  linea(); t(D.clases[c].nombre);
  for (const [id, h] of Object.entries(D.habilidades).filter(([, h]) => h.clase === c)) {
    const metas = [1, 2, 3, 4].map(n => N.metaMaestria(D, id, n)).join(' / ');
    t(`- ${h.nombre} · ${h.pasiva ? 'pasiva' : `${'◆'.repeat(h.costo)}${h.gasta_todo ? ' (gasta todo)' : ''}`} · ${h.descripcion}`);
    t(`    ${h.requisito ? `Requiere ${Object.entries(h.requisito).map(([a, v]) => `${A.nombres[a]} ${v}`).join(', ')} · ` : ''}acumula "${h.acumula}", metas a nv 2/3/4/5: ${metas}${h.efectos.length ? ` · efectos: ${JSON.stringify(h.efectos)}` : ''}`);
  }
}

titulo('7. Armas');
for (const [id, o] of Object.entries(D.objetos).filter(([, o]) => o.tipo === 'arma')) t(`- ${col(o.nombre, 24)} ${col(o.clases.map(k => D.clases[k].nombre).join('/'), 9)} bonos ${col(JSON.stringify(o.bonos), 22)} requiere ${col(JSON.stringify(o.requisito), 26)}${o.magico ? ` ataque mágico ${pct(o.magico)} del Intelecto` : ''}${o.rareza ? ' · rara' : ''}`);

titulo('8. Enemigos');
t(`- Todos los enemigos: vida ×${M.dificultad.vida}, daño ×${M.dificultad.dano}. Jefes: vida ×${M.dificultad.vida_jefe} además.`);
t(`- Fuerza según el tamaño del grupo (vida enemiga, 1 a 4 personajes): ${M.grupo.fuerza_enemiga.join(' / ')}`);

fs.writeFileSync(path.join(R, 'CRECIMIENTO.txt'), out.join('\n') + '\n');
console.log('CRECIMIENTO.txt', out.length, 'líneas');
