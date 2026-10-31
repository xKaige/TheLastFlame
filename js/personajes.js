'use strict';
// Menú de personajes (I) y Grimorio. Estado: atributos y equipo · Habilidades: las 4 que lleva · Objetos: la mochila.
// Las reglas están en nucleo.js; acá sólo se muestran y se piden.

const LUGARES_EQUIPO = [['arma', 'Arma'], ['armadura', 'Armadura'], ['accesorio', 'Accesorio']];
const PESTANAS = ['Estado', 'Habilidades', 'Objetos'];
const REGLAS_ATR = D.mazmorra.atributos;
const PJ = { lista: [], i: 0, tab: 0, sel: 0, sub: null, prev: 'explore', edita: false };

function abrirPersonajes(lista, edita) {
  if (!lista.length) return;
  Object.assign(PJ, { lista, i: 0, tab: 0, sel: 0, sub: null, prev: S.mode, edita });
  S.mode = 'xpj';
  $('personajes').classList.remove('hidden');
  pintarPj();
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

const textoBonos = o => Object.entries(o.bonos).map(([k, v]) => `+${v} ${(REGLAS_ATR.nombres[k] || k).toUpperCase().slice(0, 3)}`).join(' · ');
const textoRequisito = h => Object.entries(h.requisito || {}).map(([k, v]) => `${REGLAS_ATR.nombres[k]} ${v}`).join(' · ');
const habilidadesConocidas = p => [...D.clases[p.clase].habilidades, ...X.grimorio.filter(id => !D.clases[p.clase].habilidades.includes(id))];

// Lo que se puede elegir en la pestaña abierta
function filasTab() {
  const p = PJ.lista[PJ.i];
  if (PJ.tab === 0) return [...(p.puntos ? REGLAS_ATR.lista.map(a => ({ atr: a })) : []), ...LUGARES_EQUIPO.map(s => ({ slot: s[0] }))];
  if (PJ.tab === 1) return habilidadesConocidas(p).map(id => ({ hab: id }));
  return X.mochila.map(id => ({ obj: id }));
}

const filasPj = () => (PJ.sub ? PJ.sub.opciones : filasTab());

function pintarPj() {
  const p = PJ.lista[PJ.i], c = D.clases[p.clase], filas = filasTab(), total = NUCLEO.atributosDe(D, p);
  PJ.sel = clamp(PJ.sel, 0, Math.max(0, filasPj().length - 1));
  const elegida = f => !PJ.sub && filas[PJ.sel] === f;
  const pestanas = PESTANAS.map((t, i) => `<div class="ptab${i === PJ.tab ? ' on' : ''}">${t}</div>`).join('');
  const quien = PJ.lista.length > 1 ? `<div class="pnav">${glyph('strafeL')} ${PJ.i + 1} de ${PJ.lista.length} ${glyph('strafeR')}</div>` : '';
  const falta = p.nivel * D.mazmorra.exp_por_nivel;
  const izquierda = `<div class="pizq"><div class="pnom">${p.nombre}</div><div class="psub">${D.modelos[p.modelo].titulo} · ${c.nombre}</div>
    <img class="pret" src="${retratoX(p.modelo, LADO_RETRATO, 'crypt').toDataURL()}" alt=""><div class="psub">Nivel ${p.nivel} · ${Math.floor(p.exp)}/${falta} XP</div>${quien}</div>`;
  let centro = '';
  if (PJ.tab === 0) {
    const filaAtr = a => {
      const f = filas.find(x => x.atr === a), v = total[a];
      return `<div class="pfila${f && elegida(f) ? ' sel' : ''}"><span>${REGLAS_ATR.nombres[a]}</span><i class="pbar"><b style="width:${Math.min(100, v * 5)}%"></b></i><em>${v}</em></div>`;
    };
    const dato = (n, v) => `<div class="pfila"><span>${n}</span><em>${v}</em></div>`;
    const filaSlot = ([s, n]) => {
      const id = p.equipo[s], o = id && D.objetos[id], f = filas.find(x => x.slot === s);
      return `<div class="pslot${elegida(f) ? ' sel' : ''}"><small>${n}</small><span>${o ? o.nombre : '— vacío —'}</span>${o ? `<em>${textoBonos(o)}</em>` : ''}</div>`;
    };
    centro = `<div class="pcols"><div><h4>Atributos${p.puntos ? ` <small>· ${p.puntos} para repartir</small>` : ''}</h4>${REGLAS_ATR.lista.map(filaAtr).join('')}</div>
      <div><h4>Información</h4>${dato('Vida', `${Math.max(0, p.vida)}/${p.vidaMax}`)}${dato('Ataque', p.ataque)}${dato('Defensa', p.defensa)}${dato('Velocidad', p.velocidad)}${dato('Crítico', `${Math.round(p.critico * 100)}%`)}${dato('Esquiva', `${Math.round(p.esquiva * 100)}%`)}</div></div>
      <h4>Equipo</h4><div class="pslots">${LUGARES_EQUIPO.map(filaSlot).join('')}</div>`;
  } else if (PJ.tab === 1) {
    const h = filas[PJ.sel] && D.habilidades[filas[PJ.sel].hab];
    centro = `<h4>Lleva ${p.habilidades.length} de ${D.mazmorra.max_habilidades}${PJ.edita ? '' : ' <small>· sólo se cambian en el Hogar o en un santuario</small>'}</h4><div class="plista">${filas.map(f => {
      const x = D.habilidades[f.hab], lleva = p.habilidades.includes(f.hab), puede = NUCLEO.cumpleRequisito(D, p, f.hab);
      return `<div class="pitem${elegida(f) ? ' sel' : ''}${puede ? '' : ' no'}"><span>${lleva ? '✦ ' : ''}${x.nombre}</span><em>${'◆'.repeat(x.costo)}</em></div>`;
    }).join('')}</div>${h ? `<div class="pdesc">${h.descripcion}${h.requisito ? `<br><b${NUCLEO.cumpleRequisito(D, p, filas[PJ.sel].hab) ? '' : ' class="no"'}>Requiere ${textoRequisito(h)}</b>` : ''}</div>` : ''}`;
  } else {
    const o = filas[PJ.sel] && D.objetos[filas[PJ.sel].obj];
    centro = `<h4>Mochila del grupo <small>· ${P ? `${P.potions || 0} pociones · ${P.oil || 0} de aceite` : ''}</small></h4><div class="plista">${filas.length ? filas.map(f => `<div class="pitem${elegida(f) ? ' sel' : ''}"><span>${D.objetos[f.obj].nombre}</span><em>${textoBonos(D.objetos[f.obj])}</em></div>`).join('') : '<div class="pdesc">Está vacía.</div>'}</div>${o ? `<div class="pdesc">${o.descripcion} Se equipa desde Estado.</div>` : ''}`;
  }
  const sub = PJ.sub ? `<div class="psubm"><h4>${LUGARES_EQUIPO.find(s => s[0] === PJ.sub.slot)[1]}</h4>${PJ.sub.opciones.map((id, i) => {
    const o = id && D.objetos[id];
    return `<div class="pitem${i === PJ.sel ? ' sel' : ''}"><span>${o ? o.nombre : 'Dejar vacío'}</span><em>${o ? textoBonos(o) : ''}</em></div>`;
  }).join('')}</div>` : '';
  $('personajes').innerHTML = `<div class="ptabs">${pestanas}</div><div class="pcuerpo">${izquierda}<div class="pder">${centro}</div></div>${sub}
    <div class="pinfo">${PJ.msg || ''}</div><div class="payuda">${glyph('change')} pestaña · ${glyph('ok')} aceptar · ${glyph('cancel')} volver</div>`;
  PJ.msg = '';
  const sel = $('personajes').querySelector('.pitem.sel');
  if (sel) sel.scrollIntoView({ block: 'nearest' });
}

function accionPj(f) {
  const p = PJ.lista[PJ.i];
  if (f.atr) { NUCLEO.subirAtributo(D, p, f.atr); sfx('level'); }
  else if (f.slot) {
    PJ.sub = { slot: f.slot, opciones: [null, ...new Set(X.mochila.filter(id => D.objetos[id].tipo === f.slot))] };
    PJ.sel = 0; sfx('select');
  } else if (f.hab) {
    if (!PJ.edita) { PJ.msg = 'Sólo se cambian en el Hogar o en un santuario.'; sfx('bump'); }
    else if (p.habilidades.includes(f.hab)) { p.habilidades = p.habilidades.filter(id => id !== f.hab); sfx('select'); }
    else if (!NUCLEO.cumpleRequisito(D, p, f.hab)) { PJ.msg = `${p.nombre} no cumple el requisito.`; sfx('bump'); }
    else if (p.habilidades.length >= D.mazmorra.max_habilidades) { PJ.msg = `Lleva el máximo: primero sacá una.`; sfx('bump'); }
    else { p.habilidades.push(f.hab); sfx('select'); }
  }
  pintarPj();
}

function equiparElegido() {
  const p = PJ.lista[PJ.i], { slot, opciones } = PJ.sub, id = opciones[PJ.sel], viejo = p.equipo[slot];
  if (id) X.mochila.splice(X.mochila.indexOf(id), 1);
  if (viejo) X.mochila.push(viejo);
  p.equipo[slot] = id;
  NUCLEO.recalcular(D, p);
  PJ.sub = null; PJ.sel = 0; sfx('chest');
  pintarPj();
}

function pjAction(act) {
  const n = filasPj().length;
  if (act === 'fwd' || act === 'back') { if (n) { PJ.sel = (PJ.sel + (act === 'fwd' ? n - 1 : 1)) % n; sfx('select'); } }
  else if (PJ.sub) {
    if (act === 'ok') return equiparElegido();
    if (act === 'cancel') { PJ.sub = null; PJ.sel = 0; }
  }
  else if (act === 'turnL' || act === 'turnR') { PJ.tab = (PJ.tab + (act === 'turnL' ? 2 : 1)) % 3; PJ.sel = 0; sfx('select'); }
  else if (act === 'strafeL' || act === 'strafeR') { PJ.i = (PJ.i + (act === 'strafeL' ? PJ.lista.length - 1 : 1)) % PJ.lista.length; PJ.sel = 0; sfx('select'); }
  else if (act === 'ok') { const f = filasPj()[PJ.sel]; if (f) return accionPj(f); }
  else if (act === 'cancel' || act === 'inv') return cerrarPersonajes();
  pintarPj();
}

window.openInv = () => abrirPersonajes(X.grupo, false);

// ---------- Grimorio ----------
// Lo desbloqueado queda para siempre, aunque caiga toda la expedición
function desbloquear(id) {
  if (X.grimorio.includes(id)) return false;
  X.grimorio.push(id); guardarX();
  return true;
}
const sinDesbloquear = fuente => Object.keys(D.habilidades).filter(id => D.habilidades[id].fuente === fuente && !X.grimorio.includes(id));

function abrirGrimorio() {
  const m = { title: 'Grimorio', cls: 'altar', items: [] };
  m.refresh = () => {
    m.text = `Lo que encuentres queda acá para siempre. Ceniza: <b>${X.ceniza}</b>`;
    m.items = Object.keys(D.habilidades).filter(id => D.habilidades[id].fuente).map(id => {
      const h = D.habilidades[id], tiene = X.grimorio.includes(id), req = h.requisito ? ` Requiere ${textoRequisito(h)}.` : '';
      if (tiene) return { label: h.nombre, sub: `${h.descripcion}${req}`, fn: () => {} };
      if (h.fuente === 'compra') return { label: `${h.nombre} <small>· ${h.precio} de Ceniza</small>`, sub: `${h.descripcion}${req}`, off: X.ceniza < h.precio, fn: () => { X.ceniza -= h.precio; desbloquear(id); sfx('level'); m.refresh(); renderMenu(); } };
      return { label: '???', sub: h.pista, off: true, fn: () => {} };
    });
  };
  m.refresh();
  openMenu(m);
}
