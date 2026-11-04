'use strict';
// Menú de personajes (I) y Grimorio. A la izquierda, fijo: quién es, atributos y combate. Pestañas: Equipo (con la mochila) y Habilidades.
// Las reglas están en nucleo.js; acá sólo se muestran y se piden.

const LUGARES_EQUIPO = [['arma', 'Arma'], ['armadura', 'Armadura'], ['accesorio', 'Accesorio']];
const PESTANAS = ['Equipo', 'Habilidades'];
const REGLAS_ATR = D.mazmorra.atributos;
const PJ = { lista: [], i: 0, tab: 0, col: 0, sel: 0, sub: null, prev: 'explore', edita: false };

function abrirPersonajes(lista, edita) {
  if (!lista.length) return;
  for (const q of lista) q.habilidades = q.habilidades.filter(id => D.habilidades[id].clase === q.clase);    // las de antes se compartían entre clases
  Object.assign(PJ, { lista, i: 0, tab: 0, col: 0, sel: 0, sub: null, prev: S.mode, edita });
  S.mode = 'xpj';
  $('personajes').classList.remove('hidden');
  pintarPj();
}

// De fondo, la cripta de las peleas con sus dos antorchas: el menú se abre dentro del lugar, no sobre negro
function dibujarFondoPj(c) {
  if (!LUZ.c) prepararLuz();
  if (!PJ.gris) PJ.gris = fondoBatalla();
  const { px, lat, w, h } = LUZ, f = clamp(flick, 0.7, 1.05), alcance = 125 * (0.86 + f * 0.14);
  const pal = LUZ.pal.crypt || (LUZ.pal.crypt = packRamp(RAMPS.crypt)), n = pal.length - 1;
  for (let y = 0, i = 0; y < h; y++) for (let x = 0; x < w; x++, i++) {
    const b = Math.min(1, PJ.gris[i] * (0.22 + Math.max(0, 1 - lat[i] / alcance))), v = b * n;
    let k = v | 0;
    if (v - k > BAYER[((y & 3) << 2) | (x & 3)]) k++;
    px[i] = pal[k];
  }
  LUZ.g.putImageData(LUZ.img, 0, 0);
  c.drawImage(LUZ.c, 0, 0);
  for (const [x, y] of ANTORCHAS.crypt) drawFlame(c, x, y, 18, 26, T, 0.75, 'fuegoX');
}

function cerrarPersonajes() {
  $('personajes').classList.add('hidden');
  S.mode = PJ.prev;
  guardarX();
  if (S.world) updateHUD();
  const m = topMenu();
  if (m && m.refresh) m.refresh();
  if (MENU.stack.length) renderMenu();
}

