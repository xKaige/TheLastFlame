'use strict';
// Reglas de la expedición: personajes, turnos por velocidad y combate. No toca pantalla, sonido ni guardado:
// recibe datos (los JSON de datos/) y un azar, y devuelve eventos que la presentación muestra.
// Es la parte que se traduce tal cual a GDScript (ver MIGRACION.md).

const NUCLEO = (() => {
  const IMP_TOPE = 3;
  const clampN = (v, a, b) => Math.min(b, Math.max(a, v));
  const entre = (azar, a, b) => a + Math.floor(azar() * (b - a + 1));
  const elegir = (azar, lista) => lista[Math.floor(azar() * lista.length)];
  const vivos = lista => lista.filter(u => u.vida > 0);

  // ---------- Personajes ----------
  // Un personaje es un modelo (quién es) + una clase (qué hace)
  function crearPersonaje(D, modeloId, claseId, azar, nombre) {
    const m = D.modelos[modeloId], c = D.clases[claseId], b = m.bonos;
    const vida = c.vida + (b.vida || 0);
    return {
      id: `${modeloId}-${claseId}-${Math.floor(azar() * 1e6)}`, modelo: modeloId, clase: claseId, nombre: nombre || elegir(azar, m.nombres),
      nivel: 1, exp: 0, vida, vidaMax: vida, ataque: c.ataque + (b.ataque || 0), defensa: c.defensa + (b.defensa || 0),
      velocidad: c.velocidad + (b.velocidad || 0), critico: c.critico + (b.critico || 0), esquiva: c.esquiva + (b.esquiva || 0),
      impetuInicial: b.impetu_inicial || 0, marcado: false,
    };
  }

  // Candidatos de la reunión: al menos uno de cada clase, sin repetir modelo si alcanza
  function sortearCandidatos(D, azar) {
    const modelos = Object.keys(D.modelos).sort(() => azar() - 0.5), clases = Object.keys(D.clases), out = [];
    for (let i = 0; i < D.mazmorra.candidatos; i++) {
      const clase = i < clases.length ? clases[i] : elegir(azar, clases);
      out.push(crearPersonaje(D, modelos[i % modelos.length], clase, azar));
    }
    return out.sort(() => azar() - 0.5);
  }

  // Caídos de partidas anteriores que pueden volver, cada uno con una condición
  function sortearCaidos(D, caidos, azar) {
    const r = D.mazmorra.caidos, out = [];
    for (const c of caidos.slice().sort(() => azar() - 0.5)) {
      if (out.length >= r.maximo) break;
      if (azar() < r.probabilidad) out.push({ ...c, caido: true, condicion: elegir(azar, r.condiciones) });
    }
    return out;
  }

  // Aplica la condición de un caído al sumarlo. Devuelve la Ceniza que cuesta.
  function aplicarCondicion(p) {
    const c = p.condicion, coste = c.ceniza || 0;
    if (c.vida) { p.vidaMax = Math.round(p.vidaMax * c.vida); p.marcado = true; }
    p.vida = p.vidaMax;
    return coste;
  }

  function ganarExp(D, p, exp) {
    p.exp += exp;
    let subio = false;
    while (p.exp >= p.nivel * D.mazmorra.exp_por_nivel) {
      p.exp -= p.nivel * D.mazmorra.exp_por_nivel; p.nivel++; subio = true;
      p.vidaMax += D.mazmorra.mejora_nivel.vida; p.vida += D.mazmorra.mejora_nivel.vida; p.ataque += D.mazmorra.mejora_nivel.ataque;
    }
    return subio;
  }

  // ---------- Batalla ----------
  function iniciarBatalla(D, grupo, ids) {
    const letras = {};
    const enemigos = ids.map((id, i) => {
      const d = D.enemigos[id], n = ids.filter(x => x === id).length;
      letras[id] = (letras[id] || 0) + 1;
      return { enemigo: true, tipo: id, i, nombre: d.nombre + (n > 1 ? ` ${'ABCD'[letras[id] - 1]}` : ''), sprite: d.sprite, imagen: d.imagen || null, vida: d.vida, vidaMax: d.vida,
        golpe: d.ataque, defensa: d.defensa, velocidad: d.velocidad, critico: 0.05, esquiva: 0, exp: d.exp, jefe: !!d.jefe, especial: d.especial || null, robaImpetu: !!d.roba_impetu, turnos: 0, estados: [] };
    });
    const aliados = vivos(grupo);
    aliados.forEach((u, i) => Object.assign(u, { i, impetu: u.impetuInicial, guardia: false, provoca: 0, defensaExtra: 0 }));
    const unidades = [...aliados, ...enemigos];
    for (const u of unidades) u.reloj = 100 / u.velocidad;
    return { aliados, enemigos, unidades, actual: null };
  }

  const haTerminado = b => (!vivos(b.enemigos).length ? 'victoria' : !vivos(b.aliados).length ? 'derrota' : null);

  // Los próximos n turnos, sin modificar nada: la barra de arriba
  function vistaPrevia(b, n) {
    const sim = b.unidades.filter(u => u.vida > 0).map(u => ({ u, reloj: u.reloj })), out = [];
    while (out.length < n && sim.length) {
      sim.sort((x, y) => x.reloj - y.reloj);
      out.push(sim[0].u);
      sim[0].reloj += 100 / sim[0].u.velocidad;
    }
    return out;
  }

  // Avanza el reloj hasta el siguiente que actúa. Devuelve la unidad y los eventos de inicio de turno (veneno).
  function proximoTurno(b) {
    const u = vistaPrevia(b, 1)[0], base = u.reloj, eventos = [];
    for (const x of b.unidades) x.reloj -= base;
    u.reloj = 100 / u.velocidad;
    b.actual = u;
    if (u.enemigo) {
      // veneno y quemadura lastiman al empezar su turno; el sangrado sólo acumula
      for (const v of u.estados) if (v.turnos) { u.vida -= v.por_turno; v.turnos--; eventos.push({ tipo: 'dano', quien: u, valor: v.por_turno, estado: v.tipo }); }
      u.estados = u.estados.filter(v => v.tipo === 'sangrado' || v.turnos > 0);
      if (u.vida <= 0) eventos.push({ tipo: 'muerte', quien: u });
    } else {
      u.guardia = false;
      if (u.provoca > 0) u.provoca--;
    }
    return { unidad: u, eventos };
  }

  const opciones = (D, u) => D.clases[u.clase].habilidades.map(id => ({ id, ...D.habilidades[id], apagada: u.impetu < D.habilidades[id].costo }));

  function golpear(azar, u, t, eventos, { mult = 1, criticoSeguro = false, ignoraDefensa = false } = {}) {
    if (azar() < t.esquiva) {
      eventos.push({ tipo: 'esquiva', quien: t });
      if (!t.enemigo) t.impetu = Math.min(IMP_TOPE, t.impetu + 1);
      return;
    }
    let dano = Math.max(1, Math.round((entre(azar, 1, 6) + u.ataque) * mult) - (ignoraDefensa ? 0 : t.defensa + (t.defensaExtra || 0)));
    const critico = criticoSeguro || azar() < u.critico;
    if (critico) dano *= 2;
    herir(t, dano, eventos, critico);
  }

  function herir(t, dano, eventos, critico = false) {
    if (t.guardia) dano = Math.max(1, Math.round(dano / 2));
    t.vida -= dano;
    eventos.push({ tipo: 'dano', quien: t, valor: dano, critico });
    if (t.vida <= 0) eventos.push({ tipo: 'muerte', quien: t });
  }

  function atacar(D, u, t, azar) {
    const eventos = [];
    u.impetu = Math.min(IMP_TOPE, u.impetu + 1);
    golpear(azar, u, t, eventos);
    const extra = D.clases[u.clase].doble_golpe;
    if (extra && t.vida > 0) golpear(azar, u, t, eventos, { mult: extra });
    return eventos;
  }

  function defender(u) {
    u.guardia = true;
    u.impetu = Math.min(IMP_TOPE, u.impetu + 1);
    return [{ tipo: 'texto', clave: 'defiende', quien: u }];
  }

  function usarHabilidad(D, b, u, id, objetivo, azar) {
    const h = D.habilidades[id], eventos = [];
    u.impetu -= h.costo;
    const blancos = { enemigo: [objetivo], enemigos: vivos(b.enemigos), aliado: [objetivo], aliados: vivos(b.aliados), propio: [u] }[h.objetivo];
    for (const t of blancos) for (const e of h.efectos) {
      if (t.vida <= 0 && e.tipo !== 'cura') continue;
      if (e.tipo === 'dano') golpear(azar, u, t, eventos, { mult: e.mult, criticoSeguro: e.critico_seguro, ignoraDefensa: e.ignora_defensa });
      else if (e.tipo === 'dano_fijo') herir(t, entre(azar, e.min, e.max), eventos);
      else if (e.tipo === 'veneno' || e.tipo === 'quemadura') aplicarEstado(t, e, azar, eventos);
      else if (e.tipo === 'sangrado') sangrar(t, e, azar, eventos);
      else if (e.tipo === 'cura') { const v = Math.round(t.vidaMax * e.porcentaje); t.vida = clampN(t.vida + v, 0, t.vidaMax); eventos.push({ tipo: 'cura', quien: t, valor: v }); }
      else if (e.tipo === 'defensa') t.defensaExtra = Math.max(t.defensaExtra, e.valor);
      else if (e.tipo === 'provocar') { t.provoca = e.turnos; eventos.push({ tipo: 'texto', clave: 'provoca', quien: t }); }
    }
    return eventos;
  }

  // Los estados duran un azar de turnos y no se renuevan: mientras dure uno, otro igual no hace nada
  function aplicarEstado(t, e, azar, eventos) {
    if (t.estados.some(v => v.tipo === e.tipo)) { eventos.push({ tipo: 'texto', clave: 'resiste', quien: t, estado: e.tipo }); return; }
    t.estados.push({ tipo: e.tipo, por_turno: e.por_turno, turnos: entre(azar, e.min, e.max) });
    eventos.push({ tipo: 'texto', clave: 'estado', quien: t, estado: e.tipo });
  }

  // El sangrado se acumula; al llegar a 3 o 4 pilas la herida se abre de golpe
  function sangrar(t, e, azar, eventos) {
    let v = t.estados.find(x => x.tipo === 'sangrado');
    if (!v) { v = { tipo: 'sangrado', pilas: 0, umbral: entre(azar, 3, 4) }; t.estados.push(v); }
    v.pilas++;
    if (v.pilas < v.umbral) { eventos.push({ tipo: 'texto', clave: 'estado', quien: t, estado: 'sangrado' }); return; }
    t.estados = t.estados.filter(x => x !== v);
    const dano = Math.max(1, Math.round(t.vidaMax * e.estallido));
    t.vida -= dano;
    eventos.push({ tipo: 'dano', quien: t, valor: dano, estado: 'estallido', critico: true });
    if (t.vida <= 0) eventos.push({ tipo: 'muerte', quien: t });
  }

  function turnoEnemigo(b, u, azar) {
    const eventos = [], grupo = vivos(b.aliados);
    u.turnos++;
    if (u.especial && u.turnos % u.especial.cada === 0) {
      eventos.push({ tipo: 'texto', clave: 'especial', quien: u, texto: u.especial.nombre });
      for (const t of grupo) herir(t, entre(azar, ...u.especial.dano), eventos);
      return eventos;
    }
    const provocador = grupo.find(t => t.provoca > 0), t = provocador || elegir(azar, grupo);
    if (azar() < t.esquiva) {
      t.impetu = Math.min(IMP_TOPE, t.impetu + 1);
      eventos.push({ tipo: 'esquiva', quien: t });
      return eventos;
    }
    herir(t, Math.max(1, entre(azar, ...u.golpe) - Math.floor((t.defensa + t.defensaExtra) / 2)), eventos);
    if (u.robaImpetu && t.impetu > 0) { t.impetu--; eventos.push({ tipo: 'texto', clave: 'roba', quien: t }); }
    return eventos;
  }

  return { IMP_TOPE, vivos, crearPersonaje, sortearCandidatos, sortearCaidos, aplicarCondicion, ganarExp, iniciarBatalla, haTerminado, vistaPrevia, proximoTurno, opciones, atacar, defender, usarHabilidad, turnoEnemigo };
})();

if (typeof module !== 'undefined') module.exports = NUCLEO;
