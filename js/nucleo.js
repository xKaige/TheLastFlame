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

  const PRESA_DANO = 1.5;     // cuánto más le pegan a la presa marcada
  const DEBIL_DANO = 0.7;     // lo que pega quien quedó debilitado
  // ---------- Personajes ----------
  // Un personaje es un modelo (quién es); cada modelo tiene su clase (qué hace), así el retrato siempre la muestra
  function crearPersonaje(D, modeloId, azar, nombre) {
    const m = D.modelos[modeloId], claseId = m.clase, c = D.clases[claseId], b = m.bonos;
    const vida = c.vida + (b.vida || 0);
    return asegurarPersonaje(D, {
      id: `${modeloId}-${claseId}-${Math.floor(azar() * 1e6)}`, modelo: modeloId, clase: claseId, nombre: nombre || elegir(azar, m.nombres),
      nivel: 1, exp: 0, vida, vidaMax: vida, ataque: c.ataque + (b.ataque || 0), defensa: c.defensa + (b.defensa || 0),
      velocidad: c.velocidad + (b.velocidad || 0), critico: c.critico + (b.critico || 0), esquiva: c.esquiva + (b.esquiva || 0),
      impetuInicial: b.impetu_inicial || 0, marcado: false,
    });
  }

  // Lo que le falta a un personaje creado antes de los atributos: sus números de hoy pasan a ser la base
  function asegurarPersonaje(D, p) {
    if (p.base) return p;
    p.base = { vida: p.vidaMax, ataque: p.ataque, defensa: p.defensa, velocidad: p.velocidad, critico: p.critico, esquiva: p.esquiva };
    p.atributos = { ...D.clases[p.clase].atributos };
    p.puntos = p.nivel - 1;
    p.habilidades = D.clases[p.clase].habilidades.slice();
    p.equipo = { arma: null, armadura: null, accesorio: null };
    p.magia = 0;
    return p;
  }

  // Los personajes guardados de cuando la clase se sorteaba aparte conservan su clase y cambian de retrato
  function ajustarModelo(D, p) {
    if (D.modelos[p.modelo].clase === p.clase) return p;
    const propios = Object.keys(D.modelos).filter(m => D.modelos[m].clase === p.clase);
    p.modelo = propios[p.nombre.length % propios.length];
    return p;
  }

  // Atributos con los bonos del equipo: son los que cuentan para los requisitos
  function atributosDe(D, p) {
    const t = { ...D.clases[p.clase].atributos, ...p.atributos };   // un personaje viejo arranca los atributos nuevos con los de su clase
    for (const id of Object.values(p.equipo)) if (id) for (const [k, v] of Object.entries(D.objetos[id].bonos)) if (k in t) t[k] += v;
    return t;
  }

  // Cuanto más alto el atributo, menos rinde cada punto: tramos de "atributos" en mazmorra.json
  function puntosQueValen(D, d) {
    if (d <= 0) return d;
    let n = 0, ini = 0;
    for (const { hasta = Infinity, vale } of D.mazmorra.atributos.tramos) { n += Math.max(0, Math.min(d, hasta) - ini) * vale; ini = hasta; }
    return n;
  }

  // Los números de pelea salen de la base más lo que suman los atributos por encima de los de su clase
  function recalcular(D, p) {
    const total = atributosDe(D, p), inicial = D.clases[p.clase].atributos, suma = { vida: 0, ataque: 0, defensa: 0, velocidad: 0, critico: 0, esquiva: 0, magia: 0, cura: 0, fuego: 0 };
    for (const [a, efectos] of Object.entries(D.mazmorra.atributos.por_punto)) for (const [k, v] of Object.entries(efectos)) suma[k] += v * puntosQueValen(D, total[a] - inicial[a]);
    for (const id of Object.values(p.equipo)) if (id) for (const [k, v] of Object.entries(D.objetos[id].bonos)) if (k in suma) suma[k] += v;
    const b = p.base, antes = p.vidaMax;
    p.vidaMax = Math.round(b.vida + suma.vida); p.ataque = Math.round(b.ataque + suma.ataque); p.defensa = Math.round(b.defensa + suma.defensa);
    p.velocidad = Math.round((b.velocidad + suma.velocidad) * 10) / 10; p.critico = b.critico + suma.critico; p.esquiva = Math.max(0, b.esquiva + suma.esquiva); p.magia = suma.magia; p.cura = suma.cura; p.fuego = suma.fuego;
    // el arma mágica suma al ataque básico un porcentaje del Intelecto
    p.ataqueMagico = Math.round(Object.values(p.equipo).reduce((n, id) => n + (id && D.objetos[id].magico || 0), 0) * total.int);
    if (p.vida > 0) p.vida = clampN(p.vida + p.vidaMax - antes, 1, p.vidaMax);
    // lo que ya no cumple el requisito queda fuera de la pelea hasta volver a cumplirlo
  }

  const atributosBase = (D, p, a) => p.atributos[a] ?? D.clases[p.clase].atributos[a];

  function subirAtributo(D, p, a) {
    if (!p.puntos) return;
    p.puntos--; p.atributos[a] = atributosBase(D, p, a) + 1;
    recalcular(D, p);
  }

  const cumpleRequisito = (D, p, id) => {
    const t = atributosDe(D, p);
    return Object.entries(D.habilidades[id].requisito || {}).every(([k, v]) => t[k] >= v);
  };

  // Cada arma es de una clase y pide atributos; lo que hay en ese lugar no cuenta porque se va a sacar
  const sirveAClase = (D, p, id) => !D.objetos[id].clases || D.objetos[id].clases.includes(p.clase);
  const cumpleObjeto = (D, p, id) => {
    const o = D.objetos[id], t = atributosDe(D, { ...p, equipo: { ...p.equipo, [o.tipo]: null } });
    return Object.entries(o.requisito || {}).every(([k, v]) => t[k] >= v);
  };

  // Candidatos de la reunión: al menos uno de cada clase, sin repetir modelo si alcanza
  function sortearCandidatos(D, azar) {
    const modelos = Object.keys(D.modelos).sort(() => azar() - 0.5), out = [];
    for (const clase of Object.keys(D.clases)) out.push(...modelos.splice(modelos.findIndex(m => D.modelos[m].clase === clase), 1));
    out.push(...modelos.slice(0, D.mazmorra.candidatos - out.length));
    return out.map(m => crearPersonaje(D, m, azar)).sort(() => azar() - 0.5);
  }

  // Botín: lo que el grupo todavía no tiene sale antes que lo repetido. Si no queda de esa rareza, sale de cualquiera.
  function elegirObjeto(D, azar, tenidos, jefe) {
    const rara = azar() < D.mazmorra.botin[jefe ? 'rara_jefe' : 'rara'], todos = Object.keys(D.objetos), nuevos = todos.filter(id => !tenidos.includes(id));
    const pool = nuevos.length ? nuevos : todos, deRareza = pool.filter(id => (D.objetos[id].rareza === 'rara') === rara);
    return elegir(azar, deRareza.length ? deRareza : pool);
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
    if (c.vida) { p.vidaMax = Math.round(p.vidaMax * c.vida); p.base.vida = Math.round(p.base.vida * c.vida); p.marcado = true; }
    p.vida = p.vidaMax;
    return coste;
  }

  // Cada zona son varios pisos y tiene su nivel máximo: evita subir sin fin en los primeros
  const topeNivel = (D, piso) => Math.ceil(piso / D.mazmorra.zonas.pisos) * D.mazmorra.zonas.nivel_maximo;

  function ganarExp(D, p, exp, tope = Infinity) {
    if (p.nivel >= tope) { p.exp = 0; return false; }
    p.exp += exp;
    let subio = false;
    while (p.nivel < tope && p.exp >= p.nivel * D.mazmorra.exp_por_nivel) {
      p.exp -= p.nivel * D.mazmorra.exp_por_nivel; p.nivel++; subio = true; p.puntos++;
      p.base.vida += D.mazmorra.mejora_nivel.vida; p.base.ataque += D.mazmorra.mejora_nivel.ataque;
      if (p.nivel % D.mazmorra.atributos.crece_cada === 0) for (const [a, v] of Object.entries(D.clases[p.clase].crecimiento)) p.atributos[a] = atributosBase(D, p, a) + v;   // lo que crece solo, según la clase
      recalcular(D, p);
    }
    if (p.nivel >= tope) p.exp = 0;
    return subio;
  }

  // ---------- Batalla ----------
  const crearEnemigo = (D, id, i, fuerza, nombre) => {
    const d = D.enemigos[id], dif = D.mazmorra.dificultad, vida = Math.round(d.vida * fuerza * dif.vida * (d.jefe ? dif.vida_jefe : 1));
    return { enemigo: true, tipo: id, i, nombre, sprite: d.sprite, imagen: d.imagen || null, vida, vidaMax: vida,
      golpe: d.ataque.map(n => Math.round(n * dif.dano)), defensa: d.defensa, velocidad: d.velocidad, critico: 0.05, esquiva: 0, exp: d.exp, jefe: !!d.jefe, especial: d.especial || null, robaImpetu: !!d.roba_impetu, turnos: 0, estados: [], fase: d.fase || null, escudos: 0, enfurecido: false, pasoFase: 0, habilidades: d.habilidades || [], resisteFisico: d.resiste_fisico || 0, alMorir: d.al_morir || null, oscuridad: d.oscuridad || null, ultimo: d.ultimo || null, apresura: d.apresura || 0 };
  };

  function iniciarBatalla(D, grupo, ids, emboscada = false) {
    const letras = {}, fuerza = D.mazmorra.grupo.fuerza_enemiga[Math.min(vivos(grupo).length, 4) - 1];
    const enemigos = ids.map((id, i) => {
      const n = ids.filter(x => x === id).length;
      letras[id] = (letras[id] || 0) + 1;
      return crearEnemigo(D, id, i, fuerza, D.enemigos[id].nombre + (n > 1 ? ` ${'ABCD'[letras[id] - 1]}` : ''));
    });
    const aliados = vivos(grupo);
    aliados.forEach((u, i) => Object.assign(u, { i, impetu: Math.min(IMP_TOPE, u.impetuInicial + (D.clases[u.clase].impetu_inicial || 0)), guardia: false, provoca: 0, defensaExtra: 0, esquivaSegura: false, presa: 0, enganchado: false, hechizado: false, mirado: null, miradoTurnos: 0, estados: [], debil: 0 }));
    const unidades = [...aliados, ...enemigos];
    for (const e of enemigos) { e.aliados = aliados; e.pares = enemigos; }      // lo que estalla al morir necesita saber a quién alcanza
    for (const u of unidades) u.reloj = 100 / u.velocidad;
    if (emboscada) enemigos.forEach((u, i) => { u.reloj = i * 0.01; });     // te sorprenden: todos actúan antes que el grupo
    return { aliados, enemigos, unidades, actual: null, muroLlamas: 0, fuerza, lugares: ids.length, antorcha: 100 };
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
  // pierde: un aliado enganchado no juega este turno.
  function proximoTurno(b, azar = Math.random) {
    const u = vistaPrevia(b, 1)[0], base = u.reloj, eventos = [];
    for (const x of b.unidades) x.reloj -= base;
    u.reloj = 100 / u.velocidad;
    b.actual = u;
    // veneno y quemadura lastiman al empezar su turno; el sangrado sólo acumula
    for (const v of u.estados) if (v.turnos) {
      v.turnos--;
      if (u.escudos) continue;      // mientras tenga escudos, los estados no le bajan la vida
      restarVida(u, v.por_turno, eventos); eventos.push({ tipo: 'dano', quien: u, valor: v.por_turno, estado: v.tipo });
    }
    u.estados = u.estados.filter(v => v.tipo === 'sangrado' || v.turnos > 0);
    if (u.vida <= 0) morir(u, eventos);
    u.guardia = false;
    if (!u.enemigo) {
      for (const e of b.enemigos) if (e.expuesto && e.expuestoQuedan-- <= 0) e.expuesto = false;
      if (u.vida <= 0) return { unidad: u, eventos };
      if (u.provoca > 0) u.provoca--;
      if (u.debil > 0) u.debil--;
      if (u.presa > 0) u.presa--;
      if (u.enganchado) {
        u.enganchado = false;
        eventos.push({ tipo: 'texto', clave: 'pierde_turno', quien: u });
        return { unidad: u, eventos, pierde: true };
      }
      if (u.hechizado) {
        // pierde el control: le pega a alguien de su propio grupo
        u.hechizado = false;
        const otros = vivos(b.aliados).filter(q => q !== u);
        eventos.push({ tipo: 'texto', clave: 'hechizado', quien: u });
        if (otros.length) golpear(azar, u, elegir(azar, otros), eventos, { mult: 0.7 });
        return { unidad: u, eventos, pierde: true };
      }
    }
    return { unidad: u, eventos };
  }

  const opciones = (D, u) => u.habilidades.filter(id => cumpleRequisito(D, u, id)).map(id => ({ id, ...D.habilidades[id], apagada: u.impetu < D.habilidades[id].costo }));

  function golpear(azar, u, t, eventos, { mult = 1, criticoSeguro = false, ignoraDefensa = false } = {}) {
    if (u.debil > 0) mult *= DEBIL_DANO;
    // en la penumbra sólo se le pega justo después de que ataca
    if (t.enemigo && cazando(t) && !t.expuesto) { eventos.push({ tipo: 'texto', clave: 'penumbra', quien: t }); return; }
    if (azar() < t.esquiva) {
      eventos.push({ tipo: 'esquiva', quien: t });
      if (!t.enemigo) t.impetu = Math.min(IMP_TOPE, t.impetu + 1);
      return;
    }
    let dano = Math.max(1, Math.round((entre(azar, 1, 6) + u.ataque + (u.ataqueMagico || 0)) * mult) - (ignoraDefensa ? 0 : t.defensa + (t.defensaExtra || 0)));
    const critico = criticoSeguro || azar() < u.critico;
    if (critico) dano *= 2;
    if (t.resisteFisico) dano = Math.max(1, Math.round(dano * t.resisteFisico));     // un golpe apenas abolla lo que no tiene cuerpo
    herir(t, dano, eventos, critico);
    reflejar(u, t, dano, eventos);
  }

  // Quien tiene encima la mirada de un enemigo y le pega, recibe la mitad de vuelta
  function reflejar(u, t, dano, eventos) {
    if (u.mirado !== t || t.vida <= 0) return;
    eventos.push({ tipo: 'texto', clave: 'refleja', quien: u });
    herir(u, Math.max(1, Math.round(dano / 2)), eventos);
  }

  // Baja la vida; al cruzar el umbral de su fase, el enemigo se detiene ahí y se cubre con escudos
  function restarVida(t, dano, eventos) {
    t.vida -= dano;
    if (t.ultimo && !t.desesperado && t.vida > 0 && t.vida <= t.vidaMax * t.ultimo.umbral) {
      t.desesperado = true;
      t.golpe = t.golpe.map(v => Math.round(v * t.ultimo.dano));
      eventos.push({ tipo: 'desesperado', quien: t });
      return;
    }
    if (!t.fase || t.enfurecido || t.vida <= 0 || t.vida > t.vidaMax * t.fase.umbral) return;
    const f = t.fase;
    t.enfurecido = true; t.escudos = f.escudos;
    t.vida = Math.ceil(t.vidaMax * f.umbral);
    t.velocidad *= f.velocidad;
    t.golpe = t.golpe.map(v => Math.round(v * f.dano));
    if (t.especial) t.especial = { ...t.especial, dano: t.especial.dano.map(v => Math.round(v * f.dano)) };
    eventos.push({ tipo: 'fase', quien: t });
  }

  function morir(t, eventos) {
    eventos.push({ tipo: 'muerte', quien: t });
    if (t.apresura) for (const q of vivos(t.pares || [])) if (q.tipo === t.tipo) q.velocidad *= t.apresura;
    const m = t.alMorir;
    if (!m) return;
    t.alMorir = null;
    eventos.push({ tipo: 'texto', clave: 'especial', quien: t, texto: m.nombre });
    for (const q of vivos(t.aliados)) {
      herir(q, entre(Math.random, ...m.dano), eventos);
      if (q.vida > 0) aplicarEstado(q, m.estado, Math.random, eventos);
    }
  }

  function herir(t, dano, eventos, critico = false) {
    // cada golpe se lleva un escudo entero, sin importar cuánto pegue
    if (t.escudos > 0) {
      t.escudos--;
      if (!t.escudos && t.fase.trono) t.aturdido = true;      // sin escudos se le cae el trono encima
      eventos.push({ tipo: 'escudo', quien: t, quedan: t.escudos });
      return;
    }
    if (t.guardia) dano = Math.max(1, Math.round(dano / 2));
    if (t.desesperado) dano = Math.round(dano * t.ultimo.recibe);
    restarVida(t, dano, eventos);
    eventos.push({ tipo: 'dano', quien: t, valor: dano, critico });
    if (t.vida <= 0) morir(t, eventos);
  }

  function atacar(D, u, t, azar) {
    const eventos = [];
    u.impetu = Math.min(IMP_TOPE, u.impetu + 1);
    golpear(azar, u, t, eventos);
    const extra = D.clases[u.clase].doble_golpe;
    if (extra && t.vida > 0) golpear(azar, u, t, eventos, { mult: extra });
    return eventos;
  }

  function defender(D, u) {
    u.guardia = true;
    u.impetu = Math.min(IMP_TOPE, u.impetu + (D.clases[u.clase].concentra || 1));
    return [{ tipo: 'texto', clave: 'defiende', quien: u }];
  }

  function usarHabilidad(D, b, u, id, objetivo, azar) {
    const h = D.habilidades[id], eventos = [];
    u.impetu -= h.costo;
    b.ultimaHabilidad = id;
    const blancos = { enemigo: [objetivo], enemigos: vivos(b.enemigos), aliado: [objetivo], aliados: vivos(b.aliados), propio: [u] }[h.objetivo];
    for (const t of blancos) for (const e of h.efectos) {
      if (t.vida <= 0 && e.tipo !== 'cura') continue;
      if (e.tipo === 'dano') golpear(azar, u, t, eventos, { mult: e.mult + (e.por_herida || 0) * (1 - u.vida / u.vidaMax), criticoSeguro: e.critico_seguro, ignoraDefensa: e.ignora_defensa });
      else if (e.tipo === 'dano_fijo') { const v = Math.round(entre(azar, e.min, e.max) * (1 + (u.magia || 0) + (u.fuego || 0))); herir(t, v, eventos); reflejar(u, t, v, eventos); }
      else if (e.tipo === 'quemadura') aplicarEstado(t, { ...e, por_turno: Math.round(e.por_turno * (1 + (u.magia || 0) + (u.fuego || 0))) }, azar, eventos);
      else if (e.tipo === 'veneno') aplicarEstado(t, e, azar, eventos);
      else if (e.tipo === 'sangrado') sangrar(t, e, azar, eventos);
      else if (e.tipo === 'cura') { const v = Math.round(t.vidaMax * e.porcentaje * (1 + (u.magia || 0) + (u.cura || 0))); t.vida = clampN(t.vida + v, 0, t.vidaMax); eventos.push({ tipo: 'cura', quien: t, valor: v }); }
      else if (e.tipo === 'defensa') t.defensaExtra = Math.max(t.defensaExtra, e.valor);
      else if (e.tipo === 'provocar') { t.provoca = e.turnos; eventos.push({ tipo: 'texto', clave: 'provoca', quien: t }); }
      else if (e.tipo === 'esquiva_segura') t.esquivaSegura = true;
      else if (e.tipo === 'estallar') estallar(t, e, eventos);
      else if (e.tipo === 'aturdir') { if (t.jefe) eventos.push({ tipo: 'texto', clave: 'jefe_resiste', quien: t }); else { t.aturdido = true; eventos.push({ tipo: 'texto', clave: 'aturdido', quien: t }); } }
      else if (e.tipo === 'brasa') { if (t.estados.some(v => v.tipo === 'quemadura')) u.impetu = Math.min(IMP_TOPE, u.impetu + 1); else aplicarEstado(t, { ...e, tipo: 'quemadura' }, azar, eventos); }
      else if (e.tipo === 'muro_llamas') b.muroLlamas = e.golpes;
      else if (e.tipo === 'dar_impetu') t.impetu = Math.min(IMP_TOPE, t.impetu + e.valor);
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
    if (t.escudos) return;
    t.estados = t.estados.filter(x => x !== v);
    const dano = Math.max(1, Math.round(t.vidaMax * e.estallido));
    restarVida(t, dano, eventos);
    eventos.push({ tipo: 'dano', quien: t, valor: dano, estado: 'estallido', critico: true });
    if (t.vida <= 0) morir(t, eventos);
  }

  // Hace estallar todas las pilas de sangrado de golpe
  function estallar(t, e, eventos) {
    const v = t.estados.find(x => x.tipo === 'sangrado');
    if (!v || t.vida <= 0 || t.escudos) return;
    t.estados = t.estados.filter(x => x !== v);
    const dano = Math.max(1, Math.round(t.vidaMax * e.por_pila * v.pilas));
    restarVida(t, dano, eventos);
    eventos.push({ tipo: 'dano', quien: t, valor: dano, estado: 'estallido', critico: true });
    if (t.vida <= 0) morir(t, eventos);
  }

  // A quién le pegan: quien provoca, después la presa marcada, si no cualquiera
  const cazando = u => !!(u.enfurecido && u.fase && u.fase.caceria);
  const blancoEnemigo = (grupo, azar, u) => grupo.find(t => t.provoca > 0) || grupo.find(t => t.presa > 0)
    || (u && cazando(u) ? grupo.slice().sort((x, y) => x.vida / x.vidaMax - y.vida / y.vidaMax)[0] : elegir(azar, grupo));

  function especialDeJefe(u, grupo, azar, eventos) {
    eventos.push({ tipo: 'texto', clave: 'especial', quien: u, texto: u.especial.nombre });
    for (const t of grupo) herir(t, entre(azar, ...u.especial.dano), eventos);
  }

  // Lo que hace un jefe enfurecido según su ciclo. Devuelve false si le toca el ataque común.
  function habilidadDeFase(D, b, u, grupo, azar, eventos) {
    const f = u.fase, paso = f.ciclo[u.pasoFase++ % f.ciclo.length];
    if (paso === 'especial') { especialDeJefe(u, grupo, azar, eventos); return true; }
    if (paso === 'jauria') {
      const libres = [];
      for (let i = 0; i < b.lugares; i++) if (!vivos(b.enemigos).some(e => e.i === i)) libres.push(i);
      if (!libres.length) return usarGancho(u, grupo, azar, eventos);       // sin lugar para la jauría, tira la cadena
      eventos.push({ tipo: 'texto', clave: 'especial', quien: u, texto: f.jauria.nombre });
      const nuevos = libres.slice(0, f.jauria.cantidad).map(i => crearEnemigo(D, f.jauria.enemigo, i, b.fuerza, D.enemigos[f.jauria.enemigo].nombre));
      for (const n of nuevos) { n.reloj = 100 / n.velocidad; n.aliados = b.aliados; b.enemigos.push(n); b.unidades.push(n); }
      eventos.push({ tipo: 'invoca', quien: u, nuevos });
      return true;
    }
    if (paso === 'gancho') return usarGancho(u, grupo, azar, eventos);
    if (paso === 'presa') {
      const t = grupo.find(q => q.provoca > 0) || elegir(azar, grupo);
      t.presa = f.presa.turnos;
      eventos.push({ tipo: 'texto', clave: 'especial', quien: u, texto: f.presa.nombre });
      eventos.push({ tipo: 'texto', clave: 'presa', quien: t });
      return true;
    }
    return false;
  }
  function usarGancho(u, grupo, azar, eventos) {
    const f = u.fase, t = blancoEnemigo(grupo, azar, u);
    eventos.push({ tipo: 'texto', clave: 'especial', quien: u, texto: f.gancho.nombre }, { tipo: 'gancho', quien: t, desde: u });
    if (t.esquivaSegura || azar() < t.esquiva) { t.esquivaSegura = false; eventos.push({ tipo: 'esquiva', quien: t }); return true; }
    herir(t, entre(azar, ...f.gancho.dano), eventos);
    if (t.vida > 0) { t.enganchado = true; eventos.push({ tipo: 'texto', clave: 'enganchado', quien: t }); }
    return true;
  }

  // El golpe de un enemigo a un personaje. Devuelve el daño hecho, o 0 si lo esquivó.
  function golpeEnemigo(u, t, azar, eventos, mult = 1, ignoraDefensa = false) {
    if (t.esquivaSegura || azar() < t.esquiva) {
      t.esquivaSegura = false;
      t.impetu = Math.min(IMP_TOPE, t.impetu + 1);
      eventos.push({ tipo: 'esquiva', quien: t });
      return 0;
    }
    const dano = Math.max(1, Math.round(entre(azar, ...u.golpe) * mult) - (ignoraDefensa ? 0 : Math.floor((t.defensa + t.defensaExtra) / 2)));
    const total = t.presa > 0 ? Math.round(dano * PRESA_DANO) : dano;
    herir(t, total, eventos);
    return total;
  }

  // Lo propio de cada enemigo (campo "habilidades" de enemigos.json)
  function habilidadEnemiga(b, u, h, grupo, azar, eventos) {
    eventos.push({ tipo: 'texto', clave: 'especial', quien: u, texto: h.nombre });
    if (h.propia === 'guardia') { u.guardia = true; return; }
    if (h.llama) {
      // una sola vez por pelea, los caídos vuelven con la mitad de la vida
      u.llamo = true;
      const nuevos = b.enemigos.filter(e => e.tipo === h.llama && e.vida <= 0);
      for (const n of nuevos) { n.vida = Math.round(n.vidaMax / 2); n.reloj = 100 / n.velocidad; n.estados = []; n.muriendo = 0; }
      eventos.push({ tipo: 'invoca', quien: u, nuevos });
      return;
    }
    if (h.refuerza) { for (const e of vivos(b.enemigos)) e.defensaExtra = Math.max(e.defensaExtra || 0, h.refuerza); return; }
    if (h.apaga) { b.antorcha = Math.max(0, b.antorcha - h.apaga); eventos.push({ tipo: 'antorcha', quien: u, valor: h.apaga }); }
    const herido = grupo.find(t => t.provoca > 0) || grupo.slice().sort((x, y) => x.vida / x.vidaMax - y.vida / y.vidaMax)[0];
    const blancos = h.blanco === 'todos' ? grupo : [h.blanco === 'herido' ? herido : blancoEnemigo(grupo, azar, u)], mult = h.mult ?? 1;
    for (const t of blancos) {
      let acierta = !mult;
      for (let n = 0; mult && n < (h.veces || 1) && t.vida > 0; n++) {
        const dano = golpeEnemigo(u, t, azar, eventos, mult, h.ignora_defensa);
        if (dano) acierta = true;
        if (dano && h.roba_vida) { const v = Math.round(dano * h.roba_vida); u.vida = clampN(u.vida + v, 0, u.vidaMax); eventos.push({ tipo: 'cura', quien: u, valor: v }); }
      }
      if (!acierta || t.vida <= 0) continue;
      if (h.estado) aplicarEstado(t, h.estado, azar, eventos);
      if (h.sangrado) sangrar(t, { estallido: h.sangrado }, azar, eventos);
      if (h.debilita) { t.debil = h.debilita; eventos.push({ tipo: 'texto', clave: 'debilitado', quien: t }); }
      if (h.aturde) { t.enganchado = true; eventos.push({ tipo: 'texto', clave: 'aturdido_grupo', quien: t }); }
      if (h.hechiza) t.hechizado = true;
      if (h.mira) { t.mirado = u; t.miradoTurnos = h.mira; }
      if (h.quita_impetu) t.impetu = Math.max(0, t.impetu - h.quita_impetu);
    }
  }

  const pasoDeFase = u => (u.enfurecido && u.fase.ciclo && !u.aturdido && !u.desesperado ? u.fase.ciclo[u.pasoFase % u.fase.ciclo.length] : null);

  // Elige la habilidad propia antes del turno: si tiene animación, la pantalla la muestra antes de que pase
  function elegirPropia(b, u, azar, primera) {
    const lista = u.habilidades.filter(h => !h.llama || (!u.llamo && b.enemigos.some(e => e.tipo === h.llama && e.vida <= 0)));
    return primera ? lista.length && elegir(azar, lista) : lista.find(h => azar() < h.prob);
  }
  const haraTurnoComun = u => !u.especial || (u.turnos % u.especial.cada !== 0);
  const veTodo = (b, u) => !!(u.enfurecido && u.fase.veo && b.ultimaHabilidad);
  function prepararTurno(D, b, u, azar) {
    const paso = pasoDeFase(u);
    u.proxima = undefined;
    if (u.aturdido || u.desesperado || haraEspecial(u) || enSuTrono(u) || veTodo(b, u) || (paso && paso !== 'golpe')) return null;
    u.proxima = elegirPropia(b, u, azar, u.turnos === 0) || null;
    return u.proxima;
  }

  // Más fuerte cuanto menos luz le quede al grupo
  const fuerzaOscura = (b, u) => (u.oscuridad && b.antorcha <= u.oscuridad.umbral ? u.oscuridad.dano : 1);
  const enSuTrono = u => !!(u.enfurecido && u.fase.trono && u.escudos > 0);

  // Si en este turno le toca el golpe a todo el grupo: la pantalla lo anuncia antes de que pase
  const haraEspecial = u => {
    if (!u.especial || u.aturdido || enSuTrono(u) || u.desesperado) return false;
    if (u.enfurecido && u.fase.ciclo) return u.fase.ciclo[u.pasoFase % u.fase.ciclo.length] === 'especial';
    return (u.turnos + 1) % u.especial.cada === 0;
  };

  // Le devuelve al grupo la última habilidad que usó, con menos fuerza que la original
  function devolverHabilidad(D, b, u, grupo, azar, eventos) {
    const h = D.habilidades[b.ultimaHabilidad], blancos = ['enemigos', 'aliados'].includes(h.objetivo) ? grupo : [blancoEnemigo(grupo, azar, u)];
    b.ultimaHabilidad = null;
    eventos.push({ tipo: 'texto', clave: 'especial', quien: u, texto: `te devuelve ${h.nombre}` });
    for (const e of h.efectos) {
      if (e.tipo === 'cura') { const v = Math.round(u.vidaMax * e.porcentaje * 0.3); u.vida = clampN(u.vida + v, 0, u.vidaMax); eventos.push({ tipo: 'cura', quien: u, valor: v }); }
      if (e.tipo === 'defensa') u.defensaExtra = Math.max(u.defensaExtra || 0, e.valor);
      for (const t of blancos) {
        if (t.vida <= 0) continue;
        if (e.tipo === 'dano') golpeEnemigo(u, t, azar, eventos, (e.mult || 1) * 0.7);
        if (e.tipo === 'dano_fijo') herir(t, entre(azar, e.min, e.max), eventos);
        if (e.tipo === 'veneno' || e.tipo === 'quemadura') aplicarEstado(t, e, azar, eventos);
        if (e.tipo === 'sangrado') sangrar(t, e, azar, eventos);
      }
    }
  }

  function turnoEnemigo(D, b, u, azar) {
    const eventos = [], grupo = vivos(b.aliados);
    if (u.aturdido) { u.aturdido = false; eventos.push({ tipo: 'texto', clave: 'pierde_turno', quien: u }); return eventos; }
    u.turnos++;
    if (cazando(u)) { u.expuesto = true; u.expuestoQuedan = 1; }
    for (const q of grupo) if (q.mirado === u && --q.miradoTurnos <= 0) q.mirado = null;
    if (u.desesperado) { golpeEnemigo(u, blancoEnemigo(grupo, azar), azar, eventos, fuerzaOscura(b, u)); return eventos; }
    if (enSuTrono(u)) {
      const t = blancoEnemigo(grupo, azar), r = u.fase.trono.lluvia;
      eventos.push({ tipo: 'texto', clave: 'especial', quien: u, texto: r.nombre }, { tipo: 'huesos', quien: t });
      herir(t, entre(azar, ...r.dano), eventos);
      return eventos;
    }
    if (haraTurnoComun(u) && veTodo(b, u)) { devolverHabilidad(D, b, u, grupo, azar, eventos); return eventos; }
    if (u.enfurecido && u.fase.ciclo) { if (habilidadDeFase(D, b, u, grupo, azar, eventos)) return eventos; }
    else if (u.especial && u.turnos % u.especial.cada === 0) { especialDeJefe(u, grupo, azar, eventos); return eventos; }
    // la muestra enseguida: muchos enemigos no duran más de un par de turnos
    const propia = u.proxima !== undefined ? u.proxima : elegirPropia(b, u, azar, u.turnos === 1);
    u.proxima = undefined;
    if (propia) { habilidadEnemiga(b, u, propia, grupo, azar, eventos); return eventos; }
    const t = blancoEnemigo(grupo, azar, u);
    if (b.muroLlamas > 0) { b.muroLlamas--; aplicarEstado(u, { tipo: 'quemadura', por_turno: 2, min: 2, max: 3 }, azar, eventos); }
    if (!golpeEnemigo(u, t, azar, eventos, fuerzaOscura(b, u))) return eventos;
    if (u.robaImpetu && t.impetu > 0) { t.impetu--; eventos.push({ tipo: 'texto', clave: 'roba', quien: t }); }
    return eventos;
  }

  return { IMP_TOPE, vivos, crearPersonaje, asegurarPersonaje, ajustarModelo, atributosDe, recalcular, subirAtributo, cumpleRequisito, sirveAClase, cumpleObjeto, sortearCandidatos, elegirObjeto, sortearCaidos, aplicarCondicion, topeNivel, ganarExp, iniciarBatalla, haTerminado, vistaPrevia, proximoTurno, opciones, atacar, defender, usarHabilidad, haraEspecial, pasoDeFase, prepararTurno, turnoEnemigo };
})();

if (typeof module !== 'undefined') module.exports = NUCLEO;