const corto = k => k === 'velocidad' ? 'VEL' : (REGLAS_ATR.nombres[k] || k).toUpperCase().slice(0, 3);
const textoBonos = o => [...(o.rango ? [tr('{0}d6 + {1}', o.rango, corto(o.ataque_con)), tr('CRÍT {0}%', Math.round(o.critico * 100))] : []), ...Object.entries({ ...o.bonos, ...o.penalizacion }).map(([k, v]) => `${v > 0 ? '+' : '−'}${Math.abs(v)} ${corto(k)}`)].join(' · ');
const nombreObjeto = o => `${o.rareza === 'rara' ? '✦ ' : ''}${o.nombre}`;
const COMO_SUBE = { usos: 'Sube al usarla', dano: 'Sube con el daño hecho', cura: 'Sube con la vida curada', impetu: 'Sube con el Ímpetu gastado', recibido: 'Sube con el daño recibido', golpes_recibidos: 'Sube con los golpes recibidos', golpes_heridos: 'Sube pegando con poca vida', evitado: 'Sube con el daño evitado', contraataques: 'Sube al contraatacar', veneno: 'Sube con el daño de veneno', esquivas: 'Sube al esquivar', criticos: 'Sube con los críticos', extra: 'Sube con el daño extra', quemadura: 'Sube con el daño de quemaduras', curaciones: 'Sube al curar' };
function textoMaestria(p, id) {
  const m = NUCLEO.maestria(p, id), tope = NUCLEO.topeMaestria(PJ.lista === X.grupo ? S.floor : X.memoria.hondo), h = D.habilidades[id];
  if (m.nivel >= tope) return tr('Nivel {0}: máximo de esta zona.', m.nivel);
  return tr('Nivel {0}. {1}: {2}/{3}.', m.nivel, tr(COMO_SUBE[h.acumula]), Math.floor(m.valor), NUCLEO.metaMaestria(D, id, m.nivel));
}
const textoRequisito = h => Object.entries(h.requisito || {}).map(([k, v]) => `${REGLAS_ATR.nombres[k]} ${v}`).join(' · ');
// Lo que se gasta también se ve en la mochila, primero que el resto
const CONSUMIBLES = {
  potions: { nombre: 'Poción', descripcion: 'Cura un 40% al aliado más herido.', accion: 'potion' },
  oil: { nombre: 'Aceite', descripcion: 'Aviva la antorcha.', accion: 'oil' },
};
// Lo que cambia en un personaje si se pone o se saca un objeto, escrito con todas las letras
const TIPOS_OBJETO = { arma: 'Armas', armadura: 'Armaduras', accesorio: 'Accesorios' };
const bonosLargos = o => [...(o.rango ? [`<div class="pbono sube">${tr('Golpe: {0}d6 + {1}', o.rango, REGLAS_ATR.nombres[o.ataque_con])}</div>`, `<div class="pbono sube">${tr('Crítico base {0}%', Math.round(o.critico * 100))}</div>`] : []), ...Object.entries({ ...o.bonos, ...o.penalizacion }).map(([k, v]) => `<div class="pbono ${v > 0 ? 'sube' : 'baja'}">${v > 0 ? '+' : '−'}${Math.abs(v)} ${k === 'velocidad' ? tr('Velocidad') : REGLAS_ATR.nombres[k] || k}</div>`)].join('');
function valoresDe(p) { return { Vida: p.vidaMax, Ataque: p.ataque, Defensa: p.defensa, Velocidad: p.velocidad, Crítico: Math.round(p.critico * 100), Esquiva: Math.round(p.esquiva * 100) }; }
const habilidadesConocidas = p => [...D.clases[p.clase].habilidades, ...X.grimorio.filter(id => D.habilidades[id].clase === p.clase && !D.clases[p.clase].habilidades.includes(id))];

// Tres columnas: los atributos (siempre a la izquierda), el centro y la derecha de la pestaña abierta
function columnas() {
  const p = PJ.lista[PJ.i], atributos = REGLAS_ATR.lista.map(a => ({ atr: a }));
  if (PJ.tab === 0) {
    const orden = Object.keys(TIPOS_OBJETO);
    const mochila = [...Object.keys(CONSUMIBLES).filter(k => P && P[k] > 0).map(k => ({ cons: k })), ...X.mochila.slice().sort((x, y) => orden.indexOf(D.objetos[x].tipo) - orden.indexOf(D.objetos[y].tipo)).map(id => ({ obj: id }))];
    return [atributos, LUGARES_EQUIPO.map(l => ({ slot: l[0] })), mochila];
  }
  const lleva = Array.from({ length: D.mazmorra.max_habilidades }, (_, i) => (p.habilidades[i] ? { hab: p.habilidades[i], lleva: true } : { vacia: true }));
  return [atributos, lleva, habilidadesConocidas(p).filter(id => !p.habilidades.includes(id)).map(id => ({ hab: id }))];
}
const filasTab = () => columnas()[PJ.col];
const filasPj = () => (PJ.sub ? PJ.sub.opciones : filasTab());
const filaActual = () => filasTab()[PJ.sel];

// El objeto que se está mirando, para mostrar en Combate cómo quedarían los números
function equipoAProbar(p) {
  if (PJ.sub) return { slot: PJ.sub.slot, id: PJ.sub.opciones[PJ.sel] };
  const f = filaActual();
  if (f && f.obj && NUCLEO.sirveAClase(D, p, f.obj)) return { slot: D.objetos[f.obj].tipo, id: f.obj };
  return null;
}

