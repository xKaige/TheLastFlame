// Lista los textos del juego que un idioma todavía no tiene traducidos.
// Uso: node tools/textos_faltantes.js [idioma]            muestra cuántos faltan por idioma (o cuáles, si se indica uno)
//      node tools/textos_faltantes.js idioma --escribir   agrega los que faltan a datos/idiomas/idioma.json, vacíos para completar
// Un idioma nuevo: se suma a datos/idiomas/lista.json y se corre esto con --escribir. Lo que quede vacío se ve en español.
const fs = require('fs'), path = require('path');
const raiz = path.join(__dirname, '..'), carpeta = path.join(raiz, 'datos', 'idiomas');
const leer = f => JSON.parse(fs.readFileSync(path.join(raiz, 'datos', f), 'utf8'));

// En los datos se traduce todo texto con espacios o mayúscula inicial que esté en estos campos
const CAMPOS = new Set(['nombre', 'titulo', 'rasgo', 'rol', 'descripcion', 'pista', 'lineas', 'texto', 'label', 'sub', 'motivo', 'baja', 'piso', 'fondo', 'muerte', 'q', 'big', 'escenas', 'intro', 'nombres_atr']);
function recorrer(v, clave, out) {
  if (typeof v === 'string') { if (CAMPOS.has(clave) && /\p{L}/u.test(v)) out.add(v); return; }
  if (Array.isArray(v)) { for (const x of v) recorrer(x, clave, out); return; }
  if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) recorrer(x, k, out);
}

// En el código, lo que pasa por tr() y los textos fijos de menús y mensajes
const PATRON = /(?:\btr\(|label: |sub: |title: |text: |log\(|banner\(|msg = |confirmMenu\()\s*'((?:[^'\\]|\\.)+)'/g;
function textos() {
  const out = new Set();
  for (const f of ['clases', 'habilidades', 'objetos', 'modelos', 'enemigos', 'dialogos', 'historia', 'eventos']) recorrer(leer(`${f}.json`), '', out);
  const m = leer('mazmorra.json');
  for (const p of m.pisos) out.add(p.nombre);
  for (const n of Object.values(m.atributos.nombres)) out.add(n);
  for (const c of m.caidos.condiciones || []) if (c.texto) out.add(c.texto);
  for (const f of ['juego.js', 'personajes.js', 'settings.js']) {
    const s = fs.readFileSync(path.join(raiz, 'js', f), 'utf8');
    for (const [, t] of s.matchAll(PATRON)) if (/\p{L}/u.test(t)) out.add(t.replace(/\\'/g, "'"));
  }
  return [...out];
}

const lista = JSON.parse(fs.readFileSync(path.join(carpeta, 'lista.json'), 'utf8')).filter(i => i.id !== 'es');
const [, , pedido, accion] = process.argv, todos = textos();
for (const { id, nombre } of lista.filter(i => !pedido || i.id === pedido)) {
  const archivo = path.join(carpeta, `${id}.json`), trad = fs.existsSync(archivo) ? JSON.parse(fs.readFileSync(archivo, 'utf8')) : {};
  const faltan = todos.filter(t => !trad[t]);
  console.log(`${nombre} (${id}): ${todos.length - faltan.length} de ${todos.length} traducidos, faltan ${faltan.length}`);
  if (pedido && accion !== '--escribir') for (const t of faltan) console.log(`  ${t}`);
  if (accion === '--escribir') {
    for (const t of faltan) if (!(t in trad)) trad[t] = '';
    fs.writeFileSync(archivo, JSON.stringify(trad, null, 2) + '\n');
  }
}
