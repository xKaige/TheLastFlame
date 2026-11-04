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

const K = M.combate;
titulo('1. Niveles');
t(`- Experiencia para subir: nivel actual × ${M.exp_por_nivel}. De 1 a 2 hacen falta ${M.exp_por_nivel}, de 10 a 11 hacen falta ${M.exp_por_nivel * 10}.`);
t(`- Tope de nivel: ${M.zonas.nivel_maximo} por zona (zona 1: ${M.zonas.nivel_maximo}, zona 3: ${M.zonas.nivel_maximo * 3}, zona 9: ${M.zonas.nivel_maximo * 9}). En una zona ya superada no se gana experiencia.`);
t(`- Todas las clases empiezan con 75 puntos de atributo, repartidos distinto.`);
t(`- Cada nivel: ${A.automaticos} puntos automáticos en la proporción de los iniciales de la clase (a los 15 niveles cada atributo se duplicó) y ${A.libres} libres.`);
t('  El punto automático número k va al atributo que maximiza k × inicial − 75 × automáticos ya recibidos (empates: en el orden de la lista).');
t(`- Las partidas viejas se rehacen desde el nivel y devuelven ${A.libres} libres por nivel para repartir.`);

titulo('2. Atributos');
for (const a of A.lista) t(`- ${col(A.nombres[a], 12)} ${A.descripciones[a]}`);
t('');
t('Rendimiento decreciente sobre el TOTAL del atributo (E = valor efectivo):');
let ini = 0;
for (const r of A.tramos) { t(`- ${r.hasta ? `de ${ini + 1} a ${r.hasta}` : `más de ${ini}`}: cada punto vale ${r.vale}`); ini = r.hasta; }
t(`Ejemplo: Fuerza 30 vale E = 20 + 10 × 0,5 = ${N.efectivo(D, 30)}.`);
t('Las penalizaciones de armadura restan atributos (o velocidad) sólo mientras se lleva puesta, antes de hacer las cuentas.');

titulo('3. Fórmulas de combate');
t(`- Vida = ${K.vida_base} + ${K.vida_por_vit} × E(Vitalidad) + ${K.vida_por_nivel} × (nivel − 1).`);
t(`- Defensa = redondeo(${K.defensa_por_vit} × E(Vitalidad)).`);
t(`- Velocidad = ${K.velocidad_base} + ${K.velocidad_por_des} × E(Destreza) + equipo. Esquiva = ${K.esquiva_por_des * 100}% × E(Destreza).`);
t(`- Crítico = base del arma (sin arma ${pct(K.critico_sin_arma)}) + ${K.critico_por_per * 100}% por punto de Percepción por encima de 10. Entre 0 y 100%.`);
t('- Golpe básico: rango del arma en d6 + E(atributo del arma) − defensa del blanco. Mínimo 1. Crítico: ×2.');
t('- Habilidades físicas: (dados + E(atributo) + E(Arcano)) × multiplicador − defensa.');
t('- Hechizos de daño: (tirada del hechizo + E(Arcano)) × poder. Pueden ser crítico.');
t('- Veneno y quemadura: el Arcano se reparte entero entre los pulsos del estado.');
t(`- Curas: vida máxima del curado × porcentaje × (1 + ${K.cura_por_fe * 100}% × E(Fe)) × poder. Sólo cuenta lo que de verdad repone.`);
t('- Poder de la habilidad: 1 + 0,1 × (nivel de la habilidad − 1). Nivel 4 = ×1,3.');
t('- Defender: mitad de daño hasta el próximo turno y +1 Ímpetu, una sola vez.');
t(`- Ímpetu: todos empiezan con ${K.impetu_inicial}, máximo ${N.IMP_TOPE}. Atacar +1, esquivar +1, Defender +1. Las reacciones no dan Ímpetu.`);
t('- Enemigos contra el grupo: daño bruto − defensa completa del personaje; si está cubierto, después la mitad.');