function detalleFila(p, f) {
  if (!f) return '';
  if (f.atr) return `<div class="pnom2">${REGLAS_ATR.nombres[f.atr]}</div><div class="pdesc">${tr(REGLAS_ATR.descripciones[f.atr])} ${tr('Cuanto más alto, menos rinde cada punto.')}</div>`;
  if (f.slot) {
    const id = p.equipo[f.slot];
    return id ? `${detalleObjeto(p, id)}<div class="pdesc nota">${tr('Enter para cambiarlo.')}</div>` : `<div class="pnom2">${tr(LUGARES_EQUIPO.find(l => l[0] === f.slot)[1])}</div><div class="pdesc">${tr('Vacío. Enter para elegir algo de la mochila.')}</div>`;
  }
  if (f.obj) return detalleObjeto(p, f.obj);
  if (f.cons) { const c = CONSUMIBLES[f.cons]; return `<div class="pnom2">${tr(c.nombre)} <small>×${P[f.cons]}</small></div><div class="pdesc">${tr(c.descripcion)} ${tr('Se usa con')} ${glyph(c.accion)}</div>`; }
  if (f.vacia) return `<div class="pnom2">${tr('Lugar libre')}</div><div class="pdesc">${tr('Elegí una habilidad de la derecha para llevarla.')}</div>`;
  const h = D.habilidades[f.hab], puede = NUCLEO.cumpleRequisito(D, p, f.hab);
  return `<div class="pnom2">${h.nombre} <small>${h.pasiva ? tr('Pasiva') : '◆'.repeat(h.costo)}</small></div><div class="pdesc">${h.descripcion}</div><div class="pdesc">${textoMaestria(p, f.hab)}</div>${h.requisito ? `<div class="pdesc ${puede ? '' : 'no'}">${tr('Requiere {0}', textoRequisito(h))}</div>` : ''}${PJ.edita ? '' : `<div class="pdesc nota">${tr('Sólo se cambian en el Hogar o en un santuario.')}</div>`}`;
}

function detalleObjeto(p, id) {
  const o = D.objetos[id], sirve = NUCLEO.sirveAClase(D, p, id), puede = sirve && NUCLEO.cumpleObjeto(D, p, id);
  return `<div class="pnom2">${nombreObjeto(o)}</div><div class="pdesc">${o.descripcion}</div><div class="pbonos">${bonosLargos(o)}</div>
    ${o.clases ? `<div class="pdesc ${sirve ? '' : 'no'}">${tr('Para: {0}', o.clases.map(k => D.clases[k].nombre).join(', '))}${o.requisito ? ` · <span class="${puede || !sirve ? '' : 'no'}">${tr('Requiere {0}', textoRequisito(o))}</span>` : ''}</div>` : ''}`;
}

