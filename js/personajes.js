'use strict';
// Menú de personajes (I) y Grimorio. Estado: atributos y equipo · Habilidades: las 4 que lleva · Objetos: la mochila.
// Las reglas están en nucleo.js; acá sólo se muestran y se piden.

const LUGARES_EQUIPO = [['arma', 'Arma'], ['armadura', 'Armadura'], ['accesorio', 'Accesorio']];
const PESTANAS = ['Estado', 'Habilidades', 'Objetos'];
const REGLAS_ATR = D.mazmorra.atributos;
const PJ = { lista: [], i: 0, tab: 0, sel: 0, sub: null, prev: 'explore', edita: false };

function abrirPersonajes(lista, edita) {
  if (!lista.length) return;
  Object.assign(PJ, { lista, i: 0, tab: 0, sel: 0, sub: null, info: false, prev: S.mode, edita });
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

const textoBonos = o => [...Object.entries(o.bonos).map(([k, v]) => `${v > 0 ? '+' : '−'}${Math.abs(v)} ${(REGLAS_ATR.nombres[k] || k).toUpperCase().slice(0, 3)}`), ...(o.magico ? [tr('ATQ +{0}% INT', Math.round(o.magico * 100))] : [])].join(' · ');
const nombreObjeto = o => `${o.rareza === 'rara' ? '✦ ' : ''}${o.nombre}`;
const textoRequisito = h => Object.entries(h.requisito || {}).map(([k, v]) => `${REGLAS_ATR.nombres[k]} ${v}`).join(' · ');
// Lo que se gasta también se ve en la mochila, primero que el resto
const CONSUMIBLES = {
  potions: { nombre: 'Poción', descripcion: 'Cura un 40% al aliado más herido.', accion: 'potion' },
  oil: { nombre: 'Aceite', descripcion: 'Aviva la antorcha.', accion: 'oil' },
};
const habilidadesConocidas = p => [...D.clases[p.clase].habilidades, ...X.grimorio.filter(id => !D.clases[p.clase].habilidades.includes(id))];

// Lo que se puede elegir en la pestaña abierta
function filasTab() {
  const p = PJ.lista[PJ.i];
  if (PJ.tab === 0) return [...REGLAS_ATR.lista.map(a => ({ atr: a })), ...LUGARES_EQUIPO.map(s => ({ slot: s[0] }))];
  if (PJ.tab === 1) return habilidadesConocidas(p).map(id => ({ hab: id }));
  return [...Object.keys(CONSUMIBLES).filter(k => P && P[k] > 0).map(k => ({ cons: k })), ...X.mochila.map(id => ({ obj: id }))];
}

const filasPj = () => (PJ.sub ? PJ.sub.opciones : filasTab());

function pintarPj() {
  const p = PJ.lista[PJ.i], c = D.clases[p.clase], filas = filasTab(), total = NUCLEO.atributosDe(D, p);
  PJ.sel = clamp(PJ.sel, 0, Math.max(0, filasPj().length - 1));
  const elegida = f => !!f && !PJ.sub && filas[PJ.sel] === f;
  const retrato = q => retratoX(q.modelo, LADO_RETRATO, 'crypt').toDataURL();
  const ps = promptStyle() === 'ps', uno = PJ.lista.length < 2;
  const tecla = (letra, boton) => (promptStyle() === 'kb' ? `<span class="k ptecla">${letra}</span>`
    : boton === 'lt' || boton === 'rt' ? `<span class="pg bump ptecla">${ps ? boton.replace('lt', 'L2').replace('rt', 'R2') : boton.toUpperCase()}</span>` : glyph(boton));
  const panel = (titulo, extra, cuerpo, cls = '') => `<section class="ppanel ${cls}"><h4>${tr(titulo)}${extra ? `<small>${extra}</small>` : ''}</h4>${cuerpo}</section>`;

  const pestanas = PESTANAS.map((t, i) => `<div class="ptab${i === PJ.tab ? ' on' : ''}">${tr(t)}</div>`).join('');
  const grupo = PJ.lista.map((q, i) => `<img class="${i === PJ.i ? 'on' : ''}${q.vida <= 0 ? ' caido' : ''}" src="${retrato(q)}" alt="">`).join('');
  const falta = p.nivel * D.mazmorra.exp_por_nivel, enElTope = p.nivel >= NUCLEO.topeNivel(D, PJ.lista === X.grupo ? S.floor : X.memoria.hondo);
  const barra = (cls, frac) => `<i class="pbarra ${cls}"><b style="width:${clamp(frac, 0, 1) * 100}%"></b></i>`;
  const ficha = `<section class="ppanel pficha"><div class="pnom">${p.nombre}</div><div class="ptit">${D.modelos[p.modelo].titulo} · ${c.nombre}</div>
    <img class="pret" src="${retrato(p)}" alt="">
    <div class="pdato"><span>${tr('Nivel {0}', p.nivel)}</span><em>${enElTope ? tr('Máximo de la zona') : `${Math.floor(p.exp)}/${falta} XP`}</em></div>${barra('xp', enElTope ? 1 : p.exp / falta)}
    <div class="pdato vida"><span>${tr('Vida')}</span><em>${Math.max(0, p.vida)}/${p.vidaMax}</em></div>${barra('vida', p.vida / p.vidaMax)}</section>`;

  let centro = '';
  if (PJ.tab === 0) {
    const filaAtr = a => {
      const f = filas.find(x => x.atr === a);
      return `<div class="patr${elegida(f) ? ' sel' : ''}"><span>${REGLAS_ATR.nombres[a]}</span><em>${total[a]}</em>${p.puntos ? '<u>+</u>' : ''}</div>`;
    };
    const filaEquipo = ([s, n]) => {
      const id = p.equipo[s], o = id && D.objetos[id];
      return `<div class="pequipo${elegida(filas.find(x => x.slot === s)) ? ' sel' : ''}${o ? '' : ' vacio'}"><small>${tr(n)}</small><span>${o ? o.nombre : tr('Vacío')}</span>${o ? `<em>${textoBonos(o)}</em>` : ''}</div>`;
    };
    const dato = (n, v, cls = '') => `<div class="pstat ${cls}"><span>${tr(n)}</span><em>${v}</em></div>`;
    const atributos = panel('Atributos', p.puntos ? tr('{0} pts libres', p.puntos) : '', `${p.puntos ? `<div class="paviso">✦ ${p.puntos} punto${p.puntos > 1 ? 's' : ''} para repartir</div>` : ''}${REGLAS_ATR.lista.map(filaAtr).join('')}`, 'patrs');
    const combate = panel('Combate', '', `<div class="pstats">${dato('Ataque', p.ataque + (p.ataqueMagico || 0))}${dato('Defensa', p.defensa)}${dato('Vel', p.velocidad)}${dato('Crítico', `${Math.round(p.critico * 100)}%`)}${dato('Esquiva', `${Math.round(p.esquiva * 100)}%`, 'ancho')}</div>`);
    const equipo = panel('Equipo', '', LUGARES_EQUIPO.map(filaEquipo).join(''));
    const a = filas[PJ.sel] && filas[PJ.sel].atr;
    const info = PJ.info && a ? panel(REGLAS_ATR.nombres[a], '', `<div class="pdesc">${tr(REGLAS_ATR.descripciones[a])}</div><div class="pdesc nota">${tr('Cuanto más alto, menos rinde cada punto.')}</div>`, 'plleno') : `${combate}${equipo}`;
    centro = `${atributos}<div class="pcol">${info}</div>`;
  } else if (PJ.tab === 1) {
    const h = filas[PJ.sel] && D.habilidades[filas[PJ.sel].hab];
    const lista = filas.map(f => {
      const x = D.habilidades[f.hab], lleva = p.habilidades.includes(f.hab), puede = NUCLEO.cumpleRequisito(D, p, f.hab);
      return `<div class="pitem${elegida(f) ? ' sel' : ''}${puede ? '' : ' no'}"><span>${lleva ? '✦ ' : ''}${x.nombre}</span><em>${x.pasiva ? tr('Pasiva') : '◆'.repeat(x.costo)}</em></div>`;
    }).join('');
    const detalle = h ? `<div class="pnom2">${h.nombre}</div><div class="pdesc">${h.descripcion}</div>${h.pasiva ? '' : `<div class="pdesc">${tr('Costo')}: ${'◆'.repeat(h.costo)}</div>`}${h.requisito ? `<div class="pdesc ${NUCLEO.cumpleRequisito(D, p, filas[PJ.sel].hab) ? '' : 'no'}">Requiere ${textoRequisito(h)}</div>` : ''}${PJ.edita ? '' : `<div class="pdesc nota">${tr('Sólo se cambian en el Hogar o en un santuario.')}</div>`}` : '';
    centro = `${panel('Conocidas', `lleva ${p.habilidades.length} de ${D.mazmorra.max_habilidades}`, `<div class="plista">${lista}</div>`, 'patrs')}<div class="pcol">${panel('Detalle', '', detalle, 'plleno')}</div>`;
  } else {
    const f0 = filas[PJ.sel], o = f0 && D.objetos[f0.obj], con = f0 && CONSUMIBLES[f0.cons];
    const lista = filas.length ? filas.map(f => `<div class="pitem${elegida(f) ? ' sel' : ''}"><span>${f.cons ? tr(CONSUMIBLES[f.cons].nombre) : nombreObjeto(D.objetos[f.obj])}</span><em>${f.cons ? `×${P[f.cons]}` : textoBonos(D.objetos[f.obj])}</em></div>`).join('') : `<div class="pdesc">${tr('Está vacía.')}</div>`;
    const detalle = `${o ? `<div class="pnom2">${nombreObjeto(o)}</div><div class="pdesc">${o.descripcion}</div>${o.clases ? `<div class="pdesc">${tr('Para: {0}', o.clases.map(k => D.clases[k].nombre).join(', '))}</div>` : ''}${o.requisito ? `<div class="pdesc ${NUCLEO.cumpleObjeto(D, p, filas[PJ.sel].obj) ? '' : 'no'}">${tr('Requiere {0}', textoRequisito(o))}</div>` : ''}<div class="pdesc">${tr('Se equipa desde Estado.')}</div>` : ''}${con ? `<div class="pnom2">${tr(con.nombre)}</div><div class="pdesc">${tr(con.descripcion)}</div><div class="pdesc">${tr('Te quedan {0}.', P[f0.cons])}</div><div class="pdesc">${tr('Se usa con')} ${glyph(con.accion)}</div>` : ''}`;
    centro = `${panel('Mochila', `${filas.length} objetos`, `<div class="plista">${lista}</div>`, 'patrs')}<div class="pcol">${panel('Detalle', '', detalle, 'plleno')}</div>`;
  }
  const sub = PJ.sub ? `<div class="psubm"><h4>${tr(LUGARES_EQUIPO.find(x => x[0] === PJ.sub.slot)[1])}</h4>${PJ.sub.opciones.map((id, i) => {
    const o = id && D.objetos[id];
    const puede = !o || NUCLEO.cumpleObjeto(D, p, id);
    return `<div class="pitem${i === PJ.sel ? ' sel' : ''}${puede ? '' : ' no'}"><span>${o ? nombreObjeto(o) : tr('Dejar vacío')}</span><em>${o ? (puede ? textoBonos(o) : tr('Requiere {0}', textoRequisito(o))) : ''}</em></div>`;
  }).join('')}</div>` : '';
  $('personajes').innerHTML = `<div class="ptop"><div class="ptabs">${tecla('Q', 'strafeL')}${pestanas}${tecla('E', 'strafeR')}</div><div class="pgrupo">${uno ? '' : tecla('Z', 'lt')}<span>Grupo</span>${grupo}${uno ? '' : tecla('X', 'rt')}</div></div>
    <div class="pcuerpo">${ficha}<div class="pder">${centro}</div></div>${sub}
    <div class="pinfo">${tr(PJ.msg || '')}</div><div class="payuda">${glyph('ok')} ${tr('aceptar')} · ${glyph('cancel')} ${tr('volver')}${PJ.tab === 0 && !PJ.sub && filas[PJ.sel] && filas[PJ.sel].atr ? ` · ${tecla('I', 'inv')} ${tr('ver qué hace')}` : ''}</div>`;
  PJ.msg = '';
  const sel = $('personajes').querySelector('.pitem.sel');
  if (sel) sel.scrollIntoView({ block: 'nearest' });
}

function accionPj(f) {
  const p = PJ.lista[PJ.i];
  if (f.atr) {
    if (p.puntos) { NUCLEO.subirAtributo(D, p, f.atr); sfx('level'); } else { PJ.msg = 'No hay puntos para repartir.'; sfx('bump'); }
  }
  else if (f.slot) {
    const propios = [...new Set(X.mochila.filter(id => D.objetos[id].tipo === f.slot && NUCLEO.sirveAClase(D, p, id)))];
    if (!propios.length && !p.equipo[f.slot]) { PJ.msg = 'No hay nada para equipar acá.'; sfx('bump'); }
    else { PJ.sub = { slot: f.slot, opciones: [null, ...propios], volver: PJ.sel }; PJ.sel = 0; sfx('select'); }
  } else if (f.hab) {
    if (!PJ.edita) { PJ.msg = 'Sólo se cambian en el Hogar o en un santuario.'; sfx('bump'); }
    else if (p.habilidades.includes(f.hab)) { p.habilidades = p.habilidades.filter(id => id !== f.hab); sfx('select'); }
    else if (!NUCLEO.cumpleRequisito(D, p, f.hab)) { PJ.msg = tr('{0} no cumple el requisito.', p.nombre); sfx('bump'); }
    else if (p.habilidades.length >= D.mazmorra.max_habilidades) { PJ.msg = 'Lleva el máximo: primero sacá una.'; sfx('bump'); }
    else { p.habilidades.push(f.hab); sfx('select'); }
  }
  pintarPj();
}

function equiparElegido() {
  const p = PJ.lista[PJ.i], { slot, opciones } = PJ.sub, id = opciones[PJ.sel], viejo = p.equipo[slot];
  if (id && !NUCLEO.cumpleObjeto(D, p, id)) { PJ.msg = tr('{0} no cumple el requisito.', p.nombre); sfx('bump'); return pintarPj(); }
  if (id) X.mochila.splice(X.mochila.indexOf(id), 1);
  if (viejo) X.mochila.push(viejo);
  p.equipo[slot] = id;
  NUCLEO.recalcular(D, p);
  PJ.sel = PJ.sub.volver; PJ.sub = null; sfx('chest');
  pintarPj();
}

const cambiarPestana = d => { PJ.tab = (PJ.tab + d + 3) % 3; PJ.sel = 0; sfx('select'); };
const cambiarPersonaje = d => { PJ.i = (PJ.i + d + PJ.lista.length) % PJ.lista.length; sfx('select'); };

// En Estado hay dos columnas: arriba y abajo se mueven dentro de una, izquierda y derecha pasan a la otra
const COLUMNAS_ESTADO = REGLAS_ATR.lista.length;
function moverVertical(d) {
  const n = filasPj().length;
  if (!n) return;
  if (PJ.tab === 0 && !PJ.sub) {
    const enAtr = PJ.sel < COLUMNAS_ESTADO, tam = enAtr ? COLUMNAS_ESTADO : n - COLUMNAS_ESTADO, ini = enAtr ? 0 : COLUMNAS_ESTADO;
    PJ.sel = ini + (PJ.sel - ini + d + tam) % tam;
  } else PJ.sel = (PJ.sel + d + n) % n;
  sfx('select');
}
function moverHorizontal() {
  if (PJ.tab !== 0 || PJ.sub) return;
  const lugares = filasPj().length - COLUMNAS_ESTADO;
  PJ.sel = PJ.sel < COLUMNAS_ESTADO ? COLUMNAS_ESTADO + Math.min(PJ.sel, lugares - 1) : PJ.sel - COLUMNAS_ESTADO;
  sfx('select');
}

function pjAction(act, pad) {
  if (act === 'fwd' || act === 'back') moverVertical(act === 'fwd' ? -1 : 1);
  else if (PJ.sub) {
    if (act === 'ok') return equiparElegido();
    if (act === 'cancel') { PJ.sel = PJ.sub.volver; PJ.sub = null; }
  }
  else if (act === 'turnL' || act === 'turnR') moverHorizontal();
  else if (act === 'strafeL' || act === 'strafeR') { if (pad) cambiarPestana(act === 'strafeL' ? -1 : 1); else moverHorizontal(); }
  else if (act === 'ok') { const f = filasPj()[PJ.sel]; if (f) return accionPj(f); }
  else if (act === 'inv' && (filasPj()[PJ.sel] || {}).atr) PJ.info = !PJ.info;
  else if (act === 'cancel' && PJ.info && (filasPj()[PJ.sel] || {}).atr) PJ.info = false;
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

function abrirGrimorio() {
  const m = { title: 'Grimorio', cls: 'altar', items: [] };
  m.refresh = () => {
    m.text = tr('Lo que encuentres queda acá para siempre. Ceniza: <b>{0}</b>', X.ceniza);
    m.items = Object.keys(D.habilidades).filter(id => D.habilidades[id].fuente).map(id => {
      const h = D.habilidades[id], tiene = X.grimorio.includes(id), req = h.requisito ? tr(' Requiere {0}.', textoRequisito(h)) : '';
      if (tiene) return { label: h.nombre, sub: `${h.descripcion}${req}`, fn: () => {} };
      if (h.fuente === 'compra') return { label: tr('{0} <small>· {1} de Ceniza</small>', h.nombre, h.precio), sub: `${h.descripcion}${req}`, off: X.ceniza < h.precio, fn: () => { X.ceniza -= h.precio; desbloquear(id); sfx('level'); m.refresh(); renderMenu(); } };
      return { label: '???', sub: h.pista, off: true, fn: () => {} };
    });
  };
  m.refresh();
  openMenu(m);
}