titulo('4. Clases');
const RASGOS = {
  contraataque: `Cubierto, devuelve cada golpe al ${K.contraataque * 100}% de su básico (una vez por impacto). No se suma al contraataque de Provocar.`,
  doble: `${pct(D.clases.picaro.doble_golpe)} de pegar otra vez con el básico: ${K.segundo_golpe * 100}% del daño ya hecho, sin otro crítico ni Ímpetu.`,
  critico_impetu: '+1 Ímpetu al acertar un crítico (básico o hechizo directo), una vez por acción.',
  cura_impetu: '+1 Ímpetu cuando su acción le repone vida a otro aliado, una vez por acción.',
};
for (const [id, c] of Object.entries(D.clases)) {
  linea(); t(`${c.nombre.toUpperCase()} · ${c.rol}`);
  t(`- Atributos iniciales: ${A.lista.map(a => `${A.nombres[a]} ${c.atributos[a]}`).join(', ')}`);
  t(`- Rasgo: ${RASGOS[c.rasgo]}`);
  t(`- Arma inicial: ${D.objetos[c.arma_inicial].nombre}. Libres sugeridos: ${c.libres_sugeridos.map(a => A.nombres[a]).join(' y ')}.`);
  t(`- Empieza con: ${c.habilidades.map(h => D.habilidades[h].nombre).join(', ')}`);
}

titulo('5. Crecimiento por nivel (arma inicial, libres en los sugeridos de la clase)');
for (const c of Object.keys(D.clases)) {
  linea(); t(D.clases[c].nombre);
  t(`${col('Nivel', 6)}${col('Vida', 6)}${col('Golpe', 10)}${col('Arc', 5)}${col('Def', 5)}${col('Vel', 6)}${col('Crít', 7)}${col('Esq', 7)}${col('Cura', 9)}Atributos`);
  for (const nivel of [1, 5, 10, 20, 30, 45, 60, 90]) {
    const p = N.crearPersonaje(D, Object.keys(D.modelos).find(k => D.modelos[k].clase === c && !Object.keys(D.modelos[k].bonos || {}).length) || Object.keys(D.modelos).find(k => D.modelos[k].clase === c), () => 0.5);
    while (p.nivel < nivel) { p.exp = 0; N.ganarExp(D, p, p.nivel * M.exp_por_nivel, nivel); }
    const pr = D.clases[c].libres_sugeridos;
    for (let i = 0; p.puntos; i++) N.subirAtributo(D, p, pr[i % pr.length]);
    const at = N.atributosDe(D, p);
    t(`${col(nivel, 6)}${col(p.vidaMax, 6)}${col(`${p.dados}d6+${p.ataque}`, 10)}${col(p.arcano, 5)}${col(p.defensa, 5)}${col(p.velocidad, 6)}${col(pct(p.critico), 7)}${col(pct(p.esquiva), 7)}${col(`+${pct(p.cura)}`, 9)}${A.lista.map(a => `${a} ${at[a]}`).join(' · ')}`);
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
for (const [id, o] of Object.entries(D.objetos).filter(([, o]) => o.tipo === 'arma')) t(`- ${col(o.nombre, 24)} ${col(o.clases.map(k => D.clases[k].nombre).join('/'), 9)} ${o.rango}d6 + ${col(A.nombres[o.ataque_con], 10)} crítico ${col(pct(o.critico), 6)} requiere ${JSON.stringify(o.requisito || {})} · zona ${o.zona || 1}`);
t('');
t('Armaduras:');
for (const [id, o] of Object.entries(D.objetos).filter(([, o]) => o.tipo === 'armadura')) t(`- ${col(o.nombre, 24)} ${col((o.clases || []).map(k => D.clases[k].nombre).join('/'), 9)} bonos ${col(JSON.stringify(o.bonos), 22)} penalización ${JSON.stringify(o.penalizacion || {})}`);

titulo('8. Enemigos');
t(`- Todos: vida ×${M.dificultad.vida}, daño bruto ×${M.dificultad.dano}, +${M.dificultad.defensa_por_piso} de defensa por piso (3 pisos por zona).`);
t('- Además, cada piso multiplica vida y daño según la tabla (medida con node tools/medir.js, ajustada con node tools/calibrar.js):');
M.dificultad.vida_por_piso.forEach((v, i) => t(`  piso ${col(i + 1, 3)} vida ×${col(v, 6)} daño ×${M.dificultad.dano_por_piso[i]}`));
t(`- Fuerza según el tamaño del grupo (vida enemiga, 1 a 4 personajes): ${M.grupo.fuerza_enemiga.join(' / ')}`);

fs.writeFileSync(path.join(R, 'CRECIMIENTO.txt'), out.join('\n') + '\n');
console.log('CRECIMIENTO.txt', out.length, 'líneas');