function pintarPj() {
  const p = PJ.lista[PJ.i], c = D.clases[p.clase], cols = columnas(), total = NUCLEO.atributosDe(D, p);
  PJ.sel = clamp(PJ.sel, 0, Math.max(0, filasPj().length - 1));
  const es = (col, i) => !PJ.sub && PJ.col === col && PJ.sel === i;
  const retrato = q => retratoX(q.modelo, LADO_RETRATO, 'crypt').toDataURL();
  const ps = promptStyle() === 'ps', uno = PJ.lista.length < 2;
  const tecla = (letra, boton) => (promptStyle() === 'kb' ? `<span class="k ptecla">${letra}</span>`
    : boton === 'lt' || boton === 'rt' ? `<span class="pg bump ptecla">${ps ? boton.replace('lt', 'L2').replace('rt', 'R2') : boton.toUpperCase()}</span>` : glyph(boton));
  const falta = p.nivel * D.mazmorra.exp_por_nivel, enElTope = p.nivel >= NUCLEO.topeNivel(D, PJ.lista === X.grupo ? S.floor : X.memoria.hondo);

  // columna fija: quién es, atributos y combate; los números muestran cómo quedarían con lo que se está mirando
  const prueba = equipoAProbar(p), luego = prueba ? (() => { const q = { ...p, equipo: { ...p.equipo, [prueba.slot]: prueba.id } }; NUCLEO.recalcular(D, q); return q; })() : p;
  const totalLuego = NUCLEO.atributosDe(D, luego), antes = valoresDe(p), despues = valoresDe(luego);
  const cambio = (a, b, sufijo = '') => (a === b ? `<em>${a}${sufijo}</em>` : `<em class="${b > a ? 'sube' : 'baja'}">${b}${sufijo}</em>`);
  const grupo = PJ.lista.map((q, i) => `<img class="${i === PJ.i ? 'on' : ''}${q.vida <= 0 ? ' caido' : ''}" src="${retrato(q)}" alt="">`).join('');
  const atrs = REGLAS_ATR.lista.map((a, i) => `<div class="pfil patr2${es(0, i) ? ' sel' : ''}"><span>${REGLAS_ATR.nombres[a]}</span>${cambio(total[a], totalLuego[a])}${p.puntos ? '<u>+</u>' : ''}</div>`).join('');
  const NOMBRES_COMBATE = { Ataque: 'Ataque', Defensa: 'Defensa', Velocidad: 'Vel', Crítico: 'Crítico', Esquiva: 'Esquiva' };
  const combate = Object.keys(NOMBRES_COMBATE).map(k => `<div class="pstat2"><span>${tr(NOMBRES_COMBATE[k])}</span>${cambio(antes[k], despues[k], ['Crítico', 'Esquiva'].includes(k) ? '%' : '')}</div>`).join('');
  const izquierda = `<section class="ppanel pizq">
    <div class="pgrupo2">${uno ? '' : tecla('Z', 'lt')}${grupo}${uno ? '' : tecla('X', 'rt')}</div>
    <div class="pcab"><img src="${retrato(p)}" alt=""><div><div class="pnom">${p.nombre}</div><div class="ptit">${c.nombre}</div><div class="ptit">${tr('Nivel {0}', p.nivel)}${enElTope ? '' : ` · ${Math.floor(p.exp)}/${falta}`}</div></div></div>
    <div class="pvida"><span>${tr('Vida')}</span><em>${Math.max(0, p.vida)}/${cambio(p.vidaMax, luego.vidaMax).replace(/<\/?em[^>]*>/g, '')}</em></div><i class="pbarra vida"><b style="width:${clamp(p.vida / p.vidaMax, 0, 1) * 100}%"></b></i>
    <h5>${tr('Atributos')}${p.puntos ? `<small>✦ ${p.puntos}</small>` : ''}</h5>${atrs}
    <h5>${tr('Combate')}</h5><div class="pstats2">${combate}</div></section>`;

  // centro y derecha según la pestaña
  let centro, derecha, tituloC, tituloD;
  if (PJ.tab === 0) {
    tituloC = 'Equipo'; tituloD = 'Mochila';
    centro = cols[1].map((f, i) => { const o = p.equipo[f.slot] && D.objetos[p.equipo[f.slot]]; return `<div class="pfil pranura${es(1, i) ? ' sel' : ''}${o ? '' : ' vacio'}"><small>${tr(LUGARES_EQUIPO[i][1])}</small><span>${o ? nombreObjeto(o) : tr('Vacío')}</span></div>`; }).join('');
    let antesG = '';
    derecha = cols[2].length ? cols[2].map((f, i) => {
      const ob = f.obj && D.objetos[f.obj], g = f.cons ? 'Consumibles' : TIPOS_OBJETO[ob.tipo], sirve = !ob || NUCLEO.sirveAClase(D, p, f.obj);
      const titulo = g !== antesG ? `<div class="pgrupoit">${tr(g)}</div>` : ''; antesG = g;
      return `${titulo}<div class="pfil${es(2, i) ? ' sel' : ''}${sirve ? '' : ' no'}"><span>${f.cons ? tr(CONSUMIBLES[f.cons].nombre) : nombreObjeto(ob)}</span><em>${f.cons ? `×${P[f.cons]}` : sirve ? '' : D.clases[ob.clases[0]].nombre}</em></div>`;
    }).join('') : `<div class="pdesc">${tr('Está vacía.')}</div>`;
  } else {
    tituloC = tr('Lleva {0}/{1}', p.habilidades.length, D.mazmorra.max_habilidades); tituloD = 'Conocidas';
    const fila = (f, col, i) => {
      if (f.vacia) return `<div class="pfil pranura vacio${es(col, i) ? ' sel' : ''}"><span>${tr('Libre')}</span></div>`;
      const h = D.habilidades[f.hab], puede = NUCLEO.cumpleRequisito(D, p, f.hab);
      return `<div class="pfil${col === 1 ? ' pranura' : ''}${es(col, i) ? ' sel' : ''}${puede ? '' : ' no'}"><span>${h.nombre}</span><em>${tr('Nv {0}', NUCLEO.maestria(p, f.hab).nivel)} ${h.pasiva ? 'P' : '◆'.repeat(h.costo)}</em></div>`;
    };
    centro = cols[1].map((f, i) => fila(f, 1, i)).join('');
    derecha = cols[2].length ? cols[2].map((f, i) => fila(f, 2, i)).join('') : `<div class="pdesc">${tr('No conoce otras.')}</div>`;
  }
  const pestanas = PESTANAS.map((t, i) => `<div class="ptab${i === PJ.tab ? ' on' : ''}">${tr(t)}</div>`).join('');
  const detalle = PJ.sub ? (PJ.sub.opciones[PJ.sel] ? detalleObjeto(p, PJ.sub.opciones[PJ.sel]) : `<div class="pdesc">${tr('Deja el lugar vacío.')}</div>`) : detalleFila(p, filaActual());
  const sub = PJ.sub ? `<div class="psubm"><h4>${tr(LUGARES_EQUIPO.find(x => x[0] === PJ.sub.slot)[1])}</h4>${PJ.sub.opciones.map((id, i) => {
    const o = id && D.objetos[id], puede = !o || NUCLEO.cumpleObjeto(D, p, id);
    return `<div class="pfil${i === PJ.sel ? ' sel' : ''}${puede ? '' : ' no'}"><span>${o ? nombreObjeto(o) : tr('Dejar vacío')}</span><em>${o && !puede ? tr('Requiere {0}', textoRequisito(o)) : ''}</em></div>`;
  }).join('')}</div>` : '';
  $('personajes').innerHTML = `<div class="pj2">${izquierda}<div class="pder2">
      <div class="ptabs">${tecla('Q', 'strafeL')}${pestanas}${tecla('E', 'strafeR')}</div>
      <div class="pmedio"><section class="ppanel pcentro"><h4>${tr(tituloC)}</h4>${centro}</section><section class="ppanel plado"><h4>${tr(tituloD)}</h4><div class="plista2">${derecha}</div></section></div>
      <section class="ppanel pdet">${detalle}</section></div></div>${sub}
    <div class="pinfo">${tr(PJ.msg || '')}</div><div class="payuda">${glyph('ok')} ${tr('aceptar')} · ${glyph('cancel')} ${tr('volver')}</div>`;
  PJ.msg = '';
  const sel = $('personajes').querySelector('.plista2 .sel');
  if (sel) sel.scrollIntoView({ block: 'nearest' });
}

function ponerObjeto(p, id) {
  const o = D.objetos[id], viejo = p.equipo[o.tipo];
  X.mochila.splice(X.mochila.indexOf(id), 1);
  if (viejo) X.mochila.push(viejo);
  p.equipo[o.tipo] = id;
  NUCLEO.recalcular(D, p);
  sfx('chest');
}

function accionPj(f) {
  const p = PJ.lista[PJ.i];
  if (!f) return pintarPj();
  if (f.atr) {
    if (p.puntos) { NUCLEO.subirAtributo(D, p, f.atr); sfx('level'); } else { PJ.msg = 'No hay puntos para repartir.'; sfx('bump'); }
  } else if (f.slot) {
    const propios = [...new Set(X.mochila.filter(id => D.objetos[id].tipo === f.slot && NUCLEO.sirveAClase(D, p, id)))];
    if (!propios.length && !p.equipo[f.slot]) { PJ.msg = 'No hay nada para equipar acá.'; sfx('bump'); }
    else { PJ.sub = { slot: f.slot, opciones: [null, ...propios], volver: PJ.sel }; PJ.sel = 0; sfx('select'); }
  } else if (f.obj) {
    if (!NUCLEO.sirveAClase(D, p, f.obj)) { PJ.msg = tr('Es para {0}.', D.objetos[f.obj].clases.map(k => D.clases[k].nombre).join(', ')); sfx('bump'); }
    else if (!NUCLEO.cumpleObjeto(D, p, f.obj)) { PJ.msg = tr('{0} no cumple el requisito.', p.nombre); sfx('bump'); }
    else ponerObjeto(p, f.obj);
  } else if (f.cons) { PJ.msg = 'Se usa explorando, con su tecla.'; sfx('bump'); }
  else if (f.vacia) { PJ.msg = 'Elegí una habilidad de la derecha.'; sfx('bump'); }
  else if (!PJ.edita) { PJ.msg = 'Sólo se cambian en el Hogar o en un santuario.'; sfx('bump'); }
  else if (f.lleva) { p.habilidades = p.habilidades.filter(id => id !== f.hab); sfx('select'); }
  else if (!NUCLEO.cumpleRequisito(D, p, f.hab)) { PJ.msg = tr('{0} no cumple el requisito.', p.nombre); sfx('bump'); }
  else if (p.habilidades.length >= D.mazmorra.max_habilidades) { PJ.msg = 'Lleva el máximo: primero sacá una.'; sfx('bump'); }
  else { p.habilidades.push(f.hab); sfx('select'); }
  pintarPj();
}

function equiparElegido() {
  const p = PJ.lista[PJ.i], { slot, opciones } = PJ.sub, id = opciones[PJ.sel], viejo = p.equipo[slot];
  if (id && !NUCLEO.cumpleObjeto(D, p, id)) { PJ.msg = tr('{0} no cumple el requisito.', p.nombre); sfx('bump'); return pintarPj(); }
  if (id) ponerObjeto(p, id);
  else if (viejo) { X.mochila.push(viejo); p.equipo[slot] = null; NUCLEO.recalcular(D, p); sfx('chest'); }
  PJ.sel = PJ.sub.volver; PJ.sub = null;
  pintarPj();
}

const cambiarPestana = d => { PJ.tab = (PJ.tab + d + PESTANAS.length) % PESTANAS.length; if (PJ.col) PJ.sel = 0; sfx('select'); };
const cambiarPersonaje = d => { PJ.i = (PJ.i + d + PJ.lista.length) % PJ.lista.length; sfx('select'); };

function moverVertical(d) {
  const n = filasPj().length;
  if (!n) return;
  PJ.sel = (PJ.sel + d + n) % n;
  sfx('select');
}
// izquierda y derecha pasan de columna, y se saltea la que esté vacía
function moverHorizontal(d) {
  if (PJ.sub) return;
  const cols = columnas();
  for (let n = 0; n < 3; n++) { PJ.col = (PJ.col + d + 3) % 3; if (cols[PJ.col].length) break; }
  PJ.sel = Math.min(PJ.sel, Math.max(0, cols[PJ.col].length - 1));
  sfx('select');
}

function pjAction(act, pad) {
  if (act === 'fwd' || act === 'back') moverVertical(act === 'fwd' ? -1 : 1);
  else if (PJ.sub) {
    if (act === 'ok') return equiparElegido();
    if (act === 'cancel') { PJ.sel = PJ.sub.volver; PJ.sub = null; }
  }
  else if (act === 'turnL' || act === 'turnR') moverHorizontal(act === 'turnL' ? -1 : 1);
  else if (act === 'strafeL' || act === 'strafeR') { if (pad) cambiarPestana(act === 'strafeL' ? -1 : 1); else moverHorizontal(act === 'strafeL' ? -1 : 1); }
  else if (act === 'ok') return accionPj(filaActual());
  else if (act === 'cancel' || act === 'inv') return cerrarPersonajes();
  pintarPj();
}

// Q E cambian de pestaña y Z X de personaje; las flechas y A D son sólo para moverse dentro de la pantalla
const TECLAS_PJ = { KeyQ: () => cambiarPestana(-1), KeyE: () => cambiarPestana(1), KeyZ: () => cambiarPersonaje(-1), KeyX: () => cambiarPersonaje(1) };
addEventListener('keydown', ev => {
  if (S.mode !== 'xpj' || PJ.sub || ev.repeat || !TECLAS_PJ[ev.code]) return;
  ev.stopImmediatePropagation(); ev.preventDefault();
  TECLAS_PJ[ev.code]();
  pintarPj();
}, true);

// En el joystick, LT y RT cambian de personaje
const gatillosAntes = {};
function gatillosPersonajes(gp) {
  for (const [b, d] of [[6, -1], [7, 1]]) {
    const k = `${gp.index}:${b}`, apretado = gp.buttons[b] && gp.buttons[b].pressed;
    if (apretado && !gatillosAntes[k] && !PJ.sub && PJ.lista.length > 1) { cambiarPersonaje(d); pintarPj(); }
    gatillosAntes[k] = apretado;
  }
}

window.openInv = () => abrirPersonajes(X.grupo, false);

// ---------- Grimorio ----------
// Lo desbloqueado queda para siempre, aunque caiga toda la expedición
function desbloquear(id) {
  if (X.grimorio.includes(id)) return false;
  X.grimorio.push(id); guardarX();
  return true;
}
// Lo que deja caer un grupo vencido: un jefe siempre suelta algo
function soltarBotin(jefe) {
  if (!jefe && azarX() >= D.mazmorra.botin.enemigo) return '';
  return `${darObjeto(jefe).nombre} en la mochila`;
}
// Todo objeto que encuentra el grupo pasa por acá
function darObjeto(jefe = false) {
  const tenidos = [...X.mochila, ...[...X.plantel, ...X.grupo].flatMap(p => Object.values(p.equipo))], id = NUCLEO.elegirObjeto(D, azarX, tenidos, jefe, S.floor);
  X.mochila.push(id); guardarX();
  return D.objetos[id];
}

const sinDesbloquear = fuente => Object.keys(D.habilidades).filter(id => D.habilidades[id].fuente === fuente && !X.grimorio.includes(id));
const deClase = h => (h.clase ? ` · ${D.clases[h.clase].nombre}` : '');

function abrirGrimorio() {
  const m = { title: 'Grimorio', cls: 'altar', items: [] };
  m.refresh = () => {
    m.text = tr('Lo que encuentres queda acá para siempre. Ceniza: <b>{0}</b>', X.ceniza);
    m.items = Object.keys(D.habilidades).filter(id => D.habilidades[id].fuente).map(id => {
      const h = D.habilidades[id], tiene = X.grimorio.includes(id), req = h.requisito ? tr(' Requiere {0}.', textoRequisito(h)) : '';
      if (tiene) return { label: `${h.nombre}<small>${deClase(h)}</small>`, sub: `${h.descripcion}${req}`, fn: () => {} };
      if (h.fuente === 'compra') return { label: tr('{0} <small>· {1} de Ceniza{2}</small>', h.nombre, h.precio, deClase(h)), sub: `${h.descripcion}${req}`, off: X.ceniza < h.precio, fn: () => { X.ceniza -= h.precio; desbloquear(id); sfx('level'); m.refresh(); renderMenu(); } };
      return { label: '???', sub: h.pista, off: true, fn: () => {} };
    });
  };
  m.refresh();
  openMenu(m);
}
